const scriptURL = 'https://script.google.com/macros/s/AKfycbzF4rwH5n9TZPdj_Li56nOSqs8YROXTiTeU3oxA934Fyk1H46ZJEIZmBalvIc2dQ0jA/exec';
const TOKEN_KEY = 'admin_token';

let dataGlobal = [];
let rekapGerai = {};

const namaUnsur = [
    "Kesesuaian persyaratan", "Kemudahan prosedur", "Kecepatan waktu",
    "Kewajaran biaya", "Kesesuaian produk", "Kompetensi pelaksana",
    "Perilaku pelaksana", "Penanganan pengaduan", "Kualitas sarana"
];

const kamusSolusi = {
    0: { akar: "Pemohon belum sepenuhnya memahami rincian syarat spesifik jenis izin.", solusi: "Membuat dan menempelkan checklist kelengkapan berkas di area loket pendaftaran.", waktu: "1 Minggu" },
    1: { akar: "Alur permohonan izin masih dirasa membingungkan.", solusi: "Menyediakan map contoh formulir yang sudah terisi benar sebagai panduan visual.", waktu: "1 Minggu" },
    2: { akar: "Terjadi antrean dokumen pada meja verifikasi awal.", solusi: "Menerapkan pemilahan berkas cepat (triage) sebelum pemohon mengambil nomor antrean.", waktu: "2 Minggu" },
    3: { akar: "Informasi mengenai ketentuan tarif resmi belum tersampaikan maksimal.", solusi: "Memasang banner informasi 'Layanan Bebas Biaya' atau Tarif Resmi di ruang tunggu.", waktu: "1 Minggu" },
    4: { akar: "Adanya ketidaksesuaian draf hasil cetak dengan ekspektasi pemohon.", solusi: "Mewajibkan pemohon memverifikasi draf izin secara mandiri sebelum dicetak final.", waktu: "Rutin" },
    5: { akar: "Penyampaian informasi teknis oleh petugas belum seragam.", solusi: "Melaksanakan briefing pagi (stand-up meeting) setiap awal pekan bagi front-office.", waktu: "Rutin Mingguan" },
    6: { akar: "Interaksi dan komunikasi petugas dengan pemohon perlu ditingkatkan.", solusi: "Menegaskan kembali SOP Senyum, Sapa, Salam dalam setiap pelayanan loket.", waktu: "Segera" },
    7: { akar: "Akses informasi untuk pelaporan masalah belum mudah ditemukan.", solusi: "Menempatkan nomor WhatsApp khusus pengaduan di meja loket secara mencolok.", waktu: "1 Bulan" },
    8: { akar: "Kenyamanan fasilitas penunjang ruang tunggu perlu dimaksimalkan.", solusi: "Melakukan perapihan tata letak kursi dan penyediaan ATK dasar di meja pengisian.", waktu: "1 Bulan" }
};

document.addEventListener('DOMContentLoaded', () => {
    tarikDataServer();
    
    document.getElementById('pilih-gerai-tl').addEventListener('change', function() {
        if(this.value) {
            bangunLaporanDiLayar(this.value);
        } else {
            document.getElementById('area-preview').style.display = 'none';
            document.getElementById('btn-cetak-tl').disabled = true;
        }
    });

    document.getElementById('input-periode-tl').addEventListener('input', function() {
        const geraiAktif = document.getElementById('pilih-gerai-tl').value;
        if(geraiAktif) bangunLaporanDiLayar(geraiAktif);
    });

    // Pemicu jika filter tanggal diubah, hitung ulang semua
    document.getElementById('tgl-awal-tl').addEventListener('change', kelompokkanDataPerGerai);
    document.getElementById('tgl-akhir-tl').addEventListener('change', kelompokkanDataPerGerai);

    document.getElementById('btn-cetak-tl').addEventListener('click', () => {
        const gerai = document.getElementById('pilih-gerai-tl').value;
        cetakPDF(gerai);
    });
});

function tarikDataServer() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return window.location.href = 'admin.html';

    fetch(scriptURL + '?action=data&token=' + encodeURIComponent(token))
        .then(r => r.json())
        .then(d => {
            if (d.status === 'sukses') {
                dataGlobal = d.data;
                kelompokkanDataPerGerai();
            }
        })
}

