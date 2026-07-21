const scriptURL = 'https://script.google.com/macros/s/AKfycbzF4rwH5n9TZPdj_Li56nOSqs8YROXTiTeU3oxA934Fyk1H46ZJEIZmBalvIc2dQ0jA/exec';

let dataGlobal = [];
let dataTampil = [];
let chartInstance = null;

window.onload = () => {
    tarikDataServer();
};

function tarikDataServer() {
    fetch(scriptURL)
        .then(response => response.json())
        .then(data => {
            if (data.status === "sukses") {
                dataGlobal = data.data;
                dataTampil = [...dataGlobal];
                prosesDataDanRender();
            } else {
                alert("Gagal membaca data dari server.");
            }
        })
        .catch(error => {
            alert("Terjadi kesalahan jaringan.");
        });
}

function formatTanggalWaktu(inputStr) {
    if (!inputStr) return '-';
    const d = new Date(inputStr);
    if (isNaN(d.getTime())) return inputStr;
    
    const pad = (n) => String(n).padStart(2, '0');
    const tgl = pad(d.getDate());
    const bln = pad(d.getMonth() + 1);
    const thn = d.getFullYear();
    const jam = pad(d.getHours());
    const mnt = pad(d.getMinutes());
    const dtk = pad(d.getSeconds());
    
    return `${tgl}/${bln}/${thn} ${jam}:${mnt}:${dtk}`;
}

function prosesDataDanRender() {
    document.getElementById('loader').style.display = 'none';
    document.getElementById('dashboard-content').style.display = 'block';

    let totalIndeks = 0;
    let hitungGerai = {};
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';

    dataTampil.forEach((row, index) => {
        let arrayNilai = [];
        if (row['Nilai SKM']) {
            arrayNilai = row['Nilai SKM'].toString().split(',').map(Number);
        }
        
        let nilaiIndeksResponden = 0;
        if (arrayNilai.length > 0) {
            const rataRataBintang = arrayNilai.reduce((a, b) => a + b, 0) / arrayNilai.length;
            nilaiIndeksResponden = (rataRataBintang / 5) * 100;
        }

        totalIndeks += nilaiIndeksResponden;

        const namaLayanan = row['Layanan'] || 'Tidak Diketahui';
        if (!hitungGerai[namaLayanan]) {
            hitungGerai[namaLayanan] = { totalIndeks: 0, jumlah: 0 };
        }
        hitungGerai[namaLayanan].totalIndeks += nilaiIndeksResponden;
        hitungGerai[namaLayanan].jumlah += 1;

        const tanggalFormatRapi = formatTanggalWaktu(row['Tanggal']);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="text-align:center; font-weight:700; color:#6B7280;">${index + 1}</td>
            <td>${tanggalFormatRapi}</td>
            <td>${row['Nama']}<br><span style="font-size:12px; color:#64748B;">${row['Pekerjaan']}</span></td>
            <td><strong style="color:#1E3A8A;">${namaLayanan}</strong></td>
            <td style="text-align:center;">${nilaiIndeksResponden.toFixed(1)}</td>
            <td style="max-width: 250px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                ${row['Saran'] || '-'}
            </td>
        `;
        tbody.appendChild(tr);
    });

    const totalResponden = dataTampil.length;
    document.getElementById('kpi-total').innerText = totalResponden;
    
    if (totalResponden > 0) {
        document.getElementById('kpi-indeks').innerText = (totalIndeks / totalResponden).toFixed(2);
    } else {
        document.getElementById('kpi-indeks').innerText = "0.00";
    }

    let geraiTerbaik = '-';
    let skorTertinggi = 0;
    let labelGrafik = [];
    let dataGrafik = [];

    for (const [gerai, data] of Object.entries(hitungGerai)) {
        const rataRataGerai = data.totalIndeks / data.jumlah;
        labelGrafik.push(gerai);
        dataGrafik.push(rataRataGerai.toFixed(1));

        if (rataRataGerai > skorTertinggi) {
            skorTertinggi = rataRataGerai;
            geraiTerbaik = gerai;
        }
    }

    document.getElementById('kpi-terbaik').innerText = geraiTerbaik;
    renderGrafik(labelGrafik, dataGrafik);
}

function renderGrafik(labels, data) {
    const ctx = document.getElementById('skmChart').getContext('2d');
    if (chartInstance) {
        chartInstance.destroy();
    }
    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Indeks SKM Rata-rata per Gerai',
                data: data,
                backgroundColor: '#3b82f6',
                borderRadius: 6,
                barThickness: 40
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

function terapkanFilter() {
    const tglMulai = document.getElementById('tgl-mulai').value;
    const tglSelesai = document.getElementById('tgl-selesai').value;

    if (!tglMulai || !tglSelesai) {
        alert("Mohon pilih tanggal mulai dan tanggal selesai terlebih dahulu.");
        return;
    }

    const mulai = new Date(tglMulai);
    mulai.setHours(0, 0, 0, 0);
    const selesai = new Date(tglSelesai);
    selesai.setHours(23, 59, 59, 999);

    dataTampil = dataGlobal.filter(row => {
        if (!row['Tanggal']) return false;
        const tanggalRow = new Date(row['Tanggal']);
        return tanggalRow >= mulai && tanggalRow <= selesai;
    });

    prosesDataDanRender();
}

function resetFilter() {
    document.getElementById('tgl-mulai').value = '';
    document.getElementById('tgl-selesai').value = '';
    dataTampil = [...dataGlobal];
    prosesDataDanRender();
}

function eksporKeExcel() {
    if (dataTampil.length === 0) {
        alert("Tidak ada data untuk diexport.");
        return;
    }
    const worksheet = XLSX.utils.json_to_sheet(dataTampil);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data SKM");
    XLSX.writeFile(workbook, "Laporan_SKM_MPP_Luwu.xlsx");
}

function eksporKePDF() {
    if (dataTampil.length === 0) {
        alert("Tidak ada data untuk diexport.");
        return;
    }
    const element = document.getElementById('area-cetak-pdf');
    const opt = {
        margin:       10,
        filename:     'Laporan_SKM_MPP_Luwu.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };
    html2pdf().from(element).set(opt).save();
}
