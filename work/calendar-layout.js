import {addDays,isPlanned} from './model.js?v=20261026-controls-1';

// Work calendars start Sunday; personal calendar defaults stay independent.
export function workCalendarDays(date,monthly=false){
  const anchor=monthly?date.slice(0,8)+'01':date;
  const start=addDays(anchor,-new Date(anchor+'T12:00:00Z').getUTCDay());
  return Array.from({length:monthly?42:7},(_,i)=>addDays(start,i));
}

// Allocate one lane to each continuous period, split only at week boundaries.
// A deadline outside a plan is a separate marker and never extends that plan.
export function calendarWeeks(tasks,days,maxVisible=Infinity,{plans=true,due=true}={}){
  const weeks=[];
  for(let offset=0;offset<days.length;offset+=7){
    const dates=days.slice(offset,offset+7),segments=[];
    for(const task of tasks){
      for(let day=0;day<dates.length;day++){
        if(!plans||!isPlanned(task,dates[day]))continue;
        const start=day;
        while(day+1<dates.length&&isPlanned(task,dates[day+1]))day++;
        segments.push({task,start,end:day,kind:'plan',
          continuesBefore:isPlanned(task,addDays(dates[start],-1)),
          continuesAfter:isPlanned(task,addDays(dates[day],1)),
          due:due&&task.due>=dates[start]&&task.due<=dates[day]?task.due:null});
      }
      const dueIndex=dates.indexOf(task.due);
      if(due&&dueIndex>=0&&(!plans||!isPlanned(task,task.due)))segments.push({task,start:dueIndex,end:dueIndex,kind:'deadline',due:task.due});
    }
    segments.sort((a,b)=>a.start-b.start||(b.end-b.start)-(a.end-a.start)||a.task.title.localeCompare(b.task.title,'ko')||a.task.id.localeCompare(b.task.id));
    const lanes=[],dayTasks=dates.map(()=>[]),hidden=dates.map(()=>[]);
    for(const segment of segments){
      let lane=lanes.findIndex(occupied=>occupied.every((used,day)=>!used||day<segment.start||day>segment.end));
      if(lane<0){lane=lanes.length;lanes.push(Array(7).fill(false));}
      segment.lane=lane;
      for(let day=segment.start;day<=segment.end;day++){
        lanes[lane][day]=true;
        dayTasks[day].push(segment.task);
        if(lane>=maxVisible)hidden[day].push(segment.task);
      }
    }
    const visible=segments.filter(s=>s.lane<maxVisible);
    // Keep each day's add control just below its last visible bar, even when
    // a continuing bar occupies a higher lane than the day's task count.
    const addRows=dates.map((_,day)=>visible.reduce((row,s)=>s.start<=day&&s.end>=day?Math.max(row,s.lane+1):row,0));
    weeks.push({dates,segments:visible,laneCount:lanes.length,dayTasks,hidden,addRows});
  }
  return weeks;
}

export function monthLaneCapacity(height,weekCount){return Math.max(0,Math.min(3,Math.floor(((height-34)/weekCount-40)/24)));}
