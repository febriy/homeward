/* A small, private practice. Server-owned progress survives new workbook sessions. */
let skillPanel = null;
let skillPending = {};
let skillTimer;
let skillSaving = null;
let skillError = '';
let skillWorking = false;
const confidenceLabels = {help:'Need more help', practising:'Getting there', comfortable:'Comfortable'};
const skillData = () => ({...state.skill, ...skillPending});

function skillSavedLabel() { return state?.user.is_guest ? 'Saved for this browser · No account needed' : 'Saved to your private profile'; }
function skillStatus(message) {
  const node = byId('skill-save');
  if(node) node.textContent = message;
  const retry = byId('skill-retry');
  if(retry) retry.hidden = !skillError;
}
function queueSkill(fields) {
  Object.assign(skillPending, fields);
  skillError = '';
  skillStatus('Saving…');
  clearTimeout(skillTimer);
  skillTimer = setTimeout(()=>flushSkill().catch(()=>{}), 450);
}
async function flushSkill() {
  clearTimeout(skillTimer);
  if(skillSaving) await skillSaving;
  if(!Object.keys(skillPending).length) return;
  const fields = {...skillPending};
  skillPending = {};
  const owner = state.user.id;
  skillSaving = (async()=>{
    try {
      const result = await request('/api/skill', {action:'save', version:state.skill.version, fields});
      if(state?.user.id !== owner) return;
      state.skill = result.skill; state.milestones = result.milestones;
      skillError = '';
      skillStatus(Object.keys(skillPending).length ? 'Saving…' : skillSavedLabel());
    } catch(error) {
      if(state?.user.id !== owner) {skillPending={};skillError='';throw error;}
      skillPending = {...fields, ...skillPending};
      skillError = error.message;
      skillStatus('Not saved. ' + error.message);
      throw error;
    }
  })();
  try { await skillSaving; } finally { skillSaving=null; }
  if(Object.keys(skillPending).length) await flushSkill();
}
window.addEventListener('beforeunload', event=>{
  if(skillSaving || Object.keys(skillPending).length) {event.preventDefault(); event.returnValue='';}
});

