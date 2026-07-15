import { Movimentacao } from '../types';
import { formatDate } from '../lib/utils';

interface MovimentacaoPrintProps {
  movimentacao: Movimentacao;
  logoDataUrl?: string;
}

export function MovimentacaoPrint({ movimentacao, logoDataUrl }: MovimentacaoPrintProps) {
  const { pessoa, itens = [] } = movimentacao;
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR', { timeZone: 'America/Cuiaba' });
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Cuiaba' });

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

      {/* Primary Status Info */}
      <table className="w-full border border-black mb-6 border-collapse">
        <tbody>
          <tr>
            <td className="w-1/4 p-2 border border-black align-top">
              <p className="text-[10px] font-normal text-gray-600 uppercase mb-0">MOVIMENTAÇÃO</p>
              <p className="text-[14px] m-0 uppercase">{movimentacao.entrada_saida}</p>
            </td>
            <td className="w-1/4 p-2 border border-black align-top">
              <p className="text-[10px] font-normal text-gray-600 uppercase mb-0">STATUS</p>
              <p className="text-[14px] m-0 uppercase text-[#196B24] font-bold">{movimentacao.status}</p>
            </td>
            <td className="w-1/4 p-2 border border-black align-top">
              <p className="text-[10px] font-normal text-gray-600 uppercase mb-0">DOCUMENTO REF.</p>
              <p className="text-[14px] m-0">{movimentacao.doc_entrada || '---'}</p>
            </td>
            <td className="w-1/4 p-2 border border-black align-top">
              <p className="text-[10px] font-normal text-gray-600 uppercase mb-0">Nº OPERAÇÃO</p>
              <p className="text-[14px] m-0">{movimentacao.id_movimentacao}</p>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Type Info */}
      <table className="w-full mb-8 border-none">
        <tbody>
          <tr>
            <td className="align-top">
               <span className="text-[12px] text-gray-600 uppercase">FINALIDADE: </span>
               <span className="text-[14px] uppercase text-black">{movimentacao.tipo_movimentaca || '---'}</span>
            </td>
            <td className="text-right align-top w-[40%]">
               <span className="text-[12px] text-gray-600 uppercase">LANÇAMENTO DE DADOS: </span>
               <span className="text-[14px] uppercase text-black">{formatDate(movimentacao.datahora)}</span>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Entity Section */}
      <div className="mb-8">
        <div className="border-b border-black mb-2 flex">
           <div className="w-[14px] h-[16px] bg-[#196B24] mr-2 self-end mb-1"></div>
           <h2 className="text-[14px] font-bold uppercase text-black m-0 mb-1 leading-none self-end">DADOS DO DESTINATÁRIO / ORIGEM</h2>
        </div>
        
        <table className="w-full border-none border-spacing-y-2 mt-4" style={{borderSpacing: "0 8px", borderCollapse: "separate"}}>
          <tbody>
            <tr>
              <td className="w-[60%] align-top">
                <p className="text-[10px] font-normal text-gray-500 uppercase m-0 leading-tight">NOME / RAZÃO SOCIAL</p>
                <p className="text-[13px] text-black uppercase m-0 leading-tight">{pessoa?.nome}</p>
              </td>
              <td className="align-top">
                <p className="text-[10px] font-normal text-gray-500 uppercase m-0 leading-tight">CPF / CNPJ</p>
                <p className="text-[13px] text-black m-0 leading-tight">{pessoa?.cpf_cnpj || '---'}</p>
              </td>
            </tr>
            <tr>
              <td className="align-top">
                <p className="text-[10px] font-normal text-gray-500 uppercase m-0 leading-tight">ENDEREÇO COMPLETO</p>
                <p className="text-[13px] text-black capitalize m-0 leading-tight">
                  {pessoa?.endereco?.toLowerCase()}{pessoa?.numero ? `, ${pessoa.numero}` : ''}
                </p>
              </td>
              <td className="align-top">
                <div className="flex w-full">
                  <div className="w-[60%]">
                    <p className="text-[10px] font-normal text-gray-500 uppercase m-0 leading-tight">BAIRRO</p>
                    <p className="text-[13px] text-black capitalize m-0 leading-tight">{pessoa?.bairro?.toLowerCase() || '---'}</p>
                  </div>
                  <div className="w-[40%]">
                    <p className="text-[10px] font-normal text-gray-500 uppercase m-0 leading-tight">CEP</p>
                    <p className="text-[13px] text-black m-0 leading-tight">{pessoa?.cep || '---'}</p>
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td className="align-top">
                <p className="text-[10px] font-normal text-gray-500 uppercase m-0 leading-tight">CIDADE - UF</p>
                <p className="text-[13px] text-black capitalize m-0 leading-tight">
                  {pessoa?.cidade ? `${pessoa.cidade.toLowerCase()} - ${pessoa?.uf}` : '---'}
                </p>
              </td>
              <td className="align-top">
                <p className="text-[10px] font-normal text-gray-500 uppercase m-0 leading-tight">OBSERVAÇÕES</p>
                <p className="text-[13px] text-black m-0 leading-tight">Sem nenhuma</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Items Section */}
      <div className="mb-20">
        <table className="w-full border-collapse border border-black">
          <thead>
            <tr className="bg-[#BFBFBF]">
              <th className="py-2 px-2 text-left w-auto border-none">
                 <span className="text-[12px] font-bold text-black uppercase">PRODUTO / ESPECIFICAÇÕES</span>
              </th>
              <th className="py-2 px-2 text-center w-32 border-none">
                 <span className="text-[12px] font-bold text-black uppercase">VENCIMENTO</span>
              </th>
              <th className="py-2 px-2 text-center w-16 border-none">
                 <span className="text-[12px] font-bold text-black uppercase">QTD</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y-0">
            {itens.map((item, i) => (
              <tr key={i}>
                <td className="py-1 px-2 border-none">
                  <div className="text-[13px] font-[500] text-black uppercase" style={{fontFamily: "'Aptos Narrow', sans-serif"}}>
                    {item.produto?.descricao}
                    {item.ca_epi && (
                      <span className="ml-2 text-[10px] text-gray-500 font-bold uppercase">
                        (C.A.: {item.ca_epi})
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-1 px-2 text-center text-[13px] font-[500] text-black border-none" style={{fontFamily: "'Aptos Narrow', sans-serif"}}>
                  {item.vencimento ? item.vencimento.split('-').reverse().join('/') : '---'}
                </td>
                <td className="py-1 px-2 text-center text-[13px] font-[500] text-black border-none" style={{fontFamily: "'Aptos Narrow', sans-serif"}}>
                  {item.quantidade}
                </td>
              </tr>
            ))}
            {itens.length === 0 && (
              <tr>
                <td colSpan={3} className="py-4 text-center text-gray-500 text-[12px] border-none">
                  Nenhum item registrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer / Signature */}
      <div className="mt-24 pt-8">
        <div className="flex flex-col items-center mb-16">
          <div className="w-[300px] border-t border-black mb-1"></div>
          <p className="text-[12px] font-normal text-[#595959] uppercase m-0">ASSINATURA DO RECEBEDOR</p>
        </div>

        <div className="mt-16 text-left">
            <p className="text-[10px] m-0 font-normal text-[#A6A6A6] uppercase tracking-wide">A VIA DO ALMOXARIFADO DEVE SER ARQUIVADA PARA AUDITORIA</p>
        </div>
      </div>
    </div>
  );
}
