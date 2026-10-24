/* Saved dinner practice. Identity and agreement are enforced on the server. */
let practiceStep = null;
const practiceFields = (label, key, value='', optional=false, multiline=false) => `<div class="field"><label for="plan-${key}">${label}${optional?' <span class="hint">Optional</span>':''}</label>${multiline?`<textarea id="plan-${key}" name="${key}" maxlength="600" ${optional?'':'required'}>${esc(value)}</textarea>`:`<input id="plan-${key}" name="${key}" value="${esc(value)}" maxlength="160" ${optional?'':'required'}>`}</div>`;
const practiceSubmit = label => `<div class="actions"><button class="btn" type="submit">${label} ${icons.arrow}</button></div>`;
const practiceNext = (label, step) => `<button type="button" class="link" data-practice-step="${step}">${label}</button>`;

function nextPracticeStep() {
  const p=sess().practice, f=p?.fields||{};
  if(!f.value_id)return 'focus';
  if(!f.meal)return 'meal';
  if(!f.when)return 'timing';
  if(!f.prep||!f.contribution)return 'roles';
  if(!f.fallback||!f.review_when)return 'support';
  if(p.review_draft)return 'review-agreement';
  return p.status==='draft'?'approve':'overview';
}

function practicePlan() {
  const p=sess().practice, f=p.fields;
  const value=approved().find(c=>c.id===f.value_id);
  const meal=state.meals.find(m=>m.id===f.meal_id);
  const rows=[['When',f.when],['Prepare ahead',f.prep],['At dinner',f.contribution],
    ...(f.child?[['A child’s part',f.child]]:[]),['Our easier fallback',f.fallback],['Check in together',f.review_when]];
  return `<section class="plan-summary"><h2>${esc(f.title)}</h2>${value?`<p class="hint">Practising ${esc(value.label.toLowerCase())}</p>`:''}<div class="chosen-meal">${meal?`<img src="/meals/${meal.id}.webp" alt="" width="80" height="80">`:''}<strong>${esc(f.meal)}</strong></div><dl>${rows.map(([key,value])=>`<div><dt>${key}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl></section>`;
}

function reviewText(review) {
  return `<section class="review-record"><h2>What we noticed</h2><p>${esc(review.helped)}</p>${review.difficult?`<h3>Still difficult</h3><p>${esc(review.difficult)}</p>`:''}<p><strong>${{keep:'Keep it',adjust:'Adjust it',pause:'Set it aside'}[review.outcome]}</strong></p></section>`;
}

function practice() {
  if(!sess().completed)return `${intro('Our practice', 'Give this a shared direction.', 'First, agree on your family statement. Then choose one part to put into practice.')}<button class="btn" data-route="statement">Go to our statement ${icons.arrow}</button>`;
  const p=sess().practice, f=p?.fields||{};
  if ((practiceStep==='review-agreement' && !p?.review_draft) ||
      (practiceStep==='review' && p?.status!=='active') ||
      (['overview','approve'].includes(practiceStep) && !p)) practiceStep=null;
  const step=practiceStep||nextPracticeStep();
  const titles={focus:['What matters this week?','Choose one part of your vision to bring into an ordinary dinner.'],meal:['What sounds familiar?','Pick something you already know how to make. You can adapt it to your family.'],timing:['When could this fit?','Choose one evening in the week you actually have.'],roles:['Who takes care of what?','Include the noticing and preparation, as well as what happens at dinner.'],support:['What if the evening gets difficult?','An easier option gives you room to adapt. Choose when you’ll check in, too.'],approve:['Does this work for both of you?','Read the plan together. Each person agrees through their own profile.'],overview:['Our plan this week.','One shared experiment. Give it room in real life, then talk about what you noticed.'],review:['What did you notice?','Did this help your home feel the way you hoped? Write a review together.'],'review-agreement':['Do we agree on what comes next?','Read your reflection and next step. Each person confirms through their own profile.']};
  let content='';
  if(step==='focus')content=`<blockquote class="practice-vision">${esc(sess().draft.text)}</blockquote><form data-practice-form="focus"><fieldset><legend>One value to practise</legend><div class="priority-options">${approved().filter(c=>c.kind==='value').map((c,i)=>`<label class="priority-option"><input type="radio" name="value_id" value="${c.id}" ${(f.value_id===c.id||!f.value_id&&i===0)?'checked':''} required>${esc(c.label)}</label>`).join('')}</div></fieldset><div class="field"><label for="plan-feeling">How would you like dinner to feel?</label><select id="plan-feeling" name="feeling_id"><option value="">Choose later</option>${approved().filter(c=>c.kind==='feeling').map(c=>`<option value="${c.id}" ${f.feeling_id===c.id?'selected':''}>${esc(c.label)}</option>`).join('')}</select></div>${practiceSubmit('Choose a meal')}</form>`;
  if(step==='meal')content=`<form data-practice-form="meal"><fieldset><legend>One meal to try</legend><div class="meal-grid">${state.meals.map((m,i)=>`<label class="meal-choice"><img src="/meals/${m.id}.webp" alt="" width="512" height="512"><span class="meal-label"><input type="radio" name="meal_id" value="${m.id}" ${f.meal_id===m.id||!f.meal_id&&i===0?'checked':''}><span>${esc(m.name)}</span></span></label>`).join('')}</div><label class="priority-option own-meal"><input type="radio" name="meal_id" value="custom" ${f.meal_id==='custom'?'checked':''}>Our own meal</label></fieldset><div class="field" id="own-meal-field" ${f.meal_id==='custom'?'':'hidden'}><label for="custom-meal">What do you call it?</label><input id="custom-meal" name="custom_meal" maxlength="160" value="${esc(f.meal_id==='custom'?f.meal:'')}" ${f.meal_id==='custom'?'required':''}></div>${practiceSubmit('Use this meal')}<p class="footer-note">Food illustrations are examples. Choose your own ingredients and familiar version.</p></form>`;
  if(step==='timing')content=`<p class="chosen-meal"><strong>${esc(f.meal)}</strong>${practiceNext('Choose another meal','meal')}</p><form data-practice-form="timing">${practiceFields('When we’ll try it','when',f.when)}<details class="reflection-help"><summary>Make it yours</summary>${practiceFields('Our version of this meal','meal',f.meal)}${practiceFields('What we’re trying','title',f.title||'One calmer dinner')}</details>${practiceSubmit('Share the work')}</form>`;
  if(step==='roles')content=`<form data-practice-form="roles">${practiceFields('Who checks and prepares ahead?','prep',f.prep,false,true)}${practiceFields('Who does what at dinner?','contribution',f.contribution,false,true)}${practiceFields('A child’s small contribution','child',f.child,true)}${practiceSubmit('Plan for a difficult evening')}</form>`;
  if(step==='support')content=`<form data-practice-form="support">${practiceFields('Our easier fallback','fallback',f.fallback,false,true)}${practiceFields('When we’ll review together','review_when',f.review_when)}${practiceSubmit('Read our plan together')}</form>`;
  if(step==='approve')content=`${practicePlan()}${approvalBadges(p)}<div class="actions"><button class="btn" data-practice-action="practice_approve">${p.approvals[myId()]?'I have agreed':'This plan works for me'} ${icons.check}</button>${practiceNext('Change our plan','focus')}<button class="link" data-act="refresh">Refresh partner’s progress</button></div><p class="footer-note">Any change asks both of you to agree again.</p>`;
  if(step==='overview')content=`<p class="practice-receipt">${p.status==='active'?'Agreed by both partners':'Set aside for now'}</p>${practicePlan()}${p.reviews.length?reviewText(p.reviews[p.reviews.length-1]):''}<div class="actions">${p.status==='active'?`<button class="btn" data-practice-step="review">Review together ${icons.arrow}</button>`:''}${practiceNext(p.status==='paused'?'Revise and try again':'Adjust the plan','focus')}${p.status==='active'?'<button class="link" data-practice-action="practice_withdraw">Withdraw my agreement</button>':''}</div>`;
  if(step==='review'){
    const r=p.review_draft||{};
    content=`<form data-practice-form="review">${practiceFields('What helped, or what did you notice?','helped',r.helped,false,true)}${practiceFields('What was still difficult?','difficult',r.difficult,true,true)}<fieldset><legend>What would you like to do next?</legend><div class="priority-options">${[['keep','Keep it'],['adjust','Adjust it'],['pause','Set it aside']].map(([id,label])=>`<label class="priority-option"><input type="radio" name="outcome" value="${id}" ${(r.outcome||'keep')===id?'checked':''}>${label}</label>`).join('')}</div></fieldset>${practiceSubmit('Save for us to review')}</form>`;
  }
  if(step==='review-agreement')content=`${reviewText(p.review_draft)}${approvalBadges(p.review_draft)}<div class="actions"><button class="btn" data-practice-action="practice_review_approve">${p.review_draft.approvals[myId()]?'I have agreed':'I agree with this next step'} ${icons.check}</button>${practiceNext('Revise our review','review')}<button class="link" data-act="refresh">Refresh partner’s progress</button><button class="link" data-practice-action="practice_cancel_review">Set this draft review aside</button></div><p class="hint">A draft set aside stays in your history.</p>`;
  const back={meal:'focus',timing:'meal',roles:'timing',support:'roles',approve:'support',review:'overview'}[step];
  const progress=['focus','meal','timing','roles','support'].includes(step)?`<ol class="practice-progress" aria-label="Plan steps">${[['focus','Priority'],['meal','Meal'],['timing','When'],['roles','Roles'],['support','Fallback']].map(([id,label])=>`<li ${step===id?'aria-current="step"':''}>${label}</li>`).join('')}</ol>`:'';
  const sourceChanged=p&&!p.vision_current;
  return `<div class="practice-work">${back?practiceNext('Back',back):''}${intro('Our shared practice',titles[step][0],titles[step][1])}${progress}${sourceChanged?'<div class="note">Your vision has changed. Review and save this plan again before agreeing to it.</div>':''}${content}${p?.history.length||p?.reviews.length||p?.review_history?.length?`<details class="practice-history"><summary>Earlier plans and reviews</summary>${(p.reviews||[]).map(r=>`<p class="hint">${friendlyDate(r.saved_at)}</p>${reviewText(r)}`).join('')}${(p.review_history||[]).map(r=>`<p class="hint">Draft set aside · ${friendlyDate(r.set_aside_at)}</p>${reviewText(r)}`).join('')}${(p.history||[]).slice().reverse().map(h=>`<section><h3>Plan revision ${h.revision}</h3><p>${esc(h.fields.title)} · ${esc(h.fields.meal)}</p><p>${esc(h.fields.when)}</p></section>`).join('')}</details>`:''}</div>`;
}

function bindPractice() {
  document.querySelectorAll('[data-practice-step]').forEach(button=>button.onclick=()=>{
    practiceStep=button.dataset.practiceStep; render(); document.querySelector('#main-content').focus(); window.scrollTo(0,0);
  });
  document.querySelectorAll('[name="meal_id"]').forEach(input=>input.onchange=()=>{
    const custom=input.value==='custom';
    byId('own-meal-field').hidden=!custom; byId('custom-meal').required=custom;
  });
  document.querySelectorAll('[data-practice-action]').forEach(button=>button.onclick=()=>run('Saving your agreement…',async()=>{
    await action(button.dataset.practiceAction); practiceStep=null;
  }));
  document.querySelectorAll('[data-practice-form]').forEach(form=>form.onsubmit=event=>{
    event.preventDefault();
    const step=form.dataset.practiceForm, fields=Object.fromEntries(new FormData(form));
    if(step==='meal'){
      fields.meal=fields.meal_id==='custom'?fields.custom_meal:state.meals.find(m=>m.id===fields.meal_id).name;
      delete fields.custom_meal;
    }
    if(step==='focus'&&!sess().practice?.fields.title)fields.title='One calmer dinner';
    run('Saving your shared work…',async()=>{
      await action(step==='review'?'practice_review':'practice_save',step==='review'?fields:{fields});
      practiceStep={focus:'meal',meal:'timing',timing:'roles',roles:'support',support:'approve',review:'review-agreement'}[step];
      window.scrollTo(0,0);
    });
  });
}
