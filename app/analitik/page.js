"use client";
import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
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
import { RefreshCw, BarChart3, PieChart as PieIcon } from "lucide-react";

// Palet warna yang selaras dengan desain Tailwind dan branding REP
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

// Custom Tooltip untuk Bar Chart
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

// Custom Tooltip untuk Pie Chart
const CustomPieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-xl">
        <p className="font-bold text-gray-800">{payload[0].name}</p>
        <p className="text-sm font-medium text-blue-600 mt-1">
          Total: {formatRupiah(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

export default function AnalitikPage() {
  const [dataBar, setDataBar] = useState([]);
  const [dataPie, setDataPie] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAnalitikData = async () => {
    setLoading(true);
    try {
      // 1. Persiapan Struktur Data Bulanan
      const namaBulan = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "Mei",
        "Jun",
        "Jul",
        "Ags",
        "Sep",
        "Okt",
        "Nov",
        "Des",
      ];
      const currentYear = new Date().getFullYear();

      const strukturBulanan = namaBulan.map((bulan) => ({
        name: bulan,
        Pendapatan: 0,
        Biaya: 0,
      }));

      // 2. Persiapan Struktur Data Pie Chart (Distribusi Unit Usaha)
      const distribusiPendapatan = {
        "Yaswar Cafe": 0,
        "Toko Sovenir": 0,
        "Penyewaan Kostum": 0,
        "Kios REP": 0,
        "Jasa Fotografer": 0,
        "Lain-lain": 0,
      };

      // 3. Tarik Referensi Akun untuk Pemetaan Tipe
      const akunSnap = await getDocs(collection(db, "akun"));
      const mapAkun = {};
      akunSnap.forEach((doc) => {
        const data = doc.data();
        mapAkun[data.nama] = data.tipe;
      });

      // 4. Tarik Riwayat Jurnal
      const qJurnal = query(
        collection(db, "jurnal"),
        orderBy("timestamp", "asc"),
      );
      const jurnalSnap = await getDocs(qJurnal);

      jurnalSnap.forEach((doc) => {
        const trx = doc.data();
        const trxDate = new Date(trx.tanggal);
        const trxYear = trxDate.getFullYear();
        const trxMonthIndex = trxDate.getMonth(); // 0 - 11
        const nominal = Number(trx.nominal) || 0;

        const debitNama = trx.akunDebit?.nama;
        const kreditNama = trx.akunKredit?.nama;

        // --- LOGIKA BAR CHART (Pendapatan vs Biaya Tahun Berjalan) ---
        if (trxYear === currentYear) {
          // Pendapatan bertambah di Kredit
          if (mapAkun[kreditNama] === "Pendapatan")
            strukturBulanan[trxMonthIndex].Pendapatan += nominal;
          // Koreksi Pendapatan (jika di Debit)
          if (mapAkun[debitNama] === "Pendapatan")
            strukturBulanan[trxMonthIndex].Pendapatan -= nominal;

          // Biaya bertambah di Debit
          if (mapAkun[debitNama] === "Biaya")
            strukturBulanan[trxMonthIndex].Biaya += nominal;
          // Koreksi Biaya (jika di Kredit)
          if (mapAkun[kreditNama] === "Biaya")
            strukturBulanan[trxMonthIndex].Biaya -= nominal;
        }

        // --- LOGIKA PIE CHART (Distribusi Unit Usaha Semua Waktu/Tahun Ini) ---
        // Kita hitung Pendapatan kotor per unit (bertambah di Kredit)
        if (mapAkun[kreditNama] === "Pendapatan") {
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

      // 5. Konversi Object ke Array untuk Recharts
      const pieArray = Object.keys(distribusiPendapatan)
        .map((key) => ({ name: key, value: distribusiPendapatan[key] }))
        .filter((item) => item.value > 0) // Sembunyikan unit yang belum ada pendapatan
        .sort((a, b) => b.value - a.value);

      setDataBar(strukturBulanan);
      setDataPie(pieArray);
    } catch (error) {
      console.error("Gagal memuat data analitik:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalitikData();
  }, []);

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Dashboard Analitik
          </h1>
          <p className="text-gray-500 mt-1">
            Visualisasi performa keuangan dan kontribusi unit usaha REP.
          </p>
        </div>
        <button
          onClick={fetchAnalitikData}
          disabled={loading}
          className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-gray-200 shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Segarkan Grafik
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border border-gray-100 shadow-sm">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-4" />
          <p className="text-gray-500 font-medium">
            Menganalisis data keuangan...
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* GRAFIK 1: BAR CHART (Pendapatan vs Biaya) */}
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">
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
                    tickFormatter={(value) => `Rp${value / 1000000}M`} // Mempersingkat angka jadi Juta/Miliar
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

          {/* GRAFIK 2: PIE CHART (Kontribusi Unit Usaha) */}
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <PieIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">
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
                      innerRadius={80} // Membuatnya menjadi Donut Chart (Lebih modern)
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

                {/* Custom Legend yang rapi di bawah grafik Pie */}
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
    </div>
  );
}
