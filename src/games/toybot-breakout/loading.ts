type Priority='high'|'normal'|'low';
type Job={url:string;priority:Priority;resolve:()=>void;reject:(reason:Error)=>void};
const cache=new Map<string,Promise<void>>(),queue:Job[]=[];
const rank={high:0,normal:1,low:2};let active=0;
const pump=()=>{
 queue.sort((a,b)=>rank[a.priority]-rank[b.priority]);
 while(active<3&&queue.length){const job=queue.shift()!;active++;let finished=false;
  const finish=(failed=false)=>{if(finished)return;finished=true;active--;if(failed){cache.delete(job.url);job.reject(new Error('Image unavailable: '+job.url));}else job.resolve();queueMicrotask(pump);};
  try{const image=new Image();image.decoding='async';image.fetchPriority=job.priority==='high'?'high':job.priority==='low'?'low':'auto';image.onload=()=>{image.onload=null;image.onerror=null;void Promise.resolve(image.decode?.()).catch(()=>{}).then(()=>finish());};image.onerror=()=>{image.onload=null;image.onerror=null;finish(true);};image.src=job.url;}catch{finish(true);}
 }
};
export function preloadImages(urls:string[],priority:Priority='normal'){
 const tasks=urls.map(url=>{const existing=cache.get(url);if(existing){const pending=queue.find(job=>job.url===url);if(pending&&rank[priority]<rank[pending.priority])pending.priority=priority;return existing;}const task=new Promise<void>((resolve,reject)=>queue.push({url,priority,resolve,reject}));cache.set(url,task);return task;});
 pump();return Promise.allSettled(tasks);
}
