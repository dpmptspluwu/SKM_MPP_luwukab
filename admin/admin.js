const scriptURL = 'https://script.google.com/macros/s/AKfycbzF4rwH5n9TZPdj_Li56nOSqs8YROXTiTeU3oxA934Fyk1H46ZJEIZmBalvIc2dQ0jA/exec';
const TOKEN_KEY = 'admin_token';

let dataGlobal = [];
let dataTampil = [];
let chartInstance = null;
let chartBulanan = null;
let chartGerai = null;
let percobaanGagal = 0; 
let waktuTerkunci = false; 

const namaUnsur = [
    "Kesesuaian persyaratan pelayanan",
    "Kemudahan prosedur pelayanan",
    "Kecepatan waktu pelayanan",
    "Kewajaran biaya/tarif",
    "Kesesuaian produk pelayanan",
    "Kompetensi petugas pelayanan",
    "Perilaku, kesopanan, keramahan petugas",
    "Kualitas sarana dan prasarana",
    "Penanganan pengaduan pengguna layanan"
];

function getToken() { return localStorage.getItem(TOKEN_KEY); }
function setToken(token) { localStorage.setItem(TOKEN_KEY, token); }
function hapusToken() { localStorage.removeItem(TOKEN_KEY); }
function tampilkanLogin() { const el = document.getElementById('login-overlay'); if (el) el.style.display = 'flex'; }
function sembunyikanLogin() { const el = document.getElementById('login-overlay'); if (el) el.style.display = 'none'; }

document.addEventListener('DOMContentLoaded', function() {
    const toggleBtn = document.getElementById('toggle-password');
    const pwInput = document.getElementById('login-password');
    const eyeOff = document.getElementById('eye-off');
    const eyeOn = document.getElementById('eye-on');

    if (toggleBtn && pwInput) {
        toggleBtn.addEventListener('click', () => {
            if (pwInput.type === 'password') {
                pwInput.type = 'text';
                eyeOff.style.display = 'none';
                eyeOn.style.display = 'block';
            } else {
                pwInput.type = 'password';
                eyeOff.style.display = 'block';
                eyeOn.style.display = 'none';
            }
        });
    }

    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) loginBtn.addEventListener('click', cobaLogin);
    if (pwInput) pwInput.addEventListener('keypress', e => { if (e.key === 'Enter') cobaLogin(); });

    document.querySelectorAll('.nav-item[data-tab]').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            pindahTab(this.getAttribute('data-tab'), this);
        });
    });

    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) btnLogout.addEventListener('click', logout);

    if (getToken()) {
        sembunyikanLogin();
        tarikDataServer();
    } else {
        tampilkanLogin();
    }

    isiPilihanTahunLaporan();
    setTanggalTTD();
});

function pindahTab(tab, el) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    const target = document.getElementById('tab-' + tab);
    if (target) target.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if (el) el.classList.add('active');
    if (tab === 'laporan') loadDataLaporan();
}

function logout() {
    hapusToken();
    tampilkanLogin();
    dataGlobal = [];
    dataTampil = [];
    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
    if (chartBulanan) { chartBulanan.destroy(); chartBulanan = null; }
    if (chartGerai) { chartGerai.destroy(); chartGerai = null; }
    const content = document.getElementById('dashboard-content');
    if (content) content.style.display = 'none';
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'flex';
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    const tabDashboard = document.getElementById('tab-dashboard');
    if (tabDashboard) tabDashboard.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navDashboard = document.querySelector('.nav-item[data-tab="dashboard"]');
    if (navDashboard) navDashboard.classList.add('active');
}

