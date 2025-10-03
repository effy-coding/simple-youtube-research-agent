# 사용 가이드

## 초기 설정

### 1. 의존성 설치

```bash
bun install
```

### 2. Playwright 브라우저 설치

```bash
bunx playwright install chromium
```

## 기본 사용법

### 1단계: 채널 데이터 수집

```bash
bun run youtube-scraper.ts <YouTube_채널_URL>
```

**지원하는 URL 형식:**
- `https://www.youtube.com/@channelhandle`
- `https://www.youtube.com/channel/UCxxxxx`
- `https://www.youtube.com/c/CustomName`

**예시:**
```bash
bun run youtube-scraper.ts https://www.youtube.com/@veritasium
```

**결과:**
- `data/@veritasium/channel.json` 생성
- `data/@veritasium/videos.json` 생성
- `data/index.json` 업데이트

### 2단계: 데이터 확인

```bash
cat data/@채널핸들/channel.json
cat data/@채널핸들/videos.json
```

### 3단계: 분석 요청

Claude Code에게 요청:

```
data/@채널핸들 폴더의 데이터를 분석해서 콘텐츠 기획안을 만들어줘.

다음을 포함해줘:
1. 채널 특징 및 강점
2. 콘텐츠 패턴 분석 (주제, 제목 패턴, 조회수 인사이트)
3. 벤치마킹 포인트
4. 내 채널용 영상 기획안 5-10개 (주제/제목/대본 개요/필요 자료)

결과는 data/@채널핸들/analysis.md로 저장해줘.
```

### 4단계: 결과 확인

```bash
cat data/@채널핸들/analysis.md
```

## 고급 사용법

### 여러 채널 분석

```bash
bun run youtube-scraper.ts https://youtube.com/@channel1
bun run youtube-scraper.ts https://youtube.com/@channel2
bun run youtube-scraper.ts https://youtube.com/@channel3
```

그 다음 Claude Code에게:
```
data/@channel1, @channel2, @channel3를 비교 분석해서
공통 성공 요인과 각 채널의 차별화 전략을 정리해줘.
```

### 채널 재스크래핑 (업데이트)

```bash
# 기존 데이터를 덮어씁니다
bun run youtube-scraper.ts https://youtube.com/@channelname
```

### 전체 채널 목록 확인

```bash
cat data/index.json
```

## 트러블슈팅

### 스크래핑 실패

**문제**: "채널을 찾을 수 없습니다"
**해결**:
- URL이 올바른지 확인
- 채널이 공개 상태인지 확인
- 인터넷 연결 확인

**문제**: "Timeout 오류"
**해결**:
- 네트워크 상태 확인
- YouTube가 차단했을 수 있음 (잠시 후 재시도)

### Playwright 오류

**문제**: "Executable doesn't exist"
**해결**:
```bash
bunx playwright install chromium
```

### 권한 오류

**문제**: "Permission denied"
**해결**:
```bash
chmod +x youtube-scraper.ts
```

## 팁

1. **대량 분석**: 여러 채널을 한 번에 스크래핑한 후 비교 분석
2. **주기적 업데이트**: 주기적으로 재스크래핑해서 트렌드 파악
3. **카테고리별 분류**: data/ 하위에 카테고리 폴더 생성 (예: data/tech/@channel1)
4. **백업**: data/ 폴더를 정기적으로 백업

## 데이터 관리

### 채널 삭제

```bash
rm -rf data/@채널핸들
```

그리고 `data/index.json`에서 해당 항목 제거

### 전체 초기화

```bash
rm -rf data
```

다음 스크래핑 시 자동으로 재생성됩니다.
