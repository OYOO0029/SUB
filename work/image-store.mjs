import {IMAGE_BUCKET,IMAGE_TYPES,MAX_IMAGE_BYTES,validImageRef,isInlineImage} from './image-schema.mjs';

export function createImageStore({getScope,getFiles,makeURL=blob=>URL.createObjectURL(blob),revokeURL=url=>URL.revokeObjectURL(url)}){
 const cache=new Map();let scope=null;
 function current(){const owner=getScope();if(owner!==scope){for(const entry of cache.values())if(entry.url)revokeURL(entry.url);cache.clear();scope=owner;}if(!owner)throw Error('이미지를 저장하려면 로그인해 주세요.');return owner;}
 function check(owner){if(current()!==owner)throw Error('계정이 변경되었습니다. 이미지를 다시 붙여넣어 주세요.');}
 function owned(ref,owner){if(!validImageRef(ref)||ref.path.split('/')[0]!==owner.split('|').at(-1))throw Error('현재 계정의 이미지가 아닙니다. 이미지가 포함된 백업으로 가져와 주세요.');}
 async function download(ref){const owner=current();owned(ref,owner);const blob=await getFiles().download(ref.path);check(owner);if(blob.size!==ref.size||blob.type!==ref.mime)throw Error('이미지 파일을 확인하지 못했습니다.');return blob;}
 return {
  clear(){for(const entry of cache.values())if(entry.url)revokeURL(entry.url);cache.clear();scope=null;},
  async upload(blob){const owner=current();if(!IMAGE_TYPES.includes(blob.type)||blob.size<=0||blob.size>MAX_IMAGE_BYTES)throw Error('2MB 이하 PNG·JPEG·WebP·GIF 이미지를 붙여넣어 주세요.');const ref={bucket:IMAGE_BUCKET,path:owner.split('|').at(-1)+'/'+crypto.randomUUID()+'.'+blob.type.split('/')[1],mime:blob.type,size:blob.size};await getFiles().upload(ref.path,blob);check(owner);const verified=await download(ref);check(owner);cache.set(ref.path,{url:makeURL(verified)});return ref;},
  async url(ref){const owner=current();owned(ref,owner);let entry=cache.get(ref.path);if(!entry){entry={};cache.set(ref.path,entry);entry.pending=download(ref).then(blob=>{check(owner);entry.url=makeURL(blob);return entry.url;}).catch(error=>{cache.delete(ref.path);throw error;});}return entry.url||entry.pending;},
  async inline(ref){const blob=await download(ref),bytes=new Uint8Array(await blob.arrayBuffer());let raw='';for(const byte of bytes)raw+=String.fromCharCode(byte);return 'data:'+ref.mime+';base64,'+btoa(raw);},
  async portable(state){const next=structuredClone(state);if(!next.tasks.some(t=>t.memoParts?.some(p=>p.asset)))return next;const owner=current();for(const task of next.tasks)for(const part of task.memoParts||[])if(part.asset){part.image=await this.inline(part.asset);delete part.asset;}check(owner);return next;},
  async migrateTask(task){const owner=current(),parts=structuredClone(task.memoParts||[]);for(const part of parts)if(isInlineImage(part.image)){const [header,raw]=part.image.split(','),bytes=Uint8Array.from(atob(raw),c=>c.charCodeAt(0));part.asset=await this.upload(new Blob([bytes],{type:header.slice(5,-7)}));delete part.image;}check(owner);return parts;}
 };
}

let configured=null;
export function configureWorkImages(store){configured?.clear();configured=store;}
export const workImages={
 upload:blob=>{if(!configured)throw Error('이미지 저장소 연결을 확인해 주세요.');return configured.upload(blob);},
 url:ref=>{if(!configured)throw Error('이미지 저장소 연결을 확인해 주세요.');return configured.url(ref);},
 portable:state=>{if(!configured)throw Error('이미지 저장소 연결을 확인해 주세요.');return configured.portable(state);},
 migrateTask:task=>{if(!configured)throw Error('이미지 저장소 연결을 확인해 주세요.');return configured.migrateTask(task);},
 clear:()=>configured?.clear()
};
export async function hydrateWorkImages(root=document,store=workImages){
 await Promise.all([...root.querySelectorAll('img[data-work-image]')].map(async img=>{try{const ref=JSON.parse(img.dataset.workImage),src=await store.url(ref);if(img.isConnected){img.src=src;img.alt='업무 메모 이미지';}}catch{if(img.isConnected)img.alt='이미지를 불러오지 못했습니다. 연결 후 패널을 다시 열어 주세요.';}}));
}

// Each task swaps only after every image uploads and the original memo still matches.
export async function migrateInlineImages({getData,getScope,store=workImages,apply,save}){
 const owner=getScope();if(!owner)throw Error('로그인해 주세요.');let migrated=0,skipped=0;
 const targets=getData().tasks.filter(t=>t.memoParts?.some(p=>isInlineImage(p.image))).map(t=>({id:t.id,parts:structuredClone(t.memoParts),notes:t.notes,memoText:t.memoText}));
 for(const before of targets){
  const parts=await store.migrateTask({memoParts:before.parts});
  if(owner!==getScope())throw Error('계정이 변경되어 이미지 이전을 멈췄습니다.');
  const current=getData().tasks.find(t=>t.id===before.id);
  if(!current||JSON.stringify(current.memoParts)!==JSON.stringify(before.parts)||current.notes!==before.notes||current.memoText!==before.memoText){skipped++;continue;}
  // Preserve separately edited notes as well as archived tasks.
  apply(current,parts);if(save()===false)throw Error('기기에 저장하지 못했습니다. 현재 창의 내용을 백업해 주세요.');migrated++;
 }
 return {migrated,skipped};
}
