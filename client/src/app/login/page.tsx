'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, Loader2, Zap } from 'lucide-react';
import api from '@/lib/api';
import { useSettings } from '@/contexts/SettingsContext';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { settings, isLoading: isSettingsLoading } = useSettings();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005';
      const res = await fetch(`${API_BASE}/api/v1/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (data.success) {
        localStorage.setItem('staff_token', data.data.token);
        localStorage.setItem('staff_user', JSON.stringify(data.data.user));
        router.push('/dashboard');
      } else {
        setError(data.message || 'รหัสผ่านไม่ถูกต้อง');
      }
    } catch (err) {
      setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ (กรุณาตรวจสอบว่า Backend รันอยู่ที่พอร์ต 3005 หรือไม่)');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSettingsLoading) {
    return <div className="fixed inset-0 bg-[#060913] z-[200]"></div>;
  }

  return (
    <div className="flex flex-col justify-center items-center py-20 px-4 sm:px-6 lg:px-8">
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md animate-fade-in-up">
        
        {/* Glassmorphism Card */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 py-10 px-6 shadow-2xl sm:rounded-2xl sm:px-10 relative overflow-hidden">
          
          {/* Decorative Glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl"></div>

          <div className="text-center mb-8 relative z-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 mb-4 shadow-lg shadow-blue-500/30">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-white mt-4 tracking-tight">Staff Login</h1>
            <p className="text-xs text-slate-400 mt-2">
              เข้าสู่ระบบจัดการ {settings.event_name || 'Smart Event Registration'}
            </p>
          </div>

          <form className="space-y-6 relative z-10" onSubmit={handleLogin}>
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm p-4 rounded-xl text-center backdrop-blur-sm animate-pulse-fast">
                {error}
              </div>
            )}
            
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-300">
                Username
              </label>
              <div className="mt-2 relative rounded-xl shadow-sm group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  className="block w-full pl-12 pr-4 py-3 bg-slate-950/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all outline-none"
                  placeholder="superadmin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                Password
              </label>
              <div className="mt-2 relative rounded-xl shadow-sm group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="block w-full pl-12 pr-4 py-3 bg-slate-950/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm transition-all outline-none"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-blue-500 disabled:opacity-50 transition-all overflow-hidden"
              >
                <div className="absolute inset-0 w-full h-full bg-white/20 group-hover:scale-x-100 scale-x-0 origin-left transition-transform duration-300 ease-out"></div>
                {isLoading ? (
                  <span className="flex items-center relative z-10">
                    <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                    กำลังตรวจสอบ...
                  </span>
                ) : (
                  <span className="flex items-center relative z-10">
                    <Zap className="w-5 h-5 mr-2" />
                    เข้าสู่ระบบ
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
