param([string]$Repo='E:\H5_game\fb-bored-day-games-repo')
$ErrorActionPreference='Stop'
& (Join-Path $Repo 'src/games/toybot-breakout/optimize-v30.ps1') -Repo $Repo
$base=Join-Path $Repo 'src/games/toybot-breakout'
$meta=Get-Content (Join-Path $base 'motion-registration-v30.json') -Raw|ConvertFrom-Json
$out=@()
foreach($kind in @('pulse','heavy','blade')){
 $raw=[Drawing.Bitmap]::new((Join-Path $base ('art-source/mech-'+$kind+'-run-v30.png')))
 $packed=[Drawing.Bitmap]::new($raw.Width,$raw.Height*2)
 $g=[Drawing.Graphics]::FromImage($packed);$g.DrawImage($raw,0,0,$raw.Width,$raw.Height);$g.DrawImage($raw,0,$raw.Height,$raw.Width,$raw.Height);$g.Dispose();$raw.Dispose()
 $temp=Join-Path ([IO.Path]::GetTempPath()) ([Guid]::NewGuid().ToString()+'.png')
 $normalized=Join-Path ([IO.Path]::GetTempPath()) ([Guid]::NewGuid().ToString()+'.png')
 try{
  $packed.Save($temp,[Drawing.Imaging.ImageFormat]::Png);$packed.Dispose()
  $targetY=[int](($meta|Where-Object class -eq $kind).targetCoreY*128)
  $m=[MechRegistration30]::Normalize($temp,$normalized,$kind,$targetY)
  $im=[Drawing.Bitmap]::new($normalized);$crop=$im.Clone([Drawing.Rectangle]::new(0,0,1024,512),[Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $crop.Save((Join-Path $Repo ('public/games/toybot-breakout/optimized/mech-'+$kind+'-run-v30.png')),[Drawing.Imaging.ImageFormat]::Png);$crop.Dispose();$im.Dispose()
  $out+=@{class=$kind;frames=32;strideFrames=16;targetCoreY=$m[0];maxCoreXErrorPx=$m[3];transparentFraction=$m[4]}
 }finally{Remove-Item -LiteralPath $temp,$normalized -ErrorAction SilentlyContinue}
}
$out|ConvertTo-Json|Set-Content (Join-Path $base 'run-registration-v30.json') -Encoding utf8
$out|ConvertTo-Json
