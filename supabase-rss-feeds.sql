-- Add rss_feeds column (idempotent)
ALTER TABLE channels ADD COLUMN IF NOT EXISTS rss_feeds jsonb DEFAULT '[]';

-- mma_seoul
UPDATE channels SET rss_feeds = '[
  {"id":"mmajunkie",       "label":"MMA Junkie",           "url":"https://mmajunkie.usatoday.com/feed"},
  {"id":"mmafighting",     "label":"MMA Fighting",         "url":"https://www.mmafighting.com/rss/index.xml"},
  {"id":"sherdog",         "label":"Sherdog",              "url":"https://www.sherdog.com/rss/news.xml"},
  {"id":"ufc",             "label":"UFC",                  "url":"https://www.ufc.com/rss/news"},
  {"id":"lowkickmma",      "label":"LowKick MMA",          "url":"https://www.lowkickmma.com/feed/"},
  {"id":"mmaweekly",       "label":"MMA Weekly",           "url":"https://www.mmaweekly.com/feed"},
  {"id":"middleeasy",      "label":"Middle Easy",          "url":"https://middleeasy.com/feed/"},
  {"id":"espnmma",         "label":"ESPN MMA",             "url":"https://www.espn.com/espn/rss/mma/news"},
  {"id":"bleacherreport",  "label":"Bleacher Report MMA",  "url":"https://bleacherreport.com/mma.rss"},
  {"id":"sportsseoulma",   "label":"스포츠서울 격투기",      "url":"https://www.sportsseoul.com/rss/sports/martialarts"},
  {"id":"dc_mma",          "label":"DC Inside MMA",        "url":"https://gall.dcinside.com/board/feeds/?id=mma"},
  {"id":"dc_ufc",          "label":"DC Inside UFC",        "url":"https://gall.dcinside.com/board/feeds/?id=ufc"}
]'::jsonb WHERE name = 'mma_seoul';

-- Nightcall.audio
UPDATE channels SET rss_feeds = '[
  {"id":"complex",      "label":"Complex Music",   "url":"https://www.complex.com/music/rss"},
  {"id":"xxl",          "label":"XXL Mag",         "url":"https://www.xxlmag.com/feed/"},
  {"id":"pitchfork",    "label":"Pitchfork",       "url":"https://pitchfork.com/rss/news/feed.xml"},
  {"id":"fader",        "label":"The FADER",       "url":"https://www.thefader.com/rss"},
  {"id":"allhiphop",    "label":"AllHipHop",       "url":"https://allhiphop.com/feed/"},
  {"id":"hiphopdx",     "label":"HipHopDX",        "url":"https://hiphopdx.com/rss"},
  {"id":"hypebeast",    "label":"Hypebeast",       "url":"https://hypebeast.com/feed"},
  {"id":"billboard",    "label":"Billboard",       "url":"https://www.billboard.com/feed/"},
  {"id":"rollingstone", "label":"Rolling Stone",   "url":"https://www.rollingstone.com/music/music-news/feed/"},
  {"id":"variety",      "label":"Variety Music",   "url":"https://variety.com/v/music/feed/"},
  {"id":"hiphople",     "label":"힙합엘이",          "url":"https://www.hiphople.com/rss"},
  {"id":"izm",          "label":"IZM",             "url":"https://izm.co.kr/feed"},
  {"id":"dc_hiphop",    "label":"DC Inside 힙합",   "url":"https://gall.dcinside.com/board/feeds/?id=hiphop"}
]'::jsonb WHERE name = 'Nightcall.audio';

-- CAPITALFLOW
UPDATE channels SET rss_feeds = '[
  {"id":"bloomberg",   "label":"Bloomberg Markets",  "url":"https://feeds.bloomberg.com/markets/news.rss"},
  {"id":"reuters",     "label":"Reuters Business",   "url":"https://feeds.reuters.com/reuters/businessNews"},
  {"id":"economist",   "label":"The Economist",      "url":"https://www.economist.com/finance-and-economics/rss.xml"},
  {"id":"marketwatch", "label":"MarketWatch",        "url":"https://feeds.marketwatch.com/marketwatch/topstories/"},
  {"id":"ft",          "label":"Financial Times",    "url":"https://www.ft.com/rss/home"},
  {"id":"hankyung",    "label":"한국경제",             "url":"https://www.hankyung.com/feed/all-news"},
  {"id":"mk",          "label":"매일경제",             "url":"https://www.mk.co.kr/rss/30100041/"},
  {"id":"chosunbiz",   "label":"조선비즈",             "url":"https://biz.chosun.com/rss/rss.htm"},
  {"id":"edaily",      "label":"이데일리",             "url":"https://www.edaily.co.kr/rss/finance.xml"},
  {"id":"sedaily",     "label":"서울경제",             "url":"https://www.sedaily.com/RssFeed"},
  {"id":"dc_stock",    "label":"DC Inside 주식",      "url":"https://gall.dcinside.com/board/feeds/?id=stock_new1"},
  {"id":"dc_coin",     "label":"DC Inside 코인",      "url":"https://gall.dcinside.com/board/feeds/?id=bitcoins"}
]'::jsonb WHERE name = 'CAPITALFLOW';

