window.GYMSPIRE_TEMPLATES = window.GYMSPIRE_TEMPLATES || [];
window.GYMSPIRE_TEMPLATES.push({
  id: 'cardnews',
  name: '카드뉴스',
  slides: 5,
  fields: [
    { key: 'bgImage', label: '배경 이미지 (표지)', type: 'image',    default: '' },
    { key: 'title',   label: '제목',               type: 'textarea', default: '', placeholder: '이 슬라이드 제목' },
    { key: 'body',    label: '본문',               type: 'textarea', default: '', placeholder: '본문 내용' },
  ],
  render(s, slideIndex) {
    if (slideIndex === 0) {
      return `
        <div style="position:absolute;inset:0;background:linear-gradient(to bottom,transparent 40%,rgba(0,0,0,0.85) 65%,#000 100%);"></div>
        <div style="position:absolute;top:48px;left:0;right:0;text-align:center;font-size:22px;font-weight:700;letter-spacing:4px;color:rgba(255,255,255,0.85);">GYMSPIRE</div>
        <div style="position:absolute;bottom:300px;left:48px;background:#2B9BF4;color:#fff;padding:10px 18px;border-radius:4px;font-size:20px;font-weight:700;">카드뉴스</div>
        <div style="position:absolute;bottom:120px;left:48px;right:48px;font-size:68px;font-weight:800;line-height:1.15;color:#fff;white-space:pre-wrap;">${s.title || ''}</div>
      `;
    }
    if (slideIndex === 4) {
      return `
        <div style="position:absolute;inset:0;background:#000;"></div>
        <div style="position:absolute;top:48px;left:0;right:0;text-align:center;font-size:22px;font-weight:700;letter-spacing:4px;color:rgba(255,255,255,0.85);">GYMSPIRE</div>
        <div style="position:absolute;top:50%;left:48px;right:48px;transform:translateY(-50%);text-align:center;">
          <div style="font-size:40px;font-weight:800;color:#fff;margin-bottom:24px;">더 많은 콘텐츠는</div>
          <div style="font-size:52px;font-weight:900;color:#2B9BF4;letter-spacing:2px;">@GYMSPIRE</div>
          <div style="font-size:28px;font-weight:400;color:rgba(255,255,255,0.45);margin-top:24px;">팔로우 · 링크 클릭</div>
        </div>
      `;
    }
    return `
      <div style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,0.6) 0%,rgba(0,0,0,0.92) 100%);"></div>
      <div style="position:absolute;top:48px;left:48px;font-size:18px;font-weight:700;letter-spacing:4px;color:rgba(255,255,255,0.35);">GYMSPIRE</div>
      <div style="position:absolute;top:48px;right:48px;font-size:18px;font-weight:400;color:rgba(255,255,255,0.2);">${slideIndex} / 4</div>
      <div style="position:absolute;top:180px;left:48px;right:48px;">
        <div style="font-size:52px;font-weight:800;color:#fff;line-height:1.2;margin-bottom:48px;white-space:pre-wrap;">${s.title || ''}</div>
        <div style="font-size:30px;font-weight:400;color:rgba(255,255,255,0.68);line-height:1.7;white-space:pre-wrap;">${s.body || ''}</div>
      </div>
    `;
  }
});
