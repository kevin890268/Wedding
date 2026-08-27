/* =========================================================================
   book.js — 時間軸繪本

   結構：SITE.timeline 是全站主軸。捲動時右側時間軸推進，每一格換一張照片。
   每一格 = 背景層（手繪場景或 bg 漸層）+ 照片層（依深度拆開）+ 寵物烏龜，
   各層放在不同 z，游標／陀螺儀讓整組傾斜，各層再依 p 係數反向位移產生景深。

   翻頁由捲動位置驅動（#chapters 拉高 + #book sticky），不劫持滾輪。
   ========================================================================= */
(function () {
'use strict';

var S = window.SITE;
var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- 紙紋 ---------- */
(function grain(){
  var c=document.createElement('canvas'); c.width=c.height=150;
  var x=c.getContext('2d'), d=x.createImageData(150,150);
  for(var i=0;i<d.data.length;i+=4){
    var v=200+Math.random()*55;
    d.data[i]=d.data[i+1]=d.data[i+2]=v; d.data[i+3]=26;
  }
  x.putImageData(d,0,0);
  document.documentElement.style.setProperty('--grain','url('+c.toDataURL()+')');
})();

/* ---------- 畫布小工具 ---------- */
var TW=1600, TH=900;
function layerCanvas(){
  var c=document.createElement('canvas'); c.width=TW; c.height=TH;
  return [c, c.getContext('2d')];
}
function vgrad(ctx,stops,y0,y1){
  var g=ctx.createLinearGradient(0,y0||0,0,y1||TH);
  stops.forEach(function(s){ g.addColorStop(s[0],s[1]); });
  return g;
}
/* 把 #RRGGBB 調暗，用來從一組背景色推出前後景 */
function shade(hex,k){
  var n=parseInt(String(hex).replace('#',''),16);
  var r=(n>>16)&255, g=(n>>8)&255, b=n&255;
  return 'rgb('+Math.round(r*k)+','+Math.round(g*k)+','+Math.round(b*k)+')';
}
function ridge(ctx,o){
  var base=o.base, amp=o.amp, freq=o.freq, color=o.color, phase=o.phase||0, soft=o.soft||0;
  ctx.beginPath(); ctx.moveTo(0,TH);
  for(var x=0;x<=TW;x+=8){
    var t=x/TW*Math.PI*2*freq+phase;
    var y=base - Math.sin(t)*amp - Math.sin(t*2.3+1.1)*amp*0.35;
    ctx.lineTo(x,y);
  }
  ctx.lineTo(TW,TH); ctx.closePath();
  if(soft){ ctx.shadowColor='rgba(0,0,0,.35)'; ctx.shadowBlur=soft; ctx.shadowOffsetY=-6; }
  ctx.fillStyle=color; ctx.fill();
  ctx.shadowColor='transparent'; ctx.shadowBlur=0; ctx.shadowOffsetY=0;
}
function tree(ctx,x,y,h,color){
  ctx.fillStyle=color;
  ctx.fillRect(x-h*.035,y-h*.32,h*.07,h*.32);
  for(var i=0;i<3;i++){
    var r=h*(.30-i*.06), cy=y-h*.30-i*h*.20;
    ctx.beginPath(); ctx.ellipse(x,cy,r*1.25,r*.8,0,0,Math.PI*2); ctx.fill();
  }
}
function pagoda(ctx,x,y,w,color){
  ctx.fillStyle=color;
  for(var i=0;i<4;i++){
    var ww=w*(1-i*.16), yy=y-i*w*.44;
    ctx.beginPath();
    ctx.moveTo(x-ww/2,yy); ctx.quadraticCurveTo(x,yy-w*.26,x+ww/2,yy);
    ctx.lineTo(x+ww*.34,yy-w*.10); ctx.lineTo(x-ww*.34,yy-w*.10);
    ctx.closePath(); ctx.fill();
    ctx.fillRect(x-ww*.22,yy-w*.42,ww*.44,w*.32);
  }
  ctx.fillRect(x-w*.012,y-w*2.05,w*.024,w*.18);
}
function bridge(ctx,cx,cy,w,color){
  ctx.fillStyle=color;
  ctx.beginPath();
  ctx.moveTo(cx-w/2,cy);
  ctx.quadraticCurveTo(cx,cy-w*.34,cx+w/2,cy);
  ctx.lineTo(cx+w/2,cy+w*.09);
  ctx.quadraticCurveTo(cx,cy-w*.22,cx-w/2,cy+w*.09);
  ctx.closePath(); ctx.fill();
  ctx.lineWidth=w*.014; ctx.strokeStyle=color;
  for(var i=-4;i<=4;i++){
    var t=i/8, x=cx+t*w*.46;
    var yTop=cy-Math.cos(t*Math.PI)*w*.17-w*.14;
    var yBot=cy-Math.cos(t*Math.PI)*w*.17+w*.01;
    ctx.beginPath(); ctx.moveTo(x,yTop); ctx.lineTo(x,yBot); ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(cx-w*.5,cy-w*.14);
  ctx.quadraticCurveTo(cx,cy-w*.46,cx+w*.5,cy-w*.14);
  ctx.lineWidth=w*.022; ctx.stroke();
}
function willow(ctx,x,color,dir){
  ctx.strokeStyle=color; ctx.lineWidth=7; ctx.lineCap='round';
  for(var i=0;i<16;i++){
    var sx=x+dir*i*26, len=200+Math.random()*300;
    ctx.beginPath(); ctx.moveTo(sx,-20);
    ctx.quadraticCurveTo(sx+dir*40,len*.55,sx+dir*14,len);
    ctx.globalAlpha=.55+Math.random()*.45; ctx.stroke();
  }
  ctx.globalAlpha=1;
}
function grassTuft(ctx,x,y,h,color){
  ctx.strokeStyle=color; ctx.lineWidth=h*.09; ctx.lineCap='round';
  for(var i=-3;i<=3;i++){
    ctx.beginPath(); ctx.moveTo(x,y);
    ctx.quadraticCurveTo(x+i*h*.16,y-h*.7,x+i*h*.34,y-h*(.8+Math.random()*.4));
    ctx.stroke();
  }
}
function wave(ctx,base,amp,color,phase){
  ctx.beginPath(); ctx.moveTo(0,TH);
  for(var x=0;x<=TW;x+=6){
    var y=base-Math.sin(x/TW*Math.PI*5+phase)*amp-Math.sin(x/TW*Math.PI*11+phase*1.7)*amp*.4;
    ctx.lineTo(x,y);
  }
  ctx.lineTo(TW,TH); ctx.closePath(); ctx.fillStyle=color; ctx.fill();
}
function rock(ctx,x,y,w,color){
  ctx.fillStyle=color; ctx.beginPath();
  ctx.moveTo(x-w,y);
  ctx.lineTo(x-w*.55,y-w*.72);
  ctx.lineTo(x-w*.1,y-w*.42);
  ctx.lineTo(x+w*.45,y-w*.9);
  ctx.lineTo(x+w,y);
  ctx.closePath(); ctx.fill();
}
function knot(ctx,x,y,s,color){
  ctx.strokeStyle=color; ctx.lineWidth=s*.17; ctx.lineCap='round'; ctx.lineJoin='round';
  ctx.beginPath();
  ctx.moveTo(x-s,y); ctx.lineTo(x,y-s); ctx.lineTo(x+s,y); ctx.lineTo(x,y+s); ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x-s*.55,y-s*.55); ctx.lineTo(x+s*.55,y+s*.55);
  ctx.moveTo(x+s*.55,y-s*.55); ctx.lineTo(x-s*.55,y+s*.55);
  ctx.stroke();
  ctx.lineWidth=s*.11;
  ctx.beginPath(); ctx.moveTo(x,y+s); ctx.quadraticCurveTo(x-s*.3,y+s*1.9,x-s*.14,y+s*2.6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x,y+s); ctx.quadraticCurveTo(x+s*.3,y+s*1.9,x+s*.16,y+s*2.6); ctx.stroke();
}

/* 更多剪紙零件 */
function building(ctx,x,y,w,h,color,lit){
  ctx.fillStyle=color;
  ctx.fillRect(x-w/2,y-h,w,h);
  if(lit){
    ctx.fillStyle=lit;
    for(var r=0;r<Math.floor(h/46);r++){
      for(var col=0;col<Math.floor(w/34);col++){
        if(Math.random()<.55) continue;
        ctx.fillRect(x-w/2+12+col*34, y-h+16+r*46, 14, 20);
      }
    }
  }
}
function torii(ctx,x,y,w,color){
  ctx.fillStyle=color;
  var h=w*1.15, t=w*.085;
  ctx.fillRect(x-w*.40,y-h,t,h);
  ctx.fillRect(x+w*.40-t,y-h,t,h);
  ctx.beginPath();
  ctx.moveTo(x-w*.60,y-h);
  ctx.lineTo(x+w*.60,y-h);
  ctx.lineTo(x+w*.54,y-h+t*1.5);
  ctx.lineTo(x-w*.54,y-h+t*1.5);
  ctx.closePath(); ctx.fill();
  ctx.fillRect(x-w*.46,y-h+t*3.2,w*.92,t*1.1);
}
function maple(ctx,x,y,h,color){
  ctx.fillStyle=color;
  ctx.fillRect(x-h*.03,y-h*.38,h*.06,h*.38);
  for(var i=0;i<9;i++){
    var a=Math.PI*(0.15+0.7*(i/8)), r=h*(.30+Math.random()*.12);
    ctx.beginPath();
    ctx.ellipse(x-Math.cos(a)*r*.9, y-h*.42-Math.sin(a)*r*.55, h*.13, h*.09, a, 0, 7);
    ctx.fill();
  }
}
function house(ctx,x,y,w,color,lit){
  ctx.fillStyle=color;
  var bh=w*.62;
  ctx.fillRect(x-w/2,y-bh,w,bh);
  ctx.beginPath();
  ctx.moveTo(x-w*.60,y-bh);
  ctx.lineTo(x,y-bh-w*.42);
  ctx.lineTo(x+w*.60,y-bh);
  ctx.closePath(); ctx.fill();
  if(lit){ ctx.fillStyle=lit; ctx.fillRect(x-w*.16,y-bh*.72,w*.32,bh*.34); }
}
function lantern(ctx,x,y,r,color,glow){
  ctx.strokeStyle=color; ctx.lineWidth=r*.14;
  ctx.beginPath(); ctx.moveTo(x,y-r*2.4); ctx.lineTo(x,y-r*1.05); ctx.stroke();
  if(glow){
    var g=ctx.createRadialGradient(x,y,r*.2,x,y,r*2.6);
    g.addColorStop(0,glow); g.addColorStop(1,'rgba(255,180,120,0)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,r*2.6,0,7); ctx.fill();
  }
  ctx.fillStyle=color;
  ctx.beginPath(); ctx.ellipse(x,y,r*.78,r,0,0,7); ctx.fill();
  ctx.fillStyle='rgba(0,0,0,.20)';
  ctx.fillRect(x-r*.5,y-r*1.02,r*1.0,r*.16);
  ctx.fillRect(x-r*.5,y+r*.86,r*1.0,r*.16);
}
/* 台北 101：八個往外撇的節、頂上尖塔 */
function tower101(ctx,x,y,h,color,lit){
  var w=h*.115;
  ctx.fillStyle=color;
  ctx.fillRect(x-w*.86,y-h*.20,w*1.72,h*.20);          /* 裙樓 */
  var segH=h*.088, base=y-h*.20;
  for(var i=0;i<8;i++){
    var top=base-segH*(i+1), bot=base-segH*i;
    ctx.beginPath();
    ctx.moveTo(x-w*.40,bot);
    ctx.lineTo(x-w*.56,top);
    ctx.lineTo(x+w*.56,top);
    ctx.lineTo(x+w*.40,bot);
    ctx.closePath(); ctx.fill();
    if(lit){
      ctx.fillStyle=lit;
      ctx.fillRect(x-w*.30, top+segH*.28, w*.60, segH*.16);
      ctx.fillStyle=color;
    }
  }
  var t=base-segH*8;
  ctx.fillRect(x-w*.26,t-h*.055,w*.52,h*.055);          /* 塔身 */
  ctx.fillRect(x-w*.035,t-h*.155,w*.07,h*.10);          /* 尖塔 */
}
/* 圓山大飯店：寬闊的宮殿式屋頂 */
function grandHotel(ctx,x,y,w,color,lit){
  var bh=w*.30;
  ctx.fillStyle=color;
  ctx.fillRect(x-w/2,y-bh,w,bh);
  if(lit){
    ctx.fillStyle=lit;
    for(var i=0;i<9;i++) ctx.fillRect(x-w*.42+i*w*.095, y-bh*.72, w*.045, bh*.34);
    ctx.fillStyle=color;
  }
  /* 兩層飛簷 */
  [[0,w*1.10],[bh*.42,w*.86]].forEach(function(r){
    var yy=y-bh-r[0], ww=r[1];
    ctx.beginPath();
    ctx.moveTo(x-ww/2,yy);
    ctx.quadraticCurveTo(x,yy-w*.13,x+ww/2,yy);
    ctx.lineTo(x+ww*.44,yy-w*.055);
    ctx.quadraticCurveTo(x,yy-w*.175,x-ww*.44,yy-w*.055);
    ctx.closePath(); ctx.fill();
    ctx.fillRect(x-ww*.40,yy-w*.10,ww*.80,w*.05);
  });
}
/* 長跨距吊橋，和至善園的拱橋不同 */
function suspension(ctx,cy,w,color){
  ctx.strokeStyle=color; ctx.lineWidth=w*.010; ctx.lineCap='round';
  var x0=TW*.5-w/2, x1=TW*.5+w/2, sag=w*.13;
  ctx.beginPath(); ctx.moveTo(x0,cy-w*.20);
  ctx.quadraticCurveTo(TW*.5,cy-w*.20+sag*2,x1,cy-w*.20); ctx.stroke();
  for(var i=0;i<=14;i++){
    var t=i/14, x=x0+(x1-x0)*t;
    var yc=cy-w*.20 + 4*sag*t*(1-t);
    ctx.beginPath(); ctx.moveTo(x,yc); ctx.lineTo(x,cy); ctx.stroke();
  }
  ctx.fillStyle=color;
  ctx.fillRect(x0,cy,w,w*.022);
  ctx.fillRect(x0-w*.02,cy-w*.30,w*.028,w*.32);
  ctx.fillRect(x1-w*.008,cy-w*.30,w*.028,w*.32);
}

/* -------------------------------------------------------------------------
   背景層
   有指定 scene 就用手繪剪紙場景（給「三生三世」那三格用）；
   沒有就從 bg 三色推出一組漸層 + 起伏，各格顏色不同但版面一致。
   ------------------------------------------------------------------------- */
var SCENES = {
  garden: [
    {z:-14,p:.10,draw:function(c){ c.fillStyle=vgrad(c,[[0,'#CFE0D6'],[.55,'#E7E0CB'],[1,'#F0E6D2']]); c.fillRect(0,0,TW,TH);
      c.fillStyle='rgba(255,252,244,.5)'; c.beginPath(); c.arc(TW*.74,TH*.24,150,0,7); c.fill(); }},
    {z:-9.5,p:.26,draw:function(c){ ridge(c,{base:TH*.66,amp:70,freq:.8,color:'#9DB4A6',phase:.4}); }},
    {z:-6.5,p:.44,draw:function(c){ ridge(c,{base:TH*.79,amp:44,freq:1.3,color:'#6E8C77',phase:2.1,soft:26});
      pagoda(c,TW*.19,TH*.72,90,'#4F6B5A'); tree(c,TW*.82,TH*.80,190,'#5C7A66'); tree(c,TW*.90,TH*.82,140,'#658271'); }},
    {z:-3.4,p:.66,draw:function(c){ ridge(c,{base:TH*.93,amp:26,freq:.9,color:'#3E5A49',phase:.9,soft:34});
      bridge(c,TW*.5,TH*.80,520,'#35503F'); knot(c,TW*.615,TH*.735,17,'#C7343F'); }},
    {z:-0.4,p:.92,draw:function(c){ tree(c,TW*.07,TH*1.02,320,'#263B2E'); grassTuft(c,TW*.30,TH*1.0,90,'#2B4234'); grassTuft(c,TW*.70,TH*1.0,110,'#263B2E'); }},
    {z: 2.2,p:1.5,draw:function(c){ willow(c,TW*.03,'#20342A',1); willow(c,TW*.97,'#20342A',-1); }}
  ],
  grass: [
    {z:-14,p:.10,draw:function(c){ c.fillStyle=vgrad(c,[[0,'#8FC6DA'],[.5,'#C6E2E6'],[1,'#EBF0D9']]); c.fillRect(0,0,TW,TH);
      c.fillStyle='rgba(255,255,255,.72)';
      [[.18,.20,110],[.30,.27,72],[.72,.17,130],[.85,.26,84]].forEach(function(a){
        c.beginPath(); c.ellipse(TW*a[0],TH*a[1],a[2]*1.7,a[2],0,0,7); c.fill(); }); }},
    {z:-9.5,p:.26,draw:function(c){ ridge(c,{base:TH*.62,amp:86,freq:.7,color:'#A9C08A',phase:1.4}); }},
    {z:-6.5,p:.44,draw:function(c){ ridge(c,{base:TH*.76,amp:62,freq:1.0,color:'#8AAB63',phase:.2,soft:26});
      c.strokeStyle='#6E8F4C'; c.lineWidth=5;
      for(var i=0;i<9;i++){ var x=TW*(.1+i*.1); c.beginPath(); c.moveTo(x,TH*.72); c.lineTo(x,TH*.66); c.stroke(); } }},
    {z:-3.4,p:.66,draw:function(c){ ridge(c,{base:TH*.95,amp:34,freq:.8,color:'#6B8F49',phase:2.6,soft:34});
      knot(c,TW*.36,TH*.80,16,'#C7343F'); }},
    {z:-0.4,p:.92,draw:function(c){
      for(var i=0;i<26;i++){
        var x=Math.random()*TW, y=Math.random()*TH*.9, r=14+Math.random()*46;
        var g=c.createRadialGradient(x-r*.3,y-r*.3,r*.1,x,y,r);
        g.addColorStop(0,'rgba(255,255,255,.85)'); g.addColorStop(.7,'rgba(214,240,236,.22)'); g.addColorStop(1,'rgba(255,255,255,.5)');
        c.fillStyle=g; c.beginPath(); c.arc(x,y,r,0,7); c.fill();
      }
      grassTuft(c,TW*.14,TH*1.02,120,'#4E6E33'); grassTuft(c,TW*.86,TH*1.02,140,'#4E6E33'); }},
    {z: 2.2,p:1.5,draw:function(c){ for(var i=0;i<14;i++) grassTuft(c,TW*(i/13),TH*1.08,180+Math.random()*90,'#3A5526'); }}
  ],
  sea: [
    {z:-14,p:.10,draw:function(c){ c.fillStyle=vgrad(c,[[0,'#3E3A66'],[.42,'#8A6A86'],[.72,'#E0937A'],[1,'#F3C48C']]); c.fillRect(0,0,TW,TH);
      var s=c.createRadialGradient(TW*.5,TH*.70,10,TW*.5,TH*.70,300);
      s.addColorStop(0,'rgba(255,238,200,.95)'); s.addColorStop(1,'rgba(255,220,170,0)');
      c.fillStyle=s; c.beginPath(); c.arc(TW*.5,TH*.70,300,0,7); c.fill(); }},
    {z:-9.5,p:.26,draw:function(c){ c.fillStyle='#5A5A86'; c.fillRect(0,TH*.72,TW,TH*.28);
      c.fillStyle='rgba(255,228,186,.5)'; c.fillRect(TW*.44,TH*.72,TW*.12,TH*.28); }},
    {z:-6.5,p:.44,draw:function(c){ wave(c,TH*.82,20,'#456398',.4); wave(c,TH*.86,15,'#3A5585',2.2); }},
    {z:-3.4,p:.66,draw:function(c){ wave(c,TH*.94,22,'#2C4470',1.1);
      wave(c,TH*.905,10,'rgba(255,231,196,.35)',3.0);
      knot(c,TW*.64,TH*.80,18,'#C7343F'); }},
    {z:-0.4,p:.92,draw:function(c){ rock(c,TW*.12,TH*1.0,190,'#1E2C46'); rock(c,TW*.90,TH*1.0,150,'#1E2C46');
      wave(c,TH*1.02,26,'#1B2946',.7); }},
    {z: 2.2,p:1.5,draw:function(c){ c.fillStyle='#141F36';
      c.beginPath(); c.moveTo(0,TH); c.lineTo(0,TH*.90); c.quadraticCurveTo(TW*.5,TH*1.04,TW,TH*.88); c.lineTo(TW,TH); c.closePath(); c.fill(); }}
  ],

  /* 城市夜景：在交友軟體上認識的那一晚 */
  city: [
    {z:-14,p:.10,draw:function(c){ c.fillStyle=vgrad(c,[[0,'#141B33'],[.55,'#2E3455'],[1,'#6A5A70']]); c.fillRect(0,0,TW,TH);
      c.fillStyle='rgba(255,246,224,.85)'; c.beginPath(); c.arc(TW*.78,TH*.18,46,0,7); c.fill();
      c.fillStyle='rgba(255,255,255,.55)';
      for(var i=0;i<70;i++){ c.fillRect(Math.random()*TW,Math.random()*TH*.5,2,2); } }},
    {z:-9.5,p:.26,draw:function(c){ c.fillStyle='#252C4A';
      for(var i=0;i<14;i++){ building(c,TW*(.04+i*.072),TH*.70,60+Math.random()*40,120+Math.random()*180,'#252C4A',null); } }},
    {z:-6.5,p:.44,draw:function(c){
      for(var i=0;i<9;i++){ building(c,TW*(.07+i*.11),TH*.84,90+Math.random()*50,180+Math.random()*230,'#1A2039','rgba(255,214,150,.85)'); }
      tower101(c,TW*.72,TH*.84,540,'#161C33','rgba(255,214,150,.75)'); }},
    {z:-3.4,p:.66,draw:function(c){ ridge(c,{base:TH*.98,amp:14,freq:.6,color:'#12172B',phase:1.2,soft:30});
      knot(c,TW*.30,TH*.84,16,'#C7343F'); }},
    {z:-0.4,p:.92,draw:function(c){ c.fillStyle='#0C1020';
      c.fillRect(0,TH*.96,TW,TH*.10);
      tree(c,TW*.06,TH*1.02,240,'#0C1020'); tree(c,TW*.94,TH*1.04,200,'#0C1020'); }},
    {z: 2.2,p:1.5,draw:function(c){ c.fillStyle='#080B16';
      c.beginPath(); c.moveTo(0,TH); c.lineTo(0,TH*.93); c.quadraticCurveTo(TW*.5,TH*1.02,TW,TH*.91); c.lineTo(TW,TH); c.closePath(); c.fill(); }}
  ],

  /* 公園：樹、湖、長椅般的平緩起伏 */
  park: [
    {z:-14,p:.10,draw:function(c){ c.fillStyle=vgrad(c,[[0,'#BBD9E4'],[.5,'#DCE7DA'],[1,'#F1E9D6']]); c.fillRect(0,0,TW,TH);
      c.fillStyle='rgba(255,255,255,.6)';
      [[.22,.18,96],[.68,.14,120]].forEach(function(a){ c.beginPath(); c.ellipse(TW*a[0],TH*a[1],a[2]*1.7,a[2],0,0,7); c.fill(); }); }},
    {z:-9.5,p:.26,draw:function(c){ ridge(c,{base:TH*.64,amp:56,freq:.9,color:'#A7C0A4',phase:.9}); }},
    {z:-6.5,p:.44,draw:function(c){ ridge(c,{base:TH*.78,amp:34,freq:1.1,color:'#7FA07C',phase:2.4,soft:24});
      tree(c,TW*.18,TH*.79,170,'#6B8E69'); tree(c,TW*.30,TH*.81,130,'#749771'); tree(c,TW*.84,TH*.80,190,'#6B8E69'); }},
    {z:-3.4,p:.66,draw:function(c){
      c.fillStyle='#8FB6C4'; c.beginPath(); c.ellipse(TW*.52,TH*.90,TW*.30,TH*.09,0,0,7); c.fill();
      ridge(c,{base:TH*1.00,amp:20,freq:.8,color:'#54744F',phase:.5,soft:30});
      knot(c,TW*.70,TH*.86,16,'#C7343F'); }},
    {z:-0.4,p:.92,draw:function(c){ grassTuft(c,TW*.12,TH*1.02,110,'#3E5B3B'); grassTuft(c,TW*.88,TH*1.02,130,'#3E5B3B');
      tree(c,TW*.03,TH*1.06,300,'#33502F'); }},
    {z: 2.2,p:1.5,draw:function(c){ willow(c,TW*.02,'#2C4629',1); willow(c,TW*.98,'#2C4629',-1); }}
  ],

  /* 日本：鳥居、楓、遠山 */
  japan: [
    {z:-14,p:.10,draw:function(c){ c.fillStyle=vgrad(c,[[0,'#E9C7C0'],[.45,'#F0DCC8'],[1,'#F6EBD8']]); c.fillRect(0,0,TW,TH);
      c.fillStyle='rgba(255,252,246,.75)'; c.beginPath(); c.arc(TW*.24,TH*.20,120,0,7); c.fill(); }},
    {z:-9.5,p:.26,draw:function(c){
      c.fillStyle='#9AA7BE';
      c.beginPath(); c.moveTo(TW*.30,TH*.62); c.lineTo(TW*.56,TH*.20); c.lineTo(TW*.82,TH*.62); c.closePath(); c.fill();
      c.fillStyle='rgba(255,255,255,.85)';
      c.beginPath(); c.moveTo(TW*.492,TH*.31); c.lineTo(TW*.56,TH*.20); c.lineTo(TW*.628,TH*.31);
      c.quadraticCurveTo(TW*.56,TH*.36,TW*.492,TH*.31); c.closePath(); c.fill(); }},
    {z:-6.5,p:.44,draw:function(c){ ridge(c,{base:TH*.76,amp:40,freq:1.1,color:'#8E9E88',phase:1.7,soft:24});
      maple(c,TW*.14,TH*.78,200,'#C2603F'); maple(c,TW*.88,TH*.80,170,'#B85535'); }},
    {z:-3.4,p:.66,draw:function(c){ ridge(c,{base:TH*.94,amp:22,freq:.9,color:'#5F6E58',phase:.4,soft:30});
      torii(c,TW*.50,TH*.90,260,'#B23A34');
      knot(c,TW*.33,TH*.84,16,'#C7343F'); }},
    {z:-0.4,p:.92,draw:function(c){ maple(c,TW*.05,TH*1.06,330,'#9E4630'); maple(c,TW*.96,TH*1.08,300,'#A94E33');
      grassTuft(c,TW*.40,TH*1.02,90,'#4A5943'); }},
    {z: 2.2,p:1.5,draw:function(c){ c.fillStyle='#7E3A28';
      for(var i=0;i<12;i++){
        var x=Math.random()*TW, y=Math.random()*TH;
        c.save(); c.translate(x,y); c.rotate(Math.random()*6);
        c.globalAlpha=.5+Math.random()*.4;
        c.beginPath(); c.ellipse(0,0,16,10,0,0,7); c.fill(); c.restore();
      }
      c.globalAlpha=1; }}
  ],

  /* 家：屋子、圍籬、窗裡的燈 */
  home: [
    {z:-14,p:.10,draw:function(c){ c.fillStyle=vgrad(c,[[0,'#3B4A6B'],[.45,'#8E7E8E'],[1,'#E2B98E']]); c.fillRect(0,0,TW,TH);
      c.fillStyle='rgba(255,246,224,.9)'; c.beginPath(); c.arc(TW*.20,TH*.22,54,0,7); c.fill(); }},
    {z:-9.5,p:.26,draw:function(c){ ridge(c,{base:TH*.68,amp:52,freq:.7,color:'#5E6A80',phase:1.1}); }},
    {z:-6.5,p:.44,draw:function(c){ ridge(c,{base:TH*.80,amp:30,freq:1.0,color:'#48566C',phase:2.6,soft:24});
      house(c,TW*.20,TH*.80,150,'#3B475C','rgba(255,206,140,.9)');
      house(c,TW*.82,TH*.81,120,'#3B475C','rgba(255,206,140,.7)'); }},
    {z:-3.4,p:.66,draw:function(c){ ridge(c,{base:TH*.97,amp:18,freq:.8,color:'#2E394C',phase:.7,soft:30});
      house(c,TW*.50,TH*.92,320,'#25303F','rgba(255,214,150,.95)');
      knot(c,TW*.66,TH*.86,17,'#C7343F'); }},
    {z:-0.4,p:.92,draw:function(c){ c.fillStyle='#1B2331';
      for(var i=0;i<26;i++){ c.fillRect(TW*(i/26)+6,TH*.99,10,TH*.09); }
      c.fillRect(0,TH*1.02,TW,TH*.03);
      tree(c,TW*.07,TH*1.06,260,'#1B2331'); tree(c,TW*.93,TH*1.06,220,'#1B2331'); }},
    {z: 2.2,p:1.5,draw:function(c){ c.fillStyle='#141B26';
      c.beginPath(); c.moveTo(0,TH); c.lineTo(0,TH*.94); c.quadraticCurveTo(TW*.5,TH*1.03,TW,TH*.92); c.lineTo(TW,TH); c.closePath(); c.fill(); }}
  ],

  /* 新店吊橋：長跨距、水面、兩岸山 */
  bridge: [
    {z:-14,p:.10,draw:function(c){ c.fillStyle=vgrad(c,[[0,'#B9CBD2'],[.5,'#D3DCD2'],[1,'#E9E2CE']]); c.fillRect(0,0,TW,TH);
      c.fillStyle='rgba(255,255,255,.55)';
      [[.30,.16,120],[.74,.20,100]].forEach(function(a){ c.beginPath(); c.ellipse(TW*a[0],TH*a[1],a[2]*1.8,a[2],0,0,7); c.fill(); }); }},
    {z:-9.5,p:.26,draw:function(c){ ridge(c,{base:TH*.58,amp:92,freq:.6,color:'#93A79B',phase:.3});
      ridge(c,{base:TH*.66,amp:64,freq:.9,color:'#7E9487',phase:2.2}); }},
    {z:-6.5,p:.44,draw:function(c){
      c.fillStyle='#8FAE9E'; c.fillRect(0,TH*.72,TW,TH*.28);
      c.fillStyle='rgba(255,255,255,.22)'; c.fillRect(0,TH*.72,TW,TH*.02);
      ridge(c,{base:TH*.74,amp:34,freq:1.2,color:'#5F7C68',phase:1.4,soft:22}); }},
    {z:-3.4,p:.66,draw:function(c){ suspension(c,TH*.78,900,'#3F5A4B');
      knot(c,TW*.63,TH*.73,17,'#C7343F'); }},
    {z:-0.4,p:.92,draw:function(c){ ridge(c,{base:TH*1.02,amp:26,freq:.7,color:'#2C4438',phase:.8,soft:30});
      tree(c,TW*.05,TH*1.02,300,'#243A2F'); tree(c,TW*.95,TH*1.04,260,'#243A2F'); }},
    {z: 2.2,p:1.5,draw:function(c){ willow(c,TW*.02,'#1E322A',1); willow(c,TW*.98,'#1E322A',-1); }}
  ],

  /* 喜宴：燈籠、暖光、雙結 */
  banquet: [
    {z:-14,p:.10,draw:function(c){ c.fillStyle=vgrad(c,[[0,'#6E2B2E'],[.5,'#A85440'],[1,'#E8B984']]); c.fillRect(0,0,TW,TH);
      var g=c.createRadialGradient(TW*.5,TH*.62,20,TW*.5,TH*.62,380);
      g.addColorStop(0,'rgba(255,232,190,.55)'); g.addColorStop(1,'rgba(255,210,150,0)');
      c.fillStyle=g; c.beginPath(); c.arc(TW*.5,TH*.62,380,0,7); c.fill(); }},
    {z:-9.5,p:.26,draw:function(c){ c.fillStyle='rgba(255,236,206,.16)';
      for(var i=0;i<7;i++){ c.beginPath(); c.arc(TW*(.08+i*.14),TH*.30,120,0,7); c.fill(); } }},
    {z:-6.5,p:.44,draw:function(c){
      for(var i=0;i<6;i++) lantern(c,TW*(.10+i*.16),TH*.26,46,'#C0343A','rgba(255,196,132,.55)'); }},
    {z:-3.4,p:.66,draw:function(c){ ridge(c,{base:TH*.99,amp:16,freq:.6,color:'#7A2E2B',phase:1.0,soft:30});
      knot(c,TW*.31,TH*.84,19,'#F2E4C6'); knot(c,TW*.69,TH*.84,19,'#F2E4C6'); }},
    {z:-0.4,p:.92,draw:function(c){ for(var i=0;i<5;i++) lantern(c,TW*(.02+i*.245),TH*.10,66,'#A8262C','rgba(255,180,120,.5)');
      c.fillStyle='#5E2022'; c.fillRect(0,TH*1.00,TW,TH*.08); }},
    {z: 2.2,p:1.5,draw:function(c){ c.fillStyle='#4A1A1C';
      c.beginPath(); c.moveTo(0,TH); c.lineTo(0,TH*.95); c.quadraticCurveTo(TW*.5,TH*1.03,TW,TH*.93); c.lineTo(TW,TH); c.closePath(); c.fill(); }}
  ],

  /* 圓山：大飯店、花博公園的樹、捷運高架 */
  yuanshan: [
    {z:-14,p:.10,draw:function(c){ c.fillStyle=vgrad(c,[[0,'#9FC3D8'],[.5,'#D2DFDC'],[1,'#F0E7D4']]); c.fillRect(0,0,TW,TH);
      c.fillStyle='rgba(255,255,255,.6)';
      [[.16,.17,104],[.62,.13,126],[.88,.22,80]].forEach(function(a){
        c.beginPath(); c.ellipse(TW*a[0],TH*a[1],a[2]*1.7,a[2],0,0,7); c.fill(); }); }},
    {z:-9.5,p:.26,draw:function(c){ ridge(c,{base:TH*.60,amp:74,freq:.7,color:'#93AC9C',phase:.6}); }},
    {z:-6.5,p:.44,draw:function(c){ ridge(c,{base:TH*.74,amp:40,freq:1.1,color:'#75937D',phase:2.0,soft:24});
      grandHotel(c,TW*.52,TH*.74,430,'#A8413C','rgba(255,226,176,.9)');
      tree(c,TW*.14,TH*.78,150,'#5F8069'); tree(c,TW*.88,TH*.79,170,'#5F8069'); }},
    {z:-3.4,p:.66,draw:function(c){
      /* 捷運高架：橋墩 + 連續梁 */
      c.fillStyle='#8E9AA6'; c.fillRect(0,TH*.80,TW,TH*.030);
      c.fillStyle='#7C8894';
      for(var i=0;i<7;i++) c.fillRect(TW*(.05+i*.155),TH*.83,26,TH*.12);
      ridge(c,{base:TH*.99,amp:20,freq:.8,color:'#42604A',phase:.9,soft:30});
      knot(c,TW*.30,TH*.86,16,'#C7343F'); }},
    {z:-0.4,p:.92,draw:function(c){ tree(c,TW*.06,TH*1.04,290,'#2E4A34'); tree(c,TW*.95,TH*1.06,250,'#2E4A34');
      grassTuft(c,TW*.42,TH*1.02,100,'#35543A'); }},
    {z: 2.2,p:1.5,draw:function(c){ willow(c,TW*.02,'#253D2A',1); willow(c,TW*.98,'#253D2A',-1); }}
  ],

  /* 窗邊夕陽：室內視角，光從窗外進來 */
  window: [
    {z:-14,p:.10,draw:function(c){ c.fillStyle=vgrad(c,[[0,'#5B4A73'],[.40,'#C97F6F'],[.72,'#E8A472'],[1,'#F6D9A4']]); c.fillRect(0,0,TW,TH);
      var g=c.createRadialGradient(TW*.50,TH*.56,20,TW*.50,TH*.56,340);
      g.addColorStop(0,'rgba(255,240,205,.95)'); g.addColorStop(1,'rgba(255,214,160,0)');
      c.fillStyle=g; c.beginPath(); c.arc(TW*.50,TH*.56,340,0,7); c.fill(); }},
    {z:-9.5,p:.26,draw:function(c){ ridge(c,{base:TH*.70,amp:44,freq:.8,color:'rgba(150,110,120,.55)',phase:1.3});
      c.fillStyle='rgba(120,92,110,.45)';
      for(var i=0;i<10;i++){ building(c,TW*(.05+i*.10),TH*.72,54+Math.random()*40,70+Math.random()*140,'rgba(120,92,110,.45)',null); } }},
    {z:-6.5,p:.44,draw:function(c){
      /* 窗框：外框 + 十字窗櫺 */
      var X=TW*.12,Y=TH*.06,W=TW*.76,H=TH*.80,t=26;
      c.fillStyle='#3A2E33';
      c.fillRect(X-t,Y-t,W+t*2,t); c.fillRect(X-t,Y+H,W+t*2,t);
      c.fillRect(X-t,Y,t,H); c.fillRect(X+W,Y,t,H);
      c.fillRect(X+W/2-t*.45,Y,t*.9,H);
      c.fillRect(X,Y+H*.46-t*.45,W,t*.9); }},
    {z:-3.4,p:.66,draw:function(c){
      /* 窗台與盆栽 */
      c.fillStyle='#4A3A3E'; c.fillRect(0,TH*.86,TW,TH*.06);
      c.fillStyle='#6B4A3A'; c.fillRect(TW*.16,TH*.79,88,TH*.07);
      grassTuft(c,TW*.20,TH*.79,120,'#4E7A4A');
      knot(c,TW*.80,TH*.72,18,'#C7343F'); }},
    {z:-0.4,p:.92,draw:function(c){
      /* 窗簾 */
      c.fillStyle='rgba(246,238,220,.55)';
      c.beginPath(); c.moveTo(0,0); c.lineTo(TW*.13,0);
      c.quadraticCurveTo(TW*.06,TH*.5,TW*.15,TH); c.lineTo(0,TH); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(TW,0); c.lineTo(TW*.87,0);
      c.quadraticCurveTo(TW*.94,TH*.5,TW*.85,TH); c.lineTo(TW,TH); c.closePath(); c.fill(); }},
    {z: 2.2,p:1.5,draw:function(c){ c.fillStyle='#2C2226';
      c.fillRect(0,TH*.97,TW,TH*.09); }}
  ]
};

/* 沒指定 scene 時，從 bg 三色推一組通用背景 */
function genericScene(bg){
  var a=bg[0]||'#CFE0D6', b=bg[1]||'#E7E0CB', d=bg[2]||'#F0E6D2';
  return [
    {z:-14,p:.10,draw:function(c){ c.fillStyle=vgrad(c,[[0,a],[.55,b],[1,d]]); c.fillRect(0,0,TW,TH);
      c.fillStyle='rgba(255,252,244,.32)'; c.beginPath(); c.arc(TW*.76,TH*.22,160,0,7); c.fill(); }},
    {z:-9.5,p:.26,draw:function(c){ ridge(c,{base:TH*.70,amp:64,freq:.8,color:shade(b,.86),phase:.4}); }},
    {z:-6.5,p:.44,draw:function(c){ ridge(c,{base:TH*.86,amp:40,freq:1.2,color:shade(d,.70),phase:2.1,soft:24}); }},
    {z:-0.4,p:.92,draw:function(c){ ridge(c,{base:TH*1.06,amp:30,freq:.7,color:shade(d,.42),phase:1.6,soft:30}); }}
  ];
}

/* -------------------------------------------------------------------------
   照片
   ------------------------------------------------------------------------- */
var FRAME = { w:TW*.42, h:TH*.62 };
FRAME.x = (TW-FRAME.w)/2;
FRAME.y = (TH-FRAME.h)/2-20;

/* 沒有分層圖時：切成同心碎塊，最外圈離鏡頭最近 */
function photoStack(url,note){
  var N = Math.max(0, (S.effects && S.effects.photoRings) || 0);
  var F = FRAME;
  var maxInset = Math.min(F.w,F.h)*0.17;
  var img = null;
  var slabs = [];

  function rectAt(k){
    /* N=0 表示不切碎塊，照片要填滿整個相框，不能內縮 */
    var t = (N<=0) ? 0 : ((k >= N) ? maxInset : maxInset*(k/N));
    return { x:F.x+t, y:F.y+t, w:F.w-t*2, h:F.h-t*2 };
  }

  function paint(k){
    var c = slabs[k].ctx;
    c.clearRect(0,0,TW,TH);

    if(k===0){
      c.save();
      c.shadowColor='rgba(0,0,0,.45)'; c.shadowBlur=46; c.shadowOffsetY=18;
      c.fillStyle='#F6F1E4'; c.fillRect(F.x-22,F.y-22,F.w+44,F.h+92);
      c.restore();
    }

    var outer = rectAt(k);
    var inner = (k >= N) ? null : rectAt(k+1);

    c.save();
    c.beginPath();
    c.rect(outer.x,outer.y,outer.w,outer.h);
    if(inner) c.rect(inner.x,inner.y,inner.w,inner.h);
    c.clip('evenodd');                         /* 兩個矩形 + evenodd = 中空環帶 */

    if(img){
      var s2 = Math.max(F.w/img.width, F.h/img.height);
      c.drawImage(img, F.x+(F.w-img.width*s2)/2, F.y+(F.h-img.height*s2)/2,
                       img.width*s2, img.height*s2);
    }else{
      c.fillStyle='#D9D2C2'; c.fillRect(F.x,F.y,F.w,F.h);
    }

    if(inner){
      c.beginPath(); c.rect(inner.x,inner.y,inner.w,inner.h);
      c.strokeStyle='rgba(0,0,0,.30)'; c.lineWidth=7; c.stroke();
    }
    c.restore();

    if(!img && k >= N){
      c.setLineDash([12,10]); c.strokeStyle='#A79E8A'; c.lineWidth=3;
      c.strokeRect(outer.x+16,outer.y+16,outer.w-32,outer.h-32); c.setLineDash([]);
      c.fillStyle='#8A8271'; c.textAlign='center';
      c.font='300 34px "Noto Serif TC",serif';
      c.fillText(note[0], TW/2, F.y+F.h/2+2);
      c.font='300 20px "Noto Sans TC",sans-serif';
      c.fillText(note[1], TW/2, F.y+F.h/2+44);
    }
    slabs[k].tex.needsUpdate = true;
  }

  for(var k=0;k<=N;k++){
    var pair = layerCanvas();
    var tex = new THREE.CanvasTexture(pair[0]);
    tex.minFilter = THREE.LinearFilter;
    slabs.push({ ctx:pair[1], tex:tex });
  }
  for(var k2=0;k2<=N;k2++) paint(k2);

  if(url){
    var im = new Image(); im.crossOrigin='anonymous';
    im.onload = function(){
      img = im;
      for(var k3=0;k3<slabs.length;k3++) paint(k3);
    };
    im.onerror = function(){
      console.warn('[book] 照片載入失敗，維持佔位圖：', url);
    };
    im.src = url;
  }
  return slabs;
}

/* 內容分層照片：每層一張去背圖，用同一種方式貼進相框所以彼此對齊 */
function photoLayerTexture(url,isBack){
  var pair=layerCanvas(), ctx=pair[1], F=FRAME;
  if(isBack){
    ctx.save();
    ctx.shadowColor='rgba(0,0,0,.45)'; ctx.shadowBlur=46; ctx.shadowOffsetY=18;
    ctx.fillStyle='#F6F1E4'; ctx.fillRect(F.x-22,F.y-22,F.w+44,F.h+92);
    ctx.restore();
    ctx.fillStyle='#D9D2C2'; ctx.fillRect(F.x,F.y,F.w,F.h);
  }
  var t=new THREE.CanvasTexture(pair[0]); t.minFilter=THREE.LinearFilter;
  var im=new Image(); im.crossOrigin='anonymous';
  im.onload=function(){
    ctx.save();
    ctx.beginPath(); ctx.rect(F.x,F.y,F.w,F.h); ctx.clip();
    var s=Math.max(F.w/im.width, F.h/im.height);
    ctx.drawImage(im, F.x+(F.w-im.width*s)/2, F.y+(F.h-im.height*s)/2, im.width*s, im.height*s);
    ctx.restore();
    t.needsUpdate=true;
  };
  im.src=url;
  return t;
}

/* -------------------------------------------------------------------------
   寵物烏龜：畫在照片層之間，所以是從相框邊緣底下鑽出來
   ------------------------------------------------------------------------- */
function drawTurtle(c,cx,cy,r){
  c.fillStyle='#7FA86A';
  [[-1,.10],[1,.10],[-1,.62],[1,.62]].forEach(function(f){
    c.save();
    c.translate(cx+f[0]*r*.86, cy+r*(f[1]-.34));
    c.rotate(f[0]*0.5);
    c.beginPath(); c.ellipse(0,0,r*.30,r*.17,0,0,7); c.fill();
    c.restore();
  });
  c.beginPath();
  c.moveTo(cx-r*.92, cy-r*.06);
  c.lineTo(cx-r*1.24, cy+r*.04);
  c.lineTo(cx-r*.92, cy+r*.16);
  c.closePath(); c.fill();
  c.beginPath(); c.ellipse(cx+r*1.02, cy-r*.20, r*.30, r*.25, -0.2, 0, 7); c.fill();

  /* 開心的臉：彎眼、笑嘴、腮紅 */
  c.strokeStyle='#1B2340'; c.lineWidth=Math.max(2,r*.055); c.lineCap='round';
  c.beginPath(); c.arc(cx+r*1.14, cy-r*.30, r*.075, Math.PI*1.15, Math.PI*1.85); c.stroke();
  c.beginPath(); c.arc(cx+r*.92,  cy-r*.32, r*.065, Math.PI*1.15, Math.PI*1.85); c.stroke();
  c.beginPath(); c.arc(cx+r*1.06, cy-r*.11, r*.10, Math.PI*.15, Math.PI*.85); c.stroke();
  c.fillStyle='rgba(224,128,120,.5)';
  c.beginPath(); c.ellipse(cx+r*1.26, cy-r*.16, r*.07, r*.045, 0,0,7); c.fill();

  c.fillStyle='#4E7A4A';
  c.beginPath(); c.ellipse(cx,cy,r,r*.80,0,0,7); c.fill();
  c.fillStyle='#3C6139';
  c.beginPath(); c.ellipse(cx,cy,r*.995,r*.795,0,Math.PI,Math.PI*2); c.fill();

  c.strokeStyle='rgba(28,44,26,.55)'; c.lineWidth=Math.max(2,r*.055); c.lineJoin='round';
  c.beginPath(); c.ellipse(cx,cy,r*.44,r*.36,0,0,7); c.stroke();
  for(var i=0;i<6;i++){
    var a=i/6*Math.PI*2 + .5;
    c.beginPath();
    c.moveTo(cx+Math.cos(a)*r*.44, cy+Math.sin(a)*r*.36);
    c.lineTo(cx+Math.cos(a)*r*.97, cy+Math.sin(a)*r*.78);
    c.stroke();
  }
  c.strokeStyle='rgba(240,235,215,.35)'; c.lineWidth=Math.max(2,r*.045);
  c.beginPath(); c.ellipse(cx,cy,r*.97,r*.77,0,Math.PI*1.05,Math.PI*1.95); c.stroke();
}

/* 對話框：自動換行、字太多就縮字級，尾巴指向烏龜 */
function bubbleLines(c,text,maxW){
  var out=[];
  String(text).split(/<br\s*\/?>|\n/).forEach(function(seg){
    var line='';
    for(var i=0;i<seg.length;i++){
      var t=line+seg.charAt(i);
      if(line && c.measureText(t).width>maxW){ out.push(line); line=seg.charAt(i); }
      else line=t;
    }
    out.push(line);
  });
  return out;
}

function drawBubble(c,text,SZ,tailX,tailY){
  var maxW=SZ*.78, fs=Math.round(SZ*.078);
  function setF(){ c.font='500 '+fs+'px "Noto Serif TC",serif'; }
  setF();
  var lines=bubbleLines(c,text,maxW);
  while(lines.length>3 && fs>SZ*.048){ fs-=3; setF(); lines=bubbleLines(c,text,maxW); }

  var lh=fs*1.40, padX=fs*.70, padY=fs*.52, tw=0;
  lines.forEach(function(l){ tw=Math.max(tw,c.measureText(l).width); });
  var w=Math.min(maxW,tw)+padX*2, h=lines.length*lh+padY*2;
  var x=Math.max(SZ*.02, Math.min(SZ*.98-w, tailX-w*.42));
  var y=Math.max(SZ*.02, tailY-h-SZ*.04);
  var r=Math.min(h*.34, fs*.9);

  c.save();
  c.shadowColor='rgba(0,0,0,.28)'; c.shadowBlur=14; c.shadowOffsetY=4;
  c.fillStyle='#F6F1E4';
  c.beginPath();
  c.moveTo(x+r,y);
  c.arcTo(x+w,y,x+w,y+h,r);
  c.arcTo(x+w,y+h,x,y+h,r);
  c.arcTo(x,y+h,x,y,r);
  c.arcTo(x,y,x+w,y,r);
  c.closePath(); c.fill();
  /* 尾巴：從框底指向烏龜，錨點夾在圓角之間才不會露在外面 */
  var t0=Math.max(x+r, Math.min(x+w-r-fs*.9, tailX-fs*.75));
  c.beginPath();
  c.moveTo(t0, y+h-2);
  c.lineTo(tailX, tailY);
  c.lineTo(t0+fs*.9, y+h-2);
  c.closePath(); c.fill();
  c.restore();

  c.fillStyle='#1B2340';
  c.textAlign='center'; c.textBaseline='middle';
  setF();
  lines.forEach(function(l,i){ c.fillText(l, x+w/2, y+padY+lh*(i+.5)); });
}

/* 每一格一隻烏龜：cfg = { text, side, y, size, image } */
function petTexture(cfg){
  var SZ=512;
  var c=document.createElement('canvas'); c.width=c.height=SZ;
  var ctx=c.getContext('2d');
  var text=cfg.text||'';
  /* side 是從哪一邊探進來，所以頭要朝畫面內側，左進朝右、右進朝左 */
  var flip=(cfg.side!=='left');
  var tcx=SZ*.44, tcy=SZ*.74, tr=SZ*.19;
  var headX=flip ? SZ-tcx : tcx;

  function compose(img){
    ctx.clearRect(0,0,SZ,SZ);
    ctx.save();
    if(flip){ ctx.translate(SZ,0); ctx.scale(-1,1); }
    if(img){
      var s=Math.min(SZ*.54/img.width, SZ*.54/img.height);
      ctx.drawImage(img, tcx-img.width*s/2, tcy-img.height*s/2, img.width*s, img.height*s);
    }else{
      drawTurtle(ctx, tcx, tcy, tr);
    }
    ctx.restore();
    if(text) drawBubble(ctx, text, SZ, headX, tcy-tr*1.10);
  }

  compose(null);
  var t=new THREE.CanvasTexture(c);
  t.minFilter=THREE.LinearFilter;
  if(cfg.image){
    var im=new Image(); im.crossOrigin='anonymous';
    im.onload=function(){ compose(im); t.needsUpdate=true; };
    im.src=cfg.image;
  }
  return t;
}

/* -------------------------------------------------------------------------
   時間軸資料 → 每一格的組成
   ------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------
   寵物設定：全站給預設，每一格用 timeline[n].pet 覆寫
   pet 可以只寫字串（當成 text），或寫完整物件 { text, side, y, size, image }。
   寫 false 或 { on:false } 就是這一格不出現。
   ------------------------------------------------------------------------- */
var PETDEF = (S.effects && S.effects.pet) || {};
function petOf(t,i){
  if(PETDEF.on===false) return null;
  var p=t.pet;
  if(p===false) return null;
  if(typeof p==='string') p={text:p};
  p=p||{};
  if(p.on===false) return null;
  function pick(k,d){ return p[k]!=null ? p[k] : (PETDEF[k]!=null ? PETDEF[k] : d); }
  return {
    text : p.text!=null ? p.text : '',
    /* 沒指定就左右交替，讓每一格的烏龜不會都停在同一個位置 */
    side : p.side || PETDEF.side || ((i%2) ? 'left' : 'right'),
    y    : pick('y',    -0.26),
    size : pick('size',  0.34),
    image: pick('image', null)
  };
}

var ENTRIES = (S.timeline || []).map(function(t,i){
  var bg = t.bg || ['#CFE0D6','#E7E0CB','#F0E6D2'];
  return {
    date: t.date || '', label: t.label || '', place: t.place || '',
    line: t.text || '', pending: !!t.pending,
    photo: t.photo || null, photoLayers: t.photoLayers || null,
    tilt: t.tilt || 0, pet: petOf(t,i),
    build: SCENES[t.scene] || genericScene(bg),
    fallback: 'linear-gradient(180deg,'+bg[0]+','+bg[1]+' 55%,'+bg[2]+')',
    layers: []
  };
});

/* ---------- DOM ---------- */
var canvas=document.getElementById('stage');
var pageEl=document.getElementById('page');
var chaptersEl=document.getElementById('chapters');
var titleWrap=document.getElementById('titleWrap');
var lineEl=document.getElementById('line');
var cur=0;

function paintText(i){
  var e=ENTRIES[i];
  document.getElementById('era').textContent = e.date || (e.pending ? '待定' : '');
  document.getElementById('chapter').textContent = e.label;
  document.getElementById('place').textContent = e.place;
  lineEl.innerHTML = e.line;
}
function markNav(i){
  var dots=document.querySelectorAll('#rail [data-i]');
  for(var k=0;k<dots.length;k++){
    dots[k].setAttribute('aria-current', String(+dots[k].dataset.i===i));
  }
}
paintText(0);

/* ---------- 捲動 → 第幾格 ---------- */
function sectionMetrics(){
  return { top: chaptersEl.offsetTop,
           range: Math.max(1, chaptersEl.offsetHeight - innerHeight) };
}
function scrollToEntry(i){
  var m=sectionMetrics();
  scrollTo({ top: m.top + m.range*((i+0.5)/ENTRIES.length),
             behavior: reduce ? 'auto' : 'smooth' });
}
function indexFromScroll(){
  var m=sectionMetrics();
  var p=(scrollY-m.top)/m.range;
  return Math.max(0, Math.min(ENTRIES.length-1, Math.floor(p*ENTRIES.length)));
}

var api={ go:scrollToEntry, count:ENTRIES.length, ready:false, entries:ENTRIES };
window.BOOK=api;

var prog=1, from=0;
function setEntry(i){
  if(i===cur) return;
  /* 上一次轉場還沒跑完就又換格：先把那時的舊格收掉。
     不收的話它會一直留在 visible=true，而且每次新轉場的 a=1-e 都從 1 開始，
     等於每切一格它就整格閃一下。 */
  if(prog<1 && groups && groups[from] && from!==i) groups[from].visible=false;
  from=cur; cur=i; prog=0;
  if(groups && groups[cur]) groups[cur].visible=true;
  if(pageEl.classList.contains('nogl')) pageEl.style.setProperty('--fallback',ENTRIES[cur].fallback);

  titleWrap.classList.add('swap'); lineEl.classList.add('swap');
  setTimeout(function(){
    paintText(cur);
    titleWrap.classList.remove('swap'); lineEl.classList.remove('swap');
  },430);
  markNav(cur);
  document.dispatchEvent(new CustomEvent('book:entry',{detail:{i:cur}}));
}

var ticking=false;
addEventListener('scroll',function(){
  if(ticking) return;
  ticking=true;
  requestAnimationFrame(function(){
    ticking=false;
    setEntry(indexFromScroll());
  });
},{passive:true});

/* 時間軸節點點擊（節點由 timeline.js 產生） */
document.addEventListener('click',function(e){
  var b=e.target.closest && e.target.closest('#rail [data-i]');
  if(b) scrollToEntry(+b.dataset.i);
});

/* ---------- WebGL ---------- */
var renderer=null, scene, camera, groups=null;
var CAM_Z=10;

function bootGL(){
  try{ renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:true,alpha:false}); }
  catch(e){ renderer=null; }
  if(!renderer || !window.THREE) return false;
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  scene=new THREE.Scene();
  scene.background=new THREE.Color('#0E1220');
  camera=new THREE.PerspectiveCamera(46,1,.1,100);
  camera.position.z=CAM_Z;
  return true;
}

function texFrom(drawFn){
  var pair=layerCanvas();
  drawFn(pair[1]);
  var t=new THREE.CanvasTexture(pair[0]);
  t.anisotropy=renderer.capabilities.getMaxAnisotropy();
  t.minFilter=THREE.LinearFilter;
  return t;
}

function fit(mesh,z,over){
  over=over||1.18;
  var d=CAM_Z-z;
  var h=2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*d;
  var w=h*camera.aspect;
  var tw=TW/TH;
  var pw=w*over, ph=pw/tw;
  if(ph<h*over){ ph=h*over; pw=ph*tw; }
  mesh.scale.set(pw,ph,1);
}

/* 照片在畫面中的佔比：寬螢幕小一點，直式手機大一點，
   讓拆層照片不管什麼裝置都好好待在正中間。
   effects.photoScale 是整體倍率，1 = 原本大小。 */
function photoOver(){
  var a=camera.aspect;
  var k=(S.effects && S.effects.photoScale) || 1;
  var base = (a>1.20) ? 0.62 : (a>0.85) ? 0.80 : 1.02;
  return base*k;
}

function frameWorld(z){
  var d=CAM_Z-z;
  var h=2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*d;
  var w=h*camera.aspect;
  var tw=TW/TH, over=photoOver();
  var pw=w*over, ph=pw/tw;
  if(ph<h*over){ ph=h*over; pw=ph*tw; }
  return { fw: pw*(FRAME.w/TW), fh: ph*(FRAME.h/TH), cy: ph*(20/TH) };
}

function buildPhoto(e,g){
  var zCore=-1.9, step=(S.effects && S.effects.photoDepth) || 0.42;
  var made=[];

  if(e.photoLayers && e.photoLayers.length){
    e.photoLayers.forEach(function(L,i){
      var z=(L.z!=null)?L.z:(zCore+i*step);
      var m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),
        new THREE.MeshBasicMaterial({map:photoLayerTexture(L.src,i===0),transparent:true,depthWrite:false}));
      m.userData.p=(L.p!=null)?L.p:(.52+i*0.115);   /* 拉開視差係數，景深才讀得出來 */
      m.userData.z=z; m.userData.photo=true;
      made.push(m);
    });
  }else{
    var note = e.pending ? ['婚紗照待拍','三生三世主題'] : ['照片待補','之後替換此區'];
    var slabs=photoStack(e.photo,note), N=slabs.length-1;
    slabs.forEach(function(sl,i){
      var z=zCore+(N-i)*step;                 /* 最外圈離鏡頭最近 */
      var m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),
        new THREE.MeshBasicMaterial({map:sl.tex,transparent:true,depthWrite:false}));
      m.userData.p=.78+(N-i)*0.030;
      m.userData.z=z; m.userData.photo=true;
      made.push(m);
    });
  }

  made.forEach(function(m){
    m.position.set(0,0,m.userData.z);
    m.rotation.z=THREE.MathUtils.degToRad(e.tilt);
    g.add(m); e.layers.push(m);
  });
}

