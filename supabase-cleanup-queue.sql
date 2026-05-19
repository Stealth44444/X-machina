-- 큐 게시물 전체 삭제 (published 제외)
-- Supabase SQL Editor에서 실행하세요.
DELETE FROM posts WHERE status != 'published';
