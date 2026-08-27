# 我們的故事 · 電子喜帖

高凱昱 ＆ 鄭采慧
2027.04.17（民國 116/04/17，星期六）

純靜態、無 build step，直接丟 GitHub Pages。

---

## 1. 婚禮資訊

同一天兩場、兩個場地：

| | 時間 | 地點 |
|---|---|---|
| 訂婚 | 08:00 | A8 福容飯店 |
| 午宴 | 11:30 觀禮 / 12:00 入席（**暫定值，待確認**） | 川門子（備有 200 個停車位） |

目前網頁的婚禮資訊區**只呈現午宴一場**。要同時呈現兩場需要改繪製邏輯（`venue` 改成陣列、資訊區跑迴圈），光改資料做不到。
先決問題：賓客需不需要出席訂婚場？若只有雙方家族參加，就不該放進婚禮資訊區。

## 2. 時間軸 —— 網站的主結構

網站不再切成「三生三世」三章，改成**一條時間軸貫穿**：右側是時間軸，
向下捲動就走過一格一格，每格換一張照片與一組背景。

| 日期 | 節點 | 場景 | 照片 |
|---|---|---|---|
| 2023.09.03 | 認識（Pickpu） | city | 待補 |
| 2023.10.22 | 交往 | park | 待補 |
| 2024.10.12 | 日本 | japan | 待補 |
| 2025.05.23 | 買新家 | home | 待補 |
| 2025.11.28 | 求婚 | sea | 待補 |
| 2026.02.28 | 一起住 | home | 待補 |
| 待確認 | 新店 · 吊橋 | bridge | **已分層完成** |
| 待定 | 相識 · 至善園 | garden | 婚紗照待拍 |
| 待定 | 相知 · 擎天崗 | grass | 婚紗照待拍 |
| 待定 | 相戀 · 海邊 | sea | 婚紗照待拍 |
| 2027.04.17 | 婚禮 | banquet | 待補 |

「三生三世」保留為時間軸上的三格，標記 `pending: true`，
時間軸節點顯示為虛線、日期寫「待定」，照片框寫「婚紗照待拍」。

增減格數就直接改 `data.js` 的 `timeline` 陣列，捲動高度會自動跟著算
（每格約一個視窗高）。

---

## 3. 檔案結構

```
invitation/
├── index.html              頁面骨架（175 行）
├── data.js                 全站文案與設定 ← 改字只動這裡
├── css/main.css
├── js/
│   ├── book.js             立體繪本、照片分層、寵物烏龜
│   ├── timeline.js
│   ├── rsvp.js
│   ├── guestbook.js
│   └── site.js             封面／婚禮資訊／倒數／行事曆／捲動淡入
├── assets/
│   ├── photos/             照片與分層 WebP
│   ├── layers/             （保留）手繪圖層 PNG
│   └── audio/              （保留）背景音樂
├── tools/
│   ├── split_layers.py     把一張照片切成多層去背圖
│   └── tilt_preview.py     離線重現視差效果，用來檢查分層
├── .claude/launch.json     本機預覽設定
└── README.md
```

three.js 走 CDN，其餘都是本地檔案，沒有 build step。

## 4. 本機預覽

```bash
python -m http.server 5599
```

開 http://localhost:5599 。直接點兩下 index.html 也能跑。

---

## 5. 還要填的（都在 `window.SITE`）

設定都在 `data.js` 的 `window.SITE`。

| 欄位 | 內容 | 狀態 |
|---|---|---|
| `couple` | 新人姓名 | 待填（仍是「新郎／新娘」佔位） |
| `date.ceremony` / `seating` | 觀禮、入席時間 | 暫定 11:30 / 12:00 |
| `venue.address` / `phone` / `transit` | 川門子地址、電話、交通 | **待填，優先度最高** |
| `venue.parking` | 停車 | 可填「備有 200 個停車位」 |
| `timeline[n].text` | 各格敘事句 | 多數仍空白 |
| `timeline[n].photo` / `photoLayers` | 各格照片 | 只有「新店」那格有實照 |
| `rsvp.url` | Google Form / Tally 網址 | 待建立 |
| `rsvp.contacts` | 表單開放前的備援聯絡方式 | 待填 |
| `guestbook.firebase` | firebaseConfig | 待建立 |
| `share.image` | OG 分享圖 1200×630 | 待補，另需同步 `<meta og:image>` |

沒填的欄位前端會顯示「待補」，不會破版。