// [DOKUMENTASI KODE]
// Fungsi Login yang ditingkatkan dengan standar Enterprise:
// 1. Loading State (Mencegah klik ganda)
// 2. Anti-Spam/Brute Force (Mengunci sistem setelah 3x gagal)
// 3. UX Halus (Mengosongkan input jika salah)
async function cobaLogin() {
    // Jika sistem sedang menghukum/mengunci pengguna, hentikan aksi
    if (waktuTerkunci) return; 

    const pwInput = document.getElementById('login-password');
    const errorEl = document.getElementById('login-error');
    const loginBtn = document.getElementById('login-btn');

    if (!pwInput || !errorEl || !loginBtn) return;
    const pw = pwInput.value.trim();

    // Validasi kosong
    if (!pw) {
        errorEl.textContent = 'Silakan masukkan kata sandi Anda.';
        errorEl.style.display = 'block';
        pwInput.focus();
        return;
    }

    // --- MULAI EFEK LOADING ---
    errorEl.style.display = 'none';
    const teksAsli = loginBtn.innerText;
    loginBtn.innerText = 'Memverifikasi...';
    loginBtn.style.opacity = '0.7';
    loginBtn.style.cursor = 'wait';
    loginBtn.disabled = true;
    pwInput.disabled = true;

    try {
        const res = await fetch(scriptURL + '?action=login', {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ password: pw })
        });
        const data = await res.json();

        if (data.status === 'sukses' && data.token) {
            // LOGIN BERHASIL
            percobaanGagal = 0; // Reset hitungan kegagalan
            pwInput.value = ''; // Bersihkan kolom sandi
            setToken(data.token);
            sembunyikanLogin();
            tarikDataServer();
        } else {
            // LOGIN GAGAL
            percobaanGagal++;
            pwInput.value = ''; // Kosongkan input otomatis
            
            if (percobaanGagal >= 3) {
                // HUKUMAN: Kunci sistem jika gagal 3x
                kunciSistemLogin(errorEl, loginBtn, pwInput);
            } else {
                errorEl.textContent = (data.pesan || 'Kata sandi salah.') + ` (Sisa percobaan: ${3 - percobaanGagal})`;
                errorEl.style.display = 'block';
                pwInput.focus(); // Kembalikan kursor ke input
            }
        }
    } catch (e) {
        errorEl.textContent = 'Gagal terhubung ke server keamanan. Periksa koneksi internet Anda.';
        errorEl.style.display = 'block';
    } finally {
        // --- SELESAI EFEK LOADING ---
        if (!waktuTerkunci) {
            loginBtn.innerText = teksAsli;
            loginBtn.style.opacity = '1';
            loginBtn.style.cursor = 'pointer';
            loginBtn.disabled = false;
            pwInput.disabled = false;
        }
    }
}

// [DOKUMENTASI KODE]
// Fungsi khusus untuk mengunci halaman login (Timer Hitung Mundur)
function kunciSistemLogin(errorEl, loginBtn, pwInput) {
    waktuTerkunci = true;
    let sisaWaktu = 30; // Lama waktu penguncian dalam detik (Bisa Bos ubah)
    
    // Matikan tombol dan input
    pwInput.disabled = true;
    loginBtn.disabled = true;
    loginBtn.style.opacity = '0.5';
    loginBtn.style.cursor = 'not-allowed';
    
    // Jalankan timer mundur setiap 1 detik (1000 milidetik)
    const hitungMundur = setInterval(() => {
        errorEl.innerHTML = `⚠️ <b>Akses Dibekukan Sementara</b><br>Terlalu banyak percobaan gagal. Silakan coba lagi dalam <b>${sisaWaktu} detik</b>.`;
        errorEl.style.display = 'block';
        errorEl.style.color = '#B91C1C'; // Warna merah tegas
        sisaWaktu--;
        
        // Jika waktu habis, buka kembali kuncinya
        if (sisaWaktu < 0) {
            clearInterval(hitungMundur);
            waktuTerkunci = false;
            percobaanGagal = 0; // Reset kesempatan
            
            // Nyalakan kembali tampilan
            pwInput.disabled = false;
            loginBtn.disabled = false;
            loginBtn.innerText = 'Masuk';
            loginBtn.style.opacity = '1';
            loginBtn.style.cursor = 'pointer';
            errorEl.style.display = 'none';
            pwInput.focus();
        }
    }, 1000);
}

