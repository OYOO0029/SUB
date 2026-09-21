# MY WEEK 동기화 적용 안내

## 현재 상태

스케줄 전용 구현입니다. 가계부는 변경하지 않았습니다. 서버 URL·공개 키·실제 계정을 제공받지 않아 실제 Supabase 프로젝트 생성, SQL 실행, 실데이터 마이그레이션 및 기기 간 실제 통신은 아직 수행하지 않았습니다. 현재 main 배포는 유지하며 작업 브랜치에서 준비합니다.

## 파일

- `schedule.html`: 기존 저장 직후 알림, 상태 읽기/적용용 작은 연결부, 동기화 모듈 로드, 헤더 너비 계산만 추가했습니다. 저장 키 `myWeekPlanner_v5`, 일정 편집과 JSON 가져오기/내보내기 기능은 유지합니다.
- `schedule-sync.js`: 서버 설정, 로그인/가입/로그아웃, 세션 복구, Realtime, 상태 버튼과 모달. 공개 키만 허용하고 비밀번호는 따로 저장하지 않습니다.
- `schedule-sync-core.mjs`: 최초 저장 보호, 500ms debounce, 변경 직전 백업, 원격 반영과 충돌 관리. 테스트 가능한 별도 모듈입니다.
- `supabase-sync-setup.sql`: 사용자별 테이블/RLS/권한/서버 타임스탬프/Realtime 등록. 재실행해도 행은 삭제하지 않습니다.
- `tests/schedule-sync.test.mjs`, `tests/schedule-sync-browser.cjs`: 서버 모형 기반 테스트와 브라우저 통합 테스트.

## Supabase에서 직접 설정할 내용

1. 본인 Supabase 계정에서 프로젝트를 생성합니다.
2. SQL Editor에서 `supabase-sync-setup.sql` 전체를 실행합니다.
3. Authentication → Providers에서 Email 로그인을 사용합니다. 이메일 확인을 사용하는 경우 가입 확인 메일을 완료해야 합니다.
4. Authentication → URL Configuration의 Site URL 및 허용 Redirect URL에 `https://oyoo0029.github.io/SUB/schedule.html`을 설정합니다.
5. API 설정에서 Project URL과 Publishable key 또는 legacy anon key를 확인합니다. **service_role / secret key는 넣지 않습니다.**
6. Realtime publication에 `public.my_week_state`가 등록되어 있는지 확인합니다.
7. 배포 시 HTML, JS, MJS를 같은 폴더에 함께 배포합니다. `file://`로 HTML만 열면 브라우저의 모듈 제한 때문에 동기화 모듈을 읽지 못할 수 있습니다. 노션과 다른 기기는 공개 HTTPS 주소를 사용하세요.

서버 설정은 기기·브라우저 환경별로 한 번 입력해야 합니다. 공개 URL/key는 비밀 키가 아니지만 모든 환경에서 **같은 프로젝트**를 입력해야 합니다.

## 최초 Notion 마이그레이션: 이 순서를 지키세요

1. 현재 **최신 일정이 보이는 Notion 임베드**에서 기존 설정 → 데이터 → JSON 내보내기로 먼저 백업합니다. 직접 접속 페이지의 오래된 백업으로 대체하지 마세요.
2. 준비된 코드를 배포한 뒤, 기존 위치의 Notion 임베드를 새로고침합니다. 최신 일정이 여전히 보이는지 확인합니다.
3. 동기화(좁은 화면은 ⋮ 안) → 서버 설정에 Project URL·공개 키를 입력하고 저장합니다.
4. 이메일/비밀번호로 계정을 만들거나 로그인합니다. 이메일 확인 링크가 외부 브라우저에서 열려도 **Notion 임베드로 돌아와 로그인**합니다.
5. 서버가 비어 있고 실제 Notion 부모 출처와 기존 캐시가 확인되면, 원래 캐시와 현재 데이터를 먼저 로컬 보호 백업에 남긴 후 `INSERT`만 수행합니다. 기존 서버 행을 덮어쓰는 upsert는 하지 않습니다.
6. `동기화됨`을 확인한 다음 다른 기기에서 같은 서버/계정으로 로그인합니다.

