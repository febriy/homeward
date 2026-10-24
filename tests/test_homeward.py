"""Behaviour tests against a real PostgreSQL schema, never a database mock."""
from concurrent.futures import ThreadPoolExecutor
import http.client
from http.server import ThreadingHTTPServer
import json
import os
from pathlib import Path
import secrets
import sys
import threading
import unittest

from dotenv import load_dotenv
import psycopg
from psycopg import sql

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from core import Problem, Sessions
from db import Database
from server import make_handler

load_dotenv(Path(__file__).resolve().parents[1] / '.env.local')
DSN = os.environ.get('HOMEWARD_TEST_DATABASE_URL') or os.environ.get('DATABASE_URL')
PASSWORD = 'fictional-test-password'


class SessionTests(unittest.TestCase):
    def setUp(self):
        self.database = Database(DSN, 'test_' + secrets.token_hex(8))
        self.database.migrate()
        self.store = Sessions(self.database)
        self.ta = self.register('alice')
        self.a = self.store.authenticate(self.ta)
        self.sid = self.store.view(self.a)['session']['id']
        self.invite = self.store.view(self.a)['room']['invite']
        self.tb = self.register('bruno', self.invite)
        self.b = self.store.authenticate(self.tb)
        self.tc = self.register('casey')
        self.c = self.store.authenticate(self.tc)

    def tearDown(self):
        with psycopg.connect(DSN) as db:
            db.execute(sql.SQL('DROP SCHEMA {} CASCADE').format(sql.Identifier(self.database.schema)))

    def register(self, handle, invite=''):
        return self.store.register(dict(handle=handle, name=handle.title(), password=PASSWORD, invite=invite))

    def view(self, user=None):
        return self.store.view(user or self.a, self.sid)['session']

    def act(self, who, action, **body):
        return self.store.act(who, action, dict(session_id=self.sid, version=self.view(who)['version'], **body))['session']

    def publish(self, who):
        self.act(who, 'answer', topic=0, answer='PRIVATE: Coffee before a busy day.')
        self.act(who, 'confirm', topic=0, meaning='Room for simple things.')
        cards=[]
        for example in ('value-0', 'feeling-0'):
            state=self.act(who, 'add_example', id=example)
            card=state['private']['cards'][-1]
            state=self.act(who, 'card', **dict(card, selected=True))
            cards.append(card['id'])
        self.act(who, 'publish', ids=cards)

    def shared(self):
        self.publish(self.a); self.publish(self.b)
        ids=[]
        for card in self.view()['published'][:2]:
            state=self.act(self.a, 'shared_card', **{k:card[k] for k in ('kind','label','meaning','example')}, source_ids=[card['id']])
            shared=state['shared'][-1]
            self.act(self.a, 'agree', id=shared['id'])
            self.act(self.b, 'agree', id=shared['id'])
            ids.append(shared['id'])
        return ids

    def vision(self):
        self.shared()
        self.act(self.a, 'template')
        self.act(self.a, 'edit_draft', text='We make room for simple things and peaceful evenings.')
        self.act(self.a, 'approve_draft')
        self.act(self.b, 'approve_draft')

    def plan(self):
        self.vision()
        return self.act(self.a, 'practice_save', fields=dict(
            value_id=self.view()['shared'][0]['id'], title='A calmer dinner', meal_id='noodle-soup',
            meal='Noodle soup', when='Wednesday at 6.30', prep='Alice checks ingredients.',
            contribution='Bruno cooks; Alice sets the table.', child='',
            fallback='Eggs and toast', review_when='Sunday evening'))['practice']

    def active_plan(self):
        self.plan()
        self.act(self.a, 'practice_approve'); self.act(self.b, 'practice_approve')

    def test_private_answers_and_unshared_cards_never_reach_partner(self):
        self.publish(self.a)
        partner=json.dumps(self.view(self.b))
        self.assertNotIn('PRIVATE:', partner)
        self.assertNotIn('topics', json.dumps(self.view(self.b)['published']))
        self.assertEqual(self.view(self.b)['private']['topics'], {})

    def test_another_couple_cannot_read_or_modify_session(self):
        with self.assertRaises(Problem): self.store.view(self.c, self.sid)
        with self.assertRaises(Problem): self.store.act(self.c, 'answer', dict(session_id=self.sid,version=0,topic=0,answer='attack'))

    def test_no_ai_actions_exist(self):
        before=self.view()
        for action in ('reflect','suggest','suggest_shared','draft'):
            with self.assertRaises(Problem): self.act(self.a, action)
        self.assertEqual(before,self.view())

    def test_reload_keeps_work_and_template_uses_only_agreed_words(self):
        self.shared()
        state=self.act(self.a,'template')
        self.assertEqual(state['draft']['text'], 'In our home, we value Simplicity. We want home to feel Peaceful.')
        self.assertEqual(Sessions(Database(DSN,self.database.schema)).view(self.a,self.sid)['session'],state)

    def test_three_per_category_limit_and_editable_examples(self):
        for i in range(4):
            state=self.act(self.a,'add_example',id='value-'+str(i)); card=state['private']['cards'][-1]
            if i<3: self.act(self.a,'card',**dict(card,selected=True,meaning='My own meaning.'))
            else:
                with self.assertRaises(Problem): self.act(self.a,'card',**dict(card,selected=True))
        self.assertEqual(sum(c['selected'] for c in self.view()['private']['cards']),3)

    def test_published_card_is_snapshot_until_deliberately_shared_again(self):
        self.publish(self.a)
        card=self.view()['private']['cards'][0]
        self.act(self.a,'card',**dict(card,meaning='PRIVATE later revision'))
        self.assertNotIn('later revision',json.dumps(self.view(self.b)))

    def test_one_person_cannot_forge_statement_approval(self):
        self.shared();self.act(self.a,'template')
        state=self.act(self.a,'approve_draft',user=self.b['id'],approvals={self.b['id']:'forged'})
        self.assertFalse(state['completed']);self.assertEqual(list(state['draft']['approvals']),[self.a['id']])

    def test_statement_edit_requires_both_approvals_and_retains_history(self):
        self.vision()
        state=self.act(self.a,'edit_draft',text='We share the everyday work.')
        self.assertFalse(state['completed']);self.assertEqual(state['draft']['approvals'],{})
        self.assertTrue(state['revisions'])

    def test_shared_wording_requires_reviewed_sources_and_both_people(self):
        with self.assertRaises(Problem):self.act(self.a,'template')
        self.publish(self.a);self.publish(self.b)
        with self.assertRaises(Problem):self.act(self.a,'shared_card',kind='value',label='Invented',meaning='Unknown',source_ids=['bad'])
        value=self.view()['published'][0]
        with self.assertRaises(Problem):self.act(self.a,'shared_card',kind='feeling',label='Peace',meaning='Mixed',source_ids=[value['id']])

    def test_stale_write_keeps_both_peoples_saved_work(self):
        old=self.view()['version'];self.act(self.a,'answer',topic=0,answer='Saved')
        with self.assertRaises(Problem) as error:
            self.store.act(self.b,'answer',dict(session_id=self.sid,version=old,topic=0,answer='Stale'))
        self.assertEqual(error.exception.status,409)
        self.assertEqual(self.view()['private']['topics']['0']['answers'],['Saved'])

    def test_new_session_preserves_old_private_work(self):
        self.act(self.a,'answer',topic=0,answer='Remember this season')
        old=self.view();new=self.store.new_session(self.a)
        self.assertEqual(self.view(),old);self.assertNotEqual(new,self.sid)
        self.assertEqual(self.store.view(self.a,new)['session']['private']['topics'],{})

    def test_two_people_only_even_when_joining_concurrently(self):
        token=self.register('dana');dana=self.store.authenticate(token);invite=self.store.view(dana)['room']['invite']
        def join(name):
            try:self.register(name,invite);return True
            except Problem:return False
        with ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(join,['eric','fran']))
        self.assertEqual(sorted(results),[False,True]);self.assertEqual(len(self.store.members(dana['room'])),2)

    def test_passwords_and_login_tokens_are_not_stored_as_plaintext(self):
        with self.store.connect() as db:
            user=db.execute('SELECT password FROM users WHERE id=%s',(self.a['id'],)).fetchone()
            tokens=list(db.execute('SELECT token FROM logins'))
        self.assertNotEqual(user['password'],PASSWORD)
        self.assertNotIn(self.ta,[r['token'] for r in tokens])
        self.store.logout(self.ta)
        with self.assertRaises(Problem):self.store.authenticate(self.ta)

    def test_rate_limit_persists_between_store_instances(self):
        self.store.rate_limit('test',limit=1)
        with self.assertRaises(Problem) as error:Sessions(self.database).rate_limit('test',limit=1)
        self.assertEqual(error.exception.status,429)

    def test_practice_requires_shared_vision_and_complete_details(self):
        with self.assertRaises(Problem):self.act(self.a,'practice_save',fields={'title':'Dinner'})
        self.vision();self.act(self.a,'practice_save',fields={'title':'Dinner'})
        with self.assertRaises(Problem):self.act(self.a,'practice_approve')

    def test_practice_approvals_belong_to_caller_and_reset_on_edit(self):
        self.plan()
        state=self.act(self.a,'practice_approve',user=self.b['id'])
        self.assertEqual(state['practice']['status'],'draft')
        state=self.act(self.b,'practice_approve');self.assertEqual(state['practice']['status'],'active')
        state=self.act(self.a,'practice_save',fields={'meal_id':'custom','meal':'Dhal with rice'})
        self.assertEqual(state['practice']['approvals'],{});self.assertTrue(state['practice']['history'])
        self.assertEqual(Sessions(self.database).view(self.b,self.sid)['session']['practice']['fields']['meal'],'Dhal with rice')

    def test_review_requires_both_and_keeps_record(self):
        self.active_plan()
        self.act(self.a,'practice_review',helped='We sat down together.',difficult='Late start.',outcome='keep')
        self.act(self.a,'practice_review_approve',user=self.b['id'])
        self.assertEqual(self.view()['practice']['reviews'],[])
        state=self.act(self.b,'practice_review_approve')['practice']
        self.assertIsNone(state['review_draft']);self.assertEqual(state['status'],'active')
        self.assertEqual(state['reviews'][0]['helped'],'We sat down together.')

    def test_review_edit_invalidates_approval_and_adjust_pauses_agreement(self):
        self.active_plan();self.act(self.a,'practice_review',helped='Too busy.',outcome='keep')
        self.act(self.a,'practice_review_approve')
        self.act(self.b,'practice_review',helped='Let’s try an earlier day.',outcome='adjust')
        self.assertEqual(self.view()['practice']['review_draft']['approvals'],{})
        self.act(self.a,'practice_review_approve');self.act(self.b,'practice_review_approve')
        self.assertEqual(self.view()['practice']['status'],'draft');self.assertEqual(self.view()['practice']['approvals'],{})

    def test_pending_review_prevents_plan_overwrite_and_pause_preserves_it(self):
        self.active_plan();self.act(self.a,'practice_review',helped='Not useful this week.',outcome='pause')
        with self.assertRaises(Problem):self.act(self.a,'practice_save',fields={'when':'Friday'})
        self.act(self.a,'practice_review_approve');self.act(self.b,'practice_review_approve')
        self.assertEqual(self.view()['practice']['status'],'paused')
        self.assertTrue(self.view()['practice']['reviews'])

    def test_changed_vision_requires_practice_reconfirmation(self):
        self.active_plan()
        self.act(self.a,'edit_draft',text='We share responsibility for our home.')
        with self.assertRaises(Problem):self.act(self.a,'practice_review',helped='Test',outcome='keep')
        self.act(self.a,'approve_draft');self.act(self.b,'approve_draft')
        with self.assertRaises(Problem):self.act(self.a,'practice_approve')
        state=self.act(self.a,'practice_save',fields={'title':'Dinner with shared work'})
        self.assertEqual(state['practice']['status'],'draft')

    def test_changed_meaning_invalidates_practice_even_when_statement_text_is_same(self):
        self.active_plan();wording=self.view()['draft']['text'];card=self.view()['shared'][0]
        self.act(self.a,'shared_card',**dict(card,meaning='A different shared meaning.'))
        self.act(self.a,'agree',id=card['id']);self.act(self.b,'agree',id=card['id'])
        self.act(self.a,'edit_draft',text=wording)
        self.act(self.a,'approve_draft');self.act(self.b,'approve_draft')
        self.assertFalse(self.view()['practice']['vision_current'])
        with self.assertRaises(Problem):self.act(self.a,'practice_approve')

    def test_pending_review_can_be_set_aside_after_vision_changes_without_losing_text(self):
        self.active_plan();self.act(self.a,'practice_review',helped='Keep this reflection.',outcome='keep')
        self.act(self.a,'edit_draft',text='A new direction.')
        self.act(self.b,'practice_cancel_review')
        self.assertIsNone(self.view()['practice']['review_draft'])
        self.assertEqual(self.view()['practice']['review_history'][0]['helped'],'Keep this reflection.')



    def skill(self, who, action, **fields):
        from skills import update_skill
        return update_skill(self.store, who, dict(action=action,
            version=self.store.view(who)['skill']['version'], **fields))['skill']

    def completed_skill(self):
        self.skill(self.a, 'save', fields={'meal_id': 'noodle-soup'})
        self.skill(self.a, 'prepare')
        self.skill(self.a, 'save', fields={'checks': dict(ingredients=True, time=True, help=True)})
        self.skill(self.a, 'ready')
        self.skill(self.a, 'tried')
        self.skill(self.a, 'save', fields={'confidence': 'practising', 'note': 'PRIVATE SKILL NOTE'})
        return self.skill(self.a, 'review')

    def test_skill_independent_of_vision_and_new_sessions(self):
        result = self.completed_skill()
        self.assertEqual(result['xp'], 10)
        self.assertFalse(self.view()['completed'])
        self.store.new_session(self.a)
        self.assertEqual(self.store.view(self.a)['skill']['history'], result['history'])
        self.assertEqual(Sessions(self.database).view(self.a)['skill']['stage'], 'complete')

    def test_skill_private_except_explicit_milestone(self):
        self.completed_skill()
        other = self.store.view(self.b)
        self.assertEqual(other['skill']['xp'], 0)
        self.assertNotIn('PRIVATE SKILL NOTE', json.dumps(other))
        self.assertEqual(other['milestones'], [])
        self.skill(self.a, 'share')
        other = self.store.view(self.b)
        self.assertEqual(other['milestones'], [{'name': 'Alice', 'label': 'Practised a dependable dinner'}])
        self.assertNotIn('PRIVATE SKILL NOTE', json.dumps(other))
        self.assertEqual(self.store.view(self.c)['milestones'], [])
        self.skill(self.a, 'unshare')
        self.assertEqual(self.store.view(self.b)['milestones'], [])

    def test_skill_retries_and_stale_tabs_cannot_duplicate_xp(self):
        from skills import update_skill
        result = self.completed_skill()
        with self.assertRaises(Problem):
            update_skill(self.store, self.a, {'action': 'review', 'version': result['version'] - 1})
        with self.assertRaises(Problem):
            self.skill(self.a, 'review')
        self.assertEqual(self.store.view(self.a)['skill']['xp'], 10)
        result = self.skill(self.a, 'repeat')
        self.assertFalse(any(result['checks'].values()))
        self.assertEqual(result['note'], '')
        self.assertEqual(len(result['history']), 1)
        self.skill(self.a, 'save', fields={'checks': dict(ingredients=True, time=True, help=True)})
        self.skill(self.a, 'ready'); self.skill(self.a, 'tried')
        self.skill(self.a, 'save', fields={'confidence':'comfortable'})
        self.assertEqual(self.skill(self.a, 'review')['xp'], 20)

    def test_skill_readiness_validation_and_replanning(self):
        with self.assertRaises(Problem): self.skill(self.a, 'review')
        with self.assertRaises(Problem): self.skill(self.a, 'save', fields={'confidence':'comfortable'})
        self.skill(self.a, 'save', fields={'meal_id':'custom', 'meal':''})
        with self.assertRaises(Problem): self.skill(self.a, 'prepare')
        self.skill(self.a, 'save', fields={'meal':'Rice and beans'})
        self.skill(self.a, 'prepare')
        with self.assertRaises(Problem): self.skill(self.a, 'ready')
        with self.assertRaises(Problem): self.skill(self.a, 'save', fields={'checks':{'ingredients':'yes','time':True,'help':True}})
        self.skill(self.a, 'save', fields={'checks':dict(ingredients=True,time=True,help=True)})
        self.skill(self.a, 'ready')
        with self.assertRaises(Problem): self.skill(self.a, 'save', fields={'meal_id':'eggs-toast'})
        self.skill(self.a, 'reopen')
        changed=self.skill(self.a, 'save', fields={'meal_id':'eggs-toast'})
        self.assertFalse(any(changed['checks'].values()))
        self.assertEqual(changed['meal'], 'Eggs & toast')
        self.assertEqual(changed['stage'], 'choose')
        self.skill(self.a, 'prepare')
        self.skill(self.a, 'save', fields={'meal_id':'custom', 'meal':''})
        self.assertEqual(self.store.view(self.a)['skill']['stage'], 'choose')
        with self.assertRaises(Problem): self.skill(self.a, 'ready')


