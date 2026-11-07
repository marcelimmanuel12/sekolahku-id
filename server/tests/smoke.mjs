/** Dependency-free API / signalling smoke test. npm run test:server */
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'sekolahku-test-'));
const port=8811+Math.floor(Math.random()*1000),base='http://127.0.0.1:'+port;
const proc=spawn(process.execPath,['server/server.mjs'],{cwd:root,env:{...process.env,SEKOLAHKU_DATA_DIR:tmp,PORT:String(port)},stdio:'ignore'});
let t='',s='',admin='';
async function req(route,token,method='GET',data){const res=await fetch(base+route,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(data?{'Content-Type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{})});const d=await res.json();if(!res.ok)throw Error(`${route} ${res.status}: ${d.error}`);return d}
const assert=(v,msg)=>{if(!v)throw Error(msg)};
async function readUntil(reader,pattern){const timer=setTimeout(()=>reader.cancel().catch(()=>{}),2500);let text='';try{for(let i=0;i<12;i++){const {value,done}=await reader.read();if(done)break;text+=new TextDecoder().decode(value);if(text.includes(pattern))return text}throw Error('SSE tidak mengirim '+pattern+': '+text)}finally{clearTimeout(timer)}}
try{
 for(let i=0;i<50;i++){try{await req('/api/health');break}catch{await new Promise(r=>setTimeout(r,90))}}
 const teacher=await req('/api/login',null,'POST',{number:'19850102001',password:'Guru123!',role:'teacher'});t=teacher.token;
 const student=await req('/api/login',null,'POST',{number:'0098765432',password:'Siswa123!',role:'student'});s=student.token;
 const adm=await req('/api/login',null,'POST',{number:'ADM001',password:'Admin123!',role:'admin'});admin=adm.token;
 assert((await req('/api/catalog',t)).classes.length===1,'Daftar kelas tidak tersedia');
 const room=(await req('/api/rooms',t,'POST',{title:'Ruang Uji',classId:'c1'})).room;
 const ta=await req(`/api/rooms/${room.id}/join`,t,'POST',{});
 const teacherCtrl=new AbortController();
 const teacherRes=await fetch(`${base}/api/rooms/${room.id}/events?peerId=${ta.peerId}`,{headers:{Authorization:'Bearer '+t},signal:teacherCtrl.signal});
 assert(teacherRes.ok,'Stream guru gagal');const reader=teacherRes.body.getReader();await readUntil(reader,'event: connected');
 const sa=await req(`/api/rooms/${room.id}/join`,s,'POST',{});
 const studentCtrl=new AbortController();
 const studentRes=await fetch(`${base}/api/rooms/${room.id}/events?peerId=${sa.peerId}`,{headers:{Authorization:'Bearer '+s},signal:studentCtrl.signal});
 assert(studentRes.ok,'Stream siswa gagal');const readerS=studentRes.body.getReader();await readUntil(readerS,'event: connected');
 const joined=await readUntil(reader,'event: peer-joined');assert(joined.includes(sa.peerId),'Guru tidak menerima peserta baru');
 await req(`/api/rooms/${room.id}/message`,t,'POST',{peerId:ta.peerId,kind:'caption',text:'Halo, kita belajar sekarang'});
 const caption=await readUntil(readerS,'event: message');assert(caption.includes('Halo, kita belajar sekarang'),'Subtitle tidak diterima siswa');
 await req(`/api/rooms/${room.id}/signal`,t,'POST',{from:ta.peerId,to:sa.peerId,kind:'ice',payload:{candidate:'test',sdpMid:'0',sdpMLineIndex:0}});
 assert((await readUntil(readerS,'event: signal')).includes('candidate'),'Sinyal WebRTC tidak diterima');
 teacherCtrl.abort();studentCtrl.abort();
 const session=(await req('/api/attendance/session',t,'POST',{classId:'c1',minutes:15})).session;
 const mark=await req('/api/attendance/mark',t,'POST',{sessionId:session.id,studentId:'u4',status:'Hadir',source:'manual'});
 assert(mark.record.status==='Hadir','Absensi manual gagal');
 await req('/api/faces',t,'POST',{studentId:'u4',descriptors:[],photoOnly:true,photo:'data:image/jpeg;base64,AAAA',consentConfirmed:true});
 assert((await req('/api/classroom-state',s)).faceProfiles[0]?.photoOnly,'Foto tidak tersimpan antar-perangkat');
 const unauthorized=await fetch(base+'/api/faces',{method:'POST',headers:{Authorization:'Bearer '+s,'Content-Type':'application/json'},body:JSON.stringify({studentId:'u4'})});
 assert(unauthorized.status===403,'Siswa tidak boleh mendaftarkan sendiri data wajah');
 await req('/api/faces/u4',t,'DELETE');
 const raw=fs.readFileSync(path.join(tmp,'faces.enc'));
 assert(!raw.toString('utf8').includes('data:image/jpeg'),'Berkas face descriptor harus terenkripsi');
 const catalog=await req('/api/catalog',admin);
 catalog.users.push({id:'test-new',name:'Siswa Baru',number:'1234567890',role:'student',active:true,classId:'c1',password:'NewPass123!'});
 await req('/api/catalog',admin,'POST',catalog);
 const newStudent=await req('/api/login',null,'POST',{number:'1234567890',password:'NewPass123!',role:'student'});
 assert(newStudent.user.id==='test-new','Akun buatan admin belum login');
 console.log('LULUS: Login 3 peran, katalog akun, room, SSE peserta, caption, sinyal WebRTC, absensi, foto terenkripsi, otorisasi dan akun baru.');
}catch(e){console.error('GAGAL:',e);process.exitCode=1}finally{proc.kill();fs.rmSync(tmp,{recursive:true,force:true});}
