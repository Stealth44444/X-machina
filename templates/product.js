window.GYMSPIRE_TEMPLATES = window.GYMSPIRE_TEMPLATES || [];
window.GYMSPIRE_TEMPLATES.push({
  id: 'product',
  name: '제품 소개 / 입고',
  defaultSlides: 1,
  maxSlides: 8,
  fields: [
    { key: 'bgImage', label: '배경 이미지',  type: 'image',    default: '' },
    { key: 'badge',   label: '뱃지 텍스트', type: 'text',     default: 'NEW ARRIVAL', placeholder: 'NEW ARRIVAL' },
    { key: 'title',   label: '제품명',       type: 'textarea', default: 'GYMSHARK\nVital Seamless', placeholder: '제품명' },
    { key: 'price',   label: '가격 / 설명', type: 'text',     default: '₩89,000', placeholder: '가격 또는 설명' },
    { key: 'cta',     label: 'CTA',          type: 'text',     default: '국내배송 가능 · 링크 클릭', placeholder: 'CTA 텍스트' },
    { key: 'body',    label: '본문',         type: 'textarea', default: '', placeholder: '본문 (**볼드** 지원)' },
  ],
  fieldsForSlide(index) {
    if (index === 0) return ['bgImage', 'badge', 'title', 'price', 'cta'];
    return ['bgImage', 'title', 'body'];
  },
  render(s, slideIndex, total) {
    if (slideIndex > 0) return window.contentSlide(s, slideIndex, total);
    return `
      <div style="position:absolute;inset:0;background:linear-gradient(to bottom,transparent 35%,rgba(0,0,0,0.75) 60%,#000 100%);"></div>
      <div style="position:absolute;top:48px;left:0;right:0;text-align:center;font-size:22px;font-weight:700;letter-spacing:4px;color:rgba(255,255,255,0.85);">GYMSPIRE</div>
      <div style="position:absolute;bottom:440px;left:48px;background:#2B9BF4;color:#fff;padding:10px 18px;border-radius:4px;font-size:20px;font-weight:700;letter-spacing:1px;white-space:nowrap;">${s.badge || 'NEW ARRIVAL'}</div>
      <div style="position:absolute;bottom:260px;left:48px;right:48px;font-size:62px;font-weight:800;line-height:1.2;color:#fff;white-space:pre-wrap;">${s.title || ''}</div>
      <div style="position:absolute;bottom:195px;left:48px;font-size:30px;font-weight:600;color:rgba(255,255,255,0.8);">${s.price || ''}</div>
      <div style="position:absolute;bottom:130px;left:48px;right:48px;font-size:22px;font-weight:400;color:rgba(255,255,255,0.5);">${s.cta || ''}</div>
    `;
  }
});
