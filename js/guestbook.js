/* =========================================================================
   guestbook.js — 祝福牆（Firebase Firestore）
   未設定 SITE.guestbook.firebase 時：隱藏表單、顯示說明，不報錯
   Firestore 規則建議（Console → 規則）：
     match /wishes/{id} {
       allow read: if true;
       allow create: if request.resource.data.keys().hasOnly(['name','text','createdAt'])
                     && request.resource.data.name is string
                     && request.resource.data.name.size() <= 20
                     && request.resource.data.text is string
                     && request.resource.data.text.size() <= 200;
       allow update, delete: if false;
     }
   ========================================================================= */
(function () {
'use strict';

var S    = window.SITE || {};
var cfg  = (S.guestbook || {}).firebase;
var form = document.getElementById('gbForm');
var list = document.getElementById('gbList');
var msg  = document.getElementById('gbMsg');
if (!list) return;

if (!cfg) {
  list.innerHTML = '<li class="gb-empty">祝福牆準備中，敬請期待。</li>';
  return;
}

var SDK = 'https://www.gstatic.com/firebasejs/9.23.0/';
load(SDK + 'firebase-app-compat.js')
  .then(function () { return load(SDK + 'firebase-firestore-compat.js'); })
  .then(init)
  .catch(function () {
    list.innerHTML = '<li class="gb-empty">祝福牆暫時無法載入。</li>';
  });

function load(src) {
  return new Promise(function (res, rej) {
    var s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
}

function init() {
  var app = firebase.apps.length ? firebase.app() : firebase.initializeApp(cfg);
  var db  = firebase.firestore(app);
  var col = db.collection('wishes');

  form.hidden = false;

  col.orderBy('createdAt', 'desc').limit(100).onSnapshot(function (snap) {
    if (snap.empty) {
      list.innerHTML = '<li class="gb-empty">還沒有留言，來當第一個吧。</li>';
      return;
    }
    list.innerHTML = '';
    snap.forEach(function (doc) {
      var d = doc.data();
      var li = document.createElement('li');

      var head = document.createElement('div');
      var n = document.createElement('span');
      n.className = 'gb-name';
      n.textContent = d.name || '匿名';
      head.appendChild(n);

      if (d.createdAt && d.createdAt.toDate) {
        var t = document.createElement('span');
        t.className = 'gb-time';
        t.textContent = fmt(d.createdAt.toDate());
        head.appendChild(t);
      }

      var p = document.createElement('p');
      p.className = 'gb-text';
      p.textContent = d.text || '';        // textContent → 天然防注入

      li.appendChild(head); li.appendChild(p);
      list.appendChild(li);
    });
  }, function () {
    list.innerHTML = '<li class="gb-empty">祝福牆暫時無法載入。</li>';
  });

  var last = 0;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var now = Date.now();
    if (now - last < 20000) { say('請稍候再送出一則'); return; }

    var name = form.name.value.trim().slice(0, 20);
    var text = form.text.value.trim().slice(0, 200);
    if (!name || !text) { say('請填寫稱呼與祝福'); return; }

    var btn = form.querySelector('button[type=submit]');
    btn.disabled = true; say('送出中…');

    col.add({
      name: name,
      text: text,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function () {
      last = now;
      form.reset();
      say('謝謝你的祝福');
    }).catch(function () {
      say('送出失敗，請稍後再試');
    }).then(function () {
      btn.disabled = false;
    });
  });

  function say(s) {
    msg.textContent = s;
    clearTimeout(say.t);
    say.t = setTimeout(function () { msg.textContent = ''; }, 4000);
  }
}

function fmt(d) {
  var p = function (n) { return n < 10 ? '0' + n : '' + n; };
  return d.getFullYear() + '.' + p(d.getMonth() + 1) + '.' + p(d.getDate());
}
})();
