import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {JSDOM}=createRequire(import.meta.url)(process.env.JSDOM_MODULE||'jsdom');
import {startCloud} from '../schedule-cloud-ui.mjs';
import {createAccountData} from '../schedule-account.mjs';
import {validateState} from '../schedule-sync-core.mjs';
const STORAGE_KEY='myWeekPlanner_v5';
const initialState=()=>({version:5,workConfig:{weekdays:[],label:'회사',start:'09:00',end:'18:00'},workExceptions:{},workOverrides:{},categories:[],trackerDefs:[],trackerLogs:{},sleepLogs:{},events:[],budgets:{}});
import {CLOUD_SLOT} from '../schedule-cloud-core.mjs';
import {authErrorMessage} from '../schedule-auth-errors.mjs';
import {SYNC_CONFIG} from '../schedule-config.mjs';
const copy=x=>structuredClone(x),tick=()=>new Promise(r=>setTimeout(r,5));
async function until(fn){for(let i=0;i<80;i++){if(fn())return;await tick();}assert.ok(fn(),'timed out waiting for UI');}
function setup({rows=new Map(),session=null,persistent=true,seed=[],invalid=false,invalidSession=false}={}){
 const dom=new JSDOM('<button data-action="cloud-open"><span data-cloud-label></span><small data-cloud-status></small></button>',{url:'https://embed.example/'});
 for(const key of ['window','document','navigator','Event'])Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});
 dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};dom.window.HTMLDialogElement.prototype.close=function(){this.open=false;};
 const cache=new Map(seed),storage={persistent,getItem:k=>cache.get(k)??null,setItem:(k,v)=>cache.set(k,String(v)),removeItem:k=>cache.delete(k),keys:()=>[...cache.keys()]};
 const account=createAccountData({storage,key:STORAGE_KEY,empty:initialState,validate:validateState});let state=initialState(),listener,reads=0,writes=0,seen=[];
 const bridge={read:()=>copy(state),validate:validateState,get storageKey(){return account.storageKey;},busy:()=>false,isPristine:()=>JSON.stringify(state)===JSON.stringify(initialState()),hasLegacy:()=>account.hasLegacy(),importLegacy:()=>state=account.importLegacy(),setAccount:id=>state=id?account.activate(id):account.deactivate(),apply:value=>{account.write(value);state=copy(value);},export:()=>{},download:()=>{}};
 const client={auth:{
  onAuthStateChange:fn=>{listener=fn;return{data:{subscription:{unsubscribe(){}}}};},getSession:async()=>({data:{session},error:null}),getUser:async()=>({data:{user:invalidSession?null:session?.user},error:invalidSession?{code:'invalid_credentials'}:null}),
  signInWithPassword:async credentials=>{seen.push(credentials);if(invalid)return{error:{code:'invalid_credentials'}};session={user:{id:credentials.email.startsWith('a')?'A':'B',email:credentials.email}};listener('SIGNED_IN',session);return{data:{user:session.user,session},error:null};},
  signOut:async()=>{session=null;listener('SIGNED_OUT',null);return{error:null};}
 },channel:()=>({on(){return this},subscribe(){return this}}),removeChannel(){},from:()=>{
  let op='read',payload,filters={};const q={select(){return q},eq(k,v){filters[k]=v;return q},update(v){op='update';payload=v;return q},insert(v){op='insert';payload=v;return q},async maybeSingle(){
   const id=filters.user_id??payload?.user_id;if(id!==session?.user.id)return{error:{code:'42501'}};
   if(op==='read'){reads++;return{data:copy(rows.get(id)??null),error:null};}
   writes++;const old=rows.get(id);if(op==='update'&&old?.updated_at!==filters.updated_at)return{data:null,error:null};
   const row={state:copy(payload.state),updated_at:String(writes+10)};rows.set(id,row);return{data:copy(row),error:null};
  }};return q;
 }};
 const ui=startCloud(bridge,{storage,loadClient:async()=>({createClient:()=>client})});
 const submit=email=>{const form=document.querySelector('form');form.elements.email.value=email;form.elements.password.value='test-password';form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));};
 const click=action=>document.querySelector('[data-cloud="'+action+'"]').click();
 return{ui,dom,cache,rows,seen,submit,click,get state(){return state},get reads(){return reads},get writes(){return writes},status:()=>document.querySelector('#cloud-detail').textContent,close(){ui.destroy();dom.window.close();}};
}
const snapshot=amount=>{const state=initialState();state.budgets['2026-10']={total:amount,allocations:{}};return{state:{[CLOUD_SLOT]:{schema:1,revision:'r1',data:state}},updated_at:'1'};};
test('direct password login works with blocked storage and pulls server data',async()=>{
 const app=setup({persistent:false,rows:new Map([['A',snapshot(700)]])});try{await app.ui.ready;app.submit('a@example.test');await until(()=>app.status()==='동기화됨');
 assert.equal(app.state.budgets['2026-10'].total,700);assert.equal(app.writes,0);assert.equal(document.querySelector('[name=password]').value,'');
 assert.match(document.querySelector('#cloud-storage').textContent,/이 창에서만/);
 }finally{app.close();}
});
test('sign-out clears visible records; second login loads only the second account',async()=>{
 const app=setup({rows:new Map([['A',snapshot(700)],['B',snapshot(900)]])});try{await app.ui.ready;app.submit('a@example.test');await until(()=>app.status()==='동기화됨');app.click('logout');await until(()=>app.status()==='로그인해 주세요');
 assert.deepEqual(app.state.budgets,{});await until(()=>!document.querySelector('button[type=submit]').disabled);app.submit('b@example.test');await until(()=>app.state.budgets['2026-10']?.total===900);assert.equal(app.writes,0);
 }finally{app.close();}
});
test('failed password login keeps records hidden and displays an actionable error',async()=>{
 const app=setup({invalid:true});try{await app.ui.ready;app.submit('a@example.test');await until(()=>app.status().includes('비밀번호를 확인'));
 assert.deepEqual(app.state.budgets,{});assert.equal(app.reads,0);assert.equal(document.querySelector('[name=password]').value,'');
 }finally{app.close();}
});
test('unknown legacy records are not uploaded or replaced on first login',async()=>{
 const app=setup({seed:[[STORAGE_KEY,JSON.stringify(snapshot(350).state[CLOUD_SLOT].data)]],rows:new Map([['A',snapshot(700)]])});try{await app.ui.ready;app.submit('a@example.test');await until(()=>app.status().includes('연결할 데이터'));
 assert.equal(app.writes,0);assert.equal(document.querySelector('[data-cloud=legacy]').hidden,false);assert.equal(JSON.parse(app.cache.get(STORAGE_KEY)).budgets['2026-10'].total,350);
 }finally{app.close();}
});
test('restored sessions verify identity before displaying cached records',async()=>{
 const app=setup({session:{user:{id:'A',email:'a@example.test'}},rows:new Map([['A',snapshot(700)]])});try{await app.ui.ready;assert.equal(app.state.budgets['2026-10'].total,700);}finally{app.close();}
});
test('invalid restored identity cannot display the previous account cache',async()=>{
 const app=setup({invalidSession:true,session:{user:{id:'A',email:'a@example.test'}},seed:[[STORAGE_KEY+':account:'+SYNC_CONFIG.url+'|A',JSON.stringify(snapshot(350).state[CLOUD_SLOT].data)]]});
 try{await app.ui.ready;assert.deepEqual(app.state.budgets,{});assert.equal(app.reads,0);assert.equal(document.querySelector('#cloud-connected').hidden,true);}finally{app.close();}
});
test('missing account cache never replaces pending edits with automatic server data',async()=>{
 const pending=snapshot(350).state[CLOUD_SLOT].data,key='my-week.cloud.v1:'+SYNC_CONFIG.url+':A';
 const meta={linked:true,base:snapshot(700).state[CLOUD_SLOT],pending};
 const app=setup({seed:[[key,JSON.stringify(meta)]],rows:new Map([['A',snapshot(700)]])});
 try{await app.ui.ready;app.submit('a@example.test');await until(()=>app.state.budgets['2026-10']?.total===350);assert.equal(app.state.budgets['2026-10'].total,350);}finally{app.close();}
});
test('connection failures are distinct from wrong credentials',()=>{
 assert.match(authErrorMessage(new TypeError('Failed to fetch')),/서버에 연결/);assert.match(authErrorMessage({name:'AbortError'}),/초과/);assert.match(authErrorMessage({code:'42501'}),/권한/);
});
