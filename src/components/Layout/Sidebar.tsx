import { 
  LayoutDashboard, 
  Users, 
  Package, 
  Barcode, 
  ArrowLeftRight, 
  Warehouse, 
  ClipboardList,
  LogOut,
  Database
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/src/lib/utils';
import { api, isSupabaseConfigured } from '@/src/services/api';
import { useState, useEffect } from 'react';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/' },
  { icon: Users, label: 'Pessoas', to: '/pessoas' },
  { icon: Package, label: 'Produtos', to: '/produtos' },
  { icon: Barcode, label: 'Códigos de Barras', to: '/codigos-de-barras' },
  { icon: ArrowLeftRight, label: 'Movimentações', to: '/movimentacoes' },
  { icon: Warehouse, label: 'Estoque', to: '/estoque' },
  { icon: ClipboardList, label: 'Relatórios', to: '/relatorios' },
];

export function Sidebar() {
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'disconnected'|'error'>('checking');

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setDbStatus('disconnected');
      return;
    }
    
    api.checkConnection().then(isConnected => {
      setDbStatus(isConnected ? 'connected' : 'error');
    });
  }, []);

  return (
    <aside className="hidden lg:flex flex-col h-screen fixed left-0 top-0 w-64 z-40 bg-white border-r border-outline-variant">
      <div className="p-6">
        <h1 className="text-2xl font-black text-primary tracking-tight">Almoxarifado</h1>
        <p className="text-sm text-on-surface-variant/70">Gestão de Estoque</p>
      </div>
      
      <nav className="flex-1 mt-4">
        <div className="px-6 mb-4">
          <div 
            className={cn(
              "flex items-center justify-center w-fit text-xs font-semibold px-3 py-1.5 rounded-full border",
              dbStatus === 'connected' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
              dbStatus === 'error' ? "bg-red-50 text-red-700 border-red-200" :
              dbStatus === 'disconnected' ? "bg-gray-50 text-gray-600 border-gray-200" :
              "bg-blue-50 text-blue-700 border-blue-200"
            )}
            title={
              dbStatus === 'connected' ? 'Supabase conectado' :
              dbStatus === 'error' ? 'Erro ao conectar ao Supabase (verifique credenciais ou rede)' :
              dbStatus === 'disconnected' ? 'Usando dados mock (Supabase não configurado no .env)' :
              'Verificando conexão...'
            }
          >
            <Database className="w-3.5 h-3.5 mr-1.5" />
            {dbStatus === 'connected' ? 'Supabase' : dbStatus === 'error' ? 'Erro DB' : dbStatus === 'disconnected' ? 'Local Mock' : 'Conectando...'}
          </div>
        </div>
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.label}>
              <NavLink 
                to={item.to}
                className={({ isActive }) => cn(
                  "flex items-center px-6 py-3 text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-all",
                  isActive && "sidebar-item-active text-primary"
                )}
              >
                <item.icon className="w-5 h-5 mr-3" />
                <span className="text-sm font-medium">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-6 border-t border-outline-variant mt-auto">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-surface-container-highest border border-outline-variant overflow-hidden">
            <img 
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop" 
              alt="Admin" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <p className="text-sm font-bold text-on-surface">Admin Geral</p>
            <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">Unidade Central</p>
          </div>
        </div>
        <button className="flex items-center text-sm text-error hover:opacity-80 transition-opacity">
          <LogOut className="w-4 h-4 mr-2" />
          Sair do Sistema
        </button>
      </div>
    </aside>
  );
}
