/* =========================================================================
   data.js — 全站文案與設定
   原則：這裡改字，版面不動。所有 TODO 標記處請填實際資訊。
   ========================================================================= */
window.SITE = {

  /* ---------- 新人 ---------- */
  couple: {
    groom: '高凱昱',
    bride: '鄭采蕙',
    display: '高凱昱 ＆ 鄭采蕙'         // 封面／頁尾顯示用
  },

  /* ---------- 婚期 ---------- */
  date: {
    iso:      '2027-04-17',           // 民國 116/04/17
    roc:      '民國 116 年 4 月 17 日',
    display:  '2027 . 04 . 17',
    weekday:  '星期六',
    form:     '午宴',
    ceremony: '11:30',                // TODO 確認觀禮時間
    seating:  '12:00',                // TODO 確認入席時間
    endTime:  '14:30'                 // 用於加入行事曆的結束時間
  },

  /* ---------- 場地 ---------- */
  venue: {
    name:    '川門子時尚餐廳',
    hall:    '',                      // TODO 廳別（若有），請跟業務確認
    address: '桃園市蘆竹區南竹路二段 156-2 號',
    phone:   '03-212-4999',
    /* 地圖用完整地址查，避免同名分店導錯地方 */
    mapQuery:'桃園市蘆竹區南竹路二段156-2號 川門子時尚餐廳',
    transit: [
      '開車：國道一號南崁交流道下，往南崁方向沿南竹路二段直行約 5 分鐘',
      '火車：桃園火車站搭中壢客運 106 路（桃園—南崁），於「奉化路口」下車',
      '公車：蘆竹免費公車紫線（開南大學）或高鐵線（青埔），於「南竹派出所」下車即達',
      '公車：蘆竹免費公車棕線（下南崁），於「大聯邦社區」下車，沿南竹路二段步行約 6 分鐘'
    ],
    parking: '備有 200 個停車位'       // TODO 官方資料有 200／240／250 三種說法，請跟餐廳確認
  },

  /* ---------- 封面 ---------- */
  cover: {
    title:  '我們的故事',
    enter:  '翻開這本書'
  },

  /* -------------------------------------------------------------------------
     時間軸 —— 網站的主結構
     捲動時右側時間軸推進，每一格換一張照片。要增減就直接改這個陣列。

     每格可填：
       date       顯示用日期
       label      節點名稱（時間軸上的字）
       place      副標，照片的地點
       text       敘事句，可用 <br> 斷行
       tilt       照片框微傾角度，讓每格不那麼一致
       bg         背景漸層三色，由上到下
       photo      單張照片路徑（沒有分層時用）
       photoLayers 依深度拆好的圖層，由遠到近；有填就蓋過 photo
       scene      指定手繪場景 'garden' / 'grass' / 'sea'，不填則用 bg 漸層背景
       pending    true 表示還沒發生／還沒拍，時間軸上會顯示為待定
       pet        這一格的烏龜。可以只寫一句話（字串），或寫完整物件：
                    text  對話框內容，可用 <br> 斷行；留空就只有烏龜不出對話框
                    side  'left' / 'right'，從相框哪一邊探進來；不寫則左右交替
                    y     相對相框中心的高度，-0.5 貼上緣、0 置中、0.5 貼下緣
                    size  相對相框寬度的大小，預設 0.34
                    image 這一格單獨換一張去背 PNG
                  寫 false 就是這一格沒有烏龜。
     ------------------------------------------------------------------------- */
  timeline: [
    {
      date: '2023.09.03', label: '認識', place: 'Pickpu · 世貿 101', scene: 'city',
      pet: { text:'就是從這裡開始的喔', side:'right', y:-0.30 },
      text: '滑到你的那一則<br>沒想到會滑到最後',
      tilt: -3.2, bg: ['#CFE0D6', '#E7E0CB', '#F0E6D2'],
      photo: null                     // TODO
    },
    {
      date: '2023.10.22', label: '交往', place: '圓山捷運旁', scene: 'yuanshan',
      pet: { text:'那天他們牽手了<br>我有看到', side:'left', y:-0.14 },
      text: '',                       // TODO
      tilt: 2.6, bg: ['#8FC6DA', '#C6E2E6', '#EBF0D9'],
      photo: null                     // TODO
    },
    {
      date: '2024.10.12', label: '日本', place: '', scene: 'japan',
      pet: { text:'我沒去<br>聽說很好吃', side:'right', y:0.06 },
      text: '',                       // TODO
      tilt: -2.0, bg: ['#E4CBB8', '#EDD9C4', '#F3E7D2'],
      photo: null                     // TODO
    },
    {
      date: '2025.05.23', label: '買新家', place: '', scene: 'home',
      pet: { text:'我也有自己的房間', side:'left', y:-0.30 },
      text: '',                       // TODO
      tilt: 2.2, bg: ['#D8CFE0', '#E6DEE8', '#F2ECE0'],
      photo: null                     // TODO
    },
    {
      date: '2025.11.28', label: '求婚', place: '窗邊夕陽', scene: 'window',
      pet: { text:'我在旁邊<br>看完全程', side:'right', y:-0.10 },
      text: '',                       // TODO
      tilt: -2.6, bg: ['#3E3A66', '#8A6A86', '#F3C48C'],
      photo: null                     // TODO
    },
    {
      date: '2026.02.28', label: '一起住', place: '', scene: 'home',
      pet: { text:'從這天開始<br>是三個人', side:'left', y:0.10 },
      text: '',                       // TODO
      tilt: 1.8, bg: ['#CFDCC9', '#E6E4CE', '#F2ECDD'],
      photo: null                     // TODO
    },
    {
      date: '', label: '出遊', place: '新店 · 吊橋', scene: 'bridge',   // TODO 這張是哪一天？
      pet: { text:'我們去新店玩喔', side:'right', y:-0.26 },
      text: '橋一路收到看不見的地方<br>那天走到一半就決定了',
      tilt: -3.0, bg: ['#B9CBD2', '#D3DCD2', '#E9E2CE'],
      photo: 'assets/photos/w1.jpg'
      /* 這張已經依深度拆好六層了，要改回立體版就把上面那行註解掉、改用這段：
      photoLayers: [
        { src: 'assets/photos/w1-sky.webp'    },  // 消失點：遠山、橋的另一端
        { src: 'assets/photos/w1-far.webp'    },  // 遠處林線、對岸、湖面
        { src: 'assets/photos/w1-mid.webp'    },  // 吊橋中段、中景樹
        { src: 'assets/photos/w1-near.webp'   },  // 近段橋面、欄杆、近景樹冠
        { src: 'assets/photos/w1-couple.webp' },  // 人物
        { src: 'assets/photos/w1-fore.webp'   }   // 前景階梯、錨碇
      ] */
    },
    /* ----- 以下三格是「三生三世」婚紗主題，尚未拍攝，標記為待定 ----- */
    {
      date: '', label: '相識', place: '陽明山 · 至善園', pending: true, scene: 'garden',
      pet: { text:'這張還沒拍啦', side:'left', y:-0.30 },
      text: '錯身的那一眼<br>同心結落在橋欄上',
      tilt: -3.2, bg: ['#CFE0D6', '#E7E0CB', '#F0E6D2'],
      photo: null
    },
    {
      date: '', label: '相知', place: '陽明山 · 擎天崗', pending: true, scene: 'grass',
      pet: { text:'婚紗照<br>敬請期待', side:'right', y:-0.06 },
      text: '你藏在背後的<br>剛好和我同一把',
      tilt: 2.6, bg: ['#8FC6DA', '#C6E2E6', '#EBF0D9'],
      photo: null
    },
    {
      date: '', label: '相戀', place: '海邊', pending: true, scene: 'sea',
      pet: { text:'我怕水<br>但我會去', side:'left', y:0.08 },
      text: '焦距落在你手上<br>那個結，沒有再解開',
      tilt: -2.0, bg: ['#3E3A66', '#8A6A86', '#F3C48C'],
      photo: null
    },

    {
      date: '2027.04.17', label: '婚禮', place: '川門子 · 午宴', scene: 'banquet',
      pet: { text:'記得來喔<br>我等你', side:'right', y:-0.20 },
      text: '這一格<br>等你來寫',
      tilt: 0, bg: ['#F0E3D0', '#E7D3BC', '#D8BFA6'],
      photo: null                     // TODO
    }
  ],

  /* ---------- 照片立體化與寵物 ---------- */
  effects: {
    photoScale: 1.5,      // 時間軸照片的整體倍率，1 = 原本大小
    photoRings: 0,        // 沒有 photoLayers 時，照片切成幾圈碎塊；0 = 單張平面照
    idleOrbit: false,     // 靜止一段時間後讓畫面自己緩慢繞動（手機沒游標時才看得到景深）
    photoDepth: 0.42,     // 每層之間的 z 間距，越大越立體、也越容易穿幫
    /* 烏龜是介紹照片的吉祥物，每一格的位置與台詞寫在 timeline[n].pet。
       這裡只放全站預設值，on 設成 false 可以一次關掉全部。 */
    pet: {
      on: true,
      side: null,         // 填 'left' / 'right' 會強制所有格都同一邊；null = 左右交替
      y: -0.26,           // 預設高度，相對相框中心
      size: 0.34,         // 預設大小，相對相框寬度
      image: null         // TODO 換成烏龜去背 PNG，例如 'assets/photos/turtle.png'
    }
  },

  /* ---------- RSVP ----------
     用 Google Form，題目設計見 README。
     url 要用「嵌入」給的那一個（結尾有 ?embedded=true），
     不是網址列上的 /viewform —— 少了 embedded=true 會多一層外框。 */
  rsvp: {
    url: null,                        // TODO https://docs.google.com/forms/d/e/…/viewform?embedded=true
    deadline: '2027-02-17',           // 回覆截止（婚禮前兩個月）
    /* 表單開放前、以及截止後會顯示這裡。Google Form 不會自己關，
       截止日到了要自己去表單設定把「接受回覆」關掉。 */
    contacts: [                       // TODO 無法線上填寫時的備援聯絡方式
      { name: '', phone: '' }
    ]
  },

  /* ---------- 祝福牆 ----------
     後端是 Google Apps Script Web App，程式碼與部署步驟在 tools/guestbook.gs。
     endpoint 填了才會啟用，沒填就顯示「準備中」。 */
  guestbook: {
    endpoint: null,                   // TODO Apps Script 的 /exec 網址
 // endpoint: 'tools/wishes.sample.json',   // ← 改用這行可以先預覽版面（只能讀，送不出去）
    poll: 60                          // 每幾秒重新抓一次留言；0 = 只在載入時抓
    /* 留言送出後會不會立刻上牆，由後端的 GRACE_DAYS 決定並在回應裡告知，
       前端不必也不該重複設定一份。 */
  },

  /* ---------- 分享 ---------- */
  share: {
    title: '我們的故事 · 婚禮邀請',
    description: '2027.04.17 川門子 午宴',
    image: ''                         // TODO assets/photos/og.jpg（1200×630）
  }
};