function skillMeal(s) {
  return `<div class="skill-meal-summary">${s.meal_id && s.meal_id!=='custom'?`<img src="/meals/${esc(s.meal_id)}.webp" width="112" height="112" alt="">`:''}<div><strong>${esc(s.meal)}</strong><span>A familiar version you know how to make.</span></div></div>`;
}
function skillButton(label, action, disabled=false) {
  return `<button class="btn" data-skill-action="${action}" ${disabled?'disabled':''}>${label} ${icons.arrow}</button>`;
}
function skillFooter() {
  return `<footer class="skill-footer">${state.user.is_guest?'<p>This browser remembers your space for up to 30 days. Clearing cookies starts a new one.</p>':''}<p id="skill-save" role="status">${skillError?esc('Not saved. '+skillError):skillSaving||Object.keys(skillPending).length?'Saving…':skillSavedLabel()}</p><button class="link" id="skill-retry" ${skillError?'':'hidden'}>Retry saving</button><nav aria-label="More from Homeward"><button class="link" data-skill-panel="progress">My progress</button><button class="link" data-route="workbook">Our values workbook</button></nav></footer>`;
}
function skills() {
  const s=skillData();
  const panel=skillPanel || s.stage;
  let body='';
  if(panel==='choose') {
    body=`<h1>Make one<br>dependable dinner.</h1><p class="skill-lead">Start with something familiar. One meal is enough.</p><form id="skill-meal-form"><fieldset><legend>What would you like to make?</legend><div class="meal-grid">${state.meals.map(m=>`<label class="meal-choice"><img src="/meals/${m.id}.webp" alt="" width="512" height="512"><span class="meal-label"><input type="radio" name="skill-meal" value="${m.id}" ${s.meal_id===m.id?'checked':''} required><span>${esc(m.name)}</span></span></label>`).join('')}</div><label class="priority-option own-meal"><input type="radio" name="skill-meal" value="custom" ${s.meal_id==='custom'?'checked':''} required>Something else I know</label></fieldset><div class="field" id="skill-custom-field" ${s.meal_id==='custom'?'':'hidden'}><label for="skill-custom">What do you call it?</label><input id="skill-custom" maxlength="160" value="${esc(s.meal_id==='custom'?s.meal:'')}" ${s.meal_id==='custom'?'required':''}></div><button class="btn" type="submit">Choose this meal ${icons.arrow}</button></form><p class="skill-aside">A little planning now. A dinner to try when it suits you.</p>`;
  } else if(panel==='prepare') {
    body=`<h1>A few things<br>before you cook.</h1><p class="skill-lead">Use this as your quick check. Come back whenever you’re ready.</p>${skillMeal(s)}<button class="link" data-skill-panel="choose">Change meal</button><fieldset class="skill-checklist"><legend>Three small checks</legend>${[['ingredients','Ingredients ready','Check what you have and what you need.'],['time','Time chosen','Pick a moment that fits your day.'],['help','Help sorted','Ask for help, or decide to cook on your own.']].map(([key,label,hint])=>`<label><input type="checkbox" data-skill-check="${key}" ${s.checks[key]?'checked':''}><span><strong>${label}</strong><small>${hint}</small></span></label>`).join('')}</fieldset><p id="skill-ready-hint" class="hint">${Object.values(s.checks).filter(Boolean).length} of 3 ready</p>${skillButton('Ready to try','ready',!Object.values(s.checks).every(Boolean))}`;
  } else if(panel==='ready') {
    body=`<h1>Ready when<br>you are.</h1><p class="skill-lead">Your preparation is saved. Go make dinner when it fits your day.</p>${skillMeal(s)}<p>After you’ve tried it, come back for a quick check-in. It doesn’t have to go perfectly.</p>${skillButton('I tried it','tried')}<button class="link skill-secondary" data-skill-action="reopen">Change my preparation</button>`;
  } else if(panel==='tried') {
    body=`<h1>How did it go?</h1><p class="skill-lead">Think about making ${esc(s.meal.toLowerCase())} again. How do you feel?</p><form id="skill-review-form"><fieldset class="skill-confidence"><legend class="sr-only">Your confidence</legend>${Object.entries(confidenceLabels).map(([id,label])=>`<label class="priority-option"><input type="radio" name="skill-confidence" value="${id}" ${s.confidence===id?'checked':''} required><span>${label}</span></label>`).join('')}</fieldset><details class="skill-note" ${s.note?'open':''}><summary>Add a note for next time <span class="hint">Optional</span></summary><label for="skill-note">What would help next time?</label><textarea id="skill-note" maxlength="600" placeholder="One small thing you noticed…">${esc(s.note)}</textarea></details><button class="btn" type="submit">Save progress ${icons.arrow}</button></form><p class="skill-aside">Your self-check and notes stay private.</p>`;
  } else if(panel==='complete') {
    const first=s.history.length===1;
    body=`<div class="skill-receipt">${icons.check}<span>+10 XP · Practice recorded</span></div><h1>${first?'Your first dinner,<br>practised.':'Another dinner,<br>practised.'}</h1><p class="skill-lead">${s.confidence==='help'?'You gave it a go. Next time, keep the meal simple or ask someone to cook alongside you.':s.confidence==='practising'?'It’s becoming more familiar. Try the same meal again when it suits you.':'You’re feeling comfortable. Keep this meal in your everyday collection.'}</p>${skillMeal(s)}<p>You’re done for now.</p>${skillButton('Try it again','repeat')}${state.user.is_guest?'':`<details class="skill-sharing"><summary>Share a milestone with our home</summary><p>Your partner would see only: <strong>“${esc(state.user.name)} practised a dependable dinner.”</strong> Your notes, confidence and XP stay private.</p><button class="btn secondary" data-skill-action="${s.shared?'unshare':'share'}">${s.shared?'Remove shared milestone':'Share this milestone'}</button></details>`}`;
  } else if(panel==='progress') {
    const latest=s.history.at(-1);
    body=`<button class="link skill-back" data-skill-panel="resume">Back to my practice</button><h1>Little by little.</h1><p class="skill-lead">Your experience grows each time you try and check in.</p><div class="skill-progress-line"><strong>${s.xp} XP</strong><span>${s.history.length} dinner ${s.history.length===1?'practice':'practices'}</span></div><p class="hint">10 XP for each practice and self-check. Confidence is your own assessment.</p><section class="skill-record"><h2>A dependable dinner</h2><p>${latest?esc(confidenceLabels[latest.confidence]):'Your first practice is waiting.'}</p>${skillButton(s.stage==='complete'?'Try it again':'Continue my practice',s.stage==='complete'?'repeat':'resume')}</section>${s.history.length?`<details><summary>My earlier practices</summary>${s.history.slice().reverse().map(r=>`<article class="skill-record"><h3>${esc(r.meal)}</h3><p class="hint">${friendlyDate(r.saved_at)} · ${esc(confidenceLabels[r.confidence])}</p>${r.note?`<p class="skill-personal-note">${esc(r.note)}</p>`:''}</article>`).join('')}</details>`:''}<section class="skill-household"><h2>Our home’s milestones</h2>${state.milestones.length?state.milestones.map(m=>`<p>${esc(m.name)} practised a dependable dinner.</p>`).join(''):'<p class="hint">Milestones appear here only when someone chooses to share them.</p>'}</section>`;
  }
  return `<main class="skill-work" id="main-content" tabindex="-1">${body}${skillFooter()}</main>`;
}
async function doSkill(action) {
  if(skillWorking) return;
  skillWorking=true;
  document.querySelectorAll('#app button, #app input, #app textarea').forEach(n=>n.disabled=true);
  try {
    await flushSkill();
    if(action!=='resume') {
      const result=await request('/api/skill',{action,version:state.skill.version});
      state.skill=result.skill; state.milestones=result.milestones;
    }
    skillPanel=null;
    render(); byId('main-content')?.focus({preventScroll:true}); window.scrollTo(0,0);
  } catch(error) {notify(error.message,true,true);}
  finally {
    skillWorking=false;
    document.querySelectorAll('#app button, #app input, #app textarea').forEach(n=>n.disabled=false);
    updateSkillReady();
  }
}
function updateSkillReady() {
  if(!state)return;
  const checks=skillData().checks;
  const button=document.querySelector('[data-skill-action="ready"]');
  if(button) button.disabled=skillWorking||!Object.values(checks).every(Boolean);
  if(byId('skill-ready-hint')) byId('skill-ready-hint').textContent=`${Object.values(checks).filter(Boolean).length} of 3 ready`;
}
function bindSkills() {
  document.querySelectorAll('[data-skill-panel]').forEach(button=>button.onclick=async()=>{
    try {await flushSkill();skillPanel=button.dataset.skillPanel==='resume'?null:button.dataset.skillPanel;render();byId('main-content').focus({preventScroll:true});window.scrollTo(0,0);} catch(error){notify(error.message,true,true);}
  });
  document.querySelectorAll('[data-skill-action]').forEach(button=>button.onclick=()=>doSkill(button.dataset.skillAction));
  document.querySelectorAll('[name="skill-meal"]').forEach(input=>input.onchange=()=>{
    const custom=input.value==='custom';
    queueSkill({meal_id:input.value,meal:custom?byId('skill-custom').value:state.meals.find(m=>m.id===input.value).name});
    // Match the server's reset when changing meal; keep local readiness truthful.
    skillPending.checks={ingredients:false,time:false,help:false};
    byId('skill-custom-field').hidden=!custom;byId('skill-custom').required=custom;
    if(custom)byId('skill-custom').focus();
  });
  if(byId('skill-custom'))byId('skill-custom').oninput=e=>queueSkill({meal:e.target.value});
  if(byId('skill-meal-form'))byId('skill-meal-form').onsubmit=e=>{e.preventDefault();doSkill('prepare');};
  document.querySelectorAll('[data-skill-check]').forEach(input=>input.onchange=()=>{
    queueSkill({checks:{...skillData().checks,[input.dataset.skillCheck]:input.checked}});updateSkillReady();
  });
  document.querySelectorAll('[name="skill-confidence"]').forEach(input=>input.onchange=()=>queueSkill({confidence:input.value}));
  if(byId('skill-note'))byId('skill-note').oninput=e=>queueSkill({note:e.target.value});
  if(byId('skill-review-form'))byId('skill-review-form').onsubmit=e=>{e.preventDefault();doSkill('review');};
  if(byId('skill-retry'))byId('skill-retry').onclick=()=>flushSkill().catch(error=>notify(error.message,true,true));
}
