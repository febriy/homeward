/* Homeward — a saved, guided workbook. No AI, external scripts or analytics. */
let state = null;
let route = 'home';
let topic = 0;
let authMode = 'create';
let busy = false;
let editing = null;
let noticeTimer;
const shareDrafts = new Map();
function shareChoices() {
  const key = `homeward-share:${myId()}:${sess().id}`;
  if (!shareDrafts.has(key)) {
    let saved = {};
    try { saved = JSON.parse(sessionStorage.getItem(key) || '{}'); } catch {}
    shareDrafts.set(key, saved && typeof saved === 'object' ? saved : {});
  }
  return {key, choices: shareDrafts.get(key)};
}
function shareChecked(id) {
  const {choices} = shareChoices();
  return Object.hasOwn(choices, id) ? choices[id] === true : personal().published.some(card => card.id === id);
}
function rememberShare(id, checked) {
  const {key, choices} = shareChoices();
  choices[id] = checked;
  try { sessionStorage.setItem(key, JSON.stringify(choices)); } catch {}
}
function statementIsDirty() {
  const editor = byId('draft-text');
  return Boolean(editor && sess().draft && editor.value !== sess().draft.text);
}
function syncStatementApproval() {
  const button = document.querySelector('[data-act="approve_draft"]');
  if (!button) return;
  const dirty = statementIsDirty();
  button.disabled = busy || dirty;
  const hint = byId('draft-unsaved');
  if (hint) hint.hidden = !dirty;
}
const app = document.querySelector('#app');
const dialog = document.querySelector('#editor');
dialog.addEventListener('close', () => { document.querySelector('#edit-form').innerHTML=''; editing=null; });
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icons = {
  arrow: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>',
  check: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>'
};
const byId = id => document.getElementById(id);
const myId = () => state.user.id;
const sess = () => state.session;
const personal = () => sess().private;
const chosen = kind => personal().cards.filter(c => c.kind === kind && c.selected);
const approved = () => sess().shared.filter(c => c.agreed);
const friendlyDate = value => new Date(value).toLocaleDateString(undefined, {day:'numeric',month:'short',year:'numeric'});

function notify(message, error=false, stay=false) {
  clearTimeout(noticeTimer);
  const node = byId('notice');
  node.textContent = message;
  node.className = 'show' + (error ? ' error' : '');
  if (!stay) noticeTimer = setTimeout(() => { node.className = ''; }, error ? 8000 : 3500);
}

async function request(path, body) {
  const options = body === undefined ? {} : {method:'POST',headers:{'Content-Type':'application/json', 'X-Profile':state?.user.id || ''},body:JSON.stringify(body)};
  const response = await fetch(path, options);
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401 && state) { state = null; render(); }
    throw new Error(data.error || 'Unable to continue. Try again.');
  }
  return data;
}

async function action(name, body={}) {
  state = await request('/api/action', {session_id:sess().id, version:sess().version, action:name, ...body});
}

async function run(label, work) {
  if (busy) return;
  busy = true;
  app.setAttribute('aria-busy', 'true');
  document.querySelectorAll('button,input,textarea,select').forEach(control => control.disabled = true);
  notify(label, false, true);
  try { await work(); byId('notice').className=''; render(); }
  catch (error) { notify(error.message, true, true); }
  finally { busy=false; app.setAttribute('aria-busy', 'false'); document.querySelectorAll('button,input,textarea,select').forEach(control => control.disabled = false); syncStatementApproval(); if(typeof updateSkillReady==='function'&&state)updateSkillReady(); }
}

async function go(next) {
  if(typeof flushSkill === 'function') { try { await flushSkill(); } catch(error) {notify(error.message,true,true);return;} }
  if(next==='interview' && route==='workbook') {
    const pending=state.questions.findIndex((q,i)=>!personal().topics[String(i)]?.confirmed);
    topic=pending<0?0:pending;
  }
  if(next==='practice') practiceStep=null;
  if(next==='home' && typeof skillPanel!=='undefined')skillPanel=null;
  route=next; render(); document.querySelector('#main-content')?.focus({preventScroll:true}); window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
}

