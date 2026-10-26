export function statusFilter(value,attribute,label,{cancelled=false}={}){
 const options=[['all','전체'],['active','미완료'],['done','완료'],...(cancelled?[['cancelled','취소']]:[])];
 return `<select class="ux-status-filter" ${attribute} aria-label="${label}">${options.map(([v,l])=>`<option value="${v}" ${value===v?'selected':''}>${l}</option>`).join('')}</select>`;
}
