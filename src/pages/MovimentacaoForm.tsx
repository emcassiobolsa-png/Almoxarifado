import { useState, useEffect } from 'react';
import { api, mockProdutos, mockPessoas, isSupabaseConfigured } from '../services/api';
import { TipoMovimentacao, MovimentacaoDetalhe, Pessoa, Produto, Estoque, Movimentacao } from '../types';
import { Search, Save, X, Plus, Trash2, Info, AlertTriangle, Barcode, Check, User, Users, Filter, CheckCircle, Smartphone } from 'lucide-react';
import { cn, formatCurrency, getCuiabaDateString } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const TIPO_FLOW: Record<string, 'ENTRADA' | 'SAÍDA'> = {
  'BALANÇO': 'ENTRADA', // Ou SAÍDA, dependendo da necessidade, mas geralmente BALANÇO é ajuste
  'CESSÃO DE DOAÇÃO': 'SAÍDA',
  'COMPRA DE FORNECEDOR': 'ENTRADA',
  'CONSUMO': 'SAÍDA',
  'DEVOLUÇÃO DE CONSUMO': 'ENTRADA',
  'ENTRADA DE BAZAR': 'ENTRADA',
  'ESTOQUE INICIAL': 'ENTRADA',
  'PRODUTOS AVARIADOS': 'SAÍDA',
  'RECEBIMENTO DE DOAÇÃO': 'ENTRADA',
  'SAÍDA PARA BAZAR': 'SAÍDA',
  'SAÍDA PARA PERMUTA': 'SAÍDA',
};

