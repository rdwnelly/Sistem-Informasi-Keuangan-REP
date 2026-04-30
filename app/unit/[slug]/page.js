'use client';
import { useState, useEffect } from 'react';
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
    akunBiaya: ['Biaya Toko', 'Persediaan Toko'] 
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

  const [dataUnit, setDataUnit] = useState({
    pendapatan: [],
    biaya: [],
    totalPendapatan: 0,
    totalBiaya: 0,
    labaBersih: 0
  });
  const [transaksiUnit, setTransaksiUnit] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUnitData = async () => {
    if (!config) return; // Jika URL tidak valid, hentikan fungsi
    setLoading(true);

    try {
      // 1. Ambil data Akun khusus untuk unit ini
      const akunSnapshot = await getDocs(collection(db, 'akun'));
      const listPendapatan = [];
      const listBiaya = [];
      let tPendapatan = 0;
      let tBiaya = 0;

      // Filter akun yang relevan dengan unit ini
      const namaAkunRelevan = [...config.akunPendapatan, ...config.akunBiaya];

      akunSnapshot.forEach((doc) => {
        const akun = { id: doc.id, ...doc.data() };
        if (config.akunPendapatan.includes(akun.nama)) {
          listPendapatan.push(akun);
          tPendapatan += (akun.saldo || 0);
        } else if (config.akunBiaya.includes(akun.nama)) {
          listBiaya.push(akun);
          tBiaya += (akun.saldo || 0);
        }
      });

      setDataUnit({
        pendapatan: listPendapatan,
        biaya: listBiaya,
        totalPendapatan: tPendapatan,
        totalBiaya: tBiaya,
        labaBersih: tPendapatan - tBiaya
      });

      // 2. Ambil Riwayat Jurnal khusus yang melibatkan akun unit ini
      const qJurnal = query(collection(db, 'jurnal'), orderBy('timestamp', 'desc'));
      const jurnalSnapshot = await getDocs(qJurnal);
      const riwayatTransaksi = [];

      jurnalSnapshot.forEach((doc) => {
        const trx = { id: doc.id, ...doc.data() };
        // Cek apakah transaksi ini memengaruhi unit usaha yang sedang dibuka
        const terkaitUnit = namaAkunRelevan.includes(trx.akunDebit?.nama) || namaAkunRelevan.includes(trx.akunKredit?.nama);
        
        if (terkaitUnit) {
          riwayatTransaksi.push(trx);
        }
      });

      setTransaksiUnit(riwayatTransaksi);

    } catch (error) {
      console.error(`Gagal memuat data unit ${config.nama}:`, error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnitData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

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
      <div className="flex justify-between items-end mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-700">
              <Store className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{config.nama}</h1>
          </div>
          <p className="text-gray-500">Laporan performa dan arus kas unit usaha operasional.</p>
        </div>
        <button 
          onClick={fetchUnitData}
          disabled={loading}
          className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-gray-200 shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Segarkan Data
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border border-gray-100 shadow-sm">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-4" />
          <p className="text-gray-500 font-medium">Memuat performa unit...</p>
        </div>
      ) : (
        <>
          {/* Kartu Ringkasan Performa */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-full bg-green-100 text-green-600"><TrendingUp className="w-5 h-5" /></div>
                <p className="text-sm font-medium text-gray-500">Total Pendapatan Unit</p>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{formatRupiah(dataUnit.totalPendapatan)}</h3>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-full bg-red-100 text-red-600"><TrendingDown className="w-5 h-5" /></div>
                <p className="text-sm font-medium text-gray-500">Total Biaya & Pengeluaran</p>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{formatRupiah(dataUnit.totalBiaya)}</h3>
            </div>

            <div className={`p-6 rounded-xl border shadow-sm flex flex-col justify-center ${dataUnit.labaBersih >= 0 ? 'bg-blue-600 border-blue-700 text-white' : 'bg-red-600 border-red-700 text-white'}`}>
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-full ${dataUnit.labaBersih >= 0 ? 'bg-blue-500' : 'bg-red-500'}`}>
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
              <h2 className="text-lg font-bold text-gray-900">Aktivitas Transaksi {config.nama}</h2>
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
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {trx.keterangan}
                        </td>
                        <td className="px-6 py-4 space-y-1">
                          <div className="text-xs font-medium text-gray-700"><span className="text-gray-400">D:</span> {trx.akunDebit.nama}</div>
                          <div className="text-xs font-medium text-gray-700"><span className="text-gray-400">K:</span> {trx.akunKredit.nama}</div>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-gray-900 whitespace-nowrap">
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