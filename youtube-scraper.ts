#!/usr/bin/env bun

/**
 * YouTube 채널 스크래퍼
 * Playwright를 사용하여 YouTube 채널 정보와 영상 데이터를 수집합니다.
 */

import { chromium, type Browser, type Page } from 'playwright';
import { mkdir, writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

interface ChannelInfo {
  id: string;
  url: string;
  scrapedAt: string;
}

interface VideoInfo {
  title: string;
  views: string;
  publishedAt: string;
  url: string;
}

interface ChannelIndex {
  channels: Array<{
    id: string;
    scrapedAt: string;
    path: string;
  }>;
  lastUpdated: string;
}

class YouTubeScraper {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async init(headless: boolean = true) {
    console.log('🚀 브라우저 실행 중...');
    this.browser = await chromium.launch({
      headless,
      args: ['--disable-blink-features=AutomationControlled']
    });
    this.page = await this.browser.newPage();

    // User-Agent 설정으로 봇 감지 회피
    await this.page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    });

    // YouTube 쿠키 동의 등을 위한 설정
    await this.page.setViewportSize({ width: 1920, height: 1080 });
  }

  /**
   * 여러 셀렉터 중 하나를 찾아서 텍스트 반환
   */
  async getTextFromSelectors(selectors: string[], defaultValue: string = '', timeout: number = 10000): Promise<string> {
    if (!this.page) return defaultValue;

    for (const selector of selectors) {
      try {
        const element = this.page.locator(selector).first();
        const isVisible = await element.isVisible({ timeout: timeout });
        if (isVisible) {
          const text = await element.textContent();
          if (text && text.trim()) {
            return text.trim();
          }
        }
      } catch (e) {
        // 다음 셀렉터 시도
        continue;
      }
    }

    return defaultValue;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  /**
   * URL에서 채널 핸들 추출
   */
  extractChannelHandle(url: string): string {
    // @handle 형식
    const handleMatch = url.match(/youtube\.com\/@([^/?]+)/);
    if (handleMatch) return `@${handleMatch[1]}`;

    // /channel/ID 형식
    const channelMatch = url.match(/youtube\.com\/channel\/([^/?]+)/);
    if (channelMatch) return channelMatch[1];

    // /c/CustomName 형식
    const customMatch = url.match(/youtube\.com\/c\/([^/?]+)/);
    if (customMatch) return customMatch[1];

    throw new Error('유효하지 않은 YouTube 채널 URL입니다.');
  }

  /**
   * 디버그용 스크린샷 및 HTML 덤프
   */
  async debugPage(filename: string) {
    if (!this.page) return;

    try {
      // 스크린샷
      await this.page.screenshot({ path: `debug_${filename}.png`, fullPage: false });
      console.log(`   📸 스크린샷 저장: debug_${filename}.png`);

      // HTML 저장
      const html = await this.page.content();
      await writeFile(`debug_${filename}.html`, html, 'utf-8');
      console.log(`   📄 HTML 저장: debug_${filename}.html`);
    } catch (e) {
      console.log(`   ⚠️  디버그 저장 실패: ${e}`);
    }
  }

  /**
   * 기본 채널 URL에서 about URL 생성
   */
  getAboutUrl(channelUrl: string): string {
    return channelUrl.replace(/\/$/, '') + '/about';
  }

  /**
   * 기본 채널 URL에서 videos URL 생성
   */
  getVideosUrl(channelUrl: string): string {
    return channelUrl.replace(/\/$/, '') + '/videos';
  }

  /**
   * 채널 기본 정보 스크래핑 (Videos 페이지로 이동)
   */
  async scrapeChannelInfo(url: string, debug: boolean = false): Promise<ChannelInfo> {
    if (!this.page) throw new Error('브라우저가 초기화되지 않았습니다.');

    console.log('📡 채널 Videos 페이지 로딩 중...');
    const videosUrl = this.getVideosUrl(url);
    await this.page.goto(videosUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // 페이지 로딩 대기
    await this.page.waitForTimeout(5000);

    // 쿠키 동의 버튼 처리
    try {
      const acceptButton = this.page.locator('button[aria-label*="Accept"], button:has-text("Accept all"), button:has-text("모두 수락")').first();
      if (await acceptButton.isVisible({ timeout: 3000 })) {
        await acceptButton.click();
        await this.page.waitForTimeout(2000);
        console.log('✅ 쿠키 동의 완료');
      }
    } catch (e) {
      // 쿠키 버튼이 없으면 무시
    }

    // 디버그
    if (debug) {
      console.log('🔍 디버그 모드: Videos 페이지 상태 저장');
      await this.debugPage('videos_page_initial');
    }

    const channelHandle = this.extractChannelHandle(url);
    console.log(`✅ 채널 ID: ${channelHandle}`);

    return {
      id: channelHandle,
      url,
      scrapedAt: new Date().toISOString(),
    };
  }

  /**
   * 최근 영상 스크래핑 (현재 페이지에서)
   */
  async scrapeRecentVideos(maxVideos: number = 20, debug: boolean = false): Promise<VideoInfo[]> {
    if (!this.page) throw new Error('브라우저가 초기화되지 않았습니다.');

    console.log(`📹 최근 영상 ${maxVideos}개 수집 중...`);

    const videos: VideoInfo[] = [];

    // 스크롤하면서 영상 로드
    for (let i = 0; i < 5; i++) {
      await this.page.evaluate(() => window.scrollBy(0, 1000));
      await this.page.waitForTimeout(2000);
    }

    // 영상 정보 추출 - 여러 셀렉터 시도
    let videoElements = await this.page.locator('ytd-rich-item-renderer').all();

    if (videoElements.length === 0) {
      videoElements = await this.page.locator('ytd-grid-video-renderer').all();
    }

    console.log(`   찾은 영상 요소: ${videoElements.length}개`);

    for (let i = 0; i < Math.min(videoElements.length, maxVideos); i++) {
      try {
        const video = videoElements[i];

        // 제목 추출
        const titleElement = video.locator('#video-title, a#video-title-link').first();
        let title = await titleElement.getAttribute('title');
        if (!title) {
          title = await titleElement.getAttribute('aria-label');
        }
        if (!title) {
          title = await titleElement.textContent();
        }
        title = title?.trim() || '';

        // URL 추출
        let url = await titleElement.getAttribute('href') || '';
        const fullUrl = url.startsWith('http') ? url : `https://www.youtube.com${url}`;

        // 조회수, 업로드 날짜 추출
        const metadataElements = await video.locator('#metadata-line span, .ytd-video-meta-block span').allTextContents();
        const views = metadataElements[0]?.trim() || '알 수 없음';
        const publishedAt = metadataElements[1]?.trim() || '알 수 없음';

        if (title && url) {
          videos.push({
            title,
            views,
            publishedAt,
            url: fullUrl,
          });
          console.log(`   ✓ ${i + 1}. ${title.substring(0, 50)}...`);
        }
      } catch (e) {
        console.log(`   ⚠️  영상 ${i + 1} 정보 수집 실패: ${e}`);
      }
    }

    console.log(`✅ ${videos.length}개 영상 수집 완료`);
    return videos;
  }

  /**
   * 인기 영상 스크래핑
   */
  async scrapePopularVideos(channelUrl: string, maxVideos: number = 10, debug: boolean = false): Promise<VideoInfo[]> {
    if (!this.page) throw new Error('브라우저가 초기화되지 않았습니다.');

    console.log(`🔥 인기 영상 ${maxVideos}개 수집 중...`);

    try {
      // 인기 영상 페이지로 직접 이동 (정렬 옵션)
      const popularUrl = channelUrl.replace(/\/$/, '') + '/videos?view=0&sort=p&flow=grid';
      await this.page.goto(popularUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await this.page.waitForTimeout(3000);

      if (debug) {
        await this.debugPage('popular_videos_page');
      }

      // 스크롤
      for (let i = 0; i < 3; i++) {
        await this.page.evaluate(() => window.scrollBy(0, 1000));
        await this.page.waitForTimeout(2000);
      }

      const videos: VideoInfo[] = [];
      let videoElements = await this.page.locator('ytd-rich-item-renderer').all();

      if (videoElements.length === 0) {
        videoElements = await this.page.locator('ytd-grid-video-renderer').all();
      }

      console.log(`   찾은 인기 영상 요소: ${videoElements.length}개`);

      for (let i = 0; i < Math.min(videoElements.length, maxVideos); i++) {
        try {
          const video = videoElements[i];

          // 제목 추출
          const titleElement = video.locator('#video-title, a#video-title-link').first();
          let title = await titleElement.getAttribute('title');
          if (!title) {
            title = await titleElement.getAttribute('aria-label');
          }
          if (!title) {
            title = await titleElement.textContent();
          }
          title = title?.trim() || '';

          // URL 추출
          let url = await titleElement.getAttribute('href') || '';
          const fullUrl = url.startsWith('http') ? url : `https://www.youtube.com${url}`;

          // 조회수, 업로드 날짜 추출
          const metadataElements = await video.locator('#metadata-line span, .ytd-video-meta-block span').allTextContents();
          const views = metadataElements[0]?.trim() || '알 수 없음';
          const publishedAt = metadataElements[1]?.trim() || '알 수 없음';

          if (title && url) {
            videos.push({
              title,
              views,
              publishedAt,
              url: fullUrl,
            });
            console.log(`   ✓ ${i + 1}. ${title.substring(0, 50)}...`);
          }
        } catch (e) {
          console.log(`   ⚠️  인기 영상 ${i + 1} 정보 수집 실패`);
        }
      }

      console.log(`✅ ${videos.length}개 인기 영상 수집 완료`);
      return videos;
    } catch (e) {
      console.log('⚠️  인기 영상 탭을 찾을 수 없습니다. 건너뜁니다.');
      return [];
    }
  }

  /**
   * 데이터를 파일로 저장
   */
  async saveData(channelInfo: ChannelInfo, recentVideos: VideoInfo[], popularVideos: VideoInfo[]) {
    const dataDir = join(process.cwd(), 'data');
    const channelDir = join(dataDir, channelInfo.id);

    // 디렉토리 생성
    if (!existsSync(dataDir)) {
      await mkdir(dataDir, { recursive: true });
    }
    if (!existsSync(channelDir)) {
      await mkdir(channelDir, { recursive: true });
    }

    // channel.json 저장
    const channelPath = join(channelDir, 'channel.json');
    await writeFile(channelPath, JSON.stringify(channelInfo, null, 2), 'utf-8');
    console.log(`💾 ${channelPath}`);

    // videos.json 저장
    const videosData = {
      recent: recentVideos,
      popular: popularVideos,
    };
    const videosPath = join(channelDir, 'videos.json');
    await writeFile(videosPath, JSON.stringify(videosData, null, 2), 'utf-8');
    console.log(`💾 ${videosPath}`);

    // index.json 업데이트
    await this.updateIndex(channelInfo);
  }

  /**
   * 인덱스 파일 업데이트
   */
  async updateIndex(channelInfo: ChannelInfo) {
    const indexPath = join(process.cwd(), 'data', 'index.json');
    let index: ChannelIndex;

    if (existsSync(indexPath)) {
      const content = await readFile(indexPath, 'utf-8');
      index = JSON.parse(content);
    } else {
      index = { channels: [], lastUpdated: '' };
    }

    // 기존 채널 정보 제거 (중복 방지)
    index.channels = index.channels.filter((ch) => ch.id !== channelInfo.id);

    // 새 채널 정보 추가
    index.channels.push({
      id: channelInfo.id,
      scrapedAt: channelInfo.scrapedAt,
      path: `data/${channelInfo.id}`,
    });

    index.lastUpdated = new Date().toISOString();

    await writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');
    console.log(`💾 ${indexPath}`);
  }
}

/**
 * 메인 함수
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('❌ YouTube 채널 URL을 입력해주세요.');
    console.log('\n사용법:');
    console.log('  bun run youtube-scraper.ts <채널_URL> [옵션]');
    console.log('\n옵션:');
    console.log('  --debug     디버그 모드 (스크린샷, HTML 저장)');
    console.log('  --visible   브라우저 표시 (headless=false)');
    console.log('\n예시:');
    console.log('  bun run youtube-scraper.ts https://www.youtube.com/@veritasium');
    console.log('  bun run youtube-scraper.ts https://www.youtube.com/@veritasium --debug --visible');
    process.exit(1);
  }

  const channelUrl = args[0];
  const debug = args.includes('--debug');
  const visible = args.includes('--visible');

  const scraper = new YouTubeScraper();

  try {
    await scraper.init(!visible); // headless = !visible

    console.log('═══════════════════════════════════════════════');
    console.log('YouTube 채널 스크래퍼');
    if (debug) console.log('🔍 디버그 모드 활성화');
    if (visible) console.log('👁️  브라우저 표시 모드');
    console.log('═══════════════════════════════════════════════\n');

    // 채널 정보 수집 (Videos 페이지로 이동)
    const channelInfo = await scraper.scrapeChannelInfo(channelUrl, debug);

    // 영상 정보 수집 (이미 Videos 페이지에 있음)
    const recentVideos = await scraper.scrapeRecentVideos(20, debug);
    const popularVideos = await scraper.scrapePopularVideos(channelUrl, 10, debug);

    // 데이터 저장
    console.log('\n💾 데이터 저장 중...');
    await scraper.saveData(channelInfo, recentVideos, popularVideos);

    console.log('\n✅ 완료!');
    console.log(`\n다음 단계:`);
    console.log(`  1. 데이터 확인: cat data/${channelInfo.id}/channel.json`);
    console.log(`  2. Claude Code에게 분석 요청:`);
    console.log(`     "data/${channelInfo.id} 폴더를 분석해서 콘텐츠 기획안 만들어줘"`);

  } catch (error) {
    console.error('\n❌ 오류 발생:', error);
    process.exit(1);
  } finally {
    await scraper.close();
  }
}

// 스크립트 실행
main();
