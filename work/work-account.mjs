import {persistValue} from '../schedule-storage.mjs?v=20261028-data-safety-1';
const copy=value=>structuredClone(value);
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
export const emptyWorkState=()=>({schemaVersion:1,projects:[],works:[],tasks:[],personal:[],tracker:{},taskStatuses:[],workStages:[],dailyOrder:{}});
export function workOnly(value,validate){const state=copy(validate(value));state.personal=[];state.tracker={};return state;}
export function mergeWorkData(current,incoming,validate){
 const next=workOnly(current,validate),source=workOnly(incoming,validate);
 for(const field of ['projects','works','tasks','taskStatuses']){
  next[field]??=[];
  for(const item of source[field]||[]){const found=next[field].find(x=>x.id===item.id);if(found&&!same(found,item))throw Error('같은 항목의 내용이 다릅니다. 현재 업무를 백업하고 가져올 기록을 확인해 주세요.');if(!found)next[field].push(copy(item));}
 }
 next.workStages=[...new Set([...(next.workStages||[]),...(source.workStages||[])])];next.dailyOrder??={};
 for(const [date,ids] of Object.entries(source.dailyOrder||{})){if(next.dailyOrder[date]&&!same(next.dailyOrder[date],ids))throw Error('같은 날짜의 수동 순서가 다릅니다. 기록을 확인해 주세요.');next.dailyOrder[date]=copy(ids);}
 if(source.todayOrder){if(next.todayOrder&&!same(next.todayOrder,source.todayOrder))throw Error('오늘 목록의 수동 순서가 다릅니다. 기록을 확인해 주세요.');next.todayOrder=copy(source.todayOrder);}
 return validate(next);
}
export function createWorkAccount({storage,validate}){
 let owner=null;
 const prefix='what-to-do:work:v1:account:',stagingKey='what-to-do:work:pending-import:v1';
 const normalize=value=>workOnly(value,validate);
 return {
  get owner(){return owner;},get storageKey(){return owner?prefix+owner:null;},
  deactivate(){owner=null;return emptyWorkState();},
  activate(scope){
   if(!scope)throw Error('계정을 확인해 주세요.');owner=scope;
   const [project,id]=scope.split('|'),meta=JSON.parse(storage.getItem('my-work.cloud.v1:'+project+':'+id)||'null');
   const raw=storage.getItem(prefix+scope);return raw?normalize(JSON.parse(raw)):meta?.pending?normalize(meta.pending):emptyWorkState();
  },
  raw(){return owner?storage.getItem(prefix+owner):null;},
  write(value){
   if(!owner)throw Error('기존 개인 일정과 같은 계정으로 로그인해 주세요.');
   const next=normalize(value),key=prefix+owner,old=storage.getItem(key);if(old)persistValue(storage,key+':previous',old);persistValue(storage,key,JSON.stringify(next));return next;
  },
  stage(value){const next={savedAt:new Date().toISOString(),state:normalize(value),owner:null},old=storage.getItem(stagingKey);if(old)storage.setItem(stagingKey+':previous',old);storage.setItem(stagingKey,JSON.stringify(next));return next;},
  staged(){const raw=storage.getItem(stagingKey);if(!raw)return null;const item=JSON.parse(raw);item.state=normalize(item.state);return item;},
  claim(){const item=this.staged();if(!owner)throw Error('먼저 로그인해 주세요.');if(!item)throw Error('가져올 파일을 먼저 선택해 주세요.');if(item.owner&&item.owner!==owner)throw Error('이 파일은 다른 계정에서 가져오기를 시작했습니다. 해당 계정으로 로그인해 주세요.');item.owner=owner;storage.setItem(stagingKey,JSON.stringify(item));return item.state;},
  finish(){const item=this.staged();if(!item||item.owner!==owner)throw Error('계정이 변경되었습니다. 원본을 보존했습니다.');storage.setItem(prefix+owner+':import-backup:'+Date.now(),JSON.stringify(item));storage.removeItem(stagingKey);}
 };
}
