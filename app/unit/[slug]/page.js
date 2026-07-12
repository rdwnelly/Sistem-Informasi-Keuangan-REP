'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Store, TrendingUp, TrendingDown, DollarSign, RefreshCw, Activity } from 'lucide-react';

// Konfigurasi pemetaan akun berdasarkan unit usaha (Sesuai Excel REP)
const UNIT_CONFIG = {
  'cafe': { 
    nama: 'Yaswar Cafe', 
    akunPendapatan: ['Pendapatan Yaswar Cafe'], 
    akunBiaya: ['Biaya Cafe', 'Biaya Makan Karyawan'] 
  },
  'sovenir': { 
    nama: 'Toko Sovenir', 
    akunPendapatan: ['Pendapatan Toko Sovenir'], 
    akunBiaya: ['Biaya Toko', 'PERSEDIAAN TOKO'] 
  },
  'kostum': { 
    nama: 'Penyewaan Kostum', 
    akunPendapatan: ['Pendapatan Kostum Masuk'], 
    akunBiaya: ['Biaya Kostum'] 
  },
  'kios': { 
    nama: 'Kios REP', 
    akunPendapatan: ['Pendapatan Kios'], 
    akunBiaya: ['Biaya Kios'] 
  },
  'homestay': { 
    nama: 'Homestay REP', 
    // Catatan: Jika akun homestay belum ada di Excel, kita siapkan array kosong
    // Nantinya otomatis menyesuaikan jika akun ditambahkan ke database
    akunPendapatan: [], 
    akunBiaya: ['Biaya Listrik', 'Biaya Wifi'] 
  }
};

