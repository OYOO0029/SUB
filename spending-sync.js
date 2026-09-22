import {SyncEngine, same} from './sync-core.mjs';
import {SYNC_CONFIG, SUPABASE_SDK} from './sync-config.mjs';

const bridge = window.spendingSyncBridge;
const storage = window.localStorage;
const TABLE = 'spending_state';
const OWNER = 'spendingCloudOwner_v1';
const UNSENT = 'spendingCloudUnsent_v1';
let client, engine, channel, subscription, user, scope, generation = 0, authBusy = false, connected = false;
let label = '로그인 필요', detail = '스케줄과 같은 계정으로 로그인하세요.';
const button = document.getElementById('syncStatus');
button.setAttribute('role','button'); button.tabIndex = 0;
button.setAttribute('aria-label','가계부 동기화 설정');
const dialog = document.createElement('dialog');
dialog.id = 'spendingSyncDialog'; dialog.setAttribute('aria-labelledby','spendingSyncTitle');
dialog.innerHTML = `<form method="dialog"><h2 id="spendingSyncTitle">가계부 동기화</h2><button class="close" aria-label="닫기">×</button></form>
<p id="spendingAccount"></p><p>처음 연결할 때 최신 가계부를 백업한 뒤 어느 데이터를 사용할지 선택하세요.</p>
<label>이메일<input id="spendingEmail" type="email" autocomplete="username"></label>
<label>비밀번호<input id="spendingPassword" type="password" autocomplete="current-password"></label>
<div class="cloudActions"><button id="spendingLogin" class="primaryBtn">로그인</button><button id="spendingLogout" class="ghost-btn">로그아웃</button></div>
<p id="spendingSyncDetail" role="status" aria-live="polite"></p>
<div class="cloudActions"><button id="spendingBackup" class="ghost-btn">현재 가계부 JSON 백업</button><button id="spendingProtected" class="ghost-btn">보호 백업 내보내기</button></div>
<div class="cloudActions"><button id="spendingPull" class="ghost-btn">서버 데이터로 연결</button><button id="spendingPush" class="primaryBtn">현재 데이터로 연결</button></div>
<p class="tiny muted">기기 간 변경이 겹치면 자동 덮어쓰기를 멈춥니다. 최신 백업을 불러오려면 기존 ‘백업 · 데이터’를 이용하세요.</p>`;
const style = document.createElement('style');
style.textContent = `#syncStatus{cursor:pointer}#spendingSyncDialog{width:min(480px,calc(100vw - 24px));max-height:calc(100dvh - 32px);overflow:auto;background:var(--card-2,#20252d);color:var(--text,#eee);border:1px solid var(--line,#444);border-radius:12px;padding:20px;box-sizing:border-box}#spendingSyncDialog::backdrop{background:#0009}#spendingSyncDialog form{display:flex;justify-content:space-between;align-items:center}#spendingSyncDialog p{font-size:12px;line-height:1.6;overflow-wrap:anywhere;margin:12px 0}#spendingSyncDialog label{display:block;margin:10px 0;font-size:12px}#spendingSyncDialog input{display:block;width:100%;box-sizing:border-box;margin-top:5px}.cloudActions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.cloudActions button{flex:1 1 170px;white-space:normal;word-break:keep-all;min-height:38px}`;
document.head.append(style); document.body.append(dialog);
style.textContent += '#spendingSyncDialog input{padding:10px 12px;border:1px solid var(--line,#444);border-radius:7px;background:var(--card-3,#252b34);color:var(--text,#eee);font:inherit;min-height:40px}#spendingSyncDialog input:disabled{opacity:.6}';
const $ = id => document.getElementById(id);
function status(kind, text, message) {
  label = text; detail = (message || '').replaceAll('일정','가계부');
  bridge.status(kind, text); $('spendingSyncDetail').textContent = detail;
}
function authUI() {
  $('spendingAccount').textContent = user ? '로그인: '+user.email : '로그인하지 않음';
  for(const id of ['spendingPush','spendingPull','spendingLogout']) $(id).disabled = !user;
  for(const id of ['spendingLogin','spendingEmail','spendingPassword']) $(id).disabled = !!user || authBusy;
}
function report(error) { status('error','확인 필요',error?.message || '연결 실패. 현재 기기 데이터는 유지됩니다.'); }
function stop() { generation++; connected=false; engine?.stop(); engine=null; if(channel&&client)client.removeChannel(channel).catch(()=>{});channel=null; }
function download(name,value) {const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function markConnected() {
  if(!engine?.ready || engine.conflict)return;
  storage.setItem(OWNER,scope); storage.setItem('spendingCloudLinked:'+scope,'true');
  storage.removeItem(UNSENT); connected=true;
}
async function activate(account) {
  if(user?.id===account.id&&engine)return;
  stop(); user=account; scope=SYNC_CONFIG.url+'|'+user.id;authUI();
  const token=generation;
  const check=(data,error)=>{if(error)throw error;return data};
  const api={
    read:async()=>{const {data,error}=await client.from(TABLE).select('state,updated_at').eq('user_id',account.id).maybeSingle();return check(data,error)},
    insert:async state=>{const {data,error}=await client.from(TABLE).insert({user_id:account.id,state}).select('state,updated_at').single();if(error?.code==='23505')return null;return check(data,error)},
    update:async(state,stamp)=>{const {data,error}=await client.from(TABLE).update({state}).eq('user_id',account.id).eq('updated_at',stamp).select('state,updated_at').maybeSingle();return check(data,error)}
  };
  connected=storage.getItem('spendingCloudLinked:'+scope)==='true'&&storage.getItem(OWNER)===scope;
  const missed=storage.getItem(UNSENT);
  engine=new SyncEngine({api,bridge,storage,scope,notion:false,namespace:'spendingSync',validate:bridge.validate,status:(...args)=>{if(token!==generation)return;status(...args);if(args[0]==='online')markConnected();}});
  // Unattributed offline/login-period edits require explicit choice, never a silent pull.
  if(missed&&!engine.dirty)connected=false;
  channel=client.channel('spending-'+account.id).on('postgres_changes',{event:'*',schema:'public',table:TABLE,filter:'user_id=eq.'+account.id},()=>{if(connected&&token===generation)engine?.reconcile()}).subscribe(value=>{if(token!==generation)return;if(value==='SUBSCRIBED'&&connected)engine?.reconcile();});
  if(connected)await engine.reconcile();else status('waiting','연결 필요','현재 가계부를 백업하고 서버 데이터 또는 현재 데이터를 선택하세요. 자동 업로드는 하지 않습니다.');
}
async function start() {
  const {createClient}=await import(SUPABASE_SDK);
  client=createClient(SYNC_CONFIG.url,SYNC_CONFIG.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false},global:{fetch:async(input,options={})=>{const ctl=new AbortController();const timer=setTimeout(()=>ctl.abort(),15000);const abort=()=>ctl.abort();options.signal?.addEventListener('abort',abort,{once:true});try{return await fetch(input,{...options,signal:ctl.signal})}finally{clearTimeout(timer);options.signal?.removeEventListener('abort',abort)}}}});
  subscription=client.auth.onAuthStateChange((event,session)=>{setTimeout(()=>{if(authBusy)return;if(event==='SIGNED_OUT'){stop();user=null;authUI();status('offline','로그인 필요','로그아웃되었습니다.')}else if(session?.user)activate(session.user).catch(report)},0)}).data.subscription;
  const {data,error}=await client.auth.getSession();if(error)throw error;if(data.session)await activate(data.session.user);
}
button.onclick=()=>{dialog.showModal();$('spendingSyncDetail').textContent=detail;};
button.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();button.click()}};
dialog.addEventListener('close',()=>{$('spendingPassword').value='';button.focus()});
$('spendingLogin').onclick=async()=>{if(authBusy)return;authBusy=true;authUI();try{if(!client)throw Error('서버 연결을 준비 중입니다. 잠시 후 다시 시도하세요.');const {data,error}=await client.auth.signInWithPassword({email:$('spendingEmail').value.trim(),password:$('spendingPassword').value});if(error)throw error;await activate(data.user)}catch(e){report(e)}finally{$('spendingPassword').value='';authBusy=false;authUI()}};
$('spendingLogout').onclick=async()=>{if(engine?.dirty&&!confirm('미전송 변경은 이 기기에 보관됩니다. 로그아웃할까요?'))return;stop();user=null;authUI();const {error}=await client.auth.signOut({scope:'local'});if(error)report(error);else status('offline','로그인 필요','로그아웃했습니다.');};
$('spendingBackup').onclick=()=>bridge.export();
$('spendingProtected').onclick=()=>{try{const records=[];for(let i=0;i<storage.length;i++){const key=storage.key(i);if(key.startsWith('spendingSyncBackup:')||key.startsWith('spendingSyncPending:'))records.push({key,...JSON.parse(storage.getItem(key))})}download('spending-protected-backups.json',{records})}catch(e){report(e)}};
$('spendingPull').onclick=async()=>{if(!engine||!confirm('현재 기기 데이터를 보호 백업에 보관하고 서버 가계부를 불러올까요?'))return;await engine.pull();markConnected();};
$('spendingPush').onclick=async()=>{if(!engine||!confirm('현재 가계부가 최신이며 JSON 백업을 보관했나요? 이 데이터를 서버 원본으로 저장합니다.'))return;await engine.upload();markConnected();};
window.addEventListener('spending-local-save',()=>{try{storage.setItem(UNSENT,JSON.stringify({scope:scope||null,state:bridge.read()}));if(connected&&engine)engine.localChanged();else status('waiting','연결 필요','변경사항은 이 기기에 저장했습니다. 최신 데이터를 선택해 연결하세요.')}catch(e){report(e)}});
window.addEventListener('storage',e=>{if(e.key==='spending-v8'){if(connected)engine?.reconcile();else status('waiting','다른 창 변경','현재 화면을 백업한 뒤 연결할 데이터를 확인하세요.');}});
const reconcile=()=>{if(connected)engine?.reconcile()};
window.addEventListener('online',()=>{if(!client)start().catch(report);else reconcile()});
window.addEventListener('offline',()=>status('offline','오프라인','변경은 이 기기에 보관하고 온라인 복귀 시 서버를 확인합니다.'));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)reconcile()});
setInterval(()=>{if(!document.hidden)reconcile()},30000);
for(const modal of document.querySelectorAll('.modalBack')){let open=modal.classList.contains('show');new MutationObserver(()=>{const next=modal.classList.contains('show');if(open&&!next)reconcile();open=next;}).observe(modal,{attributes:true,attributeFilter:['class']});}
authUI();status('offline',label,detail);start().catch(report);
