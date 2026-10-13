import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Layers,
  Truck,
  FileText,
  Boxes,
  Users,
  BarChart3,
  ClipboardList
} from 'lucide-react';

export default function Sidebar({ activeTab, onSelectTab }) {
  const { user, isAdmin, isCashier, isManager } = useAuth();

  const navItems = [
    // Admin & General Dashboard
    {
      id: 'dashboard',
      label: 'Admin Overview',
      icon: LayoutDashboard,
      roles: ['ADMIN']
    },
    {
      id: 'inventory-dashboard',
      label: 'Stock Overview',
      icon: LayoutDashboard,
      roles: ['INVENTORY_MANAGER']
    },
    // Cashier & POS
    {
      id: 'pos',
      label: 'Point of Sale (POS)',
      icon: ShoppingCart,
      roles: ['ADMIN', 'CASHIER']
    },
    // Inventory & Catalog
    {
      id: 'products',
      label: 'Products Catalog',
      icon: Package,
      roles: ['ADMIN', 'INVENTORY_MANAGER']
    },
    {
      id: 'categories',
      label: 'Categories',
      icon: Layers,
      roles: ['ADMIN', 'INVENTORY_MANAGER']
    },
    {
      id: 'inventory',
      label: 'Stock & Movements',
      icon: Boxes,
      roles: ['ADMIN', 'INVENTORY_MANAGER']
    },
    {
      id: 'purchases',
      label: 'Purchase Restocking',
      icon: Truck,
      roles: ['ADMIN', 'INVENTORY_MANAGER']
    },
    {
      id: 'suppliers',
      label: 'Suppliers',
      icon: Truck,
      roles: ['ADMIN', 'INVENTORY_MANAGER']
    },
    // Sales Management
    {
      id: 'sales',
      label: 'Sales & Invoices',
      icon: FileText,
      roles: ['ADMIN', 'CASHIER']
    },
    // Reports & Analytics
    {
      id: 'reports',
      label: 'Financial & Reports',
      icon: BarChart3,
      roles: ['ADMIN', 'INVENTORY_MANAGER']
    },
    // Administration
    {
      id: 'users',
      label: 'User Management',
      icon: Users,
      roles: ['ADMIN']
    },
    {
      id: 'audit',
      label: 'System Audit Logs',
      icon: ClipboardList,
      roles: ['ADMIN']
    }
  ];

  const allowedItems = navItems.filter(item => item.roles.includes(user?.role));

  return (
    <aside className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-65px)] flex flex-col p-4 shrink-0 shadow-xs">
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-3 mb-2">
        Main Navigation
      </div>
      <nav className="space-y-1 flex-1">
        {allowedItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 shadow-xs border border-indigo-100 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Role Notice at Bottom */}
      <div className="pt-4 border-t border-slate-100 text-xs text-slate-400 px-3">
        Logged in as <span className="font-semibold text-slate-600">{user?.role}</span>
      </div>
    </aside>
  );
}