function header() {
  const wordmark = '<span class="mark" aria-hidden="true"></span>Homeward';
  return `<header class="topbar">${state?`<button class="brand" data-route="home" aria-label="Homeward home">${wordmark}</button>`:`<div class="brand">${wordmark}</div>`}<div class="topright">${state ? `<span class="profile-name" title="${esc(state.user.name)}">${esc(state.user.name)}</span><button class="link" data-act="logout">Sign out</button>` : '<span class="hint">Small steps for everyday life</span>'}</div></header>`;
}

function auth() {
  const create = authMode !== 'login';
  return `${header()}<main class="auth-wrap" id="main-content" tabindex="-1"><section class="auth-story"><h1>Small steps.<br>A home that<br>feels like you.</h1><p>Start with one dependable dinner. Practise a little, see what helps, and grow from there.</p><div class="botanical" aria-hidden="true"><span></span><span></span><span></span></div><p class="auth-caption"><strong>Make room for what matters</strong>One small skill. A little real-life practice.<br>Your progress, at your pace.</p></section><section class="auth-form"><div class="auth-tabs"><button data-auth="create" aria-pressed="${authMode==='create'}" class="${authMode==='create'?'active':''}">Start a space</button><button data-auth="join" aria-pressed="${authMode==='join'}" class="${authMode==='join'?'active':''}">Join your partner</button><button data-auth="login" aria-pressed="${authMode==='login'}" class="${authMode==='login'?'active':''}">Sign in</button></div><h2>${authMode==='join'?'Your own perspective.':create?'Begin with yourself.':'Welcome back.'}</h2><p class="hint">${create?'Create your own profile. You choose which thoughts to share.':'Your practices, reflections and saved choices will be here.'}</p><form data-form="auth"><div class="${create?'profile-fields':''}">${create?'<div class="field"><label for="name">Your first name</label><input id="name" name="name" required maxlength="40" autocomplete="given-name"></div>':''}<div class="field"><label for="handle">Username</label><input id="handle" name="handle" required minlength="3" maxlength="32" pattern="[a-zA-Z0-9_.-]+" autocomplete="username" placeholder="${create?'Choose a username':'Your username'}"></div></div><div class="field"><label for="password">Password</label><input id="password" name="password" type="password" required minlength="12" maxlength="200" autocomplete="${create?'new-password':'current-password'}" placeholder="At least 12 characters"></div>${authMode==='join'?'<div class="field"><label for="invite">Your partner’s space code</label><input id="invite" name="invite" required maxlength="24" placeholder="Ask your partner for their code"></div>':authMode==='create'?'<div class="field"><label for="room_name">Name your space</label><input id="room_name" name="room_name" value="Our home" required maxlength="60"></div>':''}<button class="btn" type="submit">${authMode==='join'?'Join our space':create?'Create my private profile':'Open my space'} <span aria-hidden="true">${icons.arrow}</span></button></form><div class="footer-note">Your words, your choices. No AI.<br>Keep your password safe; password recovery is not available in this early version.</div></section></main>`;
}

function sidebar() {
  const steps = [['interview','Your own words'],['cards','Your priorities'],['together','Think together'],['statement','Our statement'],['practice','Our practice']];
  return `<aside><div class="meta">${esc(state.room.name)}</div><nav class="nav" aria-label="Session steps">${steps.map(([id,label],i)=>`<button data-route="${id}" aria-current="${route===id || (route==='share' && id==='cards')?'step':'false'}" class="${route===id || (route==='share' && id==='cards')?'active':''}"><span class="num">${i+1}</span>${label}</button>`).join('')}</nav><button class="link" data-route="home">My small practices</button><button class="link" data-route="workbook">Session overview</button><div class="sidebar-bottom"><span class="meta">Your saved sessions</span><label class="sr-only" for="history">Open saved session</label><select id="history">${state.history.map(item=>`<option value="${esc(item.id)}" ${item.id===sess().id?'selected':''}>${esc(item.title)}</option>`).join('')}</select><button class="link" data-act="new">Start a new session</button><br><button class="link" data-act="export">Export my record</button><br><button class="link" data-act="refresh">Refresh shared work</button><p class="hint footer-note">The home we build, together.<br>Your work saves when you continue.</p></div></aside>`;
}

function intro(kicker, title, detail) {
  return `<section class="intro"><h1>${title}</h1><span class="context">${kicker}</span><p>${detail}</p></section>`;
}

