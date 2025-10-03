# YouTube 채널 분석 & 콘텐츠 기획 도구

## 프로젝트 목표

YouTube 채널 URL을 입력하면 자동으로:
1. 채널 데이터 수집 (구독자, 영상 정보)
2. 콘텐츠 패턴 분석
3. 벤치마킹 인사이트 도출
4. 내 채널용 영상 기획안 생성 (주제/제목/대본/자료)

## 아키텍처

```
입력: YouTube 채널 URL
  ↓
Playwright 스크래핑 (youtube-scraper.ts)
  ↓
정규화된 JSON 저장 (data/@채널핸들/)
  ↓
Claude Code 분석
  ↓
출력: 콘텐츠 기획 마크다운 (analysis.md)
```

## 기술 스택

- **런타임**: Bun
- **스크래핑**: Playwright
- **언어**: TypeScript
- **분석**: Claude Code (사용자가 직접 요청)

## 파일 구조

```
/Users/kimb/workspaces/research/
├── .agent/
│   ├── plan.md              # 이 문서
│   └── workflow.md          # 사용 가이드
│
├── data/                    # 채널 데이터 저장소
│   ├── index.json          # 전체 채널 인덱스
│   └── @채널핸들/
│       ├── channel.json    # 채널 기본 정보
│       ├── videos.json     # 영상 목록
│       └── analysis.md     # 분석 결과
│
├── package.json
├── youtube-scraper.ts
└── README.md
```

## 데이터 정규화

### data/index.json
모든 분석된 채널의 목록과 메타데이터

```json
{
  "channels": [
    {
      "id": "@channelhandle",
      "name": "채널명",
      "scrapedAt": "2025-10-03T10:30:00Z",
      "path": "data/@channelhandle"
    }
  ],
  "lastUpdated": "2025-10-03T10:30:00Z"
}
```

### data/@채널핸들/channel.json
채널의 기본 정보

```json
{
  "id": "@channelhandle",
  "name": "채널명",
  "url": "https://youtube.com/@channelhandle",
  "subscribers": "123만명",
  "totalVideos": "500개",
  "description": "채널 설명...",
  "scrapedAt": "2025-10-03T10:30:00Z"
}
```

### data/@채널핸들/videos.json
수집한 영상 목록

```json
{
  "recent": [
    {
      "title": "영상 제목",
      "views": "10만",
      "publishedAt": "1주 전",
      "url": "https://youtube.com/watch?v=...",
      "thumbnail": "https://...",
      "description": "영상 설명 일부..."
    }
  ],
  "popular": [...]
}
```

### data/@채널핸들/analysis.md
Claude Code가 생성하는 분석 결과 및 콘텐츠 기획안

## 워크플로우

1. **데이터 수집**: `bun run youtube-scraper.ts <URL>`
2. **분석 요청**: Claude Code에게 "data/@채널핸들 분석해줘"
3. **기획안 활용**: `analysis.md` 파일 확인

## 확장 가능성

- 여러 채널 비교 분석
- 시간별 트렌드 추적 (재스크래핑)
- 자동화된 대시보드 생성
- 경쟁 채널 벤치마킹
