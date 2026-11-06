$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
foreach($kind in @('pulse','heavy','blade')){
 $source=[Drawing.Bitmap]::new((Join-Path $PSScriptRoot ('art-source/mech-'+$kind+'-awaken-v23.png')))
 $bitmap=[Drawing.Bitmap]::new(1024,1024,[Drawing.Imaging.PixelFormat]::Format32bppArgb)
 $g=[Drawing.Graphics]::FromImage($bitmap)
 try{$g.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic;for($row=0;$row -lt 4;$row++){for($col=0;$col -lt 4;$col++){$dest=[Drawing.RectangleF]::new($col*256+8,$row*256+8,240,240);$src=[Drawing.RectangleF]::new($col*$source.Width/4,$row*$source.Height/4,$source.Width/4,$source.Height/4);$g.DrawImage($source,$dest,$src,[Drawing.GraphicsUnit]::Pixel)}};$out=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot ('../../../public/games/toybot-breakout/optimized/mech-'+$kind+'-awaken-v23.png')));$bitmap.Save($out,[Drawing.Imaging.ImageFormat]::Png);Write-Output ($kind+' corner alpha '+$bitmap.GetPixel(0,0).A)}finally{$g.Dispose();$bitmap.Dispose();$source.Dispose()}
}
