// Auth uses bearer tokens, not third-party cookies. If storage is denied in an
// embed, keep this tab usable and tell the user that login will not persist.
export function createSafeStorage(getStorage,onFallback=()=>{}){
 const memory=new Map();let backing=null;
 try{backing=getStorage();backing.setItem('my-week-probe','1');backing.removeItem('my-week-probe');}catch{backing=null;}
 const fallback=()=>{backing=null;onFallback();};
 return {
  get persistent(){return !!backing;},
  getItem(key){if(backing)try{const value=backing.getItem(key);if(value!==null)memory.set(key,value);else memory.delete(key);return value;}catch{fallback();}return memory.get(key)??null;},
  setItem(key,value){value=String(value);memory.set(key,value);if(!backing)try{backing=getStorage();}catch{}if(backing)try{backing.setItem(key,value);return true;}catch{fallback();}return false;},
  setPersisted(key,value){value=String(value);if(!backing)try{backing=getStorage();}catch{}if(backing)try{backing.setItem(key,value);memory.set(key,value);return true;}catch{fallback();}return false;},
 removeItem(key){memory.delete(key);if(backing)try{backing.removeItem(key);}catch{fallback();}},
  keys(){if(backing)try{return Object.keys(backing);}catch{fallback();}return [...memory.keys()];}
 };
}
export const appStorage=createSafeStorage(()=>globalThis.localStorage,()=>globalThis.dispatchEvent?.(new Event('my-week-storage-limited')));

export function persistValue(storage,key,value){if((storage.setPersisted?storage.setPersisted(key,value):storage.setItem(key,value))===false)throw Error('기기에 저장하지 못했습니다. 현재 창의 입력을 유지합니다. 저장 공간을 확보한 뒤 다시 저장하거나 백업해 주세요.');}