function kelompokkanDataPerGerai() {
    rekapGerai = {};
    const tglAwal = document.getElementById('tgl-awal-tl').value;
    const tglAkhir = document.getElementById('tgl-akhir-tl').value;

    // Logika Pemotong Data Berdasarkan Tanggal
    const dataTerfilter = dataGlobal.filter(r => {
        const kolomWaktu = r['Timestamp'] || r['Waktu'] || r['waktu'] || r['Tanggal'] || '';
        if (!kolomWaktu) return true; // Jika data tidak punya kolom waktu, biarkan lolos
        
        const tanggalSurvey = new Date(kolomWaktu);
        if (isNaN(tanggalSurvey.getTime())) return true; // Jika format waktu rusak, biarkan lolos

        if (tglAwal) {
            const batasAwal = new Date(tglAwal);
            batasAwal.setHours(0, 0, 0, 0);
            if (tanggalSurvey < batasAwal) return false; // Buang data yang terlalu lama
        }
        
        if (tglAkhir) {
            const batasAkhir = new Date(tglAkhir);
            batasAkhir.setHours(23, 59, 59, 999);
            if (tanggalSurvey > batasAkhir) return false; // Buang data yang terlalu baru
        }
        
        return true; // Data lolos seleksi kalender
    });

    dataTerfilter.forEach(r => {
        const arr = r['Nilai SKM'] ? String(r['Nilai SKM']).split(',').map(Number) : [];
        const lay = r['Layanan'] || 'Tidak Diketahui';
        const saranMasuk = r['Saran & Masukan'] || r['Saran'] || '';
        
        if (!rekapGerai[lay]) {
            rekapGerai[lay] = { 
                tPoin: 0, 
                tPert: 0, 
                unsurPoin: Array(9).fill(0), 
                unsurResponden: Array(9).fill(0),
                daftarSaran: []
            };
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
            
            const teksBersih = saranMasuk.trim();
            if (teksBersih.length > 3 && teksBersih.toLowerCase() !== 'tidak ada' && teksBersih.toLowerCase() !== '-') {
                if (!rekapGerai[lay].daftarSaran.includes(teksBersih)) {
                    rekapGerai[lay].daftarSaran.push(teksBersih);
                }
            }
        }
    });

    // Perbarui daftar gerai di dropdown hanya dengan gerai yang punya data di periode tersebut
    const select = document.getElementById('pilih-gerai-tl');
    select.innerHTML = '<option value="">-- Pilih Instansi / Gerai --</option>';
    
    Object.keys(rekapGerai).sort().forEach(gerai => {
        if(rekapGerai[gerai].tPert > 0) {
            const opt = document.createElement('option');
            opt.value = gerai;
            opt.textContent = gerai;
            select.appendChild(opt);
        }
    });

    // Sembunyikan laporan lama jika tanggal berubah
    document.getElementById('area-preview').style.display = 'none';
    document.getElementById('btn-cetak-tl').disabled = true;
}

function tentukanMutu(nilai) {
    if (nilai >= 88.31) return { huruf: "A", teks: "Sangat Baik", warna: "#047857" };
    if (nilai >= 76.61) return { huruf: "B", teks: "Baik", warna: "#0369A1" };
    if (nilai >= 65.00) return { huruf: "C", teks: "Cukup Baik", warna: "#D97706" };
    return { huruf: "D", teks: "Kurang Baik", warna: "#DC2626" };
}

