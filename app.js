const state = {
  templateId: 'motivation',
  slideIndex: 0,
  slides: [{}],
};

function getTemplate(id) {
  return window.GYMSPIRE_TEMPLATES.find(t => t.id === id);
}

function init() {
  renderGallery();
  renderPinterest();
  loadTemplate('motivation');
  document.getElementById('exportBtn').addEventListener('click', exportPng);
}

function renderGallery() {}
function renderPinterest() {}
function loadTemplate(id) {}
function scaleCanvas() {}
function renderCanvas() {}
function renderEditor() {}
function exportPng() {}

document.addEventListener('DOMContentLoaded', init);
