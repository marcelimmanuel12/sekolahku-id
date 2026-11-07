import React, {useEffect, useMemo, useRef, useState} from 'react';
import {api} from '../api';
import {Activity, AlertCircle, ArrowRight, BadgeCheck, CalendarDays, Camera, CameraOff, Check, CheckCircle2, ChevronRight, CircleHelp, Clock3, Download, Fingerprint, GraduationCap, IdCard, Info, LockKeyhole, RefreshCw, ScanFace, Search, ShieldCheck, ShieldOff, Sparkles, Trash2, UserCheck, UserRoundCheck, Users, Video, X} from 'lucide-react';

// Prototype only: biometric descriptors remain in the local browser database.
// Deployment requires authenticated server storage, explicit parent/guardian consent,
// encryption, retention/deletion policies, spoofing/liveness protection and an audit trail.
const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights';
const THRESHOLD = 0.48; // conservative starting point; calibrate on representative validation data
let modelPromise;
async function getFaceApi(){
  if(!modelPromise){
    modelPromise = (async()=>{
      const faceapi = await import('face-api.js');
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      return faceapi;
    })().catch(error=>{modelPromise=undefined;throw error});
  }
  return modelPromise;
}
function today(){const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
function timeNow(){return new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}
function dist(a,b){if(!a?.length || !b?.length || a.length!==b.length)return Infinity;let sum=0;for(let i=0;i<a.length;i++)sum+=(a[i]-b[i])**2;return Math.sqrt(sum)}
function bestMatch(descriptor,profiles,students){
  const valid=new Set(students.map(s=>s.id));
  const candidates=(profiles||[]).filter(p=>valid.has(p.studentId)&&Array.isArray(p.descriptors)&&p.descriptors.length);
  const matches=candidates.map(p=>({studentId:p.studentId,distance:Math.min(...p.descriptors.map(d=>dist(descriptor,d)))})).sort((a,b)=>a.distance-b.distance);
  if(!matches.length||matches[0].distance>=THRESHOLD)return null;
  // margin between two best classes prevents ambiguous matches
  if(matches[1] && matches[1].distance-matches[0].distance<0.06)return null;
  return matches[0];
}
function StatusPill({status}){const tone=status==='Hadir'?'ok':status==='Terlambat'?'late':['Izin','Sakit'].includes(status)?'away':'absent';return <span className={'face-status '+tone}><span/>{status||'Belum absen'}</span>}
function SectionHeading({icon:Icon,title,subtitle,right}){return <div className="face-section-heading"><div className="face-section-title"><span className="face-section-icon"><Icon size={22}/></span><div><h3>{title}</h3><p>{subtitle}</p></div></div>{right}</div>}

function CameraScanner({mode,profile,profiles,students,onCapture,onMatch,blockedIds=[],disabled=false}){
  const video=useRef(null),stream=useRef(null),working=useRef(false),matchLock=useRef({id:null,count:0}),latest=useRef({});
  const [active,setActive]=useState(false),[ready,setReady]=useState(false),[state,setState]=useState('Kamera belum aktif'),[error,setError]=useState('');
  latest.current={mode,profile,profiles,students,onCapture,onMatch,blockedIds,disabled};
  useEffect(()=>{
    if(!active)return;
    let cancelled=false;let interval;
    (async()=>{
      try{
        setState('Memuat model pengenalan wajah...');setError('');setReady(false);
        if(!navigator.mediaDevices?.getUserMedia)throw Error('Browser tidak mendukung akses kamera. Gunakan HTTPS atau localhost.');
        const media=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:960},height:{ideal:720}},audio:false});
        if(cancelled){media.getTracks().forEach(t=>t.stop());return;}
        stream.current=media;
        if(video.current){video.current.srcObject=media;await video.current.play()}
        if(cancelled)return;
        setState('Kamera aktif, memuat model pengenal wajah...');
        let api;
        try{api=await getFaceApi()}catch(modelError){
          setError('Model pengenal wajah belum dapat dimuat: '+modelError.message+'. Foto siswa tetap bisa diunggah melalui tombol Unggah foto di bawah kamera.');
          setState('Kamera aktif. Pemindaian AI belum tersedia; gunakan unggah foto atau absensi manual.');return;
        }
        if(cancelled)return;
        setReady(true);setState('Kamera siap. Posisikan satu wajah di bingkai.');
        interval=setInterval(async()=>{
          const v=video.current;
          if(!v || v.readyState<2 || working.current || latest.current.disabled)return;
          if(latest.current.mode==='enroll')return;
          working.current=true;
          try{
            const results=await api.detectAllFaces(v,new api.TinyFaceDetectorOptions({inputSize:416,scoreThreshold:0.65})).withFaceLandmarks().withFaceDescriptors();
            if(results.length!==1){matchLock.current={id:null,count:0};setState(results.length>1?'Terdeteksi lebih dari satu wajah. Harap bergantian.':'Mencari wajah siswa...');return}
            const found=bestMatch(results[0].descriptor,latest.current.profiles,latest.current.students);
            if(!found){matchLock.current={id:null,count:0};setState('Wajah belum cocok dengan data terdaftar. Coba lagi atau gunakan absensi manual.');return}
            const previous=matchLock.current;
            matchLock.current={id:found.studentId,count:previous.id===found.studentId?previous.count+1:1};
            if(matchLock.current.count<2){setState('Memverifikasi kecocokan wajah...');return}
            if(latest.current.blockedIds.includes(found.studentId)){setState('Siswa ini sudah tercatat pada sesi ini.');return}
            const result=await latest.current.onMatch(found.studentId,found.distance);
            if(result!==false){setState('Wajah cocok. Kehadiran berhasil dicatat pada sesi ini.');matchLock.current={id:null,count:0}}
          }catch(e){setState('Pemindaian belum berhasil: '+(e?.message||'silakan coba lagi'))}
          finally{working.current=false}
        },1450);
      }catch(e){if(!cancelled){setError('Kamera atau model AI tidak bisa digunakan: '+(e.message||'gagal memuat')+'. Periksa izin kamera dan koneksi internet.');setState('Pemindaian tidak tersedia. Gunakan absensi manual.');setActive(false)}}
    })();
    return()=>{cancelled=true;clearInterval(interval);stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;if(video.current)video.current.srcObject=null;working.current=false};
  },[active]);
  const capture=async()=>{
    if(!ready || working.current || !video.current)return;
    working.current=true;
    try{
      const api=await getFaceApi();const results=await api.detectAllFaces(video.current,new api.TinyFaceDetectorOptions({inputSize:416,scoreThreshold:0.65})).withFaceLandmarks().withFaceDescriptors();
      if(results.length!==1){setState('Harus ada tepat satu wajah yang terlihat jelas.');return}
      const rect=results[0].detection.box;
      if(rect.width<100||rect.height<100){setState('Dekatkan wajah ke kamera agar lebih jelas.');return}
      // Save an actual compressed portrait as well as the recognition descriptor.
      const box=results[0].detection.box,v=video.current;
      const size=Math.max(box.width,box.height)*1.55;
      const sx=Math.min(v.videoWidth-size,Math.max(0,box.x+box.width/2-size/2));
      const sy=Math.min(v.videoHeight-size,Math.max(0,box.y+box.height/2-size/2));
      const canvas=document.createElement('canvas');canvas.width=224;canvas.height=224;
      canvas.getContext('2d').drawImage(v,Math.max(0,sx),Math.max(0,sy),Math.min(size,v.videoWidth),Math.min(size,v.videoHeight),0,0,224,224);
      const photo=canvas.toDataURL('image/jpeg',0.70);
      latest.current.onCapture({descriptor:Array.from(results[0].descriptor),photo});
      setState('Foto dan sampel wajah diambil. Ubah sedikit sudut wajah untuk sampel berikutnya.');
    }catch(e){setState('Gagal mengambil sampel: '+e.message)}finally{working.current=false}
  };
  return <div className="face-camera-wrap">
    <div className={'face-video-stage '+(active?'on':'')}>
      <video ref={video} autoPlay muted playsInline aria-label="Pratinjau kamera wajah"/>
      {active&&<div className="face-guide" aria-hidden="true"><div className="face-oval"/><span className="face-guide-label"><ScanFace size={15}/> Posisikan wajah di tengah</span></div>}
      {!active&&<div className="face-camera-empty"><div className="face-camera-orb"><Camera size={38}/></div><h3>Siap untuk pemindaian wajah?</h3><p>Kamera hanya menyala setelah kamu mengizinkannya.</p></div>}
      <span className="face-camera-badge"><span className={active&&ready?'pulse':''}/>{active?(ready?'Kamera aktif':'Menyiapkan kamera'):'Kamera nonaktif'}</span>
    </div>
    {error&&<div role="alert" className="face-error"><AlertCircle size={18}/>{error}</div>}
    <p className="face-camera-hint" role="status"><Activity size={16}/>{state}</p>
    <div className="face-camera-actions">
      <button type="button" className={'btn '+(active?'light':'primary')} onClick={()=>{setActive(!active);if(active){setReady(false);setError('');setState('Kamera dihentikan')}}}><span className="btn-label">{active?<><CameraOff size={17}/> Matikan kamera</>:<><Video size={17}/> Aktifkan kamera</>}</span></button>
      {mode==='enroll'&&<button type="button" disabled={!active||!ready} className="btn primary" onClick={capture}><Camera size={17}/> Ambil sampel wajah</button>}
    </div>
  </div>
}
export default function FaceAttendance({db,current,role,classes,students,update,notify,exportTable,selectClass,syncRemote}){
  const [tab,setTab]=useState('scan'),[classId,setClassId]=useState(classes[0]?.id||''),[sessionId,setSessionId]=useState(''),[enrollId,setEnrollId]=useState(''),[samples,setSamples]=useState([]),[agreed,setAgreed]=useState(false),[query,setQuery]=useState('');
  const [serverReady,setServerReady]=useState(false),[serverError,setServerError]=useState('');
  useEffect(()=>{let mounted=true;const refresh=async()=>{try{const result=await api('/classroom-state');if(mounted){syncRemote(result);setServerReady(true);setServerError('')}}catch(e){if(mounted){setServerReady(false);setServerError(e.message)}}};refresh();const timer=setInterval(refresh,5000);return()=>{mounted=false;clearInterval(timer)}},[current.id]);
  const liveClass=classes.some(c=>c.id===classId)?classId:(classes[0]?.id||'');
  const classStudents=students.filter(s=>s.classId===liveClass);
  const classSessions=(db.sessions||[]).filter(s=>s.classId===liveClass&&s.date===today()).sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
  const chosenSession=classSessions.find(s=>s.id===sessionId)||classSessions.find(s=>s.open)||classSessions[0];
  const sessionIsValid=!!chosenSession?.open && (!chosenSession.createdAt || Date.now()-new Date(chosenSession.createdAt).getTime()<Number(chosenSession.minutes||15)*60*1000);
  const sessionRecords=(db.attendance||[]).filter(a=>a.sessionId===chosenSession?.id || (!a.sessionId && chosenSession && a.classId===chosenSession.classId&&a.date===chosenSession.date));
  const profilesInClass=(db.faceProfiles||[]).filter(p=>classStudents.some(s=>s.id===p.studentId));
  const enrolled=profilesInClass.filter(p=>p.descriptors?.length===3);
  const registered=new Set(profilesInClass.map(p=>p.studentId));
  const selectedStudent=classStudents.find(s=>s.id===enrollId)||classStudents[0];
  const attendanceById=Object.fromEntries(sessionRecords.map(r=>[r.studentId,r]));
  const present=sessionRecords.filter(r=>['Hadir','Terlambat'].includes(r.status)).length;
  const mark=async(studentId,status,source='manual',distance=null)=>{
    if(!chosenSession || (source==='face'&&(!chosenSession.open || (!!chosenSession.createdAt && Date.now()-new Date(chosenSession.createdAt).getTime()>=Number(chosenSession.minutes||15)*60000)))){notify('Buka sesi absensi aktif terlebih dahulu.');return false}
    const existing=attendanceById[studentId];if(existing&&source==='face')return false;
    try{
      const {record}=await api('/attendance/mark',{method:'POST',data:{sessionId:chosenSession.id,studentId,status,source,distance}});
      update(d=>{d.attendance=(d.attendance||[]).filter(a=>!(a.sessionId===record.sessionId&&a.studentId===studentId)).concat(record)});
      notify((classStudents.find(s=>s.id===studentId)?.name||'Siswa')+' — '+status+' ('+(source==='face'?'verifikasi wajah':'manual')+')');return true;
    }catch(e){notify('Gagal menyimpan absensi ke server: '+e.message);return false}
  };
  const openSession=async()=>{
    if(!liveClass){notify('Pilih kelas terlebih dahulu');return}
    try{const {session}=await api('/attendance/session',{method:'POST',data:{classId:liveClass,minutes:15}});update(d=>{(d.sessions||[]).filter(s=>s.classId===liveClass&&s.date===today()).forEach(s=>s.open=false);d.sessions.push(session)});setSessionId(session.id);setTab('scan');notify('Sesi 15 menit telah dibuka dan disimpan di server.')}catch(e){notify('Gagal membuka sesi: '+e.message)}
  };
  const toggleSession=async()=>{
    if(!chosenSession)return;
    try{const {session}=await api('/attendance/session/'+chosenSession.id,{method:'PATCH',data:{open:!chosenSession.open}});update(d=>{const s=d.sessions.find(s=>s.id===session.id);if(s)Object.assign(s,session)});notify(session.open?'Sesi absensi aktif':'Sesi absensi ditutup')}catch(e){notify('Gagal mengubah sesi: '+e.message)}
  };
  const saveFace=async()=>{
    if(!selectedStudent||samples.length<3||!agreed)return;
    const vectors=samples.map(x=>x.descriptor).filter(Boolean);
    const conflict=(db.faceProfiles||[]).find(p=>p.studentId!==selectedStudent.id && p.descriptors?.some(v=>vectors.some(a=>dist(a,v)<0.42)));
    if(conflict){notify('Wajah terlalu mirip dengan profil siswa lain. Pendaftaran dibatalkan untuk ditinjau manual.');return}
    try{
      const photo=samples[0].photo;
      await api('/faces',{method:'POST',data:{studentId:selectedStudent.id,descriptors:vectors,photo,consentConfirmed:true}});
      update(d=>{d.faceProfiles=(d.faceProfiles||[]).filter(p=>p.studentId!==selectedStudent.id).concat({studentId:selectedStudent.id,descriptors:vectors,photo,enrolledAt:new Date().toISOString(),consentConfirmed:true})});
      setSamples([]);setAgreed(false);notify('Foto dan 3 sampel wajah '+selectedStudent.name+' tersimpan di server sekolah.');
    }catch(e){notify('Gagal menyimpan foto siswa: '+e.message)}
  };
  const uploadStudentPhoto=async(event)=>{
    const file=event.target.files?.[0];event.target.value='';
    if(!file||!selectedStudent||!agreed){notify('Pilih siswa dan centang persetujuan terlebih dahulu.');return}
    if(!file.type.startsWith('image/')||file.size>5*1024*1024){notify('Pilih gambar JPG/PNG/WebP maksimal 5 MB.');return}
    try{
      const blobUrl=URL.createObjectURL(file);
      const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('Gambar tidak bisa dibaca'));img.src=blobUrl});
      const canvas=document.createElement('canvas');canvas.width=224;canvas.height=224;
      const size=Math.min(img.naturalWidth,img.naturalHeight),sx=(img.naturalWidth-size)/2,sy=(img.naturalHeight-size)/2;
      canvas.getContext('2d').drawImage(img,sx,sy,size,size,0,0,224,224);URL.revokeObjectURL(blobUrl);
      const photo=canvas.toDataURL('image/jpeg',.68);
      await api('/faces',{method:'POST',data:{studentId:selectedStudent.id,descriptors:[],photo,consentConfirmed:true,photoOnly:true}});
      update(d=>{d.faceProfiles=(d.faceProfiles||[]).filter(p=>p.studentId!==selectedStudent.id).concat({studentId:selectedStudent.id,photo,descriptors:[],photoOnly:true,enrolledAt:new Date().toISOString()})});
      setSamples([]);setAgreed(false);notify('Foto '+selectedStudent.name+' tersimpan. Untuk absensi otomatis, lanjutkan pendaftaran 3 sampel kamera saat AI tersedia.');
    }catch(e){notify('Unggah foto gagal: '+e.message)}
  };
  const removeFace=async(studentId)=>{if(!window.confirm('Hapus foto dan seluruh data pengenal wajah siswa dari server?'))return;try{await api('/faces/'+studentId,{method:'DELETE'});update(d=>{d.faceProfiles=(d.faceProfiles||[]).filter(p=>p.studentId!==studentId)});notify('Foto dan data wajah siswa dihapus dari server.')}catch(e){notify('Gagal menghapus profil: '+e.message)}};
  const records=classStudents.filter(s=>s.name.toLowerCase().includes(query.toLowerCase())||s.number.includes(query));
  const downloadAttendance=(type)=>exportTable('Rekap-Absensi-'+today(),['NISN','Nama','Kelas','Tanggal','Status','Metode','Jam verifikasi'],classStudents.map(s=>{const a=attendanceById[s.id];return[s.number,s.name,selectClass(liveClass),today(),a?.status||'Belum absen',a?.source==='face'?'Pengenalan wajah':a?.source==='manual'?'Manual':'—',a?.verifiedAt?new Date(a.verifiedAt).toLocaleTimeString('id-ID'):'—']}),type);
  if(role==='student'){
    const mySessions=(db.sessions||[]).filter(s=>s.classId===current.classId&&s.date===today()).sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
    const ownSession=mySessions.find(s=>s.open)||mySessions[0];
    const ownRecord=(db.attendance||[]).find(a=>a.sessionId===ownSession?.id&&a.studentId===current.id);
    const profile=(db.faceProfiles||[]).find(p=>p.studentId===current.id);
    const canScan=profile?.descriptors?.length===3;
    const active=!!ownSession?.open && (!ownSession.createdAt||Date.now()-new Date(ownSession.createdAt).getTime()<Number(ownSession.minutes||15)*60000);
    const markSelf=async(id)=>{
      if(id!==current.id||!active||ownRecord)return false;
      try{const {record}=await api('/attendance/mark',{method:'POST',data:{sessionId:ownSession.id,studentId:current.id,status:'Hadir',source:'face'}});update(d=>{d.attendance=(d.attendance||[]).filter(a=>!(a.sessionId===record.sessionId&&a.studentId===current.id)).concat(record)});notify('Absensi wajah berhasil tersimpan di server.');return true}catch(e){notify('Absensi gagal: '+e.message);return false}
    };
    return <div className="face-page"><div className="page-header"><div><div className="eyebrow">SEKOLAHKU.ID / SISWA</div><h1>Absensi Saya</h1><p>Periksa kehadiran dan lakukan absensi wajah saat guru membuka sesi.</p></div><span className="face-header-emblem"><ScanFace size={27}/></span></div>
      <div className={'face-server-status '+(serverReady?'online':'offline')}><span/>{serverReady?'Tersambung ke penyimpanan sekolah — foto dan kehadiran tersinkron': 'Server penyimpanan belum tersedia: '+(serverError||'menghubungkan...')}</div><div className="face-metrics"><div className="face-metric"><span className="face-metric-icon lavender"><CalendarDays/></span><div><small>Absensi hari ini</small><strong>{ownRecord?.status||'Belum tercatat'}</strong></div></div><div className="face-metric"><span className="face-metric-icon mint"><Fingerprint/></span><div><small>Data wajah</small><strong>{canScan?'Siap absensi wajah':profile?'Foto saja':'Belum didaftarkan'}</strong></div></div><div className="face-metric"><span className="face-metric-icon peach"><Clock3/></span><div><small>Sesi aktif</small><strong>{active?'Sedang dibuka':'Belum tersedia'}</strong></div></div></div>
      <div className="face-two-cols"><section className="face-panel"><SectionHeading icon={ScanFace} title="Absensi dengan kamera" subtitle="Pengenalan wajah sesuai data yang terdaftar di sekolah"/>{!canScan?<div className="face-banner warn"><AlertCircle/><div><b>{profile?'Foto tersimpan, scan AI belum didaftarkan':'Wajah belum terdaftar'}</b><p>Minta guru mendaftarkan wajahmu melalui menu Absensi Guru, lalu buka kembali halaman ini.</p></div></div>:!active?<div className="face-banner warn"><Clock3/><div><b>Sesi absensi belum aktif</b><p>Guru harus membuka sesi absensi untuk kelasmu terlebih dahulu.</p></div></div>:ownRecord?<div className="face-success-state"><CheckCircle2 size={52}/><h3>Kamu sudah tercatat!</h3><p>Kehadiranmu: {ownRecord.status}. Kamu tidak perlu melakukan absensi lagi.</p></div>:<CameraScanner mode="student" profiles={[profile]} students={[current]} onMatch={markSelf}/>}</section>
      <section className="face-panel"><SectionHeading icon={ShieldCheck} title="Informasi privasi" subtitle="Informasi penting tentang data wajah"/><div className="face-steps"><div><span>01</span><p>Wajah hanya dicocokkan dengan profil yang didaftarkan guru.</p></div><div><span>02</span><p>Foto pendaftaran wajah yang diberikan dengan persetujuan disimpan terenkripsi di server demo; video absensi tidak direkam.</p></div><div><span>03</span><p>Profil wajah dan sesi absensi disinkronkan melalui server demo selama guru dan siswa terhubung ke server yang sama.</p></div></div><div className="face-banner"><Info size={20}/><div>Jika tidak ingin menggunakan kamera, minta guru mencatat kehadiran secara manual.</div></div></section></div>
      <section className="face-panel"><SectionHeading icon={Activity} title="Riwayat kehadiran" subtitle="Status yang sudah diverifikasi"/><div className="face-table-wrap"><table className="face-table"><thead><tr><th>Tanggal</th><th>Kelas</th><th>Status</th><th>Metode</th></tr></thead><tbody>{(db.attendance||[]).filter(a=>a.studentId===current.id).map(a=><tr key={a.id}><td>{a.date}</td><td>{selectClass(a.classId)}</td><td><StatusPill status={a.status}/></td><td>{a.source==='face'?'Kamera':'Manual'}</td></tr>)}</tbody></table></div></section>
    </div>
  }
  return <div className="face-page"><div className="page-header"><div><div className="eyebrow">SEKOLAHKU.ID / GURU / KEHADIRAN</div><h1>Absensi Pintar</h1><p>Daftarkan wajah siswa, pindai otomatis, atau lakukan koreksi secara manual.</p></div><button className="btn primary" onClick={openSession}><CalendarDays size={17}/> Buka sesi baru</button></div>
    <div className={'face-server-status '+(serverReady?'online':'offline')}><span/>{serverReady?'Penyimpanan sekolah terhubung · foto dan absensi tersinkron':'Server penyimpanan belum tersedia: '+(serverError||'menghubungkan...')}</div>    <div className="face-metrics"><div className="face-metric"><span className="face-metric-icon lavender"><Users/></span><div><small>Total siswa</small><strong>{classStudents.length}</strong><span>Siswa dalam kelas</span></div></div><div className="face-metric"><span className="face-metric-icon mint"><UserCheck/></span><div><small>Sudah hadir</small><strong>{present}</strong><span>{classStudents.length?Math.round(present/classStudents.length*100):0}% dari total siswa</span></div></div><div className="face-metric"><span className="face-metric-icon peach"><Fingerprint/></span><div><small>Wajah terdaftar</small><strong>{enrolled.length} <em>/ {classStudents.length}</em></strong><span>Siap untuk dikenali</span></div></div><div className="face-metric"><span className="face-metric-icon blueish"><Activity/></span><div><small>Sesi absensi</small><strong>{sessionIsValid?'Aktif':'Nonaktif'}</strong><span>{chosenSession?.date||'Belum ada sesi'}</span></div></div></div>
    <div className="face-workbar"><div className="face-select-box"><label htmlFor="face-class">Kelas</label><select id="face-class" value={liveClass} onChange={e=>{setClassId(e.target.value);setSessionId('');setSamples([])}}>{classes.map(c=><option key={c.id} value={c.id}>{c.name} · {c.subject}</option>)}</select></div><div className="face-select-box"><label htmlFor="face-session">Sesi hari ini</label><select id="face-session" value={chosenSession?.id||''} onChange={e=>setSessionId(e.target.value)}><option value="">{classSessions.length?'Pilih sesi':'Belum ada sesi hari ini'}</option>{classSessions.map(s=><option key={s.id} value={s.id}>{(s.createdAt?new Date(s.createdAt).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}):'Sesi')+' · '+(s.open?'Dibuka':'Ditutup')}</option>)}</select></div><div className="face-session-state"><span className={sessionIsValid?'live-dot':''}/>{sessionIsValid?'Sesi berjalan':'Tidak ada sesi aktif'}</div>{chosenSession&&<button className="btn light" onClick={toggleSession}>{chosenSession.open?'Tutup sesi':'Buka kembali'}</button>}</div>
    <div className="face-tabs" role="tablist" aria-label="Mode absensi">{[['scan','Scan Otomatis',ScanFace],['enroll','Daftarkan Wajah',Fingerprint],['manual','Absensi Manual',Users]].map(([key,label,Icon])=><button type="button" role="tab" aria-selected={tab===key} className={tab===key?'selected':''} key={key} onClick={()=>{setTab(key);setSamples([])}}><Icon size={18}/>{label}</button>)}</div>
    {tab==='scan'&&<div className="face-two-cols"><section className="face-panel"><SectionHeading icon={ScanFace} title="Pemindaian otomatis" subtitle="Satu wajah per pemindaian, cocokkan dengan profil kelas" right={<span className="face-tiny-badge"><Sparkles size={13}/> Face AI</span>}/>{!sessionIsValid&&<div className="face-banner warn"><Clock3/><div><b>Sesi belum aktif</b><p>Buka sesi baru atau aktifkan kembali sesi yang ada untuk mulai memindai.</p></div></div>}{!enrolled.length&&<div className="face-banner warn"><AlertCircle/><div><b>Belum ada profil wajah</b><p>Masuk ke tab Daftarkan Wajah untuk merekam tiga sampel setiap siswa terlebih dahulu.</p></div></div>}{sessionIsValid&&!!enrolled.length?<CameraScanner key={'scan-'+liveClass+'-'+chosenSession.id} mode="scan" profiles={enrolled} students={classStudents} blockedIds={sessionRecords.map(a=>a.studentId)} onMatch={id=>mark(id,'Hadir','face')}/>:<div className="face-placeholder"><ScanFace size={56}/><h3>Pemindaian siap digunakan</h3><p>Aktifkan sesi dan daftarkan setidaknya satu profil siswa.</p></div>}</section>
    <section className="face-panel"><SectionHeading icon={UserRoundCheck} title="Rekap langsung" subtitle="Perubahan absensi akan ditampilkan di sini"/><div className="face-progress-caption"><span>Kehadiran kelas</span><b>{present}/{classStudents.length} hadir</b></div><div className="face-progress"><span style={{width:(classStudents.length?present/classStudents.length*100:0)+'%'}}/></div><div className="face-recent-list">{sessionRecords.length?sessionRecords.slice(-6).reverse().map(a=><div className="face-recent" key={a.id}><span className="face-avatar face-photo-avatar">{enrolled.find(p=>p.studentId===a.studentId)?.photo?<img src={enrolled.find(p=>p.studentId===a.studentId).photo} alt=""/>:classStudents.find(s=>s.id===a.studentId)?.name?.[0]||'S'}</span><div><b>{classStudents.find(s=>s.id===a.studentId)?.name||'Siswa'}</b><p>{a.source==='face'?'Dikenali lewat kamera':'Dicatat oleh guru'} · {a.verifiedAt?new Date(a.verifiedAt).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}):'Hari ini'}</p></div><StatusPill status={a.status}/></div>):<div className="face-empty-inline"><Activity size={28}/><p>Belum ada absensi pada sesi ini.</p></div>}</div><button type="button" className="face-inline-link" onClick={()=>setTab('manual')}>Kelola absensi manual <ArrowRight size={16}/></button></section></div>}
    {tab==='enroll'&&<div className="face-two-cols"><section className="face-panel"><SectionHeading icon={Fingerprint} title="Pendaftaran wajah siswa" subtitle="Ambil 3 sampel dari sudut berbeda untuk satu siswa"/><div className="face-form-field"><label htmlFor="face-student">Siswa yang akan didaftarkan</label><select id="face-student" value={selectedStudent?.id||''} onChange={e=>{setEnrollId(e.target.value);setSamples([]);setAgreed(false)}}>{classStudents.map(s=><option value={s.id} key={s.id}>{s.name} — {s.number}</option>)}</select></div><div className="face-sample-dots">{[1,2,3].map(n=><span className={samples.length>=n?'done':''} key={n}>{samples.length>=n?<Check size={16}/>:n}</span>)}<p>{samples.length} dari 3 sampel</p></div><label className="face-consent"><input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)}/><span>Saya memastikan sekolah telah memperoleh persetujuan yang diperlukan untuk pendaftaran biometrik siswa ini dan telah menjelaskan pilihan absensi manual.</span></label>{agreed?<CameraScanner key={'enroll-'+selectedStudent?.id} mode="enroll" onCapture={descriptor=>setSamples(old=>old.length<3?[...old,descriptor]:old)} disabled={samples.length>=3}/>:<div className="face-placeholder"><ShieldCheck size={45}/><h3>Persetujuan diperlukan</h3><p>Konfirmasi persetujuan yang diperlukan sebelum membuka kamera untuk pendaftaran wajah.</p></div>}<button type="button" className="btn primary full" disabled={samples.length<3||!agreed} onClick={saveFace}><ShieldCheck size={17}/> Simpan profil wajah</button><label className={'face-upload-photo '+(!agreed?'disabled':'')}><Camera size={17}/> Unggah foto siswa saja (JPG/PNG/WebP)<input type="file" accept="image/jpeg,image/png,image/webp" disabled={!agreed} onChange={uploadStudentPhoto}/></label><small className="face-upload-note">Opsi foto saja dapat disimpan tanpa model AI, tetapi tidak dapat dipakai untuk scan wajah otomatis. Unggah 3 sampel melalui kamera untuk absensi otomatis.</small><p className="face-small-print">Foto JPEG kecil dan descriptor wajah disimpan terenkripsi di server demo; salinan sesi juga tersimpan sementara di browser. Jangan gunakan data biometrik anak sungguhan tanpa persetujuan dan penilaian keamanan formal.</p></section>
    <section className="face-panel"><SectionHeading icon={Users} title="Daftar pendaftaran" subtitle="Status profil wajah pada kelas terpilih"/><div className="face-recent-list">{classStudents.map(s=><div className="face-recent" key={s.id}><span className="face-avatar face-photo-avatar">{profilesInClass.find(p=>p.studentId===s.id)?.photo?<img src={profilesInClass.find(p=>p.studentId===s.id).photo} alt={'Foto pendaftaran '+s.name}/>:s.name[0]}</span><div><b>{s.name}</b><p>NISN {s.number}</p></div>{registered.has(s.id)?<><span className="face-registered"><BadgeCheck size={14}/> {enrolled.some(p=>p.studentId===s.id)?'Siap Scan':'Foto saja'}</span><button className="face-delete" title={'Hapus wajah '+s.name} aria-label={'Hapus wajah '+s.name} onClick={()=>removeFace(s.id)}><Trash2 size={16}/></button></>:<span className="face-notregistered">Belum ada</span>}</div>)}</div><div className="face-banner"><LockKeyhole size={20}/><div><b>Privasi dan keamanan</b><p>Foto siswa terdaftar terlihat sebagai pratinjau. Backend demo mengenkripsi foto dan vektor wajah pada disk, tetapi belum layak digunakan untuk data anak sungguhan tanpa keamanan produksi.</p></div></div></section></div>}
    {tab==='manual'&&<section className="face-panel"><SectionHeading icon={Users} title="Absensi manual & koreksi" subtitle="Guru dapat mencatat kehadiran dan mengoreksinya setelah sesi ditutup" right={<button className="btn light" onClick={()=>downloadAttendance('xlsx')}><Download size={16}/> Excel</button>}/><div className="face-table-toolbar"><label><Search size={17}/><input placeholder="Cari nama atau NISN..." value={query} onChange={e=>setQuery(e.target.value)}/></label><span>{records.length} siswa ditemukan</span></div><div className="face-table-wrap"><table className="face-table"><thead><tr><th>Siswa</th><th>NISN</th><th>Status</th><th>Metode</th><th>Ubah kehadiran</th></tr></thead><tbody>{records.map(s=>{const record=attendanceById[s.id];return <tr key={s.id}><td><div className="face-table-person"><span className="face-avatar">{s.name[0]}</span><b>{s.name}</b></div></td><td>{s.number}</td><td><StatusPill status={record?.status}/></td><td>{record?.source==='face'?'Face AI':record?.source==='manual'?'Manual':'—'}</td><td><select className="face-inline-select" aria-label={'Status kehadiran '+s.name} disabled={!chosenSession} value={record?.status||''} onChange={e=>{if(e.target.value)mark(s.id,e.target.value)}}><option value="">Pilih status...</option>{['Hadir','Terlambat','Izin','Sakit','Alpa'].map(x=><option key={x} value={x}>{x}</option>)}</select></td></tr>})}</tbody></table></div><div className="face-table-bottom"><span>Perubahan langsung tersimpan pada data demo dan rekap kehadiran.</span><div><button className="btn light" onClick={()=>downloadAttendance('pdf')}><Download size={16}/> PDF</button><button className="btn primary" onClick={()=>downloadAttendance('xlsx')}><Download size={16}/> Excel</button></div></div></section>}
    <div className="face-footnote"><ShieldCheck size={18}/><span><b>Catatan pengembangan:</b> Foto dan profil sekarang dapat tersimpan di server demo lokal serta dipakai pada perangkat berbeda yang terhubung ke server yang sama. Sistem biometrik ini tetap BELUM memiliki liveness/anti-spoof yang teruji dan belum siap untuk data anak sebenarnya. Izin wali, HTTPS, pengujian akurasi, kontrol akses yang kuat dan alternatif manual wajib tersedia.</span></div>
  </div>;
}
