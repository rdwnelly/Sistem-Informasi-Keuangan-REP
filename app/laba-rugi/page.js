'use client';
import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { exportToCSV } from '@/lib/export';
import { TrendingUp, TrendingDown, DollarSign, RefreshCw, Download } from 'lucide-react';

export default function LabaRugiPage() {
  const [pendapatan, setPendapatan] = useState([]);
  const [biaya, setBiaya] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLabaRugi = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'akun'));
      const dataPendapatan = [];
      const dataBiaya = [];

      querySnapshot.forEach((doc) => {
        const akun = { id: doc.id, ...doc.data() };
        if (akun.tipe === 'Pendapatan') {
          dataPendapatan.push(akun);
        } else if (akun.tipe === 'Biaya') {
          dataBiaya.push(akun);
        }
      });

      dataPendapatan.sort((a, b) => b.saldo - a.saldo);
      dataBiaya.sort((a, b) => b.saldo - a.saldo);

      setPendapatan(dataPendapatan);
      setBiaya(dataBiaya);
    } catch (error) {
      console.error("Gagal memuat data Laba Rugi:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabaRugi();
  }, []);

  const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', minimumFractionDigits: 0
    }).format(angka);
  };

  const totalPendapatan = pendapatan.reduce((sum, item) => sum + (item.saldo || 0), 0);
  const totalBiaya = biaya.reduce((sum, item) => sum + (item.saldo || 0), 0);
  const labaBersih = totalPendapatan - totalBiaya;

  // --- FUNGSI EKSPOR CSV ---
  const handleExportCSV = () => {
    // Siapkan array data mentah yang rapi untuk di-export ke Excel
    const dataEkspor = [];

    // Memasukkan data pendapatan
    pendapatan.forEach(item => {
      dataEkspor.push({
        Kategori: 'Pendapatan',
        Nama_Akun: item.nama,
        Nominal: item.saldo || 0
      });
    });

    // Memasukkan data biaya
    biaya.forEach(item => {
      dataEkspor.push({
        Kategori: 'Biaya',
        Nama_Akun: item.nama,
        Nominal: item.saldo || 0
      });
    });

    // Menambahkan baris ringkasan di paling bawah
    dataEkspor.push({ Kategori: 'RINGKASAN', Nama_Akun: 'Total Pendapatan', Nominal: totalPendapatan });
    dataEkspor.push({ Kategori: 'RINGKASAN', Nama_Akun: 'Total Biaya', Nominal: totalBiaya });
    dataEkspor.push({ Kategori: 'RINGKASAN', Nama_Akun: 'LABA BERSIH', Nominal: labaBersih });

    const tanggalHariIni = new Date().toISOString().split('T')[0];
    exportToCSV(dataEkspor, `Laporan_Laba_Rugi_REP_${tanggalHariIni}`);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan Laba Rugi</h1>
          <p className="text-gray-500 mt-1">Evaluasi performa keuangan unit usaha Yayasan Rumah Etnik Papua.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchLabaRugi}
            disabled={loading}
            className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-gray-200 shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Segarkan
          </button>
          
          {/* Tombol Ekspor CSV */}
          <button 
            onClick={handleExportCSV}
            disabled={loading || (pendapatan.length === 0 && biaya.length === 0)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Ekspor CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border border-gray-100 shadow-sm">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-4" />
          <p className="text-gray-500 font-medium">Mengkalkulasi Laba Rugi...</p>
        </div>
      ) : (
        <>
          {/* Kartu Ringkasan (Tetap sama seperti sebelumnya) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-100 text-green-600"><TrendingUp className="w-6 h-6" /></div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Pendapatan</p>
                <h3 className="text-xl font-bold text-gray-900 mt-1">{formatRupiah(totalPendapatan)}</h3>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="p-3 rounded-full bg-red-100 text-red-600"><TrendingDown className="w-6 h-6" /></div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Biaya</p>
                <h3 className="text-xl font-bold text-gray-900 mt-1">{formatRupiah(totalBiaya)}</h3>
              </div>
            </div>
            <div className={`p-6 rounded-xl border shadow-sm flex items-center gap-4 ${labaBersih >= 0 ? 'bg-blue-600 border-blue-700 text-white' : 'bg-red-600 border-red-700 text-white'}`}>
              <div className={`p-3 rounded-full ${labaBersih >= 0 ? 'bg-blue-500' : 'bg-red-500'}`}>
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-white/80">Laba Bersih Operasional</p>
                <h3 className="text-2xl font-bold mt-1">{formatRupiah(labaBersih)}</h3>
              </div>
            </div>
          </div>

          {/* Tabel Rincian (Tetap sama seperti sebelumnya) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-100"><h2 className="text-lg font-bold text-gray-800">Rincian Pendapatan</h2></div>
              <ul className="divide-y divide-gray-100">
                {pendapatan.map((item) => (
                  <li key={item.id} className="px-6 py-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                    <span className="text-sm text-gray-700">{item.nama}</span>
                    <span className="text-sm font-semibold text-green-600">{formatRupiah(item.saldo || 0)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-100"><h2 className="text-lg font-bold text-gray-800">Rincian Biaya</h2></div>
              <ul className="divide-y divide-gray-100">
                {biaya.map((item) => (
                  <li key={item.id} className="px-6 py-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                    <span className="text-sm text-gray-700">{item.nama}</span>
                    <span className="text-sm font-semibold text-red-600">{formatRupiah(item.saldo || 0)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}