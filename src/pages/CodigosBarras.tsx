import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Produto } from '../types';
import { Search, Plus, Barcode, ChevronRight, Trash2, Info, X } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion } from 'motion/react';

export function CodigosBarras() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Produto | null>(null);
  const [search, setSearch] = useState('');
  
  // Barcode associations state
  const [barcodesMap, setBarcodesMap] = useState<Record<number, { code: string; date: string }[]>>({});

  const [isAdding, setIsAdding] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  useEffect(() => {
    const fetchProdutos = async () => {
      try {
        const data = await api.getProdutos(search);
        setProdutos(data || []);
      } catch (error) {
        console.error("Erro ao buscar produtos:", error);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      fetchProdutos();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  useEffect(() => {
    api.getBarcodes().then(setBarcodesMap);
  }, []);

  // Sync barcodes to API/Storage when changed
  useEffect(() => {
    if (Object.keys(barcodesMap).length > 0) {
      api.saveBarcodes(barcodesMap);
    }
  }, [barcodesMap]);

  const filteredProdutos = produtos.filter(p => {
    if (search.length < 3) return false;
    const searchTerms = search.toLowerCase().split(' ').filter(t => t.length > 0);
    return p.id_produto.toString().includes(search) ||
           (searchTerms.length > 0 && searchTerms.every(term => p.descricao.toLowerCase().includes(term)));
  });

  const handleLinkBarcode = async () => {
    if (!selectedProduct || !newCode) return;
    setErrorMsg(null);
    
    if (newCode.length < 8) {
      setErrorMsg('O código de barras deve ter pelo menos 8 dígitos.');
      return;
    }

    let productIdExistente: number | null = null;
    for (const [id, codigos] of Object.entries(barcodesMap)) {
      if ((codigos as { code: string; date: string }[]).some(c => c.code === newCode)) {
        productIdExistente = Number(id);
        break;
      }
    }

    if (productIdExistente !== null) {
      const produtoRelacionado = produtos.find(p => p.id_produto === productIdExistente);
      const nomeProduto = produtoRelacionado ? produtoRelacionado.descricao : `#${productIdExistente}`;
      setErrorMsg(`O código ${newCode} já está vinculado ao produto: ${nomeProduto}`);
      return;
    }

    const newEntry = {
      code: newCode,
      date: new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Cuiaba' })
    };

    await api.addBarcode(selectedProduct.id_produto, newCode);

    setBarcodesMap(prev => ({
      ...prev,
      [selectedProduct.id_produto]: [...(prev[selectedProduct.id_produto] || []), newEntry]
    }));

    setNewCode('');
    setIsAdding(false);
  };

  const handleDeleteBarcode = async (productId: number, codeToDelete: string) => {
    await api.deleteBarcode(productId, codeToDelete);
    
    setBarcodesMap(prev => {
      const currentList = prev[productId] || [];
      return {
        ...prev,
        [productId]: currentList.filter(item => item.code !== codeToDelete)
      };
    });
    setConfirmingDelete(null);
  };

  const currentBarcodes = selectedProduct ? (barcodesMap[selectedProduct.id_produto] || []) : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tight">Códigos de Barras</h1>
          <p className="text-on-surface-variant font-medium">Gestão de identificadores únicos por produto</p>
        </div>
        <button 
          disabled={!selectedProduct}
          onClick={() => setIsAdding(true)}
          className="bg-primary-container text-white px-6 py-2.5 rounded-lg font-bold flex items-center hover:opacity-90 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Plus className="w-5 h-5 mr-2" />
          Vincular Código
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Product List */}
        <div className="lg:col-span-5 bg-white border border-outline-variant rounded-2xl shadow-sm overflow-hidden flex flex-col h-[600px]">
          <div className="p-4 border-b border-outline-variant bg-surface-container-low/30">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
              <input 
                type="text" 
                placeholder="Pesquisar produto..." 
                className="w-full bg-white border border-outline-variant rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredProdutos.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center h-full text-on-surface-variant">
                {search.length < 3 
                  ? "Digite pelo menos 3 caracteres para buscar produtos."
                  : "Nenhum produto encontrado para a pesquisa."
                }
              </div>
            ) : (
              filteredProdutos.map((p) => (
              <button 
                key={p.id_produto}
                onClick={() => setSelectedProduct(p)}
                className={cn(
                  "w-full flex items-center justify-between p-4 border-b border-outline-variant/10 text-left hover:bg-surface-container-low transition-all",
                  selectedProduct?.id_produto === p.id_produto && "bg-surface-container-low border-r-4 border-primary shadow-inner"
                )}
              >
                <div>
                  <p className="text-[10px] font-black text-primary mb-0.5">ID: #{p.id_produto}</p>
                  <p className="text-sm font-bold text-on-surface">{p.descricao}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold bg-surface-container-highest px-2 py-0.5 rounded text-on-surface-variant">
                    {barcodesMap[p.id_produto]?.length || 0}
                  </span>
                  <ChevronRight className={cn("w-4 h-4 text-on-surface-variant transition-transform", selectedProduct?.id_produto === p.id_produto && "translate-x-1 text-primary")} />
                </div>
              </button>
            )))}
          </div>
        </div>

        {/* Right: Barcode Detail */}
        <div className="lg:col-span-7">
          {!selectedProduct ? (
            <div className="flex flex-col items-center justify-center h-[600px] bg-white border-2 border-dashed border-outline-variant rounded-2xl p-10 text-center opacity-60">
              <div className="w-20 h-20 bg-surface-container-high rounded-full flex items-center justify-center mb-6">
                <Barcode className="w-10 h-10 text-primary opacity-40" />
              </div>
              <h3 className="text-lg font-black text-on-surface">Nenhum produto selecionado</h3>
              <p className="max-w-xs text-sm mt-2">Escolha na lista à esquerda para gerenciar os códigos de barras deste item.</p>
            </div>
          ) : (
            <motion.div 
              key={selectedProduct.id_produto}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white border border-outline-variant rounded-2xl shadow-sm overflow-hidden h-[600px] flex flex-col"
            >
              <div className="p-6 border-b border-outline-variant bg-surface-container-low/20 flex justify-between items-center">
                <div>
                  <p className="text-xs font-black text-primary uppercase tracking-widest mb-1">PRODUTO SELECIONADO</p>
                  <h3 className="text-2xl font-black text-on-surface">{selectedProduct.descricao}</h3>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {errorMsg && (
                    <motion.p 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-[10px] bg-error-container text-error px-2 py-1 rounded font-bold border border-error/10 max-w-[300px]"
                    >
                      {errorMsg}
                    </motion.p>
                  )}
                  {isAdding ? (
                    <div className="flex items-center gap-2 animate-in slide-in-from-right-4">
                      <input 
                        autoFocus
                        type="text"
                        maxLength={13}
                        placeholder="Novo Código..."
                        className="bg-white border border-primary px-3 py-1.5 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none w-48 font-mono"
                        value={newCode}
                        onChange={e => {
                          setErrorMsg(null);
                          const val = e.target.value.replace(/\D/g, '').slice(0, 13);
                          setNewCode(val);
                        }}
                        onKeyDown={e => e.key === 'Enter' && handleLinkBarcode()}
                      />
                      <button 
                        onClick={handleLinkBarcode}
                        className="bg-primary text-white p-2 rounded-lg hover:opacity-90"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          setIsAdding(false);
                          setErrorMsg(null);
                        }}
                        className="text-on-surface-variant p-2 hover:text-error"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setIsAdding(true)}
                      className="text-primary font-bold text-sm flex items-center gap-1 hover:underline"
                    >
                      <Plus className="w-4 h-4" /> Adicionar Código
                    </button>
                  )}
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest border-b border-outline-variant">
                      <th className="pb-4">Código (EAN / GTIN)</th>
                      <th className="pb-4">Data Vínculo</th>
                      <th className="pb-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {currentBarcodes.length > 0 ? (
                      currentBarcodes.map((row) => (
                        <tr key={row.code} className="group">
                          <td className="py-4 font-mono text-base font-bold text-primary">{row.code}</td>
                          <td className="py-4 text-sm text-on-surface-variant/80">{row.date}</td>
                          <td className="py-4 text-right">
                            {confirmingDelete === row.code ? (
                              <div className="flex items-center justify-end gap-2 animate-in fade-in zoom-in-95 duration-200">
                                <span className="text-[10px] font-black text-error uppercase">Excluir?</span>
                                <button 
                                  onClick={() => handleDeleteBarcode(selectedProduct.id_produto, row.code)}
                                  className="bg-red-600 text-white px-3 py-1 rounded text-[10px] font-black hover:bg-red-700 shadow-sm active:scale-95 transition-all"
                                >
                                  SIM
                                </button>
                                <button 
                                  onClick={() => setConfirmingDelete(null)}
                                  className="text-on-surface-variant px-2 py-1 rounded text-[10px] font-bold hover:bg-surface-container-high"
                                >
                                  Não
                                </button>
                              </div>
                            ) : (
                              <button 
                                type="button"
                                onClick={() => setConfirmingDelete(row.code)}
                                className="p-2 text-on-surface-variant hover:text-error hover:bg-error-container/20 rounded-lg transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="py-12 text-center text-sm text-on-surface-variant italic opacity-50">
                          Nenhum código vinculado a este produto.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="p-6 bg-surface-container-low/40 border-t border-outline-variant">
                <div className="flex items-start gap-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
                  <Info className="w-5 h-5 text-primary mt-0.5" />
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    <strong>Atenção:</strong> A remoção de um código de barras invalida imediatamente o scan deste identificador para este produto em novas movimentações.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
