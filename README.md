# 三生三世 · 電子喜帖

2027.04.17（民國 116/04/17，星期六）· 川門子 · 午宴

純靜態，無 build step，直接丟 GitHub Pages。

## 檔案

```
index.html          頁面骨架（0 封面 ~ 7 頁尾）
data.js             全站文案與設定 ← 改字只動這裡
css/main.css
js/book.js          三生三世立體繪本（three.js）
js/timeline.js      時間軸
js/rsvp.js          出席回覆
js/guestbook.js     祝福牆（Firestore，未設定則自動隱藏）
js/site.js          封面／婚禮資訊／倒數／行事曆／捲動淡入
assets/photos       婚紗照（w1.jpg w2.jpg w3.jpg，未放則顯示佔位框）
```

## 本機預覽

```bash
python -m http.server 5599
```

開 http://localhost:5599 。直接點兩下 index.html 也能跑。

## 還要填的（都在 data.js）

| 位置 | 內容 |
|---|---|
| `couple` | 新人姓名 |
| `date.ceremony` / `date.seating` | 觀禮、入席時間（目前是 11:30 / 12:00 的暫定值）|
| `venue.address` / `phone` / `transit` / `parking` | 川門子完整地址與交通停車 |
| `worlds[n].photo` | 三世各一張婚紗照 |
| `timeline[n].date` | 認識／告白／求婚的日期 |
| `rsvp.url` | Google Form / Tally 嵌入網址 |
| `rsvp.contacts` | 表單開放前的備援聯絡方式 |
| `guestbook.firebase` | firebaseConfig，填了祝福牆才會啟用 |
| `share.image` | OG 分享圖 1200x630，另需同步 index.html 的 og:image |

沒填的欄位前端會顯示「待補」，不會破版。

## 繪本

- 翻頁由捲動位置驅動（`#chapters` 拉高 340vh + `#book` sticky），不劫持滾輪，
  滑鼠／觸控／鍵盤都是瀏覽器原生行為；章節圓點會捲到對應段落。
- 游標／陀螺儀讓整組圖層傾斜產生景深。iOS 的陀螺儀權限在按下「翻開這本書」時請求。
- WebGL 建立失敗會自動退回 CSS 靜態版（`#page.nogl`），文字與翻頁照常。
- `prefers-reduced-motion` 時關閉飄移並縮短轉場。

## 部署

```bash
git init
git add .
git commit -m "wedding site"
git remote add origin git@github.com:<帳號>/<repo>.git
git push -u origin main
```

Settings -> Pages -> Source 選 `main` / `root`，網址為
`https://<帳號>.github.io/<repo>/`。

自訂網域：Pages 設定填網域，DNS 加 CNAME 指向 `<帳號>.github.io`。

## Firestore 規則

祝福牆用 `wishes` collection，建議規則寫在 js/guestbook.js 檔頭註解裡，
直接複製到 Firebase Console 的規則頁。
