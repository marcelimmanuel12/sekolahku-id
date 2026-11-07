import React,{useEffect,useRef,useState} from 'react';
import {Activity,ArrowLeft,BookOpen,Camera,CameraOff,CheckCircle2,Captions,Copy,Hand,Headphones,Info,Lock,MessageSquare,Mic,MicOff,MonitorUp,Plus,Radio,RefreshCw,Send,ShieldCheck,Users,Video,VideoOff,X} from 'lucide-react';
import {api,streamEvents} from '../api';
import './meeting.css';

const glassCards=[
 {match:/\b(halo|hai|selamat)\b/i,emoji:'👋',title:'Sapaan',detail:'Gestur umum melambaikan tangan'},
 {match:/\b(bagus|baik|hebat|setuju)\b/i,emoji:'👍',title:'Respons positif',detail:'Gestur umum jempol'},
 {match:/\b(stop|berhenti|tunggu)\b/i,emoji:'✋',title:'Perhatian / berhenti',detail:'Gestur umum telapak tangan'},
 {match:/\b(tanya|pertanyaan|angkat tangan)\b/i,emoji:'🙋',title:'Ingin bertanya',detail:'Isyarat meminta giliran'},
 {match:/\b(terima kasih|makasih)\b/i,emoji:'🙏',title:'Ungkapan terima kasih',detail:'Simbol visual umum'},
];
const visualFor=text=>glassCards.filter(x=>x.match.test(text||''));
const time=d=>new Date(d).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
function MediaTile({stream,name,muted=false,local=false,role,active=true}){
 const hasVideo=Boolean(stream?.getVideoTracks().some(t=>t.enabled));
 const ref=useRef(null);useEffect(()=>{if(ref.current)ref.current.srcObject=stream||null},[stream]);
 return <div className={'live-tile '+(local?'self ':'')+(!hasVideo?'no-video':'')}>
  <video ref={ref} autoPlay playsInline muted={muted} aria-label={'Video '+name}/>
  {!hasVideo&&<div className="live-avatar"><span>{name?.[0]||'S'}</span><b>{name}</b><small>Video tidak tersedia</small></div>}
  <span className="live-name">{local?'Anda • ':''}{name}{role==='teacher'?' (Guru)':''}</span>
  {active&&<span className="live-on-air"><span/> LIVE</span>}
 </div>;
}
export default function ClassroomMeeting({role,current,classes,notify}){
 const [rooms,setRooms]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[title,setTitle]=useState('Kelas Online SekolahKu.id'),[classId,setClassId]=useState(classes[0]?.id||'');
 const [active,setActive]=useState(null),[people,setPeople]=useState([]),[remoteStreams,setRemoteStreams]=useState({}),[localStream,setLocalStream]=useState(null);
 const [mic,setMic]=useState(true),[camera,setCamera]=useState(true),[screenshare,setScreenshare]=useState(false),[captionOn,setCaptionOn]=useState(false),[subtitles,setSubtitles]=useState([]),[partial,setPartial]=useState('');
 const [chat,setChat]=useState([]),[draft,setDraft]=useState(''),[manualText,setManualText]=useState(''),[pane,setPane]=useState('caption');
 const iceServersRef=useRef([{urls:'stun:stun.l.google.com:19302'}]);
 const roomRef=useRef(null),peerIdRef=useRef(null),peersRef=useRef(new Map()),remoteRef=useRef(new Map()),pendingIce=useRef(new Map()),streamRef=useRef(null),screenRef=useRef(null),evtRef=useRef(null),recognizerRef=useRef(null),micRef=useRef(true);
 const classesRef=useRef(classes);classesRef.current=classes;
 const loadRooms=async()=>{try{const d=await api('/rooms');setRooms(d.rooms||[]);setError('')}catch(e){setError('Tidak dapat membuka layanan meeting: '+e.message)}finally{setLoading(false)}};
 useEffect(()=>{loadRooms()},[current.id]);
 const send=async(kind,text)=>{if(!roomRef.current||!peerIdRef.current)return;try{await api('/rooms/'+roomRef.current.id+'/message',{method:'POST',data:{peerId:peerIdRef.current,kind,text}})}catch(e){setError(e.message)}};
 const signal=async(to,kind,payload)=>{if(!roomRef.current||!peerIdRef.current)return;try{await api('/rooms/'+roomRef.current.id+'/signal',{method:'POST',data:{from:peerIdRef.current,to,kind,payload}})}catch(e){setError('Koneksi dengan peserta: '+e.message)}};
 const closePeer=id=>{const pc=peersRef.current.get(id);if(pc){pc.ontrack=null;pc.onicecandidate=null;pc.close();peersRef.current.delete(id)}remoteRef.current.delete(id);setRemoteStreams(Object.fromEntries(remoteRef.current));pendingIce.current.delete(id)};
 const createPeer=id=>{
  if(peersRef.current.has(id))return peersRef.current.get(id);
  const pc=new RTCPeerConnection({iceServers:iceServersRef.current});
  peersRef.current.set(id,pc);
  const source=streamRef.current;
  if(source)for(const track of source.getTracks())pc.addTrack(track,source);
  pc.onicecandidate=ev=>{if(ev.candidate)signal(id,'ice',ev.candidate.toJSON())};
  pc.ontrack=ev=>{
   if(ev.streams[0])remoteRef.current.set(id,ev.streams[0]);
   else{const existing=remoteRef.current.get(id)||new MediaStream();if(!existing.getTracks().some(t=>t.id===ev.track.id))existing.addTrack(ev.track);remoteRef.current.set(id,existing)}
   setRemoteStreams(Object.fromEntries(remoteRef.current));
  };
  pc.onconnectionstatechange=()=>{if(['failed','disconnected'].includes(pc.connectionState))setError('Koneksi media salah satu peserta terputus. Periksa jaringan atau gunakan server TURN.');};
  return pc;
 };
 const processEvent=async(kind,d)=>{
  if(kind==='peer-joined'){
   setPeople(old=>old.some(p=>p.id===d.id)?old:[...old,d]);
   try{const pc=createPeer(d.id);const offer=await pc.createOffer();await pc.setLocalDescription(offer);await signal(d.id,'offer',pc.localDescription)}catch(e){setError('Gagal menghubungkan peserta baru: '+e.message)}
  }else if(kind==='peer-left'){closePeer(d.id);setPeople(old=>old.filter(p=>p.id!==d.id));}
  else if(kind==='signal'){
   try{const pc=createPeer(d.from);
    if(d.kind==='ice'){
     if(pc.remoteDescription)await pc.addIceCandidate(new RTCIceCandidate(d.payload));else pendingIce.current.set(d.from,[...(pendingIce.current.get(d.from)||[]),d.payload]);
    }else{
     await pc.setRemoteDescription(new RTCSessionDescription(d.payload));
     for(const candidate of pendingIce.current.get(d.from)||[])await pc.addIceCandidate(new RTCIceCandidate(candidate));pendingIce.current.delete(d.from);
     if(d.kind==='offer'){const ans=await pc.createAnswer();await pc.setLocalDescription(ans);await signal(d.from,'answer',pc.localDescription)}
    }
   }catch(e){setError('Negosiasi video gagal: '+e.message)}
  }else if(kind==='message'){
    if(d.kind==='caption')setSubtitles(old=>[...old.slice(-34),d]);
    else setChat(old=>[...old.slice(-55),d]);
  }else if(kind==='room-closed'){setError('Guru menutup ruang ini. Silakan keluar dari meeting.');}
 };
 const join=async room=>{
  setError('');let s=null;
  try{
   if(!navigator.mediaDevices?.getUserMedia)throw Error('Kamera/mikrofon membutuhkan HTTPS atau localhost.');
   try{s=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:{width:{ideal:640},height:{ideal:360}}});}
   catch{
    try{s=await navigator.mediaDevices.getUserMedia({audio:true,video:false});setCamera(false)}
    catch{setMic(false);setCamera(false)}
   }
   try{const ice=await api('/ice');iceServersRef.current=ice.iceServers||iceServersRef.current}catch{}
   const data=await api('/rooms/'+room.id+'/join',{method:'POST',data:{}});
   roomRef.current=data.room;peerIdRef.current=data.peerId;streamRef.current=s;
   setLocalStream(s);setPeople(data.participants||[]);setActive(data.room);setChat([]);setSubtitles([]);setPartial('');setPane('caption');
   if(s){setMic(s.getAudioTracks().some(t=>t.enabled));setCamera(s.getVideoTracks().some(t=>t.enabled))}
   const ctrl=new AbortController();evtRef.current=ctrl;
   streamEvents('/rooms/'+room.id+'/events?peerId='+data.peerId,(kind,data)=>{processEvent(kind,data)},ctrl.signal).catch(e=>{if(!ctrl.signal.aborted)setError('Koneksi ruang terputus: '+e.message)});
  }catch(e){s?.getTracks().forEach(t=>t.stop());setError(e.message)}
 };
 const create=async e=>{e.preventDefault();try{const d=await api('/rooms',{method:'POST',data:{title,classId}});await loadRooms();await join(d.room)}catch(e){setError('Gagal membuat meeting: '+e.message)}};
 const stopCaption=()=>{const rec=recognizerRef.current;recognizerRef.current=null;try{rec?.stop()}catch{}setCaptionOn(false);setPartial('')};
 const leave=()=>{
  stopCaption();evtRef.current?.abort();evtRef.current=null;
  const rid=roomRef.current?.id,pid=peerIdRef.current;
  roomRef.current=null;peerIdRef.current=null;
  if(rid&&pid)api('/rooms/'+rid+'/leave',{method:'POST',data:{peerId:pid}}).catch(()=>{});
  for(const id of [...peersRef.current.keys()])closePeer(id);
  streamRef.current?.getTracks().forEach(t=>t.stop());screenRef.current?.getTracks().forEach(t=>t.stop());screenRef.current=null;streamRef.current=null;
  setLocalStream(null);setActive(null);setRemoteStreams({});setPeople([]);setScreenshare(false);setError('');loadRooms();
 };
 useEffect(()=>()=>{evtRef.current?.abort();recognizerRef.current?.stop();streamRef.current?.getTracks().forEach(t=>t.stop());screenRef.current?.getTracks().forEach(t=>t.stop());const rid=roomRef.current?.id,pid=peerIdRef.current;if(rid&&pid)api('/rooms/'+rid+'/leave',{method:'POST',data:{peerId:pid}}).catch(()=>{});for(const pc of peersRef.current.values())pc.close()},[]);
 const toggleMic=()=>{const track=streamRef.current?.getAudioTracks()[0];if(!track){setError('Mikrofon tidak tersedia. Izinkan mikrofon dan gabung ulang.');return}track.enabled=!track.enabled;setMic(track.enabled);micRef.current=track.enabled};
 const toggleCamera=()=>{const track=streamRef.current?.getVideoTracks()[0];if(!track){setError('Kamera tidak tersedia. Izinkan kamera dan gabung ulang.');return}track.enabled=!track.enabled;setCamera(track.enabled)};
 const shareScreen=async()=>{
  if(screenshare){screenRef.current?.getTracks().forEach(t=>t.stop());screenRef.current=null;const track=streamRef.current?.getVideoTracks()[0];for(const pc of peersRef.current.values()){const sender=pc.getSenders().find(x=>x.track?.kind==='video');if(track&&sender)await sender.replaceTrack(track)}setLocalStream(streamRef.current);setScreenshare(false);return;}
  try{const screen=await navigator.mediaDevices.getDisplayMedia({video:true,audio:false});const track=screen.getVideoTracks()[0];screenRef.current=screen;for(const pc of peersRef.current.values()){const sender=pc.getSenders().find(x=>x.track?.kind==='video');if(sender)await sender.replaceTrack(track)}setLocalStream(screen);setScreenshare(true);track.onended=()=>{if(screenRef.current)shareScreen()}}
  catch(e){setError('Berbagi layar tidak tersedia: '+e.message)}
 };
 const toggleCaptions=()=>{
  if(captionOn){stopCaption();return}
  const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SpeechRecognition){setError('Subtitle suara otomatis memerlukan browser yang mendukung Web Speech API (misalnya Chrome). Gunakan kolom subtitle manual sebagai alternatif.');setPane('caption');return}
  try{
   const r=new SpeechRecognition();r.lang='id-ID';r.continuous=true;r.interimResults=true;
   r.onresult=event=>{let interim='';for(let i=event.resultIndex;i<event.results.length;i++){const item=event.results[i],str=item[0]?.transcript?.trim();if(item.isFinal&&str)send('caption',str);else if(str)interim+=str+' '}setPartial(interim)};
   r.onerror=e=>{setError('Subtitle otomatis: '+(e.error==='not-allowed'?'izin mikrofon tidak diberikan':e.error));stopCaption()};
   r.onend=()=>{if(recognizerRef.current===r){try{r.start()}catch{stopCaption()}}};
   recognizerRef.current=r;r.start();setCaptionOn(true);setError('');setPane('caption');
  }catch(e){setError('Gagal mengaktifkan subtitle: '+e.message)}
 };
 const sendChat=e=>{e.preventDefault();if(draft.trim()){send('chat',draft.trim());setDraft('')}};
 const sendCaption=e=>{e.preventDefault();if(manualText.trim()){send('caption',manualText.trim());setManualText('')}};
 const latestCaption=[...subtitles].reverse().find(m=>m.text)?.text||partial;
 const symbols=visualFor(latestCaption);
 if(active)return <div className="meeting-page"><div className="meeting-room-header"><div><span className="meeting-breadcrumb"><Radio size={15}/> SEKOLAHKU.ID LIVE</span><h1>{active.title}</h1><p>Kelas {classes.find(c=>c.id===active.classId)?.name||active.classId} · {people.length+1} peserta</p></div><button className="btn light" onClick={leave}><ArrowLeft size={17}/> Keluar ruang</button></div>
   {error&&<div className="meeting-alert" role="alert"><Info size={18}/>{error}<button onClick={()=>setError('')} aria-label="Tutup peringatan"><X size={16}/></button></div>}
   <div className="meeting-layout"><div className="meeting-main"><div className="meeting-videos"><MediaTile stream={localStream} name={current.name} role={role} local muted/>{people.map(p=><MediaTile key={p.id} stream={remoteStreams[p.id]} name={p.name} role={p.role}/>)}</div>
    {(partial||latestCaption)&&<div className="meeting-caption-bar" aria-live="polite"><Captions size={22}/><span>{partial||latestCaption}</span></div>}
    <div className="meeting-controls"><button className={'meeting-control '+(!mic?'off':'')} title={mic?'Matikan mikrofon':'Aktifkan mikrofon'} onClick={toggleMic}>{mic?<Mic/>:<MicOff/>}<span>Mic</span></button><button className={'meeting-control '+(!camera?'off':'')} title={camera?'Matikan kamera':'Aktifkan kamera'} onClick={toggleCamera}>{camera?<Camera/>:<CameraOff/>}<span>Kamera</span></button><button className={'meeting-control '+(screenshare?'selected':'')} onClick={shareScreen}><MonitorUp/><span>Layar</span></button><button className={'meeting-control '+(captionOn?'selected':'')} onClick={toggleCaptions}><Captions/><span>Subtitle AI</span></button><button className="meeting-control" onClick={()=>setPane('visual')}><Hand/><span>Gestur</span></button><button className="meeting-control exit" onClick={leave}><VideoOff/><span>Keluar</span></button></div>
    <div className="meeting-privacy"><ShieldCheck size={17}/> Kamera dan mikrofon hanya aktif setelah izin perangkat. Video memakai koneksi antarpeserta (WebRTC); server menghubungkan peserta, bukan merekam video.</div>
   </div><aside className="meeting-aside"><div className="meeting-panes">{[['caption','Subtitle',Captions],['chat','Chat',MessageSquare],['visual','Kartu Tangan',Hand]].map(([value,label,Icon])=><button key={value} onClick={()=>setPane(value)} className={pane===value?'active':''}><Icon size={16}/>{label}</button>)}</div>
    {pane==='caption'?<><div className="meeting-panel-title"><h3>Subtitle percakapan</h3><p>Teks dari ucapan guru atau peserta yang mengaktifkan subtitle.</p></div><div className="meeting-message-list" aria-live="polite">{subtitles.length?subtitles.map(m=><div key={m.id} className="meeting-caption-item"><small>{m.author} · {time(m.time)}</small><p>{m.text}</p></div>):<div className="meeting-empty"><Captions size={37}/><h4>Belum ada subtitle</h4><p>Tekan Subtitle AI untuk transkripsi otomatis bahasa Indonesia.</p></div>}</div><form className="meeting-send" onSubmit={sendCaption}><input aria-label="Ketik subtitle jika suara tidak terdeteksi" value={manualText} onChange={e=>setManualText(e.target.value)} placeholder="Tulis subtitle manual..."/><button aria-label="Kirim subtitle"><Send size={18}/></button></form><small className="meeting-aside-note">Ketersediaan dan akurasi transkripsi bergantung pada browser, izin dan jaringan.</small></>
     :pane==='chat'?<><div className="meeting-panel-title"><h3>Chat kelas</h3><p>Diskusi langsung selama meeting berlangsung.</p></div><div className="meeting-message-list">{chat.length?chat.map(m=><div key={m.id} className="meeting-chat-item"><small>{m.author} · {time(m.time)}</small><p>{m.text}</p></div>):<div className="meeting-empty"><MessageSquare size={37}/><h4>Belum ada pesan</h4><p>Kirim pesan untuk memulai diskusi.</p></div>}</div><form className="meeting-send" onSubmit={sendChat}><input aria-label="Tulis pesan" value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Tulis pesan..."/><button aria-label="Kirim pesan"><Send size={18}/></button></form></>
     :<><div className="meeting-panel-title"><h3>Ilustrasi gestur tangan</h3><p>Kartu visual muncul ketika kata tertentu terdengar pada subtitle.</p></div><div className="meeting-gesture-cards">{symbols.length?symbols.map(g=><div className="meeting-gesture" key={g.title}><span role="img" aria-label={g.title}>{g.emoji}</span><strong>{g.title}</strong><small>{g.detail}</small></div>):<div className="meeting-empty"><Hand size={39}/><h4>Menunggu kata kunci</h4><p>Contoh kata: halo, bagus, berhenti, bertanya.</p></div>}</div><div className="meeting-caution"><Info size={17}/><p><b>Belum penerjemah BISINDO.</b> Gestur ini adalah ikon visual umum, bukan kosakata BISINDO yang sudah divalidasi. Penerjemahan bahasa isyarat sungguhan perlu dataset/video dan validasi pengguna BISINDO.</p></div></>}
   </aside></div></div>;
 return <div className="meeting-page"><div className="page-header"><div><div className="eyebrow">SEKOLAHKU.ID / KELAS ONLINE</div><h1>Meeting SekolahKu.id</h1><p>Guru membuat ruang langsung dari website. Siswa bergabung tanpa perlu menempel tautan Google Meet.</p></div><button className="btn light" onClick={loadRooms}><RefreshCw size={17}/> Muat ulang ruang</button></div>
  <div className="meeting-intro"><span className="meeting-intro-icon"><Video size={35}/></span><div><h2>Kelas virtual, lebih inklusif ✨</h2><p>Video, mikrofon, berbagi layar, chat, subtitle bahasa Indonesia, dan kartu gestur visual dalam satu ruang.</p></div><img src="/art/feature-meeting.webp" alt="Ikon ilustrasi meeting"/></div>
  {error&&<div className="meeting-alert" role="alert"><Info size={19}/>{error}</div>}
  {['teacher','admin'].includes(role)&&<form className="meeting-create" onSubmit={create}><div><h3><Plus size={19}/> Buat ruang baru</h3><p>Meeting dibuat otomatis, tanpa memasukkan link dari layanan lain.</p></div><label>Judul meeting<input required value={title} onChange={e=>setTitle(e.target.value)} maxLength={100}/></label><label>Pilih kelas<select required value={classId} onChange={e=>setClassId(e.target.value)}>{classes.map(c=><option key={c.id} value={c.id}>{c.name} • {c.subject}</option>)}</select></label><button type="submit" className="btn primary" disabled={!classId}><Video size={18}/> Buat & Masuk Meeting</button></form>}
  <div className="meeting-list-heading"><h3>Ruang meeting kelas</h3><span>{rooms.length} ruang tersedia</span></div>
  <div className="meeting-room-list">{loading?<p>Memuat ruang kelas...</p>:rooms.length?rooms.map(room=><div className="meeting-room-card" key={room.id}><span className="meeting-room-illustration"><Video size={30}/></span><div><h4>{room.title}</h4><p>{classes.find(c=>c.id===room.classId)?.name||room.classId} • Dibuat {new Date(room.createdAt).toLocaleString('id-ID')}</p><span className={'meeting-room-tag '+(room.open?'open':'closed')}>{room.open?'● Ruang tersedia':'Ruang ditutup'}</span></div><button className="btn primary" disabled={!room.open} onClick={()=>join(room)}>Gabung <Video size={17}/></button></div>):<div className="meeting-empty standalone"><Video size={41}/><h4>Belum ada ruang meeting</h4><p>{role==='student'?'Guru belum membuat meeting untuk kelas ini.':'Buat ruang pertama untuk memulai kelas virtual.'}</p></div>}</div>
  <div className="meeting-caution below"><Info size={18}/><p><b>Status prototipe:</b> Video memakai WebRTC peer-to-peer untuk kelompok kecil (maksimal 8). Jaringan tertentu memerlukan server TURN. Subtitle otomatis menggunakan Web Speech API yang tidak tersedia di setiap browser. Untuk penggunaan sekolah sungguhan, wajib memakai HTTPS, autentikasi produksi, perlindungan data anak, dan uji aksesibilitas.</p></div>
 </div>;
}
