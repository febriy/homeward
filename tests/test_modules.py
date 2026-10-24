"""Module progression, private reflection and XP checked on real PostgreSQL."""
import json
import secrets
import unittest
from concurrent.futures import ThreadPoolExecutor
import psycopg
from psycopg import sql
from test_homeward import DSN, PASSWORD
from core import Problem, Sessions
from db import Database
from modules import MODULES, update_module
from lessons import update_learning

class ModuleTests(unittest.TestCase):
    def setUp(self):
        self.database=Database(DSN,'test_'+secrets.token_hex(8));self.database.migrate()
        self.store=Sessions(self.database)
        self.a=self.store.authenticate(self.store.guest())
        self.b=self.store.authenticate(self.store.guest())
        self.mid=MODULES[0]['id']
    def tearDown(self):
        with psycopg.connect(DSN) as db:db.execute(sql.SQL('DROP SCHEMA {} CASCADE').format(sql.Identifier(self.database.schema)))
    def learning(self):return self.store.view(self.a)['learning']
    def act(self,action,**fields):
        data=self.learning();p=data.get('modules',{}).get(self.mid)
        module=next(m for m in MODULES if m['id']==self.mid)
        body=dict(action=action,module_id=self.mid,version=data['version'],operation=secrets.token_hex(16))
        if p:body['step_id']=module['steps'][p['cursor']]['id']
        return update_module(self.store,self.a,body|fields)['learning']
    def finish(self,rating=None):
        self.act('start')
        module=next(m for m in MODULES if m['id']==self.mid)
        for step in module['steps']:
            if step['type']=='quiz':self.act('check',value=step['correct'])
            elif step['type']=='reflect':self.act('draft',value=rating)
            self.act('next')
        return self.learning()['modules'][self.mid]
    def test_all_three_modules_finish_with_private_reflection_and_real_xp(self):
        for m in MODULES:
            self.mid=m['id'];p=self.finish()
            self.assertTrue(p['completed']);self.assertEqual(p['earned'],60)
            self.assertIsNone(p['history'][0]['answers']['self-check'])
            self.assertNotIn('intention',p['history'][0]['answers'])
        self.assertEqual(sum(len(p['awarded'])*10 for p in self.learning()['modules'].values()),180)
        self.assertFalse(self.store.view(self.b)['learning'].get('modules'))
        partner=self.store.authenticate(self.store.register(dict(handle='partner',name='Partner',password=PASSWORD,invite=self.store.view(self.a)['room']['invite'])))
        self.assertFalse(self.store.view(partner)['learning'].get('modules'))
    def test_quiz_feedback_does_not_advance_until_correct_and_checked(self):
        self.act('start');self.act('next')
        wrong=self.act('check',value=0)['modules'][self.mid]
        self.assertFalse(wrong['checks']['request-check']['correct'])
        self.assertIn('judges',wrong['checks']['request-check']['message'])
        self.assertEqual(wrong['cursor'],1);self.assertEqual(wrong['earned'],10)
        with self.assertRaises(Problem):self.act('next')
        self.act('draft',value=1)
        with self.assertRaises(Problem):self.act('next')
        self.act('check',value=1);self.act('next')
        self.assertEqual(self.learning()['modules'][self.mid]['earned'],20)
    def test_draft_resume_and_back_keep_answers_without_duplicate_xp(self):
        self.act('start');self.act('next');self.act('check',value=1);self.act('next');self.act('back')
        p=self.store.view(self.a)['learning']['modules'][self.mid]
        self.assertEqual(p['cursor'],1);self.assertEqual(p['answers']['request-check'],1)
        self.act('next');self.assertEqual(self.learning()['modules'][self.mid]['earned'],20)
    def test_atomic_retries_and_stale_requests_cannot_award_twice_or_skip(self):
        data=self.act('start')
        body=dict(action='next',module_id=self.mid,step_id='specific',version=data['version'],operation=secrets.token_hex(16))
        with ThreadPoolExecutor(max_workers=2) as pool:
            results=list(pool.map(lambda _:update_module(self.store,self.a,body),range(2)))
        self.assertEqual(results[0],results[1])
        self.assertEqual(results[0]['learning']['modules'][self.mid]['earned'],10)
        with self.assertRaises(Problem):update_module(self.store,self.a,body|{'operation':secrets.token_hex(16)})
        with self.assertRaises(Problem):self.act('next',step_id='intention')
    def test_revisiting_preserves_history_and_never_farms_xp(self):
        first=self.finish(rating=1)
        second=self.finish(rating=10)
        self.assertEqual(second['earned'],0);self.assertEqual(len(second['awarded']),6)
        self.assertEqual(len(second['history']),2)
        self.assertEqual(first['history'][0],second['history'][0])
        self.assertEqual(second['history'][1]['answers']['self-check'],10)
    def test_ratings_not_graded_and_legacy_records_survive(self):
        old=update_learning(self.store,self.a,dict(action='finish',lesson_id='realistic-dinner',version=0,attempt=secrets.token_hex(16),answers={'picture':5,'capacity':6,'prep':None},note='Earlier reflection'))['learning']['history']
        self.finish(rating=1)
        self.assertEqual(self.learning()['history'],old)
        self.store.new_session(self.a,'Another season')
        self.assertEqual(self.learning()['modules'][self.mid]['earned'],60)
    def test_invalid_answers_and_unchosen_reflection_cannot_complete(self):
        self.act('start');self.act('next')
        for value in (False,'1',-1,3,None):
            with self.subTest(value=value),self.assertRaises(Problem):self.act('check',value=value)
        self.act('check',value=1);self.act('next');self.act('next');self.act('check',value=2);self.act('next')
        with self.assertRaises(Problem):self.act('next')
        for value in (False,'5',0,11):
            with self.subTest(value=value),self.assertRaises(Problem):self.act('draft',value=value)
        self.act('draft',value=None);self.act('next');self.act('draft',value='An optional thought');p=self.act('next')['modules'][self.mid]
        self.assertEqual(p['history'][0]['answers']['intention'],'An optional thought')
