import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Produto } from '../types';
import { Search, Plus, Edit2, Filter, Download } from 'lucide-react';
import { cn, formatCurrency } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { ProdutoForm } from '../components/Forms/ProdutoForm';

export function Produtos() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);
  const [hasFiltered, setHasFiltered] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleFilter = async () => {
    if (searchInput.trim().length < 3) {
      alert("Por favor, digite no mínimo 3 caracteres para realizar a pesquisa.");
      return;
    }
    setLoading(true);
    try {
      const data = await api.getProdutos(searchInput);
      setProdutos(data || []);
      setSearch(searchInput);
      setHasFiltered(true);
    } catch (error) {
      console.error("Erro ao buscar produtos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedProduto(null);
    setIsFormOpen(true);
  };

  const handleEdit = (produto: Produto) => {
    setSelectedProduto(produto);
    setIsFormOpen(true);
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Descricao', 'Unidade', 'Preco'];
    const rows = produtos.map(p => [p.id_produto, p.descricao, p.unidade, p.preco]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "produtos_almoxarifado.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredProdutos = produtos.filter(p => {
    if (!search) return true;
    const searchTerms = search.toLowerCase().split(' ').filter(t => t.length > 0);
    return p.id_produto.toString().includes(search) ||
           (searchTerms.length > 0 && searchTerms.every(term => p.descricao.toLowerCase().includes(term)));
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-primary tracking-tight">Produtos</h2>
          <nav className="flex text-on-surface-variant font-medium text-xs gap-2 mt-1">
            <span>Almoxarifado</span>
            <span>/</span>
            <span className="text-primary font-bold">Gerenciar Produtos</span>
          </nav>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={handleExportCSV}
            className="px-4 py-2 border border-outline-variant bg-white text-on-surface-variant font-bold text-xs rounded-lg flex items-center hover:bg-surface-container-low transition-all"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </button>
          <button 
            onClick={handleCreate}
            className="bg-primary text-white px-6 py-2.5 rounded-lg font-bold flex items-center hover:opacity-90 active:scale-95 transition-all"
          >
            <Plus className="w-5 h-5 mr-2" />
            Novo Produto
          </button>
        </div>
      </header>

      {/* Stats Summary Area */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Itens', value: '1.248', icon: 'inventory' },
          { label: 'Categorias', value: '24', icon: 'category' },
          { label: 'Estoque Baixo', value: '12', icon: 'warning', color: 'text-error' },
          { label: 'Valor Total', value: 'R$ 45k', icon: 'payments' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-outline-variant p-4 rounded-xl shadow-sm flex items-center gap-4">
            <div className={cn("p-2 rounded-lg bg-surface-container-highest", stat.color || "text-primary")}>
              {/* Using simple circles/placeholders as specific Material Symbols aren't in Lucide perfectly */}
              <div className="w-5 h-5 bg-current opacity-20 rounded-full" /> 
            </div>
            <div>
              <p className="text-xs font-medium text-on-surface-variant">{stat.label}</p>
              <p className={cn("text-xl font-black", stat.color || "text-on-surface")}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-outline-variant bg-surface-container-low/30 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
          <div className="flex flex-col sm:flex-row gap-2 max-w-xl w-full">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
              <input 
                type="text" 
                placeholder="Buscar por descrição ou ID..."
                className="w-full bg-white border border-outline-variant rounded-lg pl-10 pr-4 py-2 h-10 text-sm focus:ring-1 focus:ring-primary outline-none"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleFilter();
                  }
                }}
              />
            </div>
            <button 
              onClick={handleFilter}
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white h-10 px-6 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors active:scale-95 shadow-sm border border-emerald-700/15 shrink-0"
            >
              <Filter className="w-4 h-4" />
              Filtrar
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse zebra-table">
            <thead>
              <tr className="bg-surface-container-low/50 text-on-surface-variant text-[11px] font-bold uppercase tracking-widest">
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Produto</th>
                <th className="px-4 py-4">Und</th>
                <th className="px-6 py-4">Categoria</th>
                <th className="px-6 py-4">Preço</th>
                <th className="px-6 py-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-outline-variant text-on-surface">
              {loading ? (
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
                  <td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant font-medium">
                    Digite pelo menos 3 caracteres no campo acima e clique em "Filtrar" para buscar e exibir os registros.
                  </td>
                </tr>
              ) : filteredProdutos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant font-medium">
                    Nenhum produto encontrado para a pesquisa realizada.
                  </td>
                </tr>
              ) : (
                filteredProdutos.map((p, i) => (
                  <motion.tr 
                    key={p.id_produto}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="hover:bg-surface-container-low/30 transition-colors"
                  >
                    <td className="px-6 py-4 font-black text-primary">#{p.id_produto}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold">{p.descricao}</span>
                        <span className="text-[10px] text-on-surface-variant font-mono opacity-60">EAN: 7891020304051</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="px-2 py-0.5 bg-surface-container text-on-surface-variant rounded text-[10px] font-black uppercase">
                        {p.unidade}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-on-surface-variant">{p.categoria?.descricao}</td>
                    <td className="px-6 py-4 font-bold">{formatCurrency(p.preco)}</td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleEdit(p)}
                        className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
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
          <ProdutoForm 
            onClose={() => {
              setIsFormOpen(false);
              setSelectedProduto(null);
            }} 
            initialData={selectedProduto}
            onSave={async (produtoData) => {
              try {
                const isEditing = !!selectedProduto;
                const savedProduto = await api.saveProduto(produtoData);
                
                if (isEditing) {
                  setProdutos(prev => prev.map(p => 
                    p.id_produto === savedProduto.id_produto ? savedProduto : p
                  ));
                } else {
                  setProdutos(prev => [savedProduto, ...prev]);
                  setHasFiltered(true); // Garante que o usuário veja a lista se não tinha buscado nada
                }
              } catch (err) {
                 console.error('Erro ao salvar produto:', err);
                 alert('Não foi possível salvar o produto.');
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
