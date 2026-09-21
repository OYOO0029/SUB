import {SyncEngine, notionContext, validateState} from './schedule-sync-core.mjs';

const CONFIG='myWeekSyncConfig_v1',OWNER='myWeekSyncCacheOwner_v1';
const SDK='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0/+esm';
const $=id=>document.getElementById(id);
const bridge=window.myWeekSyncBridge;
let client=null,engine=null,user=null,channel=null,authSubscription=null,epoch=0,authBusy=false;
let storage;
try{storage=window.localStorage}catch{storage={getItem:()=>null,setItem:()=>{throw Error('저장 공간이 차단되어 동기화를 시작할 수 없습니다.')},removeItem:()=>{}}}
const notion=notionContext(window.self!==window.top,document.referrer,Array.from(location.ancestorOrigins||[]));
function config(){try{return JSON.parse(storage.getItem(CONFIG)||'{}')}catch{return {}}}
function status(kind,label,detail){$('syncCloudBtn').dataset.state=kind;$('syncCloudLabel').textContent=label;$('syncCloudStatus').textContent=detail;window.dispatchEvent(new Event('my-week-sync-status'))}
function authUI(){for(const id of ['syncCloudPull','syncCloudPush','syncCloudLogout'])$(id).disabled=!user;$('syncCloudEmail').disabled=!!user;$('syncCloudPw').disabled=!!user;$('syncCloudLogin').disabled=!!user;$('syncCloudSignup').disabled=!!user;$('syncAccount').textContent=user?'로그인: '+user.email:'로그인하지 않음';}
function publicConfig(url,key){
 const parsed=new URL(url);if(parsed.protocol!=='https:'||!parsed.hostname.endsWith('.supabase.co')||parsed.username||parsed.password||parsed.search||parsed.hash||parsed.pathname!=='/')throw Error('Supabase Project URL을 확인하세요.');
 if(key.startsWith('sb_publishable_'))return {url:parsed.origin,key};
 try{const payload=JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));if(payload.role==='anon')return {url:parsed.origin,key}}catch{}
 throw Error('Publishable 또는 anon key만 사용할 수 있습니다. secret/service_role key는 저장하지 않습니다.');
}
async function timeoutFetch(input,options={}){const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),15000);const abort=()=>ctl.abort();options.signal?.addEventListener('abort',abort,{once:true});try{return await fetch(input,{...options,signal:ctl.signal})}finally{clearTimeout(timer);options.signal?.removeEventListener('abort',abort)}}
async function getClient(){
 if(client)return client;const cfg=config();if(!cfg.url||!cfg.key)throw Error('서버 URL과 공개 키를 먼저 저장하세요.');const safe=publicConfig(cfg.url,cfg.key),generation=epoch;
 const {createClient}=await import(SDK);if(generation!==epoch)throw Error('설정이 변경되었습니다. 다시 로그인하세요.');
 if(client)return client;
 client=createClient(safe.url,safe.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false},global:{fetch:timeoutFetch}});
 authSubscription=client.auth.onAuthStateChange((event,session)=>{
  // Never await Supabase calls inside its auth lock.
  setTimeout(()=>{if(generation!==epoch||authBusy)return;if(event==='SIGNED_OUT'){stopEngine();user=null;authUI();status('offline','로그인 필요','로그인 세션이 종료되었습니다. 미전송 기록은 이 기기에 보존됩니다.')}else if(session?.user?.id!==user?.id&&session?.user)activate(session.user).catch(report);else if(event==='TOKEN_REFRESHED')engine?.reconcile()},0);
 }).data.subscription;return client;
}
function report(e){status('error','오류',e?.message||'서버 연결 실패. 로컬 일정은 유지됩니다.')}
function stopEngine(){engine?.stop();engine=null;if(channel&&client)client.removeChannel(channel).catch(()=>{});channel=null;}
async function detach(){epoch++;stopEngine();authSubscription?.unsubscribe();authSubscription=null;client?.auth.stopAutoRefresh();client=null;user=null;authUI();}
async function activate(nextUser){
 if(user?.id===nextUser.id&&engine){engine.reconcile();return}
 stopEngine();user=nextUser;authUI();const generation=epoch,sb=client,cfg=config(),scope=cfg.url+'|'+user.id;
 const owner=storage.getItem(OWNER);
 const ownedBridge={...bridge,originalCache:owner&&owner!==scope?null:bridge.originalCache,apply:s=>{bridge.apply(s);storage.setItem(OWNER,scope)}};
 const check=(data,error)=>{if(error)throw error;return data};
 const api={
  read:async()=>{const {data,error}=await sb.from('my_week_state').select('state,updated_at').eq('user_id',nextUser.id).maybeSingle();return check(data,error)},
  insert:async state=>{const {data,error}=await sb.from('my_week_state').insert({user_id:nextUser.id,state}).select('state,updated_at').single();if(error?.code==='23505')return null;return check(data,error)},
  update:async(state,stamp)=>{const {data,error}=await sb.from('my_week_state').update({state}).eq('user_id',nextUser.id).eq('updated_at',stamp).select('state,updated_at').maybeSingle();return check(data,error)}
 };
 let current;current=new SyncEngine({api,bridge:ownedBridge,storage,scope,notion,status:(...args)=>{if(generation!==epoch||engine!==current)return;if(args[0]==='online')storage.setItem(OWNER,scope);status(...args)}});engine=current;
 channel=sb.channel('my-week-'+nextUser.id).on('postgres_changes',{event:'*',schema:'public',table:'my_week_state',filter:'user_id=eq.'+nextUser.id},()=>current.reconcile()).subscribe(value=>{
  if(generation!==epoch||engine!==current)return;
  if(value==='SUBSCRIBED')current.reconcile();
  else if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(value))status('error','연결 확인','실시간 연결이 끊겼습니다. 30초마다 서버를 재확인하며 로컬 일정은 계속 사용할 수 있습니다.');
 });await current.reconcile();
}
async function authenticate(signup=false){
 if(authBusy)return;authBusy=true;const generation=epoch;
 try{const sb=await getClient(),email=$('syncCloudEmail').value.trim(),password=$('syncCloudPw').value;if(!email||password.length<6)throw Error('이메일과 6자 이상의 비밀번호를 입력하세요.');status('syncing','연결 중',signup?'계정을 생성합니다.':'로그인합니다.');
 const {data,error}=signup?await sb.auth.signUp({email,password,options:{emailRedirectTo:'https://oyoo0029.github.io/SUB/schedule.html'}}):await sb.auth.signInWithPassword({email,password});if(error)throw error;if(generation!==epoch)return;
 if(data.session)await activate(data.user);else status('offline','이메일 확인','확인 메일의 링크를 연 후 이 화면에서 다시 로그인하세요.');
 }catch(e){report(e)}finally{$('syncCloudPw').value='';authBusy=false;}
}
async function restore(){try{if(!config().url){status('offline','로그인 필요','서버 설정 후 로그인하면 동기화할 수 있습니다.');return}const sb=await getClient(),generation=epoch;const {data,error}=await sb.auth.getSession();if(error)throw error;if(generation!==epoch)return;if(data.session)await activate(data.session.user);else status('offline','로그인 필요','같은 계정으로 로그인하세요.')}catch(e){report(e)}}
function download(name,data){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}

