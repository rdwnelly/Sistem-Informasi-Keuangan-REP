'use client';
import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Scale, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

export default function NeracaPage() {
  const [dataNeraca, setDataNeraca] = useState({
    aset: [],
    hutang: [],
    modal: [],
    labaBerjalan: 0,
    totalAktiva: 0,
    totalPasiva: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchNeracaData = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'akun'));
      
      const aset = [];
      const hutang = [];
      const modal = [];
      let totalPendapatan = 0;
      let totalBiaya = 0;

      // Pemisahan kategori akun
      querySnapshot.forEach((doc) => {
        const akun = { id: doc.id, ...doc.data() };
        const saldo = akun.saldo || 0;

        if (akun.tipe === 'Aset') aset.push(akun);
        else if (akun.tipe === 'Hutang') hutang.push(akun);
        else if (akun.tipe === 'Modal') modal.push(akun);
        else if (akun.tipe === 'Pendapatan') totalPendapatan += saldo;
        else if (akun.tipe === 'Biaya') totalBiaya += saldo;
      });

      // Kalkulasi Total
      const labaBerjalan = totalPendapatan - totalBiaya;
      const totalAset = aset.reduce((sum, item) => sum + (item.saldo || 0), 0);
      const totalHutang = hutang.reduce((sum, item) => sum + (item.saldo || 0), 0);
      const totalModal = modal.reduce((sum, item) => sum + (item.saldo || 0), 0);
      
      // Persamaan Akuntansi: Pasiva = Hutang + Modal Awal + Laba/Rugi Berjalan
      const totalPasiva = totalHutang + totalModal + labaBerjalan;

      // Pengurutan saldo terbesar ke terkecil
      aset.sort((a, b) => b.saldo - a.saldo);
      hutang.sort((a, b) => b.saldo - a.saldo);
      modal.sort((a, b) => b.saldo - a.saldo);

      setDataNeraca({
        aset,
        hutang,
        modal,
        labaBerjalan,
        totalAktiva: totalAset,
        totalPasiva: totalPasiva
      });
    } catch (error) {
      console.error("Gagal memuat data Neraca:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNeracaData();
  }, []);

  const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(angka);
  };

  const isBalanced = dataNeraca.totalAktiva === dataNeraca.totalPasiva;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan Neraca</h1>
          <p className="text-gray-500 mt-1">Posisi keuangan Yayasan Rumah Etnik Papua saat ini.</p>
        </div>
        <button 
          onClick={fetchNeracaData}
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
          <p className="text-gray-500 font-medium">Menyusun Neraca Saldo...</p>
        </div>
      ) : (
        <>
          {/* Indikator Keseimbangan (Balance) */}
          <div className={`p-4 rounded-xl mb-6 flex items-center justify-between border ${isBalanced ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isBalanced ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                <Scale className="w-6 h-6" />
              </div>
              <div>
                <h3 className={`font-bold ${isBalanced ? 'text-green-800' : 'text-red-800'}`}>
                  {isBalanced ? 'Neraca Seimbang (Balanced)' : 'Neraca Tidak Seimbang (Unbalanced)'}
                </h3>
                <p className={`text-sm mt-0.5 ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                  {isBalanced 
                    ? 'Total Aktiva dan Pasiva telah sesuai dengan prinsip Double-Entry.' 
                    : 'Terdapat selisih antara Aktiva dan Pasiva. Periksa kembali pencatatan jurnal.'}
                </p>
              </div>
            </div>
            {isBalanced ? (
              <CheckCircle2 className="w-8 h-8 text-green-500 opacity-50" />
            ) : (
              <AlertCircle className="w-8 h-8 text-red-500 opacity-50" />
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Kolom Kiri: AKTIVA (Aset) */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              <div className="bg-blue-50 px-6 py-4 border-b border-blue-100 flex justify-between items-center">
                <h2 className="text-lg font-bold text-blue-900">AKTIVA (Aset)</h2>
              </div>
              <div className="flex-1 p-6">
                <ul className="space-y-4">
                  {dataNeraca.aset.map((item) => (
                    <li key={item.id} className="flex justify-between items-center border-b border-gray-50 pb-2">
                      <span className="text-sm text-gray-700">{item.nama}</span>
                      <span className="text-sm font-medium text-gray-900">{formatRupiah(item.saldo)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-between items-center">
                <span className="font-bold text-gray-700">Total Aktiva</span>
                <span className="text-lg font-bold text-blue-700">{formatRupiah(dataNeraca.totalAktiva)}</span>
              </div>
            </div>

            {/* Kolom Kanan: PASIVA (Hutang & Modal) */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              <div className="bg-indigo-50 px-6 py-4 border-b border-indigo-100 flex justify-between items-center">
                <h2 className="text-lg font-bold text-indigo-900">PASIVA (Kewajiban & Ekuitas)</h2>
              </div>
              <div className="flex-1 p-6">
                
                {/* Hutang */}
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Kewajiban / Hutang</h3>
                <ul className="space-y-4 mb-6">
                  {dataNeraca.hutang.map((item) => (
                    <li key={item.id} className="flex justify-between items-center border-b border-gray-50 pb-2">
                      <span className="text-sm text-gray-700">{item.nama}</span>
                      <span className="text-sm font-medium text-gray-900">{formatRupiah(item.saldo)}</span>
                    </li>
                  ))}
                </ul>

                {/* Modal & Ekuitas */}
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Ekuitas / Modal</h3>
                <ul className="space-y-4">
                  {dataNeraca.modal.map((item) => (
                    <li key={item.id} className="flex justify-between items-center border-b border-gray-50 pb-2">
                      <span className="text-sm text-gray-700">{item.nama}</span>
                      <span className="text-sm font-medium text-gray-900">{formatRupiah(item.saldo)}</span>
                    </li>
                  ))}
                  <li className="flex justify-between items-center border-b border-gray-50 pb-2">
                    <span className="text-sm text-gray-700">Laba / (Rugi) Berjalan</span>
                    <span className={`text-sm font-medium ${dataNeraca.labaBerjalan >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatRupiah(dataNeraca.labaBerjalan)}
                    </span>
                  </li>
                </ul>
              </div>
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-between items-center">
                <span className="font-bold text-gray-700">Total Pasiva</span>
                <span className="text-lg font-bold text-indigo-700">{formatRupiah(dataNeraca.totalPasiva)}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}