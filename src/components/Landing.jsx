import React, {useState} from 'react';
import {ArrowRight, BookOpenCheck, Building2, CalendarCheck2, ChevronDown, CircleCheck, Gamepad2, GraduationCap, HeartHandshake, LayoutDashboard, Menu, Presentation, ShieldCheck, Sparkles, Users, Video, X, Zap} from 'lucide-react';

const ART='/art/';
const features=[
  {image:'feature-ppt.webp',title:'AI PowerPoint Generator',detail:'Rancang presentasi dan ringkasan dari modul pembelajaran.',tone:'lilac'},
  {image:'feature-game.webp',title:'Game Edukasi',detail:'Latihan interaktif, poin, badge, dan tantangan belajar.',tone:'blue'},
  {image:'feature-meeting.webp',title:'Meeting Inklusif',detail:'Ruang belajar daring, diskusi, dan dukungan caption.',tone:'ice'},
  {image:'feature-face.webp',title:'Absensi Wajah',detail:'Alur pendaftaran wajah, pemindaian, serta koreksi manual.',tone:'peach'},
  {image:'feature-analytics.webp',title:'Analitik Pembelajaran',detail:'Pantau kehadiran, nilai, perkembangan, dan kelas.',tone:'mint'},
  {image:'feature-accessible.webp',title:'Aksesibilitas',detail:'Desain ramah siswa dengan kebutuhan belajar beragam.',tone:'lilac'},
];
const roles=[
  {role:'admin',kicker:'Kelola dengan mudah',title:'Admin Sekolah',text:'Akun, kelas, kurikulum, laporan dan pengaturan sekolah.',image:'role-admin.webp',icon:Building2,tone:'teal'},
  {role:'teacher',kicker:'Mengajar lebih kreatif',title:'Guru',text:'Materi, tugas, game, absensi dan perkembangan siswa.',image:'role-teacher.webp',icon:Presentation,tone:'sky'},
  {role:'student',kicker:'Belajar lebih menyenangkan',title:'Siswa',text:'Kelas, materi, tantangan game, dan pencapaian pribadi.',image:'role-student.webp',icon:GraduationCap,tone:'violet'},
];
const steps=[
  {icon:Building2,title:'Siapkan sekolah',text:'Admin mengatur profil, tahun ajaran, dan kelas.'},
  {icon:Users,title:'Kelola pengguna',text:'Guru dan siswa mendapat akun dari sekolah.'},
  {icon:BookOpenCheck,title:'Mulai pembelajaran',text:'Guru membagikan materi, tugas, dan kuis.'},
  {icon:CalendarCheck2,title:'Pantau progres',text:'Kehadiran dan hasil belajar tersusun rapi.'}
];