-- spacelog
UPDATE channels SET rss_feeds = '[
  {"id":"dezeen",       "label":"Dezeen",               "url":"https://www.dezeen.com/feed/"},
  {"id":"archdaily",    "label":"ArchDaily",            "url":"https://www.archdaily.com/feed"},
  {"id":"wallpaper",    "label":"Wallpaper*",           "url":"https://www.wallpaper.com/feeds/latest.rss"},
  {"id":"designboom",   "label":"Designboom",           "url":"https://www.designboom.com/feed/"},
  {"id":"archdigest",   "label":"Architectural Digest", "url":"https://www.architecturaldigest.com/feed/rss"},
  {"id":"domus",        "label":"Domus",                "url":"https://www.domusweb.it/en.rss.html"},
  {"id":"azure",        "label":"Azure Magazine",       "url":"https://azuremagazine.com/feed/"},
  {"id":"archrecord",   "label":"Architectural Record", "url":"https://www.architecturalrecord.com/ext/resources/rss/mrss.xml"},
  {"id":"metropolis",   "label":"Metropolis",           "url":"https://metropolismag.com/feed/"},
  {"id":"surface",      "label":"Surface Magazine",     "url":"https://www.surfacemag.com/feed/"},
  {"id":"monthly_space","label":"월간 공간",             "url":"https://www.space.co.kr/rss"},
  {"id":"archi_culture","label":"건축문화",              "url":"https://www.archiculture.or.kr/rss"},
  {"id":"vmspace",      "label":"VMSPACE",              "url":"https://www.vmspace.com/rss"},
  {"id":"c3korea",      "label":"C3 Korea",             "url":"https://www.c3korea.net/rss"},
  {"id":"monthly_arch", "label":"월간 건축사지",          "url":"https://www.kira.or.kr/rss"},
  {"id":"dc_arch",      "label":"DC Inside 건축",        "url":"https://gall.dcinside.com/board/feeds/?id=architecture"}
]'::jsonb WHERE name = 'spacelog';

-- obscurelife.kr
UPDATE channels SET rss_feeds = '[
  {"id":"hypebeast",       "label":"Hypebeast",              "url":"https://hypebeast.com/feed"},
  {"id":"highsnobiety",    "label":"Highsnobiety",           "url":"https://www.highsnobiety.com/feed"},
  {"id":"robbreport",      "label":"Robb Report",            "url":"https://robbreport.com/feed"},
  {"id":"monocle",         "label":"Monocle",                "url":"https://monocle.com/feed/"},
  {"id":"wallpaper",       "label":"Wallpaper*",             "url":"https://www.wallpaper.com/feeds/latest.rss"},
  {"id":"bof",             "label":"Business of Fashion",    "url":"https://www.businessoffashion.com/rss"},
  {"id":"voguebusiness",   "label":"Vogue Business",         "url":"https://www.voguebusiness.com/rss"},
  {"id":"wwd",             "label":"WWD",                    "url":"https://wwd.com/feed/"},
  {"id":"vogue",           "label":"Vogue",                  "url":"https://www.vogue.com/feed/rss"},
  {"id":"dazed",           "label":"Dazed",                  "url":"https://www.dazeddigital.com/rss"},
  {"id":"gqkorea",         "label":"GQ Korea",               "url":"https://www.gqkorea.co.kr/feed"},
  {"id":"voguekorea",      "label":"Vogue Korea",            "url":"https://www.vogue.co.kr/feed"},
  {"id":"joonganghighend", "label":"중앙일보 더 하이엔드",    "url":"https://thehighend.joongang.co.kr/rss"},
  {"id":"dc_luxury",       "label":"DC Inside 명품",         "url":"https://gall.dcinside.com/board/feeds/?id=luxury"}
]'::jsonb WHERE name = 'obscurelife.kr';
