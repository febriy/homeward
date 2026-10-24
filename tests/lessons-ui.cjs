const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function setup(request) {
  const ctx=vm.createContext({setTimeout,clearTimeout,structuredClone,window:{addEventListener(){}},byId:()=>null,request,notify(){},
    state:{user:{id:'alex'},learning:{version:0,drafts:{},history:[]}}});
  vm.runInContext(fs.readFileSync('public/lessons.js','utf8'),ctx);
  vm.runInContext("lessonDraft={lesson_id:'realistic-dinner',attempt:'fictional-attempt-001',answers:{picture:3},note:''}",ctx);
  return code=>vm.runInContext(code,ctx);
}
test('ratings and notes entered during a save persist in their latest form',async()=>{
  let release;const gate=new Promise(r=>release=r);const calls=[];
  const run=setup(async(path,body)=>{calls.push(body);if(calls.length===1)await gate;return {learning:{version:body.version+1,drafts:{},history:[]}};});
  run('queueLesson()');const pending=run('flushLesson()');
  run("lessonDraft.answers.picture=8;lessonDraft.note='Latest thought';queueLesson()");
  release();await pending;
  assert.equal(calls.length,2);assert.equal(calls[0].answers.picture,3);
  assert.equal(calls[1].version,1);assert.equal(calls[1].answers.picture,8);assert.equal(calls[1].note,'Latest thought');
  assert.equal(run('lessonDirty'),false);
});
test('failed draft save retains answers and succeeds on explicit retry',async()=>{
  let fail=true;const calls=[];
  const run=setup(async(path,body)=>{calls.push(body);if(fail)throw new Error('Offline');return {learning:{version:1,drafts:{},history:[]}};});
  run("lessonDraft.note='Keep this thought';queueLesson()");await assert.rejects(run('flushLesson()'),/Offline/);
  assert.equal(run('lessonDirty'),true);assert.equal(run('lessonDraft.note'),'Keep this thought');
  fail=false;await run('flushLesson()');assert.equal(calls[1].note,'Keep this thought');assert.equal(run('lessonError'),'');
});
test('expired identity cannot carry a personal reflection into a new guest space',async()=>{
  let run;run=setup(async()=>{run('state=null');throw new Error('Expired');});
  run('queueLesson()');await assert.rejects(run('flushLesson()'),/Expired/);
  assert.equal(run('lessonDraft'),null);assert.equal(run('lessonDirty'),false);
});
test('failed final save retains the attempt and retry closes only after confirmation',async()=>{
  let fail=true;const calls=[];
  const run=setup(async(path,body)=>{calls.push(body);if(fail)throw new Error('Offline');return {learning:{version:1,drafts:{},history:[{id:body.attempt}]}};});
  await assert.rejects(run('finishLesson()'),/Offline/);
  assert.equal(run('lessonFinishFailed'),true);
  assert.equal(run('lessonDraft.attempt'),'fictional-attempt-001');
  fail=false;await run('finishLesson()');
  assert.equal(calls[0].attempt,calls[1].attempt);
  assert.equal(run('lessonDraft'),null);assert.equal(run('lessonView.screen'),'library');
  assert.equal(run('state.learning.history.length'),1);
});