function home() {
 const count=Object.values(personal().topics).filter(t=>t.confirmed).length;
 const next=sess().completed?'practice':count===5?'cards':'interview';
 return `${intro('A conversation for two', 'A home that feels<br>like yours.', 'Begin with ordinary moments. Choose what matters, agree on a shared vision, then bring one part of it into everyday life.')}<div class="actions"><button class="btn" data-route="${next}">${sess().completed?'Make our vision practical':count?'Continue my reflection':'Begin my reflection'} ${icons.arrow}</button><span class="hint">At your own pace. Progress is saved.</span></div><div class="grid welcome-cards"><section class="card"><h3>Your own words first.</h3><p class="muted">Five invitations to reflect, with prompts and examples to help you find words that fit.</p><span class="count">${count} of 5 meanings confirmed</span></section><section class="card"><h3>Make room for both.</h3><p class="muted">Share your chosen priorities. Agree on a vision, then try one small practice together.</p><span class="count">${approved().filter(c=>c.kind==='value').length} shared values agreed</span></section></div><section class="note"><h2>${state.members.length<2?'Invite your partner':'Your shared space'}</h2>${state.members.length<2?`<p>Ask your partner to open this app, choose <strong>Join your partner</strong>, and use this space code:</p><span class="code">${esc(state.room.invite)}</span><p class="hint">Your partner creates their own account. Keep this code between you.</p>`:`<p>${state.members.map(m=>esc(m.name)).join(' & ')} have separate private profiles. On a shared browser, sign out before the other person signs in.</p>`}</section>${sess().practice?`<section class="note"><h2>${esc(sess().practice.fields.title||'Our dinner practice')}</h2><p>${esc(sess().practice.fields.meal||'Choose a meal')} · ${esc(sess().practice.status==='active'?'Agreed together':sess().practice.status==='paused'?'Set aside':'In progress')}</p><button class="link" data-route="practice">Open our practice ${icons.arrow}</button></section>`:''}<div class="footer-note">Session started ${friendlyDate(sess().created)} · ${sess().completed?'Statement approved by both partners':'In progress'}</div>`;
}

function interview() {
 const item=personal().topics[String(topic)], question=state.questions[topic];
 return `${intro('Your reflection · private', 'Start with an<br>ordinary moment.', 'There are no right words. Describe what happened and why it mattered to you.')}<nav class="topic-nav" aria-label="Reflection questions">${state.questions.map((q,i)=>`<button class="topic-button ${i===topic?'active':''}" data-topic="${i}" aria-label="Question ${i+1}: ${esc(q.title)}" aria-current="${i===topic?'step':'false'}">${i+1}${personal().topics[String(i)]?.confirmed?' ✓':''}</button>`).join('')}</nav><section class="question-card"><h2>${esc(question.question)}</h2><p class="hint">Question ${topic+1} of ${state.questions.length} · ${esc(question.title)}</p><form data-form="answer"><label for="answer">What comes to mind?</label><textarea id="answer" name="answer" maxlength="3000" required placeholder="A small, everyday example is enough.">${esc(item?.answers?.[0]||'')}</textarea><details class="reflection-help"><summary>A question to help me think</summary><p>${esc(question.probe)}</p></details><div class="actions"><button class="btn" type="submit">Save my reflection ${icons.arrow}</button><button class="link" type="button" data-act="skip">Skip for now</button></div></form>${item?.answers?.length?`<div class="divider"></div><form data-form="confirm"><label for="meaning">What matters to you beneath this?</label><p class="hint">A sentence is enough. You can find a value word later.</p><textarea id="meaning" name="meaning" required maxlength="1200" placeholder="This matters to me because…">${esc(item.meaning||'')}</textarea><div class="actions"><button class="btn secondary" type="submit">${item.confirmed?'Save and continue':'This says what I mean'} ${icons.arrow}</button></div></form>`:''}</section><p class="footer-note">These reflections stay private. Only cards you deliberately share appear to your partner.</p>`;
}

function personalCard(card) {
  return `<article class="card ${card.selected?'selected':''}"><h3>${esc(card.label)}</h3><div class="kind"><span class="meta">${card.kind==='value'?'What matters':'How home could feel'}</span><span class="count">${card.selected?`Chosen ${icons.check}`:'Possible wording'}</span></div><p>${esc(card.meaning)}</p>${card.example?`<div class="example"><span class="meta">Possible everyday expression</span><br>${esc(card.example)}</div>`:''}<div class="controls"><button class="btn ${card.selected?'secondary':''} small" data-select="${card.id}">${card.selected?'Chosen · remove':'Choose this'}</button><button class="link" data-edit="${card.id}">Make it my own</button><button class="link" data-delete="${card.id}" aria-label="Remove ${esc(card.label)}">Remove</button></div></article>`;
}

