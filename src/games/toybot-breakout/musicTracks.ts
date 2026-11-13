export type MusicId='road'|'boss-0'|'boss-1'|'boss-2'|'boss-3'|'boss-4';
export type MusicTrack={id:MusicId;title:string;url:string;bpm:number;introBars:number;loopBars:number;};
const base='/games/toybot-breakout/music/';
export const MUSIC_TRACKS:MusicTrack[]=[
 {id:'road',title:'钢翼突进',url:base+'frontline-dawn.mp3',bpm:126,introBars:0,loopBars:32},
 {id:'boss-0',title:'熔炉重锤',url:base+'forge-awakening.mp3',bpm:108,introBars:4,loopBars:16},
 {id:'boss-1',title:'蜂群追猎',url:base+'hive-alert.mp3',bpm:144,introBars:4,loopBars:16},
 {id:'boss-2',title:'钢铁壁垒',url:base+'iron-edict.mp3',bpm:112,introBars:4,loopBars:16},
 {id:'boss-3',title:'极性跃迁',url:base+'polarity-rift.mp3',bpm:136,introBars:4,loopBars:16},
 {id:'boss-4',title:'终局指令',url:base+'throne-eclipse.mp3',bpm:120,introBars:4,loopBars:16},
];
export const musicTrack=(id:MusicId)=>MUSIC_TRACKS.find(track=>track.id===id)!;
export const musicLoopStart=(track:MusicTrack)=>track.introBars*240/track.bpm;
export const musicLoopEnd=(track:MusicTrack)=>(track.introBars+track.loopBars)*240/track.bpm;
// Measured raw MP3 alignment (1105 source samples) against the original PCM. Decoders that
// trim it are detected when loading, rather than blindly adding an offset.
export const MUSIC_ENCODER_DELAY=1105/22050;
