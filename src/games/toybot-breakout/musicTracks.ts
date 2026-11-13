export type MusicId='road'|'boss-0'|'boss-1'|'boss-2'|'boss-3'|'boss-4';
export type MusicTrack={id:MusicId;title:string;url:string;bpm:number;introBars:number;loopBars:number;loopStartSeconds?:number;loopEndSeconds?:number;};
const base='/games/toybot-breakout/music/';
// Licensed edited masters have measured lengths; BPM is not guessed from old scores.
const edited=(id:MusicId,title:string,file:string,end:number):MusicTrack=>({id,title,url:base+file,bpm:0,introBars:0,loopBars:0,loopStartSeconds:0,loopEndSeconds:end});
export const MUSIC_TRACKS:MusicTrack[]=[
 edited('road','钢翼突进','road-soft-v62.mp3',60),
 edited('boss-0','熔炉重锤','guardian-heavy-v62.mp3',64),
 edited('boss-1','蜂群追猎','guardian-orchestra-v62.mp3',60),
 edited('boss-2','钢铁壁垒','guardian-heavy-v62.mp3',64),
 edited('boss-3','极性跃迁','guardian-orchestra-v62.mp3',60),
 edited('boss-4','终局指令','guardian-heavy-v62.mp3',64),
];
export const musicTrack=(id:MusicId)=>MUSIC_TRACKS.find(track=>track.id===id)!;
export const musicLoopStart=(track:MusicTrack)=>track.loopStartSeconds??track.introBars*240/track.bpm;
export const musicLoopEnd=(track:MusicTrack)=>track.loopEndSeconds??(track.introBars+track.loopBars)*240/track.bpm;
// Measured raw MP3 alignment (1105 source samples) against the original PCM. Decoders that
// trim it are detected when loading, rather than blindly adding an offset.
export const MUSIC_ENCODER_DELAY=1105/22050;