export function MovimentacaoForm({ onClose, editData }: { onClose: () => void, editData?: Movimentacao | null }) {
  // Form State
  const [tipo, setTipo] = useState<TipoMovimentacao>(editData?.tipo_movimentaca || 'CONSUMO');
  const [pessoaId, setPessoaId] = useState<number | ''>(editData?.id_pessoas || '');
  const [docEntrada, setDocEntrada] = useState(editData?.doc_entrada || '');
  const [data, setData] = useState(editData?.datahora ? getCuiabaDateString(editData.datahora) : getCuiabaDateString());
  
  // Selection State
  const [searchProduct, setSearchProduct] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Produto | null>(null);
  const [availableLots, setAvailableLots] = useState<Estoque[]>([]);
  const [selectedLot, setSelectedLot] = useState<Estoque | null>(null);
  const [manualVencimento, setManualVencimento] = useState('');
  const [caEpi, setCaEpi] = useState('');
  const [qty, setQty] = useState(1);

  // New product filtering states to prevent automatic search on the fly
  const [hasFilteredProducts, setHasFilteredProducts] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState<Produto[]>([]);
  const [productSearchError, setProductSearchError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Stock
  const [estoque, setEstoque] = useState<Estoque[]>([]);

  // Items List
  const [items, setItems] = useState<Partial<MovimentacaoDetalhe>[]>(editData?.itens || []);
  const [barcodesMap, setBarcodesMap] = useState<Record<number, { code: string; date: string }[]>>({});
  const [errorHeader, setErrorHeader] = useState<string | null>(null);
  
  // Mobile cell captures import states
  const [hasCellCapture, setHasCellCapture] = useState(false);
  const [cellCaptureItems, setCellCaptureItems] = useState<any[]>([]);
  const [clearCellCaptureOnSave, setClearCellCaptureOnSave] = useState(false);
  
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);

  // Pessoas search states
  const [searchPessoaText, setSearchPessoaText] = useState('');
  const [filteredPessoas, setFilteredPessoas] = useState<Pessoa[]>([]);
  const [hasFilteredPessoas, setHasFilteredPessoas] = useState(false);
  const [isFilteringPessoas, setIsFilteringPessoas] = useState(false);
  const [pessoaSearchError, setPessoaSearchError] = useState<string | null>(null);

  useEffect(() => {
    api.getBarcodes().then(setBarcodesMap);
    api.getProdutos().then(setProdutos);
    api.getEstoque().then(setEstoque).catch(err => console.error("Erro ao carregar estoque:", err));
    
    if (editData?.id_pessoas) {
      api.getPessoas().then(allPessoas => {
        setPessoas(allPessoas);
        const selected = allPessoas.find(p => p.id_pessoas === editData.id_pessoas);
        if (selected) {
          setFilteredPessoas([selected]);
          setHasFilteredPessoas(true);
          setSearchPessoaText(selected.nome || selected.razaoSocial || selected.nomeFantasia || '');
        }
      });
    } else {
      api.getPessoas().then(setPessoas);
    }

    // Check if editing a draft that has cell captures
    if (editData?.justificativacessao) {
      try {
        const parsed = JSON.parse(editData.justificativacessao);
        if (parsed && parsed.isCapturaCelular && Array.isArray(parsed.itens) && parsed.itens.length > 0) {
          setHasCellCapture(true);
          setCellCaptureItems(parsed.itens);
        }
      } catch (err) {
        // Not a mobile capture json, ignore
      }
    } else {
      setHasCellCapture(false);
      setCellCaptureItems([]);
    }
  }, [editData]);

  const handleImportCellCapture = () => {
    if (cellCaptureItems.length === 0) return;

    const imported: Partial<MovimentacaoDetalhe>[] = cellCaptureItems.map(it => ({
      id_produto: it.id_produto,
      quantidade: it.quantidade,
      vencimento: it.vencimento,
      produto: {
        id_produto: it.id_produto,
        descricao: it.descricao,
        unidade: it.unidade || 'UN',
        preco: 0,
        id_categoria: 1
      }
    }));

    setItems(prev => {
      const merged = [...prev];
      imported.forEach(imp => {
        const existIdx = merged.findIndex(it => it.id_produto === imp.id_produto && it.vencimento === imp.vencimento);
        if (existIdx !== -1) {
          merged[existIdx] = {
            ...merged[existIdx],
            quantidade: (merged[existIdx].quantidade || 0) + imp.quantidade!
          };
        } else {
          merged.push(imp);
        }
      });
      return merged;
    });

    setHasCellCapture(false);
    setCellCaptureItems([]);
    setClearCellCaptureOnSave(true);
    alert(`Sucesso! ${imported.length} itens captados pelo celular foram importados para a lista atual.`);
  };

  const handleFilterPessoas = async () => {
    if (searchPessoaText.trim().length < 3) {
      setPessoaSearchError('Digite pelo menos 3 caracteres para filtrar.');
      return;
    }
    setPessoaSearchError(null);
    setIsFilteringPessoas(true);
    try {
      const data = await api.getPessoas(searchPessoaText.trim());
      setFilteredPessoas(data || []);
      setHasFilteredPessoas(true);
      
      if (data && data.length === 1) {
        setPessoaId(data[0].id_pessoas);
      } else {
        setPessoaId('');
      }
    } catch (err) {
      console.error("Erro ao buscar pessoas para movimentação:", err);
      setPessoaSearchError("Houve um erro ao buscar no banco de dados.");
    } finally {
      setIsFilteringPessoas(false);
    }
  };

  const handleFilterProducts = async () => {
    if (searchProduct.trim().length < 3) {
      setProductSearchError('Digite pelo menos 3 caracteres para filtrar.');
      setHasFilteredProducts(false);
      setFilteredProducts([]);
      return;
    }
    setProductSearchError(null);
    try {
      const allEstoque = await api.getEstoque();
      if (allEstoque) setEstoque(allEstoque);
    } catch (err) {
      console.error("Erro ao carregar estoque antes de filtrar:", err);
    }

    try {
      const apiProducts = await api.getProdutos(searchProduct.trim());
      
      let matches = apiProducts;
      if (!isSupabaseConfigured()) {
        const searchLower = searchProduct.trim().toLowerCase();
        const searchTerms = searchLower.split(' ').filter(t => t.length > 0);

        matches = apiProducts.filter(p => {
          if (!p) return false;
          const pDesc = p.descricao ? String(p.descricao).toLowerCase() : '';
          const matchesDesc = searchTerms.length > 0 && searchTerms.every(term => pDesc.includes(term));
          
          const productBarcodes = barcodesMap[p.id_produto] || [];
          const matchesBarcode = productBarcodes.some(b => {
            const codeStr = b && b.code !== undefined && b.code !== null ? String(b.code) : '';
            return codeStr.includes(searchLower);
          });
          
          const pId = p.id_produto !== undefined && p.id_produto !== null ? String(p.id_produto) : '';
          
          return pId.includes(searchLower) || matchesDesc || matchesBarcode;
        });
      }

      setFilteredProducts(matches);
      setHasFilteredProducts(true);
    } catch (err) {
      console.error("Erro ao buscar produtos com filtro:", err);
      setProductSearchError("Erro ao buscar produtos.");
    }
  };

  const flow = TIPO_FLOW[tipo] || 'SAÍDA';

  const handleSubmit = async () => {
    setErrorHeader(null);

    if (!pessoaId) {
      setErrorHeader('Selecione uma pessoa/solicitante.');
      return;
    }

    if (items.length === 0) {
      setErrorHeader('Adicione pelo menos um produto à movimentação.');
      return;
    }

    if (tipo === 'COMPRA DE FORNECEDOR' && !docEntrada) {
      setErrorHeader('Informe o nº do recibo ou NF.');
      return;
    }

    const movId = editData?.id_movimentacao || Date.now();
    
    const timePart = editData?.datahora 
      ? new Date(editData.datahora).toLocaleString('sv-SE', { timeZone: 'America/Cuiaba' }).split(' ')[1] 
      : new Date().toLocaleString('sv-SE', { timeZone: 'America/Cuiaba' }).split(' ')[1];
      
    const finalDatahora = `${data}T${timePart}-04:00`;
    
    // Save to API (persistent localStorage)
    const newMovimentacao = {
      id_movimentacao: movId,
      tipo_movimentaca: tipo,
      id_pessoas: Number(pessoaId),
      datahora: finalDatahora,
      entrada_saida: flow,
      status: 'DIGITANDO' as const,
      pessoa: filteredPessoas.find(p => p.id_pessoas === Number(pessoaId)) || 
              pessoas.find(p => p.id_pessoas === Number(pessoaId)) || 
              mockPessoas.find(p => p.id_pessoas === Number(pessoaId)),
      doc_entrada: docEntrada,
      justificativacessao: clearCellCaptureOnSave ? null : editData?.justificativacessao,
      itens: items.map((item, idx) => ({
        ...item,
        id_mov_detalhe: Math.floor(Math.random() * 1000000) + idx,
        id_movimentacao: movId,
      })) as MovimentacaoDetalhe[]
    };

    setIsProcessing(true);
    try {
      await api.saveMovimentacao(newMovimentacao);
      alert('Movimentação salva com sucesso com status DIGITANDO!');
      onClose();
    } catch (err: any) {
      console.error("Erro ao salvar movimentação:", err);
      setErrorHeader('Erro ao salvar movimentação: ' + (err.message || String(err)));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddProduct = () => {
    if (!selectedProduct) return;
    
    // Garante que se houver um lote selecionado, use o vencimento dele, caso contrário use a data manual ou a data geral
    const vencimentoFinal = flow === 'ENTRADA' ? (manualVencimento || data) : (selectedLot?.vencimento || data);

    // Validação de data para entrada
    if (flow === 'ENTRADA' && !manualVencimento) {
      setErrorHeader('Informe a data de vencimento do lote.');
      return;
    }

    // Validação de quantidade disponível (apenas para saídas)
    if (flow === 'SAÍDA' && selectedLot) {
      const existingItem = items.find(
        item => item.id_produto === selectedProduct.id_produto && item.vencimento === vencimentoFinal
      );
      const currentQtyInList = existingItem?.quantidade || 0;
      const totalRequested = currentQtyInList + qty;

      if (totalRequested > selectedLot.qtd_estoque) {
        setErrorHeader(`Limite excedido: Este lote tem apenas ${selectedLot.qtd_estoque} disponível, mas você está tentando inserir um total de ${totalRequested}${currentQtyInList > 0 ? ` (Soma de ${qty} agora + ${currentQtyInList} que já estavam na lista)` : ''}.`);
        return;
      }
    }

    if (flow === 'SAÍDA' && selectedProduct.epi && !caEpi) {
      setErrorHeader('Obrigatório informar o número do C.A. para a saída deste EPI.');
      return;
    }

    setErrorHeader(null);

    setItems(prevItems => {
      // Verifica se já existe um item com o mesmo produto, vencimento e ca_epi na lista
      const existingItemIndex = prevItems.findIndex(
        item => item.id_produto === selectedProduct.id_produto && item.vencimento === vencimentoFinal && item.ca_epi === (flow === 'SAÍDA' && selectedProduct.epi ? caEpi : undefined)
      );

      if (existingItemIndex !== -1) {
        // Se existir, cria uma nova lista com a quantidade somada
        const newItems = [...prevItems];
        const existingItem = newItems[existingItemIndex];
        newItems[existingItemIndex] = {
          ...existingItem,
          quantidade: (existingItem.quantidade || 0) + qty
        };
        return newItems;
      }

      // Se não existir, adiciona o novo item
      const newItem: Partial<MovimentacaoDetalhe> = {
        id_produto: selectedProduct.id_produto,
        quantidade: qty,
        vencimento: vencimentoFinal,
        produto: selectedProduct,
        ca_epi: (flow === 'SAÍDA' && selectedProduct.epi) ? caEpi : undefined
      };
      return [...prevItems, newItem];
    });

    setSelectedProduct(null);
    setSelectedLot(null); // Limpa o lote selecionado
    setManualVencimento(''); // Limpa data manual
    setCaEpi(''); // Limpa C.A.
    setQty(1);
    setSearchProduct('');
    setHasFilteredProducts(false);
    setFilteredProducts([]);
    setProductSearchError(null);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex justify-center items-center bg-black/40 backdrop-blur-sm p-4 sm:p-6"
    >
      <div className="absolute inset-0" onClick={onClose} />
      
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="relative w-full max-w-[95vw] lg:max-w-6xl xl:max-w-7xl bg-white h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        <header className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-low/30">
          <div>
            <h3 className="text-xl font-black text-primary tracking-tight">
              {editData ? 'Editar Movimentação' : 'Nova Movimentação'}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn(
                "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest",
                flow === 'ENTRADA' ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
              )}>
                {flow}
              </span>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase">
                {editData?.status || 'Digitando'}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:text-error transition-colors">
            <X className="w-6 h-6" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* Banner de Captações Celular */}
          {hasCellCapture && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="bg-sky-50 text-sky-900 border border-sky-200 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs"
            >
              <div className="flex items-start gap-3.5">
                <div className="bg-sky-100 p-2.5 rounded-xl text-sky-700 shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-sky-950 uppercase tracking-wide">
                    Há Captações pelo Celular para este Pedido!
                  </h4>
                  <p className="text-xs text-sky-750 mt-1 font-medium">
                    O operador coletou um total de <span className="font-extrabold text-sky-950">{cellCaptureItems.length} {cellCaptureItems.length === 1 ? 'item' : 'itens'}</span> de produtos neste pedido via celular.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleImportCellCapture}
                className="bg-sky-600 hover:bg-sky-700 active:scale-95 text-white font-bold text-xs py-2.5 px-5 rounded-xl shrink-0 shadow-sm border border-sky-700/15 flex items-center gap-1.5 transition-all select-none cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                Confirmar Importação de Dados
              </button>
            </motion.div>
          )}

          {/* Header Info */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 border border-outline-variant rounded-2xl bg-surface-container-low/10">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-on-surface-variant uppercase tracking-widest opacity-60">Tipo de Movimentação</label>
              <select 
                className="w-full bg-white border border-outline-variant rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-primary outline-none"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoMovimentacao)}
              >
                {Object.keys(TIPO_FLOW).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-on-surface-variant uppercase tracking-widest opacity-60">Data da Movimentação</label>
              <input 
                type="date"
                className="w-full bg-white border border-outline-variant rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-primary outline-none"
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
            </div>

            {tipo === 'COMPRA DE FORNECEDOR' && (
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-black text-on-surface-variant uppercase tracking-widest opacity-60">Nº Recibo ou NF</label>
                <input 
                  type="text" 
                  className="w-full bg-white border border-outline-variant rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-primary outline-none"
                  placeholder="EX: NF-12345"
                  value={docEntrada}
                  onChange={(e) => setDocEntrada(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-1.5 md:col-span-2 border-t border-outline-variant/30 pt-4">
              <label className="text-xs font-black text-on-surface-variant uppercase tracking-widest opacity-60 block">Pessoa / Solicitante</label>
              
              <div className="flex flex-col sm:flex-row gap-2 mt-1">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
                  <input 
                    type="text"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-outline-variant rounded-lg h-10 text-sm focus:ring-1 focus:ring-primary outline-none"
                    placeholder="Digite o nome ou documento (mínimo 3 caracteres)..."
                    value={searchPessoaText}
                    onChange={(e) => {
                      setSearchPessoaText(e.target.value);
                      if (pessoaSearchError) setPessoaSearchError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleFilterPessoas();
                      }
                    }}
                  />
                </div>
                <button 
                  type="button"
                  onClick={handleFilterPessoas}
                  disabled={isFilteringPessoas}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white h-10 px-6 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors active:scale-95 shadow-sm border border-emerald-700/15 shrink-0"
                >
                  <Filter className="w-4 h-4" />
                  Filtrar
                </button>
              </div>

              {pessoaSearchError && (
                <p className="text-[11px] font-bold text-red-500 mt-1">{pessoaSearchError}</p>
              )}

              {/* Selected person confirmation card */}
              {pessoaId && (
                (() => {
                  const selected = filteredPessoas.find(p => p.id_pessoas === Number(pessoaId)) || 
                                   pessoas.find(p => p.id_pessoas === Number(pessoaId));
                  if (!selected) return null;
                  return (
                    <div className="mt-2.5 bg-emerald-50/70 border border-emerald-200/85 p-3 rounded-xl flex items-center justify-between shadow-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-emerald-600 text-white rounded-full flex items-center justify-center shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-black tracking-wider text-emerald-700 block mb-0.5">Pessoa Selecionada</span>
                          <p className="text-xs font-bold text-emerald-950">
                            {selected.nome || selected.razaoSocial || selected.nomeFantasia} <span className="opacity-60 text-[10px]">(#{selected.id_pessoas})</span>
                          </p>
                          {(selected.cpf_cnpj) && (
                            <span className="text-[10px] text-emerald-800 font-mono opacity-80">{selected.cpf_cnpj}</span>
                          )}
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setPessoaId('')}
                        className="text-[10px] font-semibold text-emerald-700 hover:text-red-600 transition-colors bg-white px-2.5 py-1 rounded-md border border-emerald-200 hover:border-red-200 shadow-3xs cursor-pointer"
                      >
                        Limpar
                      </button>
                    </div>
                  );
                })()
              )}

              {hasFilteredPessoas && !pessoaId && (
                <div className="mt-3 space-y-1 bg-surface-container-low/40 p-1.5 rounded-xl border border-outline-variant/30">
                  <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest opacity-70 block px-2.5 py-1">
                    Resultados do Filtro ({filteredPessoas.length})
                  </span>
                  
                  {filteredPessoas.length === 0 ? (
                    <p className="text-xs text-red-500 font-medium p-2.5">Nenhuma pessoa encontrada com essa descrição.</p>
                  ) : (
                    <div className="overflow-hidden border border-outline-variant/50 rounded-lg bg-white shadow-3xs">
                      <div className="overflow-y-auto max-h-52">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-surface-container-low text-on-surface-variant font-bold uppercase text-[10px] tracking-wider border-b border-outline-variant select-none">
                              <th className="px-3 py-2 text-center w-12">Selec.</th>
                              <th className="px-3 py-2">ID</th>
                              <th className="px-3 py-2">Nome / Razão Social</th>
                              <th className="px-3 py-2">Documento</th>
                              <th className="px-3 py-2">Tipo</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant text-[12px]">
                            {filteredPessoas.map(p => {
                              const isSelected = pessoaId === p.id_pessoas;
                              return (
                                <tr 
                                  key={p.id_pessoas}
                                  onClick={() => setPessoaId(p.id_pessoas)}
                                  className={cn(
                                    "cursor-pointer transition-colors hover:bg-surface-container-low/50 select-none",
                                    isSelected ? "bg-emerald-50/70 hover:bg-emerald-100/50 font-bold text-emerald-950" : "text-on-surface"
                                  )}
                                >
                                  <td className="px-3 py-2 text-center">
                                    <div className={cn(
                                      "w-4 h-4 mx-auto rounded-full flex items-center justify-center border transition-all",
                                      isSelected 
                                        ? "bg-emerald-600 border-emerald-600 text-white" 
                                        : "border-outline text-transparent"
                                    )}>
                                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 font-black text-primary">#{p.id_pessoas}</td>
                                  <td className="px-3 py-2 max-w-xs truncate">
                                    {p.nome || p.razaoSocial || p.nomeFantasia}
                                  </td>
                                  <td className="px-3 py-2 font-mono text-[11px] opacity-80">
                                    {p.cpf_cnpj || '---'}
                                  </td>
                                  <td className="px-3 py-2">
                                    <span className={cn(
                                      "px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wide",
                                      p.tipo_pessoa === 'FORNECEDOR' && "bg-amber-100 text-amber-800 border border-amber-200/50",
                                      p.tipo_pessoa === 'CLIENTE' && "bg-blue-100 text-blue-800 border border-blue-200/50",
                                      p.tipo_pessoa === 'COLABORADOR' && "bg-purple-100 text-purple-800 border border-purple-200/50",
                                      p.tipo_pessoa === 'DOADOR' && "bg-emerald-100 text-emerald-800 border border-emerald-200/50",
                                      p.tipo_pessoa === 'OUTROS' && "bg-surface-container text-on-surface-variant border border-outline-variant/50"
                                    )}>
                                      {p.tipo_pessoa}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!hasFilteredPessoas && !pessoaId && (
                <p className="text-[11px] text-on-surface-variant opacity-60 italic mt-1 block">
                  Digite o nome (mínimo 3 letras) e clique no botão <span className="font-bold text-emerald-600">Filtrar</span> para buscar e habilitar a listagem.
                </p>
              )}
            </div>
          </section>

          {/* Product Search & Selection */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-6 bg-primary rounded-full" />
              <h4 className="text-lg font-black text-primary tracking-tight">Localizar Produto</h4>
            </div>
            
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
                <input 
                  type="text"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-outline-variant rounded-xl text-sm focus:ring-1 focus:ring-primary outline-none"
                  placeholder="Digite o Código de Barras ou Descrição (mínimo 3 caracteres)..."
                  value={searchProduct}
                  onChange={(e) => {
                    setSearchProduct(e.target.value);
                    if (productSearchError) setProductSearchError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleFilterProducts();
                    }
                  }}
                />
              </div>
              <button 
                type="button"
                onClick={handleFilterProducts}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white h-10 px-6 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors active:scale-95 shadow-sm border border-emerald-700/15 shrink-0"
              >
                <Filter className="w-4 h-4" />
                Filtrar
              </button>
            </div>

            {productSearchError && (
              <p className="text-[11px] font-bold text-red-500 mt-1">{productSearchError}</p>
            )}

            {/* Simple Mock Search Results */}
            {hasFilteredProducts && !selectedProduct && (
              <div className="border border-outline-variant rounded-xl overflow-hidden shadow-xl bg-white divide-y divide-outline-variant/10">
                {filteredProducts.length === 0 ? (
                  <p className="text-xs text-red-500 font-medium p-4 text-center">Nenhum produto encontrado para o termo informado.</p>
                ) : (
                  filteredProducts.map(p => {
                    const productBarcodes = barcodesMap[p.id_produto] || [];
                    const matchedBarcode = productBarcodes.find(b => {
                      const codeStr = b && b.code !== undefined && b.code !== null ? String(b.code) : '';
                      return codeStr.includes(searchProduct.toLowerCase());
                    });

                    const productEstoqueList = (estoque || []).filter(e => e && e.id_produto === p.id_produto);
                    const totalEstoque = productEstoqueList.reduce((acc, curr) => acc + (curr.qtd_estoque || 0), 0);
                    const hasStock = totalEstoque > 0;
                    const isUnavailable = flow === 'SAÍDA' && !hasStock;
                    
                    return (
                      <button 
                        key={p.id_produto}
                        type="button"
                        disabled={isUnavailable}
                        onClick={() => {
                          if (isUnavailable) return;
                          setSelectedProduct(p);
                          setSelectedLot(null);
                          api.getEstoque().then(allEstoque => {
                            if (allEstoque) setEstoque(allEstoque);
                            const productLots = (allEstoque || [])
                              .filter((e) => e && e.id_produto === p.id_produto)
                              .sort((a, b) => {
                                if (!a.vencimento) return 1;
                                if (!b.vencimento) return -1;
                                return a.vencimento.localeCompare(b.vencimento);
                              });
                            setAvailableLots(productLots);
                            if (productLots.length > 0) {
                              setSelectedLot(productLots[0]);
                            } else {
                              setSelectedLot(null);
                            }
                          }).catch(err => {
                            console.error("Erro ao buscar estoques para lote:", err);
                            setAvailableLots([]);
                            setSelectedLot(null);
                          });
                        }}
                        className={cn(
                          "w-full p-4 flex justify-between items-center transition-all text-left",
                          isUnavailable 
                            ? "bg-red-50/40 hover:bg-red-50/60 cursor-not-allowed border-l-4 border-l-red-500" 
                            : "hover:bg-surface-container-low cursor-pointer"
                        )}
                      >
                        <div className="text-left flex-1 min-w-0 mr-4">
                          <p className={cn(
                            "font-bold text-sm block", 
                            isUnavailable ? "text-red-650 opacity-90 line-through" : "text-on-surface"
                          )}>
                            {p.descricao}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            <p className="text-[10px] text-on-surface-variant font-medium">Marca: Genérica | ID: #{p.id_produto}</p>
                            {matchedBarcode && (
                              <span className={cn(
                                "flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded font-black uppercase",
                                isUnavailable ? "bg-red-100 text-red-750" : "bg-primary/10 text-primary"
                              )}>
                                <Barcode className="w-3 h-3" /> {matchedBarcode.code}
                              </span>
                            )}
                            {isUnavailable ? (
                              <span className="bg-red-650 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded shadow-3xs">
                                Sem estoque
                              </span>
                            ) : (
                              <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                                Estoque total: {totalEstoque}
                              </span>
                            )}
                          </div>
                        </div>
                        {isUnavailable ? (
                          <span className="text-red-500 font-extrabold text-[9px] uppercase tracking-widest bg-red-100/80 px-2.5 py-1 rounded-md border border-red-200">
                            Sem estoque
                          </span>
                        ) : (
                          <span className="text-primary font-black text-[10px] uppercase tracking-widest hover:text-primary-dark shrink-0">
                            Selecionar
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            )}

            {/* Selected Product Form */}
            <AnimatePresence>
              {selectedProduct && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="p-6 bg-surface-container-low/40 border border-primary/20 rounded-2xl space-y-4"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="font-black text-primary">{selectedProduct.descricao}</h5>
                      <p className="text-xs text-on-surface-variant">Configure o lote e a quantidade para inserir na lista.</p>
                    </div>
                    <button onClick={() => setSelectedProduct(null)} className="text-on-surface-variant hover:text-error"><X className="w-4 h-4" /></button>
                  </div>
                  
                  <div className="flex flex-wrap items-start gap-4">
                    {flow === 'SAÍDA' ? (
                      <div className="space-y-1.5 flex-1 min-w-[200px]">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Lote / Vencimento (SAÍDA)</label>
                        <select 
                          className="w-full bg-white border border-outline-variant rounded-lg p-2 text-sm outline-none focus:border-primary"
                          onChange={(e) => {
                            const val = e.target.value;
                            setSelectedLot(val !== "" ? availableLots[Number(val)] : null);
                          }}
                        >
                          <option value="">Selecione um lote...</option>
                          {availableLots.map((l, i) => (
                            <option key={i} value={i}>
                              {l.vencimento.split('-').reverse().join('/')} (Saldo: {l.qtd_estoque})
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="space-y-1.5 flex-1 min-w-[200px]">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Vencimento do Lote (ENTRADA)</label>
                        <input 
                          type="date"
                          className="w-full bg-white border border-outline-variant rounded-lg p-2 text-sm outline-none focus:border-primary"
                          value={manualVencimento}
                          onChange={(e) => setManualVencimento(e.target.value)}
                        />
                      </div>
                    )}
                    
                    {flow === 'SAÍDA' && selectedProduct.epi && (
                      <div className="space-y-1.5 flex-1 min-w-[150px]">
                        <label className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Nº do C.A. (EPI)</label>
                        <input 
                          type="text" 
                          placeholder="Ex: 12345"
                          className="w-full bg-white border border-emerald-300 focus:ring-1 focus:ring-emerald-500 rounded-lg p-2 text-sm outline-none"
                          value={caEpi}
                          onChange={(e) => setCaEpi(e.target.value)}
                        />
                      </div>
                    )}
                    
                    <div className="space-y-1.5 flex flex-col w-[120px]">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Quantidade</label>
                      <input 
                        type="number" 
                        min="1"
                        className="w-full bg-white border border-outline-variant rounded-lg p-2 text-sm outline-none focus:border-primary"
                        value={qty}
                        onChange={(e) => setQty(Number(e.target.value))}
                      />
                      {(selectedLot || (flow === 'ENTRADA' && manualVencimento)) && (
                        <div className="mt-1 text-[9px] text-on-surface-variant font-medium leading-tight">
                          <span className="block text-primary font-black uppercase">Resumo do Item:</span>
                          {selectedLot && (
                            <>Disponível: <span className="font-bold">{selectedLot.qtd_estoque}</span> | </>
                          )}
                          Total na Lista: <span className="font-bold">{(items.find(it => it.id_produto === selectedProduct?.id_produto && it.vencimento === (selectedLot?.vencimento || manualVencimento))?.quantidade || 0) + qty}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-end mt-5 min-w-[180px]">
                      <button 
                        onClick={handleAddProduct}
                        className="w-full bg-primary text-white py-2 rounded-lg font-bold text-sm hover:opacity-90 transition-all flex items-center justify-center"
                      >
                        <Plus className="w-4 h-4 mr-2" /> Inserir na Lista
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {errorHeader && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-4 bg-error-container text-error rounded-xl flex items-center gap-3 border border-error/10 font-bold text-sm overflow-hidden"
                >
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  {errorHeader}
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* List Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-6 bg-primary rounded-full" />
              <h4 className="text-lg font-black text-primary tracking-tight">Produtos para Movimentar</h4>
            </div>

            <div className="border border-outline-variant rounded-2xl overflow-hidden bg-white shadow-inner min-h-[150px]">
              <table className="w-full text-left">
                <thead className="bg-surface-container-low/50 text-[10px] font-black uppercase tracking-widest border-b border-outline-variant/10">
                  <tr>
                    <th className="px-6 py-3">Descrição / Lote</th>
                    <th className="px-6 py-3">Vencimento</th>
                    <th className="px-6 py-3">Qtd</th>
                    <th className="px-6 py-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10 text-sm">
                  {items.map((item, i) => (
                    <tr key={i} className="group">
                      <td className="px-6 py-4">
                        <p className="font-bold">{item.produto?.descricao}</p>
                        <p className="text-[10px] text-on-surface-variant font-mono">LOT-AUTO-{item.id_produto}</p>
                        {item.ca_epi && (
                          <span className="inline-block mt-1 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded shadow-3xs">
                            C.A.: {item.ca_epi}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-medium">
                        {item.vencimento ? item.vencimento.split('-').reverse().join('/') : '-'}
                      </td>
                      <td className="px-6 py-4 font-black text-primary">{item.quantidade}</td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => setItems(items.filter((_, idx) => idx !== i))}
                          className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error-container/20 rounded transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-on-surface-variant italic opacity-40">
                        Nenhum produto adicionado à lista.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <footer className="p-6 border-t border-outline-variant bg-surface-container-low flex justify-between items-center shadow-[0_-4px_10px_-5px_rgba(0,0,0,0.1)]">
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-800">
            <AlertTriangle className="w-4 h-4" />
            <p className="text-[10px] font-black uppercase tracking-wider leading-none">Aviso de Pré-Digitação: Estoque não alterado ainda.</p>
          </div>
          <div className="flex gap-4">
            <button onClick={onClose} className="px-8 py-3 border border-outline-variant text-on-surface-variant font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-white transition-all">
              Cancelar
            </button>
            <button 
              onClick={handleSubmit}
              disabled={isProcessing}
              className={cn(
                "px-10 py-3 bg-primary text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg hover:shadow-xl hover:opacity-90 active:scale-95 transition-all flex items-center gap-2",
                isProcessing && "opacity-50 cursor-not-allowed cursor-wait"
              )}
            >
              <Save className="w-4 h-4" />
              {isProcessing ? 'Processando...' : 'Salvar Movimentação'}
            </button>
          </div>
        </footer>
      </motion.div>
    </motion.div>
  );
}
