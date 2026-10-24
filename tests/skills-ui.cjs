const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function setup(request) {
  const ctx=vm.createContext({setTimeout,clearTimeout,window:{addEventListener(){}},byId:()=>null,request,
    state:{user:{id:'alex'},skill:{version:0,note:'',checks:{ingredients:false,time:false,help:false}},milestones:[]}});
  vm.runInContext(fs.readFileSync('public/skills.js','utf8'),ctx);
  return code=>vm.runInContext(code,ctx);
}
test('autosave serializes edits typed during an in-flight save',async()=>{
  let release; const gate=new Promise(r=>release=r);const calls=[];
  const run=setup(async(path,body)=>{calls.push(body);if(calls.length===1)await gate;return {skill:{version:body.version+1,...body.fields},milestones:[]};});
  run("queueSkill({note:'First words'})");const pending=run('flushSkill()');
  run("queueSkill({note:'Latest words'})");release();await pending;
  assert.equal(calls.length,2);assert.equal(calls[1].version,1);assert.equal(calls[1].fields.note,'Latest words');
  assert.equal(run('state.skill.note'),'Latest words');assert.equal(run('Object.keys(skillPending).length'),0);
});
test('failed save keeps the latest draft and explicit retry persists it',async()=>{
  let fail=true;
  const run=setup(async(path,body)=>{if(fail)throw new Error('Offline');return {skill:{version:1,...body.fields},milestones:[]};});
  run("queueSkill({note:'Keep my words'})");await assert.rejects(run('flushSkill()'),/Offline/);
  assert.equal(run('skillData().note'),'Keep my words');fail=false;await run('flushSkill()');
  assert.equal(run('state.skill.note'),'Keep my words');assert.equal(run('skillError'),'');
});
test('session expiry clears the failed draft instead of leaking it to a new profile',async()=>{
  let run;run=setup(async()=>{run('state=null');throw new Error('Sign in');});
  run("queueSkill({note:'Private Alex words'})");await assert.rejects(run('flushSkill()'),/Sign in/);
  assert.equal(run('Object.keys(skillPending).length'),0);
});
