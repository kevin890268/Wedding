/* =========================================================================
   guestbook.js — 祝福牆（Google Apps Script Web App）

   後端程式碼與部署步驟：tools/guestbook.gs
   設定在 data.js 的 SITE.guestbook：
     endpoint   Apps Script 的 /exec 網址，沒填就顯示「準備中」並隱藏表單
     poll       每幾秒重新抓一次；0 = 只在載入時抓

   留言會不會立刻上牆是後端說了算（guestbook.gs 的 GRACE_DAYS），
   POST 的回應帶 visible 告訴前端，這裡照著給不同的提示。

   為什麼 POST 用 text/plain：
   Apps Script 的 Web App 不處理 CORS preflight（OPTIONS）。
   Content-Type 一旦是 application/json 就會觸發 preflight 而直接失敗，
   所以把 JSON 當純文字送，後端自己 JSON.parse。
   ========================================================================= */
(function () {
'use strict';

var S    = window.SITE || {};
var cfg  = S.guestbook || {};
var url  = cfg.endpoint;
var form = document.getElementById('gbForm');
var list = document.getElementById('gbList');
var msg  = document.getElementById('gbMsg');
if (!list) return;

if (!url) {
  list.innerHTML = '<li class="gb-empty">祝福牆準備中，敬請期待。</li>';
  return;
}

var loaded = false;
form.hidden = false;
render(null, '載入中…');
fetchWishes();

var every = Number(cfg.poll) || 0;
if (every > 0) {
  setInterval(function () {
    if (document.hidden) return;      /* 分頁在背景就不用一直打 */
    fetchWishes();
  }, every * 1000);
}

function fetchWishes() {
  fetch(url + '?t=' + Date.now(), { method: 'GET', redirect: 'follow' })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d || !d.ok) throw new Error(d && d.error || 'bad response');
      loaded = true;
      render(d.wishes || []);
    })
    .catch(function () {
      if (!loaded) render(null, '祝福牆暫時無法載入，請稍後再試。');
    });
}

function render(wishes, note) {
  if (note) { list.innerHTML = '<li class="gb-empty">' + note + '</li>'; return; }
  if (!wishes.length) {
    list.innerHTML = '<li class="gb-empty">目前還沒有留言，歡迎留下第一則祝福。</li>';
    return;
  }
  var frag = document.createDocumentFragment();
  wishes.forEach(function (w) {
    var li = document.createElement('li');

    var head = document.createElement('div');
    var n = document.createElement('span');
    n.className = 'gb-name';
    n.textContent = w.name || '匿名';
    head.appendChild(n);

    if (w.at) {
      var t = document.createElement('span');
      t.className = 'gb-time';
      t.textContent = fmt(w.at);
      head.appendChild(t);
    }

    var p = document.createElement('p');
    p.className = 'gb-text';
    p.textContent = w.text || '';      /* textContent → 天然防注入 */

    li.appendChild(head); li.appendChild(p);
    frag.appendChild(li);
  });
  list.innerHTML = '';
  list.appendChild(frag);
}

var last = 0;
form.addEventListener('submit', function (e) {
  e.preventDefault();
  var now = Date.now();
  if (now - last < 20000) { say('請稍候片刻再送出下一則'); return; }

  var name = form.name.value.trim().slice(0, 20);
  var text = form.text.value.trim().slice(0, 200);
  if (!name || !text) { say('請填寫您的稱呼與祝福'); return; }

  var btn = form.querySelector('button[type=submit]');
  btn.disabled = true; say('送出中…');

  fetch(url, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      name: name,
      text: text,
      website: form.website ? form.website.value : ''   /* 蜜罐，機器人才會填 */
    })
  })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d || !d.ok) throw new Error(d && d.error || 'rejected');
      last = now;
      form.reset();
      if (d.visible === false) {
        say('謝謝您的祝福！審核後將會顯示在祝福牆上');
      } else {
        say('謝謝您的祝福！');
        fetchWishes();               /* 立刻上牆 → 馬上重抓，讓他看見自己那則 */
      }
    })
    .catch(function () {
      say('抱歉，送出失敗，請稍後再試');
    })
    .then(function () {
      btn.disabled = false;
    });
});

function say(s) {
  msg.textContent = s;
  clearTimeout(say.t);
  say.t = setTimeout(function () { msg.textContent = ''; }, 5000);
}

/* 後端送 ISO 字串過來 */
function fmt(iso) {
  var d = new Date(iso);
  if (isNaN(d)) return '';
  var p = function (n) { return n < 10 ? '0' + n : '' + n; };
  return d.getFullYear() + '.' + p(d.getMonth() + 1) + '.' + p(d.getDate());
}
})();
