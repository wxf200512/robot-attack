param([string]$Repo='E:\H5_game\fb-bored-day-games-repo')
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies @('System.Drawing.Common','System.Drawing.Primitives','System.Collections','System.Private.Windows.GdiPlus','System.Private.Windows.Core') -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Collections.Generic;
public class MechRegistration30 {
 public static double[] Anchor(Bitmap im,int col,int row,string kind){
  double cw=im.Width/8.0,ch=im.Height/8.0;int ox=(int)Math.Round(col*cw),oy=(int)Math.Round(row*ch);
  int x0=(int)(cw*.27),y0=(int)(ch*.35),w=(int)(cw*.46),h=(int)(ch*.32);bool[] mask=new bool[w*h],seen=new bool[w*h];
  for(int y=0;y<h;y++)for(int x=0;x<w;x++){
   Color p=im.GetPixel(Math.Min(im.Width-1,ox+x0+x),Math.Min(im.Height-1,oy+y0+y));
   bool cyan=p.G>180&&p.B>190&&p.R<175&&p.R<p.G*.9;
   bool orange=p.R>225&&p.G>140&&p.B<165;
   bool violet=p.B>190&&p.R>110&&p.G<180&&p.R>p.G*1.15;
   mask[y*w+x]=p.A>185&&(kind=="heavy"?orange:kind=="blade"?(cyan||violet):cyan);
  }
  var points=new List<double[]>();double best=Double.MaxValue;double[] pick=null;
  for(int i=0;i<mask.Length;i++)if(mask[i]&&!seen[i]){
   var q=new Queue<int>();q.Enqueue(i);seen[i]=true;int n=0,minX=w,maxX=0,minY=h,maxY=0;double sx=0,sy=0;
   while(q.Count>0){int k=q.Dequeue(),x=k%w,y=k/w;n++;sx+=x;sy+=y;minX=Math.Min(minX,x);maxX=Math.Max(maxX,x);minY=Math.Min(minY,y);maxY=Math.Max(maxY,y);
    int[] ns={x>0?k-1:-1,x<w-1?k+1:-1,y>0?k-w:-1,y<h-1?k+w:-1};foreach(int k2 in ns)if(k2>=0&&!seen[k2]&&mask[k2]){seen[k2]=true;q.Enqueue(k2);}
   }
   if(n<3||maxX-minX>cw*.15||maxY-minY>ch*.22||maxY-minY<(maxX-minX)*.85)continue;
   double ax=(x0+sx/n)/cw,ay=(y0+sy/n)/ch;var point=new double[]{ax,ay,n};points.Add(point);
   double score=Math.Pow((ax-.5)*1.3,2)+Math.Pow((ay-.55)*1.5,2);if(score<best){best=score;pick=point;}
  }
  if(pick==null)return new double[]{.5,.55,0};
  double tx=0,ty=0,total=0;foreach(var a in points)if(Math.Abs(a[0]-pick[0])<.14&&Math.Abs(a[1]-pick[1])<.035){tx+=a[0]*a[2];ty+=a[1]*a[2];total+=a[2];}
  return new double[]{tx/total,ty/total,total};
 }
 static double[] Map(Bitmap im,int col,int row){
  var m=new double[128*128];for(int y=0;y<128;y++)for(int x=0;x<128;x++){Color p=im.GetPixel(col*128+x,row*128+y);double hi=Math.Max(p.R,Math.Max(p.G,p.B)),lo=Math.Min(p.R,Math.Min(p.G,p.B));m[y*128+x]=p.A>160?.25*(p.R*.3+p.G*.6+p.B*.1)+Math.Max(0,hi-lo-45):0;}return m;
 }
 static double[] Template(double[] map,int x,int y){var t=new double[28*24];double mean=0;for(int j=0;j<24;j++)for(int i=0;i<28;i++){double v=map[(y-12+j)*128+x-14+i];t[j*28+i]=v;mean+=v;}mean/=t.Length;for(int i=0;i<t.Length;i++)t[i]-=mean;return t;}
 static double[] Match(double[] map,double[] t,int cx,int cy,int radius){
  double norm=0;foreach(double v in t)norm+=v*v;double best=-10;int bx=cx,by=cy;
  for(int y=Math.Max(13,cy-radius);y<=Math.Min(114,cy+radius);y++)for(int x=Math.Max(15,cx-radius);x<=Math.Min(112,cx+radius);x++){
   double sum=0,sq=0,dot=0;for(int j=0;j<24;j++)for(int i=0;i<28;i++){double v=map[(y-12+j)*128+x-14+i];sum+=v;sq+=v*v;dot+=v*t[j*28+i];}
   double corr=dot/Math.Sqrt(Math.Max(1,norm*(sq-sum*sum/t.Length)));double score=corr-.00001*((x-cx)*(x-cx)+(y-cy)*(y-cy));if(score>best){best=score;bx=x;by=y;}
  }return new double[]{bx,by,best};
 }
 public static double[] Normalize(string input,string output,string kind,int fixedTargetY=-1){
  using(var im=new Bitmap(input))using(var original=new Bitmap(1024,1024,PixelFormat.Format32bppArgb))using(var target=new Bitmap(1024,1024,PixelFormat.Format32bppArgb)){
   using(var g=Graphics.FromImage(original)){g.CompositingMode=CompositingMode.SourceCopy;g.InterpolationMode=InterpolationMode.HighQualityBicubic;for(int row=0;row<8;row++)for(int col=0;col<8;col++)g.DrawImage(im,new RectangleF(col*128+4,row*128+4,120,120),new RectangleF((float)(col*im.Width/8.0),(float)(row*im.Height/8.0),im.Width/8f,im.Height/8f),GraphicsUnit.Pixel);}
   var refs=new int[8][];var templates=new double[8][];for(int group=0;group<8;group++){var anchor=Anchor(original,0,group,kind);if(anchor[0]<.4||anchor[0]>.64||anchor[1]<.44||anchor[1]>.64)anchor=Anchor(original,0,group<4?1:5,kind);refs[group]=new int[]{(int)Math.Round(anchor[0]*128),(int)Math.Round(anchor[1]*128)};templates[group]=Template(Map(original,0,group),refs[group][0],refs[group][1]);}
   int targetY=fixedTargetY>=0?fixedTargetY:refs[1][1],missing=0;double maxShift=0,minSimilarity=1,maxError=0;
   using(var g=Graphics.FromImage(target)){g.CompositingMode=CompositingMode.SourceCopy;
    for(int row=0;row<8;row++)for(int col=0;col<8;col++){
     int group=row;var matched=Match(Map(original,col,row),templates[group],refs[group][0],refs[group][1],10);minSimilarity=Math.Min(minSimilarity,matched[2]);
     int dx=64-(int)matched[0],dy=targetY-(int)matched[1];if(matched[2]<.35){missing++;var prev=Match(Map(original,(col+7)%8,row),templates[group],refs[group][0],refs[group][1],10);var next=Match(Map(original,(col+1)%8,row),templates[group],refs[group][0],refs[group][1],10);dx=64-(int)Math.Round((prev[0]+next[0])/2);dy=targetY-(int)Math.Round((prev[1]+next[1])/2);}
     maxShift=Math.Max(maxShift,Math.Max(Math.Abs(dx),Math.Abs(dy)));g.SetClip(new Rectangle(col*128,row*128,128,128));g.DrawImage(original,new Rectangle(col*128+dx,row*128+dy,128,128),new Rectangle(col*128,row*128,128,128),GraphicsUnit.Pixel);
    }
   }
   int empty=0;for(int y=0;y<1024;y++)for(int x=0;x<1024;x++){Color p=target.GetPixel(x,y);if(p.A<8){target.SetPixel(x,y,Color.Transparent);empty++;}}
   for(int row=0;row<8;row++)for(int col=0;col<8;col++){var matched=Match(Map(target,col,row),templates[row],64,targetY,5);maxError=Math.Max(maxError,Math.Abs(matched[0]-64));}
   target.Save(output,ImageFormat.Png);return new double[]{targetY/128.0,missing,maxShift,maxError,empty/(1024.0*1024),64,minSimilarity};
  }
 }

}
'@
$source=Join-Path $Repo 'src/games/toybot-breakout/art-source'
$output=Join-Path $Repo 'public/games/toybot-breakout/optimized'
$metadata=@()
foreach($kind in @('pulse','heavy','blade')){
 $name='mech-'+$kind+'-motion-v30.png'
 $m=[MechRegistration30]::Normalize((Join-Path $source $name),(Join-Path $output $name),$kind)
 $metadata+=@{class=$kind;frames=64;targetCoreY=$m[0];interpolatedFrames=$m[1];maxShiftPx=$m[2];maxCoreXErrorPx=$m[3];transparentFraction=$m[4];measuredFrames=$m[5];minTemplateSimilarity=$m[6]}
}
$metadata|ConvertTo-Json -Depth 5|Set-Content -LiteralPath (Join-Path $Repo 'src/games/toybot-breakout/motion-registration-v30.json') -Encoding utf8
$metadata|ConvertTo-Json -Depth 5
