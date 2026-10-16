import {today,addDays} from '../work/model.js';
export function reminderFixture(){
 const date=today();
 return {schemaVersion:1,projects:[{id:'fixture-project',title:'리마인드 검증',start:null,end:null,stage:'',stages:[],tags:[],notes:''}],works:[],personal:[],tracker:{},tasks:Array.from({length:9},(_,i)=>({id:'reminder-fixture-'+i,title:i===0?'테스트 서류 확인':i===1?'긴 제목 확인 · 여러 항목이 있어도 제목과 버튼이 겹치지 않고 내용을 끝까지 읽을 수 있는 리마인드':'테스트 리마인드 '+(i+1),projectId:'fixture-project',workId:null,status:'todo',due:addDays(date,i+1),remindFrom:date,plans:[],blocks:[],checks:[],tags:[],notes:''}))};
}
