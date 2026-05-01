'use client';
import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { exportToCSV } from '@/lib/export';
import { TrendingUp, TrendingDown, DollarSign, RefreshCw, Download, Filter, Calendar } from 'lucide-react';

export default function LabaRugiPage() {
  const [pendapatan, setPendapatan] = useState([]);
  const [biaya, setBiaya] = useState([]);
  const [loading, setLoading] = useState(true);

  // State untuk Filter Waktu
  const dateNow = new Date();
  const [filterTipe, setFilterTipe] = useState('bulanan'); // 'semua', 'bulanan', 'tahunan'
  const [bulan, setBulan] = useState(dateNow.getMonth() + 1);
  const [tahun, setTahun] = useState(dateNow.getFullYear());

  const fetchLabaRugi = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Ambil kerangka dasar akun untuk memetakan nama akun yang valid
      const akunSnapshot = await getDocs(collection(db, 'akun'));
      const mapPendapatan = {};
      const mapBiaya = {};

      akunSnapshot.forEach((doc) => {
        const a = doc.data();
        if (a.tipe === 'Pendapatan') mapPendapatan[a.nama] = 0;
        if (a.tipe === 'Biaya') mapBiaya[a.nama] = 0;
      });

      // 2. Tentukan kueri Jurnal berdasarkan Filter
      let jurnalQuery;
      const jurnalRef = collection(db, 'jurnal');

      if (filterTipe === 'bulanan') {
        // Format YYYY-MM-DD
        const strBulan = String(bulan).padStart(2, '0');
        const startDate = `${tahun}-${strBulan}-01`;
        const endDate = `${tahun}-${strBulan}-31`; 
        jurnalQuery = query(jurnalRef, where('tanggal', '>=', startDate), where('tanggal', '<=', endDate));
      } else if (filterTipe === 'tahunan') {
        const startDate = `${tahun}-01-01`;
        const endDate = `${tahun}-12-31`;
        jurnalQuery = query(jurnalRef, where('tanggal', '>=', startDate), where('tanggal', '<=', endDate));
      } else {
        // Semua Waktu
        jurnalQuery = query(jurnalRef);
      }

      // 3. Eksekusi Kueri Jurnal
      const jurnalSnapshot = await getDocs(jurnalQuery);

      // 4. Kalkulasi Double-Entry secara dinamis
      jurnalSnapshot.forEach((doc) => {
        const trx = doc.data();
        const debitName = trx.akunDebit?.nama;
        const kreditName = trx.akunKredit?.nama;
        const nominal = Number(trx.nominal) || 0;

        // Logika Akuntansi Pendapatan: Bertambah di Kredit, Berkurang (Koreksi) di Debit
        if (mapPendapatan[kreditName] !== undefined) mapPendapatan[kreditName] += nominal;
        if (mapPendapatan[debitName] !== undefined) mapPendapatan[debitName] -= nominal;

        // Logika Akuntansi Biaya: Bertambah di Debit, Berkurang (Koreksi) di Kredit
        if (mapBiaya[debitName] !== undefined) mapBiaya[debitName] += nominal;
        if (mapBiaya[kreditName] !== undefined) mapBiaya[kreditName] -= nominal;
      });

      // 5. Konversi Map kembali menjadi Array untuk dirender
      let arrPendapatan = Object.keys(mapPendapatan).map(nama => ({ nama, saldo: mapPendapatan[nama] }));
      let arrBiaya = Object.keys(mapBiaya).map(nama => ({ nama, saldo: mapBiaya[nama] }));

      // Sembunyikan akun yang saldonya 0 di periode tersebut agar UI bersih
      arrPendapatan = arrPendapatan.filter(item => item.saldo !== 0).sort((a, b) => b.saldo - a.saldo);
      arrBiaya = arrBiaya.filter(item => item.saldo !== 0).sort((a, b) => b.saldo - a.saldo);

      setPendapatan(arrPendapatan);
      setBiaya(arrBiaya);

    } catch (error) {
      console.error("Gagal memuat data Laba Rugi:", error);
    } finally {
      setLoading(false);
    }
  }, [filterTipe, bulan, tahun]);

  useEffect(() => {
    fetchLabaRugi();
  }, [fetchLabaRugi]);

  const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
  };

  const totalPendapatan = pendapatan.reduce((sum, item) => sum + item.saldo, 0);
  const totalBiaya = biaya.reduce((sum, item) => sum + item.saldo, 0);
  const labaBersih = totalPendapatan - totalBiaya;

  // Nama bulan untuk UI
  const namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  const handleExportCSV = () => {
    const dataEkspor = [];
    let labelPeriode = 'Semua Waktu';
    if (filterTipe === 'bulanan') labelPeriode = `${namaBulan[bulan - 1]} ${tahun}`;
    if (filterTipe === 'tahunan') labelPeriode = `Tahun ${tahun}`;

    dataEkspor.push({ Kategori: 'PERIODE', Nama_Akun: labelPeriode, Nominal: '' });
    
    pendapatan.forEach(item => dataEkspor.push({ Kategori: 'Pendapatan', Nama_Akun: item.nama, Nominal: item.saldo }));
    biaya.forEach(item => dataEkspor.push({ Kategori: 'Biaya', Nama_Akun: item.nama, Nominal: item.saldo }));
    
    dataEkspor.push({ Kategori: 'RINGKASAN', Nama_Akun: 'Total Pendapatan', Nominal: totalPendapatan });
    dataEkspor.push({ Kategori: 'RINGKASAN', Nama_Akun: 'Total Biaya', Nominal: totalBiaya });
    dataEkspor.push({ Kategori: 'RINGKASAN', Nama_Akun: 'LABA BERSIH', Nominal: labaBersih });

    exportToCSV(dataEkspor, `Laba_Rugi_REP_${filterTipe}_${tahun}`);
  };

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan Laba Rugi</h1>
          <p className="text-gray-500 mt-1">Evaluasi performa keuangan unit usaha Yayasan Rumah Etnik Papua.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={handleExportCSV} disabled={loading || (pendapatan.length === 0 && biaya.length === 0)} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50">
            <Download className="w-4 h-4" /> Ekspor CSV
          </button>
        </div>
      </div>

      {/* Kontrol Filter Lanjutan */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-8 flex flex-col sm:flex-row items-center gap-4">
        <div className="flex items-center gap-2 text-gray-700 font-medium w-full sm:w-auto">
          <Filter className="w-5 h-5 text-blue-600" />
          <span className="text-sm">Filter Periode:</span>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <select 
            value={filterTipe} 
            onChange={(e) => setFilterTipe(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
          >
            <option value="bulanan">Bulanan</option>
            <option value="tahunan">Tahunan</option>
            <option value="semua">Semua Waktu</option>
          </select>

          {filterTipe === 'bulanan' && (
            <select 
              value={bulan} 
              onChange={(e) => setBulan(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
            >
              {namaBulan.map((nama, idx) => (
                <option key={idx} value={idx + 1}>{nama}</option>
              ))}
            </select>
          )}

          {(filterTipe === 'bulanan' || filterTipe === 'tahunan') && (
            <select 
              value={tahun} 
              onChange={(e) => setTahun(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
            >
              {[2024, 2025, 2026, 2027].map(thn => (
                <option key={thn} value={thn}>{thn}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border border-gray-100 shadow-sm">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-4" />
          <p className="text-gray-500 font-medium">Mengkalkulasi Laba Rugi...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-100 text-green-600"><TrendingUp className="w-6 h-6" /></div>
              <div>
                <p className="text-sm font-medium text-gray-500">Pendapatan Periode Ini</p>
                <h3 className="text-xl font-bold text-gray-900 mt-1">{formatRupiah(totalPendapatan)}</h3>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="p-3 rounded-full bg-red-100 text-red-600"><TrendingDown className="w-6 h-6" /></div>
              <div>
                <p className="text-sm font-medium text-gray-500">Biaya Periode Ini</p>
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <h2 className="text-lg font-bold text-gray-800">Rincian Pendapatan</h2>
              </div>
              <ul className="divide-y divide-gray-100">
                {pendapatan.length > 0 ? pendapatan.map((item, idx) => (
                  <li key={idx} className="px-6 py-4 flex justify-between items-center hover:bg-gray-50">
                    <span className="text-sm text-gray-700">{item.nama}</span>
                    <span className="text-sm font-semibold text-green-600">{formatRupiah(item.saldo)}</span>
                  </li>
                )) : (
                  <li className="px-6 py-8 text-center text-gray-500 text-sm">Tidak ada transaksi pendapatan di periode ini.</li>
                )}
              </ul>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <h2 className="text-lg font-bold text-gray-800">Rincian Biaya</h2>
              </div>
              <ul className="divide-y divide-gray-100">
                {biaya.length > 0 ? biaya.map((item, idx) => (
                  <li key={idx} className="px-6 py-4 flex justify-between items-center hover:bg-gray-50">
                    <span className="text-sm text-gray-700">{item.nama}</span>
                    <span className="text-sm font-semibold text-red-600">{formatRupiah(item.saldo)}</span>
                  </li>
                )) : (
                  <li className="px-6 py-8 text-center text-gray-500 text-sm">Tidak ada transaksi biaya di periode ini.</li>
                )}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}