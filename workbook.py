"""Authored prompts and examples. They never interpret someone's answers."""

QUESTIONS = [
    ('An ordinary good day', 'Describe a good, ordinary day together. What makes it good?',
     'Which part would you miss most if it disappeared? What does it make room for?'),
    ('A moment that mattered', 'Tell me about a recent moment at home that mattered to you.',
     'What did someone do? Why did that matter to you?'),
    ('More room for what matters', 'What would you like more of, or less of, in everyday life together?',
     'Think of one small change. What would become possible if it happened?'),
    ('What you would protect', 'If life became much busier, what would you most want to protect?',
     'What would you be willing to do less of to make room for this?'),
    ('The feeling of home', 'How would you like life together to feel more often? What would that look like?',
     'Imagine arriving home on an ordinary day. How would you know you felt this way?'),
]

_VALUES = [
    ('Simplicity', 'Making room for what matters by keeping some things uncomplicated.', 'Repeat a familiar dinner on a busy evening.'),
    ('Togetherness', 'Making time to enjoy one another’s company.', 'Sit down for a meal without rushing away.'),
    ('Shared responsibility', 'Noticing and taking ownership of the work of our home.', 'Take care of a whole task, including planning and tidying.'),
    ('Care', 'Paying attention to each other’s needs and responding kindly.', 'Check what would help after a difficult day.'),
    ('Respect', 'Treating each person’s needs and boundaries as important.', 'Listen to an answer without correcting it immediately.'),
    ('Honesty', 'Being able to say what is true for us, with consideration.', 'Name a concern before it turns into resentment.'),
    ('Learning', 'Making space to practise, ask questions and improve.', 'Learn one cooking skill together.'),
    ('Play', 'Allowing enjoyment and silliness to belong in everyday life.', 'Make room for an unplanned game after dinner.'),
    ('Hospitality', 'Making others feel welcome in our home.', 'Offer a simple meal without needing everything to be perfect.'),
    ('Independence', 'Giving each other room to choose and do things for ourselves.', 'Protect some time for individual interests.'),
    ('Steadiness', 'Creating routines people can rely on, while leaving room to adapt.', 'Keep a familiar evening ritual on busy days.'),
    ('Reflection', 'Pausing to notice what matters and what needs to change.', 'Have a short weekly conversation about home life.'),
]
_FEELINGS = [
    ('Peaceful', 'I can settle rather than stay on edge.'),
    ('Safe', 'I can be myself and speak without fear.'),
    ('Supported', 'I know I do not have to carry everything alone.'),
    ('Connected', 'I feel close to the people I live with.'),
    ('Welcome', 'There is room for me here, as I am.'),
    ('Joyful', 'There is room for delight and laughter.'),
    ('Unhurried', 'I have enough space to be present.'),
    ('Energised', 'Life at home gives me energy and possibility.'),
    ('Appreciated', 'My efforts and presence are noticed.'),
]
EXAMPLES = [dict(id='value-' + str(i), kind='value', label=label, meaning=meaning, example=example)
            for i, (label, meaning, example) in enumerate(_VALUES)] + [
    dict(id='feeling-' + str(i), kind='feeling', label=label, meaning=meaning, example='')
    for i, (label, meaning) in enumerate(_FEELINGS)]

MEALS = [dict(id=id, name=name) for id, name in [
    ('tomato-pasta', 'Tomato pasta'), ('rice-vegetables', 'Rice & vegetables'),
    ('noodle-soup', 'Noodle soup'), ('eggs-toast', 'Eggs & toast')]]


def statement_template(cards):
    """Mechanical sentence starter using only agreed labels; always editable."""
    values = ', '.join(card['label'] for card in cards if card['kind'] == 'value')
    feelings = ', '.join(card['label'] for card in cards if card['kind'] == 'feeling')
    result = 'In our home, we value ' + values + '.'
    if feelings:
        result += ' We want home to feel ' + feelings + '.'
    return result
