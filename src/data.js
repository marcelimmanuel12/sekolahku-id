export const seed = {
 school: {name:'SLB Harapan Bangsa',address:'Jl. Pendidikan No. 12, Jakarta',email:'admin@harapan.sch.id',phone:'021-555-0142',theme:'Ungu SekolahKu.id',year:'2026/2027',semester:'Ganjil',logo:''},
 users:[
  {id:'u1',name:'Admin Sekolah',number:'ADM001',role:'admin',password:'Admin123!',active:true,email:'admin@harapan.sch.id'},
  {id:'u2',name:'Ibu Ratna Puspita',number:'19850102001',role:'teacher',password:'Guru123!',active:true,email:'ratna@harapan.sch.id',subject:'Matematika'},
  {id:'u3',name:'Pak Budi Santoso',number:'19870315002',role:'teacher',password:'Guru123!',active:true,email:'budi@harapan.sch.id',subject:'Bahasa Indonesia'},
  {id:'u4',name:'Alya Putri',number:'0098765432',role:'student',password:'Siswa123!',active:true,classId:'c1',need:'Tunarungu'},
  {id:'u5',name:'Rafi Pratama',number:'0098765433',role:'student',password:'Siswa123!',active:true,classId:'c1',need:'Umum'},
  {id:'u6',name:'Nadia Salsabila',number:'0098765434',role:'student',password:'Siswa123!',active:true,classId:'c1',need:'Tunanetra'},
  {id:'u7',name:'Dimas Saputra',number:'0098765435',role:'student',password:'Siswa123!',active:true,classId:'c2',need:'Umum'}
 ],
 classes:[{id:'c1',name:'VII A',grade:'VII',teacherId:'u2',subject:'Matematika',schedule:'Senin, 08.00–09.30'}, {id:'c2',name:'VIII A',grade:'VIII',teacherId:'u3',subject:'Bahasa Indonesia',schedule:'Selasa, 09.00–10.30'}],
 subjects:[{id:'s1',name:'Matematika',grade:'VII'},{id:'s2',name:'Bahasa Indonesia',grade:'VIII'},{id:'s3',name:'IPA',grade:'VII'}],
 materials:[{id:'m1',title:'Bilangan Bulat dan Operasinya',classId:'c1',subject:'Matematika',description:'Mengenal bilangan positif, negatif, penjumlahan, dan pengurangan.',authorId:'u2',date:'2026-11-01',content:'Bilangan bulat terdiri dari bilangan negatif, nol, dan bilangan positif. Contoh: -3, -2, -1, 0, 1, 2, 3.',fileName:''},{id:'m2',title:'Mengenal Teks Deskripsi',classId:'c2',subject:'Bahasa Indonesia',description:'Mengidentifikasi ciri dan struktur teks deskripsi.',authorId:'u3',date:'2026-11-02',content:'Teks deskripsi menggambarkan objek, tempat, atau suasana dengan terperinci.',fileName:''}],
 quizzes:[{id:'q1',title:'Latihan Bilangan Bulat',classId:'c1',subject:'Matematika',mode:'Pilihan Jalur',difficulty:'Mudah',duration:10,points:100,questions:[{text:'Berapakah hasil -3 + 8?',options:['3','5','-5','11'],correct:1},{text:'Bilangan yang lebih kecil dari 0 adalah...',options:['Bilangan positif','Bilangan negatif','Bilangan prima','Bilangan genap'],correct:1},{text:'Hasil 6 - 9 adalah...',options:['-3','3','15','-15'],correct:0}]}],
 assignments:[{id:'a1',title:'Latihan operasi penjumlahan',classId:'c1',due:'2026-11-20',description:'Kerjakan soal pada modul halaman 12.',createdBy:'u2'}],
 attendance:[{id:'at1',studentId:'u4',classId:'c1',date:'2026-11-03',status:'Hadir'},{id:'at2',studentId:'u5',classId:'c1',date:'2026-11-03',status:'Hadir'},{id:'at3',studentId:'u6',classId:'c1',date:'2026-11-03',status:'Izin'}],
 sessions:[], faceProfiles:[], results:[{id:'r1',quizId:'q1',studentId:'u4',score:100,correct:3,total:3,seconds:87,date:'2026-11-03'},{id:'r2',quizId:'q1',studentId:'u5',score:67,correct:2,total:3,seconds:110,date:'2026-11-03'}],
 meetings:[],
 notifications:[{id:'n1',text:'Selamat datang di SekolahKu.id! Semua akun terhubung dalam satu sistem.',date:'2026-11-05'}],
 transactions:[{id:'TRX-001',date:'2026-11-01',name:'SekolahKu.id SMP',amount:3800000,status:'Demo — belum dibayar'}],
 access:{teacherCreateClass:false,teacherEditStudents:false}, activity:[]
};
export const menus = {
 admin:[['dashboard','Dashboard','LayoutDashboard'],['users','Manajemen Pengguna','Users'],['academic','Akademik','GraduationCap'],['materials','Materi & Kurikulum','BookOpen'],['monitor','Monitoring','Activity'],['analytics','Analitik','ChartColumnIncreasing'],['reports','Laporan','FileBarChart'],['subscription','Subscription','CreditCard'],['settings','Pengaturan','Settings']],
 teacher:[['dashboard','Dashboard','LayoutDashboard'],['classes','Kelas Saya','School'],['materials','Materi & Modul','BookOpen'],['ppt','AI PowerPoint','Presentation'],['quiz','Game & Kuis','Gamepad2'],['tasks','Tugas','ClipboardList'],['attendance','Absensi','CalendarCheck'],['meeting','Meeting','Video'],['grades','Nilai & Analitik','ChartColumnIncreasing'],['assistant','AI Assistant','Sparkles']],
 student:[['dashboard','Dashboard','LayoutDashboard'],['classes','Kelas Saya','School'],['materials','Materi Belajar','BookOpen'],['attendance','Absensi','CalendarCheck'],['quiz','Game Edukasi','Gamepad2'],['tasks','Tugas & Ujian','ClipboardList'],['meeting','Meeting','Video'],['grades','Progres & Nilai','ChartColumnIncreasing'],['assistant','AI Chatbot','MessageCircle'],['vision','AI Camera Vision','ScanFace'],['profile','Profil','UserRound']]
};
export const gameModes=['Pilihan Jalur','Puzzle Challenge','Matching Card','Drag & Drop','Tebak Gambar','Memory Game','Word Search','Adventure Quiz','Level Challenge'];
