/* Authored ideas, private self-reflections. No scores are inferred from answers. */
let lessonView = {screen:'library', id:null, record:null};
let lessonDraft = null;
let lessonDirty = false;
let lessonSaving = null;
let lessonTimer;
let lessonError = '';
let lessonWorking = false;
let lessonFinishFailed = false;
const lessonById = id => state.lessons.find(item=>item.id===id);
const lessonDate = date => new Date(date).toLocaleString(undefined,{day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'});

function resetLearning() {
  clearTimeout(lessonTimer);
  lessonView={screen:'library',id:null,record:null};lessonDraft=null;lessonDirty=false;lessonError='';lessonFinishFailed=false;
}
function lessonSaveStatus() {
  const node=byId('lesson-save-status');
  if(node) node.textContent=lessonError ? 'Not saved. '+lessonError : lessonDirty || lessonSaving ? 'Saving your draft…' : 'Draft saved. You can come back to this.';
  const retry=byId('lesson-retry');
  if(retry) {retry.hidden=!lessonError;retry.textContent=lessonError.includes('another tab')?'Reload saved reflections & retry':lessonFinishFailed?'Retry Save & close':'Retry saving';}
}
function queueLesson() {
  lessonDirty=true;lessonError='';lessonSaveStatus();clearTimeout(lessonTimer);
  lessonTimer=setTimeout(()=>flushLesson().catch(()=>{}),450);
}
async function flushLesson() {
  clearTimeout(lessonTimer);
  if(lessonSaving) await lessonSaving;
  if(!lessonDirty || !lessonDraft || !state) return;
  const owner=state.user.id;
  const payload=structuredClone(lessonDraft);
  lessonDirty=false;
  lessonSaving=(async()=>{
    try {
      const result=await request('/api/learning',{action:'draft',version:state.learning.version,...payload});
      if(state?.user.id!==owner)return;
      state.learning=result.learning;lessonError='';
    } catch(error) {
      if(state?.user.id!==owner){resetLearning();throw error;}
      lessonDirty=true;lessonError=error.message;throw error;
    }
  })();
  try {await lessonSaving;} finally {lessonSaving=null;lessonSaveStatus();}
  if(lessonDirty)await flushLesson();
}
window.addEventListener('beforeunload', event=>{
  if(lessonDirty || lessonSaving){event.preventDefault();event.returnValue='';}
});

function learningFooter() {
  const earlier=state.skill.history.length || state.skill.meal_id;
  return `<footer class="lesson-footer"><nav aria-label="More from Homeward"><button class="link" data-learning="history">Your reflections</button><button class="link" data-route="workbook">Values workbook</button>${earlier?'<button class="link" data-route="legacy-skill">Earlier dinner practice</button>':''}</nav><p>${state.user.is_guest?'This browser remembers your space for up to 30 days. Clearing cookies starts a new one.':'Reflections are private to your profile.'}</p></footer>`;
}
function lessonLibrary() {
  return `<h1>A little learning.<br>A clearer home.</h1><p class="lesson-intro">Read one small idea. Notice where you are.<br>Keep a reflection, and carry on with your day.</p><div class="lesson-list">${state.lessons.map(lesson=>{
    const records=state.learning.history.filter(record=>record.lesson_id===lesson.id);
    const draft=state.learning.drafts[lesson.id];
    return `<article class="lesson-row"><h2><button class="lesson-title" data-open-lesson="${lesson.id}">${esc(lesson.title)} ${icons.arrow}</button></h2><p>${esc(lesson.description)}</p><div class="lesson-row-meta"><span>${esc(lesson.category)} · Short read + self-check</span>${draft?`<button class="link" data-open-lesson="${lesson.id}">Continue reflection</button>`:records.length?`<button class="link" data-record="${records.at(-1).id}">Last reflection · ${friendlyDate(records.at(-1).saved_at)}</button>`:''}</div></article>`;
  }).join('')}</div>${learningFooter()}`;
}
function lessonReading(lesson) {
  return `<button class="link lesson-back" data-learning="library">All lessons</button><h1>${esc(lesson.title)}</h1><p class="lesson-meta">${esc(lesson.category)} · About 2 minutes to read and reflect</p><p class="lesson-intro">${esc(lesson.intro)}</p><div class="lesson-reading">${lesson.sections.map(([heading,body])=>`<section><h2>${esc(heading)}</h2><p>${esc(body)}</p></section>`).join('')}</div><p class="lesson-takeaway">${esc(lesson.takeaway)}</p><div class="actions"><button class="btn" data-learning="reflect">Reflect on this ${icons.arrow}</button><button class="link" data-learning="library">Just reading today</button></div><p class="lesson-source">${lesson.source_url?`<a href="${esc(lesson.source_url)}" target="_blank" rel="noopener noreferrer">${esc(lesson.source)}</a>`:esc(lesson.source)}</p>`;
}
function lessonReflection(lesson) {
  return `<button class="link lesson-back" data-learning="read">Read the lesson again</button><h1>Where am I right now?</h1><p class="lesson-meta">${esc(lesson.title)}</p><p class="lesson-intro">Think about your recent everyday life. This is a snapshot, not a test to pass.</p><form id="lesson-reflection"><p class="lesson-scale" id="rating-scale"><strong>1</strong> Rarely true for me <span>·</span> <strong>10</strong> Usually true for me<br>Not sure is an answer, too.</p>${lesson.questions.map(([id,label])=>`<div class="lesson-question"><label for="rating-${id}">${esc(label)}</label><select id="rating-${id}" data-rating="${id}" required aria-describedby="rating-scale"><option value="">Choose a rating</option>${Array.from({length:10},(_,i)=>`<option value="${i+1}" ${lessonDraft.answers[id]===i+1?'selected':''}>${i+1}${i===0?' — Rarely true':i===9?' — Usually true':''}</option>`).join('')}<option value="unsure" ${Object.hasOwn(lessonDraft.answers,id)&&lessonDraft.answers[id]===null?'selected':''}>Not sure</option></select></div>`).join('')}<div class="lesson-change"><label for="lesson-note">Anything you want to change? <span>(optional)</span></label><p class="hint" id="change-hint">One small thought is enough. It’s also fine to leave this here.</p><textarea id="lesson-note" maxlength="600" aria-describedby="change-hint">${esc(lessonDraft.note)}</textarea></div><div class="actions"><button class="btn" type="submit">Save & close ${icons.check}</button></div><p class="lesson-meta" id="lesson-save-status" role="status">${state.learning.drafts[lesson.id]?'Draft saved. You can come back to this.':'Your answers will save as you go.'}</p><button class="link" id="lesson-retry" type="button" hidden>Retry saving</button><p class="lesson-source">${esc(lesson.reflection_note||'Your own reflection. These ratings are not a measured skill level.')}</p></form>`;
}
function reflectionDetail(record) {
  return `<dl class="lesson-answers">${record.questions.map(([id,label])=>`<div><dt>${esc(label)}</dt><dd>${record.answers[id]===null?'Not sure':`${record.answers[id]}<span> / 10</span>`}</dd></div>`).join('')}</dl><p class="lesson-meta">1 = Rarely true for me · 10 = Usually true for me</p>${record.note?`<div class="lesson-saved-note"><h2>Something I might change</h2><p>${esc(record.note)}</p></div>`:'<p class="lesson-meta">No change planned. Noticing is enough for today.</p>'}`;
}
function learning() {
  const lesson=lessonById(lessonView.id);
  let body;
  if(lessonView.screen==='read' && lesson)body=lessonReading(lesson);
  else if(lessonView.screen==='reflect' && lesson)body=lessonReflection(lesson);
  else if(lessonView.screen==='record') {
    const record=state.learning.history.find(item=>item.id===lessonView.record);
    body=record?`<button class="link lesson-back" data-learning="library">All lessons</button><h1>${esc(record.title)}</h1><p class="lesson-meta">Your reflection · ${lessonDate(record.saved_at)}</p>${reflectionDetail(record)}<div class="actions"><button class="btn" data-learning="library">Close reflection</button><button class="link" data-open-lesson="${record.lesson_id}">Revisit the lesson</button></div>`:lessonLibrary();
  } else if(lessonView.screen==='history') {
    body=`<button class="link lesson-back" data-learning="library">All lessons</button><h1>Your reflections</h1><p class="lesson-intro">A record of what you noticed, in your own words. There’s no overall score.</p>${[...state.learning.history].reverse().map(record=>`<article class="lesson-row"><h2><button class="lesson-title" data-record="${record.id}">${esc(record.title)} ${icons.arrow}</button></h2><p class="lesson-meta">${lessonDate(record.saved_at)}</p></article>`).join('')||'<p>When you save a reflection, you’ll find it here.</p>'}`;
  } else body=lessonLibrary();
  return `<main class="lesson-work" id="main-content" tabindex="-1">${body}</main>`;
}

async function lessonTransition(work) {
  if(lessonWorking)return;
  lessonWorking=true;
  byId('notice').className='';
  document.querySelectorAll('#app button,#app input,#app textarea,#app select').forEach(control=>control.disabled=true);
  try {await flushLesson();await work();render();byId('main-content')?.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}
  catch(error){notify(error.message,true,true);lessonError=error.message;lessonSaveStatus();}
  finally {lessonWorking=false;document.querySelectorAll('#app button,#app input,#app textarea,#app select').forEach(control=>control.disabled=false);}
}
function openLesson(id) {
  const saved=state.learning.drafts[id];
  lessonDraft=saved?{lesson_id:id,attempt:saved.id,answers:structuredClone(saved.answers),note:saved.note}:{lesson_id:id,attempt:crypto.randomUUID(),answers:{},note:''};
  lessonView={screen:saved?'reflect':'read',id,record:null};lessonError='';lessonFinishFailed=false;
}
async function finishLesson() {
  const owner=state.user.id;
  try {
    const result=await request('/api/learning',{action:'finish',version:state.learning.version,...structuredClone(lessonDraft)});
    if(state?.user.id!==owner)return;
    state.learning=result.learning;lessonView={screen:'library',id:null,record:null};lessonDraft=null;lessonDirty=false;lessonFinishFailed=false;
    notify('Reflection saved. That’s enough for today.');
  }catch(error){lessonFinishFailed=true;throw error;}
}
function bindLearning() {
  document.querySelectorAll('[data-open-lesson]').forEach(button=>button.onclick=()=>lessonTransition(()=>openLesson(button.dataset.openLesson)));
  document.querySelectorAll('[data-record]').forEach(button=>button.onclick=()=>lessonTransition(()=>{lessonView={screen:'record',id:null,record:button.dataset.record};}));
  document.querySelectorAll('[data-learning]').forEach(button=>button.onclick=()=>lessonTransition(()=>{
    const screen=button.dataset.learning;
    lessonView.screen=screen==='reflect'?'reflect':screen;
  }));
  document.querySelectorAll('[data-rating]').forEach(input=>input.onchange=()=>{
    if(input.value==='')delete lessonDraft.answers[input.dataset.rating];
    else lessonDraft.answers[input.dataset.rating]=input.value==='unsure'?null:Number(input.value);
    queueLesson();
  });
  const note=byId('lesson-note');if(note)note.oninput=()=>{lessonDraft.note=note.value;queueLesson();};
  const form=byId('lesson-reflection');if(form)form.onsubmit=event=>{
    event.preventDefault();
    lessonTransition(finishLesson);
  };
  const retry=byId('lesson-retry');if(retry)retry.onclick=async()=>{
    if(lessonWorking)return;
    lessonWorking=true;
    document.querySelectorAll('#app button,#app input,#app textarea,#app select').forEach(control=>control.disabled=true);
    try {
      if(lessonError.includes('another tab')){
        const owner=state.user.id;const fresh=await request('/api/state');
        if(state?.user.id!==owner || fresh.user.id!==owner)throw new Error('Your space changed. Reload to continue.');
        state.learning=fresh.learning;
        if(state.learning.history.some(record=>record.id===lessonDraft.attempt)){
          lessonDraft.attempt=crypto.randomUUID();lessonDirty=true;
        }
      }
      await flushLesson();
      if(lessonFinishFailed){await finishLesson();render();byId('main-content')?.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}
      lessonError='';lessonSaveStatus();
    }catch(error){lessonError=error.message;lessonSaveStatus();}
    finally{lessonWorking=false;document.querySelectorAll('#app button,#app input,#app textarea,#app select').forEach(control=>control.disabled=false);}
  };
}