function bangunLaporanDiLayar(namaGerai) {
    const area = document.getElementById('area-preview');
    const data = rekapGerai[namaGerai];
    
    // Cegah error jika gerai kosong di periode tersebut
    if (!data || data.tPert === 0) return;

    let temuanHTML = '';
    let nomor = 1;

    const periodeInput = document.getElementById('input-periode-tl').value || 'Tidak Ditentukan';

    let blokSuaraWarga = '';
    if (data.daftarSaran.length > 0) {
        blokSuaraWarga = `<div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #94A3B8;">
            <strong style="color: #0F172A; font-size: 11px;">Suara Warga:</strong>
            <ul style="margin: 5px 0 0 15px; padding: 0; text-align: left; font-size: 11px; color: #475569;">`;
        
        data.daftarSaran.slice(0, 3).forEach(s => {
            blokSuaraWarga += `<li style="margin-bottom: 4px; font-style: italic;">"${s}"</li>`;
        });
        blokSuaraWarga += `</ul></div>`;
    }

    for (let i = 0; i < 9; i++) {
        if (data.unsurResponden[i] > 0) {
            const rata = data.unsurPoin[i] / data.unsurResponden[i];
            if (rata < 3.00) {
                const s = kamusSolusi[i];
                temuanHTML += `
                    <tr style="page-break-inside: avoid;">
                        <td style="border: 1px solid #94A3B8; padding: 12px; text-align: center;">${nomor++}</td>
                        <td style="border: 1px solid #94A3B8; padding: 12px; font-weight: bold;">U${i+1} - ${namaUnsur[i]}</td>
                        <td style="border: 1px solid #94A3B8; padding: 12px; text-align: center; font-weight: bold; color: #DC2626;">${rata.toFixed(2)}</td>
                        <td style="border: 1px solid #94A3B8; padding: 12px; text-align: justify; vertical-align: top;">
                            ${s.akar}
                            ${blokSuaraWarga}
                        </td>
                        <td style="border: 1px solid #94A3B8; padding: 12px; font-weight: 600; color: #0F172A; text-align: justify; vertical-align: top;">${s.solusi}</td>
                        <td style="border: 1px solid #94A3B8; padding: 12px; text-align: center; vertical-align: top;">${s.waktu}</td>
                    </tr>`;
            }
        }
    }

    if (!temuanHTML) {
        temuanHTML = `<tr><td colspan="6" style="border: 1px solid #94A3B8; padding: 20px; text-align: center; font-weight: bold; color: #16A34A;">Kinerja Sangat Baik! Tidak ada unsur yang memerlukan tindak lanjut prioritas pada periode ini.</td></tr>`;
    }

    const nilaiMurni = data.tPoin / data.tPert;
    const nilaiAkhir = nilaiMurni * 25;
    const mutu = tentukanMutu(nilaiAkhir);
    const tanggalCetak = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    
    area.innerHTML = `
        <div id="dokumen-cetak" style="font-family: Arial, sans-serif; color: #000; background: #fff; padding: 10px;">
            <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #1E40AF; padding-bottom: 20px;">
                <h2 style="margin: 0; font-size: 22px; text-transform: uppercase; font-weight: 800;">RENCANA TINDAK LANJUT EVALUASI SKM</h2>
                <h3 style="margin: 8px 0 0; font-size: 16px; font-weight: 600; color: #334155;">MAL PELAYANAN PUBLIK KABUPATEN LUWU</h3>
            </div>
            
            <div style="display: flex; justify-content: space-between; margin-bottom: 25px; font-size: 14px;">
                <div>
                    <p style="margin: 5px 0;"><strong>Instansi Pelaksana :</strong> ${namaGerai}</p>
                    <p style="margin: 5px 0;"><strong>Periode Evaluasi :</strong> <span style="font-weight: 700;">${periodeInput}</span></p>
                    <p style="margin: 5px 0;"><strong>Mutu Pelayanan :</strong> <span style="font-size: 14px; font-weight: 800; color: ${mutu.warna};">${mutu.huruf} - ${mutu.teks}</span></p>
                    <p style="margin: 5px 0;"><strong>Nilai Rata-rata Murni :</strong> <span style="font-size: 14px; font-weight: 700; color: #475569;">${nilaiMurni.toFixed(2)}</span> / 4.00</p>
                    <p style="margin: 5px 0;"><strong>Nilai IKM Gerai :</strong> <span style="font-size: 16px; font-weight: 800; color: #1E40AF;">${nilaiAkhir.toFixed(2)}</span> / 100</p>
                </div>
                <div style="text-align: right;">
                    <p style="margin: 5px 0;"><strong>Tanggal Cetak :</strong> ${tanggalCetak}</p>
                </div>
            </div>

            <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 40px;">
                <thead>
                    <tr style="background-color: #1E40AF; color: white;">
                        <th style="border: 1px solid #1E40AF; padding: 12px; width: 5%;">No</th>
                        <th style="border: 1px solid #1E40AF; padding: 12px; width: 18%;">Kelemahan Layanan</th>
                        <th style="border: 1px solid #1E40AF; padding: 12px; width: 8%;">Skor</th>
                        <th style="border: 1px solid #1E40AF; padding: 12px; width: 25%;">Identifikasi Masalah</th>
                        <th style="border: 1px solid #1E40AF; padding: 12px; width: 30%;">Rekomendasi Tindak Lanjut</th>
                        <th style="border: 1px solid #1E40AF; padding: 12px; width: 14%;">Target Waktu</th>
                    </tr>
                </thead>
                <tbody>
                    ${temuanHTML}
                </tbody>
            </table>

            <!-- =========================================================
                 BAGIAN TANDA TANGAN DISEMBUNYIKAN SEMENTARA
                 Hapus tanda panah pembuka dan penutup ini untuk mengaktifkan
                 ========================================================= -->
            <!-- 
            <div style="display: flex; justify-content: flex-end; margin-top: 50px;">
                <div style="text-align: center; width: 250px;">
                    <p style="margin-bottom: 80px; font-size: 14px;">Mengetahui,<br>Kepala DPMPTSP Kabupaten Luwu</p>
                    <p style="margin: 0; font-weight: bold; text-decoration: underline; font-size: 14px;">( ......................................... )</p>
                    <p style="margin: 0; font-size: 12px;">NIP. .........................................</p>
                </div>
            </div>
            -->
        </div>
    `;
    
    area.style.display = 'block';
    document.getElementById('btn-cetak-tl').disabled = false;
}

function cetakPDF(namaGerai) {
    const elemenDokumen = document.getElementById('dokumen-cetak');
    
    html2pdf().from(elemenDokumen).set({
        margin: 10,
        filename: `Tindak_Lanjut_${namaGerai.replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    }).save();
}

document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'F12') {
        e.preventDefault();
    }
    if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i')) {
        e.preventDefault();
    }
    if (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j')) {
        e.preventDefault();
    }
    if (e.ctrlKey && (e.key === 'U' || e.key === 'u')) {
        e.preventDefault();
    }
});
