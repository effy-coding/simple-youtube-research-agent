# YouTube 채널 분석 & 콘텐츠 기획 도구

YouTube 채널 URL만 입력하면 자동으로 채널을 분석하고 내 채널용 콘텐츠 기획안을 생성하는 도구입니다.

## 주요 기능

- **자동 데이터 수집**: Playwright로 채널 정보와 영상 데이터 스크래핑
- **정규화된 저장**: 여러 채널을 체계적으로 관리
- **AI 분석**: Claude Code를 활용한 콘텐츠 패턴 분석 및 벤치마킹
- **기획안 생성**: 실행 가능한 영상 주제/제목/대본/자료 제공

## 빠른 시작

### 1. 설치

```bash
# 의존성 설치
bun install

# Playwright 브라우저 설치
bun run install-browsers
```

### 2. 채널 스크래핑

```bash
bun run youtube-scraper.ts https://www.youtube.com/@channelname
```

### 3. 분석 요청

Claude Code에게 다음과 같이 요청하세요:

```
data/@channelname 폴더를 분석해서 콘텐츠 기획안을 만들어줘.

다음을 포함해줘:
1. 채널 특징 및 강점
2. 콘텐츠 패턴 분석
3. 벤치마킹 포인트
4. 내 채널용 영상 기획안 5-10개 (주제/제목/대본/자료)

결과는 data/@channelname/analysis.md로 저장해줘.
```

## 사용 예시

```bash
# 예시: Veritasium 채널 분석
bun run youtube-scraper.ts https://www.youtube.com/@veritasium

# 결과 확인
cat data/@veritasium/channel.json
cat data/@veritasium/videos.json

# Claude Code에게 분석 요청
# → data/@veritasium/analysis.md 생성됨
```

## 프로젝트 구조

```
.
├── .agent/
│   ├── plan.md              # 프로젝트 계획
│   └── workflow.md          # 상세 사용 가이드
├── data/
│   ├── index.json          # 전체 채널 인덱스
│   └── @채널핸들/
│       ├── channel.json    # 채널 정보
│       ├── videos.json     # 영상 목록
│       └── analysis.md     # 분석 결과 (Claude Code 생성)
├── package.json
├── youtube-scraper.ts      # 메인 스크래퍼
└── README.md
```

## 데이터 형식

### channel.json

```json
{
  "id": "@channelhandle",
  "name": "채널명",
  "url": "https://youtube.com/@...",
  "subscribers": "123만명",
  "totalVideos": "500개",
  "description": "채널 설명...",
  "scrapedAt": "2025-10-03T10:30:00Z"
}
```

### videos.json

```json
{
  "recent": [
    {
      "title": "영상 제목",
      "views": "10만",
      "publishedAt": "1주 전",
      "url": "https://youtube.com/watch?v=...",
      "thumbnail": "https://..."
    }
  ],
  "popular": [...]
}
```

## 고급 사용법

### 여러 채널 비교 분석

```bash
bun run youtube-scraper.ts https://youtube.com/@channel1
bun run youtube-scraper.ts https://youtube.com/@channel2
bun run youtube-scraper.ts https://youtube.com/@channel3
```

그 다음 Claude Code에게:

```
data/@channel1, @channel2, @channel3를 비교 분석해서
공통 성공 요인과 차별화 전략을 정리해줘.
```

### 전체 채널 목록 확인

```bash
cat data/index.json
```

### 채널 데이터 재수집

```bash
# 기존 데이터를 덮어씁니다
bun run youtube-scraper.ts https://youtube.com/@channelname
```

## 기술 스택

- **런타임**: Bun
- **스크래핑**: Playwright (Chromium)
- **언어**: TypeScript
- **분석**: Claude Code

## 트러블슈팅

### "Executable doesn't exist" 오류

```bash
bunx playwright install chromium
```

### 스크래핑 실패

- URL이 올바른지 확인
- 채널이 공개 상태인지 확인
- 네트워크 연결 확인
- YouTube가 일시적으로 차단했을 수 있음 (잠시 후 재시도)

### 데이터 초기화

```bash
rm -rf data
```

## 상세 문서

- [프로젝트 계획](.agent/plan.md)
- [사용 가이드](.agent/workflow.md)

## 라이선스

MIT

## 참고사항

- 이 도구는 공개된 YouTube 데이터만 수집합니다
- YouTube의 이용 약관을 준수해주세요
- 과도한 스크래핑은 자제해주세요