// [DOKUMENTASI KODE]
// Fungsi ini bertugas mengubah teks tanggal dari server menjadi objek Date JavaScript.
// Pembaruan: Menambahkan penanganan otomatis format Date bawaan JS/ISO 8601.
function parseTanggal(str) {
    if (!str) return new Date(NaN);

    // 1. Coba baca menggunakan pembacaan bawaan JavaScript (Solusi untuk format Google Sheets)
    const jsDate = new Date(str);
    if (!isNaN(jsDate.getTime())) {
        return jsDate;
    }

    // 2. Fallback untuk format manual: "yyyy-MM-dd HH:mm:ss"
    const regexISO = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;
    const matchISO = String(str).match(regexISO);
    if (matchISO) {
        const [, tahun, bulan, tanggal, jam, menit, detik] = matchISO;
        return new Date(parseInt(tahun, 10), parseInt(bulan, 10) - 1, parseInt(tanggal, 10), parseInt(jam, 10), parseInt(menit, 10), parseInt(detik, 10));
    }

    // 3. Fallback untuk format tanggal tanpa jam: "yyyy-MM-dd"
    const regexISODate = /^(\d{4})-(\d{2})-(\d{2})$/;
    const matchISODate = String(str).match(regexISODate);
    if (matchISODate) {
        const [, tahun, bulan, tanggal] = matchISODate;
        return new Date(parseInt(tahun, 10), parseInt(bulan, 10) - 1, parseInt(tanggal, 10));
    }

    // 4. Fallback terakhir untuk format lama: "dd/MM/yyyy HH:mm:ss"
    const parts = String(str).split(' ');
    if (parts.length >= 1) {
        const dp = parts[0].split('/');
        const tp = (parts[1] || '00:00:00').split(':');
        if (dp.length === 3) {
            return new Date(parseInt(dp[2], 10), parseInt(dp[1], 10) - 1, parseInt(dp[0], 10), parseInt(tp[0], 10) || 0, parseInt(tp[1], 10) || 0, parseInt(tp[2], 10) || 0);
        }
    }

    // Jika semua format gagal, kembalikan status tidak valid
    return new Date(NaN);
}

function tarikDataServer() {
    if (window.location.protocol === 'file:') {
        const loader = document.getElementById('loader');
        if (loader) loader.innerHTML = '<div style="text-align:center;color:#B91C1C;"><p>Akses Ditolak</p></div>';
        return;
    }
    const token = getToken();
    if (!token) { hapusToken(); tampilkanLogin(); return; }
    fetch(scriptURL + '?action=data&token=' + encodeURIComponent(token))
        .then(r => r.json())
        .then(d => {
            if (d.status === 'sukses') {
                dataGlobal = d.data;
                dataTampil = [...dataGlobal];
                prosesDataDanRender();
            } else if (d.status === 'unauthorized') {
                hapusToken();
                tampilkanLogin();
            } else {
                alert('Gagal membaca data dari server.');
            }
        })
        .catch(() => alert('Kesalahan jaringan.'));
}

