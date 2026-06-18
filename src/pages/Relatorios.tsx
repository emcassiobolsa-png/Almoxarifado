import { useState, useEffect, useMemo } from 'react';
import { 
  UserSearch, 
  LogIn, 
  LogOut, 
  FileBox, 
  CalendarClock, 
  Activity,
  History,
  CheckCircle2,
  ChevronRight,
  Printer,
  X,
  Download,
  AlertTriangle,
  Calendar,
  Search,
  ArrowLeft,
  RefreshCw,
  Layers,
  Coins,
  TrendingDown,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { api } from '../services/api';
import { Pessoa, Produto, Categoria, Movimentacao, Estoque } from '../types';
import { differenceInDays, parseISO } from 'date-fns';

const cards = [
  { id: 'movimentacao_individual', icon: UserSearch, label: 'Movimentação individual', desc: 'Rastreie ações realizadas por um colaborador ou fornecedor específico.', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { id: 'entradas_periodo', icon: LogIn, label: 'Entradas por período', desc: 'Analise o volume de abastecimento e doações em datas customizadas.', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { id: 'saidas_periodo', icon: LogOut, label: 'Saídas por período', desc: 'Controle o fluxo de consumo, descarte e distribuição de materiais.', color: 'bg-rose-100 text-rose-800 border-rose-200' },
  { id: 'estoque_atual', icon: FileBox, label: 'Estoque atual', desc: 'Posição completa de todos os itens disponíveis em tempo real com valores.', color: 'bg-primary text-white border-primary/20', full: true },
  { id: 'vencimentos_criticos', icon: CalendarClock, label: 'Próximos do vencimento', desc: 'Evite prejuízos identificando itens com validade crítica ou já vencidos.', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'itens_sem_movimentacao', icon: Activity, label: 'Itens sem movimentação', desc: 'Identifique "itens parados" sem giro no estoque para otimização.', color: 'bg-slate-100 text-slate-800 border-slate-200' },
];

interface PrintLog {
  id: string;
  datetime: string;
  reportLabel: string;
  filters: string;
  recordsCount: number;
}

export function Relatorios() {
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [logs, setLogs] = useState<PrintLog[]>([]);

  // Raw Database States
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [movs, setMovs] = useState<Movimentacao[]>([]);
  const [estoque, setEstoque] = useState<Estoque[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Individual Filter States
  const [filterPessoaId, setFilterPessoaId] = useState<string>('ALL');
  const [filterStartDate, setFilterStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().substring(0, 10);
  });
  const [filterEndDate, setFilterEndDate] = useState<string>(() => {
    return new Date().toISOString().substring(0, 10);
  });
  const [filterSearch, setFilterSearch] = useState<string>('');
  const [filterCategoriaId, setFilterCategoriaId] = useState<string>('ALL');
  const [filterVencimentoRange, setFilterVencimentoRange] = useState<string>('ALL');
  const [filterSemMovDias, setFilterSemMovDias] = useState<string>('30');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Load baseline logs & config
  useEffect(() => {
    const savedLogs = localStorage.getItem('app_relatorios_print_logs');
    if (savedLogs) {
      try {
        setLogs(JSON.parse(savedLogs));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Fetch core data dynamically based on active report to avoid redundant heavy loads
  const loadReportData = async (reportId: string) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      if (reportId === 'movimentacao_individual') {
        const [pData, mData] = await Promise.all([
          api.getPessoas(),
          api.getMovimentacoes()
        ]);
        setPessoas(pData || []);
        setMovs(mData || []);
      } else if (reportId === 'entradas_periodo' || reportId === 'saidas_periodo') {
        const mData = await api.getMovimentacoes();
        setMovs(mData || []);
      } else if (reportId === 'estoque_atual') {
        const [eData, cData] = await Promise.all([
          api.getEstoque(),
          api.getCategorias()
        ]);
        setEstoque(eData || []);
        setCategorias(cData || []);
      } else if (reportId === 'vencimentos_criticos') {
        const eData = await api.getEstoque();
        setEstoque(eData || []);
      } else if (reportId === 'itens_sem_movimentacao') {
        const [pData, eData, mData, cData] = await Promise.all([
          api.getProdutos(),
          api.getEstoque(),
          api.getMovimentacoes(),
          api.getCategorias()
        ]);
        setProdutos(pData || []);
        setEstoque(eData || []);
        setMovs(mData || []);
        setCategorias(cData || []);
      }
    } catch (err: any) {
      console.error("Error loading report data:", err);
      setErrorMsg(err.message || 'Falha ao carregar dados do banco de dados.');
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger loading when active report changes
  useEffect(() => {
    if (activeReportId) {
      loadReportData(activeReportId);
    }
  }, [activeReportId]);

  // Utility Date Formatter
  const formatDateStr = (dateStr?: string) => {
    if (!dateStr) return '---';
    try {
      const cleanStr = dateStr.split('T')[0];
      return cleanStr.split('-').reverse().join('/');
    } catch (e) {
      return dateStr;
    }
  };

  // Log action in history
  const logPrintAction = (reportTitle: string, filters: string, count: number) => {
    const newLog: PrintLog = {
      id: Math.floor(Math.random() * 1000000).toString(),
      datetime: new Date().toLocaleString('pt-BR', { timeZone: 'America/Cuiaba' }),
      reportLabel: reportTitle,
      filters,
      recordsCount: count
    };
    const updated = [newLog, ...logs];
    setLogs(updated);
    localStorage.setItem('app_relatorios_print_logs', JSON.stringify(updated));
  };

  const clearPrintHistory = () => {
    if (confirm('Tem certeza que deseja limpar todo o histórico de relatórios?')) {
      setLogs([]);
      localStorage.removeItem('app_relatorios_print_logs');
    }
  };

  // ==========================================
  // COMPUTE LIVE PREVIEW DATASETS
  // ==========================================

  // 1. Movimentação Individual Computations
  const computedIndividualMovs = useMemo(() => {
    if (activeReportId !== 'movimentacao_individual') return [];
    return movs.filter(m => {
      // Filter Persona
      const matchPessoa = filterPessoaId === 'ALL' || m.id_pessoas === Number(filterPessoaId) || m.pessoa?.id_pessoas === Number(filterPessoaId);
      
      // Filter Dates
      const mDate= m.datahora ? m.datahora.substring(0, 10) : '';
      const matchStart = !filterStartDate || mDate >= filterStartDate;
      const matchEnd = !filterEndDate || mDate <= filterEndDate;

      // Filter status
      const matchStatus = filterStatus === 'ALL' || m.status === filterStatus;

      return matchPessoa && matchStart && matchEnd && matchStatus;
    });
  }, [activeReportId, movs, filterPessoaId, filterStartDate, filterEndDate, filterStatus]);

  // 2. Entradas por Período Computations
  const computedEntradas = useMemo(() => {
    if (activeReportId !== 'entradas_periodo') return [];
    return movs.filter(m => {
      if (m.entrada_saida !== 'ENTRADA') return false;
      const mDate = m.datahora ? m.datahora.substring(0, 10) : '';
      const matchStart = !filterStartDate || mDate >= filterStartDate;
      const matchEnd = !filterEndDate || mDate <= filterEndDate;
      const matchStatus = filterStatus === 'ALL' || m.status === filterStatus;
      return matchStart && matchEnd && matchStatus;
    });
  }, [activeReportId, movs, filterStartDate, filterEndDate, filterStatus]);

  // 3. Saídas por Período Computations
  const computedSaidas = useMemo(() => {
    if (activeReportId !== 'saidas_periodo') return [];
    return movs.filter(m => {
      if (m.entrada_saida !== 'SAÍDA') return false;
      const mDate = m.datahora ? m.datahora.substring(0, 10) : '';
      const matchStart = !filterStartDate || mDate >= filterStartDate;
      const matchEnd = !filterEndDate || mDate <= filterEndDate;
      const matchStatus = filterStatus === 'ALL' || m.status === filterStatus;
      return matchStart && matchEnd && matchStatus;
    });
  }, [activeReportId, movs, filterStartDate, filterEndDate, filterStatus]);

  // 4. Estoque Atual Computations
  const computedEstoque = useMemo(() => {
    if (activeReportId !== 'estoque_atual') return [];
    return estoque.filter(e => {
      const matchSearch = !filterSearch || e.produto?.descricao?.toLowerCase().includes(filterSearch.toLowerCase()) || String(e.id_produto).includes(filterSearch);
      const matchCategory = filterCategoriaId === 'ALL' || String(e.produto?.id_categoria) === filterCategoriaId;
      return matchSearch && matchCategory;
    });
  }, [activeReportId, estoque, filterSearch, filterCategoriaId]);

  // 5. Próximos do Vencimento Computations
  const computedVencimentos = useMemo(() => {
    if (activeReportId !== 'vencimentos_criticos') return [];
    const now = new Date();
    return estoque
      .map(e => {
        if (!e.vencimento) return null;
        const days = differenceInDays(parseISO(e.vencimento), now);
        return {
          ...e,
          daysRemaining: days
        };
      })
      .filter((item): item is NonNullable<typeof item> => {
        if (!item) return false;
        
        switch (filterVencimentoRange) {
          case 'EXPIRED':
            return item.daysRemaining < 0;
          case '15_DAYS':
            return item.daysRemaining >= 0 && item.daysRemaining <= 15;
          case '30_DAYS':
            return item.daysRemaining >= 0 && item.daysRemaining <= 30;
          case '60_DAYS':
            return item.daysRemaining >= 0 && item.daysRemaining <= 60;
          case '90_DAYS':
            return item.daysRemaining >= 0 && item.daysRemaining <= 90;
          case 'ALL':
          default:
            return item.daysRemaining <= 90; // All criticals under 90 days or expired
        }
      })
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [activeReportId, estoque, filterVencimentoRange]);

  // 6. Itens Sem Movimentação Computations
  const computedItensSemMov = useMemo(() => {
    if (activeReportId !== 'itens_sem_movimentacao') return [];
    
    const limitDate = new Date();
    if (filterSemMovDias !== 'ALL') {
      limitDate.setDate(limitDate.getDate() - Number(filterSemMovDias));
    } else {
      limitDate.setFullYear(2000); // generic long time ago
    }

    // Capture non-canceled transactions transacted after the limit date
    const transactedIds = new Set<number>();
    movs.forEach(mov => {
      const mDate = new Date(mov.datahora);
      if (mDate >= limitDate && mov.status !== 'CANCELADO') {
        mov.itens?.forEach(item => {
          if (item.id_produto) {
            transactedIds.add(item.id_produto);
          }
        });
      }
    });

    // Match products with active physical stock but 0 matching transactions
    return produtos.filter(p => {
      const isDeadProduct = !transactedIds.has(p.id_produto);
      const isCategoryMatch = filterCategoriaId === 'ALL' || String(p.id_categoria) === filterCategoriaId;
      
      const pStock = estoque.filter(e => e.id_produto === p.id_produto);
      const totalStockQty = pStock.reduce((total, s) => total + Number(s.qtd_estoque || 0), 0);

      return isDeadProduct && isCategoryMatch && totalStockQty > 0;
    }).map(p => {
      const pStock = estoque.filter(e => e.id_produto === p.id_produto);
      const totalStockQty = pStock.reduce((total, s) => total + Number(s.qtd_estoque || 0), 0);
      return {
        ...p,
        stockQty: totalStockQty,
        estimatedValue: totalStockQty * Number(p.preco || 0)
      };
    });
  }, [activeReportId, produtos, estoque, movs, filterSemMovDias, filterCategoriaId]);

  // Dynamic values helper for current report count
  const currentReportRecordsCount = useMemo(() => {
    if (!activeReportId) return 0;
    if (activeReportId === 'movimentacao_individual') return computedIndividualMovs.length;
    if (activeReportId === 'entradas_periodo') return computedEntradas.length;
    if (activeReportId === 'saidas_periodo') return computedSaidas.length;
    if (activeReportId === 'estoque_atual') return computedEstoque.length;
    if (activeReportId === 'vencimentos_criticos') return computedVencimentos.length;
    if (activeReportId === 'itens_sem_movimentacao') return computedItensSemMov.length;
    return 0;
  }, [activeReportId, computedIndividualMovs, computedEntradas, computedSaidas, computedEstoque, computedVencimentos, computedItensSemMov]);

  // ==========================================
  // PRINT ENGINE (Sandboxed-compatible Hidden Iframe)
  // ==========================================
  const triggerHtmlIframePrint = (html: string) => {
    // Inject hidden print iframe to prevent window blocking mechanics
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) {
      // Fallback
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(html);
        win.document.close();
      } else {
        alert("Por favor, habilite popups no seu navegador.");
      }
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();

    // Trigger printing and remove immediately from DOM
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 500);
  };

  const handlePrintReport = () => {
    if (!activeReportId) return;

    let title = '';
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let summaryHtml = '';
    let filterString = '';

    // Compose custom structures based on specific report
    if (activeReportId === 'movimentacao_individual') {
      title = 'Extrato de Movimentação Individual';
      filterString = `Pessoa: ${filterPessoaId === 'ALL' ? 'Todas' : pessoas.find(p => String(p.id_pessoas) === filterPessoaId)?.nome || filterPessoaId} | Período: ${formatDateStr(filterStartDate)} a ${formatDateStr(filterEndDate)} | Status: ${filterStatus}`;
      
      headers = ['ID', 'Data/Hora', 'E/S', 'Operação', 'Doc. Ref.', 'Situação', 'Itens Vinculados'];
      rows = computedIndividualMovs.map(m => [
        m.id_movimentacao,
        formatDateStr(m.datahora),
        m.entrada_saida,
        m.tipo_movimentaca,
        m.doc_entrada || '---',
        m.status,
        (m.itens || []).map(i => `${i.quantidade}x ${i.produto?.descricao || 'Id:' + i.id_produto}`).join(', ') || 'Nenhum'
      ]);

      summaryHtml = `
        <div class="summary-badges">
          <div class="badge-card">
            <h4>Total Documentos</h4>
            <p>${computedIndividualMovs.length}</p>
          </div>
          <div class="badge-card">
            <h4>Operações de Entrada</h4>
            <p>${computedIndividualMovs.filter(m => m.entrada_saida === 'ENTRADA').length}</p>
          </div>
          <div class="badge-card">
            <h4>Operações de Saída</h4>
            <p>${computedIndividualMovs.filter(m => m.entrada_saida === 'SAÍDA').length}</p>
          </div>
        </div>
      `;
    } 
    else if (activeReportId === 'entradas_periodo') {
      title = 'Demonstrativo de Entradas no Período';
      filterString = `Período: ${formatDateStr(filterStartDate)} a ${formatDateStr(filterEndDate)} | Status: ${filterStatus}`;
      
      headers = ['Reg', 'Data/Hora Lançamento', 'Fornecedor / Doador', 'Tipo Entrada', 'Ref. Documento', 'Status', 'Especificação dos Itens'];
      rows = computedEntradas.map(m => [
        m.id_movimentacao,
        formatDateStr(m.datahora),
        m.pessoa?.nome || '---',
        m.tipo_movimentaca,
        m.doc_entrada || '---',
        m.status,
        (m.itens || []).map(i => `${i.quantidade}x ${i.produto?.descricao || 'Id:' + i.id_produto}`).join(', ') || 'Nenhum'
      ]);

      const totalItems = computedEntradas.reduce((sum, m) => sum + (m.itens || []).reduce((s, i) => s + Number(i.quantidade), 0), 0);
      summaryHtml = `
        <div class="summary-badges">
          <div class="badge-card">
            <h4>Total Lançamentos</h4>
            <p>${computedEntradas.length}</p>
          </div>
          <div class="badge-card">
            <h4>Quantidade de Peças Entrada</h4>
            <p>${totalItems}</p>
          </div>
        </div>
      `;
    } 
    else if (activeReportId === 'saidas_periodo') {
      title = 'Demonstrativo de Saídas no Período';
      filterString = `Período: ${formatDateStr(filterStartDate)} a ${formatDateStr(filterEndDate)} | Status: ${filterStatus}`;
      
      headers = ['Reg', 'Data/Hora Entrega', 'Destinatário / Solicitante', 'Tipo Saída', 'Ref. Documento', 'Status', 'Especificação dos Itens'];
      rows = computedSaidas.map(m => [
        m.id_movimentacao,
        formatDateStr(m.datahora),
        m.pessoa?.nome || '---',
        m.tipo_movimentaca,
        m.doc_entrada || '---',
        m.status,
        (m.itens || []).map(i => `${i.quantidade}x ${i.produto?.descricao || 'Id:' + i.id_produto}`).join(', ') || 'Nenhum'
      ]);

      const totalItems = computedSaidas.reduce((sum, m) => sum + (m.itens || []).reduce((s, i) => s + Number(i.quantidade), 0), 0);
      summaryHtml = `
        <div class="summary-badges">
          <div class="badge-card">
            <h4>Total Autorizações</h4>
            <p>${computedSaidas.length}</p>
          </div>
          <div class="badge-card">
            <h4>Quantidade Total Retirada</h4>
            <p>${totalItems}</p>
          </div>
        </div>
      `;
    } 
    else if (activeReportId === 'estoque_atual') {
      title = 'Relatório Geral do Estoque Físico';
      const catLabel = filterCategoriaId === 'ALL' ? 'Todas' : categorias.find(c => String(c.id_categoria) === filterCategoriaId)?.descricao || filterCategoriaId;
      filterString = `Busca: ${filterSearch || 'Nenhuma'} | Categoria: ${catLabel}`;

      headers = ['Cód', 'Descrição do Item', 'Categoria', 'Unidade', 'Vencimento', 'Qtd Estoque', 'Preço Unitário BRL', 'Total Estimado BRL'];
      rows = computedEstoque.map(e => [
        e.id_produto,
        e.produto?.descricao || '---',
        e.produto?.categoria?.descricao || '---',
        e.produto?.unidade || '---',
        formatDateStr(e.vencimento),
        Number(e.qtd_estoque || 0),
        Number(e.produto?.preco || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        (Number(e.qtd_estoque || 0) * Number(e.produto?.preco || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      ]);

      const totalEstoqueQtd = computedEstoque.reduce((acc, c) => acc + Number(c.qtd_estoque || 0), 0);
      const totalValorEstimado = computedEstoque.reduce((acc, c) => acc + (Number(c.qtd_estoque || 0) * Number(c.produto?.preco || 0)), 0);

      rows.push([
        'TOTAL',
        'SALDO TOTAL GERAL CONSOLIDADO',
        '---',
        '---',
        '---',
        totalEstoqueQtd,
        '---',
        totalValorEstimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      ]);

      summaryHtml = `
        <div class="summary-badges">
          <div class="badge-card">
            <h4>Itens Diferentes</h4>
            <p>${computedEstoque.length}</p>
          </div>
          <div class="badge-card">
            <h4>Físico em Estoque</h4>
            <p>${totalEstoqueQtd}</p>
          </div>
          <div class="badge-card" style="border-color: #16a34a; background-color: #f0fdf4;">
            <h4>Capital Circulante</h4>
            <p style="color: #16a34a;">${totalValorEstimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
          </div>
        </div>
      `;
    } 
    else if (activeReportId === 'vencimentos_criticos') {
      title = 'Informativo Analítico de Vencimentos';
      const rangeLabels: Record<string, string> = {
        'ALL': 'Todos Críticos (expiração em até 90 dias ou já vencidos)',
        'EXPIRED': 'Já vencidos/expirados',
        '15_DAYS': 'Expirando nos próximos 15 dias',
        '30_DAYS': 'Expirando nos próximos 30 dias',
        '60_DAYS': 'Expirando nos próximos 60 dias',
        '90_DAYS': 'Expirando nos próximos 90 dias'
      };
      filterString = `Cenário de Crises: ${rangeLabels[filterVencimentoRange || 'ALL']}`;

      headers = ['Cód', 'Descrição do Item', 'Vencimento Lote', 'Prazo Restante', 'Saldo Lote', 'Risco Unitário', 'Perda Estimada BRL'];
      rows = computedVencimentos.map(e => [
        e.id_produto,
        e.produto?.descricao || '---',
        formatDateStr(e.vencimento),
        e.daysRemaining < 0 ? `VENCIDO HÁ ${Math.abs(e.daysRemaining)} DIAS` : `${e.daysRemaining} DIAS RESTANTES`,
        Number(e.qtd_estoque || 0),
        Number(e.produto?.preco || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        (Number(e.qtd_estoque || 0) * Number(e.produto?.preco || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      ]);

      const totalCritQty = computedVencimentos.reduce((acc, c) => acc + Number(c.qtd_estoque || 0), 0);
      const totalLossVal = computedVencimentos.reduce((acc, c) => acc + (Number(c.qtd_estoque || 0) * Number(e => e.id_produto === c.id_produto ? (c.produto?.preco || 0) : 0)), 0); 
      // safer inline calculation for price totals:
      const safeLossTotal = computedVencimentos.reduce((acc, c) => acc + (Number(c.qtd_estoque || 0) * Number(c.produto?.preco || 0)), 0);

      rows.push([
        'TOTAL',
        'EXPOSIÇÃO GERAL DE CRIME FINANC.',
        '---',
        '---',
        totalCritQty,
        '---',
        safeLossTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      ]);

      summaryHtml = `
        <div class="summary-badges">
          <div class="badge-card" style="border-color: #dc2626; background: #fef2f2;">
            <h4>Lotes Monitorados</h4>
            <p style="color: #dc2626;">${computedVencimentos.length}</p>
          </div>
          <div class="badge-card">
            <h4>Quantidade Física Crítica</h4>
            <p>${totalCritQty}</p>
          </div>
          <div class="badge-card" style="border-color: #ea580c; background-color: #fff7ed;">
            <h4>Capital sob Validade Crítica</h4>
            <p style="color: #ea580c;">${safeLossTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
          </div>
        </div>
      `;
    } 
    else if (activeReportId === 'itens_sem_movimentacao') {
      title = 'Relatório de Itens Sem Giro e Movimentação';
      const catLabel = filterCategoriaId === 'ALL' ? 'Todas' : categorias.find(c => String(c.id_categoria) === filterCategoriaId)?.descricao || filterCategoriaId;
      filterString = `Período Inativo: Sem registro por mais de ${filterSemMovDias === 'ALL' ? 'todo o período registrado' : filterSemMovDias + ' dias'} | Categoria: ${catLabel}`;

      headers = ['Cód', 'Descrição do Item', 'Categoria', 'Unidade', 'Preço Unitário BRL', 'Saldo Físico Parado', 'Capital Imobilizado BRL'];
      rows = computedItensSemMov.map(p => [
        p.id_produto,
        p.descricao,
        categorias.find(c => c.id_categoria === p.id_categoria)?.descricao || '---',
        p.unidade,
        Number(p.preco || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        p.stockQty,
        p.estimatedValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      ]);

      const totalQtyDead = computedItensSemMov.reduce((acc, c) => acc + c.stockQty, 0);
      const totalValDead = computedItensSemMov.reduce((acc, c) => acc + c.estimatedValue, 0);

      rows.push([
        'TOTAL',
        'CAPITAL TOTAL INERTE E PARADO',
        '---',
        '---',
        '---',
        totalQtyDead,
        totalValDead.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      ]);

      summaryHtml = `
        <div class="summary-badges">
          <div class="badge-card" style="border-color: #475569; background: #f8fafc;">
            <h4>Itens Obsoletos/Sem Giro</h4>
            <p style="color: #475569;">${computedItensSemMov.length}</p>
          </div>
          <div class="badge-card">
            <h4>Quantidade Total Parada</h4>
            <p>${totalQtyDead}</p>
          </div>
          <div class="badge-card" style="border-color: #eab308; background-color: #fef9c3;">
            <h4>Custo Imobilizado Inativo</h4>
            <p style="color: #ca8a04;">${totalValDead.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
          </div>
        </div>
      `;
    }

    const htmlString = generatePrintHtml(title, headers, rows, summaryHtml, filterString);
    triggerHtmlIframePrint(htmlString);
    logPrintAction(title, filterString, rows.length - (activeReportId === 'estoque_atual' || activeReportId === 'vencimentos_criticos' || activeReportId === 'itens_sem_movimentacao' ? 1 : 0));
  };

  // ==========================================
  // CSV EXPORT GENERATOR
  // ==========================================
  const handleExportCSV = () => {
    if (!activeReportId) return;

    let titleFilename = '';
    let headers: string[] = [];
    let rows: string[][] = [];
    let filterDescription = '';

    if (activeReportId === 'movimentacao_individual') {
      titleFilename = 'extrato_movimentacao_individual';
      filterDescription = `Pessoa: ${filterPessoaId} - Periodo: ${filterStartDate} a ${filterEndDate}`;
      headers = ['ID Movimentacao', 'Data Hora', 'E_S', 'Tipo Movimentacao', 'Documento Ref', 'Status', 'Itens'];
      rows = computedIndividualMovs.map(m => [
        String(m.id_movimentacao),
        m.datahora,
        m.entrada_saida,
        m.tipo_movimentaca,
        m.doc_entrada || '',
        m.status,
        (m.itens || []).map(i => `${i.quantidade}x ${i.produto?.descricao || 'Id:' + i.id_produto}`).join(' | ')
      ]);
    } 
    else if (activeReportId === 'entradas_periodo') {
      titleFilename = 'entradas_periodo';
      filterDescription = `Periodo: ${filterStartDate} a ${filterEndDate} - Status: ${filterStatus}`;
      headers = ['ID Movimentacao', 'Data Hora', 'Origem Pessoa', 'Tipo Entrada', 'Documento Ref', 'Status', 'Itens'];
      rows = computedEntradas.map(m => [
        String(m.id_movimentacao),
        m.datahora,
        m.pessoa?.nome || '',
        m.tipo_movimentaca,
        m.doc_entrada || '',
        m.status,
        (m.itens || []).map(i => `${i.quantidade}x ${i.produto?.descricao || 'Id:' + i.id_produto}`).join(' | ')
      ]);
    } 
    else if (activeReportId === 'saidas_periodo') {
      titleFilename = 'saidas_periodo';
      filterDescription = `Periodo: ${filterStartDate} a ${filterEndDate} - Status: ${filterStatus}`;
      headers = ['ID Movimentacao', 'Data Hora', 'Destinatario Pessoa', 'Tipo Saida', 'Documento Ref', 'Status', 'Itens'];
      rows = computedSaidas.map(m => [
        String(m.id_movimentacao),
        m.datahora,
        m.pessoa?.nome || '',
        m.tipo_movimentaca,
        m.doc_entrada || '',
        m.status,
        (m.itens || []).map(i => `${i.quantidade}x ${i.produto?.descricao || 'Id:' + i.id_produto}`).join(' | ')
      ]);
    } 
    else if (activeReportId === 'estoque_atual') {
      titleFilename = 'posicao_estoque_atual';
      filterDescription = `Filtro Categoria: ${filterCategoriaId} - Pesquisa: ${filterSearch}`;
      headers = ['ID Produto', 'Descricao Produto', 'Categoria', 'Unidade', 'Vencimento Lote', 'Qtd Estoque', 'Preco Unitario BRL', 'Total Estimado BRL'];
      rows = computedEstoque.map(e => [
        String(e.id_produto),
        e.produto?.descricao || '',
        e.produto?.categoria?.descricao || '',
        e.produto?.unidade || '',
        e.vencimento || '',
        String(e.qtd_estoque || 0),
        String(e.produto?.preco || 0),
        String(Number(e.qtd_estoque || 0) * Number(e.produto?.preco || 0))
      ]);
    } 
    else if (activeReportId === 'vencimentos_criticos') {
      titleFilename = 'proximos_do_vencimento';
      filterDescription = `Filtro Dias: ${filterVencimentoRange}`;
      headers = ['ID Produto', 'Descricao Produto', 'Vencimento Lote', 'Dias Restantes', 'Qtd Lote', 'Preco Unitario BRL', 'Perda Estimada BRL'];
      rows = computedVencimentos.map(e => [
        String(e.id_produto),
        e.produto?.descricao || '',
        e.vencimento || '',
        String(e.daysRemaining),
        String(e.qtd_estoque || 0),
        String(e.produto?.preco || 0),
        String(Number(e.qtd_estoque || 0) * Number(e.produto?.preco || 0))
      ]);
    } 
    else if (activeReportId === 'itens_sem_movimentacao') {
      titleFilename = 'itens_sem_movimentacao_giro';
      filterDescription = `Dias Sem Giro: ${filterSemMovDias} - Categoria: ${filterCategoriaId}`;
      headers = ['ID Produto', 'Descricao Produto', 'Categoria', 'Unidade', 'Preco Unitario BRL', 'Qtd Parado', 'Capital Imobilizado BRL'];
      rows = computedItensSemMov.map(p => [
        String(p.id_produto),
        p.descricao,
        categorias.find(c => c.id_categoria === p.id_categoria)?.descricao || '',
        p.unidade,
        String(p.preco || 0),
        String(p.stockQty),
        String(p.estimatedValue)
      ]);
    }

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [`# FILTRO APLICADO: ${filterDescription}`, headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `relatorio_${titleFilename}_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    logPrintAction(`Exportação CSV: ${titleFilename.replace(/_/g, ' ')}`, filterDescription, rows.length);
  };

  const getReportNameInfo = () => {
    switch (activeReportId) {
      case 'movimentacao_individual':
        return { label: 'Movimentação Individual', desc: 'Rastreio de movimentação de um colaborador ou fornecedor na base.' };
      case 'entradas_periodo':
        return { label: 'Entradas por Período', desc: 'Demonstrativo analítico de todas as entradas físicas efetuadas no período.' };
      case 'saidas_periodo':
        return { label: 'Saídas por Período', desc: 'Demonstrativo consolidado de retiradas de mercadoria e insumos.' };
      case 'estoque_atual':
        return { label: 'Estoque Atual e Avaliação', desc: 'Posição inteira e cálculo financeiro sob valor de custo estimado.' };
      case 'vencimentos_criticos':
        return { label: 'Validade e Vencimentos', desc: 'Organização inteligente de prazo de validade por lote e de riscos financeiros.' };
      case 'itens_sem_movimentacao':
        return { label: 'Itens Sem Giro / Parados', desc: 'Indicação de lotes inativos sem qualquer movimentação registrada.' };
      default:
        return { label: 'Emissão de Relatório', desc: '' };
    }
  };

  const activeReportInfo = getReportNameInfo();

  // Printable layout helper
  const generatePrintHtml = (title: string, headers: string[], rows: (string | number)[][], summary: string, filtersDesc: string) => {
    const dateStr = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Cuiaba' });
    const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Cuiaba' });
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Relatório - ${title}</title>
          <style>
            body {
              font-family: 'Inter', system-ui, -apple-system, sans-serif;
              color: #0f172a;
              padding: 40px;
              margin: 0;
              font-size: 11px;
              line-height: 1.5;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #0f172a;
              padding-bottom: 15px;
              margin-bottom: 20px;
            }
            .logo-container {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .logo-text h1 {
              font-size: 18px;
              font-weight: 900;
              margin: 0;
              letter-spacing: -0.5px;
            }
            .logo-text p {
              font-size: 8px;
              color: #64748b;
              margin: 2px 0 0;
              letter-spacing: 1px;
              text-transform: uppercase;
            }
            .report-meta {
              text-align: right;
              font-size: 10px;
              color: #475569;
            }
            .report-title-container {
              display: flex;
              align-items: center;
              margin-bottom: 15px;
            }
            .report-badge {
              width: 12px;
              height: 14px;
              background-color: #0d9488;
              margin-right: 8px;
            }
            .report-title {
              font-size: 14px;
              font-weight: 800;
              text-transform: uppercase;
              margin: 0;
              color: #0f172a;
            }
            .filters-box {
              border: 1px solid #cbd5e1;
              background-color: #f8fafc;
              padding: 10px 15px;
              margin-bottom: 20px;
              border-radius: 6px;
            }
            .filters-box p {
              margin: 0;
              font-weight: 500;
              color: #1e293b;
            }
            .filters-box strong {
              text-transform: uppercase;
              font-size: 9px;
              color: #475569;
              margin-right: 5px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 35px;
              font-size: 11px;
            }
            th {
              background-color: #f1f5f9;
              text-align: left;
              padding: 8px 10px;
              font-weight: 700;
              text-transform: uppercase;
              font-size: 9px;
              color: #0f172a;
              border-bottom: 2px solid #94a3b8;
            }
            td {
              padding: 7px 10px;
              border-bottom: 1px solid #e2e8f0;
              color: #334155;
            }
            tr:nth-child(even) td {
              background-color: #f8fafc;
            }
            .totals-row td {
              font-weight: 700;
              background-color: #e2e8f0 !important;
              border-top: 2px solid #475569;
              color: #0f172a;
            }
            .summary-badges {
              display: flex;
              gap: 15px;
              margin-bottom: 20px;
            }
            .badge-card {
              border: 1px solid #e2e8f0;
              padding: 10px 14px;
              border-radius: 6px;
              background: #f8fafc;
              min-width: 120px;
            }
            .badge-card h4 {
              margin: 0;
              font-size: 8px;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .badge-card p {
              margin: 4px 0 0;
              font-size: 15px;
              font-weight: 800;
              color: #0f172a;
            }
            .signature-section {
              margin-top: 60px;
              display: flex;
              flex-direction: column;
              align-items: center;
              page-break-inside: avoid;
            }
            .signature-line {
              width: 250px;
              border-top: 1px solid #1e293b;
              margin-bottom: 6px;
            }
            .signature-title {
              font-size: 10px;
              color: #475569;
              text-transform: uppercase;
              font-weight: 500;
            }
            footer {
              margin-top: 50px;
              border-top: 1px solid #e2e8f0;
              padding-top: 8px;
              color: #94a3b8;
              font-size: 8px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            @media print {
              @page { margin: 1.5cm; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <header>
            <div class="logo-container">
              <svg viewBox="0 0 100 100" style="width: 35px; height: 35px;">
                <path d="M25,85 C15,85 15,70 15,60 C15,55 10,55 8,53 C5,50 47,12 50,10 C53,12 95,50 92,53 C90,55 85,55 85,60 C85,70 85,85 75,85" fill="none" stroke="#14b8a6" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M50,75 C25,55 25,30 38,30 C45,30 50,45 50,45 C50,45 55,30 62,30 C75,30 75,55 50,75" fill="none" stroke="#0f172a" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <div class="logo-text">
                <h1>ALMOXARIFE<span style="color:#14b8a6">CONTROL</span> 2.0</h1>
                <p>Gestão Profissional de Almoxarifado</p>
              </div>
            </div>
            <div class="report-meta">
              <strong>DOCUMENTO EMITIDO EM:</strong><br/>
              ${dateStr} às ${timeStr}<br/>
              Cuiabá / MT
            </div>
          </header>

          <div class="report-title-container">
            <div class="report-badge"></div>
            <h2 class="report-title">${title}</h2>
          </div>

          ${filtersDesc ? `
          <div class="filters-box">
            <p><strong>Filtros representados:</strong> ${filtersDesc}</p>
          </div>
          ` : ''}

          ${summary ? summary : ''}

          <table>
            <thead>
              <tr>
                ${headers.map(h => `<th>${h}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${rows.map((row) => {
                const isTotal = row[0] === 'TOTAL';
                return `
                  <tr class="${isTotal ? 'totals-row' : ''}">
                    ${row.map(cell => `<td>${cell}</td>`).join('')}
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <div class="signature-section">
            <div class="signature-line"></div>
            <p class="signature-title">Assinatura de Lançamento / Responsável</p>
          </div>

          <footer>
            ALMOXARIFECONTROL - Gestão Inteligente Integrada com Supabase
          </footer>
        </body>
      </html>
    `;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <nav className="flex text-[10px] text-on-surface-variant font-black uppercase tracking-widest gap-2 mb-2 opacity-60">
            <span>Almoxarifado</span>
            <span>/</span>
            <span className="text-primary">Módulo Inteligente de Relatórios</span>
          </nav>
          <h2 className="text-3xl font-black text-primary tracking-tight">Relatórios Gerenciais</h2>
          <p className="text-on-surface-variant max-w-2xl mt-1 text-sm font-medium">
            Selecione um bloco abaixo para filtrar informações em tempo real, auditar o histórico de materiais, exportar planilhas organizadas ou realizar a impressão física oficial.
          </p>
        </div>
        
        <button 
          onClick={() => setIsHistoryOpen(true)}
          className="flex items-center gap-2 border border-outline px-4 py-2.5 rounded-xl text-sm font-bold bg-white hover:bg-neutral-50 hover:border-black active:scale-[0.98] transition-all cursor-pointer"
        >
          <History className="w-4 h-4 text-primary" />
          Auditar Impressões ({logs.length})
        </button>
      </header>

      {/* Primary Grid Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card, i) => (
          <motion.button 
            key={card.label}
            onClick={() => setActiveReportId(card.id)}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className={cn(
              "text-left group border border-outline-variant p-6 rounded-2xl transition-all flex flex-col justify-between h-52 relative overflow-hidden active:scale-[0.97] cursor-pointer",
              card.full ? "bg-primary text-white shadow-lg shadow-primary/10 border-primary" : "bg-white hover:border-primary/50 hover:shadow-xl"
            )}
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <card.icon className="w-20 h-20" />
            </div>
            
            <div>
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 border shadow-xs", card.color)}>
                <card.icon className="w-5 h-5" />
              </div>
              <h3 className={cn("text-lg font-black leading-tight mb-2", card.full ? "text-white" : "text-on-surface")}>
                {card.label}
              </h3>
              <p className={cn("text-xs font-medium leading-relaxed", card.full ? "text-white/85" : "text-on-surface-variant")}>
                {card.desc}
              </p>
            </div>
            
            <div className={cn("flex items-center text-xs font-black uppercase tracking-wider mt-4", card.full ? "text-white" : "text-primary")}>
              Gerar Relatório 
              {card.full ? <Printer className="w-4 h-4 ml-2 animate-pulse" /> : <ChevronRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />}
            </div>
          </motion.button>
        ))}
      </div>

      {/* Interactive Modal Slider Sheet (Wide screen) */}
      <AnimatePresence>
        {activeReportId && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 md:p-6 mb-12">
            <motion.div 
              initial={{ opacity: 0, scale: 0.97, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 15 }}
              className="bg-slate-50 w-full max-w-6xl h-full max-h-[85vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-outline"
            >
              {/* Modal Header */}
              <header className="bg-white border-b border-outline px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-primary">{activeReportInfo.label}</h3>
                    <p className="text-xs font-semibold text-on-surface-variant leading-none">{activeReportInfo.desc}</p>
                  </div>
                </div>
                
                <button 
                  onClick={() => setActiveReportId(null)}
                  className="w-10 h-10 rounded-xl hover:bg-neutral-100 flex items-center justify-center transition-all bg-neutral-50 border border-neutral-200 cursor-pointer text-gray-500 hover:text-black"
                >
                  <X className="w-5 h-5" />
                </button>
              </header>

              {/* Dynamic Filter Section & Live Analytics Indicators */}
              <section className="bg-white border-b border-outline p-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                
                {/* 1. FILTER FOR SPECIFIC REPORT PANEL */}
                <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  
                  {/* FOR MOVIMENTACAO INDIVIDUAL */}
                  {activeReportId === 'movimentacao_individual' && (
                    <>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Colaborador / Fornecedor</label>
                        <select 
                          value={filterPessoaId} 
                          onChange={(e) => setFilterPessoaId(e.target.value)}
                          className="h-10 border border-outline rounded-lg px-2 text-sm font-semibold bg-slate-50 text-slate-800"
                        >
                          <option value="ALL">-- Todas as Pessoas --</option>
                          {pessoas.map(p => (
                            <option key={p.id_pessoas} value={p.id_pessoas}>
                              {p.tipo_pessoa} | {p.nome}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Data Início</label>
                        <input 
                          type="date" 
                          value={filterStartDate} 
                          onChange={(e) => setFilterStartDate(e.target.value)}
                          className="h-10 border border-outline rounded-lg px-3 text-sm font-semibold bg-slate-50 text-slate-800"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Data Fim</label>
                        <input 
                          type="date" 
                          value={filterEndDate} 
                          onChange={(e) => setFilterEndDate(e.target.value)}
                          className="h-10 border border-outline rounded-lg px-3 text-sm font-semibold bg-slate-50 text-slate-800"
                        />
                      </div>
                    </>
                  )}

                  {/* FOR ENTRADAS PERIOD */}
                  {activeReportId === 'entradas_periodo' && (
                    <>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Situação Logística</label>
                        <select 
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value)}
                          className="h-10 border border-outline rounded-lg px-3 text-sm font-semibold bg-slate-50 text-slate-800"
                        >
                          <option value="ALL">Todas as Situações</option>
                          <option value="DIGITANDO">DIGITANDO</option>
                          <option value="PROCESSADO">PROCESSADO / CONFIRMADO</option>
                          <option value="CANCELADO">CANCELADO</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Data Inicial</label>
                        <input 
                          type="date" 
                          value={filterStartDate} 
                          onChange={(e) => setFilterStartDate(e.target.value)}
                          className="h-10 border border-outline rounded-lg px-3 text-sm font-semibold bg-slate-50 text-slate-800"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Data Final</label>
                        <input 
                          type="date" 
                          value={filterEndDate} 
                          onChange={(e) => setFilterEndDate(e.target.value)}
                          className="h-10 border border-outline rounded-lg px-3 text-sm font-semibold bg-slate-50 text-slate-800"
                        />
                      </div>
                    </>
                  )}

                  {/* FOR SAIDAS PERIOD */}
                  {activeReportId === 'saidas_periodo' && (
                    <>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Situação Logística</label>
                        <select 
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value)}
                          className="h-10 border border-outline rounded-lg px-3 text-sm font-semibold bg-slate-50 text-slate-800"
                        >
                          <option value="ALL">Todas as Situações</option>
                          <option value="DIGITANDO">DIGITANDO</option>
                          <option value="PROCESSADO">PROCESSADO / CONFIRMADO</option>
                          <option value="CANCELADO">CANCELADO</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Data Inicial</label>
                        <input 
                          type="date" 
                          value={filterStartDate} 
                          onChange={(e) => setFilterStartDate(e.target.value)}
                          className="h-10 border border-outline rounded-lg px-3 text-sm font-semibold bg-slate-50 text-slate-800"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Data Final</label>
                        <input 
                          type="date" 
                          value={filterEndDate} 
                          onChange={(e) => setFilterEndDate(e.target.value)}
                          className="h-10 border border-outline rounded-lg px-3 text-sm font-semibold bg-slate-50 text-slate-800"
                        />
                      </div>
                    </>
                  )}

                  {/* FOR ESTOQUE ATUAL */}
                  {activeReportId === 'estoque_atual' && (
                    <>
                      <div className="flex flex-col gap-1 sm:col-span-2">
                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Buscar por Lote ou Descrição</label>
                        <div className="relative">
                          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                          <input 
                            type="text" 
                            placeholder="Nome do produto ou código id..." 
                            value={filterSearch}
                            onChange={(e) => setFilterSearch(e.target.value)}
                            className="w-full h-10 border border-outline rounded-lg pl-9 pr-3 text-sm font-semibold bg-slate-50 text-slate-800"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Categoria</label>
                        <select 
                          value={filterCategoriaId}
                          onChange={(e) => setFilterCategoriaId(e.target.value)}
                          className="h-10 border border-outline rounded-lg px-3 text-sm font-semibold bg-slate-50 text-slate-800"
                        >
                          <option value="ALL">Todas as Categorias</option>
                          {categorias.map(c => (
                            <option key={c.id_categoria} value={c.id_categoria}>{c.descricao}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  {/* FOR VENCIMENTOS LIMIT */}
                  {activeReportId === 'vencimentos_criticos' && (
                    <>
                      <div className="flex flex-col gap-1 sm:col-span-3">
                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Cenário Crítico de Expiramento</label>
                        <select 
                          value={filterVencimentoRange}
                          onChange={(e) => setFilterVencimentoRange(e.target.value)}
                          className="h-10 border border-outline rounded-lg px-3 text-sm font-semibold bg-slate-50 text-slate-800"
                        >
                          <option value="ALL">Todos em Risco (Já vencidos ou vencendo em até 90 dias)</option>
                          <option value="EXPIRED">Apenas lotes já vencidos (Passaram do prazo)</option>
                          <option value="15_DAYS">Perigo Imediato (Vence nos próximos 15 dias)</option>
                          <option value="30_DAYS">Atenção Crítica (Vence nos próximos 30 dias)</option>
                          <option value="60_DAYS">Fase Preventiva (Vence nos próximos 60 dias)</option>
                          <option value="90_DAYS">Fase de Monitoramento (Vence nos próximos 90 dias)</option>
                        </select>
                      </div>
                    </>
                  )}

                  {/* FOR ITENS SEM Giro */}
                  {activeReportId === 'itens_sem_movimentacao' && (
                    <>
                      <div className="flex flex-col gap-1 sm:col-span-2">
                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Período de Inatividade (Sem Giro)</label>
                        <select 
                          value={filterSemMovDias}
                          onChange={(e) => setFilterSemMovDias(e.target.value)}
                          className="h-10 border border-outline rounded-lg px-3 text-sm font-semibold bg-slate-50 text-slate-800"
                        >
                          <option value="15">Nenhuma movimentação nos últimos 15 dias</option>
                          <option value="30">Nenhuma movimentação nos últimos 30 dias</option>
                          <option value="60">Nenhuma movimentação nos últimos 60 dias</option>
                          <option value="90">Nenhuma movimentação nos últimos 90 dias</option>
                          <option value="180">Nenhuma movimentação nos últimos 180 dias (Inativo)</option>
                          <option value="ALL">Sem movimentações em qualquer período da base</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Categoria</label>
                        <select 
                          value={filterCategoriaId}
                          onChange={(e) => setFilterCategoriaId(e.target.value)}
                          className="h-10 border border-outline rounded-lg px-3 text-sm font-semibold bg-slate-50 text-slate-800"
                        >
                          <option value="ALL">Todas as Categorias</option>
                          {categorias.map(c => (
                            <option key={c.id_categoria} value={c.id_categoria}>{c.descricao}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                </div>

                {/* 2. DYNAMIC PRIMARY ACTIONS */}
                <div className="flex flex-wrap gap-2 justify-end w-full">
                  <button 
                    onClick={handleExportCSV}
                    disabled={isLoading || errorMsg !== '' || currentReportRecordsCount === 0}
                    className="flex-1 sm:flex-initial h-10 flex items-center justify-center gap-2 bg-slate-800 text-white font-bold text-xs uppercase px-4 rounded-xl hover:bg-black transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer border border-black/15 shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    CSV
                  </button>
                  
                  <button 
                    onClick={handlePrintReport}
                    disabled={isLoading || errorMsg !== '' || currentReportRecordsCount === 0}
                    className="flex-1 sm:flex-initial h-10 flex items-center justify-center gap-2 bg-primary text-white font-bold text-xs uppercase px-5 rounded-xl hover:bg-emerald-800 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer border border-primary/20 shadow-sm"
                  >
                    <Printer className="w-4 h-4 animate-bounce" />
                    Imprimir (A4)
                  </button>
                </div>

              </section>

              {/* LIVE RESULTS / PREVIEW PRESTINE TABLE */}
              <div className="flex-1 overflow-auto p-6 bg-slate-100">
                <div className="bg-white rounded-2xl border border-outline shadow-xs overflow-hidden">
                  
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-outline">
                        
                        {activeReportId === 'movimentacao_individual' && (
                          <>
                            <th className="px-5 py-3.5 text-xs font-black uppercase text-gray-500 tracking-wider">Reg. ID</th>
                            <th className="px-5 py-3.5 text-xs font-black uppercase text-gray-500 tracking-wider">Data / Hora</th>
                            <th className="px-5 py-3.5 text-xs font-black uppercase text-gray-500 tracking-wider">E / S</th>
                            <th className="px-5 py-3.5 text-xs font-black uppercase text-gray-500 tracking-wider">Tipo Movimentação</th>
                            <th className="px-5 py-3.5 text-xs font-black uppercase text-gray-500 tracking-wider">Ref Documento</th>
                            <th className="px-5 py-3.5 text-xs font-black uppercase text-gray-500 tracking-wider">Situação</th>
                            <th className="px-5 py-3.5 text-xs font-black uppercase text-gray-500 tracking-wider">Especificação Itens (Qtd)</th>
                          </>
                        )}

                        {activeReportId === 'entradas_periodo' && (
                          <>
                            <th className="px-5 py-3.5 text-xs font-black uppercase text-gray-500 tracking-wider">ID</th>
                            <th className="px-5 py-3.5 text-xs font-black uppercase text-gray-500 tracking-wider">Lançado Em</th>
                            <th className="px-5 py-3.5 text-xs font-black uppercase text-gray-500 tracking-wider">Fornecedor / Doador</th>
                            <th className="px-5 py-3.5 text-xs font-black uppercase text-gray-500 tracking-wider">Tipo Entrada</th>
                            <th className="px-5 py-3.5 text-xs font-black uppercase text-gray-500 tracking-wider">Ref Documento</th>
                            <th className="px-5 py-3.5 text-xs font-black uppercase text-gray-500 tracking-wider">Status</th>
                            <th className="px-5 py-3.5 text-xs font-black uppercase text-gray-500 tracking-wider">Itens Registrados</th>
                          </>
                        )}

                        {activeReportId === 'saidas_periodo' && (
                          <>
                            <th className="px-5 py-3.5 text-xs font-black uppercase text-gray-500 tracking-wider">ID</th>
                            <th className="px-5 py-3.5 text-xs font-black uppercase text-gray-500 tracking-wider">Despachado Em</th>
                            <th className="px-5 py-3.5 text-xs font-black uppercase text-gray-500 tracking-wider">Destinatário / Solicitante</th>
                            <th className="px-5 py-3.5 text-xs font-black uppercase text-gray-500 tracking-wider">Tipo Saída</th>
                            <th className="px-5 py-3.5 text-xs font-black uppercase text-gray-500 tracking-wider">Ref Documento</th>
                            <th className="px-5 py-3.5 text-xs font-black uppercase text-gray-500 tracking-wider">Status</th>
                            <th className="px-5 py-3.5 text-xs font-black uppercase text-gray-500 tracking-wider">Itens Fornecidos</th>
                          </>
                        )}

                        {activeReportId === 'estoque_atual' && (
                          <>
                            <th className="px-5 py-3.5 text-xs font-black uppercase text-gray-500 tracking-wider">Cód ID</th>
                            <th className="px-5 py-3.5 text-xs font-black uppercase text-gray-500 tracking-wider">Especificação do Item</th>
                            <th className="px-5 py-3.5 text-xs font-black uppercase text-gray-500 tracking-wider">Categoria</th>
                            <th className="px-5 py-3.5 text-xs font-black uppercase text-gray-500 tracking-wider">Vencimento Lote</th>
                            <th className="px-5 py-3.5 text-xs font-black uppercase text-gray-500 tracking-wider text-right">Saldo Físico</th>
                            <th className="px-5 py-3.5 text-xs font-black uppercase text-gray-500 tracking-wider text-right">Preço Unitário</th>
                            <th className="px-5 py-3.5 text-xs font-black uppercase text-gray-500 tracking-wider text-right">Capital Estimado</th>
                          </>
                        )}

                        {activeReportId === 'vencimentos_criticos' && (
                          <>
                            <th className="px-5 py-3.5 text-xs font-black uppercase text-gray-500 tracking-wider">Cód</th>
                            <th className="px-5 py-3.5 text-xs font-black uppercase text-gray-500 tracking-wider">Especificação Lote</th>
                            <th className="px-5 py-3.5 text-xs font-black uppercase text-gray-500 tracking-wider">Data Vencimento</th>
                            <th className="px-5 py-3.5 text-xs font-black uppercase text-gray-500 tracking-wider">Prazo Vital</th>
                            <th className="px-5 py-3.5 text-xs font-black uppercase text-gray-500 tracking-wider text-right">Saldo Físico</th>
                            <th className="px-5 py-3.5 text-xs font-black uppercase text-gray-500 tracking-wider text-right font-mono">Perda Avaliada BRL</th>
                          </>
                        )}

                        {activeReportId === 'itens_sem_movimentacao' && (
                          <>
                            <th className="px-5 py-3.5 text-xs font-black uppercase text-gray-500 tracking-wider">ID</th>
                            <th className="px-5 py-3.5 text-xs font-black uppercase text-gray-500 tracking-wider">Descrição do Item Solicitado</th>
                            <th className="px-5 py-3.5 text-xs font-black uppercase text-gray-500 tracking-wider">Categoria</th>
                            <th className="px-5 py-3.5 text-xs font-black uppercase text-gray-500 tracking-wider text-center">Un.</th>
                            <th className="px-5 py-3.5 text-xs font-black uppercase text-gray-500 tracking-wider text-right">Preço Custo</th>
                            <th className="px-5 py-3.5 text-xs font-black uppercase text-gray-500 tracking-wider text-right bg-amber-50">Saldo Estoque</th>
                            <th className="px-5 py-3.5 text-xs font-black uppercase text-gray-500 tracking-wider text-right bg-amber-50">Custo Total Parado</th>
                          </>
                        )}

                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline">
                      
                      {/* Loading indicator */}
                      {isLoading && (
                        <tr>
                          <td colSpan={10} className="px-6 py-20 text-center">
                            <div className="flex flex-col items-center justify-center gap-3">
                              <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                              <span className="text-sm font-bold text-gray-500 uppercase tracking-widest leading-none">Aguarde, conectando ao Banco...</span>
                            </div>
                          </td>
                        </tr>
                      )}

                      {/* Connection or query error */}
                      {!isLoading && errorMsg !== '' && (
                        <tr>
                          <td colSpan={10} className="px-6 py-16 text-center text-red-500 font-bold text-sm">
                            <div className="flex flex-col items-center gap-2 justify-center">
                              <AlertTriangle className="w-8 h-8 text-red-500" />
                              <span>Falha operacional: {errorMsg}</span>
                            </div>
                          </td>
                        </tr>
                      )}

                      {/* Safe empty state */}
                      {!isLoading && errorMsg === '' && currentReportRecordsCount === 0 && (
                        <tr>
                          <td colSpan={10} className="px-6 py-20 text-center text-gray-400 font-bold text-sm">
                            <div className="flex flex-col items-center gap-2 justify-center">
                              <Info className="w-8 h-8 text-neutral-300" />
                              <span>Nenhum saldo físico ou registro atende aos filtros aplicados.</span>
                            </div>
                          </td>
                        </tr>
                      )}

                      {/* Display computed Rows dynamically */}
                      {!isLoading && errorMsg === '' && activeReportId === 'movimentacao_individual' && (
                        computedIndividualMovs.map((m, idx) => (
                          <tr key={m.id_movimentacao} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                            <td className="px-5 py-3 text-xs font-black text-gray-900">#{m.id_movimentacao}</td>
                            <td className="px-5 py-3 text-xs font-semibold text-gray-600">{formatDateStr(m.datahora)}</td>
                            <td className="px-5 py-3 text-xs">
                              <span className={cn(
                                "px-2.5 py-0.5 rounded-full text-[10px] font-black",
                                m.entrada_saida === 'ENTRADA' ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                              )}>
                                {m.entrada_saida}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-xs font-bold text-gray-700">{m.tipo_movimentaca}</td>
                            <td className="px-5 py-3 text-xs font-semibold text-orange-600">{m.doc_entrada || '---'}</td>
                            <td className="px-5 py-3 text-xs">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-800 text-[10px] font-black">{m.status}</span>
                            </td>
                            <td className="px-5 py-3 text-xs font-semibold text-slate-800">
                              <div className="max-w-md truncate">
                                {(m.itens || []).map(i => `${i.quantidade}x ${i.produto?.descricao || 'Id:' + i.id_produto}`).join(', ') || <span className="text-gray-300 italic">Nenhum</span>}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}

                      {!isLoading && errorMsg === '' && activeReportId === 'entradas_periodo' && (
                        computedEntradas.map((m, idx) => (
                          <tr key={m.id_movimentacao} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                            <td className="px-5 py-3 text-xs font-black text-gray-900">#{m.id_movimentacao}</td>
                            <td className="px-5 py-3 text-xs font-semibold text-gray-600">{formatDateStr(m.datahora)}</td>
                            <td className="px-5 py-3 text-xs font-bold text-gray-900">{m.pessoa?.nome || '---'}</td>
                            <td className="px-5 py-3 text-xs font-semibold text-teal-700">{m.tipo_movimentaca}</td>
                            <td className="px-5 py-3 text-xs font-semibold text-orange-600">{m.doc_entrada || '---'}</td>
                            <td className="px-5 py-3 text-xs">
                              <span className="px-2 py-0.5 rounded-md bg-stone-100 border text-stone-700 text-[10px] font-black">{m.status}</span>
                            </td>
                            <td className="px-5 py-3 text-xs font-medium text-slate-800">
                              <div className="max-w-md truncate">
                                {(m.itens || []).map(i => `${i.quantidade}x ${i.produto?.descricao || 'Id:' + i.id_produto}`).join(', ') || <span className="text-gray-300 italic">Vazio</span>}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}

                      {!isLoading && errorMsg === '' && activeReportId === 'saidas_periodo' && (
                        computedSaidas.map((m, idx) => (
                          <tr key={m.id_movimentacao} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                            <td className="px-5 py-3 text-xs font-black text-gray-900">#{m.id_movimentacao}</td>
                            <td className="px-5 py-3 text-xs font-semibold text-gray-600">{formatDateStr(m.datahora)}</td>
                            <td className="px-5 py-3 text-xs font-bold text-gray-900">{m.pessoa?.nome || '---'}</td>
                            <td className="px-5 py-3 text-xs font-semibold text-teal-700">{m.tipo_movimentaca}</td>
                            <td className="px-5 py-3 text-xs font-semibold text-orange-600">{m.doc_entrada || '---'}</td>
                            <td className="px-5 py-3 text-xs">
                              <span className="px-2 py-0.5 rounded-md bg-stone-100 border text-stone-700 text-[10px] font-black">{m.status}</span>
                            </td>
                            <td className="px-5 py-3 text-xs font-medium text-slate-800">
                              <div className="max-w-md truncate">
                                {(m.itens || []).map(i => `${i.quantidade}x ${i.produto?.descricao || 'Id:' + i.id_produto}`).join(', ') || <span className="text-gray-300 italic">Vazio</span>}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}

                      {!isLoading && errorMsg === '' && activeReportId === 'estoque_atual' && (
                        <>
                          {computedEstoque.map((e, idx) => {
                            const isExpired = e.vencimento && differenceInDays(parseISO(e.vencimento), new Date()) < 0;
                            const isCritical30 = e.vencimento && !isExpired && differenceInDays(parseISO(e.vencimento), new Date()) <= 30;
                            return (
                              <tr key={e.id_estoque} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                <td className="px-5 py-3 text-xs font-black text-gray-900">{e.id_produto}</td>
                                <td className="px-5 py-3 text-xs font-bold text-gray-900 uppercase">{e.produto?.descricao || '---'}</td>
                                <td className="px-5 py-3 text-xs font-semibold text-gray-500 capitalize">{e.produto?.categoria?.descricao || 'Sem'}</td>
                                <td className="px-5 py-3 text-xs">
                                  <div className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                    <span className={cn(
                                      "font-semibold",
                                      isExpired ? "text-red-600 font-bold" : isCritical30 ? "text-amber-600" : "text-gray-600"
                                    )}>
                                      {formatDateStr(e.vencimento)}
                                      {isExpired && ' (VENCIDO)'}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-5 py-3 text-right text-xs font-extrabold text-primary">{Math.round(e.qtd_estoque)}</td>
                                <td className="px-5 py-3 text-right text-xs font-bold text-gray-600">
                                  {Number(e.produto?.preco || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </td>
                                <td className="px-5 py-3 text-right text-xs font-extrabold text-neutral-800">
                                  {(Number(e.qtd_estoque || 0) * Number(e.produto?.preco || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </td>
                              </tr>
                            );
                          })}
                          
                          {/* Aggregate totals table footer row */}
                          {computedEstoque.length > 0 && (
                            <tr className="bg-slate-200 font-bold border-t-2 border-slate-400 text-slate-900 text-xs">
                              <td colSpan={4} className="px-5 py-3.5 text-right font-black">TOTALIZADORES:</td>
                              <td className="px-5 py-3.5 text-right font-black text-primary">
                                {Math.round(computedEstoque.reduce((acc, curr) => acc + Number(curr.qtd_estoque || 0), 0))}
                              </td>
                              <td className="px-5 py-3.5 text-right">---</td>
                              <td className="px-5 py-3.5 text-right font-black text-teal-800 text-sm">
                                {computedEstoque.reduce((acc, curr) => acc + (Number(curr.qtd_estoque || 0) * Number(curr.produto?.preco || 0)), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </td>
                            </tr>
                          )}
                        </>
                      )}

                      {!isLoading && errorMsg === '' && activeReportId === 'vencimentos_criticos' && (
                        <>
                          {computedVencimentos.map((e, idx) => {
                            const isExpired = e.daysRemaining < 0;
                            return (
                              <tr key={e.id_estoque} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                <td className="px-5 py-3 text-xs font-black text-gray-900">{e.id_produto}</td>
                                <td className="px-2.5 py-3 text-xs font-bold text-gray-900 uppercase">
                                  <div className="flex flex-col">
                                    <span>{e.produto?.descricao}</span>
                                    <span className="text-[9px] font-medium text-gray-400 uppercase leading-none">{e.produto?.categoria?.descricao}</span>
                                  </div>
                                </td>
                                <td className="px-5 py-3 text-xs font-semibold text-gray-600">{formatDateStr(e.vencimento)}</td>
                                <td className="px-5 py-3 text-xs">
                                  <span className={cn(
                                    "px-2.5 py-0.5 rounded-full text-[10px] font-black",
                                    isExpired ? "bg-red-200 text-red-900 uppercase" : e.daysRemaining <= 30 ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                                  )}>
                                    {isExpired ? `VENCIDO (há ${Math.abs(e.daysRemaining)} dias)` : `${e.daysRemaining} dias restantes`}
                                  </span>
                                </td>
                                <td className="px-5 py-3 text-right text-xs font-extrabold text-[#ca8a04]">{Math.round(e.qtd_estoque)}</td>
                                <td className="px-5 py-3 text-right text-xs font-extrabold text-neutral-800">
                                  {(Number(e.qtd_estoque || 0) * Number(e.produto?.preco || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </td>
                              </tr>
                            );
                          })}

                          {computedVencimentos.length > 0 && (
                            <tr className="bg-amber-100 border-t-2 border-amber-300 font-bold text-xs text-amber-900">
                              <td colSpan={4} className="px-5 py-3.5 text-right font-black">EXPOSIÇÃO DE RISCOS DE COMPRA:</td>
                              <td className="px-5 py-3.5 text-right font-black">
                                {Math.round(computedVencimentos.reduce((acc, curr) => acc + Number(curr.qtd_estoque || 0), 0))}
                              </td>
                              <td className="px-5 py-3.5 text-right font-black text-[#dc2626]">
                                {computedVencimentos.reduce((acc, curr) => acc + (Number(curr.qtd_estoque || 0) * Number(curr.produto?.preco || 0)), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </td>
                            </tr>
                          )}
                        </>
                      )}

                      {!isLoading && errorMsg === '' && activeReportId === 'itens_sem_movimentacao' && (
                        <>
                          {computedItensSemMov.map((p, idx) => (
                            <tr key={p.id_produto} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                              <td className="px-5 py-3 text-xs font-black text-gray-900">{p.id_produto}</td>
                              <td className="px-5 py-3 text-xs font-bold text-gray-950 uppercase">{p.descricao}</td>
                              <td className="px-5 py-3 text-xs font-semibold text-gray-500 font-sans capitalize">
                                {categorias.find(c => c.id_categoria === p.id_categoria)?.descricao || '---'}
                              </td>
                              <td className="px-5 py-3 text-xs font-bold text-gray-500 text-center">{p.unidade}</td>
                              <td className="px-5 py-3 text-right text-xs font-semibold text-gray-500">
                                {Number(p.preco || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </td>
                              <td className="px-5 py-3 text-right text-xs font-black text-red-600 bg-amber-50/50">{p.stockQty}</td>
                              <td className="px-5 py-3 text-right text-xs font-extrabold text-amber-800 bg-amber-50/50">
                                {p.estimatedValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </td>
                            </tr>
                          ))}

                          {computedItensSemMov.length > 0 && (
                            <tr className="bg-slate-200 border-t-2 border-slate-300 font-bold text-slate-800 text-xs">
                              <td colSpan={5} className="px-5 py-3.5 text-right font-black">SALDO COMPLETA INATIVO:</td>
                              <td className="px-5 py-3.5 text-right font-black text-red-700 bg-amber-100/40">
                                {computedItensSemMov.reduce((acc, curr) => acc + curr.stockQty, 0)}
                              </td>
                              <td className="px-5 py-3.5 text-right font-black text-amber-900 bg-amber-100/40">
                                {computedItensSemMov.reduce((acc, curr) => acc + curr.estimatedValue, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </td>
                            </tr>
                          )}
                        </>
                      )}

                    </tbody>
                  </table>

                </div>
              </div>

              {/* MODAL FOOTER */}
              <footer className="bg-white border-t border-outline px-6 py-4 flex items-center justify-between text-xs text-on-surface-variant font-bold uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary animate-ping"></span>
                  <span>Registros Encontrados: {currentReportRecordsCount}</span>
                </div>
                <div>
                  AlmoxarifeControl v2.0
                </div>
              </footer>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* COMPACT PRINT HISTORY LOGS SLIDEOVER PANEL */}
      <AnimatePresence>
        {isHistoryOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end">
            <motion.div 
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl border-l border-outline"
            >
              <header className="px-6 py-5 border-b border-outline flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <History className="w-5 h-5 text-primary" />
                  <h3 className="font-black text-lg text-primary">Histórico de Emissões</h3>
                </div>
                <button 
                  onClick={() => setIsHistoryOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-neutral-100 flex items-center justify-center transition-all bg-neutral-50 border border-neutral-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </header>

              <div className="flex-1 overflow-auto p-6 space-y-4">
                {logs.length === 0 ? (
                  <div className="text-center py-16 text-gray-400">
                    <History className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="font-bold text-sm">Nenhum log de impressão ou exportação registrado.</p>
                    <p className="text-[11px] leading-tight mt-1">Os relatórios emitidos nesta sessão do navegador são salvos localmente.</p>
                  </div>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="border border-outline p-4 rounded-xl space-y-2 bg-slate-50/50 hover:bg-slate-50 transition-all text-xs">
                      <div className="flex items-center justify-between font-black text-gray-800">
                        <span>{log.reportLabel}</span>
                        <span className="text-[10px] text-gray-400">{log.datetime.split(' ')[0]}</span>
                      </div>
                      <p className="text-on-surface-variant leading-tight font-medium">
                        <strong>Filtros:</strong> {log.filters}
                      </p>
                      <div className="flex items-center justify-between text-[10px] font-black uppercase text-primary pt-1 border-t border-outline-variant">
                        <span>Gerado via Sistema</span>
                        <span>{log.recordsCount} Registros</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {logs.length > 0 && (
                <footer className="p-6 border-t border-outline bg-neutral-50">
                  <button 
                    onClick={clearPrintHistory}
                    className="w-full text-center py-2.5 border border-red-200 hover:border-red-600 rounded-xl text-xs font-black text-red-600 hover:bg-red-50 hover:text-red-700 transition-all cursor-pointer active:scale-95"
                  >
                    Apagar Histórico de Auditoria
                  </button>
                </footer>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* STATIC DECORATIVE INFORMATION INTRODUCTORY CARD */}
      <section className="mt-12 rounded-3xl overflow-hidden border border-outline-variant bg-white shadow-sm">
        <div className="grid md:grid-cols-2">
          <div className="p-10 flex flex-col justify-center">
            <span className="text-primary font-black text-[10px] uppercase mb-4 tracking-[0.2em] opacity-85">INTELIGÊNCIA DE DADOS INTEGRADA</span>
            <h3 className="text-3xl font-black text-on-surface leading-tight mb-6">Decisões rápidas e precisas no almoxarifado</h3>
            <p className="text-sm text-on-surface-variant leading-relaxed mb-8 font-medium">
              A nossa ferramenta de relatórios gerenciais cruza informações de validade por lote de estoque físico, movimentações financeiras com preços médios e histórico de operários em tempo real. Com as opções de exportar CSV estruturado ou imprimir direto no padrão A4 oficial para carimbagem.
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 text-primary bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full text-[10px] font-black uppercase">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> EXPORTAÇÃO COMPLETA CSV
              </div>
              <div className="flex items-center gap-2 text-primary bg-primary/5 border border-primary/10 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-normal">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> IMPRESSÃO DIRETA DE DOCUMENTO
              </div>
            </div>
          </div>
          <div className="relative min-h-[300px] h-full bg-slate-100 flex items-center justify-center overflow-hidden">
             <img 
               src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80" 
               alt="Analytics Dashboard Model" 
               className="w-full h-full object-cover grayscale opacity-45 hover:grayscale-0 transition-all duration-1000"
               referrerPolicy="no-referrer"
             />
             <div className="absolute inset-0 bg-primary/10 mix-blend-multiply" />
          </div>
        </div>
      </section>
    </div>
  );
}
