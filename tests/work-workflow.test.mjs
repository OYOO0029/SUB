import test from 'node:test';
import assert from 'node:assert/strict';
import {executionSections,removeFromDay,moveTaskDate,projectSummary} from '../work/workflow.js';
import {planToday,isPlanned} from '../work/model.js';
import {calendarWeeks,workCalendarDays} from '../work/calendar-layout.js';
const task=(id,extra={})=>({id,title:id,status:'todo',plans:[],blocks:[],checks:[],tags:[],due:null,...extra});
test('removing a day splits a range and retains history, other times, due and relationships',()=>{
 const t=task('a',{workId:'w',due:'2026-10-23',plans:[{id:'p',state:'active',start:'2026-10-18',end:'2026-10-22'}],blocks:[{id:'b',date:'2026-10-20',start:'09:00',end:'10:00'},{id:'c',date:'2026-10-21',start:'09:00',end:'10:00'}]});
 removeFromDay(t,'2026-10-20');assert.equal(isPlanned(t,'2026-10-20'),false);assert.equal(isPlanned(t,'2026-10-19'),true);assert.equal(isPlanned(t,'2026-10-21'),true);assert.equal(t.plans[0].state,'superseded');assert.equal(t.blocks.length,1);assert.equal(t.workId,'w');assert.equal(t.due,'2026-10-23');
 planToday(t,'2026-10-20');assert.equal(t.excludedDates.length,0);assert.equal(isPlanned(t,'2026-10-20'),true);
});
test('moving schedule preserves due and time and refuses invalid or colliding destination without mutation',()=>{
 const t=task('a',{due:'2026-10-19',plans:[{id:'p',state:'active',start:'2026-10-18',end:'2026-10-18'}],blocks:[{id:'b',date:'2026-10-18',start:'09:00',end:'10:00'}]});
 moveTaskDate(t,'2026-10-18','2026-10-20');assert.equal(t.due,'2026-10-19');assert.equal(t.blocks[0].date,'2026-10-20');assert.equal(t.blocks[0].start,'09:00');assert.equal(isPlanned(t,'2026-10-18'),false);
 const before=structuredClone(t);assert.throws(()=>moveTaskDate(t,'2026-10-20','2026-02-30'));assert.deepEqual(t,before);
 t.blocks.push({id:'c',date:'2026-10-21',start:'11:00',end:'12:00'});const collision=structuredClone(t);assert.throws(()=>moveTaskDate(t,'2026-10-20','2026-10-21'));assert.deepEqual(t,collision);
});
test('execution sections never duplicate overdue planned tasks and respect explicit exclusion',()=>{
 const a=task('a',{due:'2026-10-17'});planToday(a,'2026-10-18');const b=task('b',{due:'2026-10-17'}),c=task('c',{due:'2026-10-19'}),d=task('d',{due:'2026-10-18'});removeFromDay(d,'2026-10-18');
 const s=executionSections({tasks:[a,b,c,d]},'2026-10-18');assert.deepEqual(s.planned.map(t=>t.id),['a']);assert.deepEqual(s.overdue.map(t=>t.id),['b']);assert.deepEqual(s.upcoming.map(t=>t.id),['c']);
});
test('project next action is explicitly pinned or earliest due, ignores completed pins and includes direct children',()=>{
 const p={id:'p',nextTaskId:'b'},a=task('a',{projectId:'p',due:'2026-10-19'}),b=task('b',{workId:'w'});const data={projects:[p],works:[{id:'w',projectId:'p'}],tasks:[a,b]};
 assert.equal(projectSummary(data,p).next,b);assert.equal(projectSummary(data,p).explicit,true);b.status='done';assert.equal(projectSummary(data,p).next,a);assert.equal(projectSummary(data,p).explicit,false);a.due=null;assert.equal(projectSummary(data,p).next,null);
});
test('calendar layers independently expose plan and deadline without modifying either',()=>{
 const t=task('a',{due:'2026-10-19'});planToday(t,'2026-10-19');const before=structuredClone(t),days=workCalendarDays('2026-10-19');
 assert.equal(calendarWeeks([t],days,3,{plans:false,due:true})[0].segments[0].kind,'deadline');assert.equal(calendarWeeks([t],days,3,{plans:true,due:false})[0].segments[0].due,null);assert.equal(calendarWeeks([t],days,3,{plans:false,due:false})[0].segments.length,0);assert.deepEqual(t,before);
});