function formatTanggalWaktu(s) {
    if (!s) return '-';
    const d = parseTanggal(s);
    if (isNaN(d.getTime())) return s;
    const p = n => String(n).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function hitungIndeks(arr) {
    const clean = arr.filter(n => !isNaN(n) && n > 0);
    if (clean.length === 0) return 0;
    return (clean.reduce((a, b) => a + b, 0) / clean.length) * 25; 
}

function evaluasiMutu(n) {
    if (n >= 88.31) return { mutu: 'A', teks: 'Sangat Baik', warna: '#047857', bg: '#D1FAE5', warnaTeks: '#047857', warnaLatar: '#D1FAE5' };
    if (n >= 76.61) return { mutu: 'B', teks: 'Baik', warna: '#1D4ED8', bg: '#DBEAFE', warnaTeks: '#1D4ED8', warnaLatar: '#DBEAFE' };
    if (n >= 65.00) return { mutu: 'C', teks: 'Kurang Baik', warna: '#B45309', bg: '#FEF3C7', warnaTeks: '#B45309', warnaLatar: '#FEF3C7' };
    if (n > 0) return { mutu: 'D', teks: 'Tidak Baik', warna: '#B91C1C', bg: '#FEE2E2', warnaTeks: '#B91C1C', warnaLatar: '#FEE2E2' };
    return { mutu: '-', teks: 'Tidak Valid', warna: '#475569', bg: '#F1F5F9', warnaTeks: '#475569', warnaLatar: '#F1F5F9' };
}

function amanDariXSS(s) {
    if (!s) return '-';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function prosesDataDanRender() {
    const loader = document.getElementById('loader');
    const content = document.getElementById('dashboard-content');
    if (loader) loader.style.display = 'none';
    if (content) content.style.display = 'block';

    let totalA = 0;
    const geraiM = {}; 
    const accordionContainer = document.getElementById('accordion-data-container');
    const tfoot = document.getElementById('table-footer');
    
    if (!accordionContainer || !tfoot) return;
    accordionContainer.innerHTML = ''; // Kosongkan wadah sebelumnya

    // Langkah 1: Kelompokkan data per Gerai
    dataTampil.forEach((r, i) => {
        const arr = r['Nilai SKM'] ? String(r['Nilai SKM']).split(',').map(Number) : [];
        const idx = hitungIndeks(arr);
        totalA += idx;
        
        const lay = amanDariXSS(r['Layanan'] || 'Tidak Diketahui');
        
        // Buat rumah (array) baru jika gerai ini belum ada di memori
        if (!geraiM[lay]) {
            geraiM[lay] = { t: 0, c: 0, rows: [] };
        }
        
        if (!isNaN(idx) && idx > 0) { 
            geraiM[lay].t += idx; 
            geraiM[lay].c++; 
        }
        
        const p = evaluasiMutu(idx);
        // Simpan baris tabel ke dalam rumah gerai masing-masing
        geraiM[lay].rows.push(`
            <tr>
                <td style="text-align:center;font-weight:700;color:#6B7280;">${i+1}</td>
                <td>${formatTanggalWaktu(r['Tanggal'])}</td>
                <td>${amanDariXSS(r['Nama'])}<br><span style="font-size:12px;color:#64748B;">${amanDariXSS(r['Pekerjaan'])}</span></td>
                <td style="text-align:center;font-weight:800;">${idx.toFixed(2)}</td>
                <td style="text-align:center;"><span style="background:${p.warnaLatar};color:${p.warnaTeks};padding:6px 12px;border-radius:8px;font-weight:800;font-size:12px;">${p.mutu} - ${p.teks}</span></td>
                <td class="saran-cell">${amanDariXSS(r['Saran'])}</td>
            </tr>
        `);
    });

    // Langkah 2: Rakit Tombol dan Tabel berdasarkan Kelompok Gerai
    for (const [namaGerai, dataGerai] of Object.entries(geraiM)) {
        if (dataGerai.rows.length === 0) continue;
        
        const rataGerai = dataGerai.c > 0 ? (dataGerai.t / dataGerai.c) : 0;
        const mutuGerai = evaluasiMutu(rataGerai);
        
        // Buat pembungkus utama
        const itemDiv = document.createElement('div');
        itemDiv.className = 'accordion-item';
        
        // Buat tombol header yang bisa diklik
        const btnHeader = document.createElement('button');
        btnHeader.className = 'accordion-header';
        btnHeader.innerHTML = `
            <div style="display:flex; align-items:center;">
                ${namaGerai} <span class="badge-count">${dataGerai.rows.length} Responden</span>
            </div>
            <div style="font-size: 13px; font-weight: 500;">
                Rata-rata: <strong style="font-size: 15px;">${rataGerai.toFixed(2)}</strong> (${mutuGerai.teks})
            </div>
        `;
        
        // Buat wadah isi tabel yang tersembunyi
        const contentDiv = document.createElement('div');
        contentDiv.className = 'accordion-content';
        contentDiv.innerHTML = `
            <div class="table-wrapper" style="border:none; box-shadow:none; border-radius:0;">
                <table class="premium-table">
                    <thead>
                        <tr>
                            <th style="width:60px;text-align:center;">No.</th>
                            <th>Tanggal Waktu</th>
                            <th>Informasi Pemohon</th>
                            <th style="text-align:center;">Nilai</th>
                            <th style="text-align:center;">Mutu Pelayanan</th>
                            <th>Saran & Masukan</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${dataGerai.rows.join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        // Logika saat tombol diklik (Buka/Tutup)
        btnHeader.addEventListener('click', function() {
            this.classList.toggle('active');
        });
        
        itemDiv.appendChild(btnHeader);
        itemDiv.appendChild(contentDiv);
        accordionContainer.appendChild(itemDiv);
    }

    // Langkah 3: Hitung dan tampilkan Rata-rata Keseluruhan di tabel bawah
    const totalR = dataTampil.length;
    const elTotal = document.getElementById('kpi-total');
    const elIkm = document.getElementById('kpi-indeks');
    if (elTotal) elTotal.innerText = totalR;
    const ig = totalR > 0 ? totalA / totalR : 0;
    if (elIkm) elIkm.innerText = ig.toFixed(2);
    
    const pg = evaluasiMutu(ig);
    tfoot.innerHTML = `
        <tr style="background:#F8FAFC; border-top:2px solid #E2E8F0;">
            <td colspan="3" style="text-align:right;font-weight:800;color:#0F172A;">RATA-RATA KESELURUHAN MPP LUWU:</td>
            <td style="text-align:center;font-weight:800;font-size:18px;color:#1E40AF;">${ig.toFixed(2)}</td>
            <td style="text-align:center;color:${pg.warnaTeks};font-weight:800;">${pg.mutu} - ${pg.teks}</td>
            <td></td>
        </tr>
    `;

    // Langkah 4: Pembaruan Grafik 
    let gb = '-', sm = 0;
    const labels = [], dataChart = [], jumlah = [];
    for (const [g, d] of Object.entries(geraiM)) {
        if (d.c > 0) {
            const rata = d.t / d.c;
            labels.push(g); dataChart.push(rata.toFixed(2)); jumlah.push(d.c);
            if (rata > sm) { sm = rata; gb = g; }
        }
    }
    const elTerbaik = document.getElementById('kpi-terbaik');
    if (elTerbaik) elTerbaik.innerText = gb;
    renderGrafik(labels, dataChart, jumlah);
}

function renderGrafik(l, d, j) {
    const canvas = document.getElementById('skmChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: { labels: l, datasets: [{ label: 'Indeks SKM', data: d, backgroundColor: '#3b82f6', borderRadius: 6, barThickness: 40 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { tooltip: { callbacks: { afterLabel: ctx => 'Berdasarkan: ' + j[ctx.dataIndex] + ' Responden' } } }, scales: { y: { beginAtZero: true, max: 100 } } }
    });
}

function terapkanFilter() {
    const m = document.getElementById('tgl-mulai'), s = document.getElementById('tgl-selesai');
    if (!m || !s) return;
    const tglMulai = m.value, tglSelesai = s.value;
    if (!tglMulai || !tglSelesai) { alert('Pilih tanggal mulai dan selesai.'); return; }
    const dm = new Date(tglMulai); dm.setHours(0,0,0,0);
    const ds = new Date(tglSelesai); ds.setHours(23,59,59,999);
    dataTampil = dataGlobal.filter(r => { const t = parseTanggal(r['Tanggal']); return t >= dm && t <= ds; });
    prosesDataDanRender();
}

function resetFilter() {
    const m = document.getElementById('tgl-mulai'), s = document.getElementById('tgl-selesai');
    if (m) m.value = '';
    if (s) s.value = '';
    dataTampil = [...dataGlobal];
    prosesDataDanRender();
}

function eksporKeExcel() {
    if (!dataTampil.length) { alert('Tidak ada data untuk diekspor.'); return; }
    
    // 1. Memetakan data seragam tanpa Nama Pemohon
    const dataExcel = dataTampil.map((r, i) => {
        const arr = r['Nilai SKM'] ? String(r['Nilai SKM']).split(',').map(Number) : [];
        const idx = hitungIndeks(arr);
        const p = evaluasiMutu(idx);
        return {
            "No": i + 1,
            "Tanggal": formatTanggalWaktu(r['Tanggal']),
            "Instansi / Gerai": r['Layanan'] || '-',
            "Nilai Indeks": idx.toFixed(2),
            "Mutu Pelayanan": p.mutu + ' - ' + p.teks,
            "Saran & Masukan": r['Saran'] || '-'
        };
    });
    
    // 2. Mengekspor ke format Excel
    const ws = XLSX.utils.json_to_sheet(dataExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data SKM');
    XLSX.writeFile(wb, 'Laporan_Rekap_SKM_MPP_Luwu.xlsx');
}

function eksporKePDF() {
    if (!dataTampil.length) { alert('Tidak ada data untuk dicetak.'); return; }

    // 1. Buat elemen sementara yang tersembunyi untuk format cetak resmi
    const tempDiv = document.createElement('div');
    tempDiv.style.padding = '20px';
    tempDiv.style.background = '#ffffff';
    tempDiv.style.color = '#000000';
    tempDiv.style.fontFamily = 'Arial, sans-serif';
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px'; // Disembunyikan dari layar pengguna
    document.body.appendChild(tempDiv);

    // 2. Rancang HTML tabel dengan gaya padat (hitam putih, tanpa warna latar)
    let html = `
        <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px;">
            <h2 style="margin: 0; font-size: 16px; text-transform: uppercase;">Laporan Rekapitulasi Survei Kepuasan Masyarakat</h2>
            <h3 style="margin: 5px 0 0; font-size: 13px; font-weight: normal;">Mal Pelayanan Publik (MPP) Kabupaten Luwu</h3>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead>
                <tr style="background-color: #f2f2f2;">
                    <th style="border: 1px solid #000; padding: 6px; text-align: center; width: 5%;">No.</th>
                    <th style="border: 1px solid #000; padding: 6px; text-align: center; width: 15%;">Tanggal</th>
                    <th style="border: 1px solid #000; padding: 6px; text-align: center; width: 25%;">Instansi / Gerai</th>
                    <th style="border: 1px solid #000; padding: 6px; text-align: center; width: 10%;">Nilai</th>
                    <th style="border: 1px solid #000; padding: 6px; text-align: center; width: 15%;">Mutu Pelayanan</th>
                    <th style="border: 1px solid #000; padding: 6px; text-align: center; width: 30%;">Saran & Masukan</th>
                </tr>
            </thead>
            <tbody>
    `;

    // 3. Masukkan data ke dalam tabel cetak
    dataTampil.forEach((r, i) => {
        const arr = r['Nilai SKM'] ? String(r['Nilai SKM']).split(',').map(Number) : [];
        const idx = hitungIndeks(arr);
        const p = evaluasiMutu(idx);
        const tgl = formatTanggalWaktu(r['Tanggal']);
        const lay = amanDariXSS(r['Layanan'] || '-');
        const saran = amanDariXSS(r['Saran'] || '-');

        html += `
            <tr>
                <td style="border: 1px solid #000; padding: 5px; text-align: center;">${i + 1}</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: center;">${tgl}</td>
                <td style="border: 1px solid #000; padding: 5px;">${lay}</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: center; font-weight: bold;">${idx.toFixed(2)}</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: center;">${p.mutu} - ${p.teks}</td>
                <td style="border: 1px solid #000; padding: 5px;">${saran}</td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    tempDiv.innerHTML = html;

    // 4. Konversi ke PDF dengan mode landscape agar tabel padat ini muat
    html2pdf().from(tempDiv).set({
        margin: 10,
        filename: 'Laporan_Rekap_SKM_MPP_Luwu.pdf',
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { scale: 2, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' } 
    }).save().then(() => {
        // Hapus elemen pembantu setelah proses unduh selesai
        document.body.removeChild(tempDiv);
    });
}

function isiPilihanTahunLaporan() {
    const select = document.getElementById('pilih-tahun-laporan');
    if (!select) return;
    const currentYear = new Date().getFullYear();
    select.innerHTML = '<option value="">Pilih Tahun</option>';
    for (let t = 2026; t <= currentYear; t++) {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = 'Tahun ' + t;
        select.appendChild(opt);
    }
    select.value = currentYear;
}

function setTanggalTTD() {
    const now = new Date();
    const bulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    const el = document.getElementById('lp-tgl-ttd');
    if (el) el.innerText = now.getDate() + ' ' + bulan[now.getMonth()] + ' ' + now.getFullYear();
}

function loadDataLaporan() {
    const select = document.getElementById('pilih-tahun-laporan');
    if (!select) return;
    const tahun = parseInt(select.value);

    // Pastikan pengguna sudah memilih tahun di dropdown
    if (isNaN(tahun)) {
        alert('Silakan pilih tahun terlebih dahulu.');
        return;
    }

    const tbody = document.getElementById('lp-unsur-body');
    
    // Periksa apakah data sudah ditarik dari server saat proses Login
    if (dataGlobal && dataGlobal.length > 0) {
        // Langsung tampilkan laporan berdasarkan memori, sangat cepat!
        renderLaporan(dataGlobal, tahun);
    } else {
        // Jika datanya benar-benar kosong di database
        if (tbody) {
            document.getElementById('lp-total').innerText = '0';
            document.getElementById('lp-ikm').innerText = '0.00';
            document.getElementById('lp-gerai').innerText = '-';
            
            const badge = document.getElementById('lp-badge');
            if (badge) {
                badge.innerText = '-';
                badge.style.background = '#F1F5F9';
                badge.style.color = '#475569';
            }
            
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:#6B7280;">Belum ada data survei untuk tahun ' + tahun + '.</td></tr>';
        }
    }
}

function renderLaporan(data, tahun) {
    const filtered = data.filter(r => { const t = parseTanggal(r['Tanggal']); return !isNaN(t) && t.getFullYear() === tahun; });
    if (!filtered.length) {
    document.getElementById('lp-total').innerText = '0';
    document.getElementById('lp-ikm').innerText = '0.00';
    const badge = document.getElementById('lp-badge');
    badge.innerText = '-';
    badge.style.background = '#F1F5F9';
    badge.style.color = '#475569';
    document.getElementById('lp-gerai').innerText = '-';
    document.getElementById('lp-unsur-body').innerHTML =
        '<tr><td colspan="4" style="text-align:center;padding:20px;">Belum ada data survei untuk tahun ' + tahun + '.</td></tr>';
    return;
}
    let totalI = 0;
    const perBulan = Array(12).fill().map(() => ({ total: 0, count: 0 }));
    const perGerai = {};
    const perUnsur = Array(9).fill().map(() => []);
    filtered.forEach(r => {
        const arr = r['Nilai SKM'] ? String(r['Nilai SKM']).split(',').map(Number) : [];
        const idx = hitungIndeks(arr);
        totalI += idx;
        const tgl = parseTanggal(r['Tanggal']);
        if (!isNaN(tgl)) { const bln = tgl.getMonth(); perBulan[bln].total += idx; perBulan[bln].count++; }
        const gr = r['Layanan'] || 'Tidak Diketahui';
        if (!perGerai[gr]) perGerai[gr] = { total: 0, count: 0 };
        perGerai[gr].total += idx; perGerai[gr].count++;
        arr.forEach((v, i) => { if (i < 9 && !isNaN(v) && v > 0) perUnsur[i].push(v); });
    });
    const totalR = filtered.length, ikm = totalI / totalR, mutu = evaluasiMutu(ikm);
    document.getElementById('lp-total').innerText = totalR;
    document.getElementById('lp-ikm').innerText = ikm.toFixed(2);
    const badge = document.getElementById('lp-badge');
    badge.innerText = mutu.mutu + ' - ' + mutu.teks;
    badge.style.background = mutu.bg; badge.style.color = mutu.warna;
    let gb = '-', sm = 0;
    for (const [g, d] of Object.entries(perGerai)) { const rata = d.total / d.count; if (rata > sm) { sm = rata; gb = g; } }
    document.getElementById('lp-gerai').innerText = gb;
    renderChartBulanan(perBulan);
    renderChartGerai(perGerai);
    renderUnsur(perUnsur);
}

function renderChartBulanan(data) {
    const canvas = document.getElementById('chartBulanan');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (chartBulanan) chartBulanan.destroy();
    chartBulanan = new Chart(ctx, {
        type: 'bar',
        data: { labels: ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'], datasets: [{ data: data.map(b => b.count ? (b.total / b.count).toFixed(2) : 0), backgroundColor: '#3b82f6', borderRadius: 8 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100 } } }
    });
}

function renderChartGerai(data) {
    const canvas = document.getElementById('chartGerai');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (chartGerai) chartGerai.destroy();
    const labels = [], values = [];
    for (const [g, d] of Object.entries(data)) { labels.push(g.length > 25 ? g.substring(0, 25) + '...' : g); values.push((d.total / d.count).toFixed(2)); }
    chartGerai = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets: [{ data: values, backgroundColor: '#10b981', borderRadius: 6 }] },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, max: 100 } } }
    });
}

