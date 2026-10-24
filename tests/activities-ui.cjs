const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const crypto=require('node:crypto').webcrypto;
function setup(request){
 const ctx=vm.createContext({crypto,request,byId:()=>null,moduleMessage:e=>e.message,window:{addEventListener(){}},
 state:{user:{id:'alex'},learning:{version:0,activities:{test:{stage:'action',plan:{action:'',cue:''},note:'',outcome:''}}}}});
 vm.runInContext(fs.readFileSync('public/activities.js','utf8'),ctx);vm.runInContext("activityView={screen:'player',id:'test'}",ctx);
 return code=>vm.runInContext(code,ctx);
}
test('explicit save sends the latest edited words with the current stage',async()=>{
 let sent;const run=setup(async(_,body)=>{sent=body;return {learning:{version:1,activities:{test:{stage:'action',plan:{action:body.fields.action,cue:''}}}}};});
 run("editActivity('action','First idea');editActivity('action','The action I chose')");await run('flushActivity()');
 assert.equal(sent.fields.action,'The action I chose');assert.equal(sent.stage,'action');assert.equal(run('activityDirty'),false);
});
test('a failed save retains unsaved words and the exact operation for retry',async()=>{
 const run=setup(async()=>{throw new Error('Failed to fetch');});run("editActivity('action','My own action')");
 await assert.rejects(run('flushActivity()'));assert.equal(run('activityFields().action'),'My own action');
 assert.equal(run('activityDirty'),true);assert.ok(run('activityFailed.payload.operation').length>=16);
});
test('session expiry discards private practice drafts',async()=>{
 let run;run=setup(async()=>{run('state=null');throw new Error('Expired');});run("editActivity('action','Private words')");
 await assert.rejects(run('flushActivity()'));assert.equal(run('activityDraft'),null);assert.equal(run('activityDirty'),false);
});
test('shared XP adds practice attempts without rewarding an untried plan',()=>{
 const ctx=vm.createContext({window:{addEventListener(){}},state:{learning:{modules:{one:{awarded:['a','b']}},activities:{a:{awarded:false},b:{awarded:true}}}}});
 vm.runInContext(fs.readFileSync('public/modules.js','utf8'),ctx);assert.equal(vm.runInContext('learningXP()',ctx),40);
});
