import test from 'node:test';
import assert from 'node:assert/strict';
import {commitSnapshot} from '../schedule-save.mjs';
import {emptyWorkState} from '../work/work-account.mjs';
import {createItem,updateItem} from '../work/editing.js';
import {taskContext,taskStart,taskDay,isPlanned,isVisible} from '../work/model.js';
import {executionSections,projectTasks} from '../work/workflow.js';
import {taskSections,taskFilter,searchEntities} from '../work/work-view.js';
import {calendarWeeks,workCalendarDays} from '../work/calendar-layout.js';
import {validate} from '../work/repository.js';
function fixture(){const d=emptyWorkState(),a=createItem(d,'project','A'),b=createItem(d,'project','B'),w=createItem(d,'work','work',{projectId:a.id}),t=createItem(d,'task','task',{workId:w.id});return{d,a,b,w,t};}
test('legacy dual ownership has one effective project across list, search and project detail without mutation',()=>{const{d,a,b,w,t}=fixture();t.projectId=b.id;const before=JSON.stringify(d);assert.equal(taskContext(d,t).project.id,a.id);assert(projectTasks(d,a.id).includes(t));assert(!projectTasks(d,b.id).includes(t));assert(taskFilter(d,t,{project:a.id}));assert.equal(searchEntities(d,'task','tasks',{project:b.id}).length,0);assert.equal(JSON.stringify(d),before);updateItem(d,'task',t.id,{workId:w.id});assert.equal(t.projectId,null);validate(d);});
test('all relation edits reject conflicting parents and canonicalize only the edited task',()=>{const{d,a,b,w,t}=fixture();const before=JSON.stringify(d);assert.throws(()=>updateItem(d,'task',t.id,{projectId:b.id,workId:w.id}),/소속/);assert.equal(JSON.stringify(d),before);assert.throws(()=>createItem(d,'task','bad',{projectId:b.id,workId:w.id}),/소속/);assert.equal(JSON.stringify(d),before);updateItem(d,'task',t.id,{workId:null});assert.equal(t.projectId,a.id);assert.equal(t.workId,null);updateItem(d,'task',t.id,{projectId:b.id});assert.equal(taskContext(d,t).project.id,b.id);});
test('date adapters preserve legacy periods, explicit undated tasks, exclusions and calendar deadline markers',()=>{
 const{d,t}=fixture();t.plans=[{id:'p',start:'2026-10-27',end:'2026-10-29',state:'active'}];t.due='2026-11-02';
 for(const explicit of [false,true]){if(explicit)t.startDate=null;const before=JSON.stringify(t);for(const day of ['2026-10-26','2026-10-27','2026-10-30']){const interpreted=taskDay(t,day,true);assert.equal(executionSections(d,day,true).planned.includes(t),interpreted.section==='planned');assert.equal(taskSections(d,day,true).planned.includes(t),interpreted.listSection==='planned');const weeks=calendarWeeks([t],workCalendarDays(day),Infinity,{due:false});assert.equal(weeks[0].dayTasks[weeks[0].dates.indexOf(day)].includes(t),isPlanned(t,day));}assert.equal(taskStart(t),explicit?null:'2026-10-27');assert.equal(JSON.stringify(t),before);}
 t.startDate='2026-10-27';t.excludedDates=['2026-10-28'];assert.equal(isVisible(t,'2026-10-28',true),false);assert.equal(executionSections(d,'2026-10-28').planned.length,0);const weeks=calendarWeeks([t],workCalendarDays('2026-11-02'),Infinity,{plans:false});assert.equal(weeks[0].segments[0].kind,'deadline');
});
test('shared save boundary reports failure before sync, retains caller input and emits once on successful retry',()=>{const value={nested:{title:'retained'}},before=structuredClone(value);let fail=true,emits=0;const results=[];const options={write(){if(fail)throw Error('quota')},onResult:r=>results.push(r),emit:()=>emits++};assert.deepEqual(commitSnapshot(value,options),{ok:false,error:'quota'});assert.equal(emits,0);assert.deepEqual(value,before);fail=false;assert.equal(commitSnapshot(value,options).ok,true);assert.equal(emits,1);assert.deepEqual(results.map(r=>r.ok),[false,true]);});