function cards() {
 return `${intro('Your priorities · private', 'Find words that fit.', 'Choose up to three values and three feelings you want more of at home. Use an example as a starting point, or write your own.')}<div class="actions"><button class="btn secondary" data-edit="new">Add my own words</button></div>${['value','feeling'].map(kind=>`<section><div class="section-head"><h2>${kind==='value'?'What matters to me':'How I want home to feel'}</h2><span class="count">${chosen(kind).length} / 3 chosen</span></div><div class="grid">${personal().cards.filter(c=>c.kind===kind).map(personalCard).join('')||'<div class="empty">Choose an example below or add your own words.</div>'}</div><details class="word-library" ${personal().cards.filter(c=>c.kind===kind).length?'':'open'}><summary>Explore ${kind==='value'?'value':'feeling'} examples</summary><p class="hint">Shared workbook examples, not interpretations of your answers. Edit any wording until it fits.</p><div class="example-list">${state.examples.filter(c=>c.kind===kind).map(c=>`<button class="example-word" data-example="${c.id}"><strong>${esc(c.label)}</strong><span>${esc(c.meaning)}</span></button>`).join('')}</div></details></section>`).join('')}<div class="divider"></div><div class="actions"><button class="btn" data-route="share">Review what I’ll share ${icons.arrow}</button><span class="hint">Your reflections stay private.</span></div>`;
}

function share() {
  const selected=personal().cards.filter(c=>c.selected);
  return `${intro('Choose what to share', 'Bring your meaning<br>to the conversation.', 'Your partner will see only the checked cards below: the word, your explanation, and its everyday expression. Your interview answers are not included.')}<form data-form="publish">${selected.map(card=>`<div class="share-row"><input type="checkbox" id="share-${card.id}" name="share" value="${card.id}" ${shareChecked(card.id)?'checked':''}><div><label for="share-${card.id}">${esc(card.label)}</label><p>${esc(card.meaning)}</p>${card.example?`<p>${esc(card.example)}</p>`:''}<button type="button" class="link" data-edit="${card.id}">Edit before sharing</button></div></div>`).join('')||'<div class="empty">Choose your priorities first, then review them here.</div>'}<div class="actions"><button class="btn" type="submit">${personal().published.length?'Update shared cards':'Share checked cards'} ${icons.arrow}</button><button type="button" class="link" data-route="cards">Back to my priorities</button></div><p class="footer-note">Updating shared cards resets the shared proposals and their approvals, so both people can review the changed context.</p></form>`;
}

function approvalBadges(item) {
  return `<div class="approval">${state.members.map(member=>`<span class="${item.approvals?.[member.id]?'yes':''}">${esc(member.name)} ${item.approvals?.[member.id]?`<span class="sr-only">approved</span>${icons.check}`:'· not yet'}</span>`).join('')}</div>`;
}

function sharedCard(card) {
  const mine=Boolean(card.approvals[myId()]);
  return `<article class="card ${card.agreed?'selected':''}"><h3>${esc(card.label)}</h3><div class="kind"><span class="meta">${card.kind==='value'?'Shared value':'Desired feeling'}</span><span class="count">${card.agreed?'Agreed together':'For discussion'}</span></div><p>${esc(card.meaning)}</p>${card.example?`<div class="example"><span class="meta">Possible everyday expression</span><br>${esc(card.example)}</div>`:''}${approvalBadges(card)}<div class="controls"><button class="btn ${mine?'secondary':''} small" data-agree="${card.id}" data-yes="${!mine}">${mine?'Withdraw my agreement':'This represents me'}</button><button class="link" data-edit-shared="${card.id}">Revise wording</button><button class="link" data-remove-shared="${card.id}">Set aside</button></div></article>`;
}

