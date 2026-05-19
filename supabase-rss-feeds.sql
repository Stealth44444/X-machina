-- Add rss_feeds column (idempotent)
ALTER TABLE channels ADD COLUMN IF NOT EXISTS rss_feeds jsonb DEFAULT '[]';

-- mma_seoul
-- 변경: MMA Junkie(404)→MMA Mania, Bleacher Report(403)→Fightful, 스포츠서울(404) 제거, DC Inside(모두 404) 제거
UPDATE channels SET rss_feeds = '[
  {"id":"mmafighting",  "label":"MMA Fighting",  "url":"https://www.mmafighting.com/rss/index.xml"},
  {"id":"sherdog",      "label":"Sherdog",        "url":"https://www.sherdog.com/rss/news.xml"},
  {"id":"ufc",          "label":"UFC",            "url":"https://www.ufc.com/rss/news"},
  {"id":"lowkickmma",   "label":"LowKick MMA",    "url":"https://www.lowkickmma.com/feed/"},
  {"id":"mmaweekly",    "label":"MMA Weekly",     "url":"https://www.mmaweekly.com/feed"},
  {"id":"middleeasy",   "label":"Middle Easy",    "url":"https://middleeasy.com/feed/"},
  {"id":"espnmma",      "label":"ESPN MMA",       "url":"https://www.espn.com/espn/rss/mma/news"},
  {"id":"mmamania",     "label":"MMA Mania",      "url":"https://www.mmamania.com/rss/current.xml"},
  {"id":"fightful",     "label":"Fightful",       "url":"https://www.fightful.com/feed"}
]'::jsonb WHERE name = 'mma_seoul';

-- Nightcall.audio
-- 변경: Complex(404)→NME, Pitchfork(404)→Stereogum, The FADER(404)→Rap Radar, HipHopDX(410) 제거, IZM(404) 제거, DC Inside(404) 제거
UPDATE channels SET rss_feeds = '[
  {"id":"xxl",          "label":"XXL Mag",       "url":"https://www.xxlmag.com/feed/"},
  {"id":"allhiphop",    "label":"AllHipHop",     "url":"https://allhiphop.com/feed/"},
  {"id":"hypebeast",    "label":"Hypebeast",     "url":"https://hypebeast.com/feed"},
  {"id":"billboard",    "label":"Billboard",     "url":"https://www.billboard.com/feed/"},
  {"id":"rollingstone", "label":"Rolling Stone", "url":"https://www.rollingstone.com/music/music-news/feed/"},
  {"id":"variety",      "label":"Variety Music", "url":"https://variety.com/v/music/feed/"},
  {"id":"hiphople",     "label":"힙합엘이",        "url":"https://www.hiphople.com/rss"},
  {"id":"nme",          "label":"NME",           "url":"https://www.nme.com/feed"},
  {"id":"stereogum",    "label":"Stereogum",     "url":"https://www.stereogum.com/feed/"},
  {"id":"rap_radar",    "label":"Rap Radar",     "url":"https://rapradar.com/feed/"}
]'::jsonb WHERE name = 'Nightcall.audio';

-- CAPITALFLOW
-- 변경: Reuters(연결불가)→Investing.com, 조선비즈(404)→WSJ Markets, 이데일리(빈피드) 제거, 서울경제(404) 제거, DC Inside 2개(404) 제거
UPDATE channels SET rss_feeds = '[
  {"id":"bloomberg",   "label":"Bloomberg Markets", "url":"https://feeds.bloomberg.com/markets/news.rss"},
  {"id":"economist",   "label":"The Economist",     "url":"https://www.economist.com/finance-and-economics/rss.xml"},
  {"id":"marketwatch", "label":"MarketWatch",       "url":"https://feeds.marketwatch.com/marketwatch/topstories/"},
  {"id":"ft",          "label":"Financial Times",   "url":"https://www.ft.com/rss/home"},
  {"id":"wsj",         "label":"WSJ Markets",       "url":"https://feeds.a.dj.com/rss/RSSMarketsMain.xml"},
  {"id":"investing",   "label":"Investing.com",     "url":"https://www.investing.com/rss/news.rss"},
  {"id":"hankyung",    "label":"한국경제",            "url":"https://www.hankyung.com/feed/all-news"},
  {"id":"mk",          "label":"매일경제",            "url":"https://www.mk.co.kr/rss/30100041/"}
]'::jsonb WHERE name = 'CAPITALFLOW';

