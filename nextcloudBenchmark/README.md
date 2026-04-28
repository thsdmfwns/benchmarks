# Nextcloud UX Lighthouse Benchmark

Playwright로 Nextcloud UI를 조작하고, Lighthouse user-flow timespan으로 각 UX 구간을 기록하는 벤치마크 하네스입니다. 핵심 KPI는 각 액션의 실제 체감 대기시간(`elapsedMs`)이며, Lighthouse 점수와 TBT/CLS는 진단 보조 지표로 함께 저장합니다.

## 포함된 측정 단계

1. `login_to_files`
2. `open_folder`
3. `search_in_folder`
4. `sort_in_folder`
5. `open_image_preview`
6. `open_pdf_preview`
7. `open_photos`

## 사전 조건

- Nextcloud가 로컬에서 `http://localhost:8080/`으로 접근 가능해야 합니다.
- 벤치마크 전용 계정에 fixture 데이터가 미리 올라와 있어야 합니다.
- 대상 폴더 안에는 검색/정렬이 의미 있게 보일 만큼 파일이 있어야 합니다.
- 같은 폴더 안에 이미지 1개 이상, PDF 1개 이상이 있어야 합니다.
- Photos 앱에서 인덱싱된 이미지가 `minPhotosCount` 이상 보여야 합니다.
- Chromium이 설치되어 있어야 합니다.

브라우저 설치:

```powershell
npx playwright install chromium
```

## 설치

```powershell
npm install
```

## 설정 파일

예제 파일을 복사해서 사용합니다.

```powershell
Copy-Item .\benchmark.config.example.json .\benchmark.config.json
```

예시:

```json
{
  "folderName": "benchmark-fixtures",
  "searchQuery": "invoice",
  "sortBy": "Modified",
  "imageName": "hero-image.jpg",
  "pdfName": "project-plan.pdf",
  "minPhotosCount": 3
}
```

키 설명:

- `folderName`: 로그인 후 Files에서 열 대상 폴더명
- `searchQuery`: 폴더 내부 검색어
- `sortBy`: 정렬 기준 텍스트. 예: `Name`, `Modified`, `Size`
- `imageName`: 미리보기할 이미지 파일명
- `pdfName`: 미리보기할 PDF 파일명
- `minPhotosCount`: Photos 앱에 최소 몇 개의 이미지 타일이 보여야 하는지

## 실행

```powershell
npm run benchmark -- --base-url http://localhost:8080 --username <id> --password <pw> --config .\benchmark.config.json --runs 3
```

헤드리스 실행:

```powershell
npm run benchmark -- --base-url http://localhost:8080 --username <id> --password <pw> --config .\benchmark.config.json --runs 3 --headless
```

기본 출력 디렉터리는 `results/<timestamp>/` 입니다. 필요하면 `--output-dir`로 바꿀 수 있습니다.

## 산출물

각 실행 루트 아래에 다음 파일이 생깁니다.

- `preflight/preflight.json`: 측정 전에 fixture와 화면 요소를 검증한 결과
- `run-01/flow.report.html`: Lighthouse flow HTML 보고서
- `run-01/flow.report.json`: Lighthouse flow JSON 보고서
- `run-01/failure.png`: 실행 실패 시 스크린샷
- `summary.md`: 사람이 읽기 쉬운 요약
- `summary.csv`: run/step 단위 원본 테이블
- `summary.json`: 전체 원본 데이터와 집계 결과

`summary.csv` 컬럼:

- `run`
- `step`
- `status`
- `elapsedMs`
- `performanceScore`
- `totalBlockingTime`
- `cumulativeLayoutShift`
- `largestContentfulPaint`
- `interactionToNextPaint`
- `finalUrl`

## 결과 해석

- `elapsedMs`: 실제 사용자 액션 시작부터 UI 준비 완료까지 걸린 시간입니다. 이 프로젝트의 핵심 지표입니다.
- `performanceScore`: Lighthouse performance category 점수입니다.
- `totalBlockingTime`: 메인 스레드 블로킹 정도입니다.
- `cumulativeLayoutShift`: 인터랙션 중 레이아웃 흔들림 정도입니다.

Timespan 단계는 Lighthouse 특성상 모든 메트릭이 항상 채워지지 않을 수 있습니다. 이 경우 CSV/JSON에는 빈 값이 남습니다.

## 재현성 주의사항

- 측정 중에는 다른 앱을 사용하지 마세요.
- Docker 호스트와 Nextcloud 컨테이너 부하를 최소화하세요.
- 매번 같은 fixture 계정과 같은 fixture 데이터로 실행하세요.

## 검증 명령

```powershell
npm test
npm run typecheck
```
