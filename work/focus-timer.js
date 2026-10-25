// Focus sessions are device-local, account-scoped UI state, not task records.
export function createFocusTimer({storage,getScope,now=Date.now}) {
  const defaults=()=>({minutes:60,remaining:3600000,until:null,taskId:null});
  let owner,session=defaults();
  const key=()=>`my-work-focus-timer-v1:${encodeURIComponent(owner)}`;
  function sync(){
    const next=getScope()||null;
    if(next===owner)return;
    owner=next;session=defaults();
    if(!owner)return;
    try{
      const value=JSON.parse(storage.getItem(key())||'null');
      if(value&&Number.isInteger(value.minutes)&&value.minutes>=1&&value.minutes<=1440){
        session={minutes:value.minutes,remaining:Math.max(0,Math.min(value.minutes*60000,Number(value.remaining)||0)),until:Number.isFinite(value.until)?Math.min(value.until,now()+value.minutes*60000):null,taskId:typeof value.taskId==='string'?value.taskId:null};
      }
    }catch{/* A corrupt timer must never prevent access to task records. */}
  }
  function save(){if(owner)try{storage.setItem(key(),JSON.stringify(session));}catch{/* Keep this session usable in memory. */}}
  function remaining(){return Math.max(0,Math.min(session.minutes*60000,session.until===null?session.remaining:session.until-now()));}
  function read(){
    sync();const left=remaining(),seconds=Math.ceil(left/1000);
    return {...session,remaining:left,running:session.until!==null&&left>0,ratio:left/(session.minutes*60000),clock:`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`};
  }
  function change(action,value){
    sync();if(!owner)return false;
    if(action==='start'){if(read().running)return true;session.remaining=remaining()||session.minutes*60000;session.until=now()+session.remaining;}
    else if(action==='pause'){session.remaining=remaining();session.until=null;}
    else if(action==='reset'){session.remaining=session.minutes*60000;session.until=null;}
    else if(action==='minutes'){
      if(!Number.isInteger(value)||value<1||value>1440)throw new Error('1~1440분 사이로 입력해 주세요.');
      const running=read().running;session.minutes=value;session.remaining=value*60000;session.until=running?now()+session.remaining:null;
    }else if(action==='select')session.taskId=value||null;
    else return false;
    save();return true;
  }
  function tick(){sync();if(session.until!==null&&remaining()===0){session.remaining=0;session.until=null;save();return true;}return false;}
  function reload(){owner=undefined;sync();}
  return {read,change,tick,reload};
}
