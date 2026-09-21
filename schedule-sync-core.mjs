export const clone=value=>JSON.parse(JSON.stringify(value));
export const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function validateState(s){
 const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
 if(!object(s)||s.version!==5||!object(s.workConfig)||!Array.isArray(s.workConfig.weekdays)||typeof s.workConfig.label!=='string'||typeof s.workConfig.start!=='string'||typeof s.workConfig.end!=='string')throw Error('서버 일정 형식이 올바르지 않습니다.');
 for(const key of ['workExceptions','workOverrides','trackerLogs','sleepLogs'])if(!object(s[key]))throw Error('일정 데이터 누락: '+key);
 for(const key of ['categories','trackerDefs','events'])if(!Array.isArray(s[key]))throw Error('일정 데이터 누락: '+key);
 for(const e of s.events)if(!object(e)||typeof e.id!=='string'||typeof e.title!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(e.startDate)||!object(e.recurrence)||!Array.isArray(e.exdates))throw Error('일정 항목 형식 오류');
 for(const c of [...s.categories,...s.trackerDefs])if(!object(c)||typeof c.id!=='string'||typeof c.name!=='string')throw Error('카테고리/트래커 형식 오류');
 return clone(s);
}
export function notionContext(frame,referrer,ancestors=[]){
 if(!frame)return false;
 return [referrer,...ancestors].some(value=>{try{const h=new URL(value).hostname;return ['notion.so','notion.com','notion.site'].some(domain=>h===domain||h.endsWith('.'+domain))}catch{return false}});
}
// All remote operations are serialized. Conditional updates prevent stale automatic writes.
export class SyncEngine{
 constructor({api,bridge,storage,scope,notion,status=()=>{}}){Object.assign(this,{api,bridge,storage,scope,notion,status});this.active=true;this.ready=false;this.conflict=false;this.base=null;this.dirty=false;this.sequence=0;this.chain=Promise.resolve();this.timer=null;
  this.metaKey='myWeekSyncPending:'+scope;
  try{const m=JSON.parse(storage.getItem(this.metaKey)||'null');if(m?.dirty){this.pending=validateState(m.state);this.base=m.base;this.dirty=true;this.sequence++;if(!same(this.pending,bridge.read()))this.conflict=true}}catch{this.conflict=true;status('error','오류','미전송 기록을 읽지 못했습니다. 백업 후 확인하세요.')}
 }
 stop(){this.active=false;clearTimeout(this.timer)}
 enqueue(fn){this.chain=this.chain.then(()=>this.active?fn():undefined).catch(e=>{if(this.active)this.status('error','오류',e.message||'연결 실패. 로컬 일정은 유지됩니다.')});return this.chain}
 checkpoint(){if(this.dirty)this.storage.setItem(this.metaKey,JSON.stringify({dirty:true,base:this.base,state:this.pending}));else this.storage.removeItem(this.metaKey)}
 backup(state,reason){validateState(state);const key='myWeekSyncBackup:'+this.scope+':'+Date.now()+':'+Math.random().toString(36).slice(2);this.storage.setItem(key,JSON.stringify({savedAt:new Date().toISOString(),reason,state}));return key}
 localChanged(){if(!this.active)return;this.pending=validateState(this.bridge.read());this.dirty=true;this.sequence++;try{this.checkpoint()}catch(e){this.conflict=true;this.status('error','오류','미전송 백업 저장 실패. JSON을 내보내 주세요.');return}clearTimeout(this.timer);this.status('syncing','동기화 중','이 기기에 저장했습니다. 서버 연결을 확인합니다.');this.timer=setTimeout(()=>this.reconcile(),500)}
 reconcile(){return this.enqueue(()=>this.check())}
 async check(){
  const sequence=this.sequence,row=await this.api.read();if(!this.active)return;
  if(!row){this.ready=false;if(this.conflict)return;
   if(this.base||!this.notion||!this.bridge.originalCache){this.status('waiting','초기화 필요','서버에 아직 데이터가 없습니다. 최신 데이터가 Notion에 있다면 Notion 안에서 먼저 동기화를 진행해 주세요.');return}
   if(this.bridge.busy()){this.status('waiting','반영 대기','작성 중인 창을 닫으면 최초 동기화를 진행합니다.');return}
   let original;try{original=validateState(JSON.parse(this.bridge.originalCache))}catch{throw Error('기존 Notion 캐시 형식을 확인할 수 없습니다. JSON 백업 후 수동 업로드하세요.')}
   this.backup(original,'notion-original-cache');
   const state=validateState(this.sequence===0?original:this.bridge.read());this.backup(state,'before-notion-seed');
   const result=await this.api.insert(state);if(!this.active)return;
   if(!result){this.conflict=true;this.status('error','확인 필요','다른 화면이 먼저 서버를 초기화했습니다. 로컬 백업을 보존했습니다. 서버 불러오기로 확인하세요.');return}
   this.base=result.updated_at;this.ready=true;
   if(sequence===this.sequence){this.dirty=false;this.pending=null}else this.dirty=true;
   this.checkpoint();this.status('online','동기화됨','Notion 일정을 최초 서버 데이터로 저장했습니다.');if(this.dirty)this.reconcile();return;
  }
  validateState(row.state);
  if(this.conflict){this.status('error','확인 필요','로컬 변경과 서버 변경이 겹칩니다. 백업 후 불러오기 또는 수동 업로드를 선택하세요.');return}
  if(this.dirty){
   if(same(row.state,this.pending)){this.base=row.updated_at;this.ready=true;this.dirty=false;this.pending=null;this.checkpoint();this.status('online','동기화됨','서버와 동일합니다.');return}
   if(!this.base||this.base!==row.updated_at){this.backup(this.pending,'conflict-local');this.conflict=true;this.status('error','확인 필요','다른 기기도 변경되었습니다. 이 기기의 변경은 백업에 보존했고 자동 덮어쓰기를 중지했습니다.');return}
   return this.push(row);
  }
  if(sequence!==this.sequence)return;
  if(this.bridge.busy()){this.status('waiting','반영 대기','작성 중인 내용은 유지합니다. 창을 닫으면 서버 변경을 반영합니다.');return}
  if(!same(row.state,this.bridge.read())){this.backup(this.bridge.read(),'before-server-load');this.bridge.apply(validateState(row.state))}
  this.base=row.updated_at;this.ready=true;this.checkpoint();this.status('online','동기화됨','서버 최신 일정이 반영되었습니다.');
 }
 async push(row){
  if(!this.active||!this.dirty)return;const sequence=this.sequence,state=validateState(this.pending);this.status('syncing','동기화 중','서버에 저장합니다.');
  const result=await this.api.update(state,row.updated_at);if(!this.active)return;
  if(!result){this.backup(state,'write-conflict');this.conflict=true;this.status('error','확인 필요','저장 직전 다른 기기가 변경했습니다. 자동 덮어쓰기를 중지했습니다.');return}
  this.base=result.updated_at;this.ready=true;
  if(sequence===this.sequence){this.dirty=false;this.pending=null}this.checkpoint();
  this.status(this.dirty?'syncing':'online',this.dirty?'동기화 중':'동기화됨','변경사항을 서버에 저장했습니다.');if(this.dirty)this.reconcile();
 }
 pull(){return this.enqueue(async()=>{const sequence=this.sequence,row=await this.api.read();if(!this.active)return;if(!row)throw Error('서버에 데이터가 없습니다. Notion에서 먼저 동기화하세요.');validateState(row.state);if(sequence!==this.sequence||this.bridge.busy())throw Error('편집을 마친 뒤 다시 불러와 주세요.');this.backup(this.bridge.read(),'manual-pull-local');if(this.pending)this.backup(this.pending,'manual-pull-pending');this.bridge.apply(row.state);this.base=row.updated_at;this.ready=true;this.conflict=false;this.dirty=false;this.pending=null;this.checkpoint();this.status('online','동기화됨','서버 데이터를 불러왔습니다. 이전 내용은 백업에 보관했습니다.')})}
 upload(){return this.enqueue(async()=>{if(this.bridge.busy())throw Error('편집창을 닫고 업로드하세요.');const sequence=this.sequence,state=validateState(this.bridge.read());this.backup(state,'manual-upload-local');const row=await this.api.read();if(!this.active)return;if(sequence!==this.sequence)throw Error('업로드 준비 중 일정이 바뀌었습니다. 다시 시도하세요.');if(row)this.backup(row.state,'manual-upload-server');const result=row?await this.api.update(state,row.updated_at):await this.api.insert(state);if(!this.active)return;if(!result)throw Error('동시에 다른 기기가 저장했습니다. 서버를 확인한 뒤 다시 시도하세요.');this.base=result.updated_at;this.ready=true;this.conflict=false;if(sequence===this.sequence){this.dirty=false;this.pending=null}this.checkpoint();this.status('online','동기화됨','명시적으로 선택한 이 기기 데이터를 서버에 저장했습니다.');if(this.dirty)this.reconcile()})}
}
