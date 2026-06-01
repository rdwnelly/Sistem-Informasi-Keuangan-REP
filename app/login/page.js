"use client";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Lock, Mail, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      // Redirection otomatis ditangani oleh AuthContext
    } catch (err) {
      setError("Akses ditolak. Email atau password salah.");
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src="/logo.jpg"
            alt="Logo Sistem Informasi Keuangan REP"
            className="mx-auto mb-4 w-28 h-28 sm:w-32 sm:h-32 md:w-40 md:h-40 object-cover rounded-lg"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            Sistem Informasi Keuangan REP
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            Sistem Informasi Keuangan
            <br />
            Yayasan Rumah Etnik Papua
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-red-700">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">
              Email Manajemen
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="admin@rumahetnikpapua.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">
              Password
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 mt-4"
          >
            {loading ? "Memverifikasi..." : "Masuk ke Sistem"}
          </button>
        </form>
      </div>
    </div>
  );
}
