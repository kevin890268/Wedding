/* =========================================================================
   guestbook.gs — 祝福牆後端（Google Apps Script Web App）

   ── 顯示規則 ────────────────────────────────────────────────────────────
   留言送出即上牆，不用等審核。牆上顯示的是「已核准」或「3 天內」的留言：

     狀態      意思                顯示
     待審      剛送出，還沒看過      3 天內顯示，超過自動下牆
     核准      你看過沒問題          永久顯示
     封鎖      不要的               立刻消失

   3 天是寬限期不是保存期 —— 過期只是自動隱藏，之後補打「核准」它就回來。
   過濾在讀取時算，不需要排程清理。

   婚禮前記得執行一次 approveAll()，把想留著的留言全部轉成「核准」，
   否則婚禮當天牆上只剩最近三天的。

   GRACE_DAYS 設成 0 就退回純審核制：不打勾就完全不顯示。

   ── 部署步驟 ────────────────────────────────────────────────────────────
   1. 打開試算表 → 擴充功能 → Apps Script，把這個檔案的內容整份貼進去
   2. 上方函式選單選 setup，按執行。第一次會要求授權，允許即可。
      這會建好 wishes 工作表、標題列與狀態下拉選單。
   3. 右上「部署」→「新增部署作業」→ 類型選「網頁應用程式」
        執行身分：我
        誰可以存取：**所有人**（不是「擁有 Google 帳戶的所有人」，
                                 否則賓客要登入 Google 才能留言）
   4. 複製 /exec 結尾的網址，填進 data.js 的 guestbook.endpoint
   5. 之後每次改這支程式碼，都要「部署 → 管理部署作業 → 編輯 → 版本：新版本」
      才會生效。網址不會變。

   ── 安全性 ──────────────────────────────────────────────────────────────
   Web App 網址是公開的，誰都能 POST，這是靜態站的必然代價。
   既然留言會立刻上牆，NOTIFY_EMAIL 填一下 —— 有人留言就寄信給你，
   看到不對勁的可以馬上標「封鎖」。這是「立刻顯示」唯一的安全網。
   ========================================================================= */

var SHEET_ID   = '1Xd2r052y2JoXlMpesrM2zj77r3vOqzBCn0_U3DmS908';
var SHEET_NAME = 'wishes';

var GRACE_DAYS = 3;      // 待審留言的寬限期，0 = 退回純審核制
var NOTIFY_EMAIL = '';   // 填你的信箱，有新留言就通知；留空不寄

var MAX_NAME   = 20;
var MAX_TEXT   = 200;
var MAX_RETURN = 200;    // 一次最多回傳幾則
var BURST_MAX  = 20;     // 每分鐘全站最多接受幾則，擋灌水

var COL = { at: 1, name: 2, text: 3, status: 4 };   // 1-based
var ST  = { PENDING: '待審', OK: '核准', BLOCK: '封鎖' };


/* ---------- 一次性初始化 ---------- */
function setup() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);

  if (sh.getLastRow() === 0) {
    sh.appendRow(['時間', '稱呼', '祝福', '狀態']);
    sh.getRange(1, 1, 1, 4).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.setColumnWidth(COL.at, 160);
    sh.setColumnWidth(COL.name, 120);
    sh.setColumnWidth(COL.text, 520);
    sh.setColumnWidth(COL.status, 80);
  }

  // 狀態欄做成下拉選單
  var rows = Math.max(1, sh.getMaxRows() - 1);
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList([ST.PENDING, ST.OK, ST.BLOCK], true)
    .setAllowInvalid(false)
    .build();
  sh.getRange(2, COL.status, rows, 1).setDataValidation(rule);

  // 一眼看得出哪些是待審、哪些被封鎖
  var range = sh.getRange(2, 1, rows, 4);
  range.clearFormat();
  range.setBackground(null);
  sh.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$D2="' + ST.PENDING + '"')
      .setBackground('#FFF4D6').setRanges([range]).build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$D2="' + ST.BLOCK + '"')
      .setBackground('#F2D6D6').setFontColor('#999999').setRanges([range]).build()
  ]);

  return '已建好 ' + SHEET_NAME;
}


/* ---------- 婚禮前跑一次：把待審全部轉成核准 ---------- */
function approveAll() {
  var sh = sheet();
  var n  = sh.getLastRow() - 1;
  if (n <= 0) return '沒有留言';

  var range = sh.getRange(2, COL.status, n, 1);
  var vals  = range.getValues();
  var count = 0;
  for (var i = 0; i < vals.length; i++) {
    if (vals[i][0] !== ST.OK && vals[i][0] !== ST.BLOCK) {
      vals[i][0] = ST.OK;
      count++;
    }
  }
  range.setValues(vals);
  return '核准了 ' + count + ' 則（封鎖的沒有動）';
}


/* ---------- 讀：核准的，或還在寬限期內的 ---------- */
function doGet() {
  try {
    var sh = sheet();
    var n  = sh.getLastRow() - 1;
    if (n <= 0) return json({ ok: true, wishes: [] });

    var rows   = sh.getRange(2, 1, n, 4).getValues();
    var cutoff = Date.now() - GRACE_DAYS * 86400000;
    var out    = [];

    for (var i = rows.length - 1; i >= 0 && out.length < MAX_RETURN; i--) {
      var r = rows[i];
      if (!r[COL.text - 1]) continue;

      var st = String(r[COL.status - 1] || ST.PENDING);
      if (st === ST.BLOCK) continue;
      if (st !== ST.OK) {
        // 待審：只在寬限期內顯示
        var t = r[COL.at - 1];
        var ms = (t instanceof Date) ? t.getTime() : new Date(t).getTime();
        if (!(ms >= cutoff)) continue;
      }

      out.push({
        name: String(r[COL.name - 1] || '匿名'),
        text: String(r[COL.text - 1]),
        at:   iso(r[COL.at - 1])
      });
    }
    return json({ ok: true, wishes: out });
  } catch (e) {
    return json({ ok: false, error: String(e) });
  }
}


/* ---------- 寫：新增一則留言 ---------- */
function doPost(e) {
  try {
    var body = {};
    try { body = JSON.parse(e.postData.contents); } catch (err) {}

    // 蜜罐有值 = 機器人。回 ok 讓它以為成功，不要告訴它被擋了。
    if (String(body.website || '').trim()) return json({ ok: true, visible: true });

    var name = clean(body.name, MAX_NAME);
    var text = clean(body.text, MAX_TEXT);
    if (!name || !text) return json({ ok: false, error: 'empty' });

    if (!allow()) return json({ ok: false, error: 'busy' });

    var lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) return json({ ok: false, error: 'busy' });
    try {
      sheet().appendRow([new Date(), name, text, ST.PENDING]);
    } finally {
      lock.releaseLock();
    }

    notify(name, text);
    // GRACE_DAYS > 0 → 待審也看得到，所以送出即上牆
    return json({ ok: true, visible: GRACE_DAYS > 0 });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}


/* ---------- 工具 ---------- */
function sheet() {
  var sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  if (!sh) throw new Error('找不到工作表 ' + SHEET_NAME + '，請先執行 setup()');
  return sh;
}

/* 留言立刻上牆，所以有人留言就通知一聲，不對勁的可以馬上標「封鎖」。
   寄信失敗不能影響留言本身，所以整段包在 try 裡。 */
function notify(name, text) {
  if (!NOTIFY_EMAIL) return;
  try {
    MailApp.sendEmail({
      to: NOTIFY_EMAIL,
      subject: '[祝福牆] ' + name + ' 留言了',
      body: name + '：\n\n' + text +
            '\n\n這則已經在牆上了。要撤下就把試算表的狀態改成「' + ST.BLOCK + '」：\n' +
            'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/edit'
    });
  } catch (e) {}
}

/* 去掉控制字元，並砍掉開頭的 = + - @：
   否則留言會被試算表當成公式，開檔時執行 */
function clean(v, max) {
  return String(v == null ? '' : v)
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/^[=+\-@]+/, '')
    .trim()
    .slice(0, max);
}

/* 每分鐘全站上限。Apps Script 拿不到來源 IP，只能做全域節流。 */
function allow() {
  var c = CacheService.getScriptCache();
  var k = 'gb_' + Math.floor(Date.now() / 60000);
  var n = Number(c.get(k) || 0) + 1;
  c.put(k, String(n), 120);
  return n <= BURST_MAX;
}

function iso(v) {
  if (v instanceof Date) return v.toISOString();
  var d = new Date(v);
  return isNaN(d) ? '' : d.toISOString();
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
