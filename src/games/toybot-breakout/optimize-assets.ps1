# Rebuild deployment copies; keep original artwork outside the public bundle.
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$gameRoot=[IO.Path]::GetFullPath($PSScriptRoot)
$repoRoot=[IO.Path]::GetFullPath((Join-Path $gameRoot '../../..'))
$publicRoot=[IO.Path]::GetFullPath((Join-Path $repoRoot 'public/games/toybot-breakout'))
$sourceRoot=[IO.Path]::GetFullPath((Join-Path $gameRoot 'art-source'))
$outputRoot=[IO.Path]::GetFullPath((Join-Path $publicRoot 'optimized'))
foreach($targetPath in @($sourceRoot,$outputRoot)) { if(-not $targetPath.StartsWith($repoRoot+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'Asset target escaped repository'} }
New-Item -ItemType Directory -Path $sourceRoot,$outputRoot -Force | Out-Null
$inputs=@(Get-ChildItem -LiteralPath $publicRoot -File | Where-Object Extension -In '.png','.jpg')
if($inputs.Count -eq 0){$inputs=@(Get-ChildItem -LiteralPath $sourceRoot -File | Where-Object Extension -In '.png','.jpg')}
$jpegCodec=[Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
$totalBefore=0L;$totalAfter=0L
foreach($file in $inputs){
 $original=[Drawing.Image]::FromFile($file.FullName)
 try{
  $opaque=$file.BaseName -match '^(map-[1-5]-ai|ui-hangar|home-hangar|mech-road)'
  $limit=if($file.BaseName -match '^mech-.*-combat-v10$'){1536}elseif($file.BaseName -eq 'boss-cast-v10'){1584}elseif($file.BaseName -eq 'boss-objectives-v10'){1024}elseif($file.BaseName -match '^upgrade-'){160}elseif($file.BaseName -match '^home-mech-'){480}else{768}
  $width=[Math]::Min($original.Width,$limit);$height=[int][Math]::Round($original.Height*$width/$original.Width)
  if($file.BaseName -match '^mech-.*-combat-v10$'){$height=576}
  elseif($file.BaseName -eq 'boss-cast-v10'){$height=990}
  elseif($file.BaseName -eq 'boss-objectives-v10'){$height=512}
  $bitmap=[Drawing.Bitmap]::new($width,$height,[Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics=[Drawing.Graphics]::FromImage($bitmap)
  try{
   $graphics.CompositingMode=[Drawing.Drawing2D.CompositingMode]::SourceCopy
   $graphics.CompositingQuality=[Drawing.Drawing2D.CompositingQuality]::HighQuality
   $graphics.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
   $graphics.PixelOffsetMode=[Drawing.Drawing2D.PixelOffsetMode]::HighQuality
   $graphics.DrawImage($original,[Drawing.Rectangle]::new(0,0,$width,$height),0,0,$original.Width,$original.Height,[Drawing.GraphicsUnit]::Pixel)
   $extension=if($opaque){'.jpg'}else{'.png'}
   $destination=Join-Path $outputRoot ($file.BaseName+$extension)
   if($opaque){$parameters=[Drawing.Imaging.EncoderParameters]::new(1);try{$parameters.Param[0]=[Drawing.Imaging.EncoderParameter]::new([Drawing.Imaging.Encoder]::Quality,[long]86);$bitmap.Save($destination,$jpegCodec,$parameters)}finally{$parameters.Dispose()}}
   else{$bitmap.Save($destination,[Drawing.Imaging.ImageFormat]::Png)}
  }finally{$graphics.Dispose();$bitmap.Dispose()}
 }finally{$original.Dispose()}
 $totalBefore+=$file.Length;$totalAfter+=(Get-Item -LiteralPath $destination).Length
 if($file.DirectoryName -eq $publicRoot){$archive=Join-Path $sourceRoot $file.Name;if(Test-Path -LiteralPath $archive){throw ('Original already exists: '+$archive)};Move-Item -LiteralPath $file.FullName -Destination $archive}
}
[PSCustomObject]@{Images=$inputs.Count;BeforeBytes=$totalBefore;AfterBytes=$totalAfter;ReductionPercent=[Math]::Round((1-$totalAfter/$totalBefore)*100,1)} | ConvertTo-Json -Compress
# Separate native-resolution front rows keep menus crisp without loading battle sheets.
foreach($kind in @('heavy','blade')){
 $frontSource=[Drawing.Bitmap]::new((Join-Path $sourceRoot ('mech-'+$kind+'-ai-v7.png')))
 try{$rowHeight=if($kind -eq 'blade'){190}else{209};$front=$frontSource.Clone([Drawing.Rectangle]::new(0,0,$frontSource.Width,$rowHeight),[Drawing.Imaging.PixelFormat]::Format32bppArgb)
 try{$front.Save((Join-Path $outputRoot ('mech-'+$kind+'-front-v8.png')),[Drawing.Imaging.ImageFormat]::Png)}finally{$front.Dispose()}}
 finally{$frontSource.Dispose()}
}
$finalBytes=(Get-ChildItem -LiteralPath $outputRoot -File|Measure-Object Length -Sum).Sum
[PSCustomObject]@{OriginalBytes=$totalBefore;DeploymentBytes=$finalBytes;ReductionPercent=[Math]::Round((1-$finalBytes/$totalBefore)*100,1)}|ConvertTo-Json -Compress
