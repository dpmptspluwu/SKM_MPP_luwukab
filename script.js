const scriptURL = 'https://script.google.com/macros/s/AKfycbzF4rwH5n9TZPdj_Li56nOSqs8YROXTiTeU3oxA934Fyk1H46ZJEIZmBalvIc2dQ0jA/exec';

const daftarSoal = [
    { tanya: "Bagaimana pendapat Anda tentang kesesuaian persyaratan pelayanan dengan jenis pelayanannya?", opsi: ["Tidak Sesuai", "Kurang Sesuai", "Sesuai", "Sangat Sesuai"] },
    { tanya: "Bagaimana pemahaman Anda tentang kemudahan prosedur pelayanan di unit ini?", opsi: ["Tidak Mudah", "Kurang Mudah", "Mudah", "Sangat Mudah"] },
    { tanya: "Bagaimana pendapat Anda tentang kecepatan waktu dalam memberikan pelayanan?", opsi: ["Tidak Cepat", "Kurang Cepat", "Cepat", "Sangat Cepat"] },
    { tanya: "Bagaimana pendapat Anda tentang kewajaran biaya atau tarif dalam pelayanan?", opsi: ["Tidak Wajar", "Kurang Wajar", "Wajar", "Sangat Wajar / Gratis"] },
    { tanya: "Bagaimana pendapat Anda tentang kesesuaian produk pelayanan antara yang tercantum dalam standar pelayanan dengan hasil yang diberikan?", opsi: ["Selalu Tidak Sesuai", "Kadang-kadang Sesuai", "Banyak Sesuai", "Selalu Sesuai"] },
    { tanya: "Bagaimana pendapat Anda tentang kompetensi atau kemampuan petugas dalam memberikan pelayanan?", opsi: ["Tidak Kompeten", "Kurang Kompeten", "Kompeten", "Sangat Kompeten"] },
    { tanya: "Bagaimana pendapat Anda tentang perilaku, kesopanan, dan keramahan petugas dalam memberikan pelayanan?", opsi: ["Tidak Sopan & Ramah", "Kurang Sopan & Ramah", "Sopan & Ramah", "Sangat Sopan & Ramah"] },
    { tanya: "Bagaimana pendapat Anda tentang kualitas sarana dan prasarana di unit pelayanan ini?", opsi: ["Buruk", "Cukup", "Baik", "Sangat Baik"] },
    { tanya: "Bagaimana pendapat Anda tentang penanganan, tindak lanjut, dan penyelesaian pengaduan pengguna layanan?", opsi: ["Tidak Baik", "Kurang Baik", "Baik", "Sangat Baik"] }
];

let dataSurvey = { nama: '', usia: '', gender: '', pendidikan: '', pekerjaan: '', layanan: '', jawaban: [], saran: '' };
let indeksSoal = 0;
let jawabanSementara = null;
let idleTimer;

const urlParams = new URLSearchParams(window.location.search);
const geraiTerdeteksi = urlParams.get('gerai');
if (geraiTerdeteksi) dataSurvey.layanan = geraiTerdeteksi;

function resetIdleTimer() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { resetSurvey(); }, 60000);
}

window.onload = () => { resetIdleTimer(); };
document.onclick = resetIdleTimer;
document.ontouchstart = resetIdleTimer;
document.oninput = resetIdleTimer;
document.onmousemove = resetIdleTimer;
document.onkeyup = resetIdleTimer;

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
    const usiaAngka = parseInt(usia);
    if (isNaN(usiaAngka) || usiaAngka < 10 || usiaAngka > 100) {
        alert("Mohon masukkan usia yang valid.");
        return;
    }
    dataSurvey.nama = nama;
    dataSurvey.usia = usiaAngka;
    dataSurvey.gender = gender;
    dataSurvey.pendidikan = pendidikan;
    dataSurvey.pekerjaan = pekerjaan;
    if (dataSurvey.layanan !== '') {
        indeksSoal = 0;
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
    indeksSoal = 0;
    dataSurvey.jawaban = [];
    tampilkanPertanyaan();
    goToStep(3);
}

function tampilkanPertanyaan() {
    const soalSaatIni = daftarSoal[indeksSoal];
    document.getElementById('teks-indikator').innerText = `Pertanyaan ${indeksSoal + 1} dari 9`;
    document.getElementById('teks-pertanyaan').innerText = soalSaatIni.tanya;
    document.getElementById('progress-bar').style.width = `${(indeksSoal / 9) * 100}%`;
    jawabanSementara = dataSurvey.jawaban[indeksSoal] || null;
    const areaOpsi = document.getElementById('area-opsi-jawaban');
    areaOpsi.innerHTML = '';
    soalSaatIni.opsi.forEach((teksOpsi, idx) => {
        const nilai = idx + 1;
        const isTerpilih = (jawabanSementara === nilai) ? 'selected' : '';
        areaOpsi.innerHTML += `<button class="btn-option ${isTerpilih}" onclick="pilihJawaban(${nilai}, this)"><div class="radio-circle"><div class="radio-inner"></div></div><span>${teksOpsi}</span></button>`;
    });
}

function pilihJawaban(nilai, elemenTombol) {
    jawabanSementara = nilai;
    document.querySelectorAll('.btn-option').forEach(btn => btn.classList.remove('selected'));
    elemenTombol.classList.add('selected');
}

function lanjutPertanyaan() {
    if (!jawabanSementara) {
        alert("Kolom ini wajib diisi. Silakan pilih salah satu jawaban.");
        return;
    }
    dataSurvey.jawaban[indeksSoal] = jawabanSementara;
    if (indeksSoal < 8) {
        indeksSoal++;
        tampilkanPertanyaan();
    } else {
        document.getElementById('progress-bar').style.width = '100%';
        goToStep(4);
    }
}

function mundurPertanyaan() {
    if (indeksSoal > 0) {
        indeksSoal--;
        tampilkanPertanyaan();
    } else {
        goToStep(geraiTerdeteksi ? 1 : 2);
    }
}

function kembaliKePertanyaanTerakhir() {
    indeksSoal = 8;
    tampilkanPertanyaan();
    goToStep(3);
}

function submitSurvey() {
    const btn = document.getElementById('btn-kirim');
    if (btn && btn.disabled) return;
    if (window.location.protocol === 'file:') {
        alert("Aplikasi harus dijalankan melalui server/hosting.");
        return;
    }
    const inputSaran = document.getElementById('input-saran');
    dataSurvey.saran = inputSaran ? inputSaran.value.trim() : '';
    let payload = {
        nama: dataSurvey.nama, usia: dataSurvey.usia, gender: dataSurvey.gender,
        pendidikan: dataSurvey.pendidikan, pekerjaan: dataSurvey.pekerjaan,
        layanan: dataSurvey.layanan, saran: dataSurvey.saran,
        nilai_skm: dataSurvey.jawaban.join(', ')
    };
    if (btn) { btn.innerText = "Mengirim Data..."; btn.disabled = true; }
    fetch(scriptURL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === "sukses") { goToStep(5); }
        else { alert("Data gagal tersimpan. Silakan coba lagi."); btn.innerText = "Kirim Survei"; btn.disabled = false; }
    })
    .catch(error => { alert("Gagal terhubung ke server. Silakan periksa koneksi internet Anda."); btn.innerText = "Kirim Survei"; btn.disabled = false; });
}

function resetSurvey() {
    document.getElementById('input-nama').value = '';
    document.getElementById('input-usia').value = '';
    document.getElementById('input-gender').value = '';
    document.getElementById('input-pendidikan').value = '';
    document.getElementById('input-pekerjaan').value = '';
    if (!geraiTerdeteksi) { document.getElementById('input-layanan').value = ''; dataSurvey.layanan = ''; }
    const inputSaran = document.getElementById('input-saran');
    if(inputSaran) inputSaran.value = '';
    const btn = document.getElementById('btn-kirim');
    if (btn) { btn.innerText = "Kirim Survei"; btn.disabled = false; }
    goToStep(0);
}