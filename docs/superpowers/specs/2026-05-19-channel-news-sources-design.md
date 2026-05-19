# Channel-Specific News Sources Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the generic Google/Bing/NewsAPI news pipeline with channel-specific, authoritative RSS sources stored in Supabase, displayed as individual brand-name filter tabs in the news feed.

**Architecture:** `channels.rss_feeds` stores the source list per channel. `api/news.js` receives `channel_id`, queries Supabase for that channel's feeds, fetches them in parallel with a generic RSS parser, and returns results labeled by brand. The client passes `channel_id` and renders filter tabs dynamically from the response's source map.

**Tech Stack:** Vercel serverless (ES module), Supabase REST (service role key), vanilla JS frontend, no npm packages.

---

## Decisions

- **Storage:** Supabase `channels.rss_feeds jsonb` — each item: `{ id, label, url }`
- **Tab display:** Individual brand names replace ALL/NEWS/NEWSAPI/BLOG/YOUTUBE
- **Fallback:** If `rss_feeds` is empty, fall back to current Google News RSS behavior
- **DC Inside:** Parsed as standard RSS, labeled `source: 'dcinside'`, stricter relevance filter applied (title must contain at least one keyword)
- **Broad sources removed:** No wire services covering all topics (연합뉴스 스포츠, CNBC, etc.)
- **Source management UI:** Full add/remove in channel settings (`renderProjectSettings`)

---

## Data Model

```sql
-- Add to channels table
ALTER TABLE channels ADD COLUMN IF NOT EXISTS rss_feeds jsonb default '[]';
```

Each array item:
```json
{ "id": "mmajunkie", "label": "MMA Junkie", "url": "https://mmajunkie.usatoday.com/feed" }
```

---

## Seed Data — Initial Sources per Channel

### mma_seoul (12 sources)

| id | label | url |
|----|-------|-----|
| mmajunkie | MMA Junkie | https://mmajunkie.usatoday.com/feed |
| mmafighting | MMA Fighting | https://www.mmafighting.com/rss/index.xml |
| sherdog | Sherdog | https://www.sherdog.com/rss/news.xml |
| ufc | UFC | https://www.ufc.com/rss/news |
| lowkickmma | LowKick MMA | https://www.lowkickmma.com/feed/ |
| mmaweekly | MMA Weekly | https://www.mmaweekly.com/feed |
| middleeasy | Middle Easy | https://middleeasy.com/feed/ |
| espnmma | ESPN MMA | https://www.espn.com/espn/rss/mma/news |
| bleacherreportmma | Bleacher Report MMA | https://bleacherreport.com/mma.rss |
| sportsseoulma | 스포츠서울 격투기 | https://www.sportsseoul.com/rss/sports/martialarts ★ |
| dc_mma | DC Inside MMA | https://gall.dcinside.com/board/feeds/?id=mma |
| dc_ufc | DC Inside UFC | https://gall.dcinside.com/board/feeds/?id=ufc |

### Nightcall.audio (13 sources)

| id | label | url |
|----|-------|-----|
| complex | Complex Music | https://www.complex.com/music/rss |
| xxl | XXL Mag | https://www.xxlmag.com/feed/ |
| pitchfork | Pitchfork | https://pitchfork.com/rss/news/feed.xml |
| fader | The FADER | https://www.thefader.com/rss |
| allhiphop | AllHipHop | https://allhiphop.com/feed/ |
| hiphopdx | HipHopDX | https://hiphopdx.com/rss ★ |
| hypebeast | Hypebeast | https://hypebeast.com/feed |
| billboard | Billboard | https://www.billboard.com/feed/ |
| rollingstone | Rolling Stone | https://www.rollingstone.com/music/music-news/feed/ |
| variety | Variety Music | https://variety.com/v/music/feed/ |
| hiphople | 힙합엘이 | https://www.hiphople.com/rss ★ |
| izm | IZM | https://izm.co.kr/feed ★ |
| dc_hiphop | DC Inside 힙합 | https://gall.dcinside.com/board/feeds/?id=hiphop |

### CAPITALFLOW (12 sources)

