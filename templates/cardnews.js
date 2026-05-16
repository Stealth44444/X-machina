window.GYMSPIRE_TEMPLATES = window.GYMSPIRE_TEMPLATES || [];
window.GYMSPIRE_TEMPLATES.push({
  id: 'cardnews',
  name: '기본',
  defaultSlides: 4,
  maxSlides: 8,
  fields: [
    { key: 'bgImage', label: '배경 이미지', type: 'image',    default: '' },
    { key: 'title',   label: '제목',       type: 'textarea', default: '', placeholder: '이 슬라이드 제목' },
    { key: 'body',    label: '본문',       type: 'textarea', default: '', placeholder: '본문 내용' },
  ],
  fieldsForSlide(index) {
    if (index === 0) return ['bgImage', 'title'];
    return ['bgImage', 'title', 'body'];
  },
  render(s, slideIndex, total) {
    if (slideIndex === 0) {
      return `
        <div style="position:absolute;inset:0;background:linear-gradient(to bottom,transparent 40%,rgba(0,0,0,0.85) 65%,#000 100%);"></div>
        <img src="./gymspire-logo.png" style="position:absolute;top:28px;left:50%;transform:translateX(-50%);height:130px;mix-blend-mode:multiply;opacity:1;pointer-events:none;">
        <div data-drag-key="title" style="position:absolute;bottom:120px;left:48px;right:48px;font-size:68px;font-weight:800;line-height:1.15;color:#fff;white-space:pre-wrap;">${s.title || ''}</div>
      `;
    }
    return window.contentSlide(s, slideIndex, total);
  }
});
