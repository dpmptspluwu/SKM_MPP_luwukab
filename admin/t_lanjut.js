// Konfigurasi Database (Gunakan link yang sama dengan admin.js)
const scriptURL = 'https://script.google.com/macros/s/AKfycbzF4rwH5n9TZPdj_Li56nOSqs8YROXTiTeU3oxA934Fyk1H46ZJEIZmBalvIc2dQ0jA/exec';
const TOKEN_KEY = 'admin_token';

let dataGlobal = [];
let rekapGerai = {};

const namaUnsur = [
    "Kesesuaian persyaratan", "Kemudahan prosedur", "Kecepatan waktu",
    "Kewajaran biaya", "Kesesuaian produk", "Kompetensi petugas",
    "Perilaku petugas", "Kualitas sarana", "Penanganan pengaduan"
];

// KAMUS PINTAR: Solusi Realistis untuk Layanan Izin Non-Berusaha
const kamusSolusi = {
    0: { akar: "Pemohon masih keliru membedakan syarat antar jenis izin non-berusaha (misal izin praktik vs rekom).", solusi: "Menempelkan checklist cetak ukuran besar di kaca loket untuk verifikasi mandiri sebelum antre.", waktu: "Segera (1 Minggu)" },
    1: { akar: "Alur perizinan dirasa berbelit-belit atau kurang transparan.", solusi: "Menyediakan map contoh formulir yang sudah terisi sempurna di meja ruang tunggu.", waktu: "Segera (1 Minggu)" },
    2: { akar: "Pemrosesan izin tertunda karena tumpukan berkas di meja verifikator.", solusi: "Menerapkan sistem 'triage' (pemilahan awal) berkas oleh petugas front-office sebelum diteruskan.", waktu: "1 Bulan" },
    3: { akar: "Adanya biaya di luar ketentuan atau informasi tarif yang kurang jelas.", solusi: "Mencetak banner tarif resmi Rp.0 (Gratis) atau sesuai Perda dengan ukuran mencolok di area tunggu.", waktu: "Segera (1 Minggu)" },
    4: { akar: "Hasil cetak SK/Izin mengalami kesalahan ketik atau format.", solusi: "Menambahkan prosedur pembacaan ulang draf izin oleh pemohon sebelum dicetak permanen.", waktu: "Evaluasi Rutin" },
    5: { akar: "Petugas loket kurang menguasai aturan teknis izin tertentu.", solusi: "Melakukan briefing pagi (stand-up meeting) 10 menit setiap hari Senin untuk menyamakan persepsi aturan.", waktu: "Rutin Mingguan" },
    6: { akar: "Kurangnya keramahan atau empati saat menghadapi pemohon yang bingung.", solusi: "Menetapkan standar 'Senyum, Sapa, Salam' wajib di SOP harian tanpa perlu pelatihan eksternal khusus.", waktu: "Segera" },
    7: { akar: "Fasilitas penunjang (kursi tunggu, pendingin, ATK) kurang memadai.", solusi: "Mengajukan pengadaan ATK dasar dan perapihan area tunggu secara swadaya oleh tim internal gerai.", waktu: "1-3 Bulan" },
    8: { akar: "Pemohon tidak tahu kemana harus bertanya jika izinnya terhambat.", solusi: "Membuat papan informasi berisi nomor WhatsApp khusus layanan pengaduan di loket depan.", waktu: "1 Bulan" }
};

document.addEventListener('DOMContentLoaded', () => {
    tarikDataServer();
    
    document.getElementById('btn-cetak-tl').addEventListener('click', () => {
        const geraiTerpilih = document.getElementById('pilih-gerai-tl').value;
        if(geraiTerpilih) prosesDanCetakPDF(geraiTerpilih);
    });
});

