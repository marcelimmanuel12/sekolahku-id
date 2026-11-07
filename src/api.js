/** Same-origin demo API: live classroom rooms and persisted attendance. */
const API='/api';
export const getToken=()=>sessionStorage.getItem('sekolahku_api_token')||'';
export const setToken=v=>v?sessionStorage.setItem('sekolahku_api_token',v):sessionStorage.removeItem('sekolahku_api_token');
export async function api(path,{method='GET',data,signal}={}){
  const res=await fetch(API+path,{method,signal,headers:{'Authorization':'Bearer '+getToken(),...(data===undefined?{}:{'Content-Type':'application/json'})},...(data===undefined?{}:{body:JSON.stringify(data)})});
  const result=await res.json().catch(()=>({}));
  if(!res.ok)throw Error(result.error||`Server merespons ${res.status}`);
  return result;
}
export async function loginServer(number,password,role){
  const res=await fetch(API+'/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({number,password,role})});
  const result=await res.json().catch(()=>({}));
  if(!res.ok)throw Error(result.error||'Login server gagal');
  setToken(result.token);return result;
}
/** Open an authenticated SSE stream using Fetch (Authorization header is supported). */
export async function streamEvents(path,dispatch,signal){
 const response=await fetch(API+path,{signal,headers:{Authorization:'Bearer '+getToken(),Accept:'text/event-stream'}});
 if(!response.ok)throw Error((await response.json().catch(()=>({}))).error||'Gagal menyambung ke ruang');
 if(!response.body)throw Error('Browser ini tidak mendukung streaming');
 const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='';
 while(true){const {value,done}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});const chunks=buffer.split('\n\n');buffer=chunks.pop()||'';
  for(const chunk of chunks){let kind='message',payload='';for(const line of chunk.split('\n')){if(line.startsWith('event:'))kind=line.slice(6).trim();if(line.startsWith('data:'))payload+=line.slice(5).trim()}if(payload){try{dispatch(kind,JSON.parse(payload))}catch{}}}
 }
}
