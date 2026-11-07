/** SekolahKu.id local demo server: same-origin classroom APIs and WebRTC signalling.
 * Educational prototype. Not hardened for public deployment or real children's biometrics.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {seed} from '../src/data.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dataDir=process.env.SEKOLAHKU_DATA_DIR?path.resolve(process.env.SEKOLAHKU_DATA_DIR):path.join(root,'server','.data');
fs.mkdirSync(dataDir,{recursive:true,mode:0o700});
const secretPath=path.join(dataDir,'secret.key');
if(!fs.existsSync(secretPath))fs.writeFileSync(secretPath,crypto.randomBytes(32),{mode:0o600});
const secret=fs.readFileSync(secretPath);
const encKey=crypto.createHash('sha256').update(secret).digest();
const stateFile=path.join(dataDir,'classroom.json');
const faceFile=path.join(dataDir,'faces.enc');
const roomFile=path.join(dataDir,'rooms.json');
const catalogFile=path.join(dataDir,'catalog.json');
const readJSON=(file,fallback)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'))}catch{return fallback}};
const writeJSON=(file,data)=>{const temp=file+'.tmp';fs.writeFileSync(temp,JSON.stringify(data,null,2),{mode:0o600});fs.renameSync(temp,file)};
const hashPassword=password=>{const salt=crypto.randomBytes(16).toString('hex');return salt+':'+crypto.scryptSync(String(password),salt,64).toString('hex')};
function checkPassword(password,hash){try{const [salt,old]=hash.split(':');const a=Buffer.from(old,'hex'),b=crypto.scryptSync(String(password),salt,64);return a.length===b.length&&crypto.timingSafeEqual(a,b)}catch{return false}}
const defaultCatalog={users:seed.users.map(({password,...u})=>({...u,passwordHash:hashPassword(password)})),classes:seed.classes};
let catalog=readJSON(catalogFile,defaultCatalog);
if(!fs.existsSync(catalogFile))writeJSON(catalogFile,catalog);

let state=readJSON(stateFile,{sessions:[],attendance:[]});
let rooms=readJSON(roomFile,[]);
let faceProfiles=[];
try{
 const data=fs.readFileSync(faceFile);const iv=data.subarray(0,12),tag=data.subarray(12,28),cipher=data.subarray(28);
 const decipher=crypto.createDecipheriv('aes-256-gcm',encKey,iv);decipher.setAuthTag(tag);
 faceProfiles=JSON.parse(Buffer.concat([decipher.update(cipher),decipher.final()]).toString('utf8'));
}catch(err){if(fs.existsSync(faceFile))throw Error('Berkas wajah terenkripsi tidak dapat dibuka. Periksa kunci server.');}
function saveFaces(){const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',encKey,iv);const payload=Buffer.concat([cipher.update(Buffer.from(JSON.stringify(faceProfiles))),cipher.final()]);fs.writeFileSync(faceFile,Buffer.concat([iv,cipher.getAuthTag(),payload]),{mode:0o600});}
const peers=new Map(); // roomId -> Map(peerId, peer)
const uid=()=>crypto.randomUUID();
const json=(res,status,obj)=>{if(res.writableEnded)return;res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(obj))};
const fail=(res,status,error)=>json(res,status,{error});
async function body(req){const chunks=[];let length=0;for await(const chunk of req){length+=chunk.length;if(length>250_000)throw Error('Data permintaan terlalu besar');chunks.push(chunk)}return JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}')}
function makeToken(user){const payload=Buffer.from(JSON.stringify({id:user.id,exp:Date.now()+12*3600_000})).toString('base64url');const sig=crypto.createHmac('sha256',secret).update(payload).digest('base64url');return payload+'.'+sig}
function getUser(req){const token=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');const [payload,sig]=token.split('.');if(!payload||!sig)return null;const expected=crypto.createHmac('sha256',secret).update(payload).digest('base64url');const a=Buffer.from(expected),b=Buffer.from(sig);if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return null;try{const data=JSON.parse(Buffer.from(payload,'base64url'));if(Date.now()>data.exp)return null;const user=catalog.users.find(u=>u.id===data.id&&u.active);return user||null}catch{return null}}
function canUseClass(user,classId){return user.role==='admin'||(user.role==='teacher'?catalog.classes.some(c=>c.id===classId&&c.teacherId===user.id):user.classId===classId)}
function canSeeFace(user,studentId){const student=catalog.users.find(u=>u.id===studentId&&u.role==='student');return !!student && (user.id===student.id || (user.role!=='student'&&canUseClass(user,student.classId)))}
function canAdministerFace(user,studentId){return user.role!=='student'&&canSeeFace(user,studentId)}
const compactUser=u=>({id:u.id,name:u.name,role:u.role,classId:u.classId||null});
function roomFor(user,r){return r&&(user.role==='admin'||canUseClass(user,r.classId))}
function visibleState(user){const sessions=state.sessions.filter(s=>canUseClass(user,s.classId));return {sessions,attendance:state.attendance.filter(a=>canUseClass(user,a.classId)&&(user.role!=='student'||a.studentId===user.id)),faceProfiles:faceProfiles.filter(f=>canSeeFace(user,f.studentId)),updatedAt:Date.now()}}
function emit(roomId,type,data,to=null){for(const p of (peers.get(roomId)||new Map()).values()){if(to&&p.id!==to)continue;try{p.res?.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`)}catch{}}}
function leave(roomId,pid){const map=peers.get(roomId);if(!map?.has(pid))return;const peer=map.get(pid);map.delete(pid);try{peer.res?.end()}catch{}emit(roomId,'peer-left',{id:pid});if(!map.size)peers.delete(roomId)}
function saveRoom(room){rooms=rooms.filter(x=>x.id!==room.id).concat(room);writeJSON(roomFile,rooms)}
function text(s,n=160){return String(s||'').trim().slice(0,n)}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.json':'application/json','.ico':'image/x-icon'};
async function handler(req,res){
 const url=new URL(req.url,'http://localhost');const pathname=url.pathname;res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method==='GET'&&pathname==='/api/health')return json(res,200,{ok:true,brand:'SekolahKu.id',mode:'demo',rooms:rooms.length});
 if(pathname==='/api/login'&&req.method==='POST'){
  const d=await body(req);const u=catalog.users.find(u=>u.number===d.number&&checkPassword(d.password,u.passwordHash)&&u.role===d.role&&u.active);
  if(!u)return fail(res,401,'Nomor induk atau password salah.');return json(res,200,{token:makeToken(u),user:compactUser(u)});
 }
 if(!pathname.startsWith('/api/')){
  const dist=path.join(root,'dist');if(!fs.existsSync(dist))return fail(res,404,'Aplikasi frontend belum dibuild. Untuk pengembangan jalankan npm run dev.');
  if(req.method!=='GET'&&req.method!=='HEAD')return fail(res,405,'Metode tidak diizinkan');
  const candidate=path.resolve(dist,'.'+decodeURIComponent(pathname));
  if(!candidate.startsWith(dist+path.sep)&&candidate!==dist)return fail(res,403,'Akses ditolak');
  let file=candidate;if(!fs.existsSync(file)||!fs.statSync(file).isFile())file=path.join(dist,'index.html');
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':file.endsWith('index.html')?'no-cache':'public, max-age=3600'});fs.createReadStream(file).pipe(res);return;
 }
 const user=getUser(req);if(!user)return fail(res,401,'Sesi server tidak aktif. Silakan login ulang untuk memakai meeting dan absensi sinkron.');
 if(pathname==='/api/me'&&req.method==='GET')return json(res,200,{user:compactUser(user)});
 if(pathname==='/api/ice'&&req.method==='GET'){const iceServers=[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}];if(process.env.TURN_URL)iceServers.push({urls:process.env.TURN_URL,username:process.env.TURN_USERNAME||'',credential:process.env.TURN_CREDENTIAL||''});return json(res,200,{iceServers})}
 if(pathname==='/api/catalog'&&req.method==='GET'){
  const classes=user.role==='admin'?catalog.classes:catalog.classes.filter(c=>canUseClass(user,c.id));
  const classIds=new Set(classes.map(c=>c.id));
  const users=catalog.users.filter(u=>user.role==='admin'||u.id===user.id||(user.role==='teacher'&&u.role==='student'&&classIds.has(u.classId))||(user.role==='student'&&((u.role==='student'&&u.classId===user.classId)||(u.role==='teacher'&&classes.some(c=>c.teacherId===u.id))))).map(({passwordHash,...u})=>user.role==='student'&&u.id!==user.id?({id:u.id,name:u.name,role:u.role,classId:u.classId,active:u.active}):u);
  return json(res,200,{users,classes});
 }
 if(pathname==='/api/password/change'&&req.method==='POST'){
  const d=await body(req);const account=catalog.users.find(u=>u.id===user.id);
  if(!checkPassword(d.old,account.passwordHash))return fail(res,400,'Password lama salah');
  if(String(d.password||'').length<8)return fail(res,400,'Password baru minimal 8 karakter');
  account.passwordHash=hashPassword(d.password);writeJSON(catalogFile,catalog);return json(res,200,{ok:true});
 }
 if(pathname==='/api/password/reset'&&req.method==='POST'){
  if(user.role!=='admin')return fail(res,403,'Hanya admin dapat reset password');
  const d=await body(req),account=catalog.users.find(u=>u.id===d.userId);
  if(!account)return fail(res,404,'Akun tidak ditemukan');
  if(String(d.password||'').length<8)return fail(res,400,'Password minimal 8 karakter');
  account.passwordHash=hashPassword(d.password);writeJSON(catalogFile,catalog);return json(res,200,{ok:true});
 }
 if(pathname==='/api/catalog'&&req.method==='POST'){
  if(user.role!=='admin')return fail(res,403,'Hanya admin sekolah yang bisa mengubah akun dan kelas');
  const d=await body(req);
  if(!Array.isArray(d.users)||!Array.isArray(d.classes)||d.users.length>500||d.classes.length>150)return fail(res,400,'Data akun atau kelas tidak valid');
  const nextUsers=d.users.map(u=>{const previous=catalog.users.find(x=>x.id===u.id);const roles=['admin','teacher','student'];if(!roles.includes(u.role)||!u.id||!u.number)throw Error('Akun tidak valid');return {id:text(u.id,80),name:text(u.name,150),number:text(u.number,40),role:u.role,active:u.active!==false,email:text(u.email,120),subject:text(u.subject,100),need:text(u.need,90),classId:text(u.classId,80),passwordHash:previous?.passwordHash||(u.password?hashPassword(u.password):hashPassword(crypto.randomBytes(12).toString('hex')))}});
  if(!nextUsers.some(u=>u.id===user.id&&u.role==='admin'&&u.active))return fail(res,400,'Akun admin yang sedang digunakan tidak boleh dihapus/dinonaktifkan');
  const ids=new Set(),numbers=new Set();for(const u of nextUsers){if(ids.has(u.id)||numbers.has(u.number))return fail(res,400,'ID atau nomor induk duplikat');ids.add(u.id);numbers.add(u.number)}
  const nextClasses=d.classes.map(c=>({id:text(c.id,80),name:text(c.name,100),grade:text(c.grade,40),teacherId:text(c.teacherId,80),subject:text(c.subject,90),schedule:text(c.schedule,150)}));
  catalog={users:nextUsers,classes:nextClasses};writeJSON(catalogFile,catalog);return json(res,200,{ok:true});
 }

 if(pathname==='/api/classroom-state'&&req.method==='GET')return json(res,200,visibleState(user));
 if(pathname==='/api/faces'&&req.method==='POST'){
  const d=await body(req);if(!canAdministerFace(user,d.studentId))return fail(res,403,'Hanya guru yang mengampu kelas atau admin dapat mendaftarkan wajah');
  if(!d.consentConfirmed)return fail(res,400,'Konfirmasi persetujuan sekolah diperlukan');
  if(!Array.isArray(d.descriptors)||(!(d.photoOnly&&d.descriptors.length===0) && (d.descriptors.length!==3||!d.descriptors.every(x=>Array.isArray(x)&&x.length===128&&x.every(n=>typeof n==='number'&&Number.isFinite(n))))))return fail(res,400,'Diperlukan 3 sampel wajah, atau pilihan unggah foto saja');
  if(typeof d.photo!=='string'||!/^data:image\/(jpeg|webp);base64,/.test(d.photo)||d.photo.length>140_000)return fail(res,400,'Foto siswa harus gambar JPEG/WebP berukuran kecil');
  faceProfiles=faceProfiles.filter(x=>x.studentId!==d.studentId);faceProfiles.push({studentId:d.studentId,descriptors:d.descriptors,photo:d.photo,consentConfirmed:true,photoOnly:!!d.photoOnly,enrolledAt:new Date().toISOString(),enrolledBy:user.id});saveFaces();return json(res,200,{ok:true});
 }
 const faceId=pathname.match(/^\/api\/faces\/([a-zA-Z0-9_-]+)$/);
 if(faceId&&req.method==='DELETE'){if(!canAdministerFace(user,faceId[1]))return fail(res,403,'Akses ditolak');faceProfiles=faceProfiles.filter(x=>x.studentId!==faceId[1]);saveFaces();return json(res,200,{ok:true})}
 if(pathname==='/api/attendance/session'&&req.method==='POST'){
  if(user.role==='student')return fail(res,403,'Siswa tidak dapat membuka sesi');const d=await body(req);if(!canUseClass(user,d.classId))return fail(res,403,'Kelas tidak diampu');
  const now=new Date(),date=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
  state.sessions.filter(s=>s.classId===d.classId&&s.date===date).forEach(s=>s.open=false);
  const session={id:uid(),classId:d.classId,date,minutes:Math.min(120,Math.max(1,Number(d.minutes)||15)),createdAt:now.toISOString(),open:true};state.sessions.push(session);writeJSON(stateFile,state);return json(res,200,{session});
 }
 const sessionId=pathname.match(/^\/api\/attendance\/session\/([a-zA-Z0-9_-]+)$/);
 if(sessionId&&req.method==='PATCH'){const s=state.sessions.find(s=>s.id===sessionId[1]);if(!s||user.role==='student'||!canUseClass(user,s.classId))return fail(res,403,'Sesi tidak tersedia');const d=await body(req);s.open=Boolean(d.open);if(s.open)s.createdAt=new Date().toISOString();writeJSON(stateFile,state);return json(res,200,{session:s})}
 if(pathname==='/api/attendance/mark'&&req.method==='POST'){
  const d=await body(req);const ses=state.sessions.find(s=>s.id===d.sessionId);if(!ses||!canUseClass(user,ses.classId))return fail(res,403,'Sesi tidak tersedia');const student=catalog.users.find(u=>u.id===d.studentId&&u.role==='student'&&u.classId===ses.classId);if(!student)return fail(res,403,'Siswa tidak berada di kelas ini');
  if(user.role==='student'&&(d.studentId!==user.id||d.source!=='face'||!ses.open||Date.now()-new Date(ses.createdAt).getTime()>ses.minutes*60000))return fail(res,403,'Absensi siswa harus sesuai sesi aktif');
  const status=text(d.status,20);if(!['Hadir','Terlambat','Izin','Sakit','Alpa'].includes(status))return fail(res,400,'Status absensi tidak valid');
  let record=state.attendance.find(a=>a.sessionId===ses.id&&a.studentId===student.id);
  if(record&&user.role==='student')return fail(res,409,'Absensi sudah tercatat');
  if(record)Object.assign(record,{status,source:user.role==='student'?'face':d.source==='face'?'face':'manual',verifiedAt:new Date().toISOString()});
  else {record={id:uid(),sessionId:ses.id,classId:ses.classId,studentId:student.id,date:ses.date,status,source:d.source==='face'?'face':'manual',verifiedAt:new Date().toISOString()};state.attendance.push(record)}
  writeJSON(stateFile,state);return json(res,200,{record});
 }
 if(pathname==='/api/rooms'&&req.method==='GET')return json(res,200,{rooms:rooms.filter(r=>roomFor(user,r)).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))});
 if(pathname==='/api/rooms'&&req.method==='POST'){
  if(user.role!=='teacher'&&user.role!=='admin')return fail(res,403,'Hanya guru atau admin yang bisa membuat ruang');const d=await body(req);if(!canUseClass(user,d.classId))return fail(res,403,'Kelas tidak dapat dikelola');
  const room={id:uid().slice(0,8),title:text(d.title,100)||'Kelas Online',classId:d.classId,createdBy:user.id,createdAt:new Date().toISOString(),open:true};saveRoom(room);return json(res,201,{room});
 }
 const roomMatch=pathname.match(/^\/api\/rooms\/([a-zA-Z0-9_-]+)(?:\/(join|events|signal|leave|message))?$/);
 if(roomMatch){const [,roomId,action]=roomMatch,room=rooms.find(r=>r.id===roomId);if(!roomFor(user,room))return fail(res,404,'Ruang meeting tidak ditemukan');
  if(!action&&req.method==='GET')return json(res,200,{room,people:(peers.get(roomId)||new Map()).size});
  if(!action&&req.method==='PATCH'){
   if(room.createdBy!==user.id&&user.role!=='admin')return fail(res,403,'Hanya pembuat ruang dapat mengubahnya');const d=await body(req);room.open=Boolean(d.open);saveRoom(room);if(!room.open)emit(roomId,'room-closed',{});return json(res,200,{room});
  }
  if(action==='join'&&req.method==='POST'){
   if(!room.open)return fail(res,409,'Ruang telah ditutup');const map=peers.get(roomId)||new Map();if(map.size>=8)return fail(res,409,'Maksimal 8 peserta untuk prototipe ini');const pid=uid();map.set(pid,{id:pid,userId:user.id,name:user.name,role:user.role,res:null});peers.set(roomId,map);
   return json(res,200,{peerId:pid,room,participants:[...map.values()].filter(p=>p.id!==pid).map(p=>({id:p.id,name:p.name,role:p.role}))});
  }
  if(action==='events'&&req.method==='GET'){
   const pid=text(url.searchParams.get('peerId'),80),map=peers.get(roomId),peer=map?.get(pid);if(!peer||peer.userId!==user.id)return fail(res,403,'Peserta tidak ditemukan');
   res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});res.write('retry: 1500\n\n');peer.res=res;
   res.write(`event: connected\ndata: ${JSON.stringify({peerId:pid})}\n\n`);
   for(const p of map.values())if(p.id!==pid)emit(roomId,'peer-joined',{id:pid,name:peer.name,role:peer.role},p.id);
   const timer=setInterval(()=>{try{res.write(': heartbeat\n\n')}catch{}},15000);
   res.on('close',()=>{clearInterval(timer);leave(roomId,pid)});return;
  }
  if(action==='signal'&&req.method==='POST'){
   const d=await body(req),map=peers.get(roomId),source=map?.get(d.from),target=map?.get(d.to);
   if(!source||source.userId!==user.id||!target)return fail(res,403,'Peserta sinyal tidak dikenal');if(!['offer','answer','ice'].includes(d.kind))return fail(res,400,'Jenis sinyal tidak valid');
   emit(roomId,'signal',{from:d.from,kind:d.kind,payload:d.payload},d.to);return json(res,200,{ok:true});
  }
  if(action==='leave'&&req.method==='POST'){const d=await body(req),peer=peers.get(roomId)?.get(d.peerId);if(peer?.userId===user.id)leave(roomId,d.peerId);return json(res,200,{ok:true})}
  if(action==='message'&&req.method==='POST'){
   const d=await body(req),peer=peers.get(roomId)?.get(d.peerId);if(!peer||peer.userId!==user.id)return fail(res,403,'Peserta tidak ada');
   if(!['chat','caption'].includes(d.kind))return fail(res,400,'Jenis pesan tidak benar');const message={id:uid(),peerId:peer.id,author:peer.name,role:peer.role,text:text(d.text,600),kind:d.kind,time:new Date().toISOString()};if(!message.text)return fail(res,400,'Pesan kosong');emit(roomId,'message',message);return json(res,200,{message});
  }
 }
 return fail(res,404,'Endpoint tidak ditemukan');
}
const port=Number(process.env.PORT||8787);
const server=http.createServer((req,res)=>handler(req,res).catch(e=>{console.error('Server error:',e.message);fail(res,400,e.message||'Terjadi kesalahan server')}));
server.listen(port,'0.0.0.0',()=>console.log(`[SekolahKu.id] Server demo http://localhost:${port}`));
