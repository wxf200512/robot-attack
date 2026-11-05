const cache=new Map<string,Promise<void>>();
export function preloadImages(urls:string[]){
 return Promise.allSettled(urls.map(url=>{
  const existing=cache.get(url);if(existing)return existing;
  const task=new Promise<void>((resolve,reject)=>{const img=new Image();img.onload=()=>resolve();img.onerror=()=>{cache.delete(url);reject(new Error('Image unavailable: '+url));};img.decoding='async';img.src=url;});cache.set(url,task);return task;
 }));
}
