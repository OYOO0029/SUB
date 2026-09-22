# 가계부 v8.24 동기화 유지보수

기존 공개 주소 `https://oyoo0029.github.io/SUB/`를 유지한다. Supabase 프로젝트/앱 로그인은 스케줄과 같고, 테이블은 `spending_state`로 분리한다.

## 파일 책임

- `index.html`: 가계부 UI, 계산, 검증, 저장. 성공한 `save()`가 `spending-local-save` 이벤트를 발생시킨다.
- `spending-bridge.js`: HTML의 상태/검증/렌더링을 외부 동기화에 연결하는 유일한 어댑터.
- `spending-sync.js`: 계정, 최초 데이터 선택, Realtime, 로그인 모달.
- `sync-core.mjs`: 두 앱 공통 스냅샷 엔진. 서버 타임스탬프를 조건으로 저장하고 충돌/오프라인/백업을 관리한다. 앱별 validator와 namespace를 주입한다.
- `schedule-sync-core.mjs`: 기존 스케줄 import 경로를 유지하는 재내보내기 파일.
- `sync-config.mjs`: 두 앱 공통 공개 URL/key 및 SDK 버전. 비밀 키 금지.
- `spending-sync-setup.sql`: 재실행 가능한 테이블/RLS/타임스탬프/Realtime 설정.

## 새 HTML 교체 시 필수 연결

1. 상태 변수와 계산 함수는 HTML 안에 유지한다. 어댑터가 사용하는 이름이 바뀌면 bridge만 수정한다.
2. 성공한 저장 직후 `window.dispatchEvent(new Event('spending-local-save'))`가 필요하다. 일반 저장, JSON 가져오기, 복원 취소를 모두 확인한다.
3. HTML 끝에서 `spending-bridge.js` 일반 스크립트와 `spending-sync.js` 모듈을 순서대로 읽는다.
4. 기존 localStorage storage 이벤트 및 시계 기반 자동 동기화는 `window.spendingCloudManaged`가 true일 때 실행하지 않는다.
5. 기존 원격 어댑터를 중복 등록하지 않는다. 이 버전은 공통 엔진이 서버 변경 시점과 충돌을 관리한다.
6. 개인정보가 담긴 DEFAULT_TX, DEFAULT_STATE, 은행 거래 추가 코드 등을 공개 HTML에 포함하지 않는다. 데이터가 없는 새 브라우저는 빈 상태로 시작한다. 기존 브라우저 데이터는 보존한다.

## 최초 연결과 데이터

로그인만으로 최초 업로드/다운로드하지 않는다. 최신 데이터 JSON을 확보하고, 계정별로 한 번 ‘현재 데이터로 연결’ 또는 ‘서버 데이터로 연결’을 선택한다. 같은 브라우저/출처에서는 기존 Supabase 세션을 공유할 수 있지만, 노션·다른 기기는 별도 로그인이 필요할 수 있다.

첨부 v8.24가 최신이라는 사용자 확인에 따라 원본 HTML을 실행하여 41건과 설정을 추출했다. 백업은 저장소 밖 `../spending-v824-source-backup.json`에 있으며 공개 Git에 넣지 않는다.

가계부 백업은 `{app:'spending-dashboard',version:'8.24',state:...}` 형식이다. 기존 ‘백업 · 데이터’에서 가져온 뒤 연결한다. 보호 백업 파일은 records 배열로, 복구 대상의 state만 추출해 기존 가져오기에 넣는다.

## 충돌과 한계

전체 상태를 한 번에 저장하며 금액을 자동 병합하지 않는다. 미전송 데이터는 사용자/프로젝트별 pending 키에 저장한다. 로그인 전·연결 전 변경은 별도 UNSENT 표식으로 보존하고 명시적 선택을 요구한다. 새로고침 시 앱의 정규화/메타데이터 변경으로 미전송 내용이 달라지면 안전을 위해 수동 확인이 필요할 수 있다.

원격 반영은 편집 모달과 드래그 중에 미룬다. 원격 반영 후 이전 삭제 취소 목록은 초기화한다. 원본은 적용 전 보호 백업에 남는다. 저장 공간이 부족하면 덮어쓰기를 중단한다. 브라우저 데이터를 지우면 로컬 백업과 미전송 기록도 지워지므로 파일 백업을 보관한다.

## 검증

`node --test --test-isolation=none tests/schedule-sync.test.mjs`

`node tests/schedule-sync-browser.cjs`

`node tests/spending-sync-browser.cjs`

가계부 브라우저 테스트는 현재 Windows의 원본 파일과 Edge/Playwright 경로를 사용한다. 원본 경로를 바꾸면 테스트 상단 source를 수정한다. 모의 서버 테스트와 실제 계정 두 탭 전송·수신 검증은 구분한다. 실제 휴대폰 검증은 별도다.
