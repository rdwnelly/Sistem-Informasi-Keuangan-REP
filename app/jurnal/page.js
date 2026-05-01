'use client';
import { useState, useEffect } from 'react';
import { tambahJurnalDoubleEntry, hapusJurnalDoubleEntry } from '@/lib/firestore'; // Import fungsi hapus
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { Save, AlertCircle, CheckCircle2, Database, Trash2, RefreshCw } from 'lucide-react';

const KATEGORI_AKUN = [
  { tipe: 'Aset', akun: ['KAS', 'INVESTASI', 'PERSEDIAAN TOKO', 'Piutang Nikel Wanma', 'Piutang Mitshi Wanma', 'Piutang Rose Mayor', 'Piutang Christian Wanma'] },
  { tipe: 'Hutang', akun: ['Hutang Dagang Jayapura', 'Hutang Bank BRI', 'Hutang Mandiri', 'Hutang Rahmad Husain', 'Hutang Tanah Abraham Fricky'] },
  { tipe: 'Modal', akun: ['Modal Pemilik'] },
  { tipe: 'Pendapatan', akun: ['Pendapatan Kostum Masuk', 'Pendapatan Toko Sovenir', 'Pendapatan Yaswar Cafe', 'Pendapatan Kios', 'Pendapatan Jasa Fotografer'] },
  { tipe: 'Biaya', akun: ['Biaya Cafe', 'Biaya Perlengkapan', 'Biaya Kios', 'Biaya Toko', 'Biaya Transportasi', 'Biaya Reparasi', 'Biaya Gaji Karyawan', 'Biaya Listrik', 'Biaya Tenaga Langsung', 'Biaya Driver', 'Biaya Wifi', 'Biaya Makan Karyawan', 'Biaya Kostum', 'Biaya Lain-lain'] }
];

const buatIdAkun = (nama) => nama.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');

