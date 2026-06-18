import { Estoque } from '../types';
import { differenceInDays, parseISO } from 'date-fns';

interface filterDetails {
   search: string;
   categoria: string;
   vencimentoInicio: string;
   vencimentoFim: string;
}

interface totais {
   totalEmEstoque: number;
   itensVencidos: number;
   vencimento30Dias: number;
   valorEstimado: number;
}

interface EstoquePrintProps {
  estoqueList: Estoque[];
  logoDataUrl?: string;
  filterDetails: filterDetails;
  totais: totais;
}

export function EstoquePrint({ estoqueList, logoDataUrl, filterDetails, totais }: EstoquePrintProps) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR', { timeZone: 'America/Cuiaba' });
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Cuiaba' });

  const getStatusInfo = (vencimento: string) => {
    const days = differenceInDays(parseISO(vencimento), now);
    if (days < 0) return { label: 'Vencido' };
    if (days <= 30) return { label: 'Vence < 30 dias' };
    return { label: 'Regular' };
  };

  const hasFiltros = filterDetails.search || filterDetails.categoria !== 'Todas' || filterDetails.vencimentoInicio || filterDetails.vencimentoFim;

  return (
    <div className="bg-white p-12 text-black font-sans text-[12px] leading-relaxed w-full min-h-[297mm]">
      {/* Header Section */}
      <table className="w-full mb-6 border-none">
        <tbody>
          <tr>
            <td className="w-[15%] align-top">
              {logoDataUrl ? (
                <img src={logoDataUrl} alt="Logo" className="w-[75px] h-[75px] object-contain" />
              ) : (
                <svg viewBox="0 0 100 100" className="w-[75px] h-[75px]">
                  <path d="M25,85 C15,85 15,70 15,60 C15,55 10,55 8,53 C5,50 47,12 50,10 C53,12 95,50 92,53 C90,55 85,55 85,60 C85,70 85,85 75,85" fill="none" stroke="#68A054" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M50,75 C25,55 25,30 38,30 C45,30 50,45 50,45 C50,45 55,30 62,30 C75,30 75,55 50,75" fill="none" stroke="#12253A" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </td>
            <td className="align-top">
              <h1 className="text-2xl font-bold tracking-tight m-0 leading-none">
                ALMOXARIFE<span className="text-[#196B24]">CONTROL</span> 2.0
              </h1>
              <p className="text-[10px] text-gray-600 mt-1 uppercase tracking-wide m-0">
                Gestão Inteligente de Estoque e Patrimônio
              </p>
            </td>
            <td className="text-right align-top">
              <p className="text-[11px] font-bold text-gray-600 uppercase m-0 leading-tight">DOCUMENTO EMITIDO EM</p>
              <p className="text-sm font-bold text-gray-700 m-0 leading-tight">
                {dateStr} ÀS {timeStr}
              </p>
              <p className="text-[11px] font-bold text-gray-600 m-0 leading-tight">Cuiabá / MT</p>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Info Totais (only if > 0) */}
      <div className="mb-4 flex flex-wrap gap-4 border border-black p-3 bg-gray-50 uppercase text-[11px] font-bold text-black">
        {totais.totalEmEstoque > 0 && <div>Total em Estoque: <span className="text-[#196B24] ml-1">{totais.totalEmEstoque.toLocaleString('pt-BR')}</span></div>}
        {totais.itensVencidos > 0 && <div className="text-red-700 font-bold">Itens Vencidos: <span className="ml-1">{totais.itensVencidos}</span></div>}
        {totais.vencimento30Dias > 0 && <div className="text-orange-600 font-bold">Vencimento &lt; 30 Dias: <span className="ml-1">{totais.vencimento30Dias}</span></div>}
        {totais.valorEstimado > 0 && <div>Valor Estimado: <span className="ml-1">{totais.valorEstimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>}
      </div>

      {hasFiltros && (
        <div className="mb-6 border border-black px-3 py-2 text-[11px]">
           <span className="font-bold uppercase text-black mr-2">Filtros Aplicados:</span>
           {filterDetails.search && <span className="mr-3 text-black">Produto: <span className="font-bold">{filterDetails.search}</span></span>}
           {filterDetails.categoria !== 'Todas' && <span className="mr-3 text-black">Categoria: <span className="font-bold">{filterDetails.categoria}</span></span>}
           {filterDetails.vencimentoInicio && <span className="mr-3 text-black">Venc. Inicial: <span className="font-bold">{filterDetails.vencimentoInicio.split('-').reverse().join('/')}</span></span>}
           {filterDetails.vencimentoFim && <span className="mr-3 text-black">Venc. Final: <span className="font-bold">{filterDetails.vencimentoFim.split('-').reverse().join('/')}</span></span>}
        </div>
      )}

      {/* Report Info */}
      <div className="mb-4 border-b border-black pb-2 flex items-end">
        <div className="w-[14px] h-[16px] bg-[#196B24] mr-2"></div>
        <h2 className="text-[16px] font-bold uppercase text-black m-0 leading-none">RELATÓRIO DE ESTOQUE ATUAL</h2>
        <span className="ml-auto text-[11px] font-normal text-gray-500 uppercase leading-none">Total de Registros: {estoqueList.length}</span>
      </div>

      {/* Items Section */}
      <div className="mb-20">
        <table className="w-full border-collapse border border-black text-left">
          <thead>
            <tr className="bg-[#BFBFBF]">
              <th className="py-2 px-2 border-none">
                 <span className="text-[12px] font-bold text-black uppercase">CÓD.</span>
              </th>
              <th className="py-2 px-2 border-none">
                 <span className="text-[12px] font-bold text-black uppercase">PRODUTO / ESPECIFICAÇÕES</span>
              </th>
              <th className="py-2 px-2 border-none">
                 <span className="text-[12px] font-bold text-black uppercase">CATEGORIA</span>
              </th>
              <th className="py-2 px-2 text-center border-none">
                 <span className="text-[12px] font-bold text-black uppercase">UN.</span>
              </th>
              <th className="py-2 px-2 text-center border-none">
                 <span className="text-[12px] font-bold text-black uppercase">VENCIMENTO</span>
              </th>
              <th className="py-2 px-2 text-right border-none">
                 <span className="text-[12px] font-bold text-black uppercase">QTD</span>
              </th>
              <th className="py-2 px-2 text-center border-none">
                 <span className="text-[12px] font-bold text-black uppercase">STATUS</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y-0">
            {estoqueList.map((item, i) => (
              <tr key={item.id_estoque} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="py-1 px-2 border-none text-[12px] font-normal">
                  {item.id_produto}
                </td>
                <td className="py-1 px-2 border-none text-[12px] font-bold uppercase">
                  {item.produto?.descricao}
                </td>
                <td className="py-1 px-2 border-none text-[12px] font-normal uppercase">
                  {item.produto?.categoria?.descricao || '---'}
                </td>
                <td className="py-1 px-2 border-none text-[12px] font-normal uppercase text-center">
                  {item.produto?.unidade}
                </td>
                <td className="py-1 px-2 text-center border-none text-[12px] font-normal">
                  {item.vencimento ? item.vencimento.split('-').reverse().join('/') : '---'}
                </td>
                <td className="py-1 px-2 text-right border-none text-[12px] font-bold text-[#196B24]">
                  {item.qtd_estoque}
                </td>
                <td className="py-1 px-2 text-center border-none text-[12px] font-normal uppercase">
                  {getStatusInfo(item.vencimento).label}
                </td>
              </tr>
            ))}
            {estoqueList.length === 0 && (
              <tr>
                <td colSpan={7} className="py-4 text-center text-gray-500 text-[12px] border-none">
                  Nenhum item encontrado no estoque com os filtros selecionados.
                </td>
              </tr>
            )}
            
            {/* Totals Row */}
            {estoqueList.length > 0 && (
              <tr className="bg-[#E6E6E6] border-t border-black">
                <td colSpan={5} className="py-2 px-2 text-right text-[12px] font-bold uppercase text-black">
                  TOTAL GERAL EM ESTOQUE:
                </td>
                <td className="py-2 px-2 text-right text-[12px] font-bold text-black">
                  {estoqueList.reduce((acc, curr) => acc + curr.qtd_estoque, 0)}
                </td>
                <td className="py-2 px-2"></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer / Signature */}
      <div className="mt-16 text-left">
          <p className="text-[10px] m-0 font-normal text-[#A6A6A6] uppercase tracking-wide border-t border-[#A6A6A6] pt-1">ALMOXARIFECONTROL - SEU SISTEMA DE CONFIANÇA</p>
      </div>
    </div>
  );
}
