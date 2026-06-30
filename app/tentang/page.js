"use client";
import {
  Building2,
  MapPin,
  Globe,
  CheckCircle2,
  Server,
  Users,
  Code2,
  Link,
  Heart,
  MessageCircle,
} from "lucide-react";

export default function TentangPage() {
  return (
    <div className="max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="mb-8 border-b border-gray-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-100 rounded-lg">
            <Building2 className="w-6 h-6 text-gray-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Tentang Aplikasi
            </h1>
            <p className="text-gray-500 mt-1">
              Sistem Informasi Keuangan & Operasional (SIK-REP)
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="flex flex-col gap-6">
        {/* Top Section - Yayasan Info */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center gap-3">
            <Building2 className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-bold text-gray-800">
              Yayasan Rumah Etnik Papua (REP)
            </h2>
          </div>
          <div className="p-6 md:p-8 space-y-6">
            <div className="flex items-center gap-2 bg-gray-50 p-4 rounded-xl border border-gray-100 w-full">
              <MapPin className="w-5 h-5 text-yellow-500 shrink-0" />
              <span className="text-sm text-gray-700 font-medium">
                Jalan Baru Aimas - Klamono Km. 21, Kabupaten Sorong, Provinsi Papua Barat Daya.
              </span>
            </div>
            
            <p className="text-gray-600 text-sm md:text-base leading-relaxed text-justify">
              Kami didirikan dengan visi luhur untuk menjadi pusat wisata budaya dan edukasi Papua yang berkelanjutan, serta menjadi motor penggerak pelestarian budaya dan pemberdayaan masyarakat asli Papua.
            </p>
            <p className="text-gray-600 text-sm md:text-base leading-relaxed text-justify">
              Sebagai wujud nyata pelestarian adat istiadat, REP menghadirkan pengalaman autentik melalui berbagai fasilitas unggulan, seperti wisata arsitektur rumah tradisional, Museum Budaya Mini, penyewaan pakaian adat, sajian kuliner khas di <span className="font-bold">Yaswar Cafe</span>, atraksi seni pertunjukan, hingga fasilitas akomodasi <span className="font-bold">Homestay</span> bernuansa etnik Papua.
            </p>
          </div>
        </div>

        {/* Bottom Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Misi Digitalisasi */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8 flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <Globe className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-gray-800">Misi Digitalisasi Kami</h2>
            </div>
            
            <p className="text-gray-600 text-sm leading-relaxed mb-6 text-justify">
              Sistem ini merupakan bagian dari langkah transformasi digital Yayasan Rumah Etnik Papua untuk menghadirkan tata kelola administrasi yang efisien, transparan, dan profesional. Ekosistem digital REP mencakup:
            </p>
            
            <div className="space-y-5 mb-8 flex-1">
              <div className="flex gap-4">
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-gray-800 text-sm mb-1">Sistem Manajemen Reservasi Homestay</h4>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    Mengelola ketersediaan kamar, riwayat tamu, dan layanan hospitality yang terintegrasi.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-gray-800 text-sm mb-1">Sistem Informasi Keuangan (SIK-REP)</h4>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    Memastikan pencatatan akuntansi, buku besar, dan laba-rugi berjalan secara real-time dan akurat.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-gray-800 text-sm mb-1">Operasional Manajemen Gudang (OMG)</h4>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    Mengelola rantai pasok (supply chain) suvenir kerajinan tangan lokal dan bahan baku unit bisnis.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 flex gap-4 items-center">
              <Server className="w-6 h-6 text-blue-500 shrink-0" />
              <p className="text-blue-800 text-sm font-medium leading-relaxed">
                Sistem ini didukung oleh teknologi Cloud Serverless yang tangguh dan aman, serta dilengkapi fitur Progressive Web App (PWA) untuk memberikan pengalaman pengguna terbaik di berbagai perangkat.
              </p>
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* Pengurus Card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <Users className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-bold text-gray-800">Susunan Pengurus Yayasan</h2>
              </div>
              <p className="text-gray-600 text-sm mb-6">
                Sistem ini beroperasi di bawah naungan susunan organ Yayasan Rumah Etnik Papua:
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                  <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-lg shrink-0">
                    FB
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800 text-sm">Fricky Mosche Burdam</h4>
                    <p className="text-gray-500 text-sm">Ketua Pembina Yayasan</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                  <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-lg shrink-0">
                    MW
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800 text-sm">Mitshi Wanma</h4>
                    <p className="text-gray-500 text-sm">Ketua Pengurus / Pimpinan REP</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Developer Info Card */}
            <div className="bg-[#1C2331] rounded-2xl shadow-sm p-6 md:p-8 flex-1 flex flex-col justify-between text-gray-300">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <Code2 className="w-5 h-5 text-yellow-400" />
                  <h2 className="text-lg font-bold text-white">Informasi Pengembang</h2>
                </div>
                <p className="text-sm leading-relaxed mb-6">
                  Arsitektur dan ekosistem perangkat lunak ini dirancang, dibangun, dan dikembangkan secara dedikatif oleh:
                </p>
                <div className="mb-8">
                  <h3 className="text-yellow-400 font-bold text-base mb-1">Ridwan Elly</h3>
                  <p className="text-sm text-gray-400">Lead Full-Stack Software Engineer</p>
                </div>
                
                <div className="flex flex-wrap gap-3 mb-8">
                  <a href="https://wa.me/6281342310203" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-colors px-4 py-2 rounded-lg text-sm text-white font-medium">
                    <MessageCircle className="w-4 h-4 text-green-400" />
                    0813 4231 0203
                  </a>
                  <a href="https://github.com/rdwnelly" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-colors px-4 py-2 rounded-lg text-sm text-white font-medium">
                    <Link className="w-4 h-4" />
                    github.com/rdwnelly
                  </a>
                </div>
              </div>

              <div className="pt-6 border-t border-white/10 flex items-center justify-center text-xs text-gray-400 text-center gap-1">
                Dibuat dengan <Heart className="w-3 h-3 text-red-500 mx-1 fill-current" /> untuk kemajuan dan pelestarian budaya di Tanah Papua.
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
