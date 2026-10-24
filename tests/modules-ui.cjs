const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const crypto=require('node:crypto').webcrypto;
function setup(request){
 const ctx=vm.createContext({setTimeout,clearTimeout,crypto,structuredClone,request,window:{addEventListener(){}},byId:()=>null,
 state:{user:{id:'alex'},learning:{version:0,modules:{test:{cursor:0,answers:{},checks:{},awarded:[],history:[]}}},modules:[{id:'test',steps:[{id:'note',type:'note'}]}]}});
 vm.runInContext(fs.readFileSync('public/modules.js','utf8'),ctx);
 vm.runInContext("moduleView={screen:'player',id:'test'}",ctx);
 return code=>vm.runInContext(code,ctx);
}
function reply(body){return {learning:{version:body.version+1,modules:{test:{cursor:0,answers:{note:body.value},checks:{},awarded:[],history:[]}}}};}
test('module autosave serializes current typing without overwriting the newest words',async()=>{
 let release;const gate=new Promise(r=>release=r);const calls=[];
 const run=setup(async(path,body)=>{calls.push(body);if(calls.length===1)await gate;return reply(body);});
 run("queueModule('First thought')");const pending=run('flushModule()');
 run("queueModule('Latest thought')");release();await pending;
 assert.equal(calls.length,2);assert.equal(calls[1].value,'Latest thought');assert.equal(calls[1].version,1);
 assert.equal(run('moduleLocal.value'),'Latest thought');assert.equal(run('modulePending'),null);
});
test('failed action retains its idempotency key and current answer for recovery',async()=>{
 const run=setup(async()=>{throw new Error('Failed to fetch');});
 run("queueModule('Do not lose this')");await assert.rejects(run('flushModule()'));
 assert.equal(run('modulePending.value'),'Do not lose this');
 assert.ok(run('moduleFailed.payload.operation').length>=16);
 assert.equal(run('moduleError'),'Connection lost. Keep this page open and retry.');
});
test('module session expiry clears unsaved private state',async()=>{
 let run;run=setup(async()=>{run('state=null');throw new Error('Expired');});
 run("queueModule('Private thought')");await assert.rejects(run('flushModule()'));
 assert.equal(run('modulePending'),null);assert.equal(run('moduleLocal'),null);assert.equal(run('moduleFailed'),null);
});
test('learning XP counts awarded steps, independent of personal ratings and replay history',()=>{
 const run=setup(async()=>{});
 run("state.learning.modules.test={awarded:['idea','quiz','reflect'],answers:{reflect:1},history:[{},{}]}");
 assert.equal(run('learningXP()'),30);
 run('state.learning.modules.test.answers.reflect=10');assert.equal(run('learningXP()'),30);
});
