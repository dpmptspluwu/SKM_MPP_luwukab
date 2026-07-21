const scriptURL = 'https://script.google.com/macros/s/AKfycbzF4rwH5n9TZPdj_Li56nOSqs8YROXTiTeU3oxA934Fyk1H46ZJEIZmBalvIc2dQ0jA/exec';
const TOKEN_KEY = 'admin_token';

let dataGlobal = [];
let dataTampil = [];
let chartInstance = null;

function getToken() { return localStorage.getItem(TOKEN_KEY); }
function setToken(token) { localStorage.setItem(TOKEN_KEY, token); }
function hapusToken() { localStorage.removeItem(TOKEN_KEY); }

function tampilkanLogin() { document.getElementById('login-overlay').style.display = 'flex'; }
function sembunyikanLogin() { document.getElementById('login-overlay').style.display = 'none'; }

async function cobaLogin() {
    const pw = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    errorEl.style.display = 'none';
    if (!pw) return;
    try {
        const res = await fetch(scriptURL + '?action=login', {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
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
        errorEl.textContent = 'Gagal terhubung ke server.';
        errorEl.style.display = 'block';
    }
}

window.onload = () => {
    document.getElementById('login-btn').addEventListener('click', cobaLogin);
    document.getElementById('login-password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') cobaLogin();
    });
    if (getToken()) {
        sembunyikanLogin();
        tarikDataServer();
    } else {
        tampilkanLogin();
    }
};

function parseTanggal(str) {
    if (!str) return new Date(NaN);
    let d = new Date(str);
    if (!isNaN(d.getTime())) return d;
    const parts = str.split(' ');
    if (parts.length >= 1) {
        const datePart = parts[0], timePart = parts[1] || '00:00:00';
        const dParts = datePart.split('/');
        if (dParts.length === 3) {
            const tParts = timePart.split(':');
            return new Date(parseInt(dParts[2]), parseInt(dParts[1])-1, parseInt(dParts[0]), parseInt(tParts[0])||0, parseInt(tParts[1])||0, parseInt(tParts[2])||0);
        }
    }
    return new Date(NaN);
}

function tarikDataServer() {
    if (window.location.protocol === 'file:') {
        document.getElementById('loader').innerHTML = `<div style="text-align:center; color:#B91C1C; font-weight:600;"><p style="font-size:18px;">⚠️ Akses Ditolak</p><p>Dashboard harus dibuka melalui server web.</p></div>`;
        return;
    }
    const token = getToken();
    if (!token) { tampilkanLogin(); return; }
    fetch(scriptURL + '?action=data&token=' + encodeURIComponent(token))
        .then(response => response.json())
        .then(data => {
            if (data.status === 'sukses') {
                dataGlobal = data.data;
                dataTampil = [...dataGlobal];
                prosesDataDanRender();
            } else if (data.status === 'unauthorized') {
                hapusToken();
                tampilkanLogin();
            } else {
                alert("Gagal membaca data dari server.");
            }
        })
        .catch(error => { alert("Terjadi kesalahan jaringan."); });
}

