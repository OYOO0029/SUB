import {createImageStore,configureWorkImages,workImages,hydrateWorkImages,migrateInlineImages} from './image-store.mjs';
import {startCloud} from '../schedule-cloud-ui.mjs?v=20261028-data-safety-1';
import {appStorage} from '../schedule-storage.mjs?v=20261028-data-safety-1';
import {workAccount,validate} from './repository.js?v=20261030-check-only-1';
import {mergeWorkData} from './work-account.mjs?v=20261030-explicit-schedule-1';

export function startWorkCloud({getData,replaceData,resetEditors,notify,download,save,hasUnsaved=()=>false,onStatus=()=>{}}){
 let importing=false,message='',cloud;
 const fileInput=document.createElement('input');fileInput.type='file';fileInput.accept='application/json,.json';fileInput.dataset.workFile='';fileInput.hidden=true;document.body.append(fileInput);
 const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const bridge={
  read:()=>structuredClone(getData()),validate,
  get storageKey(){return workAccount.storageKey;},
  setAccount(scope){workImages.clear();const empty=workAccount.deactivate();resetEditors();replaceData(empty);if(scope){try{replaceData(workAccount.activate(scope));}catch(error){replaceData(workAccount.deactivate());throw error;}}},
  apply(value){const next=workAccount.write(value);replaceData(next);},
  unsaved:hasUnsaved,
  busy:()=>hasUnsaved()||!!document.querySelector('#detail[open],#editor[open],#property-editor[open],[data-quick-task],[data-focus-add],[data-focus-plan-form],[data-focus-timer-form],[data-check-form]:not([hidden])')||document.body.classList.contains('task-dragging')||!!document.activeElement?.closest('[contenteditable=true]')||/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)&&!document.activeElement?.closest('#cloud-dialog'),
  isPristine:()=>!workAccount.raw(),hasLegacy:()=>false,
  export:async()=>download(JSON.stringify(await workImages.portable(getData()),null,2),'what-to-do-work-backup.json'),download
 };
 function paint(){
  if(cloud)onStatus(cloud.status,cloud.statusText);
  const box=document.getElementById('work-account-notice');if(!box)return;
  let staged;try{staged=workAccount.staged();}catch{message='가져올 파일을 읽지 못했습니다. 백업 파일을 다시 선택해 주세요.';}
  const account=cloud?.account,available=staged&&(!staged.owner||staged.owner===workAccount.owner);
  if(account&&!staged&&!message){box.replaceChildren();return;}
  const label=staged?`프로젝트 ${staged.state.projects.filter(x=>!x.deletedAt).length} · 업무 ${staged.state.works.filter(x=>!x.deletedAt).length} · 할 일 ${staged.state.tasks.filter(x=>!x.deletedAt).length}`:'개인 일정과 같은 계정으로 업무를 저장하고 이어서 사용하세요.';
  box.innerHTML=`<div class="work-notice-line"><p>${staged?'가져올 업무가 준비되었습니다.':account?'업무 가져오기':'계정 연결'}<small class="work-import-summary">${label}</small>${staged?`<small>${account?`<span class="work-import-account">${escape(account.email)}</span> 계정에 가져옵니다.`:'로그인 후 이 계정에 가져오기를 누르면 서버에 저장됩니다.'}</small>`:''}</p><div class="work-notice-actions">${!account?'<button class="small-button" data-action="cloud-open">로그인</button>':''}${account&&available?`<button class="small-button" data-work-import ${importing?'disabled':''}>${importing?'가져오는 중':'이 계정에 가져오기'}</button>`:''}<button class="small-button" data-choose-work-file>${staged?'다른 파일 선택':'업무 백업 가져오기'}</button></div></div>${message?`<p class="work-notice-error" role="status">${escape(message)}</p>`:''}`;
 }
 document.addEventListener('change',async event=>{
  if(!event.target.matches('[data-work-file]'))return;
  const file=event.target.files[0];if(!file)return;
  try{if(file.size>25*1024*1024)throw Error('25MB 이하의 업무 백업 파일을 선택해 주세요.');workAccount.stage(JSON.parse(await file.text()));message='이 브라우저에 원본을 보관했습니다. 개인 일정은 변경되지 않습니다.';}catch(error){message=error.message;}paint();
 });
 document.addEventListener('click',async event=>{
  if(event.target.closest('[data-choose-work-file]')){fileInput.value='';fileInput.click();return;}
  if(event.target.closest('[data-open-work-import]')){document.getElementById('editor')?.close();message='업무 백업 파일을 선택해 주세요.';paint();document.querySelector('[data-choose-work-file]')?.focus();return;}
  if(event.target.closest('[data-migrate-work-images]')){
   if(importing)return;importing=true;const control=event.target.closest('[data-migrate-work-images]');control.disabled=true;
   try{if(!getData().tasks.some(t=>t.memoParts?.some(p=>p.image))){notify('이전할 이미지가 없습니다.');return;}cloud.protect(getData(),'before-image-migration');const result=await migrateInlineImages({getData,getScope:()=>workAccount.owner,apply:(task,parts)=>{task.memoParts=parts;},save});notify(`이미지 이전 ${result.migrated}개 완료${result.skipped?' · 편집 중인 항목 '+result.skipped+'개 보존':''}`);}
   catch(error){notify(error.message);}finally{importing=false;control.disabled=false;}return;
  }
  if(!event.target.closest('[data-work-import]')||importing)return;
  importing=true;message='';paint();
  try{const value=workAccount.claim();for(const task of value.tasks)for(const part of task.memoParts||[])if(part.asset&&part.asset.path.split('/')[0]!==workAccount.owner.split('|').at(-1))throw Error('다른 계정의 이미지 참조입니다. 원래 계정에서 JSON 내보내기한 파일을 가져와 주세요.');const ok=await cloud.importData(value,(current,incoming)=>mergeWorkData(current,incoming,validate));
   if(ok){workAccount.finish();message='업무 데이터를 계정에 저장했습니다.';notify('업무 가져오기 완료');}else message='동기화 상태를 확인한 뒤 다시 가져오기를 눌러 주세요. 원본은 보관되어 있습니다.';
  }catch(error){message=error.message;}finally{importing=false;paint();}
 });
 window.addEventListener('my-week-render',paint);window.addEventListener('my-week-sync-status',paint);
 cloud=startCloud(bridge,{storage:appStorage,slot:'myWorkV1',namespace:'my-work',autoInitialize:false});
 configureWorkImages(createImageStore({getScope:()=>workAccount.owner,getFiles:()=>cloud.files}));
 window.addEventListener('my-week-render',()=>hydrateWorkImages());
 cloud.ready.then(paint);paint();return cloud;
}
