import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Menu, 
  X, 
  LayoutDashboard, 
  Users, 
  Package, 
  Barcode, 
  ArrowLeftRight, 
  Warehouse, 
  ClipboardList, 
  Smartphone,
  Database
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { isSupabaseConfigured } from '../../services/api';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/' },
  { icon: Users, label: 'Pessoas', to: '/pessoas' },
  { icon: Package, label: 'Produtos', to: '/produtos' },
  { icon: Barcode, label: 'Códigos de Barras', to: '/codigos-de-barras' },
  { icon: ArrowLeftRight, label: 'Movimentações', to: '/movimentacoes' },
  { icon: Warehouse, label: 'Estoque', to: '/estoque' },
  { icon: ClipboardList, label: 'Relatórios', to: '/relatorios' },
  { icon: Smartphone, label: 'Captação Celular', to: '/captacao-celular', highlight: true },
];

export function MobileHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  // Close menu when navigation happens
  const handleItemClick = () => {
    setIsOpen(false);
  };

  return (
    <header className="lg:hidden sticky top-0 z-50 w-full bg-white border-b border-outline-variant shadow-xs">
      {/* Top Bar */}
      <div className="flex items-center justify-between h-16 px-4">
        <div className="flex items-center space-x-2">
          <h1 className="text-xl font-black text-primary tracking-tight">Almoxarifado</h1>
          {isSupabaseConfigured() ? (
            <span className="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-emerald-150">
              On
            </span>
          ) : (
            <span className="bg-amber-50 text-amber-600 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-amber-150">
              Mock
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Quick shortcut to Cell Capture */}
          <NavLink 
            to="/captacao-celular"
            onClick={handleItemClick}
            className={cn(
              "flex items-center space-x-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all border",
              location.pathname === '/captacao-celular'
                ? "bg-slate-900 border-slate-900 text-white"
                : "bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100"
            )}
          >
            <Smartphone className="w-4 h-4" />
            <span>Captação Celular</span>
          </NavLink>

          {/* Hamburger Menu Toggle */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg focus:outline-none transition-colors"
            aria-label="Abrir menu"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Slide-out Menu Mobile Overlay & Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 top-16 bg-black/40 z-30"
              onClick={() => setIsOpen(false)}
            />

            {/* Menu List */}
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="fixed left-0 right-0 top-16 z-40 bg-white border-b border-outline-variant shadow-lg max-h-[calc(100vh-4rem)] overflow-y-auto"
            >
              <nav className="p-4 space-y-1.5">
                {navItems.map((item) => (
                  <NavLink
                    key={item.label}
                    to={item.to}
                    onClick={handleItemClick}
                    className={({ isActive }) => cn(
                      "flex items-center px-4 py-3 rounded-xl transition-all",
                      isActive
                        ? "bg-primary/10 text-primary font-bold"
                        : item.highlight 
                          ? "bg-sky-50 text-sky-700 font-bold border border-sky-100"
                          : "text-slate-700 hover:bg-slate-50 font-medium"
                    )}
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon className={cn("w-5 h-5 mr-3", isActive ? "text-primary" : item.highlight ? "text-sky-600" : "text-slate-500")} />
                        <span className="text-sm">{item.label}</span>
                        {item.highlight && (
                          <span className="ml-auto text-[10px] text-sky-700 font-extrabold uppercase bg-sky-100 rounded-full px-2 py-0.5 animate-pulse">
                            Coletor
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
