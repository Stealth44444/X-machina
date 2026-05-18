window.GYMSPIRE_TEMPLATES = window.GYMSPIRE_TEMPLATES || [];
window.GYMSPIRE_TEMPLATES.push({
  id: 'promo',
  name: '할인 / 프로모션',
  defaultSlides: 1,
  maxSlides: 8,
  fields: [
    { key: 'bgImage',   label: '배경 이미지',  type: 'image', default: '' },
    { key: 'discount',  label: '할인율',       type: 'text',  default: '30% OFF', placeholder: '30% OFF' },
    { key: 'condition', label: '조건',         type: 'text',  default: '전 상품 · 한정수량', placeholder: '조건' },
    { key: 'period',    label: '기간',         type: 'text',  default: '05.15 – 05.20', placeholder: '기간' },
    { key: 'title',     label: '제목 (내용슬라이드)', type: 'textarea', default: '', placeholder: '내용 슬라이드 제목' },
    { key: 'body',      label: '본문',         type: 'textarea', default: '', placeholder: '본문 (**볼드** 지원)' },
  ],
  fieldsForSlide(index) {
    if (index === 0) return ['bgImage', 'discount', 'condition', 'period'];
    return ['bgImage', 'title', 'body'];
  },
  render(s, slideIndex, total) {
    if (slideIndex > 0) return window.contentSlide(s, slideIndex, total);
    return `
      <div style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,0.55) 0%,rgba(0,0,0,0.65) 50%,#000 100%);"></div>
      <div data-drag-key="discount" data-base-transform="translateY(-60%)" style="position:absolute;top:50%;left:48px;right:48px;transform:translateY(-60%);font-size:110px;font-weight:900;line-height:1;color:#fff;letter-spacing:-2px;">${s.discount || ''}</div>
      <div data-drag-key="condition" style="position:absolute;bottom:240px;left:48px;right:48px;font-size:30px;font-weight:600;color:rgba(255,255,255,0.88);">${s.condition || ''}</div>
      <div data-drag-key="period" style="position:absolute;bottom:170px;left:48px;font-size:24px;font-weight:400;color:rgba(255,255,255,0.65);">${s.period || ''}</div>
    `;
  }
});
