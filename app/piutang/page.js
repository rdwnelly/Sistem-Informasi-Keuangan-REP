'use client';
import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { tambahJurnalDoubleEntry } from '@/lib/firestore'; // Memanfaatkan fungsi inti yang sudah ada
import { Users, DollarSign, RefreshCw, PlusCircle, AlertCircle, CheckCircle2, History } from 'lucide-react';

export default function PiutangPage() {
  const [dataPiutang, setDataPiutang] = useState([]);
  const [akunKas, setAkunKas] = useState([]);
  const [riwayatCicilan, setRiwayatCicilan] = useState([]);
  const [loading, setLoading] = useState(true);

  // State untuk Modal Pembayaran
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPiutang, setSelectedPiutang] = useState(null);
  const [status, setStatus] = useState({ type: '', message: '', loading: false });

  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    nominal: '',
    akunPenerimaId: '', // Default kas mana yang menerima uang
    keterangan: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Ambil semua akun untuk memfilter Piutang dan Kas
      const akunSnapshot = await getDocs(collection(db, 'akun'));
      const listPiutang = [];
      const listKas = [];

      akunSnapshot.forEach((doc) => {
        const akun = { id: doc.id, ...doc.data() };
        // Deteksi akun piutang berdasarkan namanya (sesuai Excel REP)
        if (akun.nama.toLowerCase().includes('piutang')) {
          listPiutang.push(akun);
        }
        // Deteksi akun penampung pembayaran (KAS / INVESTASI)
        if (akun.nama === 'KAS' || akun.nama === 'INVESTASI') {
          listKas.push(akun);
        }
      });

      // Urutkan piutang dari saldo terbesar
      listPiutang.sort((a, b) => b.saldo - a.saldo);
      setDataPiutang(listPiutang);
      setAkunKas(listKas);

      // Set default Kas jika ada
      if (listKas.length > 0 && !formData.akunPenerimaId) {
        setFormData(prev => ({ ...prev, akunPenerimaId: listKas[0].id }));
      }

      // 2. Ambil Riwayat Pembayaran Terakhir (Jurnal yang melibatkan piutang)
      const qJurnal = query(collection(db, 'jurnal'), orderBy('timestamp', 'desc'));
      const jurnalSnapshot = await getDocs(qJurnal);
      const riwayat = [];

      jurnalSnapshot.forEach((doc) => {
        const trx = { id: doc.id, ...doc.data() };
        // Cari transaksi di mana Piutang berada di posisi KREDIT (artinya piutang dibayar/berkurang)
        if (trx.akunKredit?.nama.toLowerCase().includes('piutang')) {
          riwayat.push(trx);
        }
      });

      setRiwayatCicilan(riwayat.slice(0, 10)); // Ambil 10 transaksi terakhir
    } catch (error) {
      console.error("Gagal mengambil data piutang:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatRupiah = (angka) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
  const formatTanggal = (tgl) => new Date(tgl).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

  const totalPiutang = dataPiutang.reduce((sum, item) => sum + (item.saldo || 0), 0);

  const openModal = (piutang) => {
    setSelectedPiutang(piutang);
    setStatus({ type: '', message: '', loading: false });
    setFormData(prev => ({ ...prev, nominal: '', keterangan: `Pembayaran cicilan ${piutang.nama}` }));
    setIsModalOpen(true);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '', loading: true });

    const nominalBayar = Number(formData.nominal);
    if (nominalBayar > selectedPiutang.saldo) {
      setStatus({ type: 'error', message: `Nominal melebihi sisa tunggakan (${formatRupiah(selectedPiutang.saldo)})`, loading: false });
      return;
    }

    // Eksekusi Double-Entry: Debit = Kas, Kredit = Piutang
    const res = await tambahJurnalDoubleEntry(
      formData.tanggal,
      formData.keterangan,
      formData.akunPenerimaId, // Debit (Kas bertambah)
      selectedPiutang.id,      // Kredit (Piutang berkurang)
      nominalBayar
    );

    if (res.success) {
      setStatus({ type: 'success', message: 'Pembayaran berhasil dicatat!', loading: false });
      fetchData(); // Refresh data saldo di background
      setTimeout(() => setIsModalOpen(false), 2000); // Tutup modal otomatis setelah 2 detik
    } else {
      setStatus({ type: 'error', message: res.message, loading: false });
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-12 relative">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Buku Pembantu Piutang</h1>
          <p className="text-gray-500 mt-1">Pemantauan tunggakan dan pencatatan pembayaran cicilan aset yayasan.</p>
        </div>
        <button onClick={fetchData} disabled={loading} className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-gray-200 shadow-sm disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Segarkan Data
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border border-gray-100 shadow-sm">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-4" />
          <p className="text-gray-500 font-medium">Memuat data piutang...</p>
        </div>
      ) : (
        <>
          {/* Kartu Total Keseluruhan */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl shadow-md p-6 mb-8 text-white flex items-center justify-between">
            <div>
              <p className="text-blue-100 font-medium mb-1">Total Keseluruhan Piutang Yayasan</p>
              <h2 className="text-3xl font-bold">{formatRupiah(totalPiutang)}</h2>
            </div>
            <div className="p-4 bg-white/20 rounded-full hidden md:block">
              <Users className="w-8 h-8 text-white" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Kolom Kiri: Daftar Piutang (2 Kolom di LG) */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-500" />
                Rincian Tagihan Pihak Terkait
              </h2>
              
              {dataPiutang.length > 0 ? dataPiutang.map((item) => (
                <div key={item.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-blue-200 transition-colors">
                  <div>
                    <h3 className="font-bold text-gray-800">{item.nama}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">Sisa Tunggakan</p>
                    <p className={`text-xl font-bold mt-1 ${item.saldo > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatRupiah(item.saldo)}
                    </p>
                  </div>
                  
                  <button 
                    onClick={() => openModal(item)}
                    disabled={item.saldo <= 0}
                    className="flex justify-center items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors border border-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <PlusCircle className="w-4 h-4" />
                    {item.saldo <= 0 ? 'Telah Lunas' : 'Catat Cicilan'}
                  </button>
                </div>
              )) : (
                <div className="bg-white p-8 text-center rounded-xl border border-gray-100 text-gray-500">
                  Tidak ada data piutang ditemukan di database.
                </div>
              )}
            </div>

            {/* Kolom Kanan: Riwayat Cicilan */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <History className="w-5 h-5 text-gray-500" />
                Riwayat Pelunasan
              </h2>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <ul className="divide-y divide-gray-100">
                  {riwayatCicilan.length > 0 ? riwayatCicilan.map(trx => (
                    <li key={trx.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-semibold text-gray-400">{formatTanggal(trx.tanggal)}</span>
                        <span className="text-sm font-bold text-green-600">+{formatRupiah(trx.nominal)}</span>
                      </div>
                      <p className="text-sm font-medium text-gray-800">{trx.akunKredit.nama}</p>
                      <p className="text-xs text-gray-500 mt-1 truncate">{trx.keterangan}</p>
                    </li>
                  )) : (
                    <li className="p-6 text-center text-sm text-gray-500">Belum ada riwayat cicilan tercatat.</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </>
      )}

      {/* MODAL FORM PEMBAYARAN CICILAN */}
      {isModalOpen && selectedPiutang && (
        <div className="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="bg-blue-600 p-5 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg">Catat Pembayaran Cicilan</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white">&times;</button>
            </div>
            
            <div className="p-6">
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-500">Pihak Berhutang</p>
                <p className="font-bold text-gray-900">{selectedPiutang.nama}</p>
                <div className="flex justify-between items-end mt-2">
                  <span className="text-sm text-gray-500">Sisa Tunggakan:</span>
                  <span className="font-bold text-red-600">{formatRupiah(selectedPiutang.saldo)}</span>
                </div>
              </div>

              {status.message && (
                <div className={`p-3 rounded-lg mb-4 flex items-start gap-2 text-sm border ${status.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
                  {status.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                  {status.message}
                </div>
              )}

              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">Tanggal Pembayaran</label>
                  <input type="date" required value={formData.tanggal} onChange={(e) => setFormData({...formData, tanggal: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">Masuk Ke Akun (Kas)</label>
                  <select required value={formData.akunPenerimaId} onChange={(e) => setFormData({...formData, akunPenerimaId: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 bg-white">
                    {akunKas.map(kas => (
                      <option key={kas.id} value={kas.id}>{kas.nama}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">Nominal Cicilan (Rp)</label>
                  <input type="number" required min="1" max={selectedPiutang.saldo} placeholder="Contoh: 500000" value={formData.nominal} onChange={(e) => setFormData({...formData, nominal: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">Keterangan Catatan</label>
                  <input type="text" required value={formData.keterangan} onChange={(e) => setFormData({...formData, keterangan: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500" />
                </div>
                
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg font-medium transition-colors">Batal</button>
                  <button type="submit" disabled={status.loading || status.type === 'success'} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 flex justify-center items-center gap-2">
                    {status.loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                    Simpan Pembayaran
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}