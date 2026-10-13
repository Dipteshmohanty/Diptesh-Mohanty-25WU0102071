import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Store, LogOut, Database, User, ShieldCheck } from 'lucide-react';
import api from '../services/api';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [dbStatus, setDbStatus] = useState({ connected: true, loading: false });

  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await api.get('/health');
        setDbStatus({ connected: res.status === 'healthy', loading: false });
      } catch (e) {
        setDbStatus({ connected: false, loading: false });
      }
    }
    checkHealth();
    const timer = setInterval(checkHealth, 30000);
    return () => clearInterval(timer);
  }, []);

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN':
        return <span className="bg-indigo-100 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider">Administrator</span>;
      case 'CASHIER':
        return <span className="bg-emerald-100 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider">Cashier / POS</span>;
      case 'INVENTORY_MANAGER':
        return <span className="bg-amber-100 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider">Stock Lead</span>;
      default:
        return null;
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="px-6 py-3.5 flex items-center justify-between">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight">FreshMart Retail System</h1>
            <p className="text-xs text-slate-500 font-medium">Inventory & Sales Management ERP</p>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-4">
          {/* Database Health Pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs">
            <Database className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">MySQL:</span>
            <span className={`inline-block w-2 h-2 rounded-full ${dbStatus.connected ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
            <span className={`font-medium ${dbStatus.connected ? 'text-emerald-700' : 'text-rose-700'}`}>
              {dbStatus.connected ? 'Live' : 'Offline'}
            </span>
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
            <div className="text-right hidden md:block">
              <div className="text-sm font-semibold text-slate-900">{user?.full_name}</div>
              <div className="text-xs text-slate-500">{user?.email}</div>
            </div>
            {getRoleBadge(user?.role)}
            <button
              onClick={logout}
              title="Logout session"
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition ml-1"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