function together() {
  const ready=state.members.length===2 && state.members.every(m=>sess().published.some(c=>c.owner===m.id));
  return `${intro('A shared conversation', 'Understand first.<br>Choose together.', 'Take turns explaining what your words mean. Before combining anything, try saying back what you heard and let your partner correct it.')}<div class="two-cols">${state.members.map(member=>`<section><div class="person-header"><span class="avatar">${esc(member.name[0])}</span><strong>${esc(member.name)}${member.id===myId()?' · you':''}</strong></div>${sess().published.filter(c=>c.owner===member.id).map(card=>`<div class="card"><h3>${esc(card.label)}</h3><span class="meta">${card.kind==='value'?'What matters':'Desired feeling'}</span><p>${esc(card.meaning)}</p>${card.example?`<p class="hint">${esc(card.example)}</p>`:''}${ready?`<button class="link" data-propose="${card.id}">Use as shared wording</button>`:''}</div>`).join('')||'<div class="empty">Their chosen cards have not been shared yet.</div>'}</section>`).join('')}</div>${!ready?`<div class="note"><p>Both partners need to share their chosen cards before exploring a shared statement.</p><button class="link" data-route="share">Review my shared cards ${icons.arrow}</button>${state.members.length<2?`<p class="hint">Partner code: <strong>${esc(state.room.invite)}</strong>. They can join through their own account using this code.</p>`:''}<button class="link" data-act="refresh">Refresh partner’s progress</button></div>`:`<div class="note"><p><strong>A useful question:</strong> “Where do these mean the same thing to us, and where do they differ?”</p><p class="hint">A need for quiet and a wish for togetherness can both have a place. You can keep a priority personal.</p></div><div class="actions"><button class="link" data-edit-shared="new">Write a shared priority</button></div>`}<div class="section-head"><h2>What we could stand for</h2><span class="count">${approved().filter(c=>c.kind==='value').length} values agreed</span></div><div class="grid">${sess().shared.map(sharedCard).join('')||'<div class="empty">Use a shared card’s wording above or write a shared priority. Each person agrees through their own profile.</div>'}</div><div class="actions"><button class="btn secondary" data-route="statement">Our statement ${icons.arrow}</button><button class="link" data-act="refresh">Refresh shared work</button></div>`;
}

function statement() {
  const draft=sess().draft;
  return `${intro('Our statement', 'Words we can<br>both stand behind.', 'Start with your agreed words or write a statement together. Add how you want to live these values, then each approve the exact wording.')}<div class="actions"><button class="btn ${draft?'secondary':''}" data-act="template">${draft?'Reset to sentence starter':'Use our agreed words as a starter'} ${icons.arrow}</button><button class="link" data-route="together">Review our shared priorities</button></div>${draft?`<section class="statement"><div class="meta">${sess().completed?'Approved by both partners':'A draft for your consideration'} · revision ${draft.revision}</div><blockquote>${esc(draft.text)}</blockquote>${approvalBadges(draft)}</section><form data-form="draft"><label for="draft-text">Make the wording yours</label><textarea id="draft-text" name="text" maxlength="1200" required>${esc(draft.text)}</textarea><p id="draft-unsaved" class="hint" role="status" hidden>Save your revised wording before approving it.</p><div class="actions"><button class="btn secondary" type="submit">Save revised wording</button><button class="btn" type="button" data-act="approve_draft">${draft.approvals[myId()]?`I have approved this ${icons.check}`:'I approve this exact wording'}</button></div></form><p class="footer-note">Changing the wording clears both approvals for the new revision. Each partner approves through their own profile.</p>`:`<div class="empty">Once you have both agreed on at least one shared value, you can use a sentence starter here. You can also write it yourselves.</div>${approved().some(c=>c.kind==='value')?'<form data-form="draft"><label for="draft-text">Write our own first draft</label><textarea id="draft-text" name="text" maxlength="1200" required placeholder="What do we hope to stand for together?"></textarea><div class="actions"><button class="btn secondary" type="submit">Save our wording</button></div></form>':''}`}<div class="section-head"><h2>What this statement draws on</h2></div><div class="grid">${approved().map(card=>`<article class="card"><h3>${esc(card.label)}</h3><span class="meta">${card.kind==='value'?'Value':'Desired feeling'}</span><p>${esc(card.meaning)}</p></article>`).join('')||'<div class="empty">No shared priorities have both approvals yet.</div>'}</div>${sess().completed?'<div class="note"><strong>A snapshot of this season.</strong><p>Your statement and the work behind it are saved. Start another session whenever you want to revisit what matters.</p><p><button class="btn" data-route="practice">Make this practical</button></p><button class="link" data-act="export">Export my session record</button> · <button class="link" data-act="new">Start a new session</button></div>':''}`;
}