> 地址沒填時，地圖只會用店名「川門子」查詢。若川門子有分店會導到錯的那家 —— 這是最不能出錯的欄位。

---

## 6. 時間軸繪本

- 換格由**捲動位置**驅動（`#chapters` 高度依格數自動設定 + `#book` sticky），
  不劫持滾輪；滑鼠、觸控、鍵盤都是瀏覽器原生行為。
- 右側時間軸節點可直接點擊跳到該格；目前格會自動捲進時間軸視野。
- 每格 = 背景場景層 + 照片層 + 寵物烏龜，各層放在不同 z，
  游標／陀螺儀讓整組傾斜，各層再依視差係數 `p` 反向位移產生景深。
- 背景場景是程式繪製的剪紙風格，共九款：
  `garden` `grass` `sea` `city` `park` `japan` `home` `bridge` `banquet`。
  在 `timeline[n].scene` 指定；不指定則用 `bg` 三色推一組通用漸層背景。
- 背景會鋪滿整個畫面（桌機寬螢幕、手機直式都是），照片層則依螢幕比例
  調整佔比（`photoOver()`：寬螢幕 0.62、方形 0.80、直式手機 1.02），
  確保拆層照片不管什麼裝置都在正中間。
- iOS 陀螺儀權限在按下封面按鈕時請求（必須有使用者手勢）。
- WebGL 建立失敗會退回 CSS 靜態版（`#page.nogl`），文字與換格照常。
- `prefers-reduced-motion` 時關閉飄移並縮短轉場。

## 7. 照片分層

把一張照片依深度切成多層去背圖，各層放在不同 z、以不同係數位移，就會有立體卡片的感覺。

新店吊橋那張是**隧道式構圖**（橋往中央的消失點收束，左右樹叢從上到下都是近景），
所以深度不用水平分帶，而是「離消失點的透視距離」再混一點垂直分量。
切出來是從消失點往外擴的同心殼：sky / far / mid / near / couple / fore。

```bash
python tools/split_layers.py     # 產生 assets/photos/w1-*.webp
python tools/tilt_preview.py     # 輸出 tilt-preview.jpg 檢查視差
```

重點：

- 所有遮罩最後**正規化成總和為 1**，疊回去剛好還原原圖，不重疊也不破洞。
- 羽化要夠寬（目前 0.115），否則天空這種平滑漸層區會看見殼與殼的交界弧線。
- 輸出 WebP。同樣內容 PNG 會從 1.3 MB 胖到 23 MB。
- 人物層用 rembg 另外抽出來蓋在最前面，不然人會被拆到不同深度、邊緣出現雙重影。

需要的套件：

```bash
python -m pip install pillow pillow-heif rembg onnxruntime
```

首次執行 rembg 會下載約 176 MB 的模型，會跑一陣子，不是當掉。

**換別張照片時**：`tools/split_layers.py` 裡的消失點 `VPX, VPY` 與各層深度區間要重調，
構圖不同分法就不同。淺景深的大頭照不適合這套 —— 立體感來自前後景相對位移，
沒有縱深就沒有效果，那種比較適合單純的碎塊卡片。

## 8. 寵物烏龜

畫在照片層之間（不是浮在最上面），所以是從相框邊緣底下鑽出來。
游標往牠那一側移動就探進來，會上下浮動，帶一個對話框。

設定在 `SITE.effects.pet`：`on` 開關、`side` 從哪邊進來、`text` 對話框文字、
`image` 換成去背 PNG 就會用真的那隻烏龜（留 null 則用程式畫的）。

---

## 9. 部署

```bash
git push -u origin main
```

remote 已設為 `https://github.com/kevin890268/Wedding.git`，branch 為 `main`。
推送需要 GitHub 登入，會跳瀏覽器授權視窗，所以要在自己的終端機跑。

Settings → Pages → Source 選 `main` / `/ (root)`，網址為
https://kevin890268.github.io/Wedding/

自訂網域：Pages 設定填網域，DNS 加 CNAME 指向 `kevin890268.github.io`。

> repo 是公開的，推上去婚禮日期、地點、聯絡電話都會被搜尋引擎索引。
> 不想公開就把 repo 設為 private（Pages 需 GitHub Pro）。

## 10. 祝福牆的 Firestore 規則

用 `wishes` collection，建議規則寫在 `js/guestbook.js` 的檔頭註解，
直接複製到 Firebase Console 的規則頁。
