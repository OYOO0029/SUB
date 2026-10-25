export const DAY_START=480,DAY_END=1140;
export const minute=value=>Number(value.slice(0,2))*60+Number(value.slice(3,5));
export const time=value=>`${String(Math.floor(value/60)).padStart(2,'0')}:${String(value%60).padStart(2,'0')}`;
export function koreaClock(now=new Date()){
  return minute(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hour12:false}).format(now));
}
export function timelineRows(tasks,date,clock){
  const events=tasks.flatMap(task=>task.blocks.filter(b=>b.date===date).map(block=>({task,block,start:minute(block.start),end:minute(block.end)}))).filter(e=>e.end>DAY_START&&e.start<DAY_END).sort((a,b)=>a.start-b.start);
  const clusters=[],rows=[];
  for(const event of events){
    // Display legacy minute values on the nearest 10-minute rail, without editing them.
    const start=Math.max(DAY_START,Math.floor(event.start/10)*10),end=Math.min(DAY_END,Math.ceil(event.end/10)*10),last=clusters.at(-1);
    if(last&&start<last.end){last.end=Math.max(last.end,end);last.events.push(event);}
    else clusters.push({type:'events',start,end,events:[event]});
  }
  function gap(start,end){
    const current=Math.floor(clock/10)*10;
    if(current>=start&&current<end){if(start<current)rows.push({type:'gap',start,end:current});rows.push({type:'gap',start:current,end:current+10});if(current+10<end)rows.push({type:'gap',start:current+10,end});}
    else rows.push({type:'gap',start,end});
  }
  let cursor=DAY_START;
  for(const row of clusters){if(row.start>cursor)gap(cursor,row.start);rows.push(row);cursor=row.end;}
  if(cursor<DAY_END)gap(cursor,DAY_END);
  return rows;
}
