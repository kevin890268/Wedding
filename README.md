# 我們的故事 · 電子喜帖

高凱昱 ＆ 鄭采蕙 ｜ 2027.04.17（民國 116/04/17，星期六）· 川門子 午宴

純靜態網站，沒有 build step、沒有套件相依。直接丟 GitHub Pages 就能用。
線上版：https://kevin890268.github.io/Wedding/

> 設計構想、待辦與尚未定案的討論都在 [ideas.md](ideas.md)。

---

## 快速開始

```bash
python -m http.server 5599
```

開 http://localhost:5599 。直接點兩下 `index.html` 也能跑（three.js 走 CDN，需連網）。

---

## 頁面組成

| 區塊 | 說明 | 負責的檔案 |
|---|---|---|
| 封面 | 書名、日期、「翻開這本書」按鈕 | `js/site.js` |
| 我們的故事 | 時間軸繪本，捲動換格 | `js/book.js`、`js/timeline.js` |
| 婚禮資訊 | 時間、地點、交通、地圖 | `js/site.js` |
| 出席回覆 | 嵌入 Google Form，未設定時顯示備援聯絡方式 | `js/rsvp.js` |
| 祝福牆 | 留言板，後端是 Google Apps Script + 試算表 | `js/guestbook.js` |
| 倒數 | 距離婚禮的天時分秒 | `js/site.js` |
| 頁尾 | 姓名、聯絡方式、加入行事曆（.ics） | `js/site.js` |

---

## 檔案結構

```
Wedding/
├── index.html              頁面骨架（157 行）
├── data.js                 全站文案與設定 ← 改字只動這裡
├── css/main.css
├── js/
│   ├── book.js             three.js 立體繪本、照片分層、背景場景、寵物烏龜
│   ├── timeline.js         右側時間軸節點與捲動同步
│   ├── rsvp.js
│   ├── guestbook.js
│   └── site.js             封面／婚禮資訊／倒數／行事曆／捲動淡入
├── assets/
│   ├── photos/             照片與分層 WebP
│   ├── layers/             （保留）手繪圖層 PNG
│   └── audio/              （保留）背景音樂
├── tools/
│   ├── split_layers.py     把一張照片切成多層去背圖
│   ├── tilt_preview.py     輸出靜態圖檢查視差分層
│   ├── tilt_gif.py         輸出傾斜動畫 GIF
│   ├── guestbook.gs        祝福牆後端，貼到 Google Apps Script
│   └── wishes.sample.json  祝福牆假資料，部署前預覽版面用
├── rsvp-form.md            出席回覆表單的題目草稿
├── ideas.md                設計構想與待辦
└── .claude/launch.json     本機預覽設定
```

---

## 改內容：只動 `data.js`

所有文案與設定集中在 `data.js` 的 `window.SITE`，版面不必動。
沒填的欄位前端會顯示「待補」，不會破版。

| 欄位 | 內容 |
|---|---|
| `couple` | 新人姓名與封面顯示字串 |
| `date` | 日期、觀禮／入席時間、行事曆結束時間 |
| `venue` | 場地名稱、地址、電話、交通、停車、地圖查詢字串 |
| `cover` | 封面標題與按鈕文字 |
| `timeline[]` | 時間軸每一格（見下） |
| `effects` | 照片大小、景深參數與烏龜的全站預設值 |
| `rsvp` | 表單網址、回覆截止日、備援聯絡人 |
| `guestbook` | 祝福牆後端網址與輪詢間隔，見下 |
| `share` | OG 分享標題／描述／圖片 |

`data.js` 裡標了 `TODO` 的就是還沒填的，目前主要缺：多數格的照片與敘事句、RSVP 表單網址、祝福牆 `endpoint`、OG 圖。

> 改 `share.image` 時要同步改 `index.html` 的 `<meta property="og:image">`（那裡要絕對網址）。

### 時間軸每一格

