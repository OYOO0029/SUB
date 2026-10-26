// Only routine, already-synced before-pull snapshots rotate. Conflict/import
// recovery copies and pending journals are never retention candidates.
export const ROUTINE_BACKUP_LIMIT=5;
export const ROUTINE_BACKUP_BYTES=512*1024;
export function backupEntries(storage,key){return (storage.keys?.()||[]).filter(k=>k.startsWith(key+':backup:')).flatMap(k=>{try{const raw=storage.getItem(k),value=JSON.parse(raw);if(!value||typeof value.reason!=='string'||!('data' in value))return [];return [{key:k,value,bytes:(k.length+raw.length)*2}];}catch{return [];}});}
export function writeBackup(storage,key,data,reason){
 const entries=backupEntries(storage,key),body=JSON.stringify(data);
 if(entries.some(e=>e.value.reason===reason&&JSON.stringify(e.value.data)===body))return;
 const routine=reason==='before-pull';
 // Large routine copies do not evict recovery data or disable persistence.
 if(routine&&body.length*2>ROUTINE_BACKUP_BYTES)return;
 const value=JSON.stringify({reason,at:new Date().toISOString(),data}),target=key+':backup:'+Date.now()+':'+crypto.randomUUID();
 if(routine&&(target.length+value.length)*2>ROUTINE_BACKUP_BYTES)return;
 if(routine){const candidates=entries.filter(e=>e.value.reason==='before-pull').sort((a,b)=>String(a.value.at).localeCompare(String(b.value.at)));let bytes=(target.length+value.length)*2+candidates.reduce((n,e)=>n+e.bytes,0);while(candidates.length&&(candidates.length>=ROUTINE_BACKUP_LIMIT||bytes>ROUTINE_BACKUP_BYTES)){const old=candidates.shift();storage.removeItem(old.key);bytes-=old.bytes;}}
 storage.setItem(target,value);
}
export function backupUsage(storage,key){const entries=backupEntries(storage,key);return {count:entries.length,bytes:entries.reduce((n,e)=>n+e.bytes,0),protectedCount:entries.filter(e=>e.value.reason!=='before-pull').length};}
