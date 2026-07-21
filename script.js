const scriptURL = 'https://script.google.com/macros/s/AKfycbzF4rwH5n9TZPdj_Li56nOSqs8YROXTiTeU3oxA934Fyk1H46ZJEIZmBalvIc2dQ0jA/exec';

const KONFIGURASI = {
    skalaBintang: 5 
};

const labelJawaban = {
    4: ["Tidak Baik", "Kurang Baik", "Baik", "Sangat Baik"],
    5: ["Buruk", "Kurang", "Cukup", "Baik", "Sangat Baik"]
};

const daftarPertanyaan = [
    "Bagaimana pendapat Anda tentang kesesuaian persyaratan pelayanan dengan jenis pelayanannya?",
    "Bagaimana pemahaman Anda tentang kemudahan prosedur pelayanan di unit ini?",
    "Bagaimana pendapat Anda tentang kecepatan waktu dalam memberikan pelayanan?",
    "Bagaimana pendapat Anda tentang kewajaran biaya atau tarif dalam pelayanan?",
    "Bagaimana pendapat Anda tentang kesesuaian produk pelayanan antara yang tercantum dalam standar pelayanan dengan hasil yang diberikan?",
    "Bagaimana pendapat Anda tentang kompetensi atau kemampuan petugas dalam memberikan pelayanan?",
    "Bagaimana pendapat Anda tentang perilaku, kesopanan, dan keramahan petugas dalam memberikan pelayanan?",
    "Bagaimana pendapat Anda tentang kualitas sarana dan prasarana di unit pelayanan ini?",
    "Bagaimana pendapat Anda tentang penanganan, tindak lanjut, dan penyelesaian pengaduan pengguna layanan?"
];

let dataSurvey = { 
    nama: '', usia: '', gender: '', pendidikan: '', pekerjaan: '', 
    layanan: '', jawaban: [], saran: '' 
};

let pertanyaanSaatIni = 0;
let idleTimer;

const urlParams = new URLSearchParams(window.location.search);
const geraiTerdeteksi = urlParams.get('gerai');
if (geraiTerdeteksi) {
    dataSurvey.layanan = geraiTerdeteksi;
}

function renderBintangDinamis() {
    const areaBintang = document.getElementById('area-bintang');
    areaBintang.innerHTML = '';
    
    const skala = KONFIGURASI.skalaBintang;
    const labelSaatIni = labelJawaban[skala];

    for (let i = 1; i <= skala; i++) {
        areaBintang.innerHTML += `
            <button class="btn-rating" onclick="jawabPertanyaan(${i})">
                <svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                <span class="rating-label">${labelSaatIni[i-1]}</span>
            </button>
        `;
    }
}

function resetIdleTimer() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { resetSurvey(); }, 60000); 
}

window.onload = () => {
    renderBintangDinamis();
    resetIdleTimer();
};
document.onclick = resetIdleTimer;
document.ontouchstart = resetIdleTimer;
document.oninput = resetIdleTimer;

function goToStep(stepNumber) {
    document.querySelectorAll('.step').forEach(step => step.classList.remove('active'));
    document.getElementById('step-' + stepNumber).classList.add('active');
}

function validasiBiodata() {
    const nama = document.getElementById('input-nama').value.trim();
    const usia = document.getElementById('input-usia').value.trim();
    const gender = document.getElementById('input-gender').value;
    const pendidikan = document.getElementById('input-pendidikan').value;
    const pekerjaan = document.getElementById('input-pekerjaan').value;

    if (!nama || !usia || !gender || !pendidikan || !pekerjaan) {
        alert("Mohon lengkapi semua kolom data diri Anda terlebih dahulu.");
        return;
    }

    dataSurvey.nama = nama;
    dataSurvey.usia = usia;
    dataSurvey.gender = gender;
    dataSurvey.pendidikan = pendidikan;
    dataSurvey.pekerjaan = pekerjaan;

    if (dataSurvey.layanan !== '') {
        pertanyaanSaatIni = 0;
        dataSurvey.jawaban = [];
        tampilkanPertanyaan();
        goToStep(3); 
    } else {
        goToStep(2); 
    }
}

