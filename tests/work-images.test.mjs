import test from 'node:test';
import assert from 'node:assert/strict';
import {createImageStore,migrateInlineImages} from '../work/image-store.mjs';
import {createItem,changeCheck,updateMemo} from '../work/editing.js';
import {emptyWorkState} from '../work/work-account.mjs';
import {validate} from '../work/repository.js';
import {writeBackup,backupEntries,backupUsage,ROUTINE_BACKUP_BYTES} from '../schedule-backups.mjs';

function fixture(){let scope='https://fixture|owner';const files=new Map(),revoked=[];const store=createImageStore({getScope:()=>scope,getFiles:()=>({async upload(path,blob){files.set(path,blob)},async download(path){return files.get(path)}}),makeURL:()=>`blob:fixture-${files.size}`,revokeURL:url=>revoked.push(url)});return {store,files,revoked,setScope:value=>scope=value};}
test('images persist private references, portable backups embed bytes, account switches isolate cache',async()=>{
 const f=fixture(),blob=new Blob(['image fixture'],{type:'image/png'}),ref=await f.store.upload(blob);
 const data=emptyWorkState(),task=createItem(data,'task','memo');updateMemo(data,task.id,[{text:'before'},{asset:ref},{text:'after'}]);validate(data);
 assert(!JSON.stringify(data).includes('blob:'));assert(!JSON.stringify(data).includes('base64'));
 const portable=await f.store.portable(data);assert.equal(portable.tasks[0].memoParts[1].image,'data:image/png;base64,aW1hZ2UgZml4dHVyZQ==');assert(data.tasks[0].memoParts[1].asset);
 f.setScope('https://fixture|other');await assert.rejects(f.store.url(ref),/현재 계정/);assert.equal(f.revoked.length,1);
});
test('upload failures, mismatched download and account change never yield a saved reference',async()=>{
 let owner='url|owner';const blob=new Blob(['x'],{type:'image/png'});
 const store=createImageStore({getScope:()=>owner,getFiles:()=>({async upload(){owner='url|other'},async download(){throw Error('should not download')}})});
 await assert.rejects(store.upload(blob),/계정이 변경/);
 const broken=createImageStore({getScope:()=>owner,getFiles:()=>({async upload(){},async download(){return new Blob(['wrong'],{type:'image/png'})}})});
 await assert.rejects(broken.upload(blob),/확인하지 못/);
 await assert.rejects(broken.upload(new Blob(['x'],{type:'image/svg+xml'})),/2MB/);
});
test('image migration preserves newer edits and keeps originals when upload fails',async()=>{
 const data=emptyWorkState(),task=createItem(data,'task','memo');updateMemo(data,task.id,[{image:'data:image/png;base64,eA=='}]);const original=structuredClone(task.memoParts);
 const f=fixture();let saves=0;
 await assert.rejects(migrateInlineImages({getData:()=>data,getScope:()=> 'owner',store:{async migrateTask(){throw Error('offline')}},apply(){assert.fail()},save(){assert.fail()}}),/offline/);assert.deepEqual(task.memoParts,original);
 const result=await migrateInlineImages({getData:()=>data,getScope:()=> 'owner',store:{async migrateTask(t){task.notes='new text';return f.store.migrateTask(t)}},apply(){assert.fail()},save(){assert.fail()}});assert.equal(result.skipped,1);assert.deepEqual(task.memoParts,original);
 const done=await migrateInlineImages({getData:()=>data,getScope:()=> 'owner',store:f.store,apply:(t,p)=>t.memoParts=p,save:()=>{saves++}});assert.equal(done.migrated,1);assert.equal(saves,1);assert.equal(task.notes,'new text');assert(task.memoParts[0].asset);
});
test('portable text backups remain available offline and unavailable assets fail explicitly',async()=>{
 const data=emptyWorkState();createItem(data,'task','offline');const store=createImageStore({getScope:()=>null,getFiles:()=>null});assert.deepEqual(await store.portable(data),data);
 data.tasks[0].memoParts=[{asset:{bucket:'work-images',path:'owner/a.png',mime:'image/png',size:1}}];await assert.rejects(store.portable(data),/로그인/);
});
test('shared checklist commands validate atomically and preserve identity through trash and restore',()=>{
 const data=emptyWorkState(),t=createItem(data,'task','check');const check=changeCheck(data,t.id,null,{title:'first'});changeCheck(data,t.id,check.id,{done:true});const before=structuredClone(data);assert.throws(()=>changeCheck(data,t.id,check.id,{title:' '}));assert.deepEqual(data,before);
 changeCheck(data,t.id,check.id,{deletedAt:new Date().toISOString()});changeCheck(data,t.id,check.id,{deletedAt:null});assert.equal(t.checks[0].id,check.id);assert(t.checks[0].done);
 assert.throws(()=>updateMemo(data,t.id,[{asset:{bucket:'public',path:'other/x.svg'}}]));assert.equal(t.memoParts,undefined);
});
test('routine backups cap count and bytes, deduplicate, preserve recovery and other account journals',()=>{
 const map=new Map(),storage={keys:()=>[...map.keys()],getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
 map.set('owner:backup:corrupt','null');map.set('owner:pending','pending');map.set('other:backup:keep','other');writeBackup(storage,'owner',{value:'protected'},'before-image-migration');writeBackup(storage,'owner',{value:'protected'},'before-image-migration');
 for(let i=0;i<12;i++)writeBackup(storage,'owner',{value:i},'before-pull');assert.equal(backupEntries(storage,'owner').length,6);assert.equal(backupUsage(storage,'owner').protectedCount,1);
 for(let i=0;i<8;i++)writeBackup(storage,'owner',{value:i,text:'x'.repeat(80000)},'before-pull');const routine=backupEntries(storage,'owner').filter(x=>x.value.reason==='before-pull');assert(routine.reduce((s,x)=>s+x.bytes,0)<=ROUTINE_BACKUP_BYTES);
 writeBackup(storage,'owner',{text:'x'.repeat(ROUTINE_BACKUP_BYTES)},'before-pull');assert.equal(map.get('owner:pending'),'pending');assert.equal(map.get('other:backup:keep'),'other');assert.equal(backupUsage(storage,'owner').protectedCount,1);
});
