import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Pessoa } from '../types';
import { Search, Plus, Edit2, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { PessoaForm } from '../components/Forms/PessoaForm';

export function Pessoas() {
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPessoa, setSelectedPessoa] = useState<Pessoa | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSearch = async () => {
    if (searchInput.trim().length < 3) {
      alert("Por favor, digite no mínimo 3 caracteres para realizar a pesquisa.");
      return;
    }
    try {
      const data = await api.getPessoas(searchInput.trim());
      setPessoas(data || []);
      setHasSearched(true);
      setErrorMsg(null);
    } catch (error: any) {
      console.error("Erro ao buscar pessoas:", error);
      setErrorMsg(error.message || JSON.stringify(error));
    }
  };

  const handleEdit = (pessoa: Pessoa) => {
    setSelectedPessoa(pessoa);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setSelectedPessoa(null);
    setIsFormOpen(true);
  };

  const filteredPessoas = hasSearched 
    ? pessoas.filter(p => {
        const searchTerm = searchInput.toLowerCase();
        const searchDigits = searchInput.replace(/\D/g, '');
        
        const nomeMatch = (p.nome || '').toLowerCase().includes(searchTerm);
        const idMatch = (p.id_pessoas?.toString() || '').includes(searchTerm);
        
        const cpfCnpjValue = p.cpf_cnpj || '';
        const cpfCnpjDigits = cpfCnpjValue.replace(/\D/g, '');
        
        const cpfCnpjMatch = 
          cpfCnpjValue.toLowerCase().includes(searchTerm) || 
          (searchDigits !== '' && cpfCnpjDigits.includes(searchDigits));
          
        return nomeMatch || idMatch || cpfCnpjMatch;
      })
    : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-primary tracking-tight">Pessoas</h2>
          <p className="text-on-surface-variant">Gerenciamento de fornecedores, clientes e colaboradores.</p>
        </div>
        <button 
          onClick={handleCreate}
          className="bg-primary text-white px-6 py-2.5 rounded-lg font-bold flex items-center hover:opacity-90 active:scale-95 transition-all self-start"
        >
          <Plus className="w-5 h-5 mr-2" />
          Inserir Nova Pessoa
        </button>
      </header>

      {errorMsg && (
        <div className="p-4 mb-6 bg-red-100 text-red-800 rounded-xl border border-red-200">
          <strong>Erro do Supabase:</strong> {errorMsg}
        </div>
      )}

      <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-outline-variant bg-surface-container-low/30">
          <div className="flex flex-col sm:flex-row gap-3 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
              <input 
                type="text" 
                placeholder="Pesquisar por nome, ID, CPF/CNPJ (mín. 3 caracteres)..."
                className="w-full bg-white border border-outline-variant rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
            </div>
            <button 
              onClick={handleSearch}
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
                <th className="px-6 py-4">Nome</th>
                <th className="px-4 py-4 text-center">Tipo</th>
                <th className="px-6 py-4">Endereço</th>
                <th className="px-6 py-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-outline-variant">
              {!hasSearched ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-on-surface-variant">
                    Digite pelo menos 3 caracteres no campo acima e clique em "Filtrar" para buscar e exibir os registros.
                  </td>
                </tr>
              ) : filteredPessoas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-on-surface-variant">
                    Nenhuma pessoa localizada para a pesquisa realizada.
                  </td>
                </tr>
              ) : (
                filteredPessoas.map((p, i) => (
                  <motion.tr 
                    key={p.id_pessoas || `idx-${i}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="hover:bg-surface-container-low/30 transition-colors"
                  >
                    <td className="px-6 py-4 font-bold text-primary">#{p.id_pessoas?.toString().padStart(3, '0') || '---'}</td>
                    <td className="px-6 py-4 font-semibold">{p.nome}</td>
                    <td className="px-4 py-4 text-center">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter",
                        p.tipo_pessoa === 'FORNECEDOR' ? "bg-emerald-100 text-emerald-800" :
                        p.tipo_pessoa === 'CLIENTE' ? "bg-indigo-100 text-indigo-800" :
                        "bg-surface-container-highest text-on-surface-variant"
                      )}>
                        {p.tipo_pessoa}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant truncate max-w-[300px]">{p.endereco}</td>
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

        <div className="p-4 border-t border-outline-variant flex items-center justify-between bg-surface-container-low/10">
          <span className="text-xs text-on-surface-variant font-medium">Exibindo {filteredPessoas.length} de {pessoas.length} registros</span>
          <div className="flex space-x-2">
            <button className="p-1 border border-outline-variant rounded hover:bg-white disabled:opacity-30">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button className="px-3 py-1 bg-primary text-white rounded text-xs font-bold shadow-sm">1</button>
            <button className="p-1 border border-outline-variant rounded hover:bg-white">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isFormOpen && (
          <PessoaForm 
            onClose={() => {
              setIsFormOpen(false);
              setSelectedPessoa(null);
            }} 
            initialData={selectedPessoa}
            onSave={async (pessoaData) => {
              try {
                const updatedPessoaInput: Pessoa = {
                  ...pessoaData,
                  id_pessoas: selectedPessoa ? selectedPessoa.id_pessoas : undefined
                };
                const saved = await api.savePessoa(updatedPessoaInput);
                
                if (selectedPessoa) {
                  setPessoas(prev => prev.map(p => 
                    p.id_pessoas === selectedPessoa.id_pessoas ? saved : p
                  ));
                } else {
                  setPessoas(prev => [saved, ...prev]);
                }
              } catch (error: any) {
                console.error("Erro ao salvar cadastro de pessoa:", error);
                alert("Erro ao salvar cadastro de pessoa: " + (error.message || JSON.stringify(error)));
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
