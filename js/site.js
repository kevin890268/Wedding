/* =========================================================================
   site.js — 封面、婚禮資訊、倒數、加入行事曆、捲動淡入、RSVP 浮動鈕
   ========================================================================= */
(function () {
'use strict';

var S = window.SITE || {};
var D = S.date || {}, V = S.venue || {}, C = S.couple || {};
var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* 封面期間鎖捲動；用 JS 加上，萬一 JS 掛掉頁面仍可捲動。
   info.html 這類沒有封面的分頁不能鎖，否則整頁捲不動 */
if (document.getElementById('cover')) document.body.classList.add('locked');

/* ---------- 小工具 ---------- */
function $(id) { return document.getElementById(id); }
function pad(n) { return n < 10 ? '0' + n : '' + n; }
/* 婚禮時刻（台北 +08:00）；time 省略時用觀禮時間 */
function weddingAt(time) {
  var t = time || D.ceremony || '11:30';
  return new Date(D.iso + 'T' + (t.length === 5 ? t : '11:30') + ':00+08:00');
}
var startAt = weddingAt(D.ceremony);
var endAt   = weddingAt(D.endTime);
var dateOK  = !isNaN(startAt.getTime());

/* ---------- 0 封面 ---------- */
(function cover() {
  var el = $('cover'); if (!el) return;

  if (D.display) $('coverDateText').textContent = D.display;
  $('coverDateSub').textContent =
    [D.weekday, D.form, V.name].filter(Boolean).join(' · ');
  if (C.display) $('coverNames').textContent = C.display;

  var load = $('coverLoad');
  var btn  = $('open');
  var ready = false;

  document.addEventListener('book:ready', function () {
    ready = true;
    load.textContent = '';
  });
  /* 保險：3 秒後就算還沒好也放行，長輩不會卡在封面 */
  setTimeout(function () { if (!ready) load.textContent = ''; }, 3000);

  function openBook() {
    el.classList.add('gone');
    document.body.classList.remove('locked');
    var fab = $('rsvpFab');
    if (fab) setTimeout(function () { fab.classList.add('show'); }, 600);
  }

  btn.addEventListener('click', function () {
    openBook();
    if (window.BOOK && window.BOOK.enableTilt) window.BOOK.enableTilt();  /* iOS 陀螺儀需手勢 */
  });

  /* 從外部連結（例如 LINE 圖文選單）帶 #info、#rsvp 等錨點進來時，
     跳過封面直接到該區塊；否則賓客會先卡在封面，按了也不會跳過去。 */
  var target = location.hash.length > 1 && document.getElementById(location.hash.slice(1));
  if (target && target !== el) {
    openBook();
    /* 直接跳過去，不用 html 的 scroll-behavior:smooth —— 平滑捲動要滑六千多 px，
       途中版面一變動或手指一碰就會停在半路 */
    var jump = function () {
      var root = document.documentElement, prev = root.style.scrollBehavior;
      root.style.scrollBehavior = 'auto';
      target.scrollIntoView();
      root.style.scrollBehavior = prev;
    };
    jump();
    /* 圖片與字型載完版面可能再位移，載完再對齊一次 */
    addEventListener('load', jump);
  }
})();

/* ---------- 3 婚禮資訊 ---------- */
(function info() {
  var dl = $('infoList'); if (!dl) return;
  var tbd = '<span class="tbd">待補</span>';

  function row(label, htmlValue, copyText) {
    var d = document.createElement('div');
    d.className = 'row reveal';
    d.innerHTML =
      '<dt>' + label + '</dt><dd>' + htmlValue + '</dd>' +
      (copyText ? '<button class="copy" type="button">複製</button>' : '<span></span>');
    if (copyText) {
      d.querySelector('.copy').addEventListener('click', function () {
        var b = this;
        copy(copyText).then(function () {
          b.textContent = '已複製'; b.classList.add('done');
          setTimeout(function () { b.textContent = '複製'; b.classList.remove('done'); }, 2000);
        });
      });
    }
    dl.appendChild(d);
  }

  row('日期',
    '<span class="big">' + (D.display || '') + '</span>' +
    '<span class="sub">' + [D.roc, D.weekday, D.form].filter(Boolean).join(' · ') + '</span>');

  row('時間',
    '<span class="big">' + (D.ceremony || '') + ' 觀禮</span>' +
    '<span class="sub">' + (D.seating ? D.seating + ' 入席' : '') + '</span>');

  var place = '<span class="big">' + esc(V.name || '') + (V.hall ? '　' + esc(V.hall) : '') + '</span>';
  place += '<span class="sub">' + (V.address ? esc(V.address) : tbd) + '</span>';
  if (V.access) place += '<span class="sub access">' + esc(V.access) + '</span>';
  row('地點', place, V.address ? (V.name + ' ' + V.address) : null);

  if (V.phone) {
    row('電話', '<a href="tel:' + esc(V.phone) + '">' + esc(V.phone) + '</a>', V.phone);
  }

  var transit = (V.transit || []).filter(Boolean);
  row('交通', transit.length ? transit.map(esc).join('<br>') : tbd);
  row('停車', V.parking ? esc(V.parking) : tbd);

  /* 地圖是加分項；沒有地址就只用店名查詢 */
  var q = V.address || V.mapQuery || V.name;
  var acts = $('mapActions');
  if (q && acts) {
    var a = document.createElement('a');
    a.className = 'btn';
    a.href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q);
    a.target = '_blank'; a.rel = 'noopener';
    a.textContent = '在 Google 地圖開啟';
    acts.appendChild(a);

    var frame = $('mapFrame');
    frame.hidden = false;
    var f = document.createElement('iframe');
    f.src = 'https://maps.google.com/maps?q=' + encodeURIComponent(q) + '&output=embed';
    f.title = '婚宴地點地圖';
    f.loading = 'lazy';
    f.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
    frame.appendChild(f);
  }
})();

/* ---------- 6 倒數 ---------- */
(function countdown() {
  var g = $('countGrid'); if (!g || !dateOK) return;
  var note = $('countNote');
  var els = { d: $('cD'), h: $('cH'), m: $('cM'), s: $('cS') };

  function paint() {
    var diff = startAt - Date.now();
    if (diff <= 0) {
      els.d.textContent = els.h.textContent = els.m.textContent = els.s.textContent = '0';
      note.textContent = '今天，謝謝您蒞臨。';
      return true;
    }
    var s = Math.floor(diff / 1000);
    els.d.textContent = Math.floor(s / 86400);
    els.h.textContent = pad(Math.floor(s / 3600) % 24);
    els.m.textContent = pad(Math.floor(s / 60) % 60);
    els.s.textContent = pad(s % 60);
    note.textContent = (D.display || '') + '　' + (V.name || '') + (D.form ? ' · ' + D.form : '');
    return false;
  }
  if (paint()) return;
  var timer = setInterval(function () { if (paint()) clearInterval(timer); }, 1000);
})();

/* ---------- 7 頁尾：聯絡人 + 加入行事曆 ---------- */
(function footer() {
  /* 新人姓名：首頁頁尾、info.html 頂列都用這個 id */
  if (C.display && $('footNames')) $('footNames').textContent = C.display;

  var box = $('footContacts');
  var contacts = ((S.rsvp || {}).contacts || []).filter(function (c) { return c && (c.name || c.phone); });
  if (box) {
    box.innerHTML = contacts.length
      ? contacts.map(function (c) {
          var n = esc(c.name || '新人');
          return c.phone ? n + '　<a href="tel:' + esc(c.phone) + '">' + esc(c.phone) + '</a>' : n;
        }).join('<br>')
      : '';
  }

  var btn = $('icsBtn');
  if (!btn) return;
  if (!dateOK) { btn.setAttribute('aria-disabled', 'true'); return; }

  function z(d) {
    return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T' +
           pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + '00Z';
  }
  var title = (C.display ? C.display + ' ' : '') + '婚禮';
  var loc   = [V.name, V.hall, V.address].filter(Boolean).join(' ');
  var ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//wedding//invitation//ZH',
    'BEGIN:VEVENT',
    'UID:' + D.iso + '-wedding@invitation',
    'DTSTAMP:' + z(new Date()),
    'DTSTART:' + z(startAt),
    'DTEND:' + z(isNaN(endAt.getTime()) ? new Date(startAt.getTime() + 3 * 3600e3) : endAt),
    'SUMMARY:' + title,
    'LOCATION:' + loc,
    'DESCRIPTION:' + [D.ceremony ? D.ceremony + ' 觀禮' : '', D.seating ? D.seating + ' 入席' : ''].filter(Boolean).join('，'),
    'END:VEVENT', 'END:VCALENDAR'
  ].join('\r\n');

  btn.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  btn.download = 'wedding-' + D.iso + '.ics';
})();

/* ---------- 捲動淡入 ---------- */
(function reveal() {
  var els = document.querySelectorAll('.reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(els, function (e) { e.classList.add('in'); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    });
  }, { rootMargin: '0px 0px -12% 0px' });
  Array.prototype.forEach.call(els, function (e) { io.observe(e); });
})();

/* ---------- 共用 ---------- */
function esc(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function copy(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise(function (res) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta); res();
  });
}
})();