function validasiLayanan() {
    const layananPilihan = document.getElementById('input-layanan').value;
    
    if (!layananPilihan) {
        alert("Mohon pilih gerai layanan yang Anda kunjungi terlebih dahulu.");
        return;
    }

    dataSurvey.layanan = layananPilihan;
    pertanyaanSaatIni = 0;
    dataSurvey.jawaban = [];
    
    tampilkanPertanyaan();
    goToStep(3); 
}

function tampilkanPertanyaan() {
    document.getElementById('teks-indikator').innerText = `Pertanyaan ${pertanyaanSaatIni + 1} dari 9`;
    document.getElementById('teks-pertanyaan').innerText = daftarPertanyaan[pertanyaanSaatIni];
    const persentase = (pertanyaanSaatIni / 9) * 100;
    document.getElementById('progress-bar').style.width = `${persentase}%`;
}

function jawabPertanyaan(nilai) {
    dataSurvey.jawaban.push(nilai);
    
    const btnContainer = event.currentTarget;
    const svg = btnContainer.querySelector('svg');
    const label = btnContainer.querySelector('.rating-label');
    
    svg.style.fill = '#F59E0B';
    svg.style.filter = 'drop-shadow(0 4px 8px rgba(245, 158, 11, 0.4))';
    label.style.color = '#F59E0B';
    
    setTimeout(() => {
        svg.style.fill = '';
        svg.style.filter = '';
        label.style.color = '';
        
        pertanyaanSaatIni++;
        if (pertanyaanSaatIni < 9) {
            tampilkanPertanyaan();
        } else {
            document.getElementById('progress-bar').style.width = '100%';
            goToStep(4); 
        }
    }, 250); 
}

function submitSurvey() {
    if (window.location.protocol === 'file:') {
        alert("AKSES DITOLAK: Aplikasi sedang dijalankan secara lokal (Offline). Pengiriman data diwajibkan menggunakan tautan resmi (Online).");
        return;
    }

    const inputSaran = document.getElementById('input-saran');
    dataSurvey.saran = inputSaran ? inputSaran.value.trim() : '';
    
    let payload = {
        nama: dataSurvey.nama,
        usia: dataSurvey.usia,
        gender: dataSurvey.gender,
        pendidikan: dataSurvey.pendidikan,
        pekerjaan: dataSurvey.pekerjaan,
        layanan: dataSurvey.layanan,
        saran: dataSurvey.saran,
        nilai_skm: dataSurvey.jawaban.join(', ')
    };

    const btn = document.getElementById('btn-kirim');
    if (btn) { 
        btn.innerText = "Mengirim Data..."; 
        btn.disabled = true; 
    }

    fetch(scriptURL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
    })
    .then(response => {
        goToStep(5); 
        setTimeout(() => { resetSurvey(); }, 4000);
    })
    .catch(error => {
        alert("Gagal terhubung ke server. Silakan periksa koneksi internet Anda.");
        if (btn) { 
            btn.innerText = "Kirim Penilaian SKM"; 
            btn.disabled = false; 
        }
    });
}

function resetSurvey() {
    document.getElementById('input-nama').value = '';
    document.getElementById('input-usia').value = '';
    document.getElementById('input-gender').value = '';
    document.getElementById('input-pendidikan').value = '';
    document.getElementById('input-pekerjaan').value = '';
    
    if (!geraiTerdeteksi) {
        document.getElementById('input-layanan').value = '';
        dataSurvey.layanan = '';
    }
    
    const inputSaran = document.getElementById('input-saran');
    if(inputSaran) inputSaran.value = '';
    
    goToStep(1);
}