'use client';
import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { exportToCSV } from '@/lib/export';
import Link from 'next/link'; // Penting untuk navigasi
import { Wallet, RefreshCw, Layers, Download, ExternalLink } from 'lucide-react';

export default function BukuBesarPage() {
  const [akunData, setAkunData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fungsi mengambil data Buku Besar dari Firestore
  const fetchAkun = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'akun'));
      const data = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      setAkunData(data);
    } catch (error) {
      console.error("Gagal mengambil data Buku Besar:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAkun();
  }, []);

  // Format angka ke Rupiah
  const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(angka);
  };

  // Mengelompokkan data berdasarkan tipe akun
  const groupedAkun = akunData.reduce((acc, curr) => {
    if (!acc[curr.tipe]) acc[curr.tipe] = [];
    acc[curr.tipe].push(curr);
    return acc;
  }, {});

  // Urutan tipe akun sesuai standar akuntansi
  const orderTipe = ['Aset', 'Hutang', 'Modal', 'Pendapatan', 'Biaya'];

  // Fungsi Ekspor CSV Ringkasan Buku Besar
  const handleExportCSV = () => {
    const dataEkspor = [];
    orderTipe.forEach((tipe) => {
      const daftarAkun = groupedAkun[tipe];
      if (daftarAkun && daftarAkun.length > 0) {
        let subtotal = 0;
        daftarAkun.forEach((akun) => {
          dataEkspor.push({
            'Kelompok Akun': tipe,
            'Nama Akun': akun.nama,
            'Saldo Akhir': akun.saldo || 0
          });
          subtotal += (akun.saldo || 0);
        });
        dataEkspor.push({ 'Kelompok Akun': `TOTAL ${tipe.toUpperCase()}`, 'Nama Akun': '', 'Saldo Akhir': subtotal });
        dataEkspor.push({ 'Kelompok Akun': '', 'Nama Akun': '', 'Saldo Akhir': '' }); // Baris kosong pemisah
      }
    });

    const tanggalHariIni = new Date().toISOString().split('T')[0];
    exportToCSV(dataEkspor, `Ringkasan_Buku_Besar_REP_${tanggalHariIni}`);
  };

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Buku Besar</h1>
          <p className="text-gray-500 mt-1">Klik pada nama akun untuk melihat rincian mutasi transaksi (e-Statement).</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={fetchAkun}
            disabled={loading}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-gray-200 shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Segarkan
          </button>

          <button 
            onClick={handleExportCSV}
            disabled={loading || akunData.length === 0}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Ekspor CSV
          </button>
        </div>
      </div>

      {loading && akunData.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border border-gray-100 shadow-sm">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-4" />
          <p className="text-gray-500 font-medium">Memuat Buku Besar...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {orderTipe.map((tipe) => {
            const daftarAkun = groupedAkun[tipe];
            if (!daftarAkun || daftarAkun.length === 0) return null;

            const totalKategori = daftarAkun.reduce((sum, akun) => sum + (akun.saldo || 0), 0);

            return (
              <div key={tipe} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-blue-600" />
                    <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wide">{tipe}</h2>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-white text-gray-500 font-medium border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-3 w-16 text-center">No</th>
                        <th className="px-6 py-3">Nama Akun (Klik rincian)</th>
                        <th className="px-6 py-3 text-right">Saldo Akhir (Rp)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {daftarAkun.map((akun, index) => (
                        <tr key={akun.id} className="hover:bg-blue-50/50 transition-colors group">
                          <td className="px-6 py-4 text-center text-gray-400">{index + 1}</td>
                          <td className="px-6 py-4 font-medium">
                            {/* LINK MENUJU E-STATEMENT */}
                            <Link 
                              href={`/buku-besar/${akun.id}`} 
                              className="flex items-center gap-2 text-gray-700 group-hover:text-blue-600 transition-colors"
                            >
                              <Wallet className="w-4 h-4 text-gray-300 group-hover:text-blue-400" />
                              <span className="group-hover:underline">{akun.nama}</span>
                              <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Link>
                          </td>
                          <td className={`px-6 py-4 text-right font-semibold ${akun.saldo < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                            {formatRupiah(akun.saldo)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50/80 border-t border-gray-100">
                      <tr>
                        <td colSpan="2" className="px-6 py-4 text-right font-bold text-gray-700">
                          Total {tipe}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-blue-700 text-base">
                          {formatRupiah(totalKategori)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}