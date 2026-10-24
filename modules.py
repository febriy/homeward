"""Small authored learning journeys; XP rewards new steps, never self-ratings."""
import copy
import json
import re

from core import Problem, identifier, now, text
from lessons import read_learning

MODULES = [
    dict(id='talk-without-blame', revision=1, title='Talk without blame', category='Communication', symbol='talk',
         description='Make a specific request and recognise your part in a disagreement.', minutes=4,
         source='Adapted from Gottman’s criticism and defensiveness antidotes. Homeward scenarios and reflections.',
         source_url='https://www.gottman.com/blog/the-four-horsemen-the-antidotes/',
         steps=[
             dict(id='specific', type='idea', title='Start with the moment',
                  body='A complaint can name a problem without attacking a person. Describe what happened, how you feel, and what you need.',
                  example='“I’m tired after dinner. Could you clear the table?”'),
             dict(id='request-check', type='quiz', title='Which opening makes a clear request?',
                  body='The dishes are still on the table. You want help clearing up.',
                  choices=['“You never care about this house.”', '“I feel stretched tonight. Could you put the dishes away?”', '“Why am I always the responsible one?”'], correct=1,
                  feedback=['This judges the person. Try describing the moment and asking for something specific.', 'It names a feeling and a specific action, without attacking character.', 'This compares the people instead of naming the help needed. Look for a concrete request.']),
             dict(id='own-part', type='idea', title='Own the part that is yours',
                  body='Defensiveness can turn a concern into counter-blame. Acknowledging your part does not mean accepting every accusation.',
                  example='“I said I’d clear up and forgot. I can do it now.”'),
             dict(id='response-check', type='quiz', title='What acknowledges your part?',
                  body='Your partner says you forgot to put away the dishes you agreed to do.',
                  choices=['“You forget things too.”', '“Fine, everything is my fault.”', '“I forgot after saying I would. I’ll put them away now.”'], correct=2,
                  feedback=['Counter-blame moves away from the concern. Look for ownership of this particular action.', 'Taking all the blame is different from owning one action. Keep it specific.', 'This owns one missed agreement and names a next step.']),
             dict(id='self-check', type='reflect', title='How does this show up for me?',
                  body='Think about recent, ordinary disagreements.', prompt='I can ask for what I need without blaming my partner.'),
             dict(id='intention', type='note', title='Anything you want to try?',
                  body='You could write one request in your own words. Or leave this blank and just keep what you noticed.', prompt='A thought to take with me'),
         ]),
    dict(id='manageable-dinners', revision=1, title='Make dinner manageable', category='Meals', symbol='meal',
         description='Choose a realistic meal and spot the work that happens before cooking.', minutes=3,
         source='Adapted from Practical Home Systems Workbook, Meals: pp. 24, 30–31, 37.',
         steps=[
             dict(id='fit-the-day', type='idea', title='Let dinner fit the day',
                  body='Start with a familiar meal that fits your time and energy. A useful plan is one you can picture making on an ordinary evening.',
                  example='A busy evening might call for your usual eggs and toast, rather than a recipe you have never tried.'),
             dict(id='meal-check', type='quiz', title='Which plan fits this evening?',
                  body='You have 20 minutes, low energy, and ingredients for a familiar meal.',
                  choices=['Try an unfamiliar dish with several new steps.', 'Make the familiar meal that fits the time you have.', 'Plan an entire week before deciding what to eat.'], correct=1,
                  feedback=['New steps add uncertainty when time and energy are limited. Choose a plan for tonight’s actual capacity.', 'The plan starts with the time, energy and ingredients available.', 'Planning a week can wait. This decision is about one manageable evening.']),
             dict(id='before-cooking', type='idea', title='Cooking is only one part',
                  body='Choosing the meal, checking ingredients and preparing them also take work. Notice these earlier jobs before calling dinner “quick”.',
                  example='A short stir-fry still needs vegetables washed and chopped. Giving that job a time makes the plan more realistic.'),
             dict(id='prep-check', type='quiz', title='What is the missing step?',
                  body='You begin cooking rice, then discover the rice container is empty.',
                  choices=['Cook faster next time.', 'Choose a more impressive recipe.', 'Check the ingredients before cooking time.'], correct=2,
                  feedback=['Speed cannot replace a missing ingredient. Think about what could happen earlier.', 'More complexity does not solve the missing ingredient. Find the earlier check.', 'Checking supplies earlier makes the missing ingredient visible while there is time to act.']),
             dict(id='self-check', type='reflect', title='Where am I with dinner?',
                  body='Think about your evenings lately, rather than an ideal week.', prompt='My dinner plans fit the time and energy I actually have.'),
             dict(id='intention', type='note', title='One small thing, if you want',
                  body='Name an easy dinner or an earlier preparation step. You can also finish without planning a change.', prompt='A thought to take with me'),
         ]),
    dict(id='find-values', revision=1, title='Find what matters', category='Family values', symbol='values',
         description='Use an ordinary moment to find words for what matters to you.', minutes=3,
         source='Adapted from the creator’s Practical Home Systems Workbook and Homeward values interview.',
         steps=[
             dict(id='ordinary-moment', type='idea', title='Begin with an ordinary moment',
                  body='You do not need a list of impressive values. Start with a moment at home that you wish you had more often, then ask what made it meaningful.',
                  example='“I love a quiet coffee before the house wakes up.” The meaning might be rest, freedom, reflection, or something else entirely.'),
             dict(id='meaning-check', type='quiz', title='What helps uncover the meaning?',
                  body='Someone says, “I just want a quiet coffee in the morning.”',
                  choices=['Tell them their value must be personal growth.', 'Ask, “What does that quiet moment give you?”', 'Ask them to pick a more impressive value.'], correct=1,
                  feedback=['The same moment can mean different things to different people. Let them explain it.', 'This invites their meaning instead of assigning one for them.', 'Everyday moments are enough. The person’s own meaning is what matters.']),
             dict(id='word-and-meaning', type='idea', title='Give your word a meaning',
                  body='A word becomes useful when you say what it looks like in your home. Two people can use the same word and mean different things.',
                  example='“Teamwork means we notice what needs doing and offer help, rather than waiting for one person to ask.”'),
             dict(id='value-check', type='quiz', title='Which statement makes the value clearer?',
                  body='You have chosen the word “togetherness”. What would make it easier to discuss?',
                  choices=['“Togetherness is our value.”', '“Everyone should know what togetherness means.”', '“For me, togetherness means some unhurried time to talk after dinner.”'], correct=2,
                  feedback=['The word is a starting point. Add an ordinary example of what it means to you.', 'A shared word can hide different meanings. Make room for your own example.', 'A concrete example gives another person something to understand and discuss.']),
             dict(id='self-check', type='reflect', title='How clear does this feel?',
                  body='Think about what you can put into words today.', prompt='I can explain what matters to me using an everyday example.'),
             dict(id='intention', type='note', title='Keep a word or a moment',
                  body='Write a value and what it means to you, or a moment you want more of. This is optional; you can return to it later.', prompt='A thought to take with me'),
         ]),
]


