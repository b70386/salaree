# Salaree

**Dashboard kecukupan upah terhadap kebutuhan sembako di Indonesia.**

Salaree membantu membandingkan UMP/UMK atau gaji bulanan dengan estimasi biaya paket bahan pokok, melihat proporsi upah yang terpakai, dan memahami sisa uang setelah sembako.

> **Status data awal:** repository ini memulai dengan dataset DEMO yang sengaja diberi label simulasi. Angka contoh bukan angka UMP/UMK atau harga pangan aktual dan tidak boleh dipakai untuk keputusan finansial. Integrasi data resmi adalah tahap berikutnya.

## Fitur awal
- Dashboard ringan berbahasa Indonesia, responsif, tanpa framework frontend besar.
- Pilihan wilayah dari dataset lokal.
- Rasio biaya paket sembako terhadap upah, nilai sisa, dan rincian komoditas.
- Kalkulator gaji dengan input upah dan jumlah anggota keluarga.
- API Flask dan database SQLite yang dibuat otomatis.
- Label DEMO yang jelas sampai dataset resmi terverifikasi.

## Menjalankan di Debian/Linux
Python 3.11+ direkomendasikan.

```bash
git clone https://github.com/b70386/salaree.git
cd salaree
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Buka **http://127.0.0.1:7777**. Server secara default hanya bind ke loopback, bukan jaringan LAN.

## Modul AKG (tahap awal)
- Referensi kelompok umur bayi hingga lansia berdasarkan Permenkes RI No. 28 Tahun 2019, mencakup energi, protein, lemak, karbohidrat, serat, dan air.
- Pengguna dapat menjumlahkan target referensi harian berdasarkan komposisi umur/jenis kelamin anggota keluarga.
- GET `/api/akg` menampilkan sumber, metadata, dan profil AKG.
- POST `/api/akg/calculate` menjumlahkan target keluarga; body JSON berbentuk `{"members":[{"profile_id":"laki-laki-19-29","count":1}]}`.
- **Batasan:** modul ini belum menghitung jumlah komoditas yang memenuhi AKG. Hal itu memerlukan basis komposisi pangan per 100 g bagian yang dapat dimakan, faktor hasil masak/retensi zat gizi, ukuran porsi, dan validasi ahli gizi. AKG 2019 juga bukan pengganti penilaian kebutuhan individual. Bayi 0–5 bulan memiliki kebutuhan khusus dan tidak boleh diperlakukan sebagai paket bahan pokok biasa.
- Sumber primer AKG: [Permenkes RI No. 28 Tahun 2019 (PDF resmi)](https://jdih.kemkes.go.id/storage/documents/pdfs/2019permenkes028.pdf). Nilai referensi tabel utama bukan klaim cakupan semua vitamin/mineral.

## Endpoint
- GET /api/health
- GET /api/akg
- POST /api/akg/calculate
- GET /api/regions
- GET /api/summary
- GET /api/regions/<region_id>
- POST /api/calculate

## Sumber data yang direncanakan
Sebelum dipublikasikan sebagai data aktual, tiap record perlu mencatat sumber, tanggal berlaku/pengamatan, satuan, tingkat wilayah, serta status verifikasi.
- UMP/UMK: [Satudata Kemnaker](https://satudata.kemnaker.go.id/) dan keputusan gubernur yang berlaku.
- Harga pangan: [PIHPS Bank Indonesia](https://www.bi.go.id/hargapangan/) dan [Panel Harga Pangan Badan Pangan Nasional](https://panelharga.badanpangan.go.id/).
- Data statistik pendukung: [Badan Pusat Statistik](https://www.bps.go.id/).

Ketersediaan data antarwilayah dan antar-komoditas dapat berbeda. Jangan mengisi data yang hilang dengan nol atau menyamarkan estimasi sebagai data resmi.

## Rumus
- Biaya paket bulanan = jumlah setiap komoditas × harga per satuan.
- Rasio sembako = biaya paket bulanan ÷ upah bulanan × 100%.
- Sisa setelah sembako = upah bulanan − biaya paket bulanan.

Rasio ini hanya membandingkan sembako dengan upah. Sisa bukan tabungan bersih karena belum mengurangi tempat tinggal, transportasi, listrik, kesehatan, pendidikan, pajak, dan kebutuhan lainnya.

## Memasukkan data terverifikasi
Versi awal memuat data/demo_data.json sebagai contoh skema. Saat data resmi disiapkan, ganti record dengan data yang sudah diverifikasi dan ubah is_demo menjadi false hanya jika semua sumber dan tanggalnya telah tercatat dengan benar. Jangan menghapus label demo untuk data simulasi.

## Pengujian
```bash
python -m unittest discover -s tests -v
```

## Lisensi
MIT. Lihat [LICENSE](LICENSE).