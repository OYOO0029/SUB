// Local records remain private to the verified project/user. RLS protects the server.
export function createAccountData({storage, empty, validate}) {
 let owner=null;
 const legacyKey='myWeekPlanner_v5', ownerKey='myWeekSyncCacheOwner_v1';
 const key=id=>'myWeekPlanner_v5:account:'+id;
 const legacy=()=>storage.getItem('myWeekSyncDefaultsOnly_v1')==='true'?null:
   storage.getItem(legacyKey)||storage.getItem('myWeekPlanner_v1');
 // The retired project has different user IDs. Its device-local records may be
 // explicitly claimed once during the user-requested project migration.
 const canClaimLegacy=()=>{const previous=storage.getItem(ownerKey);return !previous||previous.startsWith('https://cmsakakecnlsqdbhvzuu.supabase.co|');};
 return {
  get owner(){return owner;},
  get storageKey(){return owner?key(owner):null;},
  activate(scope){
   if(!scope)throw Error('계정을 확인할 수 없습니다.');
   owner=scope;let raw=storage.getItem(key(scope));
   if(!raw&&storage.getItem(ownerKey)===scope&&legacy()){
    raw=JSON.stringify(validate(JSON.parse(legacy())));storage.setItem(key(scope),raw);
   }
   // Recover edits that had not reached the server before a reload/logout.
   const pending=JSON.parse(storage.getItem('myWeekSyncPending:'+scope)||'null');
   if(pending?.dirty)raw=JSON.stringify(validate(pending.state));
   const [project,id]=scope.split('|');
   const current=JSON.parse(storage.getItem('my-week.cloud.v1:'+project+':'+id)||'null');
   if(current?.pending)raw=JSON.stringify(validate(current.pending));
   return raw?validate(JSON.parse(raw)):empty();
  },
  deactivate(){owner=null;return empty();},
  raw(){return owner?storage.getItem(key(owner)):null;},
  write(value){if(!owner)throw Error('계정 · 동기화에서 먼저 로그인해 주세요.');storage.setItem(key(owner),JSON.stringify(validate(value)));},
  hasLegacy(){return !!owner&&canClaimLegacy()&&!!legacy();},
  importLegacy(){
   if(!this.hasLegacy())throw Error('가져올 이전 기록이 없습니다.');
   const value=validate(JSON.parse(legacy()));this.write(value);
   const previous=storage.getItem(ownerKey);if(previous)storage.setItem('myWeekSyncPreviousOwner_v1',previous);
   storage.setItem(ownerKey,owner);return value;
  },
  backupKeys(){return owner?storage.keys().filter(k=>k==='myWeekSyncPending:'+owner||k.startsWith('myWeekSyncBackup:'+owner+':')):[];}
 };
}