class HttpTests(unittest.TestCase):
    def setUp(self):
        self.database=Database(DSN,'test_'+secrets.token_hex(8));self.database.migrate()
        self.store=Sessions(self.database)
        self.server=ThreadingHTTPServer(('127.0.0.1',0),make_handler(self.store))
        self.thread=threading.Thread(target=self.server.serve_forever,daemon=True);self.thread.start()
        self.port=self.server.server_port

    def tearDown(self):
        self.server.shutdown();self.server.server_close();self.thread.join()
        with psycopg.connect(DSN) as db:db.execute(sql.SQL('DROP SCHEMA {} CASCADE').format(sql.Identifier(self.database.schema)))

    def request(self,method,path,body=None,headers=None):
        conn=http.client.HTTPConnection('127.0.0.1',self.port)
        h={'Origin':'http://127.0.0.1:'+str(self.port),'Content-Type':'application/json'};h.update(headers or {})
        conn.request(method,path,json.dumps(body) if body is not None else None,h)
        response=conn.getresponse();result=response.status,dict(response.getheaders()),response.read();conn.close();return result

    def test_origin_and_file_boundaries(self):
        self.assertEqual(self.request('POST','/api/register',{}, {'Origin':'https://evil.example'})[0],403)
        for path in ('/.env.local','/core.py','/schema.sql','/.local/postgres.log'):
            self.assertEqual(self.request('GET',path)[0],404)
        self.assertEqual(self.request('GET','/api/state')[0],401)
        self.assertEqual(self.request('GET','/api/handler?route=health')[0],200)

    def test_signin_cookie_profile_check_and_private_export(self):
        code,headers,body=self.request('POST','/api/register',dict(handle='alice',name='Alice',password=PASSWORD))
        self.assertEqual(code,200);self.assertIn('HttpOnly',headers['Set-Cookie']);self.assertIn('SameSite=Strict',headers['Set-Cookie'])
        state=json.loads(body);cookie=headers['Set-Cookie'].split(';')[0]
        body=dict(action='answer',session_id=state['session']['id'],version=state['session']['version'],topic=0,answer='Private')
        self.assertEqual(self.request('POST','/api/action',body,{'Cookie':cookie,'X-Profile':'wrong'})[0],409)
        self.assertEqual(self.request('POST','/api/action',body,{'Cookie':cookie,'X-Profile':state['user']['id']})[0],200)
        code,_,payload=self.request('GET','/api/export',headers={'Cookie':cookie})
        self.assertEqual(code,200);self.assertNotIn('room',json.loads(payload));self.assertIn(b'Private',payload)

    def test_guest_entry_needs_no_credentials_and_keeps_progress_isolated(self):
        code,headers,body=self.request('POST','/api/guest',{})
        self.assertEqual(code,200)
        self.assertIn('HttpOnly',headers['Set-Cookie'])
        self.assertIn('Max-Age=2592000',headers['Set-Cookie'])
        state=json.loads(body); cookie=headers['Set-Cookie'].split(';')[0]
        self.assertTrue(state['user']['is_guest'])
        profile={'Cookie':cookie,'X-Profile':state['user']['id']}
        code,_,_=self.request('POST','/api/skill',{'action':'save','version':0,'fields':{'meal_id':'noodle-soup'}},profile)
        self.assertEqual(code,200)
        code,_,saved=self.request('GET','/api/state',headers={'Cookie':cookie})
        self.assertEqual(code,200);self.assertEqual(json.loads(saved)['skill']['meal_id'],'noodle-soup')
        _,again_headers,again=self.request('POST','/api/guest',{},profile)
        self.assertEqual(json.loads(again)['user']['id'],state['user']['id'])
        self.assertNotIn('Set-Cookie',again_headers)
        _,other_headers,other=self.request('POST','/api/guest',{})
        other=json.loads(other)
        self.assertNotEqual(other['user']['id'],state['user']['id'])
        self.assertEqual(other['skill']['meal_id'],'')
        other_cookie=other_headers['Set-Cookie'].split(';')[0]
        self.assertEqual(self.request('GET','/api/state?session='+state['session']['id'],headers={'Cookie':other_cookie})[0],404)
        self.assertEqual(self.request('POST','/api/skill',{'action':'save','version':0,'fields':{'meal_id':'eggs-toast'}},{'Cookie':other_cookie,'X-Profile':state['user']['id']})[0],409)
        self.assertEqual(self.request('POST','/api/guest',{}, {'Origin':'https://evil.example'})[0],403)

    def test_guest_entry_preserves_existing_account_and_does_not_recover_it_without_cookie(self):
        _,headers,body=self.request('POST','/api/register',dict(handle='owner',name='Owner',password=PASSWORD))
        original=json.loads(body); cookie=headers['Set-Cookie'].split(';')[0]
        _,_,same=self.request('POST','/api/guest',{}, {'Cookie':cookie})
        self.assertEqual(json.loads(same)['user']['id'],original['user']['id'])
        _,_,fresh=self.request('POST','/api/guest',{}, {'Cookie':'homeward_session=invalid'})
        fresh=json.loads(fresh)
        self.assertTrue(fresh['user']['is_guest'])
        self.assertNotEqual(fresh['room']['id'],original['room']['id'])

    def test_hosted_cookie_is_secure_and_origin_is_explicit(self):
        secure=ThreadingHTTPServer(('127.0.0.1',0),make_handler(self.store,origins={'https://homeward.example'},hosted=True))
        thread=threading.Thread(target=secure.serve_forever,daemon=True);thread.start()
        original=self.port;self.port=secure.server_port
        try:
            code,headers,_=self.request('POST','/api/register',dict(handle='bruno',name='Bruno',password=PASSWORD),{'Host':'homeward.example','Origin':'https://homeward.example'})
            self.assertEqual(code,200);self.assertIn('; Secure',headers['Set-Cookie'])
            code,headers,_=self.request('POST','/api/guest',{}, {'Host':'homeward.example','Origin':'https://homeward.example'})
            self.assertEqual(code,200);self.assertIn('; Secure',headers['Set-Cookie'])
        finally:
            self.port=original;secure.shutdown();secure.server_close();thread.join()


if __name__=='__main__':unittest.main()