| id | label | url |
|----|-------|-----|
| bloomberg | Bloomberg Markets | https://feeds.bloomberg.com/markets/news.rss |
| reuters | Reuters Business | https://feeds.reuters.com/reuters/businessNews |
| economist | The Economist | https://www.economist.com/finance-and-economics/rss.xml |
| marketwatch | MarketWatch | https://feeds.marketwatch.com/marketwatch/topstories/ |
| ft | Financial Times | https://www.ft.com/rss/home |
| hankyung | 한국경제 | https://www.hankyung.com/feed/all-news |
| mk | 매일경제 | https://www.mk.co.kr/rss/30100041/ |
| chosunbiz | 조선비즈 | https://biz.chosun.com/rss/rss.htm |
| edaily | 이데일리 | https://www.edaily.co.kr/rss/finance.xml ★ |
| sedaily | 서울경제 | https://www.sedaily.com/RssFeed ★ |
| dc_stock | DC Inside 주식 | https://gall.dcinside.com/board/feeds/?id=stock_new1 |
| dc_coin | DC Inside 코인 | https://gall.dcinside.com/board/feeds/?id=bitcoins |

### spacelog (16 sources)

| id | label | url |
|----|-------|-----|
| dezeen | Dezeen | https://www.dezeen.com/feed/ |
| archdaily | ArchDaily | https://www.archdaily.com/feed |
| wallpaper | Wallpaper* | https://www.wallpaper.com/feeds/latest.rss |
| designboom | Designboom | https://www.designboom.com/feed/ |
| archdigest | Architectural Digest | https://www.architecturaldigest.com/feed/rss |
| domus | Domus | https://www.domusweb.it/en.rss.html |
| azure | Azure Magazine | https://azuremagazine.com/feed/ |
| archrecord | Architectural Record | https://www.architecturalrecord.com/ext/resources/rss/mrss.xml |
| metropolis | Metropolis | https://metropolismag.com/feed/ |
| surface | Surface Magazine | https://www.surfacemag.com/feed/ |
| monthly_space | 월간 공간 | https://www.space.co.kr/rss ★ |
| archi_culture | 건축문화 | https://www.archiculture.or.kr/rss ★ |
| vmspace | VMSPACE | https://www.vmspace.com/rss ★ |
| c3korea | C3 Korea | https://www.c3korea.net/rss ★ |
| monthly_arch | 월간 건축사지 | https://www.kira.or.kr/rss ★ |
| dc_arch | DC Inside 건축 | https://gall.dcinside.com/board/feeds/?id=architecture |

### obscurelife.kr (14 sources)

| id | label | url |
|----|-------|-----|
| hypebeast | Hypebeast | https://hypebeast.com/feed |
| highsnobiety | Highsnobiety | https://www.highsnobiety.com/feed |
| robbreport | Robb Report | https://robbreport.com/feed |
| monocle | Monocle | https://monocle.com/feed/ |
| wallpaper | Wallpaper* | https://www.wallpaper.com/feeds/latest.rss |
| bof | Business of Fashion | https://www.businessoffashion.com/rss |
| voguebusiness | Vogue Business | https://www.voguebusiness.com/rss |
| wwd | WWD | https://wwd.com/feed/ |
| vogue | Vogue | https://www.vogue.com/feed/rss |
| dazed | Dazed | https://www.dazeddigital.com/rss |
| gqkorea | GQ Korea | https://www.gqkorea.co.kr/feed ★ |
| voguekorea | Vogue Korea | https://www.vogue.co.kr/feed ★ |
| joonganghighend | 중앙일보 더 하이엔드 | https://thehighend.joongang.co.kr/rss ★ |
| dc_luxury | DC Inside 명품 | https://gall.dcinside.com/board/feeds/?id=luxury |

★ = RSS URL 구현 단계에서 실제 경로 검증 필요. 미지원 시 해당 항목 비활성 처리.

---

## API Layer — `api/news.js` Changes

### New parameters
- `?channel_id=uuid` — required for curated source mode
- `?keywords=...` — retained for relevance scoring and fallback

### New function: `fetchRssItems(url, label, cutoffMs)`
Generic RSS 2.0 / Atom parser. Returns `{ title, date, source: label, url, ms }[]`.

