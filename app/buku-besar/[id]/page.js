'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { exportToCSV } from '@/lib/export';
import { ArrowLeft, Download, Printer, RefreshCw, FileText } from 'lucide-react';

export default function DetailBukuBesarPage() {
  const { id: akunId } = useParams();
  
  const [akunData, setAkunData] = useState(null);
  const [mutasi, setMutasi] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDetailAkun = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Ambil Informasi Identitas Akun
      const akunRef = doc(db, 'akun', akunId);
      const akunSnap = await getDoc(akunRef);
      
      if (!akunSnap.exists()) {
        setLoading(false);
        return;
      }
      const dataAkun = { id: akunSnap.id, ...akunSnap.data() };
      setAkunData(dataAkun);

      // 2. Ambil Seluruh Riwayat Jurnal
      const qJurnal = query(collection(db, 'jurnal'), orderBy('timestamp', 'asc'));
      const jurnalSnap = await getDocs(qJurnal);
      
      const riwayat = [];
      jurnalSnap.forEach((doc) => {
        const trx = { id: doc.id, ...doc.data() };
        // Hanya ambil transaksi yang melibatkan akun ini (baik di posisi Debit maupun Kredit)
        if (trx.akunDebit?.id === akunId || trx.akunKredit?.id === akunId) {
          riwayat.push(trx);
        }
      });

      // 3. Kalkulasi Saldo Berjalan (Running Balance) menggunakan prinsip Double-Entry
      let currentSaldo = 0;
      // Normal Balance: Aset dan Biaya bertambah di Debit. Sisanya bertambah di Kredit.
      const isDebitNormal = ['Aset', 'Biaya'].includes(dataAkun.tipe);

      const tabelMutasi = riwayat.map((trx) => {
        let debit = 0;
        let kredit = 0;

        if (trx.akunDebit?.id === akunId) {
          debit = trx.nominal;
          currentSaldo = isDebitNormal ? currentSaldo + debit : currentSaldo - debit;
        } else if (trx.akunKredit?.id === akunId) {
          kredit = trx.nominal;
          currentSaldo = isDebitNormal ? currentSaldo - kredit : currentSaldo + kredit;
        }

        return { ...trx, nilaiDebit: debit, nilaiKredit: kredit, saldoBerjalan: currentSaldo };
      });

      // Balik urutan agar transaksi terbaru berada di paling atas tabel
      setMutasi(tabelMutasi.reverse());

    } catch (error) {
      console.error("Gagal memuat e-Statement:", error);
    } finally {
      setLoading(false);
    }
  }, [akunId]);

  useEffect(() => {
    fetchDetailAkun();
  }, [fetchDetailAkun]);

  const formatRupiah = (angka) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
  const formatTanggal = (tgl) => new Date(tgl).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  // Fungsi Cetak / Print dokumen
  const handlePrint = () => {
    window.print();
  };

  // Fungsi Ekspor ke CSV
  const handleExportCSV = () => {
    const dataEkspor = mutasi.map((item, index) => ({
      'No': mutasi.length - index,
      'Tanggal': item.tanggal,
      'Keterangan': item.keterangan,
      'Debit (Rp)': item.nilaiDebit,
      'Kredit (Rp)': item.nilaiKredit,
      'Saldo (Rp)': item.saldoBerjalan
    }));
    exportToCSV(dataEkspor, `eStatement_${akunData?.nama}_REP`);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Memuat Kartu Akun...</p>
      </div>
    );
  }

  if (!akunData && !loading) {
    return (
      <div className="text-center p-12">
        <h2 className="text-2xl font-bold text-gray-800">Akun tidak ditemukan.</h2>
        <Link href="/buku-besar" className="text-blue-600 hover:underline mt-4 inline-block">Kembali ke Buku Besar</Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-12">
      {/* Tombol Kembali & Aksi Cetak - Disembunyikan saat di-print */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 print:hidden">
        <Link href="/buku-besar" className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors font-medium">
          <ArrowLeft className="w-4 h-4" /> Kembali ke Induk Buku Besar
        </Link>
        <div className="flex gap-3">
          <button onClick={handleExportCSV} disabled={mutasi.length === 0} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50">
            <Download className="w-4 h-4" /> Unduh CSV
          </button>
          <button onClick={handlePrint} className="flex items-center gap-2 bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
            <Printer className="w-4 h-4" /> Cetak Laporan
          </button>
        </div>
      </div>

      {/* Header Kop Laporan e-Statement */}
      <div className="bg-white rounded-t-xl border border-gray-200 border-b-0 p-6 flex items-start gap-4">
        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl print:hidden">
          <FileText className="w-8 h-8" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">E-STATEMENT / KARTU BUKU BESAR</p>
          <h1 className="text-3xl font-bold text-gray-900 mt-1">{akunData.nama}</h1>
          <div className="flex gap-4 mt-2 text-sm text-gray-600">
            <p><span className="font-semibold text-gray-800">Yayasan:</span> Rumah Etnik Papua (REP)</p>
            <p>&bull;</p>
            <p><span className="font-semibold text-gray-800">Kelompok:</span> {akunData.tipe}</p>
          </div>
        </div>
      </div>

      {/* Tabel Mutasi */}
      <div className="bg-white border border-gray-200 rounded-b-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
              <tr>
                <th className="px-5 py-4 text-center w-12">No</th>
                <th className="px-5 py-4 w-40">Tanggal</th>
                <th className="px-5 py-4">Keterangan Transaksi</th>
                <th className="px-5 py-4 text-right w-36">Debit</th>
                <th className="px-5 py-4 text-right w-36">Kredit</th>
                <th className="px-5 py-4 text-right w-40 bg-blue-50/50">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mutasi.length > 0 ? mutasi.map((item, index) => (
                <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-5 py-4 text-center text-gray-500">{mutasi.length - index}</td>
                  <td className="px-5 py-4 text-gray-600 whitespace-nowrap">{formatTanggal(item.tanggal)}</td>
                  <td className="px-5 py-4 font-medium text-gray-900">{item.keterangan}</td>
                  <td className="px-5 py-4 text-right font-medium text-gray-700">
                    {item.nilaiDebit > 0 ? formatRupiah(item.nilaiDebit) : '-'}
                  </td>
                  <td className="px-5 py-4 text-right font-medium text-gray-700">
                    {item.nilaiKredit > 0 ? formatRupiah(item.nilaiKredit) : '-'}
                  </td>
                  <td className="px-5 py-4 text-right font-bold text-blue-700 bg-blue-50/30">
                    {formatRupiah(item.saldoBerjalan)}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6" className="px-5 py-12 text-center text-gray-500">
                    Belum ada riwayat mutasi tercatat pada akun ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tambahan CSS khusus untuk Print */}
      <style jsx global>{`
        @media print {
          body { background-color: white; }
          aside, nav { display: none !important; }
          main { margin: 0 !important; padding: 0 !important; width: 100% !important; }
        }
      `}</style>
    </div>
  );
}