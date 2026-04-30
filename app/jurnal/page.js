'use client';
import { useState } from 'react';
import { tambahJurnalDoubleEntry } from '@/lib/firestore';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Save, AlertCircle, CheckCircle2, Database } from 'lucide-react';

// Data Akun SIK-REP Sesuai Excel Manual
const KATEGORI_AKUN = [
  { tipe: 'Aset', akun: ['KAS', 'INVESTASI', 'PERSEDIAAN TOKO'] },
  { tipe: 'Aset', akun: ['Piutang Nikel Wanma', 'Piutang Mitshi Wanma', 'Piutang Rose Mayor', 'Piutang Christian Wanma'] }, // Piutang masuk kelompok Aset
  { tipe: 'Hutang', akun: ['Hutang Dagang Jayapura', 'Hutang Bank BRI', 'Hutang Mandiri', 'Hutang Rahmad Husain', 'Hutang Tanah Abraham Fricky'] },
  { tipe: 'Modal', akun: ['Modal Pemilik'] },
  { tipe: 'Pendapatan', akun: ['Pendapatan Kostum Masuk', 'Pendapatan Toko Sovenir', 'Pendapatan Yaswar Cafe', 'Pendapatan Kios', 'Pendapatan Jasa Fotografer'] },
  { tipe: 'Biaya', akun: ['Biaya Cafe', 'Biaya Perlengkapan', 'Biaya Kios', 'Biaya Toko', 'Biaya Transportasi', 'Biaya Reparasi', 'Biaya Gaji Karyawan', 'Biaya Listrik', 'Biaya Tenaga Langsung', 'Biaya Driver', 'Biaya Wifi', 'Biaya Makan Karyawan', 'Biaya Kostum', 'Biaya Lain-lain'] }
];

// Fungsi utilitas untuk membuat ID Dokumen yang bersih
const buatIdAkun = (nama) => {
  return nama.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
};

export default function JurnalUmumPage() {
  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    keterangan: '',
    akunDebit: '',
    akunKredit: '',
    nominal: ''
  });
  
  const [status, setStatus] = useState({ type: '', message: '', loading: false });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '', loading: true });

    if (formData.akunDebit === formData.akunKredit) {
      setStatus({ type: 'error', message: 'Akun Debit dan Kredit tidak boleh sama!', loading: false });
      return;
    }

    const res = await tambahJurnalDoubleEntry(
      formData.tanggal,
      formData.keterangan,
      formData.akunDebit,
      formData.akunKredit,
      Number(formData.nominal)
    );

    if (res.success) {
      setStatus({ type: 'success', message: res.message, loading: false });
      setFormData({ ...formData, keterangan: '', nominal: '' }); // Reset sebagian form
    } else {
      setStatus({ type: 'error', message: res.message, loading: false });
    }
  };

  // --- FUNGSI KHUSUS PENGEMBANG: SETUP DATABASE AWAL ---
  const handleSetupDatabase = async () => {
    const konfirmasi = confirm("Fungsi ini akan membuat seluruh struktur akun REP ke Firestore. Lanjutkan?");
    if (!konfirmasi) return;

    setStatus({ type: 'info', message: 'Memproses inisialisasi database...', loading: true });
    
    try {
      let count = 0;
      for (const kategori of KATEGORI_AKUN) {
        for (const namaAkun of kategori.akun) {
          const idAkun = buatIdAkun(namaAkun);
          const akunRef = doc(db, 'akun', idAkun);
          await setDoc(akunRef, {
            nama: namaAkun,
            tipe: kategori.tipe,
            saldo: 0 // Saldo awal Rp 0
          });
          count++;
        }
      }
      setStatus({ type: 'success', message: `Berhasil! ${count} akun telah dibuat di Firestore.`, loading: false });
    } catch (error) {
      setStatus({ type: 'error', message: 'Gagal inisialisasi: ' + error.message, loading: false });
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jurnal Umum</h1>
          <p className="text-gray-500 mt-1">Pencatatan transaksi operasional harian Yayasan REP.</p>
        </div>
        {/* Tombol khusus dev untuk memudahkan setup awal */}
        <button 
          onClick={handleSetupDatabase}
          className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-gray-300"
        >
          <Database className="w-4 h-4" />
          Setup Akun Firebase
        </button>
      </div>

      {status.message && (
        <div className={`p-4 rounded-lg mb-6 flex items-start gap-3 border ${
          status.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 
          status.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 
          'bg-blue-50 border-blue-200 text-blue-700'
        }`}>
          {status.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
          <p className="text-sm font-medium">{status.message}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Tanggal */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Tanggal Transaksi</label>
              <input 
                type="date" 
                name="tanggal"
                required
                value={formData.tanggal}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-all"
              />
            </div>

            {/* Nominal */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Nominal (Rp)</label>
              <input 
                type="number" 
                name="nominal"
                min="1"
                required
                placeholder="Contoh: 150000"
                value={formData.nominal}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-all"
              />
            </div>

            {/* Keterangan - Full Width */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-semibold text-gray-700">Keterangan / Uraian</label>
              <input 
                type="text" 
                name="keterangan"
                required
                placeholder="Contoh: Pembelian bahan baku Yaswar Cafe"
                value={formData.keterangan}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-all"
              />
            </div>

            {/* Akun Debit */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Akun (Debit)</label>
              <select 
                name="akunDebit"
                required
                value={formData.akunDebit}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-all bg-white"
              >
                <option value="">-- Pilih Akun Debit --</option>
                {KATEGORI_AKUN.map((kategori, idx) => (
                  <optgroup key={idx} label={kategori.tipe}>
                    {kategori.akun.map((nama) => (
                      <option key={nama} value={buatIdAkun(nama)}>{nama}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Akun Kredit */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Akun (Kredit)</label>
              <select 
                name="akunKredit"
                required
                value={formData.akunKredit}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-all bg-white"
              >
                <option value="">-- Pilih Akun Kredit --</option>
                {KATEGORI_AKUN.map((kategori, idx) => (
                  <optgroup key={idx} label={kategori.tipe}>
                    {kategori.akun.map((nama) => (
                      <option key={nama} value={buatIdAkun(nama)}>{nama}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button 
              type="submit" 
              disabled={status.loading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {status.loading ? 'Memproses...' : 'Simpan Transaksi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}