function tarikDataServer() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
        alert("Sesi tidak ditemukan. Harap login melalui halaman Dashboard Utama.");
        window.location.href = 'admin.html';
        return;
    }

    fetch(scriptURL + '?action=data&token=' + encodeURIComponent(token))
        .then(r => r.json())
        .then(d => {
            if (d.status === 'sukses') {
                dataGlobal = d.data;
                kelompokkanDataPerGerai();
            } else {
                alert("Sesi kedaluwarsa. Silakan login kembali.");
            }
        })
        .catch(() => alert("Koneksi jaringan terputus."));
}

function parseTanggal(str) {
    if (!str) return new Date(NaN);
    const jsDate = new Date(str);
    return isNaN(jsDate.getTime()) ? new Date(str.split(' ')[0].split('/').reverse().join('-')) : jsDate;
}

function kelompokkanDataPerGerai() {
    rekapGerai = {};
    dataGlobal.forEach(r => {
        const arr = r['Nilai SKM'] ? String(r['Nilai SKM']).split(',').map(Number) : [];
        const lay = r['Layanan'] || 'Tidak Diketahui';
        
        if (!rekapGerai[lay]) {
            // Kita siapkan laci untuk menyimpan 9 unsur secara massal
            rekapGerai[lay] = { tPoin: 0, tPert: 0, unsurPoin: Array(9).fill(0), unsurResponden: Array(9).fill(0) };
        }
        
        let adaIsi = false;
        arr.forEach((v, i) => {
            if (i < 9 && !isNaN(v) && v > 0) {
                rekapGerai[lay].unsurPoin[i] += v;
                rekapGerai[lay].unsurResponden[i]++;
                adaIsi = true;
            }
        });
        
        if(adaIsi) {
            const clean = arr.filter(n => !isNaN(n) && n > 0);
            rekapGerai[lay].tPoin += clean.reduce((a, b) => a + b, 0);
            rekapGerai[lay].tPert += clean.length;
        }
    });

    const select = document.getElementById('pilih-gerai-tl');
    select.innerHTML = '<option value="">-- Pilih Instansi / Gerai --</option>';
    
    // Memasukkan nama gerai ke dropdown secara alfabetis
    Object.keys(rekapGerai).sort().forEach(gerai => {
        if(rekapGerai[gerai].tPert > 0) {
            const opt = document.createElement('option');
            opt.value = gerai;
            opt.textContent = gerai;
            select.appendChild(opt);
        }
    });
    
    document.getElementById('btn-cetak-tl').disabled = false;
}