增減格數就直接改 `timeline` 陣列，捲動高度會自動跟著算（每格約一個視窗高）。

| 欄位 | 說明 |
|---|---|
| `date` | 顯示用日期，留空即不顯示 |
| `label` | 節點名稱，時間軸上的字 |
| `place` | 副標，照片的地點 |
| `text` | 敘事句，可用 `<br>` 斷行 |
| `tilt` | 照片框微傾角度 |
| `bg` | 背景漸層三色，由上到下 |
| `scene` | 指定手繪剪紙場景，見下方清單；不填則用 `bg` 推一組通用漸層 |
| `photo` | 單張照片路徑 |
| `photoLayers` | 依深度拆好的圖層，由遠到近；有填就蓋過 `photo` |
| `pending` | `true` 表示還沒發生／還沒拍，節點顯示為虛線 |
| `pet` | 這一格的烏龜，見下 |

可用的 `scene`（定義在 `js/book.js` 的 `SCENES`）：
`garden` `grass` `sea` `city` `park` `japan` `home` `bridge` `banquet` `yuanshan` `window`

### 烏龜

烏龜是介紹照片的吉祥物，每一格都有自己的位置與台詞，游標往牠那一側移動才會從相框邊緣底下探出來。

```js
pet: { text:'我們去新店玩喔', side:'right', y:-0.26 }
pet: '只寫一句話也可以'      // 等同 { text:'…' }
pet: false                   // 這一格不出現
```

| 欄位 | 說明 |
|---|---|
| `text` | 對話框內容，可用 `<br>` 斷行；字太多會自動換行並縮字級。留空就只有烏龜不出對話框 |
| `side` | `'left'` / `'right'`，從相框哪一邊探進來。烏龜的頭會自動轉向畫面內側。不寫則依格數左右交替 |
| `y` | 相對相框中心的高度，`-0.5` 貼上緣、`0` 置中、`0.5` 貼下緣 |
| `size` | 相對相框寬度的大小，預設 `0.34` |
| `image` | 這一格單獨換一張去背 PNG |

全站預設值放在 `effects.pet`（`on` / `side` / `y` / `size` / `image`），
`on: false` 可以一次關掉全部；`side` 填了會強制所有格都同一邊。

---

## 運作方式

- **換格由捲動位置驅動**（`#chapters` 高度依格數自動設定 + `#book` sticky），不劫持滾輪；滑鼠、觸控、鍵盤都是瀏覽器原生行為。右側時間軸節點可點擊跳格。
- 每格 = 背景場景層 + 照片層 + 寵物烏龜，各層放在不同 z，游標／陀螺儀讓整組傾斜，各層再依視差係數 `p` 反向位移產生景深。
- **照片大小**由 `photoOver()` 決定：依螢幕比例取 0.62（寬螢幕）／0.80（方形）／1.02（直式手機），
  再乘上 `effects.photoScale`（目前 `1.5`）。照片永遠置中。
- 直式手機上相框本來就比畫面寬（`photoScale` 為 1 時就已經是 165%），看到的是滿版裁切、
  看不到相框紙邊 —— 這是 `fit()` 強制覆蓋整個畫面的結果。`photoScale` 拉大會讓裁切更多：
  1.5 倍時直式手機的烏龜會被推到畫面外完全看不到。
- iOS 陀螺儀權限在按下封面按鈕時請求（必須有使用者手勢）。
- WebGL 建立失敗會退回 CSS 靜態版（`#page.nogl`），文字與換格照常。
- `prefers-reduced-motion` 時關閉飄移並縮短轉場。

---

## 照片分層

把一張照片依深度切成多層去背圖，各層以不同係數位移，就有立體卡片的感覺。
目前只有新店吊橋那張（`assets/photos/w1-*.webp`）做完六層。

