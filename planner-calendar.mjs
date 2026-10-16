const pad=n=>String(n).padStart(2,'0');
const fmtDate=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const parseDate=s=>new Date(...s.split('-').map((n,i)=>Number(n)-(i===1?1:0)));
const addDays=(d,n)=>{const next=new Date(d);next.setDate(next.getDate()+n);return next};
// ---------- Korean holidays ----------
const HOLIDAY_CACHE=new Map();
const lunarFormatter=(()=>{try{return new Intl.DateTimeFormat("en-u-ca-chinese",{month:"numeric",day:"numeric"})}catch(e){return null}})();
function lunarMD(date){
  if(!lunarFormatter)return null;
  const p=lunarFormatter.formatToParts(date);
  const m=Number(p.find(x=>x.type==="month")?.value),d=Number(p.find(x=>x.type==="day")?.value);
  return Number.isFinite(m)&&Number.isFinite(d)?{month:m,day:d}:null;
}
function findLunarDate(year,month,day){
  for(let d=new Date(year,0,1);d.getFullYear()===year;d=addDays(d,1)){
    const l=lunarMD(d); if(l&&l.month===month&&l.day===day)return new Date(d);
  } return null;
}
function addHoliday(map,date,name,kind){
  if(!date)return;
  const k=fmtDate(date),v=map.get(k)||{names:[],entries:[]};
  if(!v.names.includes(name))v.names.push(name);
  v.entries.push({name,kind});map.set(k,v);
}
function supportsWeekendSub(kind,year,dow){
  if(year>=2026)return ["national","buddha","labor","children","christmas"].includes(kind)&&(dow===0||dow===6) || (["seollal","chuseok"].includes(kind)&&dow===0);
  if(year>=2023)return ["national","buddha","children","christmas"].includes(kind)&&(dow===0||dow===6) || (["seollal","chuseok"].includes(kind)&&dow===0);
  return ["national","children"].includes(kind)&&(dow===0||dow===6) || (["seollal","chuseok"].includes(kind)&&dow===0);
}
function nextSub(from,map){
  let d=addDays(from,1),guard=0;
  while(guard++<20){if(d.getDay()!==0&&d.getDay()!==6&&!map.has(fmtDate(d)))return d;d=addDays(d,1)}return d;
}
function buildHolidays(year){
  if(HOLIDAY_CACHE.has(year))return HOLIDAY_CACHE.get(year);
  const map=new Map();
  [[1,1,"신정","newyear"],[3,1,"삼일절","national"],[5,5,"어린이날","children"],[6,6,"현충일","memorial"],[8,15,"광복절","national"],[10,3,"개천절","national"],[10,9,"한글날","national"],[12,25,"성탄절","christmas"]]
    .forEach(([m,d,n,k])=>addHoliday(map,new Date(year,m-1,d),n,k));
  if(year>=2026){addHoliday(map,new Date(year,4,1),"노동절","labor");addHoliday(map,new Date(year,6,17),"제헌절","national")}
  const s=findLunarDate(year,1,1);if(s){addHoliday(map,addDays(s,-1),"설날 연휴","seollal");addHoliday(map,s,"설날","seollal");addHoliday(map,addDays(s,1),"설날 연휴","seollal")}
  const b=findLunarDate(year,4,8);if(b)addHoliday(map,b,"부처님오신날","buddha");
  const c=findLunarDate(year,8,15);if(c){addHoliday(map,addDays(c,-1),"추석 연휴","chuseok");addHoliday(map,c,"추석","chuseok");addHoliday(map,addDays(c,1),"추석 연휴","chuseok")}
  const base=[...map.entries()].flatMap(([k,v])=>v.entries.map(e=>({date:parseDate(k),entry:e})));
  base.forEach(({date,entry})=>{
    if(!supportsWeekendSub(entry.kind,year,date.getDay()))return;
    const d=nextSub(date,map);addHoliday(map,d,`대체공휴일 (${entry.name.replace(" 연휴","")})`,"sub");
  });
  HOLIDAY_CACHE.set(year,map);return map;
}
export const getHoliday=d=>buildHolidays(d.getFullYear()).get(fmtDate(d))||null;

export function defaultPlannerMode(now=new Date()){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const part=type=>Number(parts.find(p=>p.type===type).value);
 const date=new Date(part('year'),part('month')-1,part('day'));
 return [0,6].includes(date.getDay())||getHoliday(date)?'personal':'work';
}
