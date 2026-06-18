"use client";
import { useState, useEffect, useCallback } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Activity,
  RefreshCw,
  ArrowRight,
  BarChart3,
  PieChart as PieIcon,
} from "lucide-react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = [
  "#2563eb",
  "#16a34a",
  "#eab308",
  "#dc2626",
  "#9333ea",
  "#0891b2",
  "#f97316",
];

const formatRupiah = (angka) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(angka);

const formatTanggal = (tgl) =>
  new Date(tgl).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const CustomBarTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 border border-gray-200 shadow-lg rounded-xl">
        <p className="font-bold text-gray-800 mb-2">
          {label} {new Date().getFullYear()}
        </p>
        {payload.map((entry, index) => (
          <p
            key={index}
            className="text-sm font-medium"
            style={{ color: entry.color }}
          >
            {entry.name}: {formatRupiah(entry.value)}
          </p>
        ))}
        <div className="mt-2 pt-2 border-t border-gray-100">
          <p className="text-sm font-bold text-gray-700">
            Laba Kotor: {formatRupiah(payload[0].value - payload[1].value)}
          </p>
        </div>
      </div>
    );
  }
  return null;
};

const CustomPieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-xl">
        <p className="font-bold text-gray-800">{payload[0].name}</p>
        <p className="text-sm font-medium text-papua-primary mt-1">
          Total: {formatRupiah(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const [riwayat, setRiwayat] = useState([]);
  const [dataBar, setDataBar] = useState([]);
  const [dataPie, setDataPie] = useState([]);
  const [stats, setStats] = useState({
    totalKas: 0,
    pendapatanBulanIni: 0,
    biayaBulanIni: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const akunSnap = await getDocs(collection(db, "akun"));
      const mapAkun = {};
      akunSnap.forEach((doc) => {
        mapAkun[doc.data().nama] = doc.data().tipe;
      });

      const namaBulan = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
      const currentYear = new Date().getFullYear();
      const strukturBulanan = namaBulan.map((bulan) => ({
        name: bulan,
        Pendapatan: 0,
        Biaya: 0,
      }));

      const distribusiPendapatan = {
        "Yaswar Cafe": 0,
        "Toko Sovenir": 0,
        "Penyewaan Kostum": 0,
        "Kios REP": 0,
        "Jasa Fotografer": 0,
        "Lain-lain": 0,
      };

      const qJurnal = query(
        collection(db, "jurnal"),
        orderBy("timestamp", "desc"),
      );
      const jurnalSnap = await getDocs(qJurnal);

      const dataRiwayat = [];
      let totalKasSementara = 0;
      let totalPendapatan = 0;
      let totalBiaya = 0;

      const currentMonth = new Date().getMonth();

      jurnalSnap.forEach((doc) => {
        const trx = { id: doc.id, ...doc.data() };
        dataRiwayat.push(trx); 

        const nominal = Number(trx.nominal) || 0;
        const debitNama = trx.akunDebit?.nama;
        const kreditNama = trx.akunKredit?.nama;
        const trxDate = new Date(trx.tanggal);
        const trxYear = trxDate.getFullYear();
        const trxMonthIndex = trxDate.getMonth();

        // Kas
        if (debitNama && debitNama.toUpperCase().includes("KAS")) {
          totalKasSementara += nominal;
        }
        if (kreditNama && kreditNama.toUpperCase().includes("KAS")) {
          totalKasSementara -= nominal;
        }

        // Metrik Bulan Berjalan
        if (trxDate.getMonth() === currentMonth && trxYear === currentYear) {
          if (kreditNama && mapAkun[kreditNama] === "Pendapatan") {
            totalPendapatan += nominal;
          }
          if (debitNama && mapAkun[debitNama] === "Biaya") {
            totalBiaya += nominal;
          }
        }

        // Bar Chart
        if (trxYear === currentYear) {
          if (kreditNama && mapAkun[kreditNama] === "Pendapatan")
            strukturBulanan[trxMonthIndex].Pendapatan += nominal;
          if (debitNama && mapAkun[debitNama] === "Pendapatan")
            strukturBulanan[trxMonthIndex].Pendapatan -= nominal;

          if (debitNama && mapAkun[debitNama] === "Biaya")
            strukturBulanan[trxMonthIndex].Biaya += nominal;
          if (kreditNama && mapAkun[kreditNama] === "Biaya")
            strukturBulanan[trxMonthIndex].Biaya -= nominal;
        }

        // Pie Chart
        if (kreditNama && mapAkun[kreditNama] === "Pendapatan") {
          if (kreditNama.includes("Yaswar Cafe"))
            distribusiPendapatan["Yaswar Cafe"] += nominal;
          else if (kreditNama.includes("Sovenir"))
            distribusiPendapatan["Toko Sovenir"] += nominal;
          else if (kreditNama.includes("Kostum"))
            distribusiPendapatan["Penyewaan Kostum"] += nominal;
          else if (kreditNama.includes("Kios"))
            distribusiPendapatan["Kios REP"] += nominal;
          else if (kreditNama.includes("Fotografer"))
            distribusiPendapatan["Jasa Fotografer"] += nominal;
          else distribusiPendapatan["Lain-lain"] += nominal;
        }
      });

      const pieArray = Object.keys(distribusiPendapatan)
        .map((key) => ({ name: key, value: distribusiPendapatan[key] }))
        .filter((item) => item.value > 0)
        .sort((a, b) => b.value - a.value);

      setDataBar(strukturBulanan);
      setDataPie(pieArray);
      setRiwayat(dataRiwayat.slice(0, 10));
      setStats({
        totalKas: totalKasSementara,
        pendapatanBulanIni: totalPendapatan,
        biayaBulanIni: totalBiaya,
      });
    } catch (error) {
      console.error("Gagal memuat data dashboard:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-papua-primary">Dashboard Utama</h1>
          <p className="text-gray-500 mt-1">
            Ringkasan performa keuangan Yayasan Rumah Etnik Papua.
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-gray-200 shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Segarkan Data
        </button>
      </div>

      {/* METRIK KEUANGAN */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 relative overflow-hidden">
          <div className="absolute right-0 top-0 opacity-5">
            <Wallet className="w-32 h-32 -mt-4 -mr-4" />
          </div>
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className="p-2 bg-papua-accent/10 text-papua-primary rounded-lg">
              <Wallet className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
              Total Kas Aktif
            </h2>
          </div>
          {loading ? (
            <div className="h-9 bg-gray-200 rounded animate-pulse w-3/4 mt-1 relative z-10"></div>
          ) : (
            <p className="text-3xl font-bold text-papua-primary relative z-10">
              {formatRupiah(stats.totalKas)}
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 relative overflow-hidden">
          <div className="absolute right-0 top-0 opacity-5">
            <TrendingUp className="w-32 h-32 -mt-4 -mr-4" />
          </div>
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className="p-2 bg-papua-green/10 text-papua-green rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
              Pendapatan Bulan Ini
            </h2>
          </div>
          {loading ? (
            <div className="h-9 bg-gray-200 rounded animate-pulse w-3/4 mt-1 relative z-10"></div>
          ) : (
            <p className="text-3xl font-bold text-papua-primary relative z-10">
              {formatRupiah(stats.pendapatanBulanIni)}
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 relative overflow-hidden">
          <div className="absolute right-0 top-0 opacity-5">
            <TrendingDown className="w-32 h-32 -mt-4 -mr-4" />
          </div>
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className="p-2 bg-papua-red/10 text-papua-red rounded-lg">
              <TrendingDown className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
              Pengeluaran Bulan Ini
            </h2>
          </div>
          {loading ? (
            <div className="h-9 bg-gray-200 rounded animate-pulse w-3/4 mt-1 relative z-10"></div>
          ) : (
            <p className="text-3xl font-bold text-papua-primary relative z-10">
              {formatRupiah(stats.biayaBulanIni)}
            </p>
          )}
        </div>
      </div>

      {/* GRAFIK ANALITIK */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* BAR CHART */}
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-papua-accent/10 text-papua-primary rounded-lg">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-papua-primary">
                  Arus Kas Bulanan ({new Date().getFullYear()})
                </h2>
                <p className="text-xs text-gray-500">
                  Perbandingan Pendapatan dan Biaya Operasional
                </p>
              </div>
            </div>
            <div className="flex-1 w-full h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dataBar}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f3f4f6"
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#6b7280" }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#6b7280" }}
                    tickFormatter={(value) => `Rp${value / 1000000}M`}
                  />
                  <RechartsTooltip content={<CustomBarTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: "20px" }} />
                  <Bar
                    dataKey="Pendapatan"
                    fill="#2563eb"
                    radius={[4, 4, 0, 0]}
                    barSize={30}
                  />
                  <Bar
                    dataKey="Biaya"
                    fill="#ef4444"
                    radius={[4, 4, 0, 0]}
                    barSize={30}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* PIE CHART */}
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-papua-green/10 text-papua-green rounded-lg">
                <PieIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-papua-primary">
                  Kontribusi Unit Usaha
                </h2>
                <p className="text-xs text-gray-500">
                  Distribusi sumber pendapatan terbesar Yayasan REP
                </p>
              </div>
            </div>
            {dataPie.length > 0 ? (
              <div className="flex-1 w-full h-[350px] flex flex-col">
                <ResponsiveContainer width="100%" height="80%">
                  <PieChart>
                    <Pie
                      data={dataPie}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {dataPie.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                          stroke="none"
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-4 mt-2">
                  {dataPie.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      ></div>
                      <span className="text-xs font-medium text-gray-600">
                        {entry.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
                Belum ada data pendapatan untuk ditampilkan.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TABEL RIWAYAT TRANSAKSI TERBARU */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-bold text-papua-primary">
              10 Transaksi Terakhir
            </h2>
          </div>
          <Link
            href="/jurnal"
            className="text-sm font-medium text-papua-primary hover:text-papua-primary flex items-center gap-1 transition-colors"
          >
            Lihat Semua Jurnal <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center p-12">
              <RefreshCw className="w-6 h-6 text-papua-accent animate-spin" />
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-white text-gray-600 font-medium border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">Tanggal</th>
                  <th className="px-6 py-4">Keterangan</th>
                  <th className="px-6 py-4">Debit</th>
                  <th className="px-6 py-4">Kredit</th>
                  <th className="px-6 py-4 text-right">Nominal (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {riwayat.length > 0 ? (
                  riwayat.map((trx) => (
                    <tr
                      key={trx.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                        {formatTanggal(trx.tanggal)}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-papua-primary">
                          {trx.keterangan}
                        </p>
                        {trx.isSingleEntry && (
                          <span className="inline-block mt-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded">
                            SINGLE-ENTRY
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        {trx.akunDebit ? (
                          <span className="bg-papua-accent/10 text-papua-primary px-2 py-1 rounded text-xs font-medium border border-blue-100 truncate max-w-[150px] inline-block">
                            {trx.akunDebit.nama}
                          </span>
                        ) : (
                          <span className="text-gray-400 font-bold">-</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        {trx.akunKredit ? (
                          <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium border border-gray-200 truncate max-w-[150px] inline-block">
                            {trx.akunKredit.nama}
                          </span>
                        ) : (
                          <span className="text-gray-400 font-bold">-</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right font-bold text-papua-primary whitespace-nowrap">
                        {formatRupiah(trx.nominal)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="5"
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      Belum ada aktivitas transaksi hari ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