```bash
python -m pip install pillow pillow-heif rembg onnxruntime
python tools/split_layers.py     # 產生 assets/photos/w1-*.webp
python tools/tilt_preview.py     # 輸出 tilt-preview.jpg 檢查視差
```

首次執行 rembg 會下載約 176 MB 的模型，會跑一陣子，不是當掉。

換別張照片時，`tools/split_layers.py` 裡的消失點與各層深度區間要重調 —— 構圖不同分法就不同。詳細的分層原理與注意事項寫在 [ideas.md](ideas.md)。

---

## 部署

```bash
git push origin main
```

Settings → Pages → Source 選 `main` / `/ (root)`。`.nojekyll` 已加，Pages 會跳過 Jekyll 處理。

自訂網域：Pages 設定填網域，DNS 加 CNAME 指向 `kevin890268.github.io`。

> repo 是公開的，推上去婚禮日期、地點、聯絡電話都會被搜尋引擎索引。不想公開就把 repo 設為 private（Pages 需 GitHub Pro）。

---

## 出席回覆

用 Google Form，`js/rsvp.js` 直接 iframe 嵌進頁面。沒填 `rsvp.url` 就顯示備援聯絡方式，不會留白。

嵌入網址要從**傳送 → `<>`（嵌入 HTML）**那裡複製，形如：

```
https://docs.google.com/forms/d/e/1FAIpQLSc…/viewform?embedded=true
```

不是網址列上的那個 —— 少了 `?embedded=true` 會多包一層 Google 的外框。

### 表單題目

完整題目、文案與設定寫在 [rsvp-form.md](rsvp-form.md)，照著建即可。摘要：

- **第 1 部分** 姓名、男方／女方賓客、是否出席午宴（靠這題分岔）
- **第 2 部分** 大人／小孩人數、兒童座椅、全素／蛋奶素各幾位、飲食禁忌、接駁需求、聯絡電話、喜帖寄送地址、給新人的話
- **第 3 部分** 無法出席 —— 只問電話、寄送地址、留言三題

三個容易做壞的地方：「男方／女方賓客」不能省，那是排桌的第一層分組；
素食要拆成「全素幾位」「蛋奶素幾位」兩題，合成一題的話一桌同時有兩種就填不出來；
不能來的人別讓他填人數跟素食。

### 表單設定

- **回覆試算表要另外開一份**，不要跟祝福牆那份混在一起 —— 那份掛著一個公開的
  Apps Script Web App，RSVP 裡有姓名、電話、住址，物理隔離比寫註解可靠。
- 「限制回覆 1 次」**不要開** —— 那會要求賓客登入 Google。
  重複回覆用電話去重就好，讓賓客改主意時能自己重送。
- 不需要收集電子郵件地址，有電話就夠了。
- Google Form 不會自己關。截止日（`rsvp.deadline`）到了要進表單設定把「接受回覆」關掉，
  關掉後 iframe 會顯示 Google 的「已停止接受回覆」，所以那時記得把 `rsvp.url` 改回 `null`，
  讓頁面顯示 `rsvp.contacts` 的備援聯絡方式。

### 訂婚場還沒決定

如果之後確定要請賓客出席訂婚（08:00 A8 福容飯店），表單要在區段 2 加一題
「訂婚場是否出席」單選，網頁的婚禮資訊區也要跟著改成兩場並列 ——
那需要把 `data.js` 的 `venue` 從物件改成陣列、資訊區跑迴圈，光改資料做不到。
細節記在 [ideas.md](ideas.md)。

---

## 祝福牆

GitHub Pages 只送靜態檔、跑不了伺服器程式，所以留言存在一份 Google 試算表裡，中間隔一支 Google Apps Script Web App 當讀寫介面。賓客不需要登入任何帳號。

```
瀏覽器 ──GET──▶ Apps Script /exec ──▶ 試算表 wishes（回傳「核准」或 3 天內的）
       ──POST─▶                   ──▶ 附加一列，狀態預設「待審」
```