export default function JurnalUmumPage() {
  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    keterangan: '',
    akunDebit: '',
    akunKredit: '',
    nominal: ''
  });
  
  const [status, setStatus] = useState({ type: '', message: '', loading: false });
  const [riwayat, setRiwayat] = useState([]);
  const [loadingRiwayat, setLoadingRiwayat] = useState(true);

  // Fungsi memuat riwayat transaksi terakhir
  const fetchRiwayat = async () => {
    setLoadingRiwayat(true);
    try {
      const q = query(collection(db, 'jurnal'), orderBy('timestamp', 'desc'), limit(10));
      const querySnapshot = await getDocs(q);
      const data = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      setRiwayat(data);
    } catch (error) {
      console.error("Gagal mengambil riwayat:", error);
    } finally {
      setLoadingRiwayat(false);
    }
  };

  useEffect(() => {
    fetchRiwayat();
  }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '', loading: true });

    if (formData.akunDebit === formData.akunKredit) {
      setStatus({ type: 'error', message: 'Akun Debit dan Kredit tidak boleh sama!', loading: false });
      return;
    }

    const res = await tambahJurnalDoubleEntry(
      formData.tanggal, formData.keterangan, formData.akunDebit, formData.akunKredit, Number(formData.nominal)
    );

    if (res.success) {
      setStatus({ type: 'success', message: res.message, loading: false });
      setFormData({ ...formData, keterangan: '', nominal: '' });
      fetchRiwayat(); // Refresh tabel setelah input berhasil
    } else {
      setStatus({ type: 'error', message: res.message, loading: false });
    }
  };

  // --- FUNGSI EKSEKUSI HAPUS TRANSAKSI ---
  const handleDelete = async (id, keterangan) => {
    const konfirmasi = window.confirm(`Apakah Anda yakin ingin menghapus transaksi "${keterangan}"? Saldo akun akan dikembalikan secara otomatis.`);
    if (!konfirmasi) return;

    setStatus({ type: 'info', message: 'Memproses penghapusan dan pengembalian saldo...', loading: true });
    
    const res = await hapusJurnalDoubleEntry(id);
    
    if (res.success) {
      setStatus({ type: 'success', message: res.message, loading: false });
      fetchRiwayat(); // Refresh tabel setelah hapus berhasil
    } else {
      setStatus({ type: 'error', message: res.message, loading: false });
    }
  };

  const handleSetupDatabase = async () => {
    const konfirmasi = window.confirm("Fungsi ini akan membuat seluruh struktur akun REP ke Firestore. Lanjutkan?");
    if (!konfirmasi) return;
    setStatus({ type: 'info', message: 'Memproses inisialisasi database...', loading: true });
    try {
      for (const kategori of KATEGORI_AKUN) {
        for (const namaAkun of kategori.akun) {
          await setDoc(doc(db, 'akun', buatIdAkun(namaAkun)), { nama: namaAkun, tipe: kategori.tipe, saldo: 0 });
        }
      }
      setStatus({ type: 'success', message: 'Berhasil! Akun telah dibuat.', loading: false });
    } catch (error) {
      setStatus({ type: 'error', message: 'Gagal: ' + error.message, loading: false });
    }
  };

  const formatRupiah = (angka) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
  const formatTanggal = (tgl) => new Date(tgl).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jurnal Umum</h1>
          <p className="text-gray-500 mt-1">Pencatatan transaksi operasional harian Yayasan REP.</p>
        </div>
        <button onClick={handleSetupDatabase} className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-gray-300">
          <Database className="w-4 h-4" /> Setup Akun
        </button>
      </div>

      {status.message && (
        <div className={`p-4 rounded-lg mb-6 flex items-start gap-3 border ${status.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : status.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
          {status.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
          <p className="text-sm font-medium">{status.message}</p>
        </div>
      )}

      {/* FORM INPUT JURNAL */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Tanggal Transaksi</label>
              <input type="date" name="tanggal" required value={formData.tanggal} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Nominal (Rp)</label>
              <input type="number" name="nominal" min="1" required placeholder="Contoh: 150000" value={formData.nominal} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-all" />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-semibold text-gray-700">Keterangan / Uraian</label>
              <input type="text" name="keterangan" required placeholder="Contoh: Pembelian bahan baku Yaswar Cafe" value={formData.keterangan} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Akun (Debit)</label>
              <select name="akunDebit" required value={formData.akunDebit} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm bg-white">
                <option value="">-- Pilih Akun Debit --</option>
                {KATEGORI_AKUN.map((kategori, idx) => (
                  <optgroup key={idx} label={kategori.tipe}>
                    {kategori.akun.map((nama) => <option key={nama} value={buatIdAkun(nama)}>{nama}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Akun (Kredit)</label>
              <select name="akunKredit" required value={formData.akunKredit} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm bg-white">
                <option value="">-- Pilih Akun Kredit --</option>
                {KATEGORI_AKUN.map((kategori, idx) => (
                  <optgroup key={idx} label={kategori.tipe}>
                    {kategori.akun.map((nama) => <option key={nama} value={buatIdAkun(nama)}>{nama}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>
          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button type="submit" disabled={status.loading} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50">
              <Save className="w-4 h-4" /> {status.loading ? 'Memproses...' : 'Simpan Transaksi'}
            </button>
          </div>
        </form>
      </div>

      {/* TABEL RIWAYAT & HAPUS */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-900">Riwayat Transaksi Terakhir</h2>
          <button onClick={fetchRiwayat} className="text-gray-500 hover:text-blue-600 transition-colors">
            <RefreshCw className={`w-5 h-5 ${loadingRiwayat ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white text-gray-600 font-medium border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4">Keterangan</th>
                <th className="px-6 py-4">D/K</th>
                <th className="px-6 py-4 text-right">Nominal</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {riwayat.length > 0 ? riwayat.map((trx) => (
                <tr key={trx.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-500 whitespace-nowrap">{formatTanggal(trx.tanggal)}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">{trx.keterangan}</td>
                  <td className="px-6 py-4 space-y-1">
                    <div className="text-xs text-blue-700 font-medium">D: {trx.akunDebit.nama}</div>
                    <div className="text-xs text-gray-600 font-medium">K: {trx.akunKredit.nama}</div>
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-gray-900 whitespace-nowrap">{formatRupiah(trx.nominal)}</td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => handleDelete(trx.id, trx.keterangan)}
                      disabled={status.loading}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Hapus Transaksi"
                    >
                      <Trash2 className="w-5 h-5 mx-auto" />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">Belum ada riwayat transaksi.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}