/* One small thinking task per page; the server owns progression and earned XP. */
let moduleView={screen:'dashboard',id:null,record:null};
let modulePending=null, moduleLocal=null, moduleSaving=null, moduleTimer;
let moduleWorking=false, moduleError='', moduleFailed=null;
let moduleRecovery=null;
const moduleById=id=>state.modules.find(m=>m.id===id);
const moduleProgress=id=>state.learning.modules?.[id];
const learningXP=()=>Object.values(state.learning.modules||{}).reduce((sum,p)=>sum+p.awarded.length*10,0)+Object.values(state.learning.activities||{}).filter(p=>p.awarded).length*20;
const moduleSymbols={
 talk:'<path d="M6 7h19a4 4 0 0 1 4 4v9a4 4 0 0 1-4 4H15l-7 6v-6H6a4 4 0 0 1-4-4v-9a4 4 0 0 1 4-4Z"/><path d="M10 13h11m-11 5h7"/>',
 meal:'<circle cx="18" cy="18" r="12"/><circle cx="18" cy="18" r="7"/><path d="M1 6v11m4-11v11M1 12h4m-2 5v14m31-25v25"/>',
 values:'<path d="m18 3 4 11 11 4-11 4-4 11-4-11-11-4 11-4Z"/><circle cx="18" cy="18" r="3"/>'
};
const moduleSymbol=id=>`<svg viewBox="0 0 36 36" class="module-symbol" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${moduleSymbols[id]}</svg>`;
function resetModules(){clearTimeout(moduleTimer);moduleView={screen:'dashboard',id:null,record:null};modulePending=null;moduleLocal=null;moduleError='';moduleFailed=null;moduleRecovery=null;}
function moduleValue(step){return moduleLocal?.id===moduleView.id&&moduleLocal.step===step.id?moduleLocal.value:moduleProgress(moduleView.id)?.answers[step.id];}
function moduleMessage(error){return /Failed to fetch|Load failed|NetworkError/.test(error.message)?'Connection lost. Keep this page open and retry.':error.message;}
function moduleStatus(){
 const node=byId('module-status');if(node){node.hidden=moduleView.screen==='dashboard'&&!moduleError;node.textContent=moduleError?'Not saved. '+moduleError:modulePending||moduleSaving?'Saving…':'Progress saved';}
 const retry=byId('module-retry');if(retry){retry.hidden=!moduleError;retry.textContent=moduleFailed?.conflict?'Reload progress & keep my answer':'Retry saving';}
}
async function moduleRequest(action,fields={}){
 const owner=state.user.id;
 const payload={action,module_id:moduleView.id,step_id:moduleById(moduleView.id)?.steps[moduleProgress(moduleView.id)?.cursor]?.id,
   version:state.learning.version,operation:crypto.randomUUID(),...fields};
 try{
   const result=await request('/api/module',payload);
   if(state?.user.id!==owner)throw new Error('Your space changed. Open Homeward again.');
   state.learning=result.learning;moduleError='';moduleFailed=null;return result;
 }catch(error){
   if(state?.user.id!==owner){resetModules();throw error;}
   moduleError=moduleMessage(error);moduleFailed={payload,conflict:error.status===409};throw error;
 }
}
function queueModule(value){
 const step=moduleById(moduleView.id).steps[moduleProgress(moduleView.id).cursor];
 moduleLocal={id:moduleView.id,step:step.id,value};
 modulePending={module_id:moduleView.id,step_id:step.id,value};moduleError='';
 clearTimeout(moduleTimer);moduleTimer=setTimeout(()=>flushModule().catch(()=>{}),450);
 moduleStatus();updateModuleControls();
}
async function flushModule(){
 clearTimeout(moduleTimer);if(moduleSaving)await moduleSaving;
 if(!modulePending||!state)return;
 const fields=modulePending;modulePending=null;const owner=state.user.id;
 moduleSaving=(async()=>{try{await moduleRequest('draft',fields);}catch(error){if(state?.user.id===owner)modulePending=modulePending||fields;throw error;}})();
 try{await moduleSaving;}finally{moduleSaving=null;moduleStatus();}
 if(modulePending)await flushModule();
}
window.addEventListener('beforeunload',event=>{if(modulePending||moduleSaving){event.preventDefault();event.returnValue='';}});
function moduleErrorPanel(){return `<p id="module-status" class="module-meta" role="status" ${moduleError?'':'hidden'}>${esc(moduleError)}</p><button class="link" id="module-retry" ${moduleError?'':'hidden'}>Retry saving</button>${moduleRecovery?'<button class="link" data-module-screen="recovery">View my unsaved answer</button>':''}`;}
function moduleFooter(){
 const earlier=state.learning.history.length||Object.keys(state.learning.drafts).length;
 return `<footer class="module-footer"><nav aria-label="More from Homeward"><button class="link" data-module-screen="history">Your reflections</button><button class="link" data-route="workbook">Values workbook</button>${earlier?'<button class="link" data-route="legacy-learning">Earlier lessons & reflections</button>':''}${state.skill.history.length||state.skill.meal_id?'<button class="link" data-route="legacy-skill">Earlier dinner practice</button>':''}</nav><p>${state.user.is_guest?'Saved for this browser for up to 30 days. Clearing cookies starts a new space.':'Learning and reflections are private to your profile.'}</p></footer>`;
}
function moduleDashboard(){
 const completed=state.modules.filter(m=>moduleProgress(m.id)?.history.length).length;
 return `<main class="module-dashboard" id="main-content" tabindex="-1"><div class="dashboard-heading"><div><h1>Small steps for a<br>home that feels like you.</h1><p>Pick a module. Learn a little. Find your next step.</p></div><div class="learning-summary"><strong>${learningXP()} <span>XP</span></strong><span>Learning & practice</span><p>${completed} of ${state.modules.length} modules completed</p></div></div>${learningNavigation('home')}${activityReadyLink()}<div class="module-grid">${state.modules.map(m=>{
 const p=moduleProgress(m.id),started=p&&!p.completed,done=Boolean(p?.history.length),count=p?.furthest||0;
 return `<article class="module-card">${moduleSymbol(m.symbol)}<h2>${esc(m.title)}</h2><p class="module-description">${esc(m.description)}</p><p class="module-meta">${esc(m.category)} · About ${m.minutes} minutes</p><div class="module-progress-label"><span>${started?`${count} of ${m.steps.length} steps${done?' · Revisiting':''}`:done?'Completed':`${m.steps.length} small steps`}</span><span>${p?.awarded.length?`${p.awarded.length*10} XP earned`:'Earn 60 XP'}</span></div><progress max="${m.steps.length}" value="${p?.completed?m.steps.length:count}" aria-label="${esc(m.title)} progress"></progress><button class="btn ${done&&!started?'secondary':''}" data-start-module="${m.id}">${started?'Continue module':done?'Revisit module':'Start module'} ${icons.arrow}</button></article>`;
 }).join('')}</div><p class="xp-explanation">Earn 10 XP for each new lesson step. Practices earn 20 XP on the first recorded try. Personal ratings never change the reward.</p>${moduleErrorPanel()}${moduleFooter()}</main>`;
}
function moduleHistory(){
 const records=Object.values(state.learning.modules||{}).flatMap(p=>p.history).sort((a,b)=>b.saved_at.localeCompare(a.saved_at));
 const selected=records.find(r=>r.id===moduleView.record);
 if(selected){
   const reflection=selected.steps.find(s=>s.type==='reflect'),note=selected.steps.find(s=>s.type==='note');
   const answer=selected.answers[reflection.id];
   return `<h1>${esc(selected.title)}</h1><p class="module-meta">Your reflection · ${lessonDate(selected.saved_at)}</p><div class="module-record"><h2>${esc(reflection.prompt)}</h2><p class="saved-rating">${answer===null?'Not sure':`${answer} / 10`}</p><p class="module-meta">1 = Rarely true for me · 10 = Usually true for me</p>${selected.answers[note.id]?`<h2>A thought to take with me</h2><p class="module-note-text">${esc(selected.answers[note.id])}</p>`:'<p>You finished without planning a change. Your reflection is saved.</p>'}</div><button class="btn" data-module-screen="history">All reflections</button>`;
 }
 return `<h1>Your reflections</h1><p class="module-intro">What you noticed along the way, kept in your own words.</p>${records.map(r=>`<article class="module-history-row"><h2><button class="link" data-module-record="${r.id}">${esc(r.title)} ${icons.arrow}</button></h2><p class="module-meta">${lessonDate(r.saved_at)}</p></article>`).join('')||'<p>Finish a module to keep your first reflection here.</p>'}`;
}
function modulePlayer(){
 const m=moduleById(moduleView.id),p=moduleProgress(m.id);
 if(p.completed)return `<main class="module-player" id="main-content" tabindex="-1"><h1>A little more to build on.</h1><p class="module-intro">You completed ${esc(m.title.toLowerCase())}.</p><div class="module-completion"><span class="completion-check">${icons.check}</span><strong>${p.earned?`+${p.earned} XP`:'Module revisited'}</strong><p>${p.earned?'Six small steps. One more piece of your learning journey.':'Your new reflection is saved. You already earned this module’s XP.'}</p></div><p>Your answers and optional note are saved. Come back whenever it helps.</p><div class="module-actions"><button class="btn" data-module-screen="dashboard">Back to dashboard ${icons.arrow}</button><button class="link" data-module-record="${p.history.at(-1).id}">View my reflection</button></div></main>`;
 const step=m.steps[p.cursor],value=moduleValue(step),check=p.checks[step.id],matches=check&&value===check.choice;
 let task='';
 if(step.type==='idea')task=`<p class="module-idea">${esc(step.body)}</p><blockquote class="module-example">${esc(step.example)}</blockquote>`;
 if(step.type==='quiz')task=`<p class="module-intro">${esc(step.body)}</p><fieldset class="module-options"><legend class="sr-only">Choose an answer</legend>${step.choices.map((label,i)=>`<label><input type="radio" name="module-choice" value="${i}" ${value===i?'checked':''}><span>${esc(label)}</span></label>`).join('')}</fieldset><div id="module-feedback" class="module-feedback ${matches&&check.correct?'correct':''}" role="status" tabindex="-1" ${matches?'':'hidden'}>${matches?`<strong>${check.correct?'That’s it.':'Try another answer.'}</strong><p>${esc(check.message)}</p>`:''}</div>`;
 if(step.type==='reflect')task=`<p class="module-intro">${esc(step.body)}</p><fieldset class="module-rating"><legend>${esc(step.prompt)}</legend><div class="rating-anchors"><span>1 · Rarely true for me</span><span>10 · Usually true for me</span></div><div class="rating-choices">${Array.from({length:10},(_,i)=>`<label><input type="radio" name="module-rating" value="${i+1}" ${value===i+1?'checked':''}><span>${i+1}</span></label>`).join('')}</div><label class="rating-unsure"><input type="radio" name="module-rating" value="unsure" ${value===null?'checked':''}><span>Not sure yet</span></label></fieldset><p class="module-meta">This is personal reflection. Every answer is welcome.</p>`;
 if(step.type==='note')task=`<p class="module-intro">${esc(step.body)}</p><label for="module-note">${esc(step.prompt)} <span class="muted">(optional)</span></label><textarea id="module-note" maxlength="600">${esc(value||'')}</textarea>`;
 return `<main class="module-player" id="main-content" tabindex="-1"><div class="player-tools"><button class="link" data-module-screen="dashboard">Save & leave</button><span>${esc(m.title)}</span></div><progress max="${m.steps.length}" value="${p.cursor}" aria-label="Module progress"></progress><h1>${esc(step.title)}</h1><p class="module-meta">${{idea:'A small idea',quiz:'Check your understanding',reflect:'Make it personal',note:'Take it with you'}[step.type]} · Step ${p.cursor+1} of ${m.steps.length}</p><div class="module-task">${task}</div><div class="module-actions"><button class="btn" id="module-next">${step.type==='quiz'?'Check answer':step.type==='note'?'Finish module':'Continue'} ${icons.arrow}</button>${p.cursor?'<button class="link" id="module-back">Back</button>':''}</div><p id="module-status" class="module-meta" role="status">Progress saved</p><button class="link" id="module-retry" hidden>Retry saving</button>${p.cursor===0?`<details class="module-source"><summary>About this module</summary><p>${m.source_url?`<a href="${esc(m.source_url)}" target="_blank" rel="noopener noreferrer">${esc(m.source)}</a>`:esc(m.source)}</p><p>Reflections are your own observations, not an assessment of your relationship.</p></details>`:''}</main>`;
}
function modulesHome(){
 if(moduleView.screen==='recovery'&&moduleRecovery)return `<main class="module-player" id="main-content" tabindex="-1"><h1>Your progress changed elsewhere.</h1><p>That step was already finished or moved on in another tab. Your unsaved answer is here so you can copy it before continuing.</p><div class="module-record"><h2>${esc(moduleRecovery.title)}</h2><p class="module-note-text">${esc(moduleRecovery.display)}</p></div><button class="btn" id="module-recovery-close">Return to saved progress</button></main>`;
 if(moduleView.screen==='player'&&moduleProgress(moduleView.id))return modulePlayer();
 if(moduleView.screen==='history')return `<main class="module-player" id="main-content" tabindex="-1"><button class="link history-back" data-module-screen="dashboard">Dashboard</button>${moduleHistory()}</main>`;
 return moduleDashboard();
}
function updateModuleControls(){
 if(!state||moduleView.screen!=='player')return;
 const m=moduleById(moduleView.id),p=moduleProgress(m.id);if(!p||p.completed)return;
 const step=m.steps[p.cursor],value=moduleValue(step),button=byId('module-next');if(!button)return;
 button.disabled=moduleWorking;
 if(step.type==='quiz'){
   const check=p.checks[step.id],matches=check&&check.choice===value;
   button.textContent=matches&&check.correct?'Continue':matches?'Choose another answer':'Check answer';
   button.disabled=moduleWorking||value===undefined||Boolean(matches&&!check.correct);
   if(!matches&&byId('module-feedback'))byId('module-feedback').hidden=true;
 }else if(step.type==='reflect')button.disabled=moduleWorking||value===undefined;
}
async function moduleTransition(work,focusFeedback=false){
 if(moduleWorking)return;moduleWorking=true;byId('notice').className='';
 document.querySelectorAll('#app button,#app input,#app textarea,#app select').forEach(c=>c.disabled=true);
 try{await flushModule();await work();moduleLocal=null;render();
   const feedback=focusFeedback&&byId('module-feedback');
   if(feedback&&!feedback.hidden){feedback.focus({preventScroll:true});feedback.scrollIntoView({block:'nearest'});}
   else{byId('main-content')?.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}
 }catch(error){if(state){moduleError=moduleMessage(error);moduleStatus();notify(moduleError,true,true);}}
 finally{moduleWorking=false;document.querySelectorAll('#app button,#app input,#app textarea,#app select').forEach(c=>c.disabled=false);updateModuleControls();}
}
function bindModules(){
 document.querySelectorAll('[data-start-module]').forEach(b=>b.onclick=()=>moduleTransition(async()=>{moduleView.id=b.dataset.startModule;await moduleRequest('start');moduleView.screen='player';}));
 document.querySelectorAll('[data-module-screen]').forEach(b=>b.onclick=()=>moduleTransition(()=>{moduleView.screen=b.dataset.moduleScreen;moduleView.record=null;}));
 document.querySelectorAll('[data-module-record]').forEach(b=>b.onclick=()=>moduleTransition(()=>{moduleView.screen='history';moduleView.record=b.dataset.moduleRecord;}));
 document.querySelectorAll('[name="module-choice"]').forEach(input=>input.onchange=()=>queueModule(Number(input.value)));
 document.querySelectorAll('[name="module-rating"]').forEach(input=>input.onchange=()=>queueModule(input.value==='unsure'?null:Number(input.value)));
 const note=byId('module-note');if(note)note.oninput=()=>queueModule(note.value);
 const next=byId('module-next');if(next)next.onclick=()=>moduleTransition(()=>{
   const p=moduleProgress(moduleView.id),step=moduleById(moduleView.id).steps[p.cursor];
   const needsCheck=step.type==='quiz'&&!(p.checks[step.id]?.correct&&p.checks[step.id].choice===moduleValue(step));
   return moduleRequest(needsCheck?'check':'next',needsCheck?{value:moduleValue(step)}:{});
 },true);
 const back=byId('module-back');if(back)back.onclick=()=>moduleTransition(()=>moduleRequest('back'));
 const retry=byId('module-retry');if(retry)retry.onclick=()=>retryModule();
 const recover=byId('module-recovery-close');if(recover)recover.onclick=()=>{moduleRecovery=null;moduleView.screen='player';render();byId('main-content')?.focus();};
 moduleStatus();updateModuleControls();
}
async function retryModule(){
 if(moduleWorking||!moduleFailed)return;
 const failed=moduleFailed,local=moduleLocal,pending=modulePending;modulePending=null;
 await moduleTransition(async()=>{
   if(failed.conflict){
     const owner=state.user.id,fresh=await request('/api/state');
     if(fresh.user.id!==owner)throw new Error('Your space changed. Open Homeward again.');
     state.learning=fresh.learning;
     const p=moduleProgress(moduleView.id),step=moduleById(moduleView.id)?.steps[p?.cursor];
     if(local&&step?.id===local.step&&!p.completed){await moduleRequest('draft',{value:local.value});}
     else if(local){
       const oldStep=moduleById(local.id).steps.find(s=>s.id===local.step);
       moduleRecovery={title:oldStep.title,display:oldStep.type==='quiz'?oldStep.choices[local.value]:local.value===null?'Not sure':String(local.value)};
       moduleView.screen='recovery';
     }
   }else{
     await moduleRequest(failed.payload.action,failed.payload);
     if(pending&&pending.value!==failed.payload.value)await moduleRequest('draft',pending);
     if(failed.payload.action==='start')moduleView.screen='player';
   }
   moduleError='';moduleFailed=null;
 });
 if(moduleError&&pending)modulePending=pending;
}
