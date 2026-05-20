window.GYMSPIRE_TEMPLATES = window.GYMSPIRE_TEMPLATES || [];
window.GYMSPIRE_TEMPLATES.push({
  id: 'motivation',
  name: '동기부여 / 운동자극',
  defaultSlides: 1,
  maxSlides: 8,
  fields: [
    { key: 'bgImage',  label: '배경 이미지', type: 'image',    default: '' },
    { key: 'title',    label: '제목',         type: 'textarea', default: 'GYMSPIRE\n운동은 바로 이거야', placeholder: '메인 제목' },
    { key: 'subtitle', label: '소제목',       type: 'text',     default: '소제목', placeholder: '소제목' },
    { key: 'body',     label: '본문',         type: 'textarea', default: '', placeholder: '본문 (**볼드** 지원)' },
  ],
  fieldsForSlide(index) {
    if (index === 0) return ['bgImage', 'title', 'subtitle'];
    return ['bgImage', 'title', 'body'];
  },
  render(s, slideIndex, total) {
    if (slideIndex > 0) return window.contentSlide(s, slideIndex, total);
    const f = window.getChannelFonts();
    return `
      <div style="position:absolute;inset:0;background:linear-gradient(to bottom,transparent 40%,rgba(0,0,0,0.8) 65%,#000 100%);"></div>
      <div data-drag-key="title" style="position:absolute;bottom:220px;left:48px;right:48px;font-family:${f.h};font-size:68px;font-weight:${f.hW};line-height:1.15;color:#fff;white-space:pre-wrap;">${s.title || ''}</div>
      <div data-drag-key="subtitle" style="position:absolute;bottom:150px;left:48px;right:48px;font-family:${f.b};font-size:30px;font-weight:${f.bW};color:rgba(255,255,255,0.80);">${s.subtitle || ''}</div>
    `;
  }
});
