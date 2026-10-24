"""Persisted couples sessions with caller-specific views and explicit agreement."""
import copy
from datetime import datetime, timezone
import hashlib
import hmac
import json
import re
import secrets
import time

from db import Database
from workbook import QUESTIONS, EXAMPLES, MEALS, statement_template


class Problem(Exception):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


def text(value, limit=3000, required=True):
    if not isinstance(value, str) or len(value) > limit:
        raise Problem('Please use a shorter text answer.')
    value = value.strip()
    if required and not value:
        raise Problem('Add a few words first.')
    return value


def identifier():
    return secrets.token_hex(12)


def now():
    return datetime.now(timezone.utc).isoformat()


def fingerprint(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def empty_interview():
    return {'topics': {}, 'cards': [], 'published': [], 'suggested': False}


def item_hash(item):
    return fingerprint({key: item.get(key) for key in ('id', 'kind', 'label', 'meaning', 'example')})


def agreed(item, users):
    return len(users) == 2 and all(item.get('approvals', {}).get(uid) == item_hash(item) for uid in users)


def approved_shared(data, users):
    return [item for item in data['shared'] if agreed(item, users)]


def public_cards(data):
    result = []
    for uid, interview in data['interviews'].items():
        for card in interview['published']:
            result.append(dict(card, owner=uid))
    return result


def clean_card(raw, allowed=None):
    if raw.get('kind') not in ('value', 'feeling'):
        raise Problem('Choose value or feeling.')
    sources = raw.get('source_ids', [])
    if not isinstance(sources, list) or any(not isinstance(s, str) for s in sources):
        raise Problem('Invalid supporting references.')
    if allowed is not None and (not sources or not set(sources).issubset(allowed)):
        raise Problem('This wording referenced material outside the shared cards. Choose the cards this draws on.')
    return {'id': identifier(), 'kind': raw['kind'], 'label': text(raw.get('label'), 60),
            'meaning': text(raw.get('meaning'), 600), 'example': text(raw.get('example', ''), 600, False),
            'source_ids': list(dict.fromkeys(sources)), 'selected': False}


PRACTICE_FIELDS = {
    'value_id': 60, 'feeling_id': 60, 'title': 160, 'meal_id': 40,
    'meal': 160, 'when': 160, 'prep': 600, 'contribution': 600,
    'child': 160, 'fallback': 600, 'review_when': 160,
}
PRACTICE_REQUIRED = {'value_id', 'title', 'meal_id', 'meal', 'when', 'prep',
                     'contribution', 'fallback', 'review_when'}


def practice_hash(plan):
    return fingerprint({'fields': plan['fields'], 'source_hash': plan['source_hash']})


def vision_hash(data, users):
    return fingerprint({'text': (data['draft'] or {}).get('text'),
                        'priorities': [item_hash(card) for card in approved_shared(data, users)]})


def apply_practice(data, user, users, action, body):
    plan = data.get('practice')
    if action == 'practice_cancel_review':
        if not plan or not plan.get('review_draft'):
            raise Problem('There is no pending review to set aside.')
        plan.setdefault('review_history', []).append(dict(plan['review_draft'],
                    set_aside_at=now(), set_aside_by=user['id']))
        plan['review_draft'] = None
        return
    if not data['completed']:
        raise Problem('Both partners need to approve the vision before planning a practice.')
    source_hash = vision_hash(data, users)
    if action == 'practice_save':
        incoming = body.get('fields')
        if not isinstance(incoming, dict) or not incoming or not set(incoming).issubset(PRACTICE_FIELDS):
            raise Problem('Choose the practice details you want to save.')
        fields = dict(plan['fields']) if plan else {}
        fields.update({key: text(value, PRACTICE_FIELDS[key], False) for key, value in incoming.items()})
        shared = approved_shared(data, users)
        for key, kind in [('value_id', 'value'), ('feeling_id', 'feeling')]:
            if fields.get(key) and not any(c['id'] == fields[key] and c['kind'] == kind for c in shared):
                raise Problem('Choose a priority you have both agreed on.')
        if fields.get('meal_id') not in {None, '', 'custom'} | {m['id'] for m in MEALS}:
            raise Problem('Choose a meal or add your own.')
        if not plan:
            plan = {'id': identifier(), 'revision': 0, 'fields': {}, 'approvals': {},
                    'history': [], 'reviews': [], 'review_draft': None, 'status': 'draft'}
            data['practice'] = plan
        if fields != plan['fields'] or plan.get('source_hash') != source_hash:
            if plan['fields']:
                plan['history'].append({key: copy.deepcopy(plan.get(key)) for key in
                                        ('revision', 'fields', 'approvals', 'source_statement', 'status')})
            if plan.get('review_draft'):
                raise Problem('Finish or revise the pending review before editing the plan.')
            plan.update(fields=fields, revision=plan['revision'] + 1, approvals={}, status='draft',
                        source_hash=source_hash, source_statement=data['draft']['text'])
        return
    if not plan:
        raise Problem('Save a dinner plan first.')
    if plan['source_hash'] != source_hash:
        raise Problem('Your vision changed. Save the plan again before agreeing to it.')
    if action == 'practice_approve':
        if not all(plan['fields'].get(key) for key in PRACTICE_REQUIRED):
            raise Problem('Complete the meal, timing, responsibilities, fallback and review details first.')
        if plan['status'] == 'paused':
            raise Problem('Revise the plan before starting it again.')
        plan['approvals'][user['id']] = practice_hash(plan)
        if all(plan['approvals'].get(uid) == practice_hash(plan) for uid in users):
            plan['status'] = 'active'
    elif action == 'practice_withdraw':
        if plan.get('review_draft'):
            raise Problem('Finish the pending review before changing plan agreement.')
        plan['approvals'].pop(user['id'], None)
        plan['status'] = 'draft'
    elif action == 'practice_review':
        if plan['status'] != 'active':
            raise Problem('Both partners need to agree on the plan before reviewing it.')
        outcome = body.get('outcome')
        if outcome not in ('keep', 'adjust', 'pause'):
            raise Problem('Choose keep, adjust or set aside.')
        plan['review_draft'] = {'helped': text(body.get('helped'), 1200),
                                'difficult': text(body.get('difficult', ''), 1200, False),
                                'outcome': outcome, 'approvals': {}, 'plan_revision': plan['revision']}
    elif action == 'practice_review_approve':
        review = plan.get('review_draft')
        if not review or plan['status'] != 'active':
            raise Problem('Save a review for you both to read first.')
        review['approvals'][user['id']] = True
        if all(review['approvals'].get(uid) for uid in users):
            plan['reviews'].append(dict(review, saved_at=now()))
            plan['review_draft'] = None
            if review['outcome'] != 'keep':
                plan['status'] = 'paused' if review['outcome'] == 'pause' else 'draft'
                plan['approvals'] = {}
    else:
        raise Problem('Unknown practice action.')


class Sessions:
    def __init__(self, database):
        self.database = database

    def connect(self):
        return self.database.connect()

    def rate_limit(self, key, limit=10, seconds=900):
        stamp = int(time.time())
        hashed = hashlib.sha256(key.encode()).hexdigest()
        with self.connect() as db:
            db.execute('DELETE FROM rate_limits WHERE expires < %s', (stamp,))
            row = db.execute(
                'INSERT INTO rate_limits VALUES(%s,1,%s) '
                'ON CONFLICT(key) DO UPDATE SET hits=rate_limits.hits+1 RETURNING hits',
                (hashed, stamp + seconds)).fetchone()
        if row['hits'] > limit:
            raise Problem('Too many attempts. Wait 15 minutes before trying again.', 429)

    def register(self, body):
        handle = text(body.get('handle'), 32).lower()
        name = text(body.get('name'), 40)
        password = text(body.get('password'), 200)
        if not re.fullmatch(r'[a-z0-9_.-]{3,32}', handle) or len(password) < 12:
            raise Problem('Use a username of 3–32 letters/numbers and a password of at least 12 characters.')
        invitation = text(body.get('invite', ''), 32, False).upper()
        uid, salt = identifier(), secrets.token_hex(16)
        hashed = hashlib.pbkdf2_hmac('sha256', password.encode(), bytes.fromhex(salt), 600000).hex()
        with self.connect() as db:
            if db.execute('SELECT 1 FROM users WHERE handle=%s', (handle,)).fetchone():
                raise Problem('That username is already in use in Homeward.')
            if invitation:
                room = db.execute('SELECT id FROM rooms WHERE invite=%s FOR UPDATE', (invitation,)).fetchone()
                if not room:
                    raise Problem('That partner code was not found.')
                room_id = room['id']
                if db.execute('SELECT COUNT(*) AS n FROM users WHERE room=%s', (room_id,)).fetchone()['n'] >= 2:
                    raise Problem('This couple already has two profiles.')
            else:
                room_id = identifier()
                room_name = text(body.get('room_name', 'Our home'), 60)
                db.execute('INSERT INTO rooms VALUES(%s,%s,%s)',
                           (room_id, room_name, secrets.token_hex(12).upper()))
            db.execute('INSERT INTO users(id,handle,name,room,salt,password) VALUES(%s,%s,%s,%s,%s,%s)', (uid, handle, name, room_id, salt, hashed))
        return self.login({'handle': handle, 'password': password})

    def login(self, body):
        handle = text(body.get('handle'), 32).lower()
        password = text(body.get('password'), 200)
        with self.connect() as db:
            db.execute('DELETE FROM logins WHERE expires < %s', (int(time.time()),))
            user = db.execute('SELECT * FROM users WHERE handle=%s', (handle,)).fetchone()
            if user:
                hashed = hashlib.pbkdf2_hmac('sha256', password.encode(), bytes.fromhex(user['salt']), 600000).hex()
            else:
                hashlib.pbkdf2_hmac('sha256', password.encode(), bytes(16), 600000)
                hashed = ''
            if not user or not hmac.compare_digest(hashed, user['password']):
                raise Problem('Username or password is incorrect.', 401)
            token = secrets.token_urlsafe(32)
            db.execute('INSERT INTO logins VALUES(%s,%s,%s)', (fingerprint(token), user['id'], int(time.time()) + 86400))
        return token

    def guest(self):
        """An isolated browser-owned space, never a shared public account."""
        uid, room, token = identifier(), identifier(), secrets.token_urlsafe(32)
        with self.connect() as db:
            db.execute('INSERT INTO rooms VALUES(%s,%s,%s)',
                       (room, 'Our home', secrets.token_hex(12).upper()))
            db.execute('INSERT INTO users(id,handle,name,room,salt,password,is_guest) VALUES(%s,%s,%s,%s,%s,%s,TRUE)',
                       (uid, 'guest_' + identifier(), 'Guest', room, secrets.token_hex(16), secrets.token_hex(32)))
            db.execute('INSERT INTO logins VALUES(%s,%s,%s)',
                       (fingerprint(token), uid, int(time.time()) + 30 * 86400))
        return token

    def authenticate(self, token):
        with self.connect() as db:
            row = db.execute('SELECT u.id,u.name,u.room,u.is_guest FROM logins l JOIN users u ON u.id=l.user_id '
                             'WHERE l.token=%s AND l.expires>%s', (fingerprint(token), int(time.time()))).fetchone()
        if not row:
            raise Problem('Open Homeward again to continue.', 401)
        return dict(row)

    def logout(self, token):
        with self.connect() as db:
            db.execute('DELETE FROM logins WHERE token=%s', (fingerprint(token),))

    def members(self, room):
        with self.connect() as db:
            return [dict(row) for row in db.execute('SELECT id,name FROM users WHERE room=%s ORDER BY created', (room,))]

    def load(self, user, session_id=None):
        with self.connect() as db:
            if session_id:
                row = db.execute('SELECT * FROM sessions WHERE id=%s AND room=%s', (session_id, user['room'])).fetchone()
                if not row:
                    raise Problem('Session not found.', 404)
            else:
                row = db.execute('SELECT * FROM sessions WHERE room=%s ORDER BY sequence DESC LIMIT 1', (user['room'],)).fetchone()
                if not row:
                    sid = self.new_session(user, initial=True)
                    return self.load(user, sid)
        result = dict(row)
        result['data'] = json.loads(row['data'])
        result['data']['interviews'].setdefault(user['id'], empty_interview())
        return result

    def new_session(self, user, title=None, initial=False):
        sid = identifier()
        data = {'interviews': {member['id']: empty_interview() for member in self.members(user['room'])},
                'shared': [], 'draft': None, 'completed': False, 'practice': None}
        with self.connect() as db:
            db.execute('SELECT id FROM rooms WHERE id=%s FOR UPDATE', (user['room'],))
            if initial:
                existing = db.execute('SELECT id FROM sessions WHERE room=%s ORDER BY sequence DESC LIMIT 1', (user['room'],)).fetchone()
                if existing:
                    return existing['id']
            db.execute('INSERT INTO sessions(id,room,created,title,version,data) VALUES(%s,%s,%s,%s,%s,%s)', (sid, user['room'], now(),
                text(title or 'Our vision · ' + datetime.now().strftime('%Y'), 80), 0, json.dumps(data)))
        return sid

    def view(self, user, session_id=None):
        from skills import read_skill, milestones
        from lessons import LESSONS, read_learning
        session = self.load(user, session_id)
        data = session.pop('data')
        members = self.members(user['room'])
        users = [m['id'] for m in members]
        with self.connect() as db:
            skill = read_skill(db, user)
            learning = read_learning(db, user)
            shared_milestones = milestones(db, user)
            room = dict(db.execute('SELECT * FROM rooms WHERE id=%s', (user['room'],)).fetchone())
            history = [dict(row) for row in db.execute('SELECT id,title,created FROM sessions WHERE room=%s ORDER BY sequence DESC', (user['room'],))]
        session.update(private=data['interviews'][user['id']], published=public_cards(data),
                       shared=[dict(item, agreed=agreed(item, users)) for item in data['shared']],
                       draft=data['draft'], completed=data['completed'], revisions=data.get('revisions', []), practice=data.get('practice'))
        if session['practice']:
            session['practice']['vision_current'] = bool(data['completed'] and
                session['practice']['source_hash'] == vision_hash(data, users))
        return {'user': user, 'room': room, 'members': members, 'session': session, 'history': history,
                'skill': skill, 'milestones': shared_milestones,
                'lessons': LESSONS, 'learning': learning,
                'questions': [{'title': title, 'question': question, 'probe': probe} for title, question, probe in QUESTIONS],
                'examples': EXAMPLES, 'meals': MEALS}

    def act(self, user, action, body):
        session = self.load(user, body.get('session_id'))
        if body.get('version') != session['version']:
            raise Problem('The session changed. Refresh to see the latest saved work.', 409)
        data = copy.deepcopy(session['data'])
        previous_draft = copy.deepcopy(data['draft'])
        private = data['interviews'][user['id']]
        users = [m['id'] for m in self.members(user['room'])]
        if action == 'answer':
            index = body.get('topic')
            if not isinstance(index, int) or index not in range(len(QUESTIONS)):
                raise Problem('Unknown interview question.')
            key = str(index)
            topic = private['topics'].setdefault(key, {'id': identifier(), 'answers': []})
            topic['answers'] = [text(body.get('answer'))]
            topic['confirmed'] = False
            topic['proposal'] = None
            private['suggested'] = False
        elif action == 'confirm':
            topic = private['topics'].get(str(body.get('topic')))
            if not topic:
                raise Problem('Save an answer first.')
            topic['meaning'] = text(body.get('meaning'), 1200)
            topic['confirmed'] = True
            private['suggested'] = False
        elif action == 'add_example':
            example = next((c for c in EXAMPLES if c['id'] == body.get('id')), None)
            if not example:
                raise Problem('Choose an example from the workbook.')
            if any(c.get('example_id') == example['id'] for c in private['cards']):
                raise Problem('That example is already in your cards. Edit or select it there.')
            card = clean_card(example)
            card['example_id'] = example['id']
            private['cards'].append(card)
        elif action in ('card', 'delete_card'):
            card_id = body.get('id')
            existing = next((c for c in private['cards'] if c['id'] == card_id), None)
            if action == 'delete_card':
                if not existing:
                    raise Problem('Card not found.')
                private['cards'].remove(existing)
            else:
                card = clean_card(body)
                if existing and existing.get('example_id'):
                    card['example_id'] = existing['example_id']
                card['edited'] = True
                card['selected'] = bool(body.get('selected', False))
                if existing:
                    card['id'] = existing['id']
                    private['cards'][private['cards'].index(existing)] = card
                else:
                    private['cards'].append(card)
                for kind in ('value', 'feeling'):
                    if sum(c['kind'] == kind and c.get('selected', False) for c in private['cards']) > 3:
                        raise Problem('Choose up to three ' + ('values' if kind == 'value' else 'feelings') + '.')
        elif action == 'publish':
            ids = body.get('ids', [])
            chosen = [card for card in private['cards'] if card['id'] in ids and card.get('selected')]
            if len(ids) != len(chosen):
                raise Problem('Only your chosen cards can be shared.')
            # This explicit publication copies reviewed card text, never private source answers.
            private['published'] = [{key: card[key] for key in ('id', 'kind', 'label', 'meaning', 'example')}
                                    for card in chosen]
            # Any re-publication changes the shared context; invalidate downstream decisions.
            data['shared'] = []
            data['draft'] = None
            data['completed'] = False
        elif action == 'shared_card':
            published = public_cards(data)
            if len(users) != 2 or not all(any(c['owner'] == uid for c in published) for uid in users):
                raise Problem('Both partners need to share their chosen cards first.')
            allowed = {card['id'] for card in published}
            existing = next((c for c in data['shared'] if c['id'] == body.get('id')), None)
            card = clean_card(body, allowed)
            source_kinds = {c['kind'] for c in published if c['id'] in card['source_ids']}
            if source_kinds != {card['kind']}:
                raise Problem('Keep values and desired feelings separate when combining cards.')
            card['approvals'] = {}
            if existing:
                card['id'] = existing['id']
                data['shared'][data['shared'].index(existing)] = card
            else:
                data['shared'].append(card)
            data['draft'] = None
            data['completed'] = False
        elif action in ('agree', 'remove_shared'):
            card = next((c for c in data['shared'] if c['id'] == body.get('id')), None)
            if not card:
                raise Problem('Shared card not found.')
            if action == 'remove_shared':
                data['shared'].remove(card)
            elif body.get('agree', True):
                limit = 5 if card['kind'] == 'value' else 3
                if sum(c['kind'] == card['kind'] and agreed(c, users) for c in data['shared']) >= limit and not agreed(card, users):
                    raise Problem('The shared shortlist is full. Revise it together before adding another item.')
                card['approvals'][user['id']] = item_hash(card)
            else:
                card['approvals'].pop(user['id'], None)
            data['draft'] = None
            data['completed'] = False
        elif action == 'template':
            shared = approved_shared(data, users)
            if not any(card['kind'] == 'value' for card in shared):
                raise Problem('Agree on at least one shared value before drafting.')
            data['draft'] = {'text': statement_template(shared), 'source_ids': [card['id'] for card in shared],
                             'revision': (data['draft'] or {}).get('revision', 0) + 1, 'approvals': {}}
            data['completed'] = False
        elif action in ('edit_draft', 'approve_draft'):
            draft = data['draft']
            if not draft:
                if action != 'edit_draft':
                    raise Problem('Create a draft first.')
                shared = approved_shared(data, users)
                if not any(card['kind'] == 'value' for card in shared):
                    raise Problem('Agree on at least one shared value before writing the statement.')
                draft = {'text':'', 'revision':0, 'source_ids':[card['id'] for card in shared], 'approvals':{}}
                data['draft'] = draft
            if action == 'edit_draft':
                draft['text'] = text(body.get('text'), 1200)
                draft['revision'] += 1
                draft['approvals'] = {}
            else:
                draft['approvals'][user['id']] = fingerprint(draft['text'])
            data['completed'] = len(users) == 2 and all(draft['approvals'].get(uid) == fingerprint(draft['text']) for uid in users)
        elif isinstance(action, str) and action.startswith('practice_'):
            apply_practice(data, user, users, action, body)
        else:
            raise Problem('Unknown session action.')
        if previous_draft and previous_draft != data['draft']:
            data.setdefault('revisions', []).append(dict(previous_draft, saved_at=now(), reason=action))
        encoded = json.dumps(data, ensure_ascii=False)
        if len(encoded.encode()) > 1000000:
            raise Problem('This session is full. Export it and start a new session to continue.')
        with self.connect() as db:
            cursor = db.execute('UPDATE sessions SET version=version+1,data=%s WHERE id=%s AND room=%s AND version=%s',
                                (encoded, session['id'], user['room'], session['version']))
            if cursor.rowcount != 1:
                raise Problem('Your partner updated the session. Refresh before continuing.', 409)
        return self.view(user, session['id'])
