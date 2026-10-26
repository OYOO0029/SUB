import test from 'node:test';
import assert from 'node:assert/strict';
import {CloudSync,CLOUD_SLOT,cloudValue} from '../schedule-cloud-core.mjs';
import {validateState} from '../schedule-sync-core.mjs';
const initialState=()=>({version:5,workConfig:{weekdays:[],label:'회사',start:'09:00',end:'18:00'},workExceptions:{},workOverrides:{},categories:[],trackerDefs:[],trackerLogs:{},sleepLogs:{},events:[],budgets:{}});
const cp=x=>structuredClone(x);
function db(){let row={state:{tx:[{id:123,item:'legacy'}],legacy:'preserved'},updated_at:'1'},writes=0;return{get row(){return cp(row)},set row(v){row=cp(v)},get writes(){return writes},api:{read:async()=>cp(row),write:async(state,stamp)=>{if(stamp!==row?.updated_at)return null;row={state:cp(state),updated_at:String(++writes+1)};return cp(row);}}};}
function screen(server){let local=initialState(),busy=false;const map=new Map(),statuses=[];const bridge={read:()=>cp(local),validate:validateState,apply:x=>local=cp(x),busy:()=>busy};const storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};const sync=new CloudSync({api:server.api,bridge,storage,key:'test',status:(...v)=>statuses.push(v)});return {sync,map,statuses,get data(){return local},set data(v){local=v},busy:v=>busy=v,edit:n=>{local.budgets['2026-10']={total:n,allocations:{}};sync.changed();clearTimeout(sync.timer);}};}
test('explicit first connection preserves legacy state and shares across two clients',async()=>{const d=db(),a=screen(d),b=screen(d);await a.sync.reconcile();assert.equal(d.writes,0);a.data.budgets['2026-10']={total:500000,allocations:{}};await a.sync.choose('push');assert.deepEqual(d.row.state.tx,[{id:123,item:'legacy'}]);await b.sync.choose('pull');assert.equal(b.data.budgets['2026-10'].total,500000);a.edit(600000);await a.sync.reconcile();await b.sync.reconcile();assert.equal(b.data.budgets['2026-10'].total,600000);b.edit(700000);await b.sync.reconcile();await a.sync.reconcile();assert.equal(a.data.budgets['2026-10'].total,700000);});
test('simultaneous edits stop automatic overwrite and retain pending backup',async()=>{const d=db(),a=screen(d),b=screen(d);await a.sync.choose('push');await b.sync.choose('pull');a.edit(1);b.edit(2);await a.sync.reconcile();await b.sync.reconcile();assert.equal(b.sync.meta.conflict,true);assert.equal(cloudValue(d.row,validateState).data.budgets['2026-10'].total,1);assert.equal(b.sync.meta.pending.budgets['2026-10'].total,2);assert.ok([...b.map.keys()].some(k=>k.includes('backup')));});
test('network failure keeps pending edits and retries after reconnect',async()=>{const d=db(),a=screen(d);await a.sync.choose('push');a.edit(42);const read=d.api.read;d.api.read=async()=>{throw Error('offline')};await a.sync.reconcile();assert.equal(a.sync.meta.pending.budgets['2026-10'].total,42);d.api.read=read;await a.sync.reconcile();assert.equal(a.sync.meta.pending,null);assert.equal(cloudValue(d.row,validateState).data.budgets['2026-10'].total,42);});
test('edits during a server write are retained for the next write',async()=>{const d=db(),a=screen(d);await a.sync.choose('push');a.edit(1);const write=d.api.write;let release;d.api.write=async(...args)=>{await new Promise(r=>release=r);return write(...args)};const pending=a.sync.reconcile();await new Promise(r=>setTimeout(r,0));a.edit(2);d.api.write=write;release();await pending;await a.sync.chain;assert.equal(cloudValue(d.row,validateState).data.budgets['2026-10'].total,2);a.sync.stop();});
test('editing form defers incoming data; legacy root updates remain untouched',async()=>{const d=db(),a=screen(d),b=screen(d);await a.sync.choose('push');await b.sync.choose('pull');a.edit(5);await a.sync.reconcile();b.busy(true);await b.sync.reconcile();assert.equal(b.data.budgets['2026-10'],undefined);b.busy(false);await b.sync.reconcile();assert.equal(b.data.budgets['2026-10'].total,5);const row=d.row;row.state.legacy='changed';row.updated_at='999';d.row=row;b.edit(6);await b.sync.reconcile();assert.equal(d.row.state.legacy,'changed');});
test('invalid or removed shared state never overwrites local records',async()=>{const d=db(),a=screen(d);await a.sync.choose('push');const row=d.row;delete row.state[CLOUD_SLOT];d.row=row;await a.sync.reconcile();assert.equal(a.sync.meta.conflict,true);assert.equal(d.writes,1);});