-- spacelog
-- 변경: Wallpaper* URL 수정(/feeds/latest.rss→/rss), Domus(빈피드) 제거, Arch Record(404) 제거, Metropolis(빈피드) 제거, 한국 잡지 4개(연결불가/404) 제거, DC Inside(404) 제거, Curbed 추가
UPDATE channels SET rss_feeds = '[
  {"id":"dezeen",     "label":"Dezeen",               "url":"https://www.dezeen.com/feed/"},
  {"id":"archdaily",  "label":"ArchDaily",            "url":"https://www.archdaily.com/feed"},
  {"id":"wallpaper",  "label":"Wallpaper*",           "url":"https://www.wallpaper.com/rss"},
  {"id":"designboom", "label":"Designboom",           "url":"https://www.designboom.com/feed/"},
  {"id":"archdigest", "label":"Architectural Digest", "url":"https://www.architecturaldigest.com/feed/rss"},
  {"id":"azure",      "label":"Azure Magazine",       "url":"https://azuremagazine.com/feed/"},
  {"id":"surface",    "label":"Surface Magazine",     "url":"https://www.surfacemag.com/feed/"},
  {"id":"c3korea",    "label":"C3 Korea",             "url":"https://www.c3korea.net/rss"},
  {"id":"curbed",     "label":"Curbed",               "url":"https://www.curbed.com/rss/index.xml"}
]'::jsonb WHERE name = 'spacelog';

-- obscurelife.kr
-- 변경: Wallpaper* URL 수정, Business of Fashion URL 수정(/rss→/feed), Vogue Business(404) 제거, 중앙일보(연결불가) 제거, DC Inside(404) 제거, Fashionista/Elle/Harper's Bazaar 추가
UPDATE channels SET rss_feeds = '[
  {"id":"hypebeast",    "label":"Hypebeast",           "url":"https://hypebeast.com/feed"},
  {"id":"highsnobiety", "label":"Highsnobiety",        "url":"https://www.highsnobiety.com/feed"},
  {"id":"robbreport",   "label":"Robb Report",         "url":"https://robbreport.com/feed"},
  {"id":"monocle",      "label":"Monocle",             "url":"https://monocle.com/feed/"},
  {"id":"wallpaper",    "label":"Wallpaper*",          "url":"https://www.wallpaper.com/rss"},
  {"id":"bof",          "label":"Business of Fashion", "url":"https://www.businessoffashion.com/feed"},
  {"id":"wwd",          "label":"WWD",                 "url":"https://wwd.com/feed/"},
  {"id":"vogue",        "label":"Vogue",               "url":"https://www.vogue.com/feed/rss"},
  {"id":"dazed",        "label":"Dazed",               "url":"https://www.dazeddigital.com/rss"},
  {"id":"gqkorea",      "label":"GQ Korea",            "url":"https://www.gqkorea.co.kr/feed"},
  {"id":"voguekorea",   "label":"Vogue Korea",         "url":"https://www.vogue.co.kr/feed"},
  {"id":"fashionista",  "label":"Fashionista",         "url":"https://fashionista.com/feed"},
  {"id":"elle",         "label":"Elle",                "url":"https://www.elle.com/rss/all.xml/"},
  {"id":"harpers",      "label":"Harper'\''s Bazaar",  "url":"https://www.harpersbazaar.com/rss/all.xml/"}
]'::jsonb WHERE name = 'obscurelife.kr';
