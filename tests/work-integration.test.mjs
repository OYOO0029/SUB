import test from 'node:test';
import assert from 'node:assert/strict';
import {CloudSync,cloudValue} from '../schedule-cloud-core.mjs';
import {createWorkAccount,emptyWorkState,mergeWorkData} from '../work/work-account.mjs';
import {validate} from '../work/repository.js';
import {preserveAppSlots} from '../shared-row.mjs';
const cp=value=>structuredClone(value);
function memory(){const map=new Map();return{map,persistent:true,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k),keys:()=>[...map.keys()]};}
function data(title='Task'){
 const state=emptyWorkState();state.projects=[{id:'p',title:'Project',stage:'진행중',stages:['진행중'],tags:[],notes:'',start:'',end:'',people:['Person']}];
 state.works=[{id:'w',title:'Work',projectId:'p',stage:'진행중',tags:[],notes:'',due:'',people:['Person']}];
 state.tasks=[{id:'t',title,workId:'w',projectId:'p',status:'todo',plans:[{id:'plan',start:'2026-10-15',end:'2026-10-16',state:'active'}],blocks:[{id:'b',date:'2026-10-15',start:'10:00',end:'10:30'}],checks:[{id:'c',title:'Check',done:true,deletedAt:'2026-10-14'}],tags:['tag'],notes:'memo',due:'2026-10-16',remindFrom:'2026-10-15',people:['Person'],reminderAcknowledgedOn:'2026-10-15',deletedAt:null}];state.dailyOrder={'2026-10-15':['t']};return state;
}
function db(){let revision=1,row={state:{tx:[{id:1}],myWeekV1:{schema:1,revision:'personal',data:{events:['keep']}},mySpendingV1:{schema:1,revision:'finance',data:{records:['keep']}}},updated_at:'1'},writes=0;return{get row(){return cp(row)},set row(v){row=cp(v)},get writes(){return writes},api:{read:async()=>cp(row),write:async(state,stamp)=>{if(stamp!==row?.updated_at)return null;writes++;row={state:cp(state),updated_at:String(++revision)};return cp(row);}}};}
function screen(server,initial=emptyWorkState(),storage=memory(),slot='myWorkV1'){
 let local=cp(initial),busy=false;const states=[];const bridge={read:()=>cp(local),validate:slot==='myWorkV1'?validate:x=>x,apply:v=>local=cp(v),busy:()=>busy};
 const sync=new CloudSync({api:server.api,bridge,storage,key:'test:'+slot,slot,status:(...args)=>states.push(args)});
 return{sync,storage,states,get data(){return cp(local)},set data(v){local=cp(v)},busy:v=>busy=v,edit(title){local.tasks[0].title=title;sync.changed();clearTimeout(sync.timer);}};
}
test('work import preserves personal and finance snapshots, relationships and trash; repeat is idempotent',async()=>{
 const server=db(),before=server.row.state,a=screen(server),source=data();source.tasks[0].deletedAt='2026-10-15';source.personal=[{id:'demo',title:'Do not migrate',date:'2026-10-15',period:'am',time:''}];source.tracker={'2026-10-15-0':true};
 assert.equal(await a.sync.importData(source,(a,b)=>mergeWorkData(a,b,validate)),true);
 for(const key of Object.keys(before))assert.deepEqual(server.row.state[key],before[key]);
 assert.deepEqual(server.row.state.myWorkV1.data.tasks,source.tasks);assert.deepEqual(a.data.personal,[]);assert.deepEqual(a.data.tracker,{});
 const writes=server.writes;assert.equal(await a.sync.importData(source,(a,b)=>mergeWorkData(a,b,validate)),true);assert.equal(server.writes,writes);
});
test('first work initialization retries an unrelated personal write without replacing either slot',async()=>{
 const server=db(),a=screen(server,data()),write=server.api.write;let once=true;
 server.api.write=async(state,stamp)=>{if(once){once=false;const row=server.row;row.state.myWeekV1.data.events.push('new');row.updated_at='race';server.row=row;return null;}return write(state,stamp);};
 await a.sync.choose('push');clearTimeout(a.sync.timer);await a.sync.reconcile();assert.equal(a.sync.meta.pending,null);assert.equal(a.sync.meta.conflict,undefined);assert.deepEqual(server.row.state.myWeekV1.data.events,['keep','new']);assert.equal(server.row.state.myWorkV1.data.tasks[0].title,'Task');a.sync.stop();
});
test('two work clients converge while personal writes preserve work data',async()=>{
 const server=db(),a=screen(server,data()),b=screen(server),personal=screen(server,{},memory(),'myWeekV1');await a.sync.choose('push');await b.sync.choose('pull');await personal.sync.choose('pull');
 personal.data={events:['edited']};personal.sync.changed();clearTimeout(personal.sync.timer);a.edit('Updated work');await personal.sync.reconcile();await a.sync.reconcile();await b.sync.reconcile();assert.equal(b.data.tasks[0].title,'Updated work');assert.deepEqual(server.row.state.myWeekV1.data.events,['edited']);
});
test('conflicting work edits preserve pending changes and reject silent overwrite',async()=>{
 const server=db(),a=screen(server,data()),b=screen(server);await a.sync.choose('push');await b.sync.choose('pull');a.edit('A');b.edit('B');await a.sync.reconcile();await b.sync.reconcile();assert(b.sync.meta.conflict);assert.equal(b.sync.meta.pending.tasks[0].title,'B');assert.equal(server.row.state.myWorkV1.data.tasks[0].title,'A');
 assert.throws(()=>mergeWorkData(data('A'),data('B'),validate),/같은 항목/);
});
test('offline work survives reload and synchronizes to another client',async()=>{
 const server=db(),a=screen(server,data());await a.sync.choose('push');a.edit('Offline');const read=server.api.read;server.api.read=async()=>{throw Error('offline');};await a.sync.reconcile();a.sync.stop();const restored=screen(server,a.data,a.storage);server.api.read=read;await restored.sync.reconcile();const other=screen(server);await other.sync.choose('pull');assert.equal(other.data.tasks[0].title,'Offline');
});

