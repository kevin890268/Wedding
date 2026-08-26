/* =========================================================================
   timeline.js — 右側時間軸
   節點由 SITE.timeline 產生；點擊與高亮由 book.js 處理（它掌握捲動位置）。
   ========================================================================= */
(function () {
'use strict';

var items = (window.SITE && window.SITE.timeline) || [];
var ol = document.querySelector('#rail ol');
if (!ol || !items.length) return;

items.forEach(function (it, i) {
  var li = document.createElement('li');
  if (it.pending) li.className = 'pending';

  var b = document.createElement('button');
  b.type = 'button';
  b.dataset.i = i;
  b.setAttribute('aria-current', String(i === 0));
  b.setAttribute('aria-label', (it.date || '待定') + ' ' + (it.label || ''));

  var txt = document.createElement('span');
  txt.className = 'txt';

  var d = document.createElement('span');
  d.className = 'd';
  d.textContent = it.date || '待定';

  var l = document.createElement('span');
  l.className = 'l';
  l.textContent = it.label || '';

  txt.appendChild(l); txt.appendChild(d);

  var dot = document.createElement('i');

  b.appendChild(txt); b.appendChild(dot);
  li.appendChild(b);
  ol.appendChild(li);
});

/* 目前這一格捲進時間軸的視野內。
   這裡自己算 scrollTop 而不用 scrollIntoView —— 後者可能連帶捲動整份文件，
   那會再觸發一次換格判斷，把剛換好的格子又推回去。 */
var rail = document.getElementById('rail');
document.addEventListener('book:entry', function (e) {
  var b = ol.querySelector('[data-i="' + e.detail.i + '"]');
  if (!b || !rail) return;
  var want = b.offsetTop - rail.clientHeight / 2 + b.offsetHeight / 2;
  var max = rail.scrollHeight - rail.clientHeight;
  rail.scrollTo({ top: Math.max(0, Math.min(max, want)), behavior: 'smooth' });
});
})();
