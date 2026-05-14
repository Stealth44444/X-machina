# Gymspire Instagram Template Tool — Design Spec
Date: 2026-05-15

## Overview

브라우저 기반 인스타그램 게시물 템플릿 제작 툴. 짐샤크/피트니스 브랜드 계정(GYMSPIRE)의 일관된 비주얼 아이덴티티를 유지하면서 빠르게 게시물을 제작하기 위한 개인 작업용 툴.

## Goals

- 5가지 게시물 유형의 템플릿 갤러리 제공
- 브라우저에서 텍스트/이미지를 편집하고 PNG로 내보내기
- 핀터레스트 이미지 소싱 키워드 바로가기 제공
- 서버 없이 로컬 파일로 실행 가능

## Architecture

**Option B: 멀티파일 Vanilla JS 앱** (서버 불필요, VS Code Live Server로 실행)

```
Gymspire/
├── index.html
├── style.css
├── app.js
├── fonts/
│   └── Pretendard.woff2
└── templates/
    ├── motivation.js
    ├── product.js
    ├── promo.js
    ├── tips.js
    └── cardnews.js
```

## UI Layout

3패널 구조:
- **왼쪽 사이드바 (240px)**: 템플릿 갤러리 (카테고리 탭) + 핀터레스트 키워드 링크
- **가운데 캔버스**: 실시간 미리보기 (1080×1350 축소 표시)
- **오른쪽 편집 패널 (280px)**: 텍스트 입력, 이미지 업로드, 뱃지 설정
- **하단**: PNG 내보내기 버튼

카드뉴스 멀티슬라이드: 캔버스 하단에 슬라이드 번호 탭 표시, 개별 편집.

## Brand Identity

- 배경: 검정 (#000000) + 업로드 이미지 (object-fit: cover)
- 오버레이: 하단 그라데이션 (투명 → #000, 50% 지점부터)
- 텍스트: 흰색 (#FFFFFF), 서브텍스트 흰색 70% (rgba(255,255,255,0.7))
- 포인트 컬러: #2B9BF4 (뱃지)
- 폰트: Pretendard — 제목 800, 소제목 600, 본문 400
- 브랜드명: GYMSPIRE (상단 고정)

## Canvas Spec

- 실제 해상도: 1080 × 1350px (Instagram 4:5)
- 화면 표시: 비율 유지 축소 (약 400px 너비)
- 내보내기: html2canvas, 원본 해상도 PNG

## Template Specs

### ① 동기부여 / 운동자극
- 배경 이미지 전체 커버
- 하단 그라데이션 오버레이
- 대형 제목 (Pretendard 800, 48px)
- 소제목 (Pretendard 400, 20px)
- 선택적 파란 뱃지 라벨

### ② 제품 소개 / 입고 안내
- 배경 이미지 전체 커버
- 파란 뱃지: "NEW ARRIVAL" 또는 커스텀
- 제품명 제목 + 가격/설명 소제목
- CTA 텍스트 (예: "국내배송 가능")

### ③ 할인 / 프로모션
- 배경 이미지 전체 커버
- 할인율 초대형 텍스트 (Pretendard 900, 72px)
- 조건/기간 소제목
- 파란 뱃지: "LIMITED"

### ④ 운동 팁 / 정보성
- 배경 이미지 전체 커버
- 파란 뱃지 카테고리명
- 번호 리스트 (① ② ③): 항목 Bold + 설명 Regular
- 하단 태그라인

### ⑤ 카드뉴스 멀티슬라이드
- 표지: 동기부여 템플릿과 동일 구조
- 내용 (2~5장): 다크 단색 배경 + 페이지 번호
- 마지막 장: 고정 CTA ("팔로우 / 링크 클릭")
- 슬라이드별 개별 편집, PNG 개별 저장

## Pinterest Quick Links

키워드 13개 (클릭 시 핀터레스트 검색 새 탭):

| 카테고리 | 키워드 |
|---|---|
| 브랜드 | Gymshark aesthetic, Gymshark men, Gymshark women, Gymshark outfit |
| 앰버서더 | David Laid, Chris Bumstead, Zac Perna, Ryan Terry, Nikki Blackketter |
| 피트니스 감성 | gym aesthetic, physique aesthetic, men's physique, fitness photography, bodybuilding aesthetic |

## Export Flow

1. 우측 패널에서 텍스트/이미지 편집
2. 캔버스 실시간 반영
3. "PNG 내보내기" 클릭
4. html2canvas가 캔버스 DOM을 1080×1350 해상도로 렌더링
5. 자동 다운로드 (파일명: `gymspire-{template}-{timestamp}.png`)
