"""Private real-world practices: a plan is not an attempt or a completed habit."""
import copy
import json
import re
from core import Problem, identifier, now, text
from lessons import read_learning

ACTIVITIES = [
    dict(id='meal-prep', title='Prep one meal ahead', category='Meals', symbol='meal',
         description='Move one job out of tomorrow’s dinner rush.', duration='About 10–15 minutes to try',
         intro='Start with one familiar meal for tomorrow. Prep one part now, so there is less to do when everyone is hungry.',
         steps=[['Choose tomorrow’s meal', 'Check what is already in the fridge and what tomorrow actually allows. Pick something your family already eats.'],
                ['Move one job earlier', 'Wash and cut the vegetables, measure a seasoning mix, or season the protein. One useful job is enough for a first try.'],
                ['Leave it ready to use', 'Put the prepared ingredient in a covered container, label what it is for, and refrigerate perishables promptly. Keep raw meat separate from ready-to-eat food.']],
         tip='Marinate in the fridge at 4°C or below. Raw poultry should be cooked or frozen within 1–2 days of purchase or thawing; marinating does not restart that time.',
         options=['Wash and cut vegetables for tomorrow’s dinner.', 'Measure a seasoning mix for tomorrow’s dinner.', 'Season tomorrow’s protein and refrigerate it.'],
         example='Wash and cut the carrots for tomorrow’s noodle soup.',
         cues=['After I clear tonight’s dinner table', 'When I put the groceries away', 'After Sunday breakfast'],
         fallback='Make it smaller: just choose tomorrow’s meal and check the ingredients.',
         sources=[['Practical Home Systems Workbook, pp. 41–44', ''],
                  ['USDA: marinating and refrigeration', 'https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/poultry/poultry-basting-brining-and-marinating'],
                  ['FoodSafety.gov: keep food safe', 'https://www.foodsafety.gov/keep-food-safe/4-steps-to-food-safety']]),
    dict(id='dinner-check-in', title='Check in over dinner', category='Communication', symbol='talk',
         description='Make a little room to hear how each person is doing.', duration='About 5 minutes to try',
         intro='At a dinner you share, invite a short check-in. Ask if now works for both of you. Either person can pass or choose another time.',
         steps=[['Ask one small question', 'Try: “What felt good or difficult about your day?” Start with something outside the relationship, such as work or the journey home.'],
                ['Listen, then reflect', 'Let them finish. Try: “It sounds like that was frustrating. Have I understood?” Ask before offering a solution.'],
                ['Swap roles', 'Give each person a turn. Finish with “Thanks for telling me.” If a disagreement needs more attention, agree on another time for it.']],
         tip='This is a short invitation to connect, not a time to solve every problem.',
         options=['Ask about one good or difficult moment, then take turns listening.', 'Ask “How are you arriving at dinner today?” and reflect back what I hear.'],
         example='Ask about one difficult moment, listen without interrupting, then swap.',
         cues=['Once we sit down for dinner', 'After we finish eating', 'When we clear the table together'],
         fallback='Make it smaller: one sentence each. If now does not work, agree on another time.',
         sources=[['Homeward dinner adaptation of Gottman’s listening guidance', 'https://www.gottman.com/blog/how-to-stress-reducing-conversation/']]),
]
OUTCOMES = {'worked': 'It worked for me', 'adjust': 'I tried it; I’d change something', 'not-yet': 'I didn’t get to it'}


def update_activity(store, user, body):
    activity = next((a for a in ACTIVITIES if a['id'] == body.get('activity_id')), None)
    operation = body.get('operation', '')
    if not activity or not isinstance(operation, str) or not re.fullmatch(r'[a-zA-Z0-9-]{16,64}', operation):
        raise Problem('Open a practice to continue.')
    with store.connect() as db:
        db.execute('SELECT id FROM users WHERE id=%s FOR UPDATE', (user['id'],))
        data = read_learning(db, user)
        if operation in data.get('activity_operations', []):
            return {'learning': data}
        if body.get('version') != data['version']:
            raise Problem('Your progress changed in another tab. Load the saved plan before continuing.', 409)
        records = data.setdefault('activities', {})
        p = records.get(activity['id'])
        action = body.get('action')
        if action == 'start':
            if not p or p['stage'] == 'done':
                p = dict(attempt=identifier(), stage='guide', plan=copy.deepcopy(p['plan']) if p else {'action':'','cue':''},
                         note='', outcome='', history=p['history'] if p else [], awarded=p['awarded'] if p else False)
                records[activity['id']] = p
        else:
            if not p or p['stage'] == 'done':
                raise Problem('Open a practice before continuing.')
            if body.get('stage') != p['stage']:
                raise Problem('This practice moved on in another tab. Load the saved plan before continuing.', 409)
            fields = body.get('fields', {})
            if not isinstance(fields, dict):
                raise Problem('Send the practice answers as fields.')
            allowed = {'action': ('action',), 'cue': ('cue',), 'review': ('outcome', 'note')}.get(p['stage'], ())
            if set(fields) - set(allowed):
                raise Problem('Save answers on their own step.')
            for key, value in fields.items():
                if key == 'outcome':
                    if not isinstance(value, str) or (value not in OUTCOMES and value != ''):
                        raise Problem('Choose what happened.')
                    p[key] = value
                elif key == 'note':
                    p[key] = text(value, 600, False)
                else:
                    p['plan'][key] = text(value, 400 if key == 'action' else 200, False)
            stage = p['stage']
            if action == 'save':
                pass
            elif action == 'next':
                if stage == 'guide': p['stage'] = 'action'
                elif stage == 'action':
                    if not p['plan']['action'].strip(): raise Problem('Choose or write one action to try.')
                    p['stage'] = 'cue'
                elif stage == 'cue':
                    if not p['plan']['cue'].strip(): raise Problem('Choose or write a moment to try it.')
                    p['stage'] = 'ready'
                elif stage == 'review':
                    if p['outcome'] not in OUTCOMES: raise Problem('Choose what happened before saving.')
                    earned = 20 if p['outcome'] != 'not-yet' and not p['awarded'] else 0
                    p['awarded'] = p['awarded'] or earned > 0
                    p['history'].append(dict(id=p['attempt'], activity_id=activity['id'], title=activity['title'],
                        plan=copy.deepcopy(p['plan']), outcome=p['outcome'], note=p['note'], earned=earned, saved_at=now()))
                    p['stage'] = 'done'
                else: raise Problem('Try the practice, then record how it went.')
            elif action == 'back' and stage in ('action','cue','review'):
                p['stage'] = {'action':'guide','cue':'action','review':'ready'}[stage]
            elif action == 'edit' and stage == 'ready': p['stage'] = 'action'
            elif action == 'reflect' and stage == 'ready': p['stage'] = 'review'
            else: raise Problem('That action is not available on this step.')
        p['updated_at'] = now()
        data['version'] += 1
        data['activity_operations'] = (data.get('activity_operations', []) + [operation])[-40:]
        db.execute('INSERT INTO learning(user_id,data) VALUES(%s,%s) ON CONFLICT(user_id) DO UPDATE SET data=EXCLUDED.data',
                   (user['id'], json.dumps(data)))
        return {'learning': data}