def module_catalog():
    # Feedback is returned after checking; it is not a substitute for submitting an answer.
    return [dict(module, steps=[{k: v for k, v in step.items() if k not in ('correct', 'feedback')}
                               for step in module['steps']]) for module in MODULES]


def update_module(store, user, body):
    module = next((m for m in MODULES if m['id'] == body.get('module_id')), None)
    operation = body.get('operation', '')
    if not module or not isinstance(operation, str) or not re.fullmatch(r'[a-zA-Z0-9-]{16,64}', operation):
        raise Problem('Open a module to continue.')
    with store.connect() as db:
        db.execute('SELECT id FROM users WHERE id=%s FOR UPDATE', (user['id'],))
        data = read_learning(db, user)
        if operation in data.get('module_operations', []):
            return {'learning': data}
        if body.get('version') != data['version']:
            raise Problem('Your learning changed in another tab. Reload progress to continue.', 409)
        modules = data.setdefault('modules', {})
        progress = modules.get(module['id'])
        action = body.get('action')
        if action == 'start':
            if not progress or progress['completed']:
                progress = dict(attempt=identifier(), cursor=0, furthest=0, answers={}, checks={}, completed=False,
                                earned=0, awarded=progress['awarded'] if progress else [],
                                history=progress['history'] if progress else [], updated_at=now())
                modules[module['id']] = progress
        else:
            if not progress or progress['completed']:
                raise Problem('Start or revisit the module before continuing.')
            step = module['steps'][progress['cursor']]
            if body.get('step_id') != step['id']:
                raise Problem('This step has already changed. Reload progress to continue.', 409)
            if action in ('draft', 'check'):
                value = body.get('value')
                if step['type'] == 'quiz':
                    if type(value) is not int or not 0 <= value < len(step['choices']):
                        raise Problem('Choose an answer first.')
                    if progress['answers'].get(step['id']) != value:
                        progress['checks'].pop(step['id'], None)
                elif step['type'] == 'reflect':
                    if value is not None and (type(value) is not int or not 1 <= value <= 10):
                        raise Problem('Choose 1 to 10, or Not sure.')
                elif step['type'] == 'note':
                    value = text(value, 600, False)
                else:
                    raise Problem('This step has no answer to save.')
                progress['answers'][step['id']] = value
                if action == 'check':
                    if step['type'] != 'quiz':
                        raise Problem('Only understanding questions have a right answer.')
                    progress['checks'][step['id']] = dict(correct=value == step['correct'], choice=value,
                                                         message=step['feedback'][value])
            elif action == 'back':
                progress['cursor'] = max(0, progress['cursor'] - 1)
            elif action == 'next':
                if step['type'] == 'quiz' and not progress['checks'].get(step['id'], {}).get('correct'):
                    raise Problem('Check your answer and use the explanation to try again.')
                if step['type'] == 'reflect' and step['id'] not in progress['answers']:
                    raise Problem('Choose a rating or Not sure before continuing.')
                if step['id'] not in progress['awarded']:
                    progress['awarded'].append(step['id'])
                    progress['earned'] += 10
                progress['furthest'] = max(progress['furthest'], progress['cursor'] + 1)
                if progress['cursor'] == len(module['steps']) - 1:
                    progress['completed'] = True
                    progress['history'].append(dict(id=progress['attempt'], module_id=module['id'], title=module['title'],
                        revision=module['revision'], saved_at=now(), earned=progress['earned'],
                        answers=copy.deepcopy(progress['answers']),
                        steps=[{k: v for k, v in s.items() if k in ('id', 'type', 'title', 'prompt', 'choices')} for s in module['steps']]))
                else:
                    progress['cursor'] += 1
            else:
                raise Problem('Unknown learning action.')
        progress['updated_at'] = now()
        data['version'] += 1
        data['module_operations'] = (data.get('module_operations', []) + [operation])[-40:]
        db.execute('INSERT INTO learning(user_id,data) VALUES(%s,%s) ON CONFLICT(user_id) DO UPDATE SET data=EXCLUDED.data',
                   (user['id'], json.dumps(data)))
        return {'learning': data}
