import test from 'node:test';
import assert from 'node:assert/strict';
import {createItem} from '../work/editing.js';
import {reminderTasks,planToday,complete} from '../work/model.js';
import {taskSections,moveToDay} from '../work/work-view.js';
const empty=()=>({schemaVersion:1,projects:[],works:[],tasks:[],personal:[],tracker:{}});
const day='2030-10-16',yesterday='2030-10-15';

test('quick-added unfinished task stays in the next day list without setting a reminder or changing its plan',()=>{
 const data=empty(),task=createItem(data,'task','할 일 추가',{date:yesterday}),before=structuredClone(task);
 assert.equal(task.remindFrom,null);assert.ok(taskSections(data,yesterday).planned.includes(task));
 assert.ok(taskSections(data,day).planned.includes(task));assert.deepEqual(reminderTasks(data,day),[]);
 assert.deepEqual(task,before);
 task.due='2030-10-20';assert.ok(taskSections(data,day).planned.includes(task));assert.deepEqual(taskSections(data,day).overdue,[]);
});
test('only an explicit reminder alerts; listing and acknowledgment never move or complete the task',()=>{
 const data=empty(),task=createItem(data,'task','직접 알림 설정',{date:day});
 assert.deepEqual(reminderTasks(data,day),[]);task.remindFrom=day;
 assert.ok(reminderTasks(data,day).includes(task));assert.ok(taskSections(data,day).planned.includes(task));
 task.reminderAcknowledgedOn=day;assert.deepEqual(reminderTasks(data,day),[]);assert.ok(taskSections(data,day).planned.includes(task));assert.equal(task.status,'todo');
 assert.ok(reminderTasks(data,'2030-10-17').includes(task));
 task.remindFrom=null;assert.deepEqual(reminderTasks(data,'2030-10-17'),[]);assert.ok(taskSections(data,'2030-10-17').planned.includes(task));
});
test('deadline today remains a task and does not imply a reminder; overdue classification requires the actual deadline',()=>{
 const data=empty(),task=createItem(data,'task','마감 확인',{date:yesterday});task.plans=[];task.due=day;
 assert.ok(taskSections(data,day).planned.includes(task));assert.deepEqual(reminderTasks(data,day),[]);
 task.due=yesterday;assert.ok(taskSections(data,day).overdue.includes(task));assert.ok(!taskSections(data,day).planned.includes(task));
 moveToDay(data,day,task.id);assert.equal(task.due,yesterday);assert.ok(taskSections(data,day).planned.includes(task));assert.deepEqual(taskSections(data,day).overdue,[]);assert.deepEqual(reminderTasks(data,day),[]);
});
test('future rescheduling is respected; completed, cancelled and trashed tasks do not carry forward',()=>{
 const data=empty(),task=createItem(data,'task','다음 일정',{date:yesterday});planToday(task,'2030-10-18');
 assert.deepEqual(taskSections(data,day).planned,[]);assert.deepEqual(reminderTasks(data,day),[]);
 // Imported plans can retain a past segment alongside a future segment.
 task.plans[0].state='active';assert.deepEqual(taskSections(data,day).planned,[]);
 task.plans=[task.plans[0]];task.remindFrom='2030-10-18';assert.ok(taskSections(data,day).planned.includes(task));assert.deepEqual(reminderTasks(data,day),[]);
 for(const status of ['done','cancelled']){task.status=status;assert.deepEqual(taskSections(data,day).planned,[]);assert.deepEqual(reminderTasks(data,day),[]);}
 task.status='todo';task.deletedAt=day;assert.deepEqual(taskSections(data,day).planned,[]);
 task.deletedAt=null;complete(task,day);assert.deepEqual(taskSections(data,day).planned,[]);assert.ok(taskSections(data,day,true).planned.includes(task));
});
