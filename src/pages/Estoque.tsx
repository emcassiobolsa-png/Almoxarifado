import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { renderToString } from 'react-dom/server';
import { Estoque as IEstoque, Categoria } from '../types';
import { Search, Filter, AlertCircle, ChevronDown, ArrowUpDown, ChevronUp, Printer } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion } from 'motion/react';
import { differenceInDays, parseISO, startOfDay, endOfDay } from 'date-fns';
import { EstoquePrint } from '../components/EstoquePrint';

type SortField = 'produto' | 'categoria' | 'unidade' | 'vencimento' | 'qtd_estoque' | 'status';
type SortDirection = 'asc' | 'desc';

export function Estoque() {
  const [estoque, setEstoque] = useState<IEstoque[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  
  // Custom states for filtering
  const [search, setSearch] = useState('');
  const [categoria, setCategoria] = useState('Todas');
  const [vencimentoInicio, setVencimentoInicio] = useState('');
  const [vencimentoFim, setVencimentoFim] = useState('');

  // Results state
  const [filteredEstoque, setFilteredEstoque] = useState<IEstoque[]>([]);
  const [hasFiltered, setHasFiltered] = useState(false);
  const [filterError, setFilterError] = useState('');

  // Sort state
  const [sortField, setSortField] = useState<SortField>('produto');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    api.getEstoque().then(setEstoque);
    api.getCategorias().then(setCategorias);
  }, []);

  const getStatusInfo = (vencimento: string) => {
    const days = differenceInDays(parseISO(vencimento), new Date());
    if (days < 0) return { label: 'Vencido', color: 'bg-red-100 text-red-800', border: 'border-red-200' };
    if (days < 30) return { label: '< 30 Dias', color: 'bg-orange-100 text-orange-800', border: 'border-orange-200' };
    if (days < 90) return { label: '< 90 Dias', color: 'bg-yellow-100 text-yellow-800', border: 'border-yellow-200' };
    return { label: 'Regular', color: 'bg-emerald-100 text-emerald-800', border: 'border-emerald-200' };
  };

  const handleApplyFilters = () => {
    setFilterError('');
    if (search.length < 3) {
      setFilterError('O filtro só é aplicado se for digitado pelo menos 3 caracteres no campo de Produto.');
      setHasFiltered(false);
      setFilteredEstoque([]);
      return;
    }

    const result = estoque.filter(e => {
      // 1. Produto: by description or ID
      const desc = e.produto?.descricao || '';
      const searchTerms = search.toLowerCase().split(' ').filter(t => t.length > 0);
      const matchesSearch = e.id_produto.toString().includes(search) || 
                            (searchTerms.length > 0 && searchTerms.every(term => desc.toLowerCase().includes(term)));
      if (!matchesSearch) return false;

      // 2. Categoria
      if (categoria !== 'Todas' && e.produto?.id_categoria?.toString() !== categoria) {
        return false;
      }

      // 3. Vencimentos
      const eDate = parseISO(e.vencimento);
      if (vencimentoInicio) {
        if (eDate < startOfDay(parseISO(vencimentoInicio))) return false;
      }
      if (vencimentoFim) {
        if (eDate > endOfDay(parseISO(vencimentoFim))) return false;
      }

      return true;
    });

    setFilteredEstoque(result);
    setHasFiltered(true);
  };

  const handleClearFilters = () => {
    setSearch('');
    setCategoria('Todas');
    setVencimentoInicio('');
    setVencimentoFim('');
    setHasFiltered(false);
    setFilteredEstoque([]);
    setFilterError('');
  };

  // Compute Highlights
  const totalEmEstoque = hasFiltered ? filteredEstoque.reduce((acc, curr) => acc + curr.qtd_estoque, 0) : 0;
  const itensVencidos = hasFiltered ? filteredEstoque.filter(e => differenceInDays(parseISO(e.vencimento), new Date()) < 0).length : 0;
  const vencimento30Dias = hasFiltered ? filteredEstoque.filter(e => {
    const d = differenceInDays(parseISO(e.vencimento), new Date());
    return d >= 0 && d < 30;
  }).length : 0;
  const valorEstimado = hasFiltered ? filteredEstoque.reduce((acc, curr) => acc + (curr.qtd_estoque * (curr.produto?.preco || 0)), 0) : 0;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedEstoque = [...filteredEstoque].sort((a, b) => {
    let aValue: any = '';
    let bValue: any = '';

    switch (sortField) {
      case 'produto':
        aValue = a.produto?.descricao || '';
        bValue = b.produto?.descricao || '';
        break;
      case 'categoria':
        aValue = a.produto?.categoria?.descricao || '';
        bValue = b.produto?.categoria?.descricao || '';
        break;
      case 'unidade':
        aValue = a.produto?.unidade || '';
        bValue = b.produto?.unidade || '';
        break;
      case 'vencimento':
        aValue = a.vencimento;
        bValue = b.vencimento;
        break;
      case 'qtd_estoque':
        aValue = a.qtd_estoque;
        bValue = b.qtd_estoque;
        break;
      case 'status':
        aValue = getStatusInfo(a.vencimento).label;
        bValue = getStatusInfo(b.vencimento).label;
        break;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40 group-hover:opacity-100 transition-opacity" />;
    return sortDirection === 'asc' ? 
      <ChevronUp className="w-3 h-3 ml-1 text-primary" /> : 
      <ChevronDown className="w-3 h-3 ml-1 text-primary" />;
  };

  const handlePrint = async () => {
    if (!hasFiltered || filteredEstoque.length === 0) {
      alert("Nenhum dado para imprimir. Por favor, aplique um filtro para consultar o estoque primeiro.");
      return;
    }

    let logoDataUrl = '';
    
    // Load local storage custom logo if exists
    const storedLogo = localStorage.getItem('companyLogo');
    if (storedLogo) {
      logoDataUrl = storedLogo;
    } else {
      try {
        const response = await fetch(window.location.origin + '/logo.PNG');
        if (response.ok) {
          const blob = await response.blob();
          if (blob.size > 0) {
            logoDataUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
          }
        }
      } catch (e) {}

      if (!logoDataUrl) {
        // Fallback to fetching default if exists
        try {
          const response = await fetch(window.location.origin + '/logo.png');
          if (response.ok) {
            const blob = await response.blob();
            if (blob.size > 0) {
              logoDataUrl = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
              });
            }
          }
        } catch (e) {}
      }
    }

    const printContent = renderToString(
      <EstoquePrint 
        estoqueList={sortedEstoque} 
        logoDataUrl={logoDataUrl} 
        filterDetails={{
          search,
          categoria: categorias.find(c => c.id_categoria.toString() === categoria)?.descricao || 'Todas',
          vencimentoInicio,
          vencimentoFim
        }}
        totais={{
          totalEmEstoque,
          itensVencidos,
          vencimento30Dias,
          valorEstimado
        }}
      />
    );
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(el => el.outerHTML)
      .join('\n');
      
    const newWindow = window.open('', '_blank');
    if (!newWindow) {
      alert("Por favor, permita pop-ups no seu navegador para imprimir.");
      return;
    }

    newWindow.document.open();
    newWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Relatório de Estoque</title>
          ${styles}
          <style>
             @media print {
                @page { margin: 0; size: A4; }
                body {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  margin: 0;
                  padding: 0;
                }
             }
          </style>
        </head>
        <body onload="window.print(); window.onafterprint = function(){ window.close(); }">
          ${printContent}
        </body>
      </html>
    `);
    newWindow.document.close();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-primary tracking-tight">Consulta de Estoque</h2>
          <p className="text-on-surface-variant font-medium">Acompanhamento de saldos e validades por lote</p>
        </div>
        <div className="flex gap-4">
          <div className="flex bg-surface-container-high p-1 rounded-lg border border-outline-variant">
            <button className="px-4 py-1.5 rounded-md text-xs font-black bg-white shadow-sm text-primary">Por Produto (Total)</button>
            <button className="px-4 py-1.5 rounded-md text-xs font-black text-on-surface-variant hover:text-primary transition-colors">Por Vencimento</button>
          </div>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-sm hover:opacity-90 active:scale-95 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline text-white">Imprimir Relatório</span>
          </button>
        </div>
      </header>

      {/* Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-outline-variant p-5 rounded-2xl shadow-sm">
          <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1 opacity-60">TOTAL EM ESTOQUE</p>
          <h3 className="text-3xl font-black text-primary">{totalEmEstoque.toLocaleString('pt-BR')}</h3>
          <p className="text-xs text-secondary font-bold mt-2 flex items-center">
            Resultados do filtro
          </p>
        </div>
        <div className="bg-white border border-outline-variant p-5 rounded-2xl shadow-sm">
          <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1 opacity-60">ITENS VENCIDOS</p>
          <h3 className="text-3xl font-black text-error">{itensVencidos}</h3>
          <p className="text-xs text-error font-bold mt-2 flex items-center">
            <AlertCircle className="w-3 h-3 mr-1" /> Ação imediata requerida
          </p>
        </div>
        <div className="bg-white border border-outline-variant p-5 rounded-2xl shadow-sm">
          <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1 opacity-60">VENCIMENTO &lt; 30 DIAS</p>
          <h3 className="text-3xl font-black text-orange-600">{vencimento30Dias}</h3>
          <p className="text-xs text-orange-600 font-bold mt-2">Priorizar saída de estoque</p>
        </div>
        <div className="bg-white border border-outline-variant p-5 rounded-2xl shadow-sm">
          <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1 opacity-60">VALOR ESTIMADO</p>
          <h3 className="text-3xl font-black text-on-surface">{valorEstimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h3>
          <p className="text-xs text-on-surface-variant font-medium mt-2">Baseado no preço un.</p>
        </div>
      </div>

      {/* Filter Options */}
      <div className="bg-white border border-outline-variant rounded-xl p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-on-surface uppercase tracking-widest opacity-70">Produto</label>
            <input className="px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none" placeholder="Nome ou SKU" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-on-surface uppercase tracking-widest opacity-70">Categoria</label>
            <div className="relative">
              <select value={categoria} onChange={e => setCategoria(e.target.value)} className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-sm appearance-none focus:ring-1 focus:ring-primary outline-none">
                <option value="Todas">Todas</option>
                {categorias.map(c => (
                  <option key={c.id_categoria} value={c.id_categoria.toString()}>{c.descricao}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50 pointer-events-none" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-on-surface uppercase tracking-widest opacity-70">Vencimento Início</label>
            <input type="date" value={vencimentoInicio} onChange={e => setVencimentoInicio(e.target.value)} className="px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-on-surface uppercase tracking-widest opacity-70">Vencimento Fim</label>
            <input type="date" value={vencimentoFim} onChange={e => setVencimentoFim(e.target.value)} className="px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none" />
          </div>
        </div>
        {filterError && (
          <div className="mt-4 p-3 bg-error-container text-error rounded-lg text-sm font-bold flex items-center">
            <AlertCircle className="w-4 h-4 mr-2" />
            {filterError}
          </div>
        )}
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={handleClearFilters} className="px-4 py-2 text-primary font-bold text-sm hover:underline">Limpar</button>
          <button onClick={handleApplyFilters} className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white h-10 px-6 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors active:scale-95 shadow-sm border border-emerald-700/15 shrink-0">
            <Filter className="w-4 h-4" />
            Filtrar
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse zebra-table">
            <thead>
              <tr className="bg-surface-container-low/50 text-on-surface-variant text-[11px] font-bold uppercase tracking-widest">
                <th className="px-6 py-4 cursor-pointer hover:bg-surface-container-low transition-colors group" onClick={() => handleSort('produto')}>
                  <div className="flex items-center">Produto <SortIcon field="produto" /></div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-surface-container-low transition-colors group" onClick={() => handleSort('categoria')}>
                  <div className="flex items-center">Categoria <SortIcon field="categoria" /></div>
                </th>
                <th className="px-4 py-4 cursor-pointer hover:bg-surface-container-low transition-colors group" onClick={() => handleSort('unidade')}>
                  <div className="flex items-center">Unidade <SortIcon field="unidade" /></div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-surface-container-low transition-colors group" onClick={() => handleSort('vencimento')}>
                  <div className="flex items-center">Vencimento <SortIcon field="vencimento" /></div>
                </th>
                <th className="px-6 py-4 text-right cursor-pointer hover:bg-surface-container-low transition-colors group" onClick={() => handleSort('qtd_estoque')}>
                  <div className="flex items-center justify-end">Quantidade <SortIcon field="qtd_estoque" /></div>
                </th>
                <th className="px-6 py-4 text-center cursor-pointer hover:bg-surface-container-low transition-colors group" onClick={() => handleSort('status')}>
                  <div className="flex items-center justify-center">Status <SortIcon field="status" /></div>
                </th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-outline-variant text-on-surface">
              {!hasFiltered ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant font-medium">
                    Preencha os filtros acima e clique em "Filtrar" para consultar o estoque.
                  </td>
                </tr>
              ) : sortedEstoque.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant font-medium">
                    Nenhum item em estoque encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                sortedEstoque.map((e, i) => {
                  const status = getStatusInfo(e.vencimento);
                  return (
                    <motion.tr 
                      key={e.id_estoque}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="hover:bg-surface-container-low/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold">{e.produto?.descricao}</span>
                          <span className="text-[10px] text-on-surface-variant/60 font-mono tracking-tighter">SKU: PROD-{e.id_produto}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-on-surface-variant font-medium">{e.produto?.categoria?.descricao}</td>
                      <td className="px-4 py-4">
                        <span className="px-2 py-0.5 bg-surface-container text-on-surface-variant rounded text-[10px] font-black uppercase">
                          {e.produto?.unidade}
                        </span>
                      </td>
                      <td className={cn("px-6 py-4 font-black", status.color.split(' ')[1])}>
                        {e.vencimento ? e.vencimento.split('T')[0].split('-').reverse().join('/') : '-'}
                      </td>
                      <td className="px-6 py-4 text-right font-black text-primary">{e.qtd_estoque}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter border",
                          status.color,
                          status.border
                        )}>
                          {status.label}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