function render() {
  if (!state) { app.innerHTML=auth(); bind(); return; }
  if(route==='home') { app.innerHTML=header()+skills();bind();bindSkills();return; }
  const pages={workbook:home,interview,cards,share,together,statement,practice};
  const tools=`<details class="mobile-tools"><summary>Saved sessions & export</summary><label class="sr-only" for="mobile-history">Open saved session</label><select id="mobile-history">${state.history.map(item=>`<option value="${esc(item.id)}" ${item.id===sess().id?'selected':''}>${esc(item.title)}</option>`).join('')}</select><div class="actions"><button class="link" data-act="new">New session</button><button class="link" data-act="export">Export my record</button><button class="link" data-act="refresh">Refresh shared work</button></div></details>`;
  app.innerHTML=`${header()}<div class="shell">${sidebar()}<main class="content" id="main-content" tabindex="-1" data-page="${route}">${(pages[route]||home)()}${tools}</main></div>`;
  bind();
  if(route==='practice') bindPractice();
  if (busy) document.querySelectorAll('button,input,textarea,select').forEach(control => control.disabled = true);
}

function openEditor(id, shared=false) {
  const source=shared?sess().shared:personal().cards;
  const card=source.find(c=>c.id===id) || {kind:'value',label:'',meaning:'',example:'',source_ids:[],selected:false};
  editing={id:id==='new'?null:id,shared,card};
  byId('edit-form').innerHTML=`<h2 id="editor-title">${id==='new'?'Add a priority.':'Make the meaning yours.'}</h2><div class="meta">${shared?'A shared proposal':'Your own words'}</div><div class="field"><label for="edit-kind">This describes</label><select id="edit-kind" name="kind"><option value="value" ${card.kind==='value'?'selected':''}>What matters — a value</option><option value="feeling" ${card.kind==='feeling'?'selected':''}>How home could feel</option></select></div><div class="field"><label for="edit-label">Word or short phrase</label><input id="edit-label" name="label" value="${esc(card.label)}" required maxlength="60"></div><div class="field"><label for="edit-meaning">What it means</label><textarea id="edit-meaning" name="meaning" required maxlength="600">${esc(card.meaning)}</textarea></div><div class="field"><label for="edit-example">An everyday expression (optional)</label><input id="edit-example" name="example" value="${esc(card.example)}" maxlength="600"></div>${shared?`<fieldset><legend class="hint">Which shared cards does this draw on?</legend>${sess().published.map(c=>`<label class="checkline"><input type="checkbox" name="source" value="${c.id}" ${card.source_ids.includes(c.id)?'checked':''}>${esc(state.members.find(m=>m.id===c.owner)?.name)} · ${esc(c.label)}</label>`).join('')}</fieldset><p class="hint">Both partners will review this wording again.</p>`:''}<div class="actions"><button class="btn" type="submit">Save wording</button><button class="btn secondary" type="button" id="close-editor">Cancel</button></div>`;
  byId('close-editor').onclick=()=>dialog.close();
  byId('edit-form').onsubmit=event=>{
    event.preventDefault();
    const values=new FormData(event.target);
    const body={...Object.fromEntries(values),id:editing.id,selected:card.selected,
      source_ids:shared?values.getAll('source'):card.source_ids};
    run('Saving your wording…',async()=>{await action(shared?'shared_card':'card',body);dialog.close();});
  };
  dialog.showModal();
}