Notion이 referrer/ancestor 정보를 숨기는 경우에는 ‘출처 확인 불가’로 자동 최초 업로드를 막습니다. 반드시 최신 내용이 보이는 **Notion 안에서** JSON 백업 후 ‘이 기기 데이터를 서버로 올리기’를 명시적으로 선택합니다. 모든 iframe을 Notion으로 간주하지 않습니다. 처음 실행한 샘플 데이터도 자동 최초 저장 대상에서 제외합니다.

서버에 이미 데이터가 있으면 그것을 우선 읽습니다. 로컬 내용은 교체 전에 보호 백업에 남습니다. 잘못된 서버에 연결하지 않았는지 반드시 확인하세요.

## 이후 사용

- PC·모바일·Notion에서 동일 프로젝트와 동일 이메일 계정으로 로그인합니다.
- 일정 수정은 먼저 로컬 저장/화면 반영 후 자동 서버 저장합니다. JSON 가져오기도 같은 저장 경로를 사용합니다.
- Realtime으로 변경을 받고 30초 주기, 화면 복귀, 온라인 복귀에도 재확인합니다.
- 작성 중인 편집창·드래그·실행 취소 기회가 있으면 원격 화면 반영을 잠시 미룹니다. 새로고침으로 입력창을 지우지 않습니다.
- 오프라인 변경은 사용자·프로젝트별 미전송 기록으로 보관합니다. 온라인 복귀 시 서버가 변경되지 않았으면 업로드합니다.
- 서버도 바뀌었으면 자동 덮어쓰기 대신 ‘확인 필요’를 표시합니다. 최신 서버 반영 또는 현재 기기 업로드를 선택합니다. 수동 업로드도 저장 직전 타임스탬프 조건으로 동시 쓰기를 검사합니다.

## 백업과 복구

- 기존 JSON 내보내기/불러오기는 그대로 사용할 수 있습니다.
- ‘현재 일정 JSON 백업’은 기존 JSON 불러오기로 복원 가능한 단일 state 파일입니다.
- ‘보호 백업 내보내기’는 `records` 배열에 여러 시점의 state를 담습니다. 복구할 record의 **state 객체만 별도 JSON 파일로 저장**하여 기존 JSON 불러오기로 가져옵니다. 계정 간 기록이 섞일 수 있으므로 기록의 key에 있는 프로젝트/사용자를 확인하세요.
- 보호 백업과 미전송 기록은 브라우저 데이터입니다. 브라우저 데이터를 지우면 사라지므로 파일로 내보내 별도 보관하세요. 공간이 가득 차 보호 백업을 만들 수 없으면 자동 원격 덮어쓰기를 중단합니다.
- 이 동기화는 전체 일정 스냅샷을 저장합니다. 자동 필드별 병합은 하지 않습니다. 정상 저장은 서버가 부여한 시간 기준으로 최신 상태가 되며, 오래된 기준의 자동 쓰기는 차단합니다.

## 테스트와 한계

`node --test --test-isolation=none tests/schedule-sync.test.mjs`

브라우저 테스트: Playwright 설치 후 `PLAYWRIGHT_MODULE`에 패키지 경로를 설정하고 `node tests/schedule-sync-browser.cjs` 실행. 현재 테스트의 Edge 경로는 Windows 기준입니다.

검증 항목: 기존 Notion 초기 데이터 보호, 빈 서버 직접 접속 차단(수정 후에도), 샘플 자동 시딩 금지, 다른 PC 다운로드, 두 클라이언트 변경 전달, 자기 이벤트 반복 저장 방지, 오프라인 재시작 복구, 동시 수정/최초 INSERT 경쟁, 잘못된 데이터·저장 공간 부족, 로그아웃 이후 늦은 응답, 수동 업로드/불러오기 백업, 모바일 모달, 실제 일정 저장→서버 어댑터 호출.

모형 테스트는 실제 Supabase Auth/RLS/Realtime의 종단 간 검증을 대체하지 않습니다. 실제 프로젝트 준비 후 반드시 다음을 별도로 확인하세요.

1. anon key만으로 테이블 조회·쓰기가 거절되는지.
2. 사용자 A가 사용자 B의 행을 조회·변경하지 못하는지.
3. 최신 Notion 데이터 최초 업로드 및 두 기기 실시간 수신.
4. 실제 Notion의 저장소/로그인 유지 제한과 모바일 브라우저별 iframe 동작.

참고 문서: https://supabase.com/docs/guides/database/postgres/row-level-security · https://supabase.com/docs/guides/realtime/postgres-changes · https://supabase.com/docs/reference/javascript/auth-onauthstatechange
