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
    name:    '川門子',
    hall:    '',                      // TODO 廳別（若有）
    address: '',                      // TODO 完整地址，留空時前端顯示「地址待補」
    phone:   '',                      // TODO 餐廳電話
    mapQuery:'川門子',
    transit: [                        // TODO 交通方式，可自由增減
      '捷運：待補',
      '公車：待補'
    ],
    parking: '備有 200 個停車位'
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
     ------------------------------------------------------------------------- */
  timeline: [
    {
      date: '2023.09.03', label: '認識', place: 'Pickpu · 世貿 101', scene: 'city',
      text: '滑到你的那一則<br>沒想到會滑到最後',
      tilt: -3.2, bg: ['#CFE0D6', '#E7E0CB', '#F0E6D2'],
      photo: null                     // TODO
    },
    {
      date: '2023.10.22', label: '交往', place: '圓山捷運旁', scene: 'yuanshan',
      text: '',                       // TODO
      tilt: 2.6, bg: ['#8FC6DA', '#C6E2E6', '#EBF0D9'],
      photo: null                     // TODO
    },
    {
      date: '2024.10.12', label: '日本', place: '', scene: 'japan',
      text: '',                       // TODO
      tilt: -2.0, bg: ['#E4CBB8', '#EDD9C4', '#F3E7D2'],
      photo: null                     // TODO
    },
    {
      date: '2025.05.23', label: '買新家', place: '', scene: 'home',
      text: '',                       // TODO
      tilt: 2.2, bg: ['#D8CFE0', '#E6DEE8', '#F2ECE0'],
      photo: null                     // TODO
    },
    {
      date: '2025.11.28', label: '求婚', place: '窗邊夕陽', scene: 'window',
      text: '',                       // TODO
      tilt: -2.6, bg: ['#3E3A66', '#8A6A86', '#F3C48C'],
      photo: null                     // TODO
    },
    {
      date: '2026.02.28', label: '一起住', place: '', scene: 'home',
      text: '',                       // TODO
      tilt: 1.8, bg: ['#CFDCC9', '#E6E4CE', '#F2ECDD'],
      photo: null                     // TODO
    },
    {
      date: '', label: '出遊', place: '新店 · 吊橋', scene: 'bridge',   // TODO 這張是哪一天？
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
      text: '錯身的那一眼<br>同心結落在橋欄上',
      tilt: -3.2, bg: ['#CFE0D6', '#E7E0CB', '#F0E6D2'],
      photo: null
    },
    {
      date: '', label: '相知', place: '陽明山 · 擎天崗', pending: true, scene: 'grass',
      text: '你藏在背後的<br>剛好和我同一把',
      tilt: 2.6, bg: ['#8FC6DA', '#C6E2E6', '#EBF0D9'],
      photo: null
    },
    {
      date: '', label: '相戀', place: '海邊', pending: true, scene: 'sea',
      text: '焦距落在你手上<br>那個結，沒有再解開',
      tilt: -2.0, bg: ['#3E3A66', '#8A6A86', '#F3C48C'],
      photo: null
    },

    {
      date: '2027.04.17', label: '婚禮', place: '川門子 · 午宴', scene: 'banquet',
      text: '這一格<br>等你來寫',
      tilt: 0, bg: ['#F0E3D0', '#E7D3BC', '#D8BFA6'],
      photo: null                     // TODO
    }
  ],

  /* ---------- 照片立體化與寵物 ---------- */
  effects: {
    photoRings: 0,        // 沒有 photoLayers 時，照片切成幾圈碎塊；0 = 單張平面照
    idleOrbit: false,     // 靜止一段時間後讓畫面自己緩慢繞動（手機沒游標時才看得到景深）
    photoDepth: 0.42,     // 每層之間的 z 間距，越大越立體、也越容易穿幫
    pet: {
      on: true,
      side: 'right',      // 從哪一邊滑進來：'right' 或 'left'
      text: '我們去新店玩喔',
      image: null         // TODO 換成烏龜去背 PNG，例如 'assets/photos/turtle.png'
    }
  },

  /* ---------- RSVP ---------- */
  rsvp: {
    url: null,                        // TODO Google Form / Tally 嵌入網址
    deadline: '2027-03-17',           // 回覆截止（婚禮前一個月）
    contacts: [                       // 無法線上填寫時的備援聯絡方式
      { name: '', phone: '' }         // TODO
    ]
  },

  /* ---------- 祝福牆 ---------- */
  guestbook: {
    firebase: null                    // TODO 填入 firebaseConfig 物件即自動啟用
  },

  /* ---------- 分享 ---------- */
  share: {
    title: '我們的故事 · 婚禮邀請',
    description: '2027.04.17 川門子 午宴',
    image: ''                         // TODO assets/photos/og.jpg（1200×630）
  }
};