function bind() {
  document.querySelectorAll('[name="share"]').forEach(input => input.onchange=()=>rememberShare(input.value,input.checked));
  if (byId('draft-text')) byId('draft-text').oninput=syncStatementApproval;
  syncStatementApproval();
  document.querySelectorAll('[data-auth]').forEach(button=>button.onclick=()=>{authMode=button.dataset.auth;render();});
  document.querySelectorAll('[data-route]').forEach(button=>button.onclick=()=>go(button.dataset.route));
  document.querySelectorAll('[data-topic]').forEach(button=>button.onclick=()=>{topic=Number(button.dataset.topic);render();});
  document.querySelectorAll('[data-example]').forEach(button=>button.onclick=()=>run('Adding this example…',()=>action('add_example',{id:button.dataset.example})));
  document.querySelectorAll('[data-propose]').forEach(button=>button.onclick=()=>run('Saving a shared proposal…',async()=>{
    const card=sess().published.find(c=>c.id===button.dataset.propose);
    await action('shared_card',{kind:card.kind,label:card.label,meaning:card.meaning,example:card.example,source_ids:[card.id]});
  }));
  document.querySelectorAll('[data-edit]').forEach(button=>button.onclick=()=>openEditor(button.dataset.edit));
  document.querySelectorAll('[data-edit-shared]').forEach(button=>button.onclick=()=>openEditor(button.dataset.editShared,true));
  document.querySelectorAll('[data-select]').forEach(button=>button.onclick=()=>{const card=personal().cards.find(c=>c.id===button.dataset.select);run('Saving your choice…',()=>action('card',{...card,selected:!card.selected}));});
  document.querySelectorAll('[data-delete]').forEach(button=>button.onclick=()=>run('Removing this suggestion…',()=>action('delete_card',{id:button.dataset.delete})));
  document.querySelectorAll('[data-remove-shared]').forEach(button=>button.onclick=()=>run('Setting this proposal aside…',()=>action('remove_shared',{id:button.dataset.removeShared})));
  document.querySelectorAll('[data-agree]').forEach(button=>button.onclick=()=>run('Saving your response…',()=>action('agree',{id:button.dataset.agree,agree:button.dataset.yes==='true'})));
  document.querySelectorAll('form[data-form]').forEach(form=>form.onsubmit=event=>{
    event.preventDefault();
    const values=new FormData(form), body=Object.fromEntries(values);
    const kind=form.dataset.form;
    if(kind==='auth') return run('Opening your space…',async()=>{state=await request(authMode==='login'?'/api/login':'/api/register',body);skillPanel=null;skillPending={};skillError='';route='home';topic=0;});
    if(kind==='answer') return run('Saving your private reflection…',()=>action('answer',{topic,answer:body.answer}));
    if(kind==='confirm') return run('Saving your meaning…',async()=>{await action('confirm',{topic,meaning:body.meaning});if(topic<4)topic++;else route='cards';});
    if(kind==='publish') return run('Sharing your chosen cards…',async()=>{await action('publish',{ids:values.getAll('share')});route='together';});
    if(kind==='draft') return run('Saving this revision…',()=>action('edit_draft',body));
  });
  document.querySelectorAll('[data-act]').forEach(button=>button.onclick=()=>handle(button.dataset.act));
  document.querySelectorAll('#history,#mobile-history').forEach(select=>select.onchange=event=>run('Opening saved session…',async()=>{state=await request('/api/state?session='+event.target.value);route='workbook';topic=0;}));
}

async function handle(name) {
  if(typeof flushSkill==='function') {try{await flushSkill();}catch(error){notify(error.message,true,true);return;}}
  if(name==='logout') return run('Signing out…',async()=>{await request('/api/logout',{});state=null;authMode='login';route='home';skillPanel=null;skillPending={};skillError='';});
  if(name==='refresh') return run('Refreshing saved work…',async()=>{state=await request('/api/state?session='+sess().id);practiceStep=null;});
  if(name==='skip') { if(topic<4)topic++;else route='cards';render();return; }
  if(name==='new') {
    if(!confirm('Start a fresh session? This session will remain in your saved history.'))return;
    return run('Starting a new session…',async()=>{state=await request('/api/new',{});route='workbook';topic=0;});
  }
  if(name==='export') return run('Preparing your record…',async()=>{
    const record=await request('/api/export?session='+sess().id);
    const url=URL.createObjectURL(new Blob([JSON.stringify(record,null,2)],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download='homeward-'+new Date(sess().created).toISOString().slice(0,10)+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  if(name==='template' && sess().draft && !confirm('Replace this draft with the sentence starter? Your current wording stays in revision history.')) return;
  if(name==='approve_draft' && statementIsDirty()) { notify('Save your revised wording before approving it.',true); return; }
  const labels={template:'Preparing the sentence starter…',approve_draft:'Saving your approval…'};
  if(labels[name]) return run(labels[name],()=>action(name));
}

(async()=>{try{state=await request('/api/state');}catch(error){if(!error.message.includes('Sign in'))notify(error.message,true);}render();})();
