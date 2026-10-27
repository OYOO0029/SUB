import {choiceSelect} from './ui-components.js?v=20261027-entry-align-2';
export function statusFilter(value,attribute,label,{cancelled=false}={}){
 return choiceSelect(value,[['all','전체'],['active','미완료'],['done','완료'],...(cancelled?[['cancelled','취소']]:[])],attribute,label);
}