export default function Landing({onEnter}){
  const [menuOpen,setMenuOpen]=useState(false);
  const start=(role='student')=>{setMenuOpen(false);onEnter(role)};
  return <div className="sekolahku-home" id="beranda">
    <a className="skip-link" href="#main-landing">Langsung ke konten</a>
    <header className="home-header">
      <a href="#beranda" aria-label="SekolahKu.id, kembali ke beranda" className="home-brand"><span className="home-brand-mark"><BookOpenCheck size={28}/></span><span><b>SekolahKu<span>.id</span></b><small>AI LEARN · SEKOLAH INKLUSIF</small></span></a>
      <nav className={menuOpen?'home-nav open':'home-nav'} aria-label="Navigasi halaman utama">
        <a href="#beranda" onClick={()=>setMenuOpen(false)}>Beranda</a>
        <a href="#fitur" onClick={()=>setMenuOpen(false)}>Fitur</a>
        <a href="#solusi" onClick={()=>setMenuOpen(false)}>Solusi</a>
        <a href="#alur" onClick={()=>setMenuOpen(false)}>Cara Kerja</a>
      </nav>
      <div className="home-actions"><button type="button" className="home-signin" onClick={()=>start('student')}>Masuk</button><button type="button" className="home-signup" onClick={()=>start('admin')}>Coba Dashboard <ArrowRight size={17}/></button></div>
      <button type="button" className="home-menu-toggle" aria-label={menuOpen?'Tutup menu':'Buka menu'} aria-expanded={menuOpen} onClick={()=>setMenuOpen(x=>!x)}>{menuOpen?<X/>:<Menu/>}</button>
    </header>
    <main id="main-landing">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="hero-glow hero-glow-one"/><div className="hero-glow hero-glow-two"/>
        <div className="home-hero-content"><span className="home-pill"><Sparkles size={15}/> E-LEARNING INKLUSIF BERBASIS AI</span>
          <h1 id="home-title">Belajar Tanpa Batas,<br/><span>Tumbuh Bersama</span></h1>
          <p>Sistem akademik dan e-learning inklusif yang mempertemukan sekolah, guru, serta siswa dalam satu pengalaman belajar yang seru dan mudah digunakan.</p>
          <div className="hero-buttons"><button className="home-white-btn" onClick={()=>start('student')}>Jelajahi Demo <ArrowRight size={19}/></button><a className="home-outline-btn" href="#fitur">Lihat Fitur <ChevronDown size={18}/></a></div>
          <div className="hero-trust"><span><CircleCheck size={16}/> Untuk semua siswa</span><span><CircleCheck size={16}/> 3 Dashboard Terpadu</span><span><CircleCheck size={16}/> Ramah aksesibilitas</span></div>
        </div>
        <div className="home-hero-art" aria-label="Ilustrasi kartun guru dan para siswa belajar bersama"><img src={ART+'hero-team.webp'} alt="Karakter kartun guru dan siswa belajar dengan laptop dan tablet, termasuk siswa pengguna kursi roda"/></div>
        <div className="hero-wave"/>
      </section>
      <div className="home-body">
        <section className="home-metrics" aria-label="Keunggulan rancangan SekolahKu.id">
          <div><span className="metric-emoji">🏫</span><b>3</b><small>Peran Pengguna</small></div>
          <div><span className="metric-emoji">📚</span><b>1</b><small>Sistem Terpadu</small></div>
          <div><span className="metric-emoji">🎮</span><b>9</b><small>Tema Game (Demo)</small></div>
          <div><span className="metric-emoji">🏆</span><b>XP</b><small>Poin & Pencapaian</small></div>
          <div><span className="metric-emoji">♿</span><b>AI</b><small>Fokus Aksesibilitas</small></div>
        </section>
        <section id="solusi" className="home-section" aria-labelledby="roles-heading"><div className="home-section-head"><span>UNTUK KOMUNITAS SEKOLAH</span><h2 id="roles-heading">Satu Platform untuk <em>Semua</em></h2><p>Setiap pengguna memiliki ruang kerja sendiri, dengan informasi yang tetap saling terhubung.</p></div>
          <div className="home-role-grid">{roles.map(r=><button className={'home-role-card '+r.tone} key={r.role} onClick={()=>start(r.role)}><img src={ART+r.image} alt="Ilustrasi kartun pengguna"/><div><span className="home-role-kicker">{r.kicker}</span><h3>{r.title}</h3><p>{r.text}</p><span className="home-role-link">Lihat Dashboard <ArrowRight size={16}/></span></div><span className="home-role-icon"><r.icon size={21}/></span></button>)}</div>
        </section>
        <section id="fitur" className="home-section" aria-labelledby="feature-heading"><div className="home-section-head"><span>RANCANGAN FITUR</span><h2 id="feature-heading">Belajar Lebih Cerdas, <em>Lebih Seru</em></h2><p>Perpaduan teknologi pembelajaran, gamifikasi, dan dukungan aksesibilitas.</p></div>
          <div className="home-feature-grid">{features.map(f=><article className="home-feature" key={f.title}><div className={'home-feature-image '+f.tone}><img src={ART+f.image} alt="" loading="lazy"/></div><h3>{f.title}</h3><p>{f.detail}</p></article>)}</div>
        </section>
        <section className="home-inclusive-banner"><div className="home-inclusive-icon">💜</div><div><span>PENDIDIKAN UNTUK SEMUA</span><h2>Setiap anak punya cara belajar yang istimewa.</h2><p>SekolahKu.id dirancang dengan perhatian pada kemudahan navigasi, pengaturan aksesibilitas, dan pilihan absensi manual sebagai alternatif pemindaian wajah.</p></div><button className="home-light-btn" onClick={()=>start('teacher')}>Eksplorasi Fitur Guru <ArrowRight size={18}/></button></section>
        <section id="alur" className="home-section home-workflow" aria-labelledby="workflow-title"><div className="home-section-head"><span>LANGKAH MUDAH</span><h2 id="workflow-title">Cara Kerja <em>SekolahKu.id</em></h2><p>Dari administrasi kelas hingga pengalaman belajar yang bermakna.</p></div>
          <div className="home-steps">{steps.map((s,i)=><div className="home-step" key={s.title}><span className="home-step-number">{i+1}</span><span className="home-step-icon"><s.icon size={36}/></span><h3>{s.title}</h3><p>{s.text}</p></div>)}</div>
        </section>
        <section className="home-final"><div><span><Sparkles size={16}/> MULAI BERSAMA SEKOLAHKU.ID</span><h2>Wujudkan pengalaman belajar yang lebih inklusif.</h2><p>Jelajahi dashboard Admin, Guru, atau Siswa pada versi demo React ini.</p></div><button onClick={()=>start('admin')}>Coba SekolahKu.id Sekarang <ArrowRight size={18}/></button><span className="home-final-emoji" aria-hidden="true">🎓</span></section>
      </div>
    </main>
    <footer className="home-footer"><div className="home-brand"><span className="home-brand-mark"><BookOpenCheck size={26}/></span><span><b>SekolahKu<span>.id</span></b><small>AI LEARN</small></span></div><p>© 2026 SekolahKu.id · Pendidikan inklusif untuk semua.</p><small>Prototipe React: ruang meeting sudah terintegrasi; AI BISINDO dan pembayaran masih dalam pengembangan.</small></footer>
  </div>;
}