test('another tab cannot clear a tracker checkpoint before its upload or reload',async()=>{
 const d=db(),a=screen(d),b=screen(d);await a.sync.choose('push');await b.sync.choose('pull');
 // Same-origin tabs share the account journal even though each has its own UI state.
 b.sync.storage=a.sync.storage;
 a.data.trackerLogs['2026-10-26']={coffee:true};a.sync.changed();clearTimeout(a.sync.timer);
 await b.sync.reconcile();
 const journal=JSON.parse(a.map.get('test'));
 assert.equal(journal.pending?.trackerLogs['2026-10-26']?.coffee,true);
 const restored=new CloudSync({api:d.api,bridge:a.sync.bridge,storage:a.sync.storage,key:'test',status(){}});
 await restored.reconcile();assert.equal(cloudValue(d.row,validateState).data.trackerLogs['2026-10-26'].coffee,true);
 a.sync.stop();b.sync.stop();restored.stop();
});

test('shared-journal edits during a remote read are not replaced by its stale response',async()=>{
 const d=db(),a=screen(d),b=screen(d);await a.sync.choose('push');await b.sync.choose('pull');b.sync.storage=a.sync.storage;
 const read=d.api.read;let release;d.api.read=()=>new Promise(r=>release=r);
 const pull=b.sync.reconcile();await new Promise(r=>setTimeout(r,0));
 a.data.trackerLogs['2026-10-26']={coffee:true};a.sync.changed();clearTimeout(a.sync.timer);
 release(await read());await pull;
 assert.equal(JSON.parse(a.map.get('test')).pending.trackerLogs['2026-10-26'].coffee,true);
 a.sync.stop();b.sync.stop();
});

test('simultaneous same-browser edits keep both recoverable versions',async()=>{
 const d=db(),a=screen(d),b=screen(d);await a.sync.choose('push');await b.sync.choose('pull');b.sync.storage=a.sync.storage;
 a.data.trackerLogs['2026-10-26']={coffee:true};a.sync.changed();clearTimeout(a.sync.timer);
 b.data.trackerLogs['2026-10-26']={bell:true};b.sync.changed();clearTimeout(b.sync.timer);
 assert.equal(b.sync.meta.conflict,true);
 assert.equal(JSON.parse(a.map.get('test')).pending.trackerLogs['2026-10-26'].coffee,true);
 const backups=[...a.map.entries()].filter(([k])=>k.includes(':backup:')).map(([,v])=>JSON.parse(v));
 assert(backups.some(v=>v.reason==='same-browser-local'&&v.data.trackerLogs['2026-10-26'].bell));
 assert(backups.some(v=>v.reason==='same-browser-other-tab'&&v.data.trackerLogs['2026-10-26'].coffee));
 b.data.trackerLogs['2026-10-27']={bell:true};b.sync.changed();
 assert([...a.map.entries()].filter(([k])=>k.includes(':backup:')).some(([,v])=>JSON.parse(v).data.trackerLogs['2026-10-27']?.bell));
 a.sync.stop();b.sync.stop();
});
