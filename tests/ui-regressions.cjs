const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function ui() {
  const elements = new Map();
  const storage = new Map();
  const node = () => ({addEventListener(){},setAttribute(){},className:'',innerHTML:'',value:''});
  for (const id of ['#app','#editor','#edit-form','#notice','#draft-text','[data-act="approve_draft"]','#draft-unsaved']) elements.set(id,node());
  const ctx=vm.createContext({console, setTimeout,clearTimeout,
    document:{querySelector:s=>elements.get(s)||null,getElementById:id=>elements.get('#'+id)||null,querySelectorAll:()=>[]},
    sessionStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)}});
  vm.runInContext(fs.readFileSync('public/practice.js','utf8'),ctx);
  vm.runInContext(fs.readFileSync('public/app.js','utf8').split('(async()=>')[0],ctx);
  vm.runInContext(`state={user:{id:'alex'},members:[{id:'alex',name:'Alex'},{id:'sam',name:'Sam'}],meals:[],session:{id:'session-a',completed:true,draft:{text:'Our saved statement',approvals:{}},private:{published:[{id:'sensitive'}]},shared:[],practice:{fields:{value_id:'v',meal:'Rice',when:'Tonight',prep:'Prep',contribution:'Cook',fallback:'Toast',review_when:'Sunday'},status:'active',reviews:[],history:[],review_draft:null,vision_current:true}}};`,ctx);
  return {ctx,elements,run:code=>vm.runInContext(code,ctx)};
}

test('excluded publication stays excluded across rerenders, storage reload and session changes',()=>{
  const {run}=ui();
  assert.equal(run("shareChecked('sensitive')"),true);
  run("rememberShare('sensitive',false)");
  assert.equal(run("shareChecked('sensitive')"),false);
  run('shareDrafts.clear()');
  assert.equal(run("shareChecked('sensitive')"),false);
  assert.equal(run("shareChecked('new-card')"),false);
  run("state.session.id='session-b'");
  assert.equal(run("shareChecked('sensitive')"),true);
  run("state.session.id='session-a'");
  assert.equal(run("shareChecked('sensitive')"),false);
});

test('typing unsaved wording disables approval, including after an unrelated request',async()=>{
  const {run,elements}=ui();
  elements.get('#draft-text').value='Unsaved revision';
  run('syncStatementApproval()');
  assert.equal(elements.get('[data-act="approve_draft"]').disabled,true);
  assert.equal(elements.get('#draft-unsaved').hidden,false);
  await run("run('Check',async()=>{throw new Error('Request failed')})");
  assert.equal(elements.get('[data-act="approve_draft"]').disabled,true);
  elements.get('#draft-text').value='Our saved statement';
  run('syncStatementApproval()');
  assert.equal(elements.get('[data-act="approve_draft"]').disabled,false);
});

test('a partner completing or cancelling a review recovers to the current plan',()=>{
  const {run}=ui();
  run("practiceStep='review-agreement'");
  assert.match(run('practice()'),/Our plan this week/);
  run("practiceStep='review';state.session.practice.status='paused'");
  assert.match(run('practice()'),/Set aside for now/);
  run("practiceStep='review-agreement';state.session.practice=null");
  assert.match(run('practice()'),/What matters this week/);
});