test('a passive work tab preserves another tab pending memo before upload',async()=>{
 const server=db(),a=screen(server,data());await a.sync.choose('push');
 const b=screen(server,data(),a.storage);const next=a.data;next.tasks[0].notes='미전송 업무 메모';a.data=next;a.sync.changed();clearTimeout(a.sync.timer);
 await b.sync.reconcile();assert.equal(JSON.parse(a.storage.getItem('test:myWorkV1')).pending.tasks[0].notes,'미전송 업무 메모');
 a.sync.stop();const restored=screen(server,a.data,a.storage);await restored.sync.reconcile();
 assert.equal(server.row.state.myWorkV1.data.tasks[0].notes,'미전송 업무 메모');assert.deepEqual(server.row.state.myWeekV1.data.events,['keep']);b.sync.stop();restored.sync.stop();
});
test('account cache and pending import remain isolated and no empty account gets demo records',()=>{
 const storage=memory(),account=createWorkAccount({storage,validate});assert.deepEqual(account.activate('project|A').tasks,[]);account.write(data('A'));account.stage(data('Import'));account.claim();account.deactivate();assert.deepEqual(account.activate('project|B').tasks,[]);assert.throws(()=>account.claim(),/다른 계정/);assert.equal(account.activate('project|A').tasks[0].title,'A');assert.equal(account.claim().tasks[0].title,'Import');account.finish();assert.equal(account.staged(),null);assert([...storage.map.keys()].some(k=>k.includes('import-backup')));
});
test('account restores pending work even without local cache',()=>{
 const storage=memory(),account=createWorkAccount({storage,validate});storage.setItem('my-work.cloud.v1:project:A',JSON.stringify({linked:true,pending:data('Pending')}));assert.equal(account.activate('project|A').tasks[0].title,'Pending');account.deactivate();assert.throws(()=>account.write(data()),/로그인/);
});
test('late server response after logout never applies private work',async()=>{
 const server=db(),a=screen(server,data());await a.sync.choose('push');const b=screen(server);let release;server.api.read=()=>new Promise(r=>release=r);const pending=b.sync.choose('pull');await Promise.resolve();b.sync.stop();release(server.row);await pending;assert.deepEqual(b.data.tasks,[]);
});
test('finance uploads preserve remote application slots even with stale or absent local copies',()=>{
 const current=db().row.state,result=preserveAppSlots({tx:[{id:2}],myWeekV1:{bad:true},myWorkV1:{bad:true}},current);assert.deepEqual(result.myWeekV1,current.myWeekV1);assert.deepEqual(result.mySpendingV1,current.mySpendingV1);assert.equal(result.myWorkV1,undefined);assert.deepEqual(result.tx,[{id:2}]);
});
test('open input delays incoming updates and importing never overwrites unsent work',async()=>{
 const server=db(),a=screen(server,data()),b=screen(server);await a.sync.choose('push');await b.sync.choose('pull');a.edit('Remote');await a.sync.reconcile();b.busy(true);await b.sync.reconcile();assert.equal(b.data.tasks[0].title,'Task');b.busy(false);await b.sync.reconcile();assert.equal(b.data.tasks[0].title,'Remote');b.edit('Unsent');await b.sync.importData(data(),(a,b)=>mergeWorkData(a,b,validate));assert.equal(b.sync.meta.pending.tasks[0].title,'Unsent');assert.equal(server.row.state.myWorkV1.data.tasks[0].title,'Remote');
});
