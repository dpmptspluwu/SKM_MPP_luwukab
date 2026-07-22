const scriptURL = 'https://script.google.com/macros/s/AKfycbzF4rwH5n9TZPdj_Li56nOSqs8YROXTiTeU3oxA934Fyk1H46ZJEIZmBalvIc2dQ0jA/exec';
const TOKEN_KEY = 'admin_token';

let dataGlobal = [];
let dataTampil = [];
let chartInstance = null;
let chartBulanan = null;
let chartGerai = null;

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

async function cobaLogin() {
    const pwInput = document.getElementById('login-password');
    const errorEl = document.getElementById('login-error');
    if (!pwInput || !errorEl) return;
    const pw = pwInput.value.trim();
    if (!pw) {
        errorEl.textContent = 'Masukkan kata sandi.';
        errorEl.style.display = 'block';
        return;
    }
    errorEl.style.display = 'none';
    try {
        const res = await fetch(scriptURL + '?action=login', {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ password: pw })
        });
        const data = await res.json();
        if (data.status === 'sukses' && data.token) {
            setToken(data.token);
            sembunyikanLogin();
            tarikDataServer();
        } else {
            errorEl.textContent = data.pesan || 'Kata sandi salah.';
            errorEl.style.display = 'block';
        }
    } catch (e) {
        errorEl.textContent = 'Gagal terhubung. Periksa koneksi.';
        errorEl.style.display = 'block';
    }
}

