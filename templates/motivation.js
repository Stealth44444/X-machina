window.GYMSPIRE_TEMPLATES = window.GYMSPIRE_TEMPLATES || [];
window.GYMSPIRE_TEMPLATES.push({
  id: 'motivation',
  name: '동기부여 / 운동자극',
  slides: 1,
  fields: [
    { key: 'bgImage',   label: '배경 이미지', type: 'image',    default: '' },
    { key: 'showBadge', label: '뱃지 표시',   type: 'toggle',   default: true },
    { key: 'badge',     label: '뱃지 텍스트', type: 'text',     default: '운동자극은 GYMSPIRE', placeholder: '뱃지 텍스트' },
    { key: 'title',     label: '제목',         type: 'textarea', default: 'GYMSPIRE\n운동은 바로 이거야', placeholder: '메인 제목' },
    { key: 'subtitle',  label: '소제목',       type: 'text',     default: '소제목', placeholder: '소제목' },
  ],
  render(s) {
    const badge = (s.showBadge !== false) && s.badge
      ? `<div style="position:absolute;bottom:460px;left:48px;background:#2B9BF4;color:#fff;padding:10px 18px;border-radius:4px;font-size:22px;font-weight:700;letter-spacing:0.5px;white-space:nowrap;">${s.badge}</div>`
      : '';
    return `
      <div style="position:absolute;inset:0;background:linear-gradient(to bottom,transparent 40%,rgba(0,0,0,0.8) 65%,#000 100%);"></div>
      <div style="position:absolute;top:48px;left:0;right:0;text-align:center;font-size:22px;font-weight:700;letter-spacing:4px;color:rgba(255,255,255,0.85);">GYMSPIRE</div>
      ${badge}
      <div style="position:absolute;bottom:220px;left:48px;right:48px;font-size:68px;font-weight:800;line-height:1.15;color:#fff;white-space:pre-wrap;">${s.title || ''}</div>
      <div style="position:absolute;bottom:150px;left:48px;right:48px;font-size:28px;font-weight:400;color:rgba(255,255,255,0.6);">${s.subtitle || ''}</div>
    `;
  }
});
