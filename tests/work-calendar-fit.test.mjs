import test from 'node:test';
import assert from 'node:assert/strict';
import {monthLaneCapacity,calendarWeeks,workCalendarDays} from '../work/calendar-layout.js';
test('compact month keeps overflow accessible without changing plans',()=>{
 assert.equal(monthLaneCapacity(520,6),1);assert.equal(monthLaneCapacity(900,6),3);assert.equal(monthLaneCapacity(300,6),0);
 const tasks=Array.from({length:6},(_,i)=>({id:String(i),title:'task '+i,due:'2026-10-19',plans:[],blocks:[]}));
 for(const limit of [0,1,2,3]){
  const week=calendarWeeks(tasks,workCalendarDays('2026-10-19'),limit)[0],day=week.dates.indexOf('2026-10-19');
  assert.equal(week.segments.length,limit);assert.equal(week.hidden[day].length,6-limit);assert.equal(week.dayTasks[day].length,6);
 }
 assert.ok(tasks.every(t=>t.due==='2026-10-19'&&t.plans.length===0));
});
