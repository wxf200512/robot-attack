param([string]$Repo='E:\H5_game\fb-bored-day-games-repo')
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$source=Join-Path $Repo 'src/games/toybot-breakout/art-source'
$output=Join-Path $Repo 'public/games/toybot-breakout/optimized'
$jobs=@(
 @{name='mech-pulse-motion';cols=8;rows=8;cell=128},
 @{name='mech-heavy-motion';cols=8;rows=8;cell=128},
 @{name='mech-blade-motion';cols=8;rows=8;cell=128},
 @{name='boss-evolution';cols=8;rows=5;cell=192},
 @{name='material';cols=8;rows=4;cell=128},
 @{name='props';cols=4;rows=2;cell=256},
 @{name='mech-portraits';cols=8;rows=3;cell=192}
)
foreach($job in $jobs){
 $im=[System.Drawing.Bitmap]::FromFile((Join-Path $source ($job.name+'-v28.png')))
 $target=New-Object System.Drawing.Bitmap ($job.cols*$job.cell),($job.rows*$job.cell),([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
 $g=[System.Drawing.Graphics]::FromImage($target)
 $g.CompositingMode=[System.Drawing.Drawing2D.CompositingMode]::SourceCopy
 $g.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
 $g.PixelOffsetMode=[System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
 for($row=0;$row -lt $job.rows;$row++){for($col=0;$col -lt $job.cols;$col++){
  # Equal-cell normalization only: preserve original alpha and pose registration.
  $pad=4
  $dest=New-Object System.Drawing.Rectangle ($col*$job.cell+$pad),($row*$job.cell+$pad),($job.cell-2*$pad),($job.cell-2*$pad)
  $g.DrawImage($im,$dest,[single]($col*$im.Width/$job.cols),[single]($row*$im.Height/$job.rows),[single]($im.Width/$job.cols),[single]($im.Height/$job.rows),[System.Drawing.GraphicsUnit]::Pixel)
 }}
 $destFile=Join-Path $output ($job.name+'-v28.png')
 $target.Save($destFile,[System.Drawing.Imaging.ImageFormat]::Png)
 $transparent=0;$samples=0
 for($y=0;$y -lt $target.Height;$y+=8){for($x=0;$x -lt $target.Width;$x+=8){$samples++;if($target.GetPixel($x,$y).A -eq 0){$transparent++}}}
 Write-Output ($job.name+' '+$target.Width+'x'+$target.Height+' transparent-sample='+[math]::Round($transparent/$samples*100)+'% bytes='+(Get-Item -LiteralPath $destFile).Length)
 $g.Dispose();$im.Dispose();$target.Dispose()
}
