/* =========================================================================
   rsvp.js — 出席回覆
   有填 SITE.rsvp.url 就嵌入表單；沒填則顯示備援聯絡方式（不留白）
   ========================================================================= */
(function () {
'use strict';

var S = window.SITE || {};
var cfg = S.rsvp || {};
var box = document.getElementById('rsvpBox');
var dl  = document.getElementById('rsvpDeadline');
if (!box) return;

if (cfg.url) {
  var f = document.createElement('iframe');
  f.src = cfg.url;
  f.title = '出席回覆表單';
  f.loading = 'lazy';
  f.setAttribute('referrerpolicy', 'no-referrer');
  box.appendChild(f);
} else {
  var contacts = (cfg.contacts || []).filter(function (c) { return c && (c.name || c.phone); });
  var html =
    '<div class="fallback">' +
      '<p>線上回覆表單準備中，敬請稍候。<br>' +
      (contacts.length
        ? '如需先行回覆，歡迎直接與我們聯繫：'
        : '如需先行回覆，敬請直接與新人聯繫。') +
      '</p>';
  if (contacts.length) {
    html += '<p style="margin-top:14px">' + contacts.map(function (c) {
      var name = esc(c.name || '新人');
      return c.phone
        ? name + '　<a href="tel:' + esc(c.phone) + '" style="color:var(--thread)">' + esc(c.phone) + '</a>'
        : name;
    }).join('<br>') + '</p>';
  }
  /* 給賓客看的頁面，不放開發備註（待辦：建好表單後把網址填進 data.js 的 rsvp.url） */
  html += '</div>';
  box.innerHTML = html;
}

if (dl && cfg.deadline) {
  var p = String(cfg.deadline).split('-');
  if (p.length === 3) {
    dl.textContent = '敬請於 ' + p[0] + ' 年 ' + (+p[1]) + ' 月 ' + (+p[2]) + ' 日前回覆，以便我們安排席位，謝謝！';
  }
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
})();