function renderUnsur(data) {
    const tbody = document.getElementById('lp-unsur-body'), tfoot = document.getElementById('lp-unsur-footer');
    if (!tbody || !tfoot) return;
    tbody.innerHTML = '';
    let total = 0, count = 0;
    data.forEach((arr, i) => {
        if (arr.length) {
            const rata = arr.reduce((a, b) => a + b, 0) / arr.length, indeks = rata * 25, m = evaluasiMutu(indeks);
            tbody.innerHTML += `<tr><td>${i + 1}</td><td style="text-align:left;">${namaUnsur[i]}</td><td class="nilai">${indeks.toFixed(2)}</td><td class="nilai" style="color:${m.warna}">${m.teks}</td></tr>`;
            total += indeks; count++;
        } else {
            tbody.innerHTML += `<tr><td>${i + 1}</td><td style="text-align:left;">${namaUnsur[i]}</td><td>-</td><td>-</td></tr>`;
        }
    });
    const rataU = count ? total / count : 0, mU = evaluasiMutu(rataU);
    tfoot.innerHTML = `<tr style="background:#EFF6FF;"><td colspan="2" style="text-align:right;">RATA-RATA</td><td class="nilai">${rataU.toFixed(2)}</td><td class="nilai" style="color:${mU.warna}">${mU.teks}</td></tr>`;
}

function cetakPDFLaporan() {
    const el = document.getElementById('tab-laporan');
    if (!el) return;
    const clone = el.cloneNode(true);
    clone.querySelectorAll('.no-print').forEach(n => n.remove());
    clone.style.padding = '20px';
    html2pdf().from(clone).set({
        margin: 5,
        filename: 'Laporan_Tahunan_SKM_MPP_Luwu.pdf',
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { scale: 2, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).save();
}