function prosesDanCetakPDF(namaGerai) {
    const statusEl = document.getElementById('status-tl');
    statusEl.style.display = 'block';
    
    const data = rekapGerai[namaGerai];
    let temuanHTML = '';
    let nomor = 1;

    // 1. Logika Analisis Kecerdasan: Mencari unsur di bawah skor 3.00 (Mutu C/D)
    for (let i = 0; i < 9; i++) {
        const poin = data.unsurPoin[i];
        const resp = data.unsurResponden[i];
        
        if (resp > 0) {
            const rataMurni = poin / resp;
            // Threshold: Jika rata-rata murni di bawah 3.00, ini adalah kelemahan
            if (rataMurni < 3.00) {
                const solusi = kamusSolusi[i];
                temuanHTML += `
                    <tr style="page-break-inside: avoid;">
                        <td style="border: 1px solid #CBD5E1; padding: 10px; text-align: center;">${nomor++}</td>
                        <td style="border: 1px solid #CBD5E1; padding: 10px; font-weight: bold;">U${i+1} - ${namaUnsur[i]}</td>
                        <td style="border: 1px solid #CBD5E1; padding: 10px; text-align: center; font-weight: 800; color: #B91C1C;">${rataMurni.toFixed(2)}</td>
                        <td style="border: 1px solid #CBD5E1; padding: 10px; text-align: justify;">${solusi.akar}</td>
                        <td style="border: 1px solid #CBD5E1; padding: 10px; text-align: justify; font-weight: 600;">${solusi.solusi}</td>
                        <td style="border: 1px solid #CBD5E1; padding: 10px; text-align: center;">${solusi.waktu}</td>
                    </tr>
                `;
            }
        }
    }

    // Jika kebetulan gerai tersebut nilainya sempurna semua
    if (temuanHTML === '') {
        temuanHTML = `<tr><td colspan="6" style="border: 1px solid #CBD5E1; padding: 20px; text-align: center; font-weight: bold; color: #047857;">Seluruh unsur pelayanan berada di atas standar minimum (Mutu A/B). Lanjutkan pertahankan kinerja!</td></tr>`;
    }

    const nilaiAkhir = (data.tPoin / data.tPert) * 25;
    const tanggalCetak = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    // 2. Membangun Kerangka Kertas Resmi (Template Literal Tersembunyi)
    const cetakDiv = document.createElement('div');
    cetakDiv.style.backgroundColor = '#FFFFFF';
    cetakDiv.style.color = '#000000';
    cetakDiv.style.padding = '30px';
    cetakDiv.style.fontFamily = 'Arial, sans-serif';
    cetakDiv.style.position = 'absolute';
    cetakDiv.style.top = '-9999px'; // Disembunyikan dari layar
    
    cetakDiv.innerHTML = `
        <div style="text-align: center; border-bottom: 3px solid #1E40AF; padding-bottom: 15px; margin-bottom: 20px;">
            <h1 style="margin: 0; font-size: 20px; text-transform: uppercase;">RENCANA TINDAK LANJUT EVALUASI SKM</h1>
            <h2 style="margin: 5px 0 0; font-size: 16px; color: #334155;">MAL PELAYANAN PUBLIK KABUPATEN LUWU</h2>
        </div>
        
        <table style="width: 100%; margin-bottom: 20px; font-size: 13px;">
            <tr><td style="width: 180px; font-weight: bold;">Instansi / Gerai Layanan</td><td>: ${namaGerai}</td></tr>
            <tr><td style="font-weight: bold;">Indeks Akhir Gerai</td><td>: <span style="color: #1E40AF; font-weight: 800;">${nilaiAkhir.toFixed(2)}</span> / 100</td></tr>
            <tr><td style="font-weight: bold;">Tanggal Analisis</td><td>: ${tanggalCetak}</td></tr>
        </table>

        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead>
                <tr style="background-color: #1E40AF; color: white;">
                    <th style="border: 1px solid #CBD5E1; padding: 10px; width: 5%;">No</th>
                    <th style="border: 1px solid #CBD5E1; padding: 10px; width: 15%;">Unsur Kelemahan</th>
                    <th style="border: 1px solid #CBD5E1; padding: 10px; width: 8%;">Skor Murni</th>
                    <th style="border: 1px solid #CBD5E1; padding: 10px; width: 25%;">Identifikasi Masalah</th>
                    <th style="border: 1px solid #CBD5E1; padding: 10px; width: 32%;">Rekomendasi Tindak Lanjut</th>
                    <th style="border: 1px solid #CBD5E1; padding: 10px; width: 15%;">Target Waktu</th>
                </tr>
            </thead>
            <tbody>
                ${temuanHTML}
            </tbody>
        </table>

        <div style="margin-top: 50px; display: flex; justify-content: flex-end;">
            <div style="text-align: center; width: 250px;">
                <p style="margin-bottom: 70px; font-size: 12px;">Mengetahui,<br>Kepala DPMPTSP Kabupaten Luwu</p>
                <p style="margin: 0; font-weight: bold; text-decoration: underline; font-size: 13px;">( ......................................... )</p>
                <p style="margin: 0; font-size: 11px;">NIP. .........................................</p>
            </div>
        </div>
    `;

    document.body.appendChild(cetakDiv);

    // 3. Mesin PDF Kelas Premium
    html2pdf().from(cetakDiv).set({
        margin: 15, // Margin dokumen resmi 15mm
        filename: `TL_SKM_${namaGerai.replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' } // Landscape agar tabel panjang bisa muat sempurna
    }).save().then(() => {
        document.body.removeChild(cetakDiv);
        statusEl.style.display = 'none';
    });
}