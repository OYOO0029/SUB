// This slot shares the existing user-owned row without replacing the older app's state.
export const CLOUD_SLOT = 'myWeekV1';
const copy = x => JSON.parse(JSON.stringify(x));
const canonical = x => Array.isArray(x) ? x.map(canonical) : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map(k => [k, canonical(x[k])])) : x;
export const equalState = (a,b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
export function cloudValue(row, validate) {
 const value = row?.state?.[CLOUD_SLOT];
 if (!value) return null;
 if (value.schema !== 1 || typeof value.revision !== 'string') throw Error('서버 데이터 형식을 확인해 주세요.');
 validate(value.data); return copy(value);
}
export function withCloudValue(row, value) {
 const root = row ? copy(row.state) : {schemaVersion:8,tx:[],settlements:[],budgets:{},purposeBudgets:{},prepaid:{},categories:[]};
 if (!root || typeof root !== 'object' || Array.isArray(root)) throw Error('기존 서버 데이터를 보호하기 위해 저장을 중지했습니다.');
 root[CLOUD_SLOT] = copy(value); return root;
}
export class CloudSync {
 constructor({api,bridge,storage,key,status}) {
  Object.assign(this,{api,bridge,storage,key,status}); this.active=true;this.chain=Promise.resolve();this.timer=null;this.seq=0;this.meta=null;
  const raw=storage.getItem(key);if(raw){this.meta=JSON.parse(raw);if(this.meta?.base)bridge.validate(this.meta.base.data);if(this.meta?.pending)bridge.validate(this.meta.pending);}
 }
 stop(){this.active=false;clearTimeout(this.timer);}
 checkpoint(){this.storage.setItem(this.key,JSON.stringify(this.meta));}
 backup(data,reason){this.storage.setItem(this.key+':backup:'+Date.now()+':'+crypto.randomUUID(),JSON.stringify({reason,at:new Date().toISOString(),data}));}
 queue(fn){this.chain=this.chain.then(()=>this.active?fn():undefined).catch(err=>{if(this.active)this.status('error',err.message||'서버 연결을 확인해 주세요.');});return this.chain;}
 changed(){if(!this.active)return;this.seq++;if(!this.meta?.linked){this.status('waiting','로그인 후 처음 사용할 데이터를 선택해 주세요.');return;}this.meta.pending=copy(this.bridge.read());this.checkpoint();this.status('saving','서버에 저장 중');clearTimeout(this.timer);this.timer=setTimeout(()=>this.reconcile(),500);}
 reconcile(){return this.queue(async()=>{
  if(!this.meta?.linked)return this.status('waiting','처음 연결할 데이터를 선택해 주세요.');
  if(this.meta.conflict)return this.status('conflict','다른 화면의 변경과 겹쳤습니다. 데이터를 선택해 주세요.');
  const seq=this.seq,row=await this.api.read();if(!this.active||seq!==this.seq)return;
  const remote=cloudValue(row,this.bridge.validate),pending=this.meta.pending;
  if(!remote){this.meta.conflict=true;this.checkpoint();return this.status('conflict','서버 공유 데이터가 없습니다. 현재 기록을 백업한 뒤 다시 연결해 주세요.');}
  if(pending){
   if(equalState(remote.data,pending)){this.meta={linked:true,base:remote,pending:null};this.checkpoint();return this.status('online','동기화됨');}
   if(!this.meta.base||!equalState(remote.data,this.meta.base.data)){this.meta.conflict=true;this.backup(pending,'conflict-local');this.checkpoint();return this.status('conflict','다른 화면에서도 수정했습니다. 자동 덮어쓰기를 멈췄습니다.');}
   return this.push(row,pending,seq);
  }
  if(this.bridge.busy())return this.status('waiting','입력 중인 화면을 닫으면 최신 내용을 반영합니다.');
  if(!equalState(remote.data,this.bridge.read())){this.backup(this.bridge.read(),'before-pull');this.bridge.apply(remote.data);}
  this.meta={linked:true,base:remote,pending:null};this.checkpoint();this.status('online','동기화됨');
 });}
 async push(row,data,seq){
  const value={schema:1,revision:crypto.randomUUID(),data:copy(this.bridge.validate(data))};
  const result=await this.api.write(withCloudValue(row,value),row?.updated_at);
  if(!this.active)return;
  if(!result){this.status('waiting','다른 화면의 저장을 확인하고 다시 동기화합니다.');clearTimeout(this.timer);this.timer=setTimeout(()=>this.reconcile(),1000);return;}
  this.meta={linked:true,base:value,pending:seq===this.seq?null:copy(this.bridge.read())};this.checkpoint();this.status(this.meta.pending?'saving':'online',this.meta.pending?'서버에 저장 중':'동기화됨');if(this.meta.pending)this.reconcile();
 }
 choose(direction){return this.queue(async()=>{
  if(this.bridge.busy())throw Error('입력 중인 화면을 닫아 주세요.');
  const seq=this.seq,local=copy(this.bridge.read()),row=await this.api.read();if(!this.active)return;
  if(seq!==this.seq||this.bridge.busy())throw Error('내용이 변경되었습니다. 다시 선택해 주세요.');
  const remote=cloudValue(row,this.bridge.validate);this.backup(local,'before-connect');if(this.meta?.pending)this.backup(this.meta.pending,'pending-before-connect');
  if(direction==='pull'){
   if(!remote)throw Error('현재 일정의 공유 데이터가 아직 없습니다. 기록이 있는 사이트에서 먼저 현재 데이터로 연결해 주세요.');
   this.bridge.apply(remote.data);this.meta={linked:true,base:remote,pending:null};this.checkpoint();this.status('online','동기화됨');
  }else{
   if(remote)this.backup(remote.data,'server-before-replace');
   this.meta={linked:true,base:remote,pending:local};this.checkpoint();await this.push(row,local,seq);
  }
 });}
}
