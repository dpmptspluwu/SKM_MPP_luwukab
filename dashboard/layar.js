const urlServer = 'https://script.google.com/macros/s/AKfycbzF4rwH5n9TZPdj_Li56nOSqs8YROXTiTeU3oxA934Fyk1H46ZJEIZmBalvIc2dQ0jA/exec';
let memoriResponden = -1; 
let selisihWaktuServer = 0;
const namaUnsur = [
    "Kesesuaian Persyaratan", "Kemudahan Prosedur", "Kecepatan Waktu", 
    "Kewajaran Biaya/Tarif", "Kesesuaian Produk", "Kompetensi Petugas", 
    "Perilaku & Kesopanan", "Kualitas Sarana & Prasarana", "Penanganan Pengaduan"
];

function inisiasiLayarUnsur() {
    const container = document.getElementById('unsur-container');
    container.innerHTML = '';
    for (let i = 0; i < 9; i++) {
        container.innerHTML += `
            <div class="unsur-item">
                <div class="unsur-header">
                    <div class="unsur-nama">${i + 1}. ${namaUnsur[i]}</div>
                    <div class="unsur-nilai" id="u-val-${i}">0.00</div>
                </div>
                <div class="bar-bg"><div class="bar-fill" id="u-bar-${i}"></div></div>
            </div>
        `;
    }
}

function tarikDataLayar() {
    fetch(urlServer + '?action=public_summary')
        .then(response => response.json())
        .then(data => {
            if (data && !data.error) {
                if (data.waktu_server) {
                    selisihWaktuServer = data.waktu_server - Date.now();
                }

                const elTotal = document.getElementById('lyr-total');
                const elIndeks = document.getElementById('lyr-indeks');
                
                if (memoriResponden !== -1 && data.total > memoriResponden) {
                    elTotal.classList.remove('update-flash');
                    elIndeks.classList.remove('update-flash');
                    void elTotal.offsetWidth;
                    elTotal.classList.add('update-flash');
                    elIndeks.classList.add('update-flash');
                }
                memoriResponden = data.total;

                elTotal.innerText = data.total;
                elIndeks.innerText = data.indeks;
                document.getElementById('lyr-huruf').innerText = data.mutu;
                document.getElementById('lyr-teksmutu').innerText = data.teks_mutu;
                
                const elPeriode = document.getElementById('lyr-periode');
                if (elPeriode && data.periode) {
                    elPeriode.innerText = data.periode;
                }
                
                document.getElementById('lyr-gender').innerText = data.demografi.laki + ' / ' + data.demografi.perempuan;
                document.getElementById('lyr-pend').innerText = data.demografi.pendidikan;
                document.getElementById('lyr-pek').innerText = data.demografi.pekerjaan;

                for (let i = 0; i < 9; i++) {
                    const nilaiUnsur = data.unsur[i] || 0;
                    document.getElementById(`u-val-${i}`).innerText = nilaiUnsur;
                    document.getElementById(`u-bar-${i}`).style.width = nilaiUnsur + '%';
                    const barEl = document.getElementById(`u-bar-${i}`);
                    if (nilaiUnsur < 76.61) {
                        barEl.style.background = 'linear-gradient(90deg, #F59E0B, #FBBF24)';
                    } else {
                        barEl.style.background = 'linear-gradient(90deg, #10B981, #34D399)';
                    }
                }

                if (data.gerai && data.gerai.length > 0) {
                    let teksGerai = data.gerai.map(g => 
                        `<div class="ticker-item">
                            ${g.nama} : <span class="ticker-val">${g.nilai}</span> 
                            <span style="font-size: 12px; color: #64748B; margin-left: 6px; font-weight: 600; text-transform: none;">
                                (${g.responden} Responden)
                            </span>
                        </div>`
                    ).join('');
                    document.getElementById('gerai-ticker').innerHTML = teksGerai;
                }
            }
        })
        .catch(err => console.error("Sinkronisasi gagal", err));
}

inisiasiLayarUnsur();
tarikDataLayar();
setInterval(tarikDataLayar, 10000);

function jalankanJam() {
    const elJam = document.getElementById('jam-live');
    if (!elJam) return; 
    
    setInterval(() => {
        const waktuSaatIni = new Date(Date.now() + selisihWaktuServer);
        
        const jam = String(waktuSaatIni.getHours()).padStart(2, '0');
        const menit = String(waktuSaatIni.getMinutes()).padStart(2, '0');
        const detik = String(waktuSaatIni.getSeconds()).padStart(2, '0');
        
        elJam.innerText = `${jam}:${menit}:${detik}`;
    }, 1000);
}

jalankanJam();

document.addEventListener('contextmenu', e => e.preventDefault());
document.onkeydown = e => {
    if (e.keyCode === 123) return false;
    if (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) return false;
    if (e.ctrlKey && e.keyCode === 85) return false;
};

setTimeout(function() {
    window.location.reload(true);
}, 43200000);