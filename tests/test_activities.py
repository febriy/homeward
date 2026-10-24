"""A planned action, a real-world try and a reflection are different states."""
import copy
import secrets
import unittest
from concurrent.futures import ThreadPoolExecutor
import psycopg
from psycopg import sql
from test_homeward import DSN, PASSWORD
from core import Sessions, Problem
from db import Database
from activities import ACTIVITIES, update_activity
from modules import update_module

class ActivityTests(unittest.TestCase):
    def setUp(self):
        self.database=Database(DSN,'test_'+secrets.token_hex(8));self.database.migrate()
        self.store=Sessions(self.database);self.user=self.store.authenticate(self.store.guest())
        self.aid=ACTIVITIES[0]['id']
    def tearDown(self):
        with psycopg.connect(DSN) as db:db.execute(sql.SQL('DROP SCHEMA {} CASCADE').format(sql.Identifier(self.database.schema)))
    def data(self):return self.store.view(self.user)['learning']
    def payload(self,action,fields=None):
        data=self.data();p=data.get('activities',{}).get(self.aid)
        return dict(activity_id=self.aid,action=action,fields=fields or {},stage=p['stage'] if p else None,version=data['version'],operation=secrets.token_hex(16))
    def act(self,action,fields=None):return update_activity(self.store,self.user,self.payload(action,fields))['learning']['activities'][self.aid]
    def ready(self):
        self.act('start');self.act('next');self.act('next',{'action':'Chop carrots for tomorrow’s soup.'})
        return self.act('next',{'cue':'After tonight’s dinner'})
    def finish(self,outcome='worked'):
        self.ready();self.act('reflect');return self.act('next',{'outcome':outcome,'note':''})
    def test_plans_do_not_count_as_attempts_or_award_xp(self):
        for a in ACTIVITIES:
            self.aid=a['id'];p=self.ready()
            self.assertEqual(p['stage'],'ready');self.assertFalse(p['awarded']);self.assertEqual(p['history'],[])
            with self.assertRaises(Problem):self.act('next')
    def test_save_back_and_resume_keep_edited_action_and_cue(self):
        self.act('start');self.act('next');self.act('save',{'action':'My small action'})
        p=self.act('start');self.assertEqual(p['stage'],'action');self.assertEqual(p['plan']['action'],'My small action')
        self.act('next');self.act('back',{'cue':'Tuesday at 6'})
        p=self.act('next');self.assertEqual(p['plan']['cue'],'Tuesday at 6')
        self.act('next');self.act('edit');p=self.act('next',{'action':'A smaller action'})
        self.assertEqual(p['plan'],{'action':'A smaller action','cue':'Tuesday at 6'})
    def test_not_yet_is_recorded_without_reward_and_later_attempt_can_earn(self):
        p=self.finish('not-yet');self.assertFalse(p['awarded']);self.assertEqual(p['history'][0]['earned'],0)
        old=copy.deepcopy(p['history'][0]);p=self.finish('adjust')
        self.assertTrue(p['awarded']);self.assertEqual(p['history'][1]['earned'],20);self.assertEqual(p['history'][0],old)
    def test_repetition_saves_new_snapshot_without_duplicate_xp(self):
        p=self.finish();old=copy.deepcopy(p['history'][0]);p=self.finish('adjust')
        self.assertEqual(len(p['history']),2);self.assertEqual(p['history'][1]['earned'],0);self.assertEqual(p['history'][0],old)
        self.assertNotEqual(p['history'][0]['id'],p['history'][1]['id'])
    def test_concurrent_completion_and_lost_response_are_idempotent(self):
        self.ready();self.act('reflect');body=self.payload('next',{'outcome':'adjust'})
        with ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(lambda _:update_activity(self.store,self.user,body),range(2)))
        self.assertEqual(results[0],results[1]);p=self.data()['activities'][self.aid]
        self.assertEqual(len(p['history']),1);self.assertEqual(p['history'][0]['earned'],20)
    def test_stale_tabs_and_wrong_stage_cannot_change_saved_plan(self):
        self.act('start');self.act('next');stale=self.payload('next',{'action':'Old action'})
        self.act('save',{'action':'Latest action'})
        with self.assertRaises(Problem) as caught:update_activity(self.store,self.user,stale)
        self.assertEqual(caught.exception.status,409)
        body=self.payload('next',{'cue':'Skip ahead'});body['stage']='cue'
        with self.assertRaises(Problem):update_activity(self.store,self.user,body)
        self.assertEqual(self.data()['activities'][self.aid]['plan']['action'],'Latest action')
    def test_validation_requires_action_cue_and_outcome_but_not_note(self):
        self.act('start');self.act('next')
        for fields in ({'action':''},{'action':' '*3},{'action':'x'*401},{'action':False},{'cue':'wrong step'}):
            with self.subTest(fields=fields),self.assertRaises(Problem):self.act('next',fields)
        self.act('next',{'action':'Cut vegetables'})
        with self.assertRaises(Problem):self.act('next')
        self.act('next',{'cue':'After breakfast'});self.act('reflect')
        for value in ('',[],False,'perfect'):
            with self.subTest(value=value),self.assertRaises(Problem):self.act('next',{'outcome':value})
        self.assertEqual(self.act('next',{'outcome':'worked'})['history'][0]['note'],'')
    def test_private_history_export_and_existing_lessons_survive(self):
        self.finish()
        learning=copy.deepcopy(self.data())
        update_module(self.store,self.user,dict(action='start',module_id='talk-without-blame',version=learning['version'],operation=secrets.token_hex(16)))
        self.assertEqual(self.data()['activities'],learning['activities'])
        self.store.new_session(self.user,'A later season')
        self.assertEqual(self.data()['activities'],learning['activities'])
        partner=self.store.authenticate(self.store.register(dict(handle='partner',name='Partner',password=PASSWORD,invite=self.store.view(self.user)['room']['invite'])))
        self.assertFalse(self.store.view(partner)['learning'].get('activities'))
