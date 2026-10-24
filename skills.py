"""Private, account-scoped micro-skills. Shared milestones contain no self-checks."""
import copy
import json
from core import Problem, identifier, now, text
from workbook import MEALS


def empty_skill():
    return {'version': 0, 'attempt': identifier(), 'stage': 'choose', 'meal_id': '', 'meal': '',
            'checks': {'ingredients': False, 'time': False, 'help': False},
            'confidence': '', 'note': '', 'history': [], 'shared': False}


def read_skill(db, user):
    row = db.execute('SELECT data FROM skills WHERE user_id=%s', (user['id'],)).fetchone()
    # A stable initial attempt is created only on the first write.
    data = json.loads(row['data']) if row else empty_skill()
    data['xp'] = len(data['history']) * 10
    return data


def milestones(db, user):
    rows = db.execute('SELECT u.name, s.data FROM skills s JOIN users u ON u.id=s.user_id WHERE u.room=%s', (user['room'],))
    return [{'name': row['name'], 'label': 'Practised a dependable dinner'} for row in rows if json.loads(row['data']).get('shared')]


def update_skill(store, user, body):
    with store.connect() as db:
        # Lock the profile even before its first skill exists; concurrent first writes cannot race.
        db.execute('SELECT id FROM users WHERE id=%s FOR UPDATE', (user['id'],))
        data = read_skill(db, user)
        if body.get('version') != data['version']:
            raise Problem('This practice changed in another tab. Reload the saved version before continuing.', 409)
        action = body.get('action')
        if action == 'save':
            incoming = body.get('fields', {})
            if not isinstance(incoming, dict) or not set(incoming).issubset({'meal_id', 'meal', 'checks', 'confidence', 'note'}):
                raise Problem('Choose the practice details to save.')
            if data['stage'] == 'complete':
                raise Problem('Start another practice before changing these details.')
            if any(k in incoming for k in ('meal_id', 'meal', 'checks')) and data['stage'] not in ('choose', 'prepare'):
                raise Problem('Your dinner is ready. Finish this practice before choosing another meal.')
            if 'meal_id' in incoming:
                meal_id = incoming['meal_id']
                meal = next((m for m in MEALS if m['id'] == meal_id), None)
                if meal_id != 'custom' and not meal:
                    raise Problem('Choose a pictured meal or add your own.')
                if meal_id != data['meal_id']:
                    data['checks'] = dict.fromkeys(data['checks'], False)
                    data['stage'] = 'choose'
                data['meal_id'] = meal_id
                data['meal'] = meal['name'] if meal else text(incoming.get('meal', ''), 160, False)
            elif 'meal' in incoming:
                if data['meal_id'] != 'custom':
                    raise Problem('Choose your own meal before naming it.')
                name = text(incoming['meal'], 160, False)
                if name != data['meal']:
                    data['stage'] = 'choose'
                    data['checks'] = dict.fromkeys(data['checks'], False)
                data['meal'] = name
            if 'checks' in incoming:
                checks = incoming['checks']
                if not isinstance(checks, dict) or set(checks) != set(data['checks']) or any(type(v) is not bool for v in checks.values()):
                    raise Problem('Use the three readiness checks.')
                data['checks'] = checks
            if 'confidence' in incoming:
                if data['stage'] != 'tried' or incoming['confidence'] not in ('help', 'practising', 'comfortable'):
                    raise Problem('Try your dinner before checking how it went.')
                data['confidence'] = incoming['confidence']
            if 'note' in incoming:
                if data['stage'] != 'tried':
                    raise Problem('Try your dinner before adding a reflection.')
                data['note'] = text(incoming['note'], 600, False)
        elif action == 'prepare':
            if data['stage'] not in ('choose', 'prepare') or not data['meal']:
                raise Problem('Choose a meal and give it a name first.')
            data['stage'] = 'prepare'
        elif action == 'ready':
            if data['stage'] != 'prepare' or not data['meal'] or not all(data['checks'].values()):
                raise Problem('Finish the three readiness checks first.')
            data['stage'] = 'ready'
        elif action == 'reopen':
            if data['stage'] != 'ready':
                raise Problem('Only a ready dinner can return to preparation.')
            data['stage'] = 'prepare'
        elif action == 'tried':
            if data['stage'] != 'ready':
                raise Problem('Get your dinner ready before recording an attempt.')
            data['stage'] = 'tried'
        elif action == 'review':
            if data['stage'] != 'tried' or not data['confidence']:
                raise Problem('Choose how it went before saving progress.')
            data['history'].append({k: copy.deepcopy(data[k]) for k in ('attempt', 'meal_id', 'meal', 'confidence', 'note') } | {'saved_at': now()})
            data['stage'] = 'complete'
        elif action == 'repeat':
            if data['stage'] != 'complete':
                raise Problem('Finish your self-check before trying again.')
            data.update(attempt=identifier(), stage='prepare', checks=dict.fromkeys(data['checks'], False), confidence='', note='')
        elif action in ('share', 'unshare'):
            if not data['history']:
                raise Problem('Complete a practice before sharing a milestone.')
            data['shared'] = action == 'share'
        else:
            raise Problem('Unknown skill action.')
        data['version'] += 1
        data.pop('xp', None)
        db.execute('INSERT INTO skills(user_id,data) VALUES(%s,%s) ON CONFLICT(user_id) DO UPDATE SET data=EXCLUDED.data', (user['id'], json.dumps(data)))
        data['xp'] = len(data['history']) * 10
        return {'skill': data, 'milestones': milestones(db, user)}
