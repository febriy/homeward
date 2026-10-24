/* A small plan to use away from the screen, followed by a private record. */
let activityView={screen:'library',id:null,record:null};
let activityDraft=null,activityDirty=false,activityBusy=false,activityError='',activityFailed=null,activityRecovery=null;
const activityById=id=>state.activities.find(a=>a.id===id);
const activityProgress=id=>state.learning.activities?.[id];
const activityOutcomes={worked:'It worked for me',adjust:'I tried it; I’d change something','not-yet':'I didn’t get to it'};
function resetActivities(){activityView={screen:'library',id:null,record:null};activityDraft=null;activityDirty=false;activityError='';activityFailed=null;activityRecovery=null;}
function learningNavigation(current){return `<nav class="learning-navigation" aria-label="Learning and practice"><button data-route="home" ${current==='home'?'aria-current="page"':''}>Lessons<span>Understand an idea</span></button><button data-route="practices" ${current==='practices'?'aria-current="page"':''}>Practices<span>Try it in your day</span></button></nav>`;}
function activityReadyLink(){
 const ready=(state.activities||[]).filter(a=>['ready','review'].includes(activityProgress(a.id)?.stage));
 return ready.length?`<div class="practice-reminder"><p>${ready.length===1?`Your practice is ready: <strong>${esc(ready[0].title)}</strong>`:`You have ${ready.length} practices ready to try.`}</p><button class="link" data-route="practices">Open my practices ${icons.arrow}</button></div>`:'';
}
function activityFields(){
 const p=activityProgress(activityView.id);
 if(activityDraft?.id===activityView.id&&activityDraft.stage===p?.stage)return activityDraft.fields;
 if(!p)return {};
 return p.stage==='action'?{action:p.plan.action}:p.stage==='cue'?{cue:p.plan.cue}:p.stage==='review'?{outcome:p.outcome,note:p.note}:{};
}
function editActivity(key,value){
 activityDraft={id:activityView.id,stage:activityProgress(activityView.id).stage,fields:{...activityFields(),[key]:value}};
 activityDirty=true;activityStatus();activityControls();
}
function activityStatus(){
 const node=byId('activity-status');if(node){node.hidden=activityView.screen==='library'&&!activityError;node.textContent=activityError?'Not saved. '+activityError:activityDirty?'Unsaved changes — save before leaving.':'Progress saved';}
 const retry=byId('activity-retry');if(retry){retry.hidden=!activityFailed;retry.textContent=activityFailed?.conflict?'Load saved plan':'Retry saving';}
}
function activityControls(){
 const button=byId('activity-next');if(!button||!state)return;
 const p=activityProgress(activityView.id),fields=activityFields();
 button.disabled=activityBusy||Boolean(activityFailed)||(p.stage==='action'&&!fields.action?.trim())||(p.stage==='cue'&&!fields.cue?.trim())||(p.stage==='review'&&!fields.outcome);
 if(activityFailed)document.querySelectorAll('#app input,#app textarea,#app select,[data-activity-suggestion]').forEach(e=>e.disabled=true);
}
async function activityRequest(action,fields={},retry){
 const owner=state.user.id,p=activityProgress(activityView.id);
 const payload=retry||{action,activity_id:activityView.id,stage:p?.stage,fields,version:state.learning.version,operation:crypto.randomUUID()};
 try{
   const result=await request('/api/activity',payload);
   if(state?.user.id!==owner)throw new Error('Your space changed. Open Homeward again.');
   state.learning=result.learning;activityDraft=null;activityDirty=false;activityError='';activityFailed=null;
 }catch(error){
   if(state?.user.id!==owner){resetActivities();throw error;}
   activityError=moduleMessage(error);activityFailed={payload,conflict:error.status===409};throw error;
 }
}
async function flushActivity(){if(activityDirty&&state)await activityRequest('save',activityFields());}
window.addEventListener('beforeunload',event=>{if(activityDirty||activityBusy){event.preventDefault();event.returnValue='';}});
async function activityTransition(work){
 if(activityBusy)return;activityBusy=true;byId('notice').className='';
 document.querySelectorAll('#app button,#app input,#app textarea,#app select').forEach(e=>e.disabled=true);
 try{await work();render();byId('main-content')?.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}
 catch(error){if(state){activityError=moduleMessage(error);activityStatus();}}
 finally{activityBusy=false;document.querySelectorAll('#app button,#app input,#app textarea,#app select').forEach(e=>e.disabled=false);activityControls();}
}
function activitySource(a){return `<details class="module-source"><summary>About this practice</summary>${a.sources.map(([label,url])=>`<p>${url?`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`:esc(label)}</p>`).join('')}</details>`;}
function activityGuide(a){return `<ol class="practice-instructions">${a.steps.map(([title,body])=>`<li><h2>${esc(title)}</h2><p>${esc(body)}</p></li>`).join('')}</ol><p class="practice-tip">${esc(a.tip)}</p>`;}
function activityPlan(p){return `<dl class="practice-plan"><dt>When</dt><dd>${esc(p.plan.cue)}</dd><dt>I’ll</dt><dd>${esc(p.plan.action)}</dd></dl>`;}
function activityFooter(){return `<footer class="module-footer"><button class="link" data-activity-screen="history">My practice records</button><p>${state.user.is_guest?'Saved for this browser for up to 30 days. Clearing cookies starts a new space.':'Practice plans and records are private to your profile.'}</p></footer>`;}
function activityLibrary(){
 return `<main class="module-dashboard" id="main-content" tabindex="-1"><div class="dashboard-heading"><div><h1>Small things.<br>In your real day.</h1><p>Learn how. Choose a moment. Give it a try.</p></div><div class="learning-summary"><strong>${learningXP()} <span>XP</span></strong><span>Learning & practice</span></div></div>${learningNavigation('practices')}<div class="module-grid practice-grid">${state.activities.map(a=>{
 const p=activityProgress(a.id),ready=['ready','review'].includes(p?.stage),done=p?.stage==='done';
 return `<article class="module-card">${moduleSymbol(a.symbol)}<h2>${esc(a.title)}</h2><p>${esc(a.description)}</p><p class="module-meta">${esc(a.category)} · ${esc(a.duration)}</p>${ready?`<div class="practice-card-plan"><strong>Your moment</strong><p>${esc(p.plan.cue)}</p></div>`:`<p class="module-meta">${done?'Your last reflection is saved.':p?'Your plan is in progress.':'A short guide and a plan that fits you.'}</p>`}<button class="btn ${done?'secondary':''}" data-activity-start="${a.id}">${ready?'Open my plan':done?'Plan another try':p?'Continue planning':'Explore practice'} ${icons.arrow}</button></article>`;
 }).join('')}</div><p class="xp-explanation">Plan first, then try it away from the screen. Earn 20 XP the first time you record trying each practice. Repeating it keeps a new record.</p><p id="activity-status" class="module-meta" role="status" ${activityError?'':'hidden'}></p><button class="link" id="activity-retry" hidden>Retry saving</button>${activityFooter()}</main>`;
}
function activityHistory(){
 const records=Object.values(state.learning.activities||{}).flatMap(p=>p.history).sort((a,b)=>b.saved_at.localeCompare(a.saved_at));
 const r=records.find(r=>r.id===activityView.record);
 return `<main class="module-player" id="main-content" tabindex="-1"><button class="link history-back" data-activity-screen="library">Practices</button>${r?`<h1>${esc(r.title)}</h1><p class="module-meta">${lessonDate(r.saved_at)}</p>${activityPlan(r)}<h2>${esc(activityOutcomes[r.outcome])}</h2>${r.note?`<p class="module-note-text">${esc(r.note)}</p>`:'<p>You kept this record without a note.</p>'}<button class="link" data-activity-screen="history">All practice records</button>`:`<h1>My practice records</h1><p class="module-intro">What you planned, what happened, and what you noticed.</p>${records.map(r=>`<article class="module-history-row"><h2><button class="link" data-activity-record="${r.id}">${esc(r.title)} ${icons.arrow}</button></h2><p class="module-meta">${lessonDate(r.saved_at)} · ${esc(activityOutcomes[r.outcome])}</p></article>`).join('')||'<p>After your first try, come back to your plan and record how it went.</p>'}`}</main>`;
}
function activityPlayer(){
 const a=activityById(activityView.id),p=activityProgress(a.id),f=activityFields(),stage=p.stage;
 let content='',title='',sub='',primary='Continue';
 if(stage==='guide'){title=a.title;sub='How to try it';content=`<p class="module-intro">${esc(a.intro)}</p>${activityGuide(a)}${activitySource(a)}`;primary='Make it mine';}
 if(stage==='action'){title='What will you try?';sub='Make it yours · 1 of 2';content=`<p class="module-intro">Choose a starting point, then edit it to fit your home.</p><div class="practice-suggestions">${a.options.map(s=>`<button class="practice-suggestion" data-activity-suggestion="${esc(s)}" data-field="action">${esc(s)}</button>`).join('')}</div><label for="activity-action">My small action</label><textarea id="activity-action" maxlength="400" placeholder="${esc(a.example)}">${esc(f.action)}</textarea>`;}
 if(stage==='cue'){title='What will be your cue?';sub='Make it yours · 2 of 2';content=`<p class="module-intro">Choose something that already happens in your day, or a specific time. It only needs to fit the next try.</p><div class="practice-suggestions">${a.cues.map(s=>`<button class="practice-suggestion" data-activity-suggestion="${esc(s)}" data-field="cue">${esc(s)}</button>`).join('')}</div><label for="activity-cue">When…</label><textarea id="activity-cue" maxlength="200" placeholder="For example: after dinner on Tuesday">${esc(f.cue)}</textarea><p class="practice-small-action"><strong>I’ll</strong> ${esc(p.plan.action)}</p><p class="module-meta">This saves your cue. Homeward won’t send a reminder.</p>`;primary='Save my plan';}
 if(stage==='ready'){title='Ready for your next try.';sub=a.title;content=`${activityPlan(p)}<p class="practice-tip">${esc(a.fallback)}</p><details class="practice-how"><summary>Show me the steps</summary>${activityGuide(a)}</details><p class="module-intro">Try it in your day, then come back to record how it went.</p>`;primary='Record how it went';}
 if(stage==='review'){title='How did it go?';sub=a.title;content=`<fieldset class="module-options"><legend class="sr-only">What happened?</legend>${Object.entries(activityOutcomes).map(([value,label])=>`<label><input type="radio" name="activity-outcome" value="${value}" ${f.outcome===value?'checked':''}><span>${esc(label)}</span></label>`).join('')}</fieldset><label for="activity-note" class="practice-note-label">What helped, or what would you change? <span class="muted">(optional)</span></label><textarea id="activity-note" maxlength="600">${esc(f.note)}</textarea><p class="module-meta">An imperfect try counts. If it didn’t happen, you can choose a different moment.</p>`;primary='Save my reflection';}
 if(stage==='done'){
 const r=p.history.at(-1);return `<main class="module-player" id="main-content" tabindex="-1"><h1>${r.outcome==='not-yet'?'Another moment is okay.':'A real step, in your day.'}</h1><p class="module-intro">${esc(a.title)} · Reflection saved</p>${r.earned?'<p class="practice-earned">+20 XP <span>For giving it a try</span></p>':''}<h2>${esc(activityOutcomes[r.outcome])}</h2><p>${r.outcome==='not-yet'?'Your plan is kept. Choose a smaller action or another cue whenever you’re ready.':'Keep what helped. You can repeat the plan or adjust it for next time.'}</p><div class="module-actions"><button class="btn" data-activity-screen="library">Back to practices</button><button class="link" data-activity-record="${r.id}">View my record</button></div></main>`;
 }
 return `<main class="module-player" id="main-content" tabindex="-1"><div class="player-tools"><button class="link" data-activity-screen="library">Save & leave</button><span>${esc(a.category)} practice</span></div><h1>${esc(title)}</h1><p class="module-meta">${esc(sub)}</p>${content}<div class="module-actions"><button class="btn" id="activity-next">${primary} ${icons.arrow}</button>${stage==='ready'?'<button class="link" id="activity-edit">Adjust plan</button>':stage!=='guide'?'<button class="link" id="activity-back">Back</button>':''}</div><p id="activity-status" class="module-meta" role="status">Progress saved</p><button class="link" id="activity-retry" hidden>Retry saving</button></main>`;
}
function activitiesHome(){
 if(activityRecovery)return `<main class="module-player" id="main-content" tabindex="-1"><h1>Your plan changed elsewhere.</h1><p>The saved version is ready. Here are your unsaved answers to copy before continuing.</p><div class="module-record">${Object.entries(activityRecovery).map(([key,value])=>`<h2>${esc({action:'My action',cue:'My cue',outcome:'What happened',note:'My note'}[key])}</h2><p class="module-note-text">${esc(key==='outcome'?activityOutcomes[value]:value)||'Left blank'}</p>`).join('')}</div><button class="btn" id="activity-recovered">Continue with saved plan</button></main>`;
 if(activityView.screen==='history')return activityHistory();
 if(activityView.screen==='player'&&activityProgress(activityView.id))return activityPlayer();
 return activityLibrary();
}
function bindActivities(){
 document.querySelectorAll('[data-activity-start]').forEach(b=>b.onclick=()=>activityTransition(async()=>{activityView.id=b.dataset.activityStart;await activityRequest('start');activityView.screen='player';}));
 document.querySelectorAll('[data-activity-screen]').forEach(b=>b.onclick=()=>activityTransition(async()=>{await flushActivity();activityView.screen=b.dataset.activityScreen;activityView.record=null;}));
 document.querySelectorAll('[data-activity-record]').forEach(b=>b.onclick=()=>{activityView={...activityView,screen:'history',record:b.dataset.activityRecord};render();byId('main-content')?.focus();window.scrollTo({top:0,behavior:'instant'});});
 document.querySelectorAll('[data-activity-suggestion]').forEach(b=>b.onclick=()=>{const key=b.dataset.field;byId('activity-'+key).value=b.dataset.activitySuggestion;editActivity(key,b.dataset.activitySuggestion);});
 ['action','cue','note'].forEach(key=>{const input=byId('activity-'+key);if(input)input.oninput=()=>editActivity(key,input.value);});
 document.querySelectorAll('[name="activity-outcome"]').forEach(input=>input.onchange=()=>editActivity('outcome',input.value));
 const next=byId('activity-next');if(next)next.onclick=()=>activityTransition(()=>activityRequest(activityProgress(activityView.id).stage==='ready'?'reflect':'next',activityFields()));
 const back=byId('activity-back');if(back)back.onclick=()=>activityTransition(()=>activityRequest('back',activityFields()));
 const edit=byId('activity-edit');if(edit)edit.onclick=()=>activityTransition(()=>activityRequest('edit'));
 const retry=byId('activity-retry');if(retry)retry.onclick=()=>activityTransition(async()=>{
   const failed=activityFailed;if(!failed)return;
   if(failed.conflict){
     const owner=state.user.id,fresh=await request('/api/state');
     if(fresh.user.id!==owner)throw new Error('Your space changed. Open Homeward again.');
     const fields=activityFields();activityRecovery=activityDirty&&Object.keys(fields).length?{...fields}:null;
     state.learning=fresh.learning;activityDraft=null;activityDirty=false;activityError='';activityFailed=null;
   }else{await activityRequest(failed.payload.action,{},failed.payload);if(failed.payload.action==='start')activityView.screen='player';}
 });
 const recovered=byId('activity-recovered');if(recovered)recovered.onclick=()=>{activityRecovery=null;render();byId('main-content')?.focus();};
 activityStatus();activityControls();
}
