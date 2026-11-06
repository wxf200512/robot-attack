$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
foreach($entry in @(@('cockpit-console-v22',1080,360),@('reactor-core-v22',384,384),@('core-effects-v22',1200,400))){
 $source=[Drawing.Bitmap]::new((Join-Path $PSScriptRoot ('art-source/'+$entry[0]+'.png')))
 $bitmap=[Drawing.Bitmap]::new([int]$entry[1],[int]$entry[2],[Drawing.Imaging.PixelFormat]::Format32bppArgb)
 $graphics=[Drawing.Graphics]::FromImage($bitmap)
 try{$graphics.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic;$graphics.DrawImage($source,0,0,$bitmap.Width,$bitmap.Height);$bitmap.Save([IO.Path]::GetFullPath((Join-Path $PSScriptRoot ('../../../public/games/toybot-breakout/optimized/'+$entry[0]+'.png'))),[Drawing.Imaging.ImageFormat]::Png);Write-Output ($entry[0]+' corner alpha '+$bitmap.GetPixel(0,0).A)}finally{$graphics.Dispose();$bitmap.Dispose();$source.Dispose()}
}
