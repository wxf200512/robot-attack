$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$repoArt=Join-Path $PSScriptRoot 'art-source'
$runtimeArt=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../../public/games/toybot-breakout/optimized'))
$jpegCodec=[Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
foreach($entry in @(@('ui-menu-hangar-v19',768,512,'jpg'),@('operations-atlas-v19',756,747,'png'),@('fusion-atlas-v19',768,512,'png'))){
 $source=[Drawing.Bitmap]::new((Join-Path $repoArt ($entry[0]+'.png')))
 $bitmap=[Drawing.Bitmap]::new([int]$entry[1],[int]$entry[2],[Drawing.Imaging.PixelFormat]::Format32bppArgb)
 $graphics=[Drawing.Graphics]::FromImage($bitmap)
 try{
  $graphics.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.DrawImage($source,0,0,$bitmap.Width,$bitmap.Height)
  $output=Join-Path $runtimeArt ($entry[0]+'.'+$entry[3])
  if($entry[3] -eq 'jpg'){$parameters=[Drawing.Imaging.EncoderParameters]::new(1);try{$parameters.Param[0]=[Drawing.Imaging.EncoderParameter]::new([Drawing.Imaging.Encoder]::Quality,[long]90);$bitmap.Save($output,$jpegCodec,$parameters)}finally{$parameters.Dispose()}}
  else{$bitmap.Save($output,[Drawing.Imaging.ImageFormat]::Png)}
  Write-Output ([IO.Path]::GetFileName($output)+' '+(Get-Item -LiteralPath $output).Length)
 }finally{$graphics.Dispose();$bitmap.Dispose();$source.Dispose()}
}
