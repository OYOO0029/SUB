// Older finance uploads own the root, but must retain the sibling applications.
export function preserveAppSlots(incoming,remote){
 const result=structuredClone(incoming);
 for(const key of ['myWeekV1','myWorkV1','mySpendingV1']){
  if(Object.hasOwn(remote||{},key))result[key]=structuredClone(remote[key]);
  else delete result[key];
 }
 return result;
}
