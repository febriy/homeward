"""Authored micro-lessons and private, dated self-reflections. No inferred grades."""
import copy
import json
import re

from core import Problem, now, text

WORKBOOK = 'Adapted from Practical Home Systems Workbook, Meals.'
LESSONS = [
    dict(id='conversation-patterns', revision=1, title='When a conversation turns', category='Communication',
         description='Notice four patterns that can make a disagreement harder.',
         intro='Gottman calls these patterns the Four Horsemen. Notice your own part in a difficult conversation; use the names to understand a moment, not label your partner.',
         sections=[
             ['Criticism → a specific request', 'Attacking someone’s character makes the problem personal. Describe the situation, how you feel, and what you need. “I’m tired after dinner. Could you clear the table?”'],
             ['Contempt → respect', 'Mockery or acting superior turns disagreement into disrespect. Speak as equals; notice what you appreciate about the other person.'],
             ['Defensiveness → your part', 'Counter-blame leaves the original concern unanswered. Acknowledge the part you can own, even when you see things differently.'],
             ['Stonewalling → a pause and return', 'Shutting down can happen when you feel overwhelmed. Ask for a break to settle yourself, and agree when to return to the conversation.'],
         ], takeaway='You do not need to solve every pattern at once. Begin by noticing one.',
         source='Based on Gottman’s Four Horsemen framework.', source_url='https://www.gottman.com/blog/the-four-horsemen-the-antidotes/',
         questions=[['request', 'I describe a specific problem without attacking my partner’s character.'],
                    ['respect', 'I speak respectfully, even when I disagree.'],
                    ['own', 'I acknowledge my part instead of immediately defending myself.'],
                    ['return', 'When overwhelmed, I ask for a pause and return as agreed.']],
         reflection_note='Homeward’s reflection questions, not a Gottman assessment. Rate yourself, not your partner.'),
    dict(id='realistic-dinner', revision=1, title='One dinner that fits real life', category='Meals',
         description='Learn a simple way to picture a meal you can actually make.',
         intro='A whole week of meals can be a lot to figure out. Start with one familiar dinner that fits the time and energy you actually have.',
         sections=[
             ['Think in four parts', 'The workbook’s meal builder uses protein, a familiar carbohydrate, fibre and flavour. This is a planning prompt, not a rule for a perfect plate.'],
             ['Picture an ordinary evening', 'For example: tofu, rice, broccoli and a familiar sauce. The useful question is whether you can picture making it on a busy day, with the equipment and help available.'],
             ['Check what happens earlier', 'A meal that takes 20 minutes at the stove may still need shopping or chopping. Notice that earlier work before calling it a quick dinner.'],
         ], takeaway='A dependable meal is one that fits your day and is worth repeating.', source=WORKBOOK + ' One Meal Builder, p. 37.',
         questions=[['picture', 'I can picture a familiar meal I could make on an ordinary busy day.'],
                    ['capacity', 'My dinner plans fit the time and energy I actually have.'],
                    ['prep', 'I notice what needs preparing before I start cooking.']]),
    dict(id='hidden-meal-work', revision=1, title='Dinner starts before cooking', category='Meals',
         description='See the remembering and preparation behind a meal.',
         intro='Cooking is only the visible part. Choosing, checking supplies and preparing ingredients also take attention. When these stay invisible, dinner can feel harder than the recipe suggests.',
         sections=[
             ['Separate the jobs', '“Make dinner” might mean choosing a meal, checking the fridge, buying what is missing, washing vegetables and finally cooking. Name the work before deciding who can help.'],
             ['Find the late decision', 'Imagine reaching for rice while everyone is hungry, then discovering the container is empty. The missing step was checking supplies, not trying harder at cooking.'],
             ['Make one thing visible', 'A shared shopping list or a written prep time can move a reminder out of one person’s head. Start with the step that most often surprises you.'],
         ], takeaway='Notice where the effort goes before adding another task.', source=WORKBOOK + ' Where It Usually Breaks and Prep, Seasonings, And Support, pp. 24, 30–31.',
         questions=[['notice', 'I notice the planning and preparation behind our meals.'],
                    ['early', 'We catch missing ingredients before cooking time.'],
                    ['visible', 'Meal plans and shopping needs are visible to the people helping.']]),
    dict(id='repeat-meals', revision=1, title='Let familiar meals help', category='Meals',
         description='Build from what already works in this season of family life.',
         intro='You do not have to invent dinner every day. Meals your family already enjoys can become a small set of defaults to return to when energy is low.',
         sections=[
             ['Notice the easy repeats', 'Think of meals people eat without much resistance and that you can manage without a big effort. Familiarity is useful information.'],
             ['Fit this season', 'A dish you enjoyed making before may be too demanding right now. Choose for your current evenings, including late workdays or outings.'],
             ['Give yourself a default', 'For example, a busy evening might mean your familiar noodles rather than a new recipe. A default gives you somewhere to begin; you can still change your mind.'],
         ], takeaway='Repetition can support the home you want. Variety does not have to be a daily assignment.', source=WORKBOOK + ' Family Favourites and What Works In This Season, pp. 32–33.',
         questions=[['favourites', 'I know a few meals my family enjoys and repeats.'],
                    ['season', 'I choose meals that suit this season of our lives.'],
                    ['default', 'I have a familiar fallback for low-energy evenings.']]),
]