```js
// Handles both RSS 2.0 <item> and Atom <entry>
// Title: strips trailing " - Source Name" pattern
// Date: pubDate (RSS) or updated/published (Atom)
// Link: <link> text node (RSS) or <link href="..."> (Atom)
// Max 20 items per feed, cutoff = CUTOFF_MS (90 days)
```

### New function: `fetchChannelFeeds(channelId)`
Queries Supabase `channels` table for `rss_feeds` where `id = channelId`.
Uses `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` env vars (already present).
Returns the `rss_feeds` array or `[]` on error.

### Handler logic change
```
if channel_id provided AND rss_feeds.length > 0:
  → fetch all rss_feeds in parallel with fetchRssItems
  → deduplicate by title prefix
  → relevance score by keywords
  → DC Inside items: require score > 0 (stricter filter)
  → return { items, sources: { [label]: { ok, count } } }
else:
  → existing Google/Bing/NewsAPI fallback (unchanged)
```

### Removed fetchers (when curated mode active)
`fetchGoogleNews`, `fetchBingNews`, `fetchNewsApi`, `fetchBlog`, `fetchYoutube` — still present for fallback, not called when `rss_feeds` exists.

---

## Client-Side Changes

### `app.js` — `fetchGymsharkNews()`
Add `channel_id` to the fetch URL:
```js
const url = `/api/news?channel_id=${state.projectId}&keywords=${encodeURIComponent(keywords)}`;
```

### `app.js` — `renderFullNewsPanel()`
Filter tabs are built from `newsCache.sources` keys instead of the hardcoded `ALL_SOURCES` array.
```js
// Before: const ALL_SOURCES = ['news', 'newsapi', 'blog', 'youtube'];
// After: derive from Object.keys(newsCache.sources), sorted by count desc
```
`NEWS_SOURCE_LABELS` map is no longer needed for display — label comes directly from the source key returned by the API.

### `app.js` — `NEWS_SOURCE_LABELS`
Remove the hardcoded map. API now returns the brand label as the source key.

---

## Channel Settings UI — Source Management

Added to `renderProjectSettings()` below the AI 시스템 프롬프트 field.

```
뉴스 소스
──────────────────────────────────────────
  MMA Junkie     mmajunkie.usatoday.com   [삭제]
  MMA Fighting   mmafighting.com          [삭제]
  Sherdog        sherdog.com              [삭제]
──────────────────────────────────────────
  URL   [https://example.com/feed  ]
  라벨  [Source Name               ]  [추가]
```

- Delete: removes item from local `rss_feeds` array, saved on main 저장 button
- Add: validates `https://` prefix, non-empty label, no duplicate URL
- Saved as part of `dbUpsertChannel` with the rest of channel settings
- `saveProjectSettings()` includes `rss_feeds` in the updates object

---

## Migration

One SQL statement to add the column and seed all 5 channels:

```sql
ALTER TABLE channels ADD COLUMN IF NOT EXISTS rss_feeds jsonb default '[]';

UPDATE channels SET rss_feeds = '[...]'::jsonb WHERE name = 'mma_seoul';
UPDATE channels SET rss_feeds = '[...]'::jsonb WHERE name = 'Nightcall.audio';
UPDATE channels SET rss_feeds = '[...]'::jsonb WHERE name = 'CAPITALFLOW';
UPDATE channels SET rss_feeds = '[...]'::jsonb WHERE name = 'spacelog';
UPDATE channels SET rss_feeds = '[...]'::jsonb WHERE name = 'obscurelife.kr';
```

Full JSON values for each channel are derived from the seed tables above.

---

## Error Handling

- Individual feed fetch failure: logged, that source marked `{ ok: false, count: 0 }`, others unaffected
- `fetchChannelFeeds` Supabase error: fall back to keyword-only mode, log warning
- ★ URL not resolving: feed silently returns `[]`, tab shown as `failed` in UI
- Empty `rss_feeds` array: full fallback to existing Google/Bing behavior

---

## Out of Scope

- YouTube per-channel configuration (future: add `type: "youtube"` item support)
- RSS feed preview/test in settings UI
- Feed refresh scheduling (remains manual / on-demand)
