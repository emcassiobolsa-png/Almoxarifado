import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Categoria, Produto } from '../../types';
import { X, Save, Package } from 'lucide-react';
import { motion } from 'motion/react';
import { maskCurrency, parseCurrencyToNumber } from '@/src/lib/utils';

interface ProdutoFormProps {
  onClose: () => void;
  onSave?: (produto: any) => void;
  initialData?: Produto | null;
}

export function ProdutoForm({ onClose, onSave, initialData }: ProdutoFormProps) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [formData, setFormData] = useState({
    id_produto: initialData?.id_produto || undefined,
    descricao: initialData?.descricao || '',
    id_categoria: initialData?.id_categoria || '',
    unidade: initialData?.unidade || 'UN',
    preco: maskCurrency(initialData?.preco || 0),
    cod_barras: '' // Ideally this would be in the model too if available
  });

  useEffect(() => {
    api.getCategorias().then(setCategorias);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.descricao || !formData.id_categoria) {
      alert('Descrição e Categoria são obrigatórios');
      return;
    }
    onSave?.({
      ...formData,
      preco: parseCurrencyToNumber(formData.preco)
    });
    onClose();
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm"
    >
      <div className="absolute inset-0" onClick={onClose} />
      
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col"
      >
        <header className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-low/30">
          <div>
            <h3 className="text-xl font-black text-primary tracking-tight">
              {initialData ? 'Editar Produto' : 'Novo Produto'}
            </h3>
            <p className="text-xs text-on-surface-variant font-medium mt-1">
              {initialData ? 'Altere as informações do item abaixo.' : 'Cadastre um item no catálogo do almoxarifado.'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:text-error transition-colors">
            <X className="w-6 h-6" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest opacity-60">Descrição do Produto *</label>
            <input 
              type="text"
              required
              className="w-full bg-surface-container-low/50 border border-outline-variant rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-primary font-bold"
              placeholder="Ex: Papel A4 75g"
              value={formData.descricao}
              onChange={e => setFormData({ ...formData, descricao: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest opacity-60">Categoria *</label>
              <select 
                className="w-full bg-surface-container-low/50 border border-outline-variant rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                value={formData.id_categoria}
                onChange={e => setFormData({ ...formData, id_categoria: e.target.value })}
              >
                <option value="">Selecione...</option>
                {categorias.map(c => <option key={c.id_categoria} value={c.id_categoria}>{c.descricao}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest opacity-60">Unidade de Medida</label>
              <select 
                className="w-full bg-surface-container-low/50 border border-outline-variant rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                value={formData.unidade}
                onChange={e => setFormData({ ...formData, unidade: e.target.value })}
              >
                <option value="UN">Unidade (UN)</option>
                <option value="CX">Caixa (CX)</option>
                <option value="KG">Quilo (KG)</option>
                <option value="GL">Galão (GL)</option>
                <option value="LT">Litro (LT)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest opacity-60">Preço Unitário (R$)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant/40">R$</span>
                <input 
                  type="text"
                  className="w-full bg-surface-container-low/50 border border-outline-variant rounded-lg p-2.5 pl-9 text-sm outline-none focus:ring-1 focus:ring-primary font-bold"
                  value={formData.preco}
                  onChange={e => setFormData({ ...formData, preco: maskCurrency(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest opacity-60">Código de Barras Principal</label>
              <input 
                type="text"
                className="w-full bg-surface-container-low/50 border border-outline-variant rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-primary font-mono"
                placeholder="7890000000000"
                value={formData.cod_barras}
                onChange={e => setFormData({ ...formData, cod_barras: e.target.value })}
              />
            </div>
          </div>

          <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 flex gap-3">
             <Package className="w-5 h-5 text-primary shrink-0" />
             <p className="text-[11px] text-on-surface-variant leading-tight">
               O cadastro inicial não define saldo em estoque. Para adicionar quantidades, realize uma <strong>Movimentação de Entrada</strong> ou ajuste o <strong>Balanço</strong>.
             </p>
          </div>
        </form>

        <footer className="p-6 border-t border-outline-variant bg-surface-container-low flex gap-3">
          <button 
            type="button"
            onClick={onClose} 
            className="flex-1 px-4 py-3 border border-outline-variant text-on-surface-variant font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-white transition-all"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSubmit}
            className="flex-1 px-4 py-3 bg-primary text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            Salvar Produto
          </button>
        </footer>
      </motion.div>
    </motion.div>
  );
}
