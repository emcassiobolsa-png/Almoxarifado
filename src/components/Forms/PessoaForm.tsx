import React, { useState } from 'react';
import { TipoPessoa, Pessoa } from '../../types';
import { X, Save, UserPlus } from 'lucide-react';
import { motion } from 'motion/react';
import { cn, maskCPFCNPJ, maskPhone } from '@/src/lib/utils';

interface PessoaFormProps {
  onClose: () => void;
  onSave?: (pessoa: any) => void;
  initialData?: Pessoa | null;
}

export function PessoaForm({ onClose, onSave, initialData }: PessoaFormProps) {
  const [formData, setFormData] = useState({
    id_pessoas: initialData?.id_pessoas || undefined,
    tipo_pessoa: initialData?.tipo_pessoa || 'FORNECEDOR' as TipoPessoa,
    nome: initialData?.nome || '',
    cpf_cnpj: initialData?.cpf_cnpj || '',
    endereco: initialData?.endereco || '',
    numero: initialData?.numero || '',
    complemento: initialData?.complemento || '',
    cidade: initialData?.cidade || 'Cuiabá',
    uf: initialData?.uf || 'MT',
    cep: initialData?.cep || '',
    bairro: initialData?.bairro || '',
    telefone: initialData?.telefone || '',
    contato: initialData?.contato || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.tipo_pessoa) {
      alert('Nome e Tipo são obrigatórios');
      return;
    }
    onSave?.(formData);
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
              {initialData ? 'Editar Pessoa' : 'Cadastro de Pessoa'}
            </h3>
            <p className="text-xs text-on-surface-variant font-medium mt-1">
              {initialData ? 'Altere os dados cadastrais abaixo.' : 'Insira os dados do novo parceiro ou colaborador.'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:text-error transition-colors">
            <X className="w-6 h-6" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest opacity-60">Tipo de Pessoa *</label>
              <select 
                className="w-full bg-surface-container-low/50 border border-outline-variant rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                value={formData.tipo_pessoa}
                onChange={e => setFormData({ ...formData, tipo_pessoa: e.target.value as TipoPessoa })}
              >
                <option value="FORNECEDOR">Fornecedor</option>
                <option value="CLIENTE">Cliente</option>
                <option value="COLABORADOR">Colaborador</option>
                <option value="DOADOR">Doador</option>
                <option value="OUTROS">Outros</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest opacity-60">CPF / CNPJ</label>
              <input 
                type="text"
                className="w-full bg-surface-container-low/50 border border-outline-variant rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                placeholder="000.000.000-00"
                value={formData.cpf_cnpj}
                onChange={e => setFormData({ ...formData, cpf_cnpj: maskCPFCNPJ(e.target.value) })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest opacity-60">Nome Completo / Razão Social *</label>
            <input 
              type="text"
              required
              className="w-full bg-surface-container-low/50 border border-outline-variant rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-primary font-bold"
              placeholder="Digite o nome completo"
              value={formData.nome}
              onChange={e => setFormData({ ...formData, nome: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-1.5">
              <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest opacity-60">Endereço</label>
              <input 
                type="text"
                className="w-full bg-surface-container-low/50 border border-outline-variant rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                placeholder="Rua, Avenida..."
                value={formData.endereco}
                onChange={e => setFormData({ ...formData, endereco: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest opacity-60">Número</label>
              <input 
                type="text"
                className="w-full bg-surface-container-low/50 border border-outline-variant rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                placeholder="S/N"
                value={formData.numero}
                onChange={e => setFormData({ ...formData, numero: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest opacity-60">Cidade</label>
              <input 
                type="text"
                className="w-full bg-surface-container-low/50 border border-outline-variant rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                value={formData.cidade}
                onChange={e => setFormData({ ...formData, cidade: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest opacity-60">Estado (UF)</label>
              <input 
                type="text"
                maxLength={2}
                className="w-full bg-surface-container-low/50 border border-outline-variant rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                value={formData.uf}
                onChange={e => setFormData({ ...formData, uf: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest opacity-60">Telefone</label>
              <input 
                type="tel"
                className="w-full bg-surface-container-low/50 border border-outline-variant rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                placeholder="(65) 00000-0000"
                value={formData.telefone}
                onChange={e => setFormData({ ...formData, telefone: maskPhone(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest opacity-60">Contato Responsável</label>
              <input 
                type="text"
                className="w-full bg-surface-container-low/50 border border-outline-variant rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                placeholder="Nome da pessoa"
                value={formData.contato}
                onChange={e => setFormData({ ...formData, contato: e.target.value })}
              />
            </div>
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
            Salvar Cadastro
          </button>
        </footer>
      </motion.div>
    </motion.div>
  );
}