function parseTanggal(str) {
    if (!str) return new Date(NaN);

    // Format server: "yyyy-MM-dd HH:mm:ss" (contoh: 2026-07-22 14:30:00)
    const regexISO = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;
    const matchISO = str.match(regexISO);
    if (matchISO) {
        const [, tahun, bulan, tanggal, jam, menit, detik] = matchISO;
        return new Date(
            parseInt(tahun, 10),
            parseInt(bulan, 10) - 1,
            parseInt(tanggal, 10),
            parseInt(jam, 10),
            parseInt(menit, 10),
            parseInt(detik, 10)
        );
    }

    // Format "yyyy-MM-dd" (tanpa jam)
    const regexISODate = /^(\d{4})-(\d{2})-(\d{2})$/;
    const matchISODate = str.match(regexISODate);
    if (matchISODate) {
        const [, tahun, bulan, tanggal] = matchISODate;
        return new Date(parseInt(tahun, 10), parseInt(bulan, 10) - 1, parseInt(tanggal, 10));
    }

    // Fallback: format "dd/MM/yyyy HH:mm:ss" (data lama)
    const parts = str.split(' ');
    if (parts.length >= 1) {
        const dp = parts[0].split('/');
        const tp = (parts[1] || '00:00:00').split(':');
        if (dp.length === 3) {
            return new Date(
                parseInt(dp[2], 10),
                parseInt(dp[1], 10) - 1,
                parseInt(dp[0], 10),
                parseInt(tp[0], 10) || 0,
                parseInt(tp[1], 10) || 0,
                parseInt(tp[2], 10) || 0
            );
        }
    }

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
    return (clean.reduce((a, b) => a + b, 0) / 9) * 25;
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
    const tbody = document.getElementById('table-body');
    const tfoot = document.getElementById('table-footer');
    if (!tbody || !tfoot) return;
    tbody.innerHTML = '';

    dataTampil.forEach((r, i) => {
        const arr = r['Nilai SKM'] ? String(r['Nilai SKM']).split(',').map(Number) : [];
        const idx = hitungIndeks(arr);
        totalA += idx;
        const lay = amanDariXSS(r['Layanan'] || 'Tidak Diketahui');
        if (!geraiM[lay]) geraiM[lay] = { t: 0, c: 0 };
        if (!isNaN(idx) && idx > 0) { geraiM[lay].t += idx; geraiM[lay].c++; }
        const p = evaluasiMutu(idx);
        const tr = document.createElement('tr');
        tr.innerHTML = `<td style="text-align:center;font-weight:700;color:#6B7280;">${i+1}</td>
            <td>${formatTanggalWaktu(r['Tanggal'])}</td>
            <td>${amanDariXSS(r['Nama'])}<br><span style="font-size:12px;color:#64748B;">${amanDariXSS(r['Pekerjaan'])}</span></td>
            <td><strong style="color:#1E3A8A;">${lay}</strong></td>
            <td style="text-align:center;font-weight:800;">${idx.toFixed(2)}</td>
            <td style="text-align:center;"><span style="background:${p.warnaLatar};color:${p.warnaTeks};padding:6px 12px;border-radius:8px;font-weight:800;">${p.mutu} - ${p.teks}</span></td>
            <td class="saran-cell">${amanDariXSS(r['Saran'])}</td>`;
        tbody.appendChild(tr);
    });

    const totalR = dataTampil.length;
    const elTotal = document.getElementById('kpi-total');
    const elIkm = document.getElementById('kpi-indeks');
    if (elTotal) elTotal.innerText = totalR;
    const ig = totalR > 0 ? totalA / totalR : 0;
    if (elIkm) elIkm.innerText = ig.toFixed(2);
    const pg = evaluasiMutu(ig);
    tfoot.innerHTML = `<tr style="background:#F8FAFC;border-top:2px solid #E2E8F0;">
        <td colspan="4" style="text-align:right;font-weight:800;">RATA-RATA KESELURUHAN:</td>
        <td style="text-align:center;font-weight:800;font-size:18px;color:#1E40AF;">${ig.toFixed(2)}</td>
        <td style="text-align:center;color:${pg.warnaTeks};">${pg.mutu} - ${pg.teks}</td><td></td></tr>`;

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
    if (!dataTampil.length) { alert('Tidak ada data.'); return; }
    const dataExcel = dataTampil.map((r, i) => {
        const ni = hitungIndeks(r['Nilai SKM'] ? String(r['Nilai SKM']).split(',').map(Number) : []);
        const p = evaluasiMutu(ni);
        return {
            "No": i + 1,
            "Tanggal Waktu": formatTanggalWaktu(r['Tanggal']),
            "Nama Pemohon": r['Nama'],
            "Pekerjaan": r['Pekerjaan'],
            "Instansi / Gerai": r['Layanan'],
            "Nilai Indeks": ni.toFixed(2),
            "Mutu Pelayanan": p.mutu + ' - ' + p.teks,
            "Saran": r['Saran'] || '-'
        };
    });
    const ws = XLSX.utils.json_to_sheet(dataExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data SKM');
    XLSX.writeFile(wb, 'Laporan_SKM_MPP_Luwu.xlsx');
}

function eksporKePDF() {
    if (!dataTampil.length) return;
    const el = document.getElementById('area-cetak-pdf');
    if (!el) return;
    const ks = document.getElementById('kop-surat'), jw = document.getElementById('judul-tabel-web');
    const os = el.style.boxShadow, ob = el.style.border, or = el.style.borderRadius;
    if (ks) ks.style.display = 'block';
    if (jw) jw.style.display = 'none';
    el.style.boxShadow = 'none'; el.style.border = 'none'; el.style.borderRadius = '0';
    html2pdf().from(el).set({
        margin: 10,
        filename: 'Laporan_SKM_MPP_Luwu.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    }).save().then(() => {
        if (ks) ks.style.display = 'none';
        if (jw) jw.style.display = 'block';
        el.style.boxShadow = os; el.style.border = ob; el.style.borderRadius = or;
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
    const token = getToken();
    const select = document.getElementById('pilih-tahun-laporan');
    if (!select) return;
    const tahun = parseInt(select.value);

    if (!token) {
        alert('Sesi login berakhir. Silakan login ulang.');
        hapusToken();
        tampilkanLogin();
        return;
    }
    if (isNaN(tahun)) {
        alert('Silakan pilih tahun terlebih dahulu.');
        return;
    }

    // Beri tahu pengguna bahwa data sedang dimuat
    const tbody = document.getElementById('lp-unsur-body');
    if (tbody) tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;">Memuat data tahun ' + tahun + '...</td></tr>';

    fetch(scriptURL + '?action=data&token=' + encodeURIComponent(token))
        .then(r => r.json())
        .then(d => {
            if (d.status === 'sukses') {
                renderLaporan(d.data, tahun);
            } else if (d.status === 'unauthorized') {
                alert('Sesi tidak valid. Silakan login ulang.');
                hapusToken();
                tampilkanLogin();
            } else {
                alert('Gagal memuat data laporan. Silakan coba lagi.');
            }
        })
        .catch(() => {
            alert('Gagal terhubung ke server. Periksa koneksi internet Anda.');
        });
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
