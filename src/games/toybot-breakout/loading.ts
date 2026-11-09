type Priority='high'|'normal'|'low';
type Job={url:string;priority:Priority;timeout:number;resolve:()=>void;reject:(reason:Error)=>void};
const cache=new Map<string,Promise<void>>(),queue:Job[]=[],running=new Set<()=>void>(),completed=new Set<string>();
const rank={high:0,normal:1,low:2};let active=0,owners=0;
const pump=()=>{
 queue.sort((a,b)=>rank[a.priority]-rank[b.priority]);
 while(active<3&&queue.length){const job=queue.shift()!;active++;let finished=false,image:HTMLImageElement|null=null;
  const finish=(failed=false)=>{if(finished)return;finished=true;clearTimeout(timer);running.delete(cancel);active--;if(image){image.onload=null;image.onerror=null;if(failed)image.src='';}if(failed){completed.delete(job.url);cache.delete(job.url);job.reject(new Error('Image unavailable: '+job.url));}else{completed.add(job.url);job.resolve();while(cache.size>128){const stale=[...completed].find(url=>url!==job.url);if(!stale)break;cache.delete(stale);completed.delete(stale);}}queueMicrotask(pump);};
  const cancel=()=>finish(true),timer=setTimeout(cancel,job.timeout);running.add(cancel);
  try{image=new Image();image.decoding='async';image.fetchPriority=job.priority==='high'?'high':job.priority==='low'?'low':'auto';image.onload=()=>{void Promise.resolve(image?.decode?.()).catch(()=>{}).then(()=>finish());};image.onerror=()=>finish(true);image.src=job.url;}catch{finish(true);}
 }
};
export function preloadImages(urls:string[],priority:Priority='normal',timeout=15000){
 const tasks=urls.map(url=>{const existing=cache.get(url);if(existing){const pending=queue.find(job=>job.url===url);if(pending&&rank[priority]<rank[pending.priority])pending.priority=priority;return existing;}const task=new Promise<void>((resolve,reject)=>queue.push({url,priority,timeout,resolve,reject}));cache.set(url,task);return task;});pump();return Promise.allSettled(tasks);
}
export function retainImagePreloads(){owners++;let released=false;return()=>{if(released)return;released=true;owners=Math.max(0,owners-1);if(owners)return;for(const job of queue.splice(0)){cache.delete(job.url);job.reject(new Error('Image scope closed'));}for(const cancel of [...running])cancel();cache.clear();completed.clear();};}
export const imageLoadingStatsV44=()=>({active,queued:queue.length,cached:cache.size,owners});
