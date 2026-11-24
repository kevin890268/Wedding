# =========================================================================
#  richmenu.ps1 — 產生 LINE 圖文選單圖片 line/richmenu.png
#  規格：2500 × 1686（LINE「大型」版型），3 欄 × 2 列共 6 格，< 1 MB
#  配色與字型跟網站 css/main.css 一致。改字就改下面的 $cells，再執行：
#    powershell -ExecutionPolicy Bypass -File tools\richmenu.ps1
# =========================================================================
Add-Type -AssemblyName System.Drawing

$W = 2500; $H = 1686; $cols = 3; $rows = 2
$cw = $W / $cols; $ch = $H / $rows

function C($hex, $a = 255) {
  $h = $hex.TrimStart('#')
  [System.Drawing.Color]::FromArgb($a,
    [Convert]::ToInt32($h.Substring(0,2),16),
    [Convert]::ToInt32($h.Substring(2,2),16),
    [Convert]::ToInt32($h.Substring(4,2),16))
}
$ink    = C '#1B2340'
$paper  = C '#F2EBDD'
$paper2 = C '#E9E0CE'
$thread = C '#C7343F'
$gold   = C '#C9A227'
$muted  = C '#1B2340' 158
$edge   = C '#1B2340' 41

# 順序：左上 → 右上，再左下 → 右下（跟 LINE 後台 6 格版型的 A–F 對應）
$cells = @(
  @{ k='RSVP';     t='出席回覆';   s='2 / 17 前填寫';   hi=$true },
  @{ k='INFO';     t='婚禮資訊';   s='時間 · 地點' },
  @{ k='MAP';      t='交通導航';   s='開啟 Google 地圖' },
  @{ k='STORY';    t='我們的故事'; s='電子喜帖' },
  @{ k='WISHES';   t='祝福牆';     s='留下想說的話' },
  @{ k='CALENDAR'; t='加入行事曆'; s='2027 . 04 . 17' }
)

$bmp = New-Object System.Drawing.Bitmap $W, $H
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'
$g.TextRenderingHint = 'AntiAliasGridFit'
$g.Clear($paper)

$fKicker = New-Object System.Drawing.Font 'Noto Sans TC Medium', 34, ([System.Drawing.FontStyle]::Regular), ([System.Drawing.GraphicsUnit]::Pixel)
$fTitle  = New-Object System.Drawing.Font 'Noto Serif TC Medium', 118, ([System.Drawing.FontStyle]::Regular), ([System.Drawing.GraphicsUnit]::Pixel)
$fSub    = New-Object System.Drawing.Font 'Noto Sans TC', 46, ([System.Drawing.FontStyle]::Regular), ([System.Drawing.GraphicsUnit]::Pixel)
$fmt = [System.Drawing.StringFormat]::GenericTypographic

# 逐字畫，才能做出網站上的字距（letter-spacing）
function Draw-Tracked($text, $font, $color, $cx, $y, $tracking) {
  $chars = $text.ToCharArray()
  $widths = foreach ($c in $chars) { $g.MeasureString([string]$c, $font, 10000, $fmt).Width }
  $total = ($widths | Measure-Object -Sum).Sum + $tracking * ($chars.Count - 1)
  $x = $cx - $total / 2
  $brush = New-Object System.Drawing.SolidBrush $color
  for ($i = 0; $i -lt $chars.Count; $i++) {
    $g.DrawString([string]$chars[$i], $font, $brush, [float]$x, [float]$y, $fmt)
    $x += $widths[$i] + $tracking
  }
  $brush.Dispose()
}

for ($i = 0; $i -lt $cells.Count; $i++) {
  $cell = $cells[$i]
  $x0 = ($i % $cols) * $cw; $y0 = [math]::Floor($i / $cols) * $ch
  $cx = $x0 + $cw / 2; $cy = $y0 + $ch / 2

  if ($cell.hi) {
    $b = New-Object System.Drawing.SolidBrush $ink
    $g.FillRectangle($b, [float]$x0, [float]$y0, [float]$cw, [float]$ch); $b.Dispose()
    $tc = $paper; $sc = C '#F2EBDD' 190
  } else {
    if (($i % 2) -eq 1) {
      $b = New-Object System.Drawing.SolidBrush $paper2
      $g.FillRectangle($b, [float]$x0, [float]$y0, [float]$cw, [float]$ch); $b.Dispose()
    }
    $tc = $ink; $sc = $muted
  }

  Draw-Tracked $cell.k $fKicker $gold $cx ($cy - 175) 22
  Draw-Tracked $cell.t $fTitle $tc $cx ($cy - 90) 14
  $pen = New-Object System.Drawing.Pen $thread, 4
  $g.DrawLine($pen, [float]($cx - 34), [float]($cy + 82), [float]($cx + 34), [float]($cy + 82)); $pen.Dispose()
  Draw-Tracked $cell.s $fSub $sc $cx ($cy + 122) 6
}

# 格線：細線分隔，讓長輩看得出是 6 顆按鈕
$pen = New-Object System.Drawing.Pen $edge, 3
for ($c = 1; $c -lt $cols; $c++) { $g.DrawLine($pen, [float]($c * $cw), 0, [float]($c * $cw), [float]$H) }
$g.DrawLine($pen, 0, [float]$ch, [float]$W, [float]$ch)
$pen.Dispose()

$out = Join-Path (Split-Path $PSScriptRoot -Parent) 'line\richmenu.png'
New-Item -ItemType Directory -Force (Split-Path $out) | Out-Null
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
$kb = [math]::Round((Get-Item $out).Length / 1KB)
Write-Output "$out  ($kb KB)"