def read_learning(db, user):
    row = db.execute('SELECT data FROM learning WHERE user_id=%s', (user['id'],)).fetchone()
    return json.loads(row['data']) if row else {'version': 0, 'drafts': {}, 'history': []}


def update_learning(store, user, body):
    lesson = next((item for item in LESSONS if item['id'] == body.get('lesson_id')), None)
    if not lesson or body.get('action') not in ('draft', 'finish'):
        raise Problem('Choose a lesson to reflect on.')
    attempt = body.get('attempt', '')
    if not isinstance(attempt, str) or not re.fullmatch(r'[a-zA-Z0-9-]{16,64}', attempt):
        raise Problem('Open the lesson again before saving.')
    answers = body.get('answers')
    questions = {q[0] for q in lesson['questions']}
    if not isinstance(answers, dict) or not set(answers).issubset(questions) or any(
            value is not None and (type(value) is not int or not 1 <= value <= 10) for value in answers.values()):
        raise Problem('Use a rating from 1 to 10, or choose Not sure.')
    if body['action'] == 'finish' and set(answers) != questions:
        raise Problem('Choose a rating or Not sure for each reflection.')
    note = text(body.get('note', ''), 600, False)
    with store.connect() as db:
        db.execute('SELECT id FROM users WHERE id=%s FOR UPDATE', (user['id'],))
        data = read_learning(db, user)
        # A retry after a lost response must not create a second dated record.
        completed = next((record for record in data['history'] if record['id'] == attempt), None)
        if completed:
            if body['action'] == 'finish' and completed['lesson_id'] == lesson['id'] and completed['answers'] == answers and completed['note'] == note:
                return {'learning': data}
            raise Problem('This reflection was already closed in another tab. Reload saved reflections to keep these answers in a new reflection.', 409)
        if body.get('version') != data['version']:
            raise Problem('Your reflections changed in another tab. Reload saved reflections, then try again. Your current answers will be kept.', 409)
        snapshot = dict(id=attempt, lesson_id=lesson['id'], revision=lesson['revision'],
                        answers=copy.deepcopy(answers), note=note, updated_at=now())
        if body['action'] == 'finish':
            snapshot.update(saved_at=now(), title=lesson['title'], questions=copy.deepcopy(lesson['questions']),
                            scale='1 = Rarely true for me; 10 = Usually true for me; null = Not sure')
            data['history'].append(snapshot)
            data['drafts'].pop(lesson['id'], None)
        else:
            data['drafts'][lesson['id']] = snapshot
        data['version'] += 1
        db.execute('INSERT INTO learning(user_id,data) VALUES(%s,%s) ON CONFLICT(user_id) DO UPDATE SET data=EXCLUDED.data',
                   (user['id'], json.dumps(data)))
        return {'learning': data}