function formatTanggalWaktu(inputStr) {
    if (!inputStr) return '-';
    const d = parseTanggal(inputStr);
    if (isNaN(d.getTime())) return inputStr;
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function hitungIndeksResponden(arrayNilai) {
    const clean = arrayNilai.filter(n => !isNaN(n) && n > 0);
    if (clean.length === 0) return 0;
    return (clean.reduce((a, b) => a + b, 0) / clean.length) * 25;
}

function evaluasiMutu(nilai) {
    if (nilai >= 88.31) return { mutu: 'A', teks: 'Sangat Baik', warnaTeks: '#047857', warnaLatar: '#D1FAE5' };
    if (nilai >= 76.61) return { mutu: 'B', teks: 'Baik', warnaTeks: '#1D4ED8', warnaLatar: '#DBEAFE' };
    if (nilai >= 65.00) return { mutu: 'C', teks: 'Kurang Baik', warnaTeks: '#B45309', warnaLatar: '#FEF3C7' };
    if (nilai > 0) return { mutu: 'D', teks: 'Tidak Baik', warnaTeks: '#B91C1C', warnaLatar: '#FEE2E2' };
    return { mutu: '-', teks: 'Tidak Valid', warnaTeks: '#475569', warnaLatar: '#F1F5F9' };
}

function amanDariXSS(str) {
    if (!str) return '-';
    return str.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function prosesDataDanRender() {
    document.getElementById('loader').style.display = 'none';
    document.getElementById('dashboard-content').style.display = 'block';

    let totalAkumulasiIndeks = 0;
    let hitungGerai = {};
    const tbody = document.getElementById('table-body');
    const tfoot = document.getElementById('table-footer');
    tbody.innerHTML = '';

    dataTampil.forEach((row, index) => {
        let arrayNilai = row['Nilai SKM'] ? row['Nilai SKM'].toString().split(',').map(Number) : [];
        let nilaiIndeks = hitungIndeksResponden(arrayNilai);
        totalAkumulasiIndeks += nilaiIndeks;

        const layanan = amanDariXSS(row['Layanan'] || 'Tidak Diketahui');
        if (!hitungGerai[layanan]) hitungGerai[layanan] = { totalIndeks: 0, jumlah: 0 };
        if (!isNaN(nilaiIndeks) && nilaiIndeks > 0) { hitungGerai[layanan].totalIndeks += nilaiIndeks; hitungGerai[layanan].jumlah++; }

        const predikat = evaluasiMutu(nilaiIndeks);
        const tr = document.createElement('tr');
        tr.innerHTML = `<td style="text-align:center; font-weight:700; color:#6B7280;">${index+1}</td>
            <td>${formatTanggalWaktu(row['Tanggal'])}</td>
            <td>${amanDariXSS(row['Nama'])}<br><span style="font-size:12px; color:#64748B;">${amanDariXSS(row['Pekerjaan'])}</span></td>
            <td><strong style="color:#1E3A8A;">${layanan}</strong></td>
            <td style="text-align:center; font-weight:800;">${nilaiIndeks.toFixed(2)}</td>
            <td style="text-align:center;"><span style="background:${predikat.warnaLatar}; color:${predikat.warnaTeks}; padding:6px 12px; border-radius:8px; font-weight:800;">${predikat.mutu} - ${predikat.teks}</span></td>
            <td style="max-width:250px; overflow:hidden; text-overflow:ellipsis;">${amanDariXSS(row['Saran'])}</td>`;
        tbody.appendChild(tr);
    });

    const totalResponden = dataTampil.length;
    document.getElementById('kpi-total').innerText = totalResponden;
    let indeksGlobal = totalResponden > 0 ? totalAkumulasiIndeks / totalResponden : 0;
    document.getElementById('kpi-indeks').innerText = indeksGlobal.toFixed(2);
    const predikatGlobal = evaluasiMutu(indeksGlobal);
    tfoot.innerHTML = `<tr style="background:#F8FAFC; border-top:2px solid #E2E8F0;"><td colspan="4" style="text-align:right; font-weight:800;">RATA-RATA KESELURUHAN:</td><td style="text-align:center; font-weight:800; font-size:18px; color:#1E40AF;">${indeksGlobal.toFixed(2)}</td><td style="text-align:center; color:${predikatGlobal.warnaTeks};">${predikatGlobal.mutu} - ${predikatGlobal.teks}</td><td></td></tr>`;

    let geraiTerbaik = '-', skorTertinggi = 0;
    let labels = [], chartData = [], chartJumlah = [];
    for (const [gerai, data] of Object.entries(hitungGerai)) {
        if (data.jumlah > 0) {
            const rata = data.totalIndeks / data.jumlah;
            labels.push(gerai);
            chartData.push(rata.toFixed(2));
            chartJumlah.push(data.jumlah);
            if (rata > skorTertinggi) { skorTertinggi = rata; geraiTerbaik = gerai; }
        }
    }
    document.getElementById('kpi-terbaik').innerText = geraiTerbaik;
    renderGrafik(labels, chartData, chartJumlah);
}

function renderGrafik(labels, data, jumlahData) {
    const ctx = document.getElementById('skmChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
        type: 'bar', data: { labels, datasets: [{ label: 'Indeks SKM Rata-rata per Gerai', data, backgroundColor: '#3b82f6', borderRadius: 6, barThickness: 40 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { tooltip: { callbacks: { afterLabel: ctx => 'Berdasarkan: ' + jumlahData[ctx.dataIndex] + ' Responden' } } }, scales: { y: { beginAtZero: true, max: 100 } } }
    });
}

function terapkanFilter() {
    const tglMulai = document.getElementById('tgl-mulai').value, tglSelesai = document.getElementById('tgl-selesai').value;
    if (!tglMulai || !tglSelesai) { alert("Mohon pilih tanggal mulai dan selesai."); return; }
    const mulai = new Date(tglMulai); mulai.setHours(0,0,0,0);
    const selesai = new Date(tglSelesai); selesai.setHours(23,59,59,999);
    dataTampil = dataGlobal.filter(row => { if (!row['Tanggal']) return false; const tgl = parseTanggal(row['Tanggal']); return tgl >= mulai && tgl <= selesai; });
    prosesDataDanRender();
}

function resetFilter() {
    document.getElementById('tgl-mulai').value = ''; document.getElementById('tgl-selesai').value = '';
    dataTampil = [...dataGlobal]; prosesDataDanRender();
}

function eksporKeExcel() {
    if (dataTampil.length === 0) { alert("Tidak ada data."); return; }
    let dataExcel = dataTampil.map((row, i) => {
        let nilaiIndeks = hitungIndeksResponden(row['Nilai SKM'] ? row['Nilai SKM'].toString().split(',').map(Number) : []);
        let predikat = evaluasiMutu(nilaiIndeks);
        return { "No": i+1, "Tanggal Waktu": formatTanggalWaktu(row['Tanggal']), "Nama Pemohon": row['Nama'], "Pekerjaan": row['Pekerjaan'], "Instansi / Gerai": row['Layanan'], "Nilai Indeks": nilaiIndeks.toFixed(2), "Mutu Pelayanan": `${predikat.mutu} - ${predikat.teks}`, "Saran": row['Saran']||"-" };
    });
    const ws = XLSX.utils.json_to_sheet(dataExcel);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Data SKM");
    XLSX.writeFile(wb, "Laporan_SKM_MPP_Luwu.xlsx");
}

function eksporKePDF() {
    if (dataTampil.length === 0) { alert("Tidak ada data."); return; }
    const element = document.getElementById('area-cetak-pdf');
    const opt = { margin: 10, filename: 'Laporan_SKM_MPP_Luwu.pdf', image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, backgroundColor: '#ffffff' }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' } };
    html2pdf().from(element).set(opt).save();
}