function buildPet(e,g){
  var cfg=e.pet;
  if(!cfg) return;
  var z=-1.2;
  var m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),
    new THREE.MeshBasicMaterial({map:petTexture(cfg),transparent:true,depthWrite:false}));
  m.userData.pet=true;
  m.userData.side=(cfg.side==='left')?-1:1;
  m.userData.yf=cfg.y; m.userData.sz=cfg.size;
  m.userData.z=z; m.userData.k=0;
  m.position.set(0,0,z);
  g.add(m); e.layers.push(m);
}

function buildEntries(){
  groups = ENTRIES.map(function(e,ei){
    var g=new THREE.Group();
    g.visible = ei===cur;          /* 載入期間已捲到別格也能正確顯示 */
    e.layers=[];

    e.build.forEach(function(spec){
      var m=new THREE.Mesh(
        new THREE.PlaneGeometry(1,1),
        new THREE.MeshBasicMaterial({map:texFrom(spec.draw),transparent:true,depthWrite:false})
      );
      m.position.z=spec.z;
      m.userData.p=spec.p;
      m.userData.z=spec.z;
      g.add(m); e.layers.push(m);
    });

    buildPhoto(e,g);
    buildPet(e,g);

    scene.add(g);
    return g;
  });
}

/* 烏龜擺在相框角落外側，滑進來時往內移 */
function placePet(m){
  var F=frameWorld(m.userData.z);
  var size=F.fw*(m.userData.sz||0.34);
  m.scale.set(size,size,1);
  var edge=F.fw/2, d=m.userData.side;
  m.userData.hideX = d*(edge + size*0.58);
  m.userData.showX = d*(edge - size*0.30);
  m.userData.baseY = F.cy + F.fh*(m.userData.yf!=null?m.userData.yf:-0.26);
  m.userData.bob   = size*0.05;
}

function resize(){
  if(!renderer) return;
  var w=canvas.clientWidth, h=canvas.clientHeight;
  if(!w||!h) return;
  renderer.setSize(w,h,false);
  camera.aspect=w/h; camera.updateProjectionMatrix();
  ENTRIES.forEach(function(e){
    e.layers.forEach(function(m){
      if(m.userData.pet){ placePet(m); return; }
      fit(m,m.userData.z, m.userData.photo?photoOver():1.18);
    });
  });
}

/* ---------- 傾斜（游標／陀螺儀／閒置自轉） ---------- */
var px=0,py=0,tx=0,ty=0;
var lastInput=0;                     /* 最後一次真實輸入的時間 */
function pointer(x,y){
  var r=canvas.getBoundingClientRect();
  if(!r.width||!r.height) return;
  tx=((x-r.left)/r.width -.5)*2;
  ty=((y-r.top)/r.height-.5)*2;
  lastInput=performance.now();
}
addEventListener('pointermove',function(e){ pointer(e.clientX,e.clientY); });
addEventListener('touchmove',function(e){
  if(e.touches[0]) pointer(e.touches[0].clientX,e.touches[0].clientY);
},{passive:true});

function onOrient(e){
  if(e.gamma==null) return;
  tx=Math.max(-1,Math.min(1,e.gamma/26));
  ty=Math.max(-1,Math.min(1,(e.beta-45)/26));
  lastInput=performance.now();
}
/* iOS 需在使用者手勢後請求權限；由封面按鈕呼叫 */
api.enableTilt=function(){
  var DOE=window.DeviceOrientationEvent;
  if(!DOE) return;
  if(typeof DOE.requestPermission==='function'){
    DOE.requestPermission().then(function(state){
      if(state==='granted') addEventListener('deviceorientation',onOrient);
    }).catch(function(){});
  }else{
    addEventListener('deviceorientation',onOrient);
  }
};