### 顯示規則

留言**送出即上牆**，不用等審核。牆上顯示的是「已核准」**或**「3 天內」的留言：

| 狀態 | 意思 | 顯示 |
|---|---|---|
| `待審`（預設） | 剛送出，還沒看過 | 3 天內顯示，超過自動下牆 |
| `核准` | 你看過沒問題 | 永久顯示 |
| `封鎖` | 不要的 | 立刻消失 |

3 天是**寬限期不是保存期** —— 過期只是自動隱藏，之後補標「核准」它就回來。
過濾在讀取時算，不需要排程清理。狀態欄是下拉選單，待審會標黃、封鎖會標紅。

改 `guestbook.gs` 的 `GRACE_DAYS` 調整天數，設成 `0` 就退回純審核制（不核准就完全不顯示）。

**婚禮前記得執行一次 `approveAll()`**，把留言全部轉成「核准」，
否則婚禮當天牆上只剩最近三天的。封鎖過的不會被動到。

後端程式碼與部署步驟在 [tools/guestbook.gs](tools/guestbook.gs)，照檔頭做一遍，把 `/exec` 網址填進 `data.js`：

```js
guestbook: {
  endpoint: 'https://script.google.com/macros/s/AKfy…/exec',
  poll: 60           // 每 60 秒重抓一次；0 = 只在載入時抓
}
```

沒填 `endpoint` 就隱藏表單、顯示「祝福牆準備中」—— **部署之前祝福牆本來就是空的，這不是壞掉。**

想先看版面長怎樣，把 `endpoint` 改指到附的假資料：

```js
endpoint: 'tools/wishes.sample.json'
```

[tools/wishes.sample.json](tools/wishes.sample.json) 是 10 則示範留言，格式跟後端 `doGet` 的回應一樣。
它是靜態檔，只能讀不能寫，所以表單會顯示「送出失敗」—— 預覽用的，看完記得改回 `null`。
留言會不會立刻上牆由後端的 `GRACE_DAYS` 決定，POST 的回應帶 `visible` 告訴前端，
前端不需要也不該重複設定一份。

### 安全性

Web App 網址是公開的，誰都能 POST —— 這是靜態站的必然代價。既然留言立刻上牆，
**`guestbook.gs` 的 `NOTIFY_EMAIL` 一定要填**：有人留言就寄信給你，不對勁的可以馬上標「封鎖」。
這是「立刻顯示」唯一的安全網。最壞情況是一則惡意留言在你看到信之前掛在牆上。

如果婚禮當天要把祝福牆投上大螢幕，那天請改成 `GRACE_DAYS = 0` 走純審核制，
或事先跑 `approveAll()` 然後盯著試算表。

其他已經做掉的防線：表單有一個 CSS 藏起來的蜜罐欄位（機器人才會填，填了就靜默丟棄）、
前端每 20 秒才能送一則、後端每分鐘全站上限 20 則、稱呼與祝福開頭的 `= + - @` 會被砍掉
（否則會被試算表當成公式執行）、控制字元會被清掉、長度截到 20／200。
前端不放任何 token —— 原始碼是公開的，放了等於沒放。

兩個實作上的地雷，改後端時別踩：

- **POST 必須用 `Content-Type: text/plain`。** Apps Script 不處理 CORS preflight，送 `application/json` 會觸發 OPTIONS 然後直接失敗。所以是把 JSON 當純文字送、後端自己 parse。
- **改完 `.gs` 要重新部署新版本**（部署 → 管理部署作業 → 編輯 → 版本：新版本），只按儲存不會生效。網址不會變。
- **`poll` 別設太小。** Apps Script 免費配額是每天 20,000 次請求。婚禮當天同時有 100 個人開著頁面、每 60 秒抓一次，一小時就 6,000 次。要投大螢幕的話，大螢幕那台設短、賓客那份調長到 300 秒。
