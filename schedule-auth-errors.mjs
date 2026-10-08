export function authErrorMessage(error){
 const code=error?.code,message=String(error?.message||'');
 if(code==='invalid_credentials')return '이메일 또는 비밀번호를 확인해 주세요.';
 if(code==='email_not_confirmed')return '가입한 이메일의 확인 링크를 누른 뒤 다시 로그인해 주세요.';
 if(code==='over_request_rate_limit'||error?.status===429)return '요청이 많습니다. 잠시 후 다시 시도해 주세요.';
 if(error?.name==='AbortError'||/abort|timeout/i.test(message))return '연결 시간이 초과됐습니다. 입력한 기록은 유지됩니다. 다시 시도해 주세요.';
 if(/failed to fetch|network|load failed|fetch failed/i.test(message))return '로그인 서버에 연결하지 못했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.';
 if(code==='42501')return '이 계정의 데이터 접근 권한을 확인할 수 없습니다. 저장을 중지했습니다.';
 return message||'연결하지 못했습니다. 다시 시도해 주세요.';
}