export default function UnitUsahaPage() {
  const { slug } = useParams();
  const config = UNIT_CONFIG[slug];

  const dateNow = new Date();
  const [filterBulan, setFilterBulan] = useState(dateNow.getMonth() + 1);
  const [filterTahun, setFilterTahun] = useState(dateNow.getFullYear());

  const [dataUnit, setDataUnit] = useState({
    pendapatan: [],
    biaya: [],
    totalPendapatan: 0,
    totalBiaya: 0,
    labaBersih: 0
  });
  const [transaksiUnit, setTransaksiUnit] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUnitData = useCallback(async () => {
    if (!config) return; // Jika URL tidak valid, hentikan fungsi
    setLoading(true);

    try {
      // 1. Ambil Kerangka Semua Akun Khusus Unit Ini
      const akunSnapshot = await getDocs(collection(db, 'akun'));
      const mapAkunUnit = {};

      akunSnapshot.forEach((doc) => {
        const data = doc.data();
        if (config.akunPendapatan.includes(data.nama) || config.akunBiaya.includes(data.nama)) {
          mapAkunUnit[data.nama] = { id: doc.id, ...data, calculatedSaldo: 0 };
        }
      });

      // 2. Ambil Riwayat Jurnal khusus
      const qJurnal = query(collection(db, 'jurnal'), orderBy('timestamp', 'asc'));
      const jurnalSnapshot = await getDocs(qJurnal);
      const riwayatTransaksi = [];

      jurnalSnapshot.forEach((doc) => {
        const trx = { id: doc.id, ...doc.data() };
        
        if (trx.tanggal) {
          const trxDate = new Date(trx.tanggal);
          const trxBulan = trxDate.getMonth() + 1;
          const trxTahun = trxDate.getFullYear();

          if (filterBulan !== 0 && trxBulan !== filterBulan) return;
          if (filterTahun !== 0 && trxTahun !== filterTahun) return;
        }

        const nominal = Number(trx.nominal) || 0;
        let isTerkait = false;

        // Proses mutasi jika akun terkait dengan unit ini
        if (trx.akunDebit && mapAkunUnit[trx.akunDebit.nama]) {
           const namaAkun = trx.akunDebit.nama;
           // Normal balance Biaya bertambah di Debit
           if (config.akunBiaya.includes(namaAkun)) mapAkunUnit[namaAkun].calculatedSaldo += nominal;
           // Pendapatan berkurang di Debit
           if (config.akunPendapatan.includes(namaAkun)) mapAkunUnit[namaAkun].calculatedSaldo -= nominal;
           isTerkait = true;
        }

        if (trx.akunKredit && mapAkunUnit[trx.akunKredit.nama]) {
           const namaAkun = trx.akunKredit.nama;
           // Biaya berkurang di Kredit
           if (config.akunBiaya.includes(namaAkun)) mapAkunUnit[namaAkun].calculatedSaldo -= nominal;
           // Normal balance Pendapatan bertambah di Kredit
           if (config.akunPendapatan.includes(namaAkun)) mapAkunUnit[namaAkun].calculatedSaldo += nominal;
           isTerkait = true;
        }
        
        if (isTerkait) {
           riwayatTransaksi.unshift(trx); // Masukkan ke awal agar urutan descending (terbaru di atas)
        }
      });

      let tPendapatan = 0;
      let tBiaya = 0;
      const listPendapatan = [];
      const listBiaya = [];

      Object.values(mapAkunUnit).forEach(akun => {
        if (config.akunPendapatan.includes(akun.nama)) {
           listPendapatan.push(akun);
           tPendapatan += akun.calculatedSaldo;
        } else if (config.akunBiaya.includes(akun.nama)) {
           listBiaya.push(akun);
           tBiaya += akun.calculatedSaldo;
        }
      });

      setDataUnit({
        pendapatan: listPendapatan,
        biaya: listBiaya,
        totalPendapatan: tPendapatan,
        totalBiaya: tBiaya,
        labaBersih: tPendapatan - tBiaya
      });

      setTransaksiUnit(riwayatTransaksi);

    } catch (error) {
      console.error(`Gagal memuat data unit ${config.nama}:`, error);
    } finally {
      setLoading(false);
    }
  }, [config, filterBulan, filterTahun]);

  useEffect(() => {
    fetchUnitData();
  }, [fetchUnitData]);

  // Handle URL yang tidak valid
  if (!config) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Store className="w-16 h-16 text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold text-gray-800">Unit Usaha Tidak Ditemukan</h1>
        <p className="text-gray-500 mt-2">Pastikan URL rute sudah benar.</p>
      </div>
    );
  }

  const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', minimumFractionDigits: 0
    }).format(angka);
  };

  const formatTanggal = (tanggalString) => {
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return new Date(tanggalString).toLocaleDateString('id-ID', options);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg text-papua-primary">
              <Store className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-papua-primary">{config.nama}</h1>
          </div>
          <p className="text-gray-500">Laporan performa dan arus kas unit usaha operasional.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex bg-white border border-gray-200 rounded-lg shadow-sm">
            <select
              value={filterBulan}
              onChange={(e) => setFilterBulan(Number(e.target.value))}
              className="bg-transparent px-3 py-2 text-sm text-gray-700 outline-none border-r border-gray-200 cursor-pointer"
            >
              <option value={0}>Semua Bulan</option>
              <option value={1}>Januari</option>
              <option value={2}>Februari</option>
              <option value={3}>Maret</option>
              <option value={4}>April</option>
              <option value={5}>Mei</option>
              <option value={6}>Juni</option>
              <option value={7}>Juli</option>
              <option value={8}>Agustus</option>
              <option value={9}>September</option>
              <option value={10}>Oktober</option>
              <option value={11}>November</option>
              <option value={12}>Desember</option>
            </select>
            <select
              value={filterTahun}
              onChange={(e) => setFilterTahun(Number(e.target.value))}
              className="bg-transparent px-3 py-2 text-sm text-gray-700 outline-none cursor-pointer"
            >
              <option value={0}>Semua Tahun</option>
              {[2024, 2025, 2026, 2027].map(thn => (
                <option key={thn} value={thn}>{thn}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={fetchUnitData}
            disabled={loading}
            className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-gray-200 shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Segarkan
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border border-gray-100 shadow-sm">
          <RefreshCw className="w-8 h-8 text-papua-accent animate-spin mb-4" />
          <p className="text-gray-500 font-medium">Memuat performa unit...</p>
        </div>
      ) : (
        <>
          {/* Kartu Ringkasan Performa */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-full bg-papua-green/20 text-papua-green"><TrendingUp className="w-5 h-5" /></div>
                <p className="text-sm font-medium text-gray-500">Total Pendapatan Unit</p>
              </div>
              <h3 className="text-2xl font-bold text-papua-primary">{formatRupiah(dataUnit.totalPendapatan)}</h3>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-full bg-papua-red/20 text-papua-red"><TrendingDown className="w-5 h-5" /></div>
                <p className="text-sm font-medium text-gray-500">Total Biaya & Pengeluaran</p>
              </div>
              <h3 className="text-2xl font-bold text-papua-primary">{formatRupiah(dataUnit.totalBiaya)}</h3>
            </div>

            <div className={`p-6 rounded-xl border shadow-sm flex flex-col justify-center ${dataUnit.labaBersih >= 0 ? 'bg-papua-primary border-blue-700 text-white' : 'bg-papua-red border-papua-red text-white'}`}>
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-full ${dataUnit.labaBersih >= 0 ? 'bg-papua-accent/100' : 'bg-papua-red/100'}`}>
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <p className="text-sm font-medium text-white/80">Kontribusi Laba Bersih</p>
              </div>
              <h3 className="text-3xl font-bold">{formatRupiah(dataUnit.labaBersih)}</h3>
            </div>
          </div>

          {/* Tabel Riwayat Transaksi Unit */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
              <Activity className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-bold text-papua-primary">Aktivitas Transaksi {config.nama}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-white text-gray-600 font-medium border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4">Tanggal</th>
                    <th className="px-6 py-4">Keterangan Jurnal</th>
                    <th className="px-6 py-4">Akun Terlibat</th>
                    <th className="px-6 py-4 text-right">Nominal (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {transaksiUnit.length > 0 ? (
                    transaksiUnit.map((trx) => (
                      <tr key={trx.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                          {formatTanggal(trx.tanggal)}
                        </td>
                        <td className="px-6 py-4 font-medium text-papua-primary">
                          {trx.keterangan}
                        </td>
                        <td className="px-6 py-4 space-y-1">
                          {trx.akunDebit && (
                            <div className="text-xs font-medium text-gray-700"><span className="text-gray-400">D:</span> {trx.akunDebit.nama}</div>
                          )}
                          {trx.akunKredit && (
                            <div className="text-xs font-medium text-gray-700"><span className="text-gray-400">K:</span> {trx.akunKredit.nama}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-papua-primary whitespace-nowrap">
                          {formatRupiah(trx.nominal)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                        Belum ada riwayat transaksi tercatat untuk unit ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}