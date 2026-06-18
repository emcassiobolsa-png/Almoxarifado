import { useState, useEffect } from 'react';
import { renderToString } from 'react-dom/server';
import { api } from '../services/api';
import { Movimentacao } from '../types';
import { Search, Plus, Edit2, CheckCircle2, XCircle, Printer, Filter, AlertTriangle } from 'lucide-react';
import { cn, formatDate } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { MovimentacaoForm } from './MovimentacaoForm';
import { MovimentacaoPrint } from '../components/MovimentacaoPrint';

export function Movimentacoes() {
  const [movs, setMovs] = useState<Movimentacao[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedStatusFilter, setAppliedStatusFilter] = useState('TODOS');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [hasFiltered, setHasFiltered] = useState(false);
  const [filterError, setFilterError] = useState('');
  const [editingMov, setEditingMov] = useState<Movimentacao | null>(null);

  const [confirmProcessMov, setConfirmProcessMov] = useState<Movimentacao | null>(null);

  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchMovs = (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    api.getMovimentacoes().then((data) => {
      setMovs(data || []);
      setErrorMsg('');
    }).catch((err) => {
      console.error(err);
      setErrorMsg(err.message || String(err));
      setMovs([]);
    }).finally(() => {
      if (showLoading) setIsLoading(false);
    });
  };

  const handleFilter = () => {
    setFilterError('');
    if (statusFilter !== 'DIGITANDO') {
      if (search.trim().length < 3) {
        setFilterError("É necessário digitar ao menos 3 caracteres no campo Buscar por Nome / ID para realizar a pesquisa.");
        return;
      }
    }
    
    console.log('handleFilter clicked! Current search:', search, 'statusFilter:', statusFilter, 'Total movs:', movs.length);
    setAppliedSearch(search);
    setAppliedStatusFilter(statusFilter);
    setHasFiltered(true);
    fetchMovs(true);
  };

  const handlePrint = async (mov: Movimentacao) => {
    let logoDataUrl = '';
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
    } catch (e) {
      console.error('Falha ao carregar a logo para impressão', e);
    }
    
    if (!logoDataUrl) {
      try {
        const response2 = await fetch(window.location.origin + '/logo.png');
        if (response2.ok) {
          const blob = await response2.blob();
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

    const printContent = renderToString(<MovimentacaoPrint movimentacao={mov} logoDataUrl={logoDataUrl} />);
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(el => el.outerHTML)
      .join('\n');
      
    const newWindow = window.open('', '_blank');
    if (!newWindow) {
      alert("Por favor, permita pop-ups (janelas flutuantes) no seu navegador para imprimir.");
      return;
    }

    newWindow.document.open();
    newWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Impressão de Movimentação</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          ${styles}
          <style>
            body { 
              background: #e5e7eb !important; 
              margin: 0; 
              padding: 20px; 
              font-family: ui-sans-serif, system-ui, sans-serif; 
              display: flex;
              justify-content: center;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            .page-a4 {
              background: white;
              width: 210mm;
              min-height: 297mm;
              box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
              padding: 0;
            }
            @media print {
              @page { margin: 0; size: A4; }
              body { 
                background: white !important; 
                padding: 0; 
                margin: 0; 
                display: block;
              }
              .page-a4 {
                width: 100%;
                min-height: auto;
                box-shadow: none;
              }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body onload="setTimeout(() => window.print(), 800)">
          <div class="page-a4">
            ${printContent}
          </div>
        </body>
      </html>
    `);
    newWindow.document.close();
  };

  const [isProcessing, setIsProcessing] = useState(false);

  const handleProcess = async (mov: Movimentacao) => {
    setConfirmProcessMov(mov);
  };

  const confirmProcess = async () => {
    if (confirmProcessMov) {
      setIsProcessing(true);
      try {
        const updatedMov = await api.processarMovimentacao(confirmProcessMov);
        setMovs(prev => prev.map(m => m.id_movimentacao === updatedMov.id_movimentacao ? updatedMov : m));
        fetchMovs(); // Refresh in background
        setConfirmProcessMov(null);
        alert("Movimentação processada com sucesso. O estoque foi atualizado.");
        await handlePrint(updatedMov);
      } catch (err: any) {
        alert(err.message || 'Erro ao processar movimentação.');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const filteredMovs = hasFiltered ? movs.filter(m => {
    const searchLower = appliedSearch?.toLowerCase().trim() || '';
    const name = m.pessoa?.nome || m.pessoa?.razaoSocial || m.pessoa?.nomeFantasia || '';
    const pessoaStr = name.toLowerCase();
    const idStr = m.id_movimentacao?.toString() || '';
    const matchesSearch = !searchLower || pessoaStr.includes(searchLower) || idStr.includes(searchLower);
    const matchesStatus = appliedStatusFilter === 'TODOS' || m.status === appliedStatusFilter;
    return matchesSearch && matchesStatus;
  }) : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tight">Movimentação ({filteredMovs.length} itens)</h1>
          <p className="text-on-surface-variant">Gerencie entradas e saídas de itens do estoque.</p>
        </div>
        <button 
          onClick={() => setIsFormOpen(true)}
          className="bg-primary-container text-white px-6 py-2.5 rounded-lg font-bold flex items-center hover:opacity-90 active:scale-95 transition-all self-start"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nova Movimentação
        </button>
      </header>

      {/* Filters Bar */}
      <div className="bg-white border border-outline-variant rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-12 lg:col-span-5">
            <label className="block text-xs font-black text-on-surface-variant mb-1.5 ml-1 uppercase tracking-wider opacity-60">Buscar por Nome / ID</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
              <input 
                type="text" 
                className="w-full pl-10 pr-4 py-2 bg-[#f9f9ff] border border-outline-variant rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
                placeholder="Nome da pessoa ou solicitante..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          
          <div className="md:col-span-6 lg:col-span-4">
            <label className="block text-xs font-black text-on-surface-variant mb-1.5 ml-1 uppercase tracking-wider opacity-60">Status</label>
            <select 
              className="w-full px-4 py-2 bg-[#f9f9ff] border border-outline-variant rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="TODOS">TODOS</option>
              <option value="DIGITANDO">DIGITANDO</option>
              <option value="PROCESSADO">PROCESSADO</option>
              <option value="CANCELADO">CANCELADO</option>
              <option value="ESTORNADO">ESTORNADO</option>
            </select>
          </div>

          <div className="md:col-span-6 lg:col-span-3">
            <button 
              onClick={handleFilter}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white h-10 px-6 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors active:scale-95 shadow-sm border border-emerald-700/15 w-full">
              <Filter className="w-4 h-4" />
              Filtrar
            </button>
          </div>
        </div>
        {filterError && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {filterError}
          </div>
        )}
      </div>

      <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse zebra-table">
            <thead>
              <tr className="bg-surface-container-low/50 text-on-surface-variant text-[11px] font-bold uppercase tracking-widest">
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">Data Hora</th>
                <th className="px-4 py-4 text-center">E/S</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-outline-variant text-on-surface">
              {errorMsg ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-red-500 font-medium">
                    Erro ao carregar movimentações: {errorMsg}
                  </td>
                </tr>
              ) : isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-primary font-medium">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm font-semibold text-primary">Aguarde, fazendo consulta...</span>
                    </div>
                  </td>
                </tr>
              ) : !hasFiltered ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-on-surface-variant font-medium">
                    Utilize os filtros e clique no botão Filtrar para buscar as movimentações.
                  </td>
                </tr>
              ) : movs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-on-surface-variant font-medium text-red-500">
                    Sua base de dados parece não possuir nenhuma movimentação cadastrada. (Total: 0)
                  </td>
                </tr>
              ) : filteredMovs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-on-surface-variant font-medium">
                    Nenhuma movimentação encontrada com os filtros informados (Total na base: {movs.length}).
                  </td>
                </tr>
              ) : (
                filteredMovs.map((m, i) => (
                  <motion.tr 
                    key={m.id_movimentacao}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="hover:bg-surface-container-low/30 transition-colors"
                  >
                    <td className="px-6 py-4 font-black">#{m.id_movimentacao}</td>
                    <td className="px-6 py-4 font-medium">{m.pessoa?.nome || m.pessoa?.razaoSocial || m.pessoa?.nomeFantasia}</td>
                    <td className="px-6 py-4 text-on-surface-variant">{formatDate(m.datahora)}</td>
                    <td className="px-4 py-4 text-center">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter",
                        m.entrada_saida === 'ENTRADA' ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      )}>
                        {m.entrada_saida}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                        m.status === 'DIGITANDO' && "bg-blue-100 text-blue-700",
                        m.status === 'PROCESSADO' && "bg-emerald-100 text-emerald-700",
                        m.status === 'CANCELADO' && "bg-red-100 text-red-700",
                      )}>
                        {m.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 text-on-surface-variant">
                        <button 
                          onClick={() => handlePrint(m)}
                          className="p-1.5 hover:text-primary transition-colors" 
                          title="Imprimir"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {m.status === 'DIGITANDO' && (
                          <>
                            <button 
                              onClick={() => {
                                setEditingMov(m);
                                setIsFormOpen(true);
                              }}
                              className="p-1.5 hover:text-blue-600 transition-colors" 
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleProcess(m)}
                              className="p-1.5 hover:text-emerald-600 transition-colors" 
                              title="Processar"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isFormOpen && (
          <div key={editingMov?.id_movimentacao || 'new'}>
            <MovimentacaoForm 
              editData={editingMov}
              onClose={() => {
                setIsFormOpen(false);
                setEditingMov(null);
                fetchMovs(true);
              }} 
            />
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmProcessMov && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-2">Processar Movimentação</h3>
              
              {isProcessing ? (
                <div className="py-6 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm font-semibold text-emerald-700 text-center">
                    Processando movimentação e atualizando estoque...
                  </span>
                </div>
              ) : (
                <>
                  <p className="text-gray-600 mb-6 font-medium">
                    Deseja realmente processar esta movimentação? Esta ação atualizará o estoque e alterará o status da movimentação para PROCESSADO.
                  </p>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setConfirmProcessMov(null)}
                      disabled={isProcessing}
                      className="px-4 py-2 font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={confirmProcess}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                      Confirmar Processamento
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
