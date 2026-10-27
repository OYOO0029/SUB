import {choiceSelect} from './ui-components.js?v=20261027-project-tabs-1';
export function statusFilter(value,attribute,label,{cancelled=false}={}){
 return choiceSelect(value,[['all','전체'],['active','미완료'],['done','완료'],...(cancelled?[['cancelled','취소']]:[])],attribute,label);
}
