'use client';
import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ArrowUpRight, ArrowDownRight, DollarSign, Wallet, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
  const [summary, setSummary] = useState({
    kas: 0,
    pendapatan: 0,
    pengeluaran: 0,
    piutang: 0
  });
  const [transaksiTerakhir, setTransaksiTerakhir] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Mengambil data akun untuk Kartu Ringkasan
      const akunSnapshot = await getDocs(collection(db, 'akun'));
      let totalKas = 0;
      let totalPendapatan = 0;
      let totalBiaya = 0;
      let totalPiutang = 0;

      akunSnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Asumsi: Akun KAS dan INVESTASI dihitung sebagai Kas & Bank
        if (data.nama === 'KAS' || data.nama === 'INVESTASI') {
          totalKas += data.saldo || 0;
        }
        // Menghitung total Pendapatan
        else if (data.tipe === 'Pendapatan') {
          totalPendapatan += data.saldo || 0;
        }
        // Menghitung total Biaya/Pengeluaran
        else if (data.tipe === 'Biaya') {
          totalBiaya += data.saldo || 0;
        }
        // Menghitung total Piutang (semua akun yang mengandung kata "Piutang")
        else if (data.nama.includes('Piutang')) {
          totalPiutang += data.saldo || 0;
        }
      });

      setSummary({ kas: totalKas, pendapatan: totalPendapatan, pengeluaran: totalBiaya, piutang: totalPiutang });

      // 2. Mengambil 5 Transaksi Terakhir dari Jurnal
      const q = query(collection(db, 'jurnal'), orderBy('timestamp', 'desc'), limit(5));
      const jurnalSnapshot = await getDocs(q);
      const dataTransaksi = [];
      
      jurnalSnapshot.forEach((doc) => {
        dataTransaksi.push({ id: doc.id, ...doc.data() });
      });
      
      setTransaksiTerakhir(dataTransaksi);
    } catch (error) {
      console.error("Gagal mengambil data Dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(angka);
  };

  // Format tanggal untuk tampilan tabel
  const formatTanggal = (tanggalString) => {
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return new Date(tanggalString).toLocaleDateString('id-ID', options);
  };

  const summaryCards = [
    { title: 'Total Kas & Bank', amount: summary.kas, icon: Wallet, color: 'text-blue-600', bg: 'bg-blue-100' },
    { title: 'Total Pendapatan', amount: summary.pendapatan, icon: ArrowUpRight, color: 'text-green-600', bg: 'bg-green-100' },
    { title: 'Total Pengeluaran', amount: summary.pengeluaran, icon: ArrowDownRight, color: 'text-red-600', bg: 'bg-red-100' },
    { title: 'Total Piutang', amount: summary.piutang, icon: DollarSign, color: 'text-yellow-600', bg: 'bg-yellow-100' },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Keuangan</h1>
          <p className="text-gray-500 mt-1">Ringkasan operasional Yayasan Rumah Etnik Papua hari ini.</p>
        </div>
        <Link href="/jurnal" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
          + Entri Jurnal Baru
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border border-gray-100 shadow-sm">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-4" />
          <p className="text-gray-500 font-medium">Memuat data terkini...</p>
        </div>
      ) : (
        <>
          {/* Kartu Ringkasan */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {summaryCards.map((card, index) => (
              <div key={index} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                <div className={`p-3 rounded-full ${card.bg} ${card.color}`}>
                  <card.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">{card.title}</p>
                  <h3 className="text-xl font-bold text-gray-900 mt-1">{formatRupiah(card.amount)}</h3>
                </div>
              </div>
            ))}
          </div>

          {/* Tabel Transaksi Terakhir */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900">Transaksi Terakhir</h2>
              <button onClick={fetchDashboardData} className="text-sm text-gray-500 hover:text-blue-600 font-medium flex items-center gap-1 transition-colors">
                <RefreshCw className="w-4 h-4" /> Segarkan
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-white text-gray-600 font-medium border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4">Tanggal</th>
                    <th className="px-6 py-4">Keterangan</th>
                    <th className="px-6 py-4">Akun (Debit)</th>
                    <th className="px-6 py-4">Akun (Kredit)</th>
                    <th className="px-6 py-4 text-right">Jumlah (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {transaksiTerakhir.length > 0 ? (
                    transaksiTerakhir.map((trx) => (
                      <tr key={trx.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                          {formatTanggal(trx.tanggal)}
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {trx.keterangan}
                        </td>
                        <td className="px-6 py-4">
                          <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-medium border border-blue-100">
                            {trx.akunDebit.nama}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium border border-gray-200">
                            {trx.akunKredit.nama}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-gray-900 whitespace-nowrap">
                          {formatRupiah(trx.nominal)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                        Belum ada transaksi tercatat hari ini.
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