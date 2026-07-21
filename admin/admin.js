const scriptURL = 'https://script.google.com/macros/s/AKfycbzF4rwH5n9TZPdj_Li56nOSqs8YROXTiTeU3oxA934Fyk1H46ZJEIZmBalvIc2dQ0jA/exec';

let dataGlobal = [];

window.onload = () => {
    tarikDataServer();
};

function tarikDataServer() {
    fetch(scriptURL)
        .then(response => response.json())
        .then(data => {
            if (data.status === "sukses") {
                dataGlobal = data.data;
                prosesDataDanRender();
            } else {
                alert("Gagal membaca data dari server.");
            }
        })
        .catch(error => {
            alert("Terjadi kesalahan jaringan.");
        });
}

function prosesDataDanRender() {
    document.getElementById('loader').style.display = 'none';
    document.getElementById('dashboard-content').style.display = 'block';

    let totalIndeks = 0;
    let hitungGerai = {};
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';

    dataGlobal.forEach(row => {
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

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row['Tanggal']}</td>
            <td>${row['Nama']}<br><span style="font-size:12px; color:#64748B;">${row['Pekerjaan']}</span></td>
            <td><strong style="color:#1E3A8A;">${namaLayanan}</strong></td>
            <td>${nilaiIndeksResponden.toFixed(1)}</td>
            <td style="max-width: 250px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                ${row['Saran'] || '-'}
            </td>
        `;
        tbody.appendChild(tr);
    });

    const totalResponden = dataGlobal.length;
    document.getElementById('kpi-total').innerText = totalResponden;
    
    if (totalResponden > 0) {
        document.getElementById('kpi-indeks').innerText = (totalIndeks / totalResponden).toFixed(2);
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
    new Chart(ctx, {
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

function eksporKeCSV() {
    if (dataGlobal.length === 0) return alert("Belum ada data untuk diunduh.");

    let csvContent = "data:text/csv;charset=utf-8,";
    const header = Object.keys(dataGlobal[0]);
    csvContent += header.join(",") + "\r\n";

    dataGlobal.forEach(row => {
        let barisData = header.map(kunci => {
            let isi = row[kunci] || "";
            isi = isi.toString().replace(/"/g, '""');
            if (isi.search(/("|,|\n)/g) >= 0) {
                isi = `"${isi}"`;
            }
            return isi;
        });
        csvContent += barisData.join(",") + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Laporan_SKM_MPP_Luwu.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
