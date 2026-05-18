-- X Machina — 채널 스키마 업데이트 + 5채널 시드
-- Supabase Dashboard > SQL Editor에서 실행

-- 1. channels 테이블 컬럼 추가
ALTER TABLE channels ADD COLUMN IF NOT EXISTS ig_user_id text;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS ig_access_token text;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS news_keywords text[] DEFAULT '{}';
ALTER TABLE channels ADD COLUMN IF NOT EXISTS ai_system_prompt text;

-- 1b. posts 테이블 컬럼 추가 (렌더링된 슬라이드 이미지 URL 배열)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS slide_images jsonb DEFAULT '[]';

-- 2. 기존 GYMSPIRE 채널 업데이트 (레거시 채널 — 필요시 삭제 가능)
UPDATE channels
SET news_keywords = ARRAY['gymshark','gymspire','피트니스','운동복'],
    ai_system_prompt = '당신은 한국 Gymshark 공식 리셀러 @gymspire.kr의 수석 카피라이터입니다. 카드뉴스 형식으로 작성합니다.'
WHERE id = '00000000-0000-0000-0000-000000000001';

-- 3. X Machina 운영 채널 5개 생성
INSERT INTO channels (name, topic, description, color, emoji, news_keywords, ai_system_prompt)
VALUES
  (
    'spacelog',
    'architecture',
    '공간을 감상이 아닌 투자의 언어로 읽는 매거진. 상권 이동·철거 예정 건물·세계 건축 트렌드를 돈의 시각으로 해석합니다.',
    '#C4A882',
    'S',
    ARRAY['건축','부동산','상권','재개발','젠트리피케이션','투자','도시개발'],
    '당신은 건축과 공간 투자를 전문으로 다루는 인스타그램 콘텐츠 크리에이터입니다. 건물·상권·도시 공간을 투자자의 언어로 해석합니다. 감상이 아닌 돈의 시각으로 공간을 읽는 통찰을 전달합니다. 전문 용어와 데이터를 쉽게 풀어 설명합니다.'
  ),
  (
    'CAPITALFLOW',
    'economy',
    '부는 항상 이동합니다. 글로벌 자금 흐름과 산업 변화를 누구보다 빠르게 읽어 매일 아침 브리핑 형식으로 전달합니다.',
    '#5A8A5A',
    'C',
    ARRAY['경제','금리','환율','주식','채권','자산','부동산','글로벌경제','인플레이션'],
    '당신은 글로벌 경제와 자산 이동을 전문으로 다루는 인스타그램 콘텐츠 크리에이터입니다. 복잡한 경제 현상을 브리핑 형식으로 명확하게 전달합니다. 데이터와 흐름을 중심으로, 독자가 내일의 부의 이동을 읽을 수 있도록 안내합니다.'
  ),
  (
    'obscurelife.kr',
    'lifestyle',
    '대중이 모르는 희귀 위스키·프라이빗 문화를 다룹니다. 주류에서 출발해 상류층 라이프스타일 전반으로 확장하는 구조입니다.',
    '#8B6F5C',
    'O',
    ARRAY['위스키','싱글몰트','버번','프리미엄','하이엔드','럭셔리','와인','프라이빗'],
    '당신은 하이엔드 라이프스타일과 희귀 위스키 문화를 전문으로 다루는 인스타그램 콘텐츠 크리에이터입니다. 대중이 모르는 프리미엄 경험과 희귀 제품을 절제된 언어로 소개합니다. 과시 없이 깊이 있는 감식안을 전달합니다.'
  ),
  (
    'Nightcall.audio',
    'hiphop',
    '음악 차트가 아닌 힙합 씬의 이면을 파헤칩니다. 비프·레이블 비즈니스·가사 해석·씬 역사까지, 진짜 팬만 아는 각도로 접근합니다.',
    '#C04A6A',
    'N',
    ARRAY['힙합','래퍼','비프','레이블','음악산업','가사','씬','언더그라운드'],
    '당신은 힙합 씬과 음악 문화를 전문으로 다루는 인스타그램 콘텐츠 크리에이터입니다. 차트 너머의 이면—비프·레이블 비즈니스·가사의 맥락·씬 역사—을 진짜 팬의 시선으로 해석합니다. 날카롭고 솔직한 관점으로 씬을 읽습니다.'
  ),
  (
    'mma_seoul',
    'mma',
    '경기 결과 요약이 아닌 격투기 씬의 이면을 다룹니다. 배당 분석·파이터 데이터·트래시톡 심리전·UFC 비즈니스까지 팬도 몰랐던 각도로 접근합니다.',
    '#C06030',
    'M',
    ARRAY['UFC','MMA','격투기','파이터','복싱','주짓수','배당','격투스포츠'],
    '당신은 격투기와 MMA 씬을 전문으로 다루는 인스타그램 콘텐츠 크리에이터입니다. 경기 결과 너머의 이면—배당·파이터 데이터·심리전·UFC 비즈니스—을 날카롭게 분석합니다. 팬도 몰랐던 각도로 격투기 씬을 해석합니다.'
  );
