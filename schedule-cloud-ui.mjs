import {CloudSync,equalState,cloudValue} from './schedule-cloud-core.mjs';
import {SYNC_CONFIG,SUPABASE_SDK} from './schedule-config.mjs';
import {appStorage} from './schedule-storage.mjs';
import {authErrorMessage} from './schedule-auth-errors.mjs';

export function startCloud(bridge,{storage=appStorage,loadClient=()=>import(SUPABASE_SDK)}={}){
 let client,connecting,engine,user,generation=0,authRevision=0,channel,working=false,disposed=false;
 let statusKind='offline',statusText='로그인해 주세요';
 const dialog=document.createElement('dialog');dialog.id='cloud-dialog';
 dialog.setAttribute('aria-label','로그인 · 동기화');
 dialog.innerHTML=[
 '<form id="cloud-login"><div class="panel-head"><h2>로그인 · 동기화</h2><button type="button" data-cloud="close" aria-label="닫기">×</button></div>',
 '<p id="cloud-account" class="cloud-account"></p><p id="cloud-detail" role="status" tabindex="-1"></p>',
 '<div id="cloud-fields"><label>이메일<input name="email" type="email" autocomplete="username" required></label>',
 '<label>비밀번호<input name="password" type="password" autocomplete="current-password" required></label>',
 '<button class="btn-primary full" type="submit">로그인</button><button type="button" data-cloud="signup" class="full space-top">처음 사용 · 계정 만들기</button>',
 '<p class="small">가계부와 같은 이메일과 비밀번호를 사용하세요. ChatGPT 로그인은 필요하지 않습니다.</p></div>',
 '<div id="cloud-connected" hidden><button type="button" data-cloud="refresh" class="full">지금 동기화</button>',
 '<div id="cloud-link-choices"><div class="cloud-choices"><button type="button" data-cloud="pull">서버 데이터로 연결</button><button type="button" data-cloud="push">현재 데이터로 연결</button></div>',
 '<p class="small">기록이 서로 다를 때만 사용할 데이터를 선택하세요. 선택 전 기록을 보호 백업에 보관합니다.</p></div>',
 '<button type="button" data-cloud="legacy" class="full" hidden>이 기기의 이전 기록 가져오기</button>',
 '<div class="cloud-choices"><button type="button" data-cloud="backup">현재 기록 백업</button><button type="button" data-cloud="protected">보호된 백업</button></div>',
 '<button type="button" data-cloud="logout" class="full">로그아웃</button></div>',
 '<p class="small">노션과 다른 기기에서 같은 계정으로 로그인하면 기록이 동기화됩니다.</p><p id="cloud-storage" class="small"></p></form>'
 ].join('');
 document.body.append(dialog);
 const text=(selector,value)=>dialog.querySelector(selector).textContent=value;
 const cleanups=[];
 function listen(target,event,fn){target.addEventListener(event,fn);cleanups.push(()=>target.removeEventListener(event,fn));}
 function paint(){
  if(disposed)return;
  document.querySelectorAll('[data-cloud-label]').forEach(el=>el.textContent=user?'계정 · 동기화':'로그인 · 동기화');
  document.querySelectorAll('[data-cloud-status]').forEach(el=>{el.textContent=statusText;el.dataset.state=statusKind;});
  window.dispatchEvent(new Event('my-week-sync-status'));text('#cloud-detail',statusText);dialog.querySelector('#cloud-detail').dataset.state=statusKind;
  text('#cloud-account',user?.email||'같은 계정으로 어디서나 이어서 기록하세요.');
  text('#cloud-storage',storage.persistent?'':'이 환경에서는 로그인 상태가 이 창에서만 유지됩니다. 닫기 전에 ‘동기화됨’을 확인하세요.');
  dialog.querySelector('#cloud-fields').hidden=!!user;
  dialog.querySelector('#cloud-connected').hidden=!user;
  dialog.querySelector('#cloud-link-choices').hidden=!!engine?.meta?.linked&&!engine?.meta?.conflict;
  dialog.querySelector('[data-cloud="legacy"]').hidden=!user||!bridge.hasLegacy?.();
  dialog.querySelectorAll('button:not([data-cloud="close"])').forEach(b=>b.disabled=working);
 }
 function status(kind,message){statusKind=kind;statusText=message;paint();}
 function report(error){status('error',authErrorMessage(error));}
 function stop(){generation++;engine?.stop();engine=null;if(channel)Promise.resolve(client?.removeChannel(channel)).catch(()=>{});channel=null;}
 function signedOut(){
  stop();user=null;bridge.setAccount(null);dialog.querySelector('[name=password]').value='';
  status('offline','로그인해 주세요');
 }
 async function activate(account){
  if(disposed||user?.id===account.id&&engine)return;
  stop();user=account;const current=generation;
  bridge.setAccount(SYNC_CONFIG.url+'|'+account.id);status('waiting','서버 기록을 확인하는 중');
  const key='my-week.cloud.v1:'+SYNC_CONFIG.url+':'+account.id;
  const api={
   read:async()=>{const{data,error}=await client.from('spending_state').select('state,updated_at').eq('user_id',account.id).maybeSingle();if(error)throw error;return data;},
   write:async(state,stamp)=>{
    let q=stamp?client.from('spending_state').update({state}).eq('user_id',account.id).eq('updated_at',stamp):client.from('spending_state').insert({user_id:account.id,state});
    const{data,error}=await q.select('state,updated_at').maybeSingle();if(error&&error.code==='23505')return null;if(error)throw error;return data;
   }
  };
  try{
   engine=new CloudSync({api,bridge,storage,key,status:(kind,message)=>{if(current===generation)status(kind,message);}});
   if(engine.meta?.linked&&!engine.meta.pending&&!equalState(bridge.read(),engine.meta.base?.data))engine.meta.linked=false;
   if(engine.meta?.pending&&!equalState(engine.meta.pending,bridge.read()))engine.meta.conflict=true;
   engine.checkpoint();
   channel=client.channel('my-week-'+account.id).on('postgres_changes',{event:'*',schema:'public',table:'spending_state',filter:'user_id=eq.'+account.id},()=>engine?.reconcile()).subscribe();
   // Empty new devices join the existing server snapshot without a destructive
   // choice. Migrated/offline records and conflicts always require a decision.
   if(!engine.meta?.linked&&!engine.meta?.pending&&!engine.meta?.conflict&&bridge.isPristine()&&!bridge.hasLegacy?.()&&!bridge.busy()){
    const row=await api.read();if(current!==generation)return;
    const remote=cloudValue(row,bridge.validate);
    if(remote||!engine.meta?.pending)await engine.choose(remote?'pull':'push');
   }else await engine.reconcile();
  }catch(error){if(current===generation)report(error);}
 }
 async function connect(){
  if(connecting)return connecting;
  if(client)return client;
  connecting=(async()=>{
   const{createClient}=await loadClient();
   client=createClient(SYNC_CONFIG.url,SYNC_CONFIG.key,{
    auth:{storage,storageKey:'my-week.supabase.auth.v1',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false},
    global:{fetch:async(input,options={})=>{
     const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),15000),abort=()=>ctl.abort();
     if(options.signal?.aborted)ctl.abort();else options.signal?.addEventListener('abort',abort,{once:true});
     try{return await fetch(input,{...options,signal:ctl.signal});}finally{clearTimeout(timer);options.signal?.removeEventListener('abort',abort);}
    }}
   });
   const subscription=client.auth.onAuthStateChange((event,session)=>{
    // Supabase requires async work outside its auth callback lock.
    const revision=++authRevision;
    setTimeout(()=>{
     if(disposed||revision!==authRevision)return;
     if(event==='SIGNED_OUT')signedOut();
     else if(['SIGNED_IN','TOKEN_REFRESHED','USER_UPDATED'].includes(event)&&session?.user)activate(session.user).catch(report);
    },0);
   });
   cleanups.push(()=>subscription.data.subscription.unsubscribe());
   const restoring=generation;
   const{data,error}=await client.auth.getSession();if(error)throw error;
   if(data.session){
    const verified=await client.auth.getUser();if(verified.error)throw verified.error;
    if(!disposed&&restoring===generation&&verified.data.user)await activate(verified.data.user);
   }
   return client;
  })();
  try{return await connecting;}finally{connecting=null;}
 }
 async function run(fn){
  if(working)return;working=true;paint();
  try{await fn();}catch(error){report(error);}finally{working=false;paint();}
 }
 function confirmInPage(message){
  return new Promise(resolve=>{
   const box=document.createElement('dialog');box.id='cloud-confirm';box.setAttribute('aria-label','데이터 선택 확인');
   const paragraph=document.createElement('p');paragraph.textContent=message;
   const actions=document.createElement('div');actions.className='form-actions';
   const cancel=document.createElement('button');cancel.textContent='취소';cancel.type='button';
   const accept=document.createElement('button');accept.textContent='확인';accept.type='button';accept.className='btn-primary';
   const finish=value=>{box.close();box.remove();resolve(value);};
   cancel.onclick=()=>finish(false);accept.onclick=()=>finish(true);
   box.addEventListener('cancel',event=>{event.preventDefault();finish(false);});
   actions.append(cancel,accept);box.append(paragraph,actions);document.body.append(box);box.showModal();cancel.focus();
  });
 }
 listen(dialog.querySelector('form'),'submit',event=>{
  event.preventDefault();const form=event.target;
  run(async()=>{
   await connect();status('waiting','로그인하는 중');
   try{
    const{data,error}=await client.auth.signInWithPassword({email:form.elements.email.value.trim(),password:form.elements.password.value});
    if(error)throw error;await activate(data.user);
   }finally{form.elements.password.value='';}
  });
 });
 listen(dialog,'click',event=>{
  const action=event.target.closest('[data-cloud]')?.dataset.cloud;if(!action)return;
  if(action==='close'){dialog.close();return;}
  run(async()=>{
   if(action==='signup'){
    const form=dialog.querySelector('form');if(!form.reportValidity())return;
    if(form.elements.password.value.length<8)throw Error('비밀번호를 8자 이상 입력해 주세요.');
    await connect();
    try{
     const{data,error}=await client.auth.signUp({email:form.elements.email.value.trim(),password:form.elements.password.value,options:{emailRedirectTo:'https://oyoo0029.github.io/SUB/schedule.html'}});
     if(error)throw error;if(data.session)await activate(data.session.user);else status('waiting','이메일의 확인 링크를 누른 뒤 이 화면에서 로그인해 주세요.');
    }finally{form.elements.password.value='';}
    return;
   }
   if(!user)throw Error('먼저 로그인해 주세요.');
   if(action==='backup'){bridge.export();return;}
   if(action==='protected'){
    const prefix='my-week.cloud.v1:'+SYNC_CONFIG.url+':'+user.id;
    const backups=storage.keys().filter(k=>k===prefix||k.startsWith(prefix+':')).map(key=>({key,value:JSON.parse(storage.getItem(key))}));
    bridge.download(JSON.stringify({app:'MY WEEK protected backups',backups}),'my-week-protected-backups.json');return;
   }
   if(action==='refresh'){await connect();await engine?.reconcile();}
   if(action==='legacy'){
    if(await confirmInPage('이 브라우저의 이전 기록을 현재 계정으로 가져올까요? 기존 원본은 보존됩니다. 서버 반영은 데이터를 선택한 뒤 진행합니다.')){
     engine?.backup(bridge.read(),'before-legacy-import');bridge.importLegacy();
     if(engine){engine.meta={...engine.meta,linked:false};engine.checkpoint();}
     status('waiting','이전 기록을 가져왔습니다. 연결할 데이터를 선택해 주세요.');
    }
   }
   if(action==='pull'||action==='push'){
    if(!engine)throw Error('연결을 확인한 뒤 다시 시도해 주세요.');
    const message=action==='pull'?'현재 기록을 보호 백업에 보관하고 서버 기록을 불러올까요?':'현재 화면의 기록으로 서버 기록을 교체할까요? 기존 서버 기록은 보호 백업에 보관합니다.';
    if(await confirmInPage(message))await engine.choose(action);
   }
   if(action==='logout'){
    if(engine?.meta?.pending&&!(await confirmInPage(storage.persistent?'아직 서버에 저장되지 않은 기록이 있습니다. 이 기기에 보관하고 로그아웃할까요?':'아직 서버에 저장되지 않은 기록이 있습니다. 이 창을 닫으면 사라질 수 있습니다. 먼저 백업하는 것을 권합니다. 로그아웃할까요?')))return;
    signedOut();const{error}=await client.auth.signOut({scope:'local'});if(error)throw error;
   }
  });
 });
 listen(document,'click',event=>{
  if(event.target.closest('[data-action="cloud-open"]')){paint();dialog.showModal();connect().catch(report);}
 });
 listen(window,'my-week-local-save',()=>{
  try{if(engine)engine.changed();else if(user)status('error','기기에 보관됨 · 서버 연결을 확인해 주세요');}
  catch{status('error','기록 보관에 실패했습니다. 현재 기록을 백업해 주세요.');}
 });
 listen(window,'my-week-render',paint);
 listen(window,'my-week-login-request',()=>{document.querySelectorAll('.modal-backdrop.open').forEach(el=>el.classList.remove('open'));paint();dialog.showModal();connect().catch(report);});
 listen(window,'my-week-storage-limited',paint);
 listen(window,'online',()=>engine?.reconcile());
 listen(window,'offline',()=>{if(user)status('offline','오프라인 · 연결되면 다시 동기화합니다');});
 listen(document,'visibilitychange',()=>{if(!document.hidden)engine?.reconcile();});
 listen(window,'storage',event=>{
  if(event.key===bridge.storageKey){
   if(engine?.meta?.pending){engine.meta.conflict=true;engine.checkpoint();status('conflict','다른 창에서도 수정했습니다. 기록을 선택해 주세요.');}
   else engine?.reconcile();
  }
 });
 const interval=setInterval(()=>{if(!document.hidden&&navigator.onLine)engine?.reconcile();},15000);
 listen(window,'beforeunload',event=>{
  if(engine?.meta?.pending||user&&!storage.persistent&&!engine?.meta?.linked){event.preventDefault();event.returnValue='';}
 });
 paint();const ready=connect().catch(report);
 return {ready,destroy(){disposed=true;stop();clearInterval(interval);cleanups.forEach(fn=>fn());dialog.remove();}};
}
