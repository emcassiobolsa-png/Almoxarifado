export type TipoPessoa = 'FORNECEDOR' | 'CLIENTE' | 'COLABORADOR' | 'DOADOR' | 'OUTROS';
export type TipoMovimentacao = 
  | 'BALANÇO' 
  | 'CESSÃO DE DOAÇÃO' 
  | 'COMPRA DE FORNECEDOR' 
  | 'CONSUMO' 
  | 'DEVOLUÇÃO DE CONSUMO' 
  | 'ENTRADA DE BAZAR' 
  | 'ESTOQUE INICIAL' 
  | 'PRODUTOS AVARIADOS' 
  | 'RECEBIMENTO DE DOAÇÃO' 
  | 'SAÍDA PARA BAZAR' 
  | 'SAÍDA PARA PERMUTA';

export type StatusMovimentacao = 'DIGITANDO' | 'PROCESSADO' | 'CANCELADO' | 'ESTORNADO';

export interface Categoria {
  id_categoria: number;
  descricao: string;
}

export interface Produto {
  id_produto: number;
  descricao: string;
  unidade: string;
  id_categoria: number;
  preco: number;
  data_balanco?: string;
  categoria?: Categoria;
}

export interface CodBarras {
  cod_barras: string;
  id_produto: number;
}

export interface Pessoa {
  id_pessoas: number;
  tipo_pessoa: TipoPessoa;
  cpf_cnpj?: string;
  nome: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  bairro?: string;
  telefone?: string;
  contato?: string;
}

export interface Movimentacao {
  id_movimentacao: number;
  tipo_movimentaca: TipoMovimentacao;
  id_pessoas: number;
  datahora: string;
  entrada_saida: 'ENTRADA' | 'SAÍDA';
  doc_entrada?: string;
  status: StatusMovimentacao;
  justificativaessa?: string;
  pessoa?: Pessoa;
  itens?: MovimentacaoDetalhe[];
}

export interface Estoque {
  id_estoque: number;
  id_produto: number;
  vencimento: string;
  qtd_estoque: number;
  produto?: Produto;
}

export interface MovimentacaoDetalhe {
  id_mov_detalhe: number;
  id_movimentacao: number;
  id_produto: number;
  quantidade: number;
  vencimento: string;
  produto?: Produto;
}
