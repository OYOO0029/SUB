import test from 'node:test';
import assert from 'node:assert/strict';
import {dailyReminderGate,todayReminders} from '../work/reminders.js';
import {planToday} from '../work/model.js';
const storage=()=>{const map=new Map();return {getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};};
const visit={scope:'account-a',date:'2030-10-14',ready:true,hasItems:true,busy:false};
test('first visit opens once; refreshing, another tab and another reminder do not reopen it',()=>{
 const store=storage(),gate=dailyReminderGate(store);assert.equal(gate.shouldOpen(visit),true);
 assert.equal(gate.shouldOpen(visit),false);assert.equal(dailyReminderGate(store).shouldOpen(visit),false);
 assert.equal(gate.shouldOpen({...visit,date:'2030-10-15'}),true);
 assert.equal(gate.shouldOpen({...visit,scope:'account-b'}),true);
});
test('empty first visit is quiet and later additions stay manual',()=>{
 const gate=dailyReminderGate(storage());assert.equal(gate.shouldOpen({...visit,hasItems:false}),false);
 assert.equal(gate.shouldOpen(visit),false);
});
test('loading, signed out, background and editing never consume the first eligible popup',()=>{
 const gate=dailyReminderGate(storage());
 for(const args of [{ready:false},{scope:null},{busy:true}])assert.equal(gate.shouldOpen({...visit,...args}),false);
 assert.equal(gate.shouldOpen(visit),true);
});
test('manual opening prevents automatic repetition and blocked storage works for the current page',()=>{
 const gate=dailyReminderGate({getItem(){throw Error();},setItem(){throw Error();}});
 gate.mark(visit.scope,visit.date);assert.equal(gate.shouldOpen(visit),false);
 assert.equal(gate.shouldOpen({...visit,date:'2030-10-15'}),true);
 assert.equal(gate.shouldOpen({...visit,date:'2030-10-15'}),false);
});
test('reminders use actual day eligibility; acknowledgment and today planning preserve original tasks',()=>{
 const make=(id,extra={})=>({id,title:id,status:'todo',due:'2030-10-16',remindFrom:'2030-10-14',plans:[],blocks:[],checks:[],...extra});
 const data={tasks:[make('later'),make('due',{due:'2030-10-14'}),make('done',{status:'done'}),make('cancelled',{status:'cancelled'}),make('deleted',{deletedAt:'date'}),make('future',{remindFrom:'2030-10-15'}),make('planned',{plans:[{id:'p',start:visit.date,end:visit.date,state:'active'}]})]};
 assert.deepEqual(todayReminders(data,visit.date).map(t=>t.id),['due','later','planned']);
 const later=data.tasks[0];later.reminderAcknowledgedOn=visit.date;
 assert.deepEqual(todayReminders(data,visit.date).map(t=>t.id),['due','planned']);
 assert.ok(todayReminders(data,'2030-10-15').includes(later));assert.equal(later.status,'todo');assert.equal(later.deletedAt,undefined);
 const due=data.tasks[1];planToday(due,visit.date);planToday(due,visit.date);
 assert.equal(due.due,visit.date);assert.equal(due.plans.length,1);assert.equal(data.tasks.length,7);assert.deepEqual(todayReminders(data,visit.date).map(t=>t.id),['due','planned']);
});
