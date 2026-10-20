# MoneyLog

with 바이브코딩

가계부 착착의 JSON 백업을 브라우저에서 분석하는 개인용 소비 대시보드입니다. React · TypeScript · Vite · Recharts로 구현했습니다. 백업 파일을 서버에 보내거나 브라우저 저장소에 저장하지 않습니다. 새로고침하면 다시 파일을 선택해야 합니다.

## 실행

Node.js 24 LTS와 npm이 필요합니다.

```sh
npm ci
npm run dev
```

터미널에 표시되는 로컬 주소를 PC 브라우저에서 엽니다. 기본적으로 `127.0.0.1`에만 바인딩됩니다.

```sh
npm test           # 데이터 처리 단위 테스트
npm run build     # TypeScript 검사 및 프로덕션 빌드
npm run preview   # 빌드 결과 확인
```

브라우저 통합 테스트:

```sh
npx playwright install chromium
npm run test:e2e
```

기존 Chromium을 사용하려면 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`에 실행 파일 경로를 지정합니다. 이 클라우드 환경에서는 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e`로 실행할 수 있습니다.

## GitHub Pages에서 사용

저장소의 **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 선택합니다. `main`에 푸시하면 `Deploy to GitHub Pages` 워크플로가 의존성 설치, 테스트, 빌드를 거쳐 `dist`만 게시합니다. Source를 변경한 뒤 자동 배포가 시작되지 않으면 **Actions → Deploy to GitHub Pages → Run workflow**를 실행합니다.

배포가 성공하면 `https://dbsalsrb04.github.io/moneyLog/`로 접속합니다. 사이트에서 선택한 가계부 파일은 호스팅 서버로 전송되지 않고 브라우저에서 처리됩니다.

원본 저장소를 `Deploy from a branch`로 직접 게시하면 `index.html`이 빌드 전 `/src/main.tsx`를 요청해 오류가 발생합니다. Vite의 빌드 결과를 게시해야 합니다. 빌드의 asset 경로는 상대 경로로 설정하여 `/moneyLog/` 아래에서도 읽을 수 있습니다.

## 구현 기능

- 파일 선택 또는 업로드 영역으로 JSON 파일 드래그 앤 드롭. 한 번에 파일 하나만 처리하며 두 방식에 동일한 검증을 적용합니다.
- JSON 파일 검증, 오류 안내, 파일 교체. 잘못된 새 파일은 기존 분석을 덮어쓰지 않습니다.
- 전체 거래와 원본 테이블을 메모리에 보존합니다. 수입(R)·지출(E)·저축(D)·기록(O) 버튼으로 해당 유형만 월별·일별 집계하며 기본 선택은 지출입니다.
- **모든 거래 중 가장 최근 `dateKey`** 기준 최근 12·6·3개월, 빈 월도 0원 표시.
- 월 선택과 월별 막대 클릭으로 일별 조회, 월의 모든 날짜 포함, 윤년 지원.
- 카테고리·태그별 다중 선택과 전체 상태 자동 전환. 필터 변경 시 두 차트에 동시에 반영하며 기간과 조회 월 유지.
- 그룹 안 OR, 그룹 사이 AND. 선택 태그가 여러 개 일치해도 거래당 한 번만 합산.
- 상위 카테고리 자체 및 `/` 경계 아래 모든 하위 카테고리 포함, 하위 개별 선택.
- 현재 선택한 거래 유형의 전체 기록에서 사용된 카테고리·태그만 표시합니다. 메타데이터에만 있는 미사용 항목은 숨기며, 현재 기간·필터와 무관하게 목록은 유지됩니다. 유형 전환 시 필터는 전체로 초기화하고 기간·조회 월은 유지합니다.
- 카테고리는 처음에는 상위 분류만 표시하며 오른쪽 화살표로 각 단계의 하위 분류를 접거나 펼칩니다. 접어도 선택 상태와 집계는 유지됩니다. 메타데이터와 원본 거래는 보존합니다.
- `■식비` 같은 이름은 변환하지 않고 독립된 원본 이름으로 보존합니다. 계층은 `/`로만 판별합니다.
- 원화 툴팁, 접근 가능한 금액 표 및 키보드 월 선택, 반응형 레이아웃.

거래의 `id`, `part`, `category`, `amount`(유한 숫자), `tags`(문자열 배열), 유효한 `dateKey`가 필요합니다. 잘못된 거래를 조용히 제외하지 않고 행 번호와 함께 파일 전체를 거부합니다. 메모 누락은 빈 문자열로 읽으며 원본은 수정하지 않습니다. `dateAt` 등 타임스탬프를 날짜 변환에 사용하지 않습니다. 선택한 유형에 거래가 없으면 0원 차트를 표시합니다.

## 주요 구조

```text
src/
  data.ts                       파싱·검증·필터·목록 추출·날짜 집계 (순수 함수)
  data.test.ts                  필터 조건, 원본 보존, 날짜 경계값 테스트
  App.tsx                       파일 업로드·공유 상태·대시보드 구성
  components/FileUpload.tsx     파일 선택·드래그 앤 드롭
  components/FilterPanel.tsx    카테고리 / 태그 선택 UI
  components/CategoryTree.tsx   다단계 카테고리 접기·펼치기
  components/SpendingChart.tsx  공통 막대그래프·툴팁·금액 표
  styles.css                    대시보드 및 반응형 스타일
  main.tsx                      React 진입점
tests/dashboard.spec.ts         업로드·필터·파일 교체·모바일 브라우저 테스트
```

실제 백업의 거래 및 `categoryName`/`tagName` 구조는 제공된 JSON 예시로 확인했습니다. 테스트는 개인정보가 없는 합성 거래를 사용하며 개인 백업은 저장소에 포함하지 않습니다.