/* ---------- 迴圈 ---------- */
var IDLE_ON=!!(S.effects && S.effects.idleOrbit);
var IDLE_AFTER=2200;   /* 靜止多久後開始自轉，毫秒 */
var IDLE_SPEED=0.42;   /* 自轉速度 */
var IDLE_AMP=0.62;     /* 自轉幅度，1 = 等同游標移到畫面邊緣 */
var clock;
function tick(){
  requestAnimationFrame(tick);
  var t=clock.getElapsedTime();

  /* 沒有游標也沒有陀螺儀時自己繞一圈，否則手機與靜止的桌機看不到景深。
     一有真實輸入就交還控制權。 */
  if(IDLE_ON && !reduce && performance.now()-lastInput > IDLE_AFTER){
    var a=t*IDLE_SPEED;
    tx=Math.sin(a)*IDLE_AMP;
    ty=Math.cos(a)*IDLE_AMP*0.42;
  }

  px+=(tx-px)*.055; py+=(ty-py)*.055;

  if(prog<1){
    prog=Math.min(1,prog+(reduce?.2:.028));
    if(prog>=1 && groups[from]) groups[from].visible=false;
  }
  var e=prog<1 ? 1-Math.pow(1-prog,3) : 1;

  groups.forEach(function(g,gi){
    if(!g.visible) return;
    /* 場上只該有 cur 與 from 兩格，其餘一律收掉 */
    if(gi!==cur && gi!==from){ g.visible=false; return; }
    var incoming = gi===cur;
    var a = incoming ? e : 1-e;

    g.rotation.y = px*0.11;
    g.rotation.x = -py*0.07;
    g.position.z = incoming ? (1-e)*-6 : e*5;

    g.children.forEach(function(m,li){
      if(m.userData.pet){
        var f=m.userData;
        /* 游標往烏龜那一側移動 → 探出來的比例 */
        var want=Math.max(0,Math.min(1,(px*f.side-0.02)/0.55));
        f.k += (want-f.k)*(reduce?0.4:0.075);
        m.position.x = f.hideX + (f.showX-f.hideX)*f.k;
        m.position.y = f.baseY + (reduce?0:Math.sin(t*1.7)*f.bob*f.k);
        m.rotation.z = (1-f.k)*0.42*f.side - (reduce?0:Math.sin(t*1.7)*0.05*f.k);
        m.material.opacity = (incoming?e:a) * Math.min(1,f.k*2.2);
        return;
      }
      var p=m.userData.p;
      var drift = reduce?0:Math.sin(t*.28+li)*0.012*p;
      m.position.x = -px*p*0.95 + drift;
      m.position.y =  py*p*0.62;
      var denom = (1-li*0.045)||1;
      var stagger=Math.max(0,Math.min(1,(e-li*0.045)/denom));
      m.material.opacity = incoming ? stagger : a;
    });
  });

  renderer.render(scene,camera);
}

/* ---------- 啟動 ---------- */
function start(){
  /* 捲動高度依格數決定：一格約一個視窗高 */
  chaptersEl.style.height = (ENTRIES.length * 100 + 40) + 'vh';

  if(!bootGL()){
    /* 低階裝置／WebGL 失敗 → 靜態 CSS 版，文字與換格照常 */
    pageEl.classList.add('nogl');
    pageEl.style.setProperty('--fallback',ENTRIES[0].fallback);
    api.ready=true;
    document.dispatchEvent(new CustomEvent('book:ready',{detail:{gl:false}}));
    return;
  }
  buildEntries();
  new ResizeObserver(resize).observe(pageEl);
  addEventListener('resize',resize);
  resize();
  clock=new THREE.Clock();
  tick();
  api.ready=true;
  document.dispatchEvent(new CustomEvent('book:ready',{detail:{gl:true}}));
}

start();

})();
