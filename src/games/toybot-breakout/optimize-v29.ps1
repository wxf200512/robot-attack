param([string]$Repo='E:\H5_game\fb-bored-day-games-repo')
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$source=Join-Path $Repo 'src/games/toybot-breakout/art-source'
$output=Join-Path $Repo 'public/games/toybot-breakout/optimized'
$jobs=@(
 @{name='mech-pulse-motion';cols=8;rows=8;cell=128},
 @{name='mech-heavy-motion';cols=8;rows=8;cell=128},
 @{name='mech-blade-motion';cols=8;rows=8;cell=128},
 @{name='boss-furnace';cols=4;rows=2;cell=256},
 @{name='gate';cols=4;rows=2;cell=256},
 @{name='mech-portraits';cols=8;rows=3;cell=192}
)
foreach($job in $jobs){
 $im=[System.Drawing.Bitmap]::FromFile((Join-Path $source ($job.name+'-v29.png')))
 $target=New-Object System.Drawing.Bitmap ($job.cols*$job.cell),($job.rows*$job.cell),([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
 $g=[System.Drawing.Graphics]::FromImage($target)
 $g.CompositingMode=[System.Drawing.Drawing2D.CompositingMode]::SourceCopy
 $g.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
 for($row=0;$row -lt $job.rows;$row++){for($col=0;$col -lt $job.cols;$col++){
  $dest=New-Object System.Drawing.Rectangle ($col*$job.cell+4),($row*$job.cell+4),($job.cell-8),($job.cell-8)
  $g.DrawImage($im,$dest,[single]($col*$im.Width/$job.cols),[single]($row*$im.Height/$job.rows),[single]($im.Width/$job.cols),[single]($im.Height/$job.rows),[System.Drawing.GraphicsUnit]::Pixel)
 }}
 $target.Save((Join-Path $output ($job.name+'-v29.png')),[System.Drawing.Imaging.ImageFormat]::Png)
 $g.Dispose();$im.Dispose();$target.Dispose()
}
foreach($n in 1..5){
 $im=[System.Drawing.Bitmap]::FromFile((Join-Path $source ('map-'+$n+'-v29-clean.png')))
 $target=New-Object System.Drawing.Bitmap 768,1365
 $g=[System.Drawing.Graphics]::FromImage($target);$g.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
 $g.DrawImage($im,0,0,768,1365)
 $codec=[System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders()|Where-Object MimeType -eq 'image/jpeg'
 $ep=New-Object System.Drawing.Imaging.EncoderParameters 1
 $ep.Param[0]=New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality),([long]87)
 $target.Save((Join-Path $output ('map-'+$n+'-v29.jpg')),$codec,$ep)
 $ep.Dispose();$g.Dispose();$im.Dispose();$target.Dispose()
}
foreach($j in @(@{name='cockpit';w=1536;h=512},@{name='logo';w=512;h=190})){
 $im=[System.Drawing.Bitmap]::FromFile((Join-Path $source ($j.name+'-v29.png')))
 $target=New-Object System.Drawing.Bitmap $j.w,$j.h,([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
 $g=[System.Drawing.Graphics]::FromImage($target);$g.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
 $g.DrawImage($im,0,0,$j.w,$j.h)
 $target.Save((Join-Path $output ($j.name+'-v29.png')),[System.Drawing.Imaging.ImageFormat]::Png)
 $g.Dispose();$im.Dispose();$target.Dispose()
}
Get-ChildItem -LiteralPath $output -Filter '*v29*'|Select-Object Name,Length
