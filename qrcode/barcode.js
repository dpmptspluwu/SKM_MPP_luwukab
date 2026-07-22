const BASE_URL = "https://dpmptspluwu.github.io/SKM_MPP_luwukab/";

const daftarGerai = [
    "DISDUKCAPIL", "SAMSAT", "BAPENDA", "BPJS KESEHATAN", 
    "BPJS KETENAGAKERJAAN", "DPMPTSP", "IMIGRASI", "KPP PRATAMA", 
    "BANK SULSELBAR", "DINAS KESEHATAN", "DISNAKERTRANS", "PDAM", 
    "DINAS PUTR", "DINAS PERIKANAN", "KOMINFO", "DINAS SOSIAL", 
    "KEJAKSAAN NEGERI", "BPS", "DEKRANASDA", "PT ALIYAH", 
    "PT NATA ENVINUSA", "HAS INT. CENTER"
];

const selectElement = document.getElementById('pilih-gerai');
const namaGeraiTampil = document.getElementById('nama-gerai-tampil');
const qrCanvas = document.getElementById('qr-canvas');

let qrGenerator = new QRious({
    element: qrCanvas,
    size: 300,
    level: 'H'
});

daftarGerai.forEach(gerai => {
    const option = document.createElement('option');
    option.value = gerai;
    option.innerText = gerai;
    selectElement.appendChild(option);
});

function buatBarcode() {
    const geraiPilihan = selectElement.value;
    if (!geraiPilihan) return;

    namaGeraiTampil.innerText = geraiPilihan;
    const urlKhusus = BASE_URL + "?gerai=" + encodeURIComponent(geraiPilihan);
    qrGenerator.value = urlKhusus;
}

function ubahSkala() {
    const nilai = document.getElementById('input-skala').value;
    document.getElementById('angka-skala').innerText = nilai;
    document.documentElement.style.setProperty('--skala', nilai / 100);
}

function ubahOrientasi() {
    const orientasi = document.getElementById('pilih-orientasi').value;
    const wrapper = document.getElementById('bingkai-cetak');
    let stylePrint = document.getElementById('print-style');

    if (!stylePrint) {
        stylePrint = document.createElement('style');
        stylePrint.id = 'print-style';
        document.head.appendChild(stylePrint);
    }

    if (orientasi === 'landscape') {
        wrapper.classList.add('layout-landscape');
        stylePrint.innerHTML = '@media print { @page { size: A4 landscape; } }';
    } else {
        wrapper.classList.remove('layout-landscape');
        stylePrint.innerHTML = '@media print { @page { size: A4 portrait; } }';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    ubahOrientasi();
});

qrGenerator.value = BASE_URL;