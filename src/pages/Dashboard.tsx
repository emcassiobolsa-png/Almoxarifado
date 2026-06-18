import { useState, useEffect } from 'react';
import { 
  Package, 
  Users, 
  Edit3, 
  CheckCircle, 
  AlertTriangle, 
  Clock,
  ArrowRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn, formatDate } from '@/src/lib/utils';
import { api } from '../services/api';
import { differenceInDays, parseISO } from 'date-fns';
import { Movimentacao } from '../types';

export function Dashboard() {
  const [metricsData, setMetricsData] = useState<{
    produtosCount: number;
    pessoasCount: number;
    emDigitacao: number;
    processadasMes: number;
    estoqueBaixo: number;
    proximosVencimento: number;
  } | null>(null);

  const [ultimasMovimentacoes, setUltimasMovimentacoes] = useState<Movimentacao[]>([]);
  const [syncTime, setSyncTime] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { produtosCount, pessoasCount, movimentacoes, estoque } = await api.getDashboardMetrics();
        
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const emDigitacao = movimentacoes.filter(m => m.status === 'DIGITANDO').length;
        const processadasMesCount = movimentacoes.filter(m => {
          if (m.status !== 'PROCESSADO') return false;
          let dt: Date;
          if (m.datahora.includes('/')) {
             const [datePart] = m.datahora.split(' ');
             const [day, month, year] = datePart.split('/');
             dt = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          } else {
             dt = new Date(m.datahora);
          }
          if (isNaN(dt.getTime())) return false;
          return dt.getMonth() === currentMonth && dt.getFullYear() === currentYear;
        }).length;

        const estoqueBaixo = estoque.filter(e => e.qtd_estoque > 0 && e.qtd_estoque <= 10).length; // Adjust threshold if needed
        const proximosVencimento = estoque.filter(e => {
          const days = differenceInDays(parseISO(e.vencimento), now);
          return days >= 0 && days <= 30; // Upcoming in next 30 days
        }).length;

        setMetricsData({
          produtosCount,
          pessoasCount,
          emDigitacao,
          processadasMes: processadasMesCount,
          estoqueBaixo,
          proximosVencimento
        });

        setUltimasMovimentacoes(movimentacoes.slice(0, 5)); // top 5
        setSyncTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Cuiaba' }));
      } catch (error) {
        console.error("Failed to fetch dashboard metrics", error);
      }
    };
    
    fetchData();
  }, []);

  const metrics = [
    { label: 'Total de produtos', value: metricsData ? metricsData.produtosCount.toLocaleString('pt-BR') : '...', icon: Package, color: 'text-primary', bg: 'bg-surface-container-high' },
    { label: 'Pessoas cadastradas', value: metricsData ? metricsData.pessoasCount.toLocaleString('pt-BR') : '...', icon: Users, color: 'text-primary', bg: 'bg-surface-container-high' },
    { label: 'Em digitação', value: metricsData ? metricsData.emDigitacao.toLocaleString('pt-BR') : '...', icon: Edit3, color: 'text-primary', bg: 'bg-surface-container-high' },
    { label: 'Processadas no mês', value: metricsData ? metricsData.processadasMes.toLocaleString('pt-BR') : '...', icon: CheckCircle, color: 'text-secondary', bg: 'bg-green-100' },
    { label: 'Estoque baixo', value: metricsData ? metricsData.estoqueBaixo.toLocaleString('pt-BR') : '...', icon: AlertTriangle, color: 'text-error', bg: 'bg-error-container' },
    { label: 'Próximos do vencimento', value: metricsData ? metricsData.proximosVencimento.toLocaleString('pt-BR') : '...', icon: Clock, color: 'text-amber-700', bg: 'bg-amber-100' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-primary tracking-tight">Dashboard</h2>
          <p className="text-on-surface-variant">Bem-vindo, acompanhe aqui o resumo das atividades do almoxarifado.</p>
        </div>
        <div className="flex space-x-2">
          <span className="inline-flex items-center bg-white px-3 py-1 rounded-full text-xs font-medium border border-outline-variant">
            <span className="w-2 h-2 rounded-full bg-green-500 mr-2" /> 
            Sistema Online
          </span>
          {syncTime && (
            <span className="inline-flex items-center bg-white px-3 py-1 rounded-full text-xs font-medium border border-outline-variant">
              Sincronizado: {syncTime}
            </span>
          )}
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {metrics.map((item, index) => (
          <motion.div 
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white border border-outline-variant p-6 rounded-xl flex items-center space-x-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center", item.bg)}>
              <item.icon className={cn("w-6 h-6", item.color)} />
            </div>
            <div>
              <p className="text-xs font-bold text-on-surface-variant uppercase opacity-60 tracking-wider">
                {item.label}
              </p>
              <h4 className="text-2xl font-bold text-on-surface">{item.value}</h4>
            </div>
          </motion.div>
        ))}
      </section>

      <section className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-low/30">
          <h3 className="text-lg font-bold text-primary">Últimas Movimentações</h3>
          <button className="text-primary text-sm font-bold flex items-center hover:underline">
            Ver tudo <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse zebra-table">
            <thead>
              <tr className="bg-surface-container-low/50 text-on-surface-variant text-[11px] font-bold uppercase tracking-widest">
                <th className="px-6 py-4">Data/Hora</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-4 py-4">Entrada/Saída</th>
                <th className="px-6 py-4">Responsável</th>
                <th className="px-6 py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-outline-variant">
              {ultimasMovimentacoes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-on-surface-variant">
                    Nenhuma movimentação encontrada.
                  </td>
                </tr>
              ) : ultimasMovimentacoes.map((row, i) => (
                <tr key={i} className="hover:bg-surface-container-low/30 transition-colors">
                  <td className="px-6 py-4 font-medium">{formatDate(row.datahora)}</td>
                  <td className="px-6 py-4 font-semibold text-primary">{row.tipo_movimentaca === 'ENTRADA' ? (row.doc_entrada ? 'Compra/Entrada' : 'Entrada Avulsa') : 'Saída'}</td>
                  <td className="px-4 py-4">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-black uppercase",
                      row.entrada_saida === 'ENTRADA' ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    )}>
                      {row.entrada_saida}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant">{row.pessoa?.nomeFantasia || row.pessoa?.razaoSocial || 'N/A'}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight",
                      row.status === 'PROCESSADO' && "bg-green-100 text-green-700",
                      row.status === 'DIGITANDO' && "bg-blue-100 text-blue-700",
                      row.status === 'ESTORNADO' && "bg-amber-100 text-amber-700",
                      row.status === 'CANCELADO' && "bg-slate-100 text-slate-700"
                    )}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
