window.GYMSPIRE_TEMPLATES = window.GYMSPIRE_TEMPLATES || [];
window.GYMSPIRE_TEMPLATES.push({
  id: 'tips',
  name: '운동 팁 / 정보성',
  slides: 1,
  fields: [
    { key: 'bgImage',  label: '배경 이미지',     type: 'image', default: '' },
    { key: 'category', label: '카테고리 뱃지',   type: 'text',  default: '오늘의 운동 팁', placeholder: '카테고리' },
    { key: 'tip1',     label: '팁 ①',            type: 'text',  default: '스쿼트 깊이가 관건이다', placeholder: '팁 1' },
    { key: 'tip2',     label: '팁 ②',            type: 'text',  default: '코어를 항상 잡아라', placeholder: '팁 2' },
    { key: 'tip3',     label: '팁 ③',            type: 'text',  default: '호흡을 절대 멈추지 마라', placeholder: '팁 3' },
    { key: 'tagline',  label: '태그라인',         type: 'text',  default: '@GYMSPIRE', placeholder: '태그라인' },
  ],
  render(s) {
    const tips = [s.tip1, s.tip2, s.tip3].filter(Boolean);
    const tipHtml = tips.map((tip, i) => `
      <div style="display:flex;align-items:flex-start;gap:20px;margin-bottom:52px;">
        <span style="font-size:48px;font-weight:900;color:#2B9BF4;line-height:1;min-width:56px;">0${i + 1}</span>
        <span style="font-size:34px;font-weight:700;color:#fff;line-height:1.3;">${tip}</span>
      </div>
    `).join('');
    return `
      <div style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,0.72) 0%,rgba(0,0,0,0.88) 100%);"></div>
      <div style="position:absolute;top:48px;left:0;right:0;text-align:center;font-size:22px;font-weight:700;letter-spacing:4px;color:rgba(255,255,255,0.85);">GYMSPIRE</div>
      <div style="position:absolute;top:110px;left:48px;background:#2B9BF4;color:#fff;padding:10px 18px;border-radius:4px;font-size:20px;font-weight:700;">${s.category || ''}</div>
      <div style="position:absolute;top:220px;left:48px;right:48px;">${tipHtml}</div>
      <div style="position:absolute;bottom:80px;left:48px;font-size:22px;font-weight:400;color:rgba(255,255,255,0.35);letter-spacing:2px;">${s.tagline || ''}</div>
    `;
  }
});
