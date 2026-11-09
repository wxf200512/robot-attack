param([string]$Repo='E:\H5_game\fb-bored-day-games-repo')
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies @('System.Drawing.Common','System.Drawing.Primitives','System.Collections','System.Private.Windows.GdiPlus','System.Private.Windows.Core') -TypeDefinition @'
using System;using System.Drawing;using System.Drawing.Imaging;using System.Drawing.Drawing2D;
public class HostileAtlas31{
 static double[] Map(Bitmap b,int c,int r,int cell){var m=new double[cell*cell];for(int y=0;y<cell;y++)for(int x=0;x<cell;x++){Color p=b.GetPixel(c*cell+x,r*cell+y);double hi=Math.Max(p.R,Math.Max(p.G,p.B)),lo=Math.Min(p.R,Math.Min(p.G,p.B));m[y*cell+x]=p.A>160?.3*(p.R*.3+p.G*.6+p.B*.1)+Math.Max(0,hi-lo-40):0;}return m;}
 public static double[] Normalize(string input,string output,int rows,int cell,string second){
 using(var im=new Bitmap(input))using(var im2=new Bitmap(second.Length>0?second:input))using(var raw=new Bitmap(cell*8,rows*cell,PixelFormat.Format32bppArgb))using(var result=new Bitmap(cell*8,rows*cell,PixelFormat.Format32bppArgb)){
  using(var g=Graphics.FromImage(raw)){g.CompositingMode=CompositingMode.SourceCopy;g.InterpolationMode=InterpolationMode.HighQualityBicubic;for(int r=0;r<rows;r++)for(int c=0;c<8;c++){var source=second.Length>0&&r>=4?im2:im;int sourceRows=second.Length>0?4:rows,sourceRow=second.Length>0?r%4:r;float pad=cell/32f;g.DrawImage(source,new RectangleF(c*cell+pad,r*cell+pad,cell-pad*2,cell-pad*2),new RectangleF(c*source.Width/8f,sourceRow*source.Height/(float)sourceRows,source.Width/8f,source.Height/(float)sourceRows),GraphicsUnit.Pixel);}}
  double maxShift=0,minConfidence=1;int adjusted=0,patch=cell*3/16,origin=(cell-patch)/2,radius=cell/16,area=patch*patch;
  using(var g=Graphics.FromImage(result)){g.CompositingMode=CompositingMode.SourceCopy;
   for(int r=0;r<rows;r++){
    var reference=Map(raw,0,r,cell);double mean=0,norm=0;var template=new double[area];for(int y=0;y<patch;y++)for(int x=0;x<patch;x++){double v=reference[(origin+y)*cell+origin+x];template[y*patch+x]=v;mean+=v;}mean/=area;for(int i=0;i<area;i++){template[i]-=mean;norm+=template[i]*template[i];}
    for(int c=0;c<8;c++){
     var map=Map(raw,c,r,cell);double best=-2;int bx=0,by=0;
     for(int dy=-radius;dy<=radius;dy++)for(int dx=-radius;dx<=radius;dx++){double dot=0,sum=0,sq=0;for(int y=0;y<patch;y++)for(int x=0;x<patch;x++){double v=map[(origin+y+dy)*cell+origin+x+dx];dot+=template[y*patch+x]*v;sum+=v;sq+=v*v;}double confidence=dot/Math.Sqrt(Math.Max(1,norm*(sq-sum*sum/area)));double score=confidence-.0005*(128.0/cell)*(128.0/cell)*(dx*dx+dy*dy);if(score>best){best=score;bx=dx;by=dy;}}
     // Low confidence means a deliberate pose change: retain original anchor.
     if(best<.45){bx=0;by=0;}if(bx!=0||by!=0)adjusted++;maxShift=Math.Max(maxShift,Math.Max(Math.Abs(bx),Math.Abs(by)));minConfidence=Math.Min(minConfidence,best);
     g.SetClip(new Rectangle(c*cell,r*cell,cell,cell));g.DrawImage(raw,new Rectangle(c*cell-bx,r*cell-by,cell,cell),new Rectangle(c*cell,r*cell,cell,cell),GraphicsUnit.Pixel);
    }
   }
  }
  int transparent=0;for(int y=0;y<result.Height;y++)for(int x=0;x<result.Width;x++)if(result.GetPixel(x,y).A<8){result.SetPixel(x,y,Color.Transparent);transparent++;}
  result.Save(output,ImageFormat.Png);return new double[]{rows*8,maxShift,adjusted,minConfidence,transparent/(double)(result.Width*result.Height)};
 }
 }
}
'@
$records=@()
foreach($group in @(@{prefix='boss';rows=8;cell=256;ids=@('furnace','queen','fortress','oracle','emperor')},@{prefix='enemy';rows=4;cell=128;ids=@('drone','swarm','sniper','bomber','medic','minion','barrier')})){
 foreach($id in $group.ids){
  $name=$group.prefix+'-'+$id+'-motion-v31.png'
  $sourcePath=Join-Path $Repo ('src/games/toybot-breakout/art-source/'+$name);$second='';if($group.prefix -eq 'boss'){$sourcePath=Join-Path $Repo ('src/games/toybot-breakout/art-source/boss-'+$id+'-phase1-v31.png');$second=Join-Path $Repo ('src/games/toybot-breakout/art-source/boss-'+$id+'-phase2-v31.png')}
  $outputPath=Join-Path $Repo ('public/games/toybot-breakout/optimized/'+$name);if($group.prefix -eq 'boss'){$outputPath=Join-Path $Repo ('src/games/toybot-breakout/art-source/boss-'+$id+'-atlas-v31.png')}
  $m=[HostileAtlas31]::Normalize($sourcePath,$outputPath,$group.rows,$group.cell,$second)
  if($group.prefix -eq 'boss'){$webpPath=Join-Path $Repo ('public/games/toybot-breakout/optimized/boss-'+$id+'-motion-v31.webp');& python (Join-Path $Repo 'src/games/toybot-breakout/compress-hostiles-v31.py') $outputPath $webpPath;if($LASTEXITCODE -ne 0){throw 'WebP encoding failed'}}
  $records+=@{id=$id;group=$group.prefix;rows=$group.rows;cellSize=$group.cell;frames=$m[0];maxRegistrationShiftPx=$m[1];adjustedCells=$m[2];minSimilarity=$m[3];transparentFraction=$m[4]}
 }
}
$records|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $Repo 'src/games/toybot-breakout/hostile-registration-v31.json') -Encoding utf8
$records|ConvertTo-Json