const style=document.createElement('style');style.textContent=`
.sync-cloud-btn{border:0;background:transparent;color:#a7abb5;min-height:36px;width:92px;padding:0 4px;font-size:11px;white-space:nowrap}
.sync-cloud-btn:hover{color:#ddd}.sync-cloud-dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:#878787;margin-right:5px}
.sync-cloud-btn[data-state=online] .sync-cloud-dot{background:#7ccf9a}.sync-cloud-btn[data-state=syncing] .sync-cloud-dot{background:#84d7dc}.sync-cloud-btn[data-state=error] .sync-cloud-dot{background:#ef6666}
.header.actions-collapsed .sync-cloud-btn{height:44px;text-align:left;width:100%;padding:0 10px}
#syncCloudModal{z-index:2000}#syncCloudModal .modal{max-width:530px}#syncCloudModal .modal-body{display:grid;gap:12px}#syncCloudModal input{width:100%;min-width:0}#syncCloudModal label{display:block;font-size:12px;margin-bottom:5px}
.sync-note{font-size:12px;line-height:1.6;color:#b8bcc5;padding:10px;border:1px solid #3b414c;border-radius:8px}.sync-row{display:flex;gap:8px;flex-wrap:wrap}.sync-row .btn{flex:1 1 130px;word-break:keep-all}#syncCloudStatus{font-size:12px;line-height:1.6;overflow-wrap:anywhere}#syncAccount{font-size:12px;overflow-wrap:anywhere}
`;document.head.append(style);
const button=document.createElement('button');button.id='syncCloudBtn';button.className='sync-cloud-btn';button.type='button';button.setAttribute('aria-label','클라우드 동기화 설정');button.innerHTML='<span class="sync-cloud-dot"></span><span id="syncCloudLabel">로그인 필요</span>';document.querySelector('.header-actions').append(button);
const modal=document.createElement('div');modal.id='syncCloudModal';modal.className='modal-backdrop';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','syncTitle');modal.innerHTML=`
<section class="modal"><div class="modal-head"><h2 id="syncTitle">스케줄 동기화</h2><button id="syncCloudClose" class="close-btn" aria-label="닫기">×</button></div>
<div class="modal-body">
<p class="sync-note" id="syncCloudContext"></p>
<details><summary>서버 설정</summary><label for="syncCloudUrl">Supabase Project URL</label><input class="input" id="syncCloudUrl" type="url" autocomplete="off" placeholder="https://xxxxx.supabase.co"><label for="syncCloudKey">Publishable / anon key</label><input class="input" id="syncCloudKey" autocomplete="off" spellcheck="false"><button class="btn" id="syncCloudSave">서버 설정 저장</button></details>
<p id="syncAccount"></p><div><label for="syncCloudEmail">이메일</label><input class="input" id="syncCloudEmail" type="email" autocomplete="username"></div><div><label for="syncCloudPw">비밀번호</label><input class="input" id="syncCloudPw" type="password" autocomplete="current-password"></div>
<div class="sync-row"><button class="btn primary" id="syncCloudLogin">로그인</button><button class="btn" id="syncCloudSignup">계정 만들기</button><button class="btn" id="syncCloudLogout">로그아웃</button></div>
<p id="syncCloudStatus" role="status" aria-live="polite"></p>
<div class="sync-row"><button class="btn" id="syncCloudPull">서버 데이터 불러오기</button><button class="btn" id="syncCloudPush">이 기기 데이터를 서버로 올리기</button></div>
<div class="sync-row"><button class="btn" id="syncExport">현재 일정 JSON 백업</button><button class="btn" id="syncBackupExport">보호 백업 내보내기</button></div><p class="sync-note">서버로 보내지 못한 변경과 이전 내용은 이 브라우저에 보관됩니다. 다른 기기에서도 같은 서버 설정과 계정으로 로그인하세요.</p>
</div></section>`;document.body.append(modal);
$('syncCloudContext').textContent=notion?'현재 Notion 안에서 실행 중입니다. 서버에 데이터가 없다면 기존 로컬 일정이 최초 서버 데이터로 저장됩니다. 먼저 현재 일정 JSON을 백업하세요.':window.self!==window.top?'임베드 출처를 확인할 수 없어 자동 최초 업로드를 막았습니다. 최신 Notion 일정인지 확인하고 JSON 백업 후 수동 업로드하세요.':'서버에 아직 데이터가 없고 최신 데이터가 Notion에 있다면 Notion에서 먼저 동기화를 진행하세요.';
$('syncCloudUrl').value=config().url||'';$('syncCloudKey').value=config().key||'';modal.querySelector('details').open=!config().url;
let previousFocus=null;button.onclick=()=>{previousFocus=document.activeElement;modal.classList.add('open');$('syncCloudClose').focus()};const close=()=>{modal.classList.remove('open');$('syncCloudPw').value='';previousFocus?.focus()};$('syncCloudClose').onclick=close;modal.onclick=e=>{if(e.target===modal)close()};
modal.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close()}if(e.key==='Tab'){const focusable=[...modal.querySelectorAll('button,input,summary')].filter(el=>!el.disabled&&el.getClientRects().length);const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
$('syncCloudSave').onclick=async()=>{try{if(authBusy)throw Error('로그인이 끝난 뒤 변경하세요.');const cfg=publicConfig($('syncCloudUrl').value.trim(),$('syncCloudKey').value.trim());if(engine?.dirty&&!confirm('미전송 변경은 이전 계정의 로컬 백업에 남습니다. 서버 설정을 바꿀까요?'))return;storage.setItem(CONFIG,JSON.stringify(cfg));await detach();status('offline','로그인 필요','서버 설정을 저장했습니다. 로그인하세요.');await restore()}catch(e){report(e)}};
$('syncCloudLogin').onclick=()=>authenticate();$('syncCloudSignup').onclick=()=>authenticate(true);
$('syncCloudLogout').onclick=async()=>{try{if(authBusy)return;if(engine?.dirty&&!confirm('아직 서버에 보내지 못한 변경이 있습니다. 이 기기에 보관하고 로그아웃할까요?'))return;const sb=client;await detach();if(sb){const {error}=await sb.auth.signOut({scope:'local'});if(error)throw error}status('offline','로그인 필요','로그아웃했습니다. 이 기기의 캐시와 백업은 남아 있습니다.')}catch(e){report(e)}};
$('syncCloudPull').onclick=()=>{if(engine&&confirm('이 기기의 현재 내용을 보호 백업에 보관하고 서버 데이터로 바꿀까요?'))engine.pull()};
$('syncCloudPush').onclick=()=>{if(engine&&confirm('이 기기의 현재 일정을 서버 원본으로 저장합니다. 다른 기기의 최신 내용을 대체할 수 있습니다. 최신 Notion 일정인지 확인했나요?'))engine.upload()};
$('syncExport').onclick=()=>download('my-week-current.json',bridge.read());$('syncBackupExport').onclick=()=>{try{const records=[];for(let i=0;i<storage.length;i++){const key=storage.key(i);if(key.startsWith('myWeekSyncBackup:')||key.startsWith('myWeekSyncPending:'))records.push({key,...JSON.parse(storage.getItem(key))})}download('my-week-protected-backups.json',{records})}catch(e){report(e)}};
window.addEventListener('my-week-local-save',()=>{try{engine?.localChanged()}catch(e){report(e)}});
window.addEventListener('online',()=>engine?.reconcile());window.addEventListener('offline',()=>status('offline','오프라인','일정은 이 기기에 저장됩니다. 온라인 복귀 후 서버를 확인합니다.'));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)engine?.reconcile()});setInterval(()=>{if(!document.hidden)engine?.reconcile()},30000);
for(const dialog of document.querySelectorAll('.modal-backdrop:not(#syncCloudModal)')){let wasOpen=dialog.classList.contains('open');new MutationObserver(()=>{const open=dialog.classList.contains('open');if(wasOpen&&!open)engine?.reconcile();wasOpen=open}).observe(dialog,{attributes:true,attributeFilter:['class']})}
authUI();status('offline','로그인 필요','로컬 일정 사용 중');if(bridge)restore();else report(Error('스케줄 연결 코드를 확인하세요.'));
