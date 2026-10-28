// Shared local commit boundary. Cloud sync starts only after durable local success.
export function commitSnapshot(value,{write,emit=()=>{},onResult=()=>{}}){
 let result;
 try{write(value);result={ok:true,error:''};}catch(error){result={ok:false,error:error?.message||'기기에 저장하지 못했습니다. 현재 입력을 유지합니다.'};}
 onResult(result);
 if(result.ok)emit();
 return result;
}
