import { Pessoa, Produto, Categoria, Movimentacao, Estoque, MovimentacaoDetalhe } from '../types';
import { supabase } from '../lib/supabase';
import { getCurrentCuiabaTimestamp } from '../lib/utils';

// Mock Data
export const mockCategorias: Categoria[] = [
  { id_categoria: 1, descricao: 'Escritório' },
  { id_categoria: 2, descricao: 'Tecnologia' },
  { id_categoria: 3, descricao: 'Limpeza' },
];

export const mockProdutos: Produto[] = [
  { id_produto: 1024, descricao: 'Papel A4 - 75g (Resma)', unidade: 'UN', id_categoria: 1, preco: 24.90, categoria: mockCategorias[0] },
  { id_produto: 1025, descricao: 'Cabo HDMI 2.0 - 1.5m', unidade: 'UN', id_categoria: 2, preco: 45.00, categoria: mockCategorias[1] },
  { id_produto: 1026, descricao: 'Limpador Multiuso 5L', unidade: 'GL', id_categoria: 3, preco: 32.50, categoria: mockCategorias[2] },
];

export const mockPessoas: Pessoa[] = [
  { 
    id_pessoas: 1, 
    nome: 'Logística Pantanal Ltda', 
    tipo_pessoa: 'FORNECEDOR', 
    cpf_cnpj: '12.345.678/0001-99',
    endereco: 'Av. do CPA', 
    numero: '4500', 
    bairro: 'Centro',
    cidade: 'Cuiabá', 
    uf: 'MT',
    cep: '78000-000',
    telefone: '(65) 9999-8888'
  },
  { 
    id_pessoas: 2, 
    nome: 'José da Silva Ferreira', 
    tipo_pessoa: 'COLABORADOR', 
    cpf_cnpj: '123.456.789-00',
    endereco: 'Rua das Flores', 
    numero: '12', 
    bairro: 'Jardim das Américas',
    cidade: 'Cuiabá', 
    uf: 'MT',
    cep: '78060-000',
    telefone: '(65) 98109-6666'
  },
  { 
    id_pessoas: 3, 
    nome: 'Maria Souza Ramos', 
    tipo_pessoa: 'CLIENTE', 
    cpf_cnpj: '987.654.321-11',
    endereco: 'Bairro Jardim Itália', 
    numero: '100',
    bairro: 'Jardim Itália',
    cidade: 'Cuiabá', 
    uf: 'MT',
    cep: '78000-111',
    telefone: '(65) 3030-2020'
  },
];

export const mockMovimentacoes: Movimentacao[] = [
  { 
    id_movimentacao: 12845, 
    tipo_movimentaca: 'CONSUMO', 
    id_pessoas: 2, 
    datahora: getCurrentCuiabaTimestamp(), 
    entrada_saida: 'SAÍDA', 
    status: 'DIGITANDO',
    pessoa: mockPessoas[1]
  },
  { 
    id_movimentacao: 12844, 
    tipo_movimentaca: 'COMPRA DE FORNECEDOR', 
    id_pessoas: 1, 
    datahora: getCurrentCuiabaTimestamp(), 
    entrada_saida: 'ENTRADA', 
    status: 'PROCESSADO',
    pessoa: mockPessoas[0],
    doc_entrada: 'NF-88291'
  },
];

export const mockEstoque: Estoque[] = [
  { id_estoque: 1, id_produto: 1024, vencimento: '2025-05-15', qtd_estoque: 1284, produto: mockProdutos[0] },
  { id_estoque: 2, id_produto: 1025, vencimento: '2026-06-20', qtd_estoque: 452, produto: mockProdutos[1] },
];

export const isSupabaseConfigured = () => {
  const url = ((import.meta as any).env.VITE_SUPABASE_URL || '').replace(/["']/g, '').trim();
  return url.startsWith('http') && (import.meta as any).env.VITE_SUPABASE_ANON_KEY;
};

const fetchAllFromSupabase = async (tableName: string, queryStr = '*', orderColumn?: string, orderAsc = true) => {
  let allData: any[] = [];
  let from = 0;
  const step = 1000;
  
  while (true) {
    let query = supabase.from(tableName).select(queryStr).range(from, from + step - 1);
    
    if (orderColumn) {
      query = query.order(orderColumn, { ascending: orderAsc });
    }
    
    const { data, error } = await query;
      
    if (error) throw error;
    
    if (data && data.length > 0) {
      allData = [...allData, ...data];
    }
    
    if (!data || data.length < step) {
      break;
    }
    
    from += step;
  }
  return allData;
};

// Service Layer
const rawApi = {
  getDashboardMetrics: async () => {
    let produtosCount = 0;
    let pessoasCount = 0;
    
    if (isSupabaseConfigured()) {
      const { count: prodCount } = await supabase.from('produtos').select('*', { count: 'exact', head: true });
      produtosCount = prodCount || 0;
      
      const { count: pessCount } = await supabase.from('pessoas').select('*', { count: 'exact', head: true });
      pessoasCount = pessCount || 0;
    } else {
      produtosCount = mockProdutos.length;
      pessoasCount = mockPessoas.length;
    }

    const movs = await api.getMovimentacoes();
    const estoque = await api.getEstoque();

    return { produtosCount, pessoasCount, movimentacoes: movs, estoque };
  },

  checkConnection: async (): Promise<boolean> => {
    if (!isSupabaseConfigured()) return false;
    try {
      const { error } = await supabase.from('categorias').select('id_categoria').limit(1);
      if (error) {
        if (error.code === '42P01') {
          console.warn("Supabase conectado, mas a tabela 'categorias' não existe. Execute o script supabase-schema.sql no SQL Editor do Supabase.");
          return true; // Connection is actually successful, but schema is missing
        }
        console.error("Supabase connection error:", error);
        return false;
      }
      return true;
    } catch (err) {
      console.error("Supabase connection error:", err);
      return false;
    }
  },

  getPessoas: async (searchTerm?: string): Promise<Pessoa[]> => {
    if (isSupabaseConfigured()) {
      if (!searchTerm || searchTerm.length < 3) {
         // Se não tiver termo, retorna os 500 primeiros cadastros
         const { data, error } = await supabase.from('pessoas').select('*').order('nome', { ascending: true }).limit(500);
         if (error) throw error;
         return data || [];
      }
      
      // Fetch matching records
      const digits = searchTerm.replace(/\D/g, '');
        
        let query = supabase.from('pessoas').select('*');
        
        // Em um OR no supabase, a sintaxe pode ser complexa. Vamos fazer um filtro simples
        // ou usar otextSearch/ilike
        // Como o ID pessoa é numérico, pesquisamos apenas pelo nome
        query = query.ilike('nome', `%${searchTerm}%`).order('nome', { ascending: true }).limit(200);
        
        const { data, error } = await query;
        if (error) throw error;
        
        // Se a busca tiver digitos (como cpf ou id) podemos buscar também e juntar no frontend
        if (digits.length > 0) {
           let idQuery = supabase.from('pessoas').select('*').limit(50);
           // apenas se for numerico curto para ID ou longo para CPF
           if (digits.length <= 6) {
             const { data: idData } = await supabase.from('pessoas').select('*').eq('id_pessoas', digits);
             if (idData && data) {
               const idsEncontrados = new Set(data.map(p => p.id_pessoas));
               idData.forEach(p => {
                 if (!idsEncontrados.has(p.id_pessoas)) {
                   data.push(p);
                   idsEncontrados.add(p.id_pessoas);
                 }
               });
             }
           } else if (digits.length >= 11) {
             const { data: cpfData } = await supabase.from('pessoas').select('*').ilike('cpf_cnpj', `%${digits}%`).limit(50);
             if (cpfData && data) {
               const idsEncontrados = new Set(data.map(p => p.id_pessoas));
               cpfData.forEach(p => {
                 if (!idsEncontrados.has(p.id_pessoas)) {
                   data.push(p);
                   idsEncontrados.add(p.id_pessoas);
                 }
               });
             }
           }
        }

         return data || [];
    }
    return mockPessoas;
  },

  savePessoa: async (pessoa: Pessoa): Promise<Pessoa> => {
    if (isSupabaseConfigured()) {
      let savedData;
      if (pessoa.id_pessoas && pessoa.id_pessoas > 0 && String(pessoa.id_pessoas).length < 10) {
        // Update
        const { data, error } = await supabase
          .from('pessoas')
          .update({
            tipo_pessoa: pessoa.tipo_pessoa,
            cpf_cnpj: pessoa.cpf_cnpj || null,
            nome: pessoa.nome,
            endereco: pessoa.endereco || null,
            numero: pessoa.numero || null,
            cidade: pessoa.cidade || null,
            uf: pessoa.uf || null,
            cep: pessoa.cep || null,
            bairro: pessoa.bairro || null,
            telefone: pessoa.telefone || null
          })
          .eq('id_pessoas', pessoa.id_pessoas)
          .select('*')
          .single();
        if (error) throw error;
        savedData = data;
      } else {
        // Insert
        let { data, error } = await supabase
          .from('pessoas')
          .insert({
            tipo_pessoa: pessoa.tipo_pessoa,
            cpf_cnpj: pessoa.cpf_cnpj || null,
            nome: pessoa.nome,
            endereco: pessoa.endereco || null,
            numero: pessoa.numero || null,
            cidade: pessoa.cidade || null,
            uf: pessoa.uf || null,
            cep: pessoa.cep || null,
            bairro: pessoa.bairro || null,
            telefone: pessoa.telefone || null
          })
          .select('*')
          .single();
        
        if (error && error.code === '23505') {
           console.warn("Sequence issues detected for pessoas, bypassing...", error.message);
           const { data: maxObj } = await supabase.from('pessoas').select('id_pessoas').order('id_pessoas', { ascending: false }).limit(1).single();
           const nextId = (maxObj?.id_pessoas || 0) + 1;
           const retry = await supabase
             .from('pessoas')
             .insert({
                id_pessoas: nextId,
                tipo_pessoa: pessoa.tipo_pessoa,
                cpf_cnpj: pessoa.cpf_cnpj || null,
                nome: pessoa.nome,
                endereco: pessoa.endereco || null,
                numero: pessoa.numero || null,
                cidade: pessoa.cidade || null,
                uf: pessoa.uf || null,
                cep: pessoa.cep || null,
                bairro: pessoa.bairro || null,
                telefone: pessoa.telefone || null
             })
             .select('*')
             .single();
           if (retry.error) throw retry.error;
           data = retry.data;
           error = null;
        }

        if (error) throw error;
        savedData = data;
      }
      return savedData;
    }

    // Offline / LocalStorage Mode
    const saved = localStorage.getItem('app_pessoas');
    let lista: Pessoa[] = saved ? JSON.parse(saved) : [...mockPessoas];
    
    let result: Pessoa;
    if (pessoa.id_pessoas && String(pessoa.id_pessoas).length < 10) {
      // Update
      lista = lista.map(p => p.id_pessoas === pessoa.id_pessoas ? { ...p, ...pessoa } : p);
      result = { ...pessoa };
    } else {
      // Insert
      result = {
        ...pessoa,
        id_pessoas: Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 10)
      };
      lista = [result, ...lista];
    }
    
    localStorage.setItem('app_pessoas', JSON.stringify(lista));
    return result;
  },

  saveProduto: async (produto: Produto): Promise<Produto> => {
    if (isSupabaseConfigured()) {
      let savedData;
      if (produto.id_produto && produto.id_produto > 0 && String(produto.id_produto).length < 10) {
        // Update
        const { data, error } = await supabase
          .from('produtos')
          .update({
             descricao: produto.descricao,
             id_categoria: produto.id_categoria,
             unidade: produto.unidade,
             preco: produto.preco
          })
          .eq('id_produto', produto.id_produto)
          .select('*, categorias(descricao)')
          .single();
        if (error) throw error;
        savedData = { ...data, categoria: data.categorias };
      } else {
        // Insert
        let { data, error } = await supabase
          .from('produtos')
          .insert({
             descricao: produto.descricao,
             id_categoria: produto.id_categoria,
             unidade: produto.unidade,
             preco: produto.preco
          })
          .select('*, categorias(descricao)')
          .single();
          
        if (error && error.code === '23505') {
           const { data: maxProduto } = await supabase.from('produtos').select('id_produto').order('id_produto', { ascending: false }).limit(1).single();
           const nextId = (maxProduto?.id_produto || 0) + 1;
           const retry = await supabase
             .from('produtos')
             .insert({
                id_produto: nextId,
                descricao: produto.descricao,
                id_categoria: produto.id_categoria,
                unidade: produto.unidade,
                preco: produto.preco
             })
             .select('*, categorias(descricao)')
             .single();
           if (retry.error) throw retry.error;
           data = retry.data;
           error = null;
        }
        
        if (error) throw error;
        savedData = { ...data, categoria: data.categorias };
      }
      return savedData;
    }

    // Offline / LocalStorage Mode
    const saved = localStorage.getItem('app_produtos');
    let lista: Produto[] = saved ? JSON.parse(saved) : [...mockProdutos];
    
    let result: Produto;
    if (produto.id_produto && String(produto.id_produto).length < 10) {
      // Update
      lista = lista.map(p => p.id_produto === produto.id_produto ? { ...p, ...produto } : p);
      result = { ...produto };
    } else {
      // Insert
      // To mock category response
      const cat = mockCategorias.find(c => String(c.id_categoria) === String(produto.id_categoria));
      
      result = {
        ...produto,
        id_produto: Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 10),
        categoria: cat || { id_categoria: Number(produto.id_categoria), descricao: 'Local Cat' }
      };
      lista = [result, ...lista];
    }
    
    localStorage.setItem('app_produtos', JSON.stringify(lista));
    return result;
  },

  getProdutos: async (searchTerm?: string): Promise<Produto[]> => {
    if (isSupabaseConfigured()) {
      if (!searchTerm || searchTerm.trim().length === 0) {
         const { data, error } = await supabase.from('produtos').select('*, categorias(descricao)').order('descricao', { ascending: true }).limit(500);
         if (error) throw error;
         return (data || []).map((d: any) => ({
           ...d,
           categoria: d.categorias
         }));
      }

      const cleanTerm = searchTerm.trim();
      const digits = cleanTerm.replace(/\D/g, '');
      const terms = cleanTerm.split(/\s+/).filter(t => t.length > 0);

      // 1. Search by Description
      let query = supabase.from('produtos').select('*, categorias(descricao)');
      if (terms.length > 0) {
        terms.forEach(term => {
          query = query.ilike('descricao', `%${term}%`);
        });
      }
      const { data: descParsed, error: descError } = await query.order('descricao', { ascending: true }).limit(200);
      let results: any[] = descParsed || [];

      // Set of found product IDs
      const foundIds = new Set<number>(results.map(p => p.id_produto));

      // 2. Search by ID if digits is numeric and not too long
      if (digits.length > 0 && digits.length <= 9) {
        const prodId = Number(digits);
        if (!isNaN(prodId)) {
          try {
            const { data: idData } = await supabase
              .from('produtos')
              .select('*, categorias(descricao)')
              .eq('id_produto', prodId);
            if (idData) {
              idData.forEach(p => {
                if (!foundIds.has(p.id_produto)) {
                  results.push(p);
                  foundIds.add(p.id_produto);
                }
              });
            }
          } catch (err) {
            console.warn("Erro ao buscar produto por ID:", err);
          }
        }
      }

      // 3. Search by Barcode inside supabase codbarras table
      try {
        const barcodeProductIds: number[] = [];

        // Tentativa A: Termo como número caso a coluna seja bigint ou numeric (muito comum em EAN-13)
        if (!isNaN(Number(cleanTerm)) && cleanTerm !== '') {
          try {
            const { data: numData } = await supabase
              .from('codbarras')
              .select('id_produto')
              .eq('cod_barras', Number(cleanTerm));
            if (numData && numData.length > 0) {
              numData.forEach((b: any) => {
                if (b.id_produto) barcodeProductIds.push(Number(b.id_produto));
              });
            }
          } catch (err) {
            console.warn('Busca de código de barras como número falhou (provavelmente tipo incompatível):', err);
          }
        }

        // Tentativa B: Termo como String pura (caso a coluna seja textual, ex: varchar/text)
        try {
          const { data: stringData } = await supabase
            .from('codbarras')
            .select('id_produto')
            .eq('cod_barras', cleanTerm);
          if (stringData && stringData.length > 0) {
            stringData.forEach((b: any) => {
              if (b.id_produto) barcodeProductIds.push(Number(b.id_produto));
            });
          }
        } catch (err) {
          console.warn('Busca de código de barras como string falhou:', err);
        }

        // Tentativa C: Sanitização de caracteres de leitor físico (retém apenas números)
        const digitsOnly = cleanTerm.replace(/\D/g, '');
        if (digitsOnly.length >= 8 && digitsOnly !== cleanTerm) {
          if (!isNaN(Number(digitsOnly))) {
            try {
              const { data: digitsNumData } = await supabase
                .from('codbarras')
                .select('id_produto')
                .eq('cod_barras', Number(digitsOnly));
              if (digitsNumData && digitsNumData.length > 0) {
                digitsNumData.forEach((b: any) => {
                  if (b.id_produto) barcodeProductIds.push(Number(b.id_produto));
                });
              }
            } catch (err) {
              console.warn('Busca com dígitos sanitizados como número falhou:', err);
            }
          }

          try {
            const { data: digitsStrData } = await supabase
              .from('codbarras')
              .select('id_produto')
              .eq('cod_barras', digitsOnly);
            if (digitsStrData && digitsStrData.length > 0) {
              digitsStrData.forEach((b: any) => {
                if (b.id_produto) barcodeProductIds.push(Number(b.id_produto));
              });
            }
          } catch (err) {
            console.warn('Busca com dígitos sanitizados como string falhou:', err);
          }
        }

        // Tentativa D: Busca com correspondência sutil usando casting parcial (se aceito pelo banco)
        try {
          const { data: ilikeStrData } = await supabase
            .from('codbarras')
            .select('id_produto')
            .ilike('cod_barras', `%${cleanTerm}%`);
          if (ilikeStrData && ilikeStrData.length > 0) {
            ilikeStrData.forEach((b: any) => {
              if (b.id_produto) barcodeProductIds.push(Number(b.id_produto));
            });
          }
        } catch (err) {
          // ilike pode falhar se a coluna for estritamente numérica, o que é esperado e seguro de ignorar
        }

        // Fazer a filtragem de IDs únicos obtidos das diversas tentativas
        const uniqueIds = Array.from(new Set(barcodeProductIds)).filter(Boolean);

        if (uniqueIds.length > 0) {
          const { data: barcodeProducts } = await supabase
            .from('produtos')
            .select('*, categorias(descricao)')
            .in('id_produto', uniqueIds);
          if (barcodeProducts) {
            barcodeProducts.forEach(p => {
              if (!foundIds.has(p.id_produto)) {
                results.push(p);
                foundIds.add(p.id_produto);
              }
            });
          }
        }
      } catch (err) {
        console.warn('Erro ao buscar códigos de barras em getProdutos:', err);
      }

      return results.map((d: any) => ({
        ...d,
        categoria: d.categorias
      }));
    }
    return mockProdutos;
  },

  getMovimentacoes: async (): Promise<Movimentacao[]> => {
    if (isSupabaseConfigured()) {
      try {
        // 1. Fetch movimentações with their related pessoa in a flat query
        const movs = await fetchAllFromSupabase('movimentacao', '*, pessoa:pessoas(*)', 'id_movimentacao', false);
        if (!movs || movs.length === 0) {
          return [];
        }

        // 2. Fetch the items details separately, with product & category relations
        const details = await fetchAllFromSupabase(
          'movimentacao_detalhe', 
          '*, produto:produtos(*, categoria:categorias(*))'
        );

        // 3. Map details by their parent movimentacao ID
        const detailsByMovId = new Map<number, any[]>();
        if (details && details.length > 0) {
          details.forEach((item: any) => {
            const movId = item.id_movimentacao;
            if (movId != null) {
              if (!detailsByMovId.has(movId)) {
                detailsByMovId.set(movId, []);
              }
              detailsByMovId.get(movId)!.push({
                ...item,
                id_mov_detalhe: item.id_movimentacao_detalhe || item.id_mov_detalhe
              });
            }
          });
        }

        // 4. Combine and return the mapped items
        return movs.map((m: any) => ({
          ...m,
          tipo_movimentaca: m.tipo_movimentacao || m.tipo_movimentaca,
          itens: (detailsByMovId.get(m.id_movimentacao) || []).map((item: any, idx: number) => ({
            ...item,
            id_mov_detalhe: item.id_mov_detalhe || idx + 1
          }))
        }));
      } catch (err) {
        console.error("Error in getMovimentacoes split query:", err);
        throw err;
      }
    }

    const saved = localStorage.getItem('app_movimentacoes');
    if (saved) return JSON.parse(saved);
    return mockMovimentacoes;
  },
  
  saveMovimentacao: async (mov: Movimentacao): Promise<Movimentacao> => {
    if (isSupabaseConfigured()) {
      let savedMov;
      if (mov.id_movimentacao && mov.id_movimentacao > 0 && String(mov.id_movimentacao).length < 10) {
        // Update existing (checking length to avoid local mock timestamp IDs if migrating)
        const { data, error } = await supabase
          .from('movimentacao')
          .update({
            tipo_movimentacao: mov.tipo_movimentaca,
            id_pessoas: mov.id_pessoas,
            datahora: mov.datahora,
            entrada_saida: mov.entrada_saida,
            doc_entrada: mov.doc_entrada,
            status: mov.status,
          })
          .eq('id_movimentacao', mov.id_movimentacao)
          .select('*')
          .single();
        if (error) throw error;
        savedMov = data;
      } else {
        // Insert new
        let { data, error } = await supabase
          .from('movimentacao')
          .insert({
            tipo_movimentacao: mov.tipo_movimentaca,
            id_pessoas: mov.id_pessoas,
            datahora: mov.datahora || getCurrentCuiabaTimestamp(),
            entrada_saida: mov.entrada_saida,
            doc_entrada: mov.doc_entrada,
            status: mov.status || 'DIGITANDO',
          })
          .select('*')
          .single();

        if (error && error.code === '23505') {
           const { data: maxObj } = await supabase.from('movimentacao').select('id_movimentacao').order('id_movimentacao', { ascending: false }).limit(1).single();
           const nextId = (maxObj?.id_movimentacao || 0) + 1;
           const retry = await supabase
             .from('movimentacao')
             .insert({
                id_movimentacao: nextId,
                tipo_movimentacao: mov.tipo_movimentaca,
                id_pessoas: mov.id_pessoas,
                datahora: mov.datahora || getCurrentCuiabaTimestamp(),
                entrada_saida: mov.entrada_saida,
                doc_entrada: mov.doc_entrada,
                status: mov.status || 'DIGITANDO',
             })
             .select('*')
             .single();
           if (retry.error) throw retry.error;
           data = retry.data;
           error = null;
        }

        if (error) throw error;
        savedMov = data;
      }

      // Handle items
      if (mov.itens && savedMov) {
        // We delete existing items and insert new ones for simplicity when updating
        if (mov.id_movimentacao) {
            await supabase.from('movimentacao_detalhe').delete().eq('id_movimentacao', savedMov.id_movimentacao);
        }

        if (mov.itens.length > 0) {
            const itemsToInsert = mov.itens.map(item => ({
                id_movimentacao: savedMov.id_movimentacao,
                id_produto: item.id_produto,
                quantidade: item.quantidade,
                vencimento: item.vencimento
            }));
            const { error: itemsError } = await supabase.from('movimentacao_detalhe').insert(itemsToInsert);
            if (itemsError) throw itemsError;
        }
      }
      return { ...mov, id_movimentacao: savedMov.id_movimentacao };
    }

    const saved = localStorage.getItem('app_movimentacoes');
    let movimentacoes: Movimentacao[] = saved ? JSON.parse(saved) : [...mockMovimentacoes];
    
    // Convert local fast id string back to something matching logic if required,
    // though here just standard replace logic
    const index = movimentacoes.findIndex(m => m.id_movimentacao === mov.id_movimentacao);
    if (index !== -1) {
      movimentacoes[index] = mov;
    } else {
      movimentacoes = [mov, ...movimentacoes];
    }
    
    localStorage.setItem('app_movimentacoes', JSON.stringify(movimentacoes));
    return mov;
  },
  
  getEstoque: async (): Promise<Estoque[]> => {
    if (isSupabaseConfigured()) {
      return await fetchAllFromSupabase('estoque', '*, produto:produtos(*, categoria:categorias(*))', 'id_estoque', true);
    }

    const saved = localStorage.getItem('app_estoque');
    if (saved) return JSON.parse(saved);
    return mockEstoque;
  },

  saveEstoque: async (estoque: Estoque[]) => {
    if (isSupabaseConfigured()) {
        // Usually handled internally by processarMovimentacao for supabase
        return;
    }
    localStorage.setItem('app_estoque', JSON.stringify(estoque));
  },

  processarMovimentacao: async (mov: Movimentacao) => {
    if (mov.status === 'PROCESSADO') return mov;

    if (isSupabaseConfigured()) {
       // We iterate over the items and update/insert to the estoque table
       if (mov.itens && mov.itens.length > 0) {
           // 1. Transactional Validation For Saída
           for (const item of mov.itens) {
               const { data: estData } = await supabase
                   .from('estoque')
                   .select('qtd_estoque, vencimento')
                   .eq('id_produto', item.id_produto)
                   .eq('vencimento', item.vencimento)
                   .maybeSingle();

               let currentQtd = estData ? Number(estData.qtd_estoque) : 0;
               if (mov.entrada_saida === 'SAÍDA' && currentQtd < Number(item.quantidade)) {
                   throw new Error(`Inconsistência de estoque para o produto ID ${item.id_produto} (Lote/Venc: ${item.vencimento}). Disponível: ${currentQtd}, Solicitado: ${item.quantidade}.`);
               }
           }

           // 2. Processing Updates
           for (const item of mov.itens) {
               const { data: estData } = await supabase
                   .from('estoque')
                   .select('*')
                   .eq('id_produto', item.id_produto)
                   .eq('vencimento', item.vencimento)
                   .maybeSingle();
               
               let currentQtd = estData ? Number(estData.qtd_estoque) : 0;
               const originalQtd = currentQtd;

               if (mov.entrada_saida === 'ENTRADA') {
                   if (mov.tipo_movimentaca === 'BALANÇO' || mov.tipo_movimentaca === 'ESTOQUE INICIAL') {
                       currentQtd = Number(item.quantidade);
                   } else {
                       currentQtd += Number(item.quantidade);
                   }
               } else if (mov.entrada_saida === 'SAÍDA') {
                   currentQtd = Math.max(0, currentQtd - Number(item.quantidade));
               }

               if (estData) {
                   if (currentQtd <= 0 && mov.entrada_saida === 'SAÍDA') {
                       await supabase.from('estoque').delete().eq('id_estoque', estData.id_estoque);
                   } else {
                       await supabase.from('estoque').update({ qtd_estoque: currentQtd }).eq('id_estoque', estData.id_estoque);
                   }
               } else if (currentQtd > 0 || mov.tipo_movimentaca === 'BALANÇO') {
                   let { error } = await supabase.from('estoque').insert({ id_produto: item.id_produto, vencimento: item.vencimento, qtd_estoque: currentQtd });
                   if (error && error.code === '23505') {
                       const { data: maxObj } = await supabase.from('estoque').select('id_estoque').order('id_estoque', { ascending: false }).limit(1).single();
                       const nextId = (maxObj?.id_estoque || 0) + 1;
                       await supabase.from('estoque').insert({ id_estoque: nextId, id_produto: item.id_produto, vencimento: item.vencimento, qtd_estoque: currentQtd });
                   }
               }
               
               if (mov.tipo_movimentaca === 'BALANÇO') {
                   const { error: audError } = await supabase.from('auditoria_balanco').insert({
                       id_produto: item.id_produto,
                       vencimento: item.vencimento,
                       estoque_anterior: originalQtd,
                       estoque_informado: Number(item.quantidade),
                       diferenca: Number(item.quantidade) - originalQtd,
                       datahora: getCurrentCuiabaTimestamp(),
                       id_movimentacao: mov.id_movimentacao,
                       usuario: localStorage.getItem('usuarioLogado') || 'SISTEMA'
                   });
                   if (audError) {
                       console.warn("Tabela auditoria_balanco não encontrada. Operação ignorada no banco de dados.");
                   }
               }
           }
       }

       // update statuses
       const updatedMov = { ...mov, status: 'PROCESSADO' as const };
       const { error } = await supabase.from('movimentacao').update({ status: 'PROCESSADO' }).eq('id_movimentacao', mov.id_movimentacao);
       if (error) throw error;
       return updatedMov;
    }

    // Local / Offline processing
    const saved = localStorage.getItem('app_estoque');
    let listaEstoque: Estoque[] = saved ? JSON.parse(saved) : [...mockEstoque];

    if (mov.itens && mov.itens.length > 0) {
      // 1. Transactional Validation For Saída
      for (const item of mov.itens) {
        const estItem = listaEstoque.find(e => e.id_produto === item.id_produto && e.vencimento === item.vencimento);
        const currentQtd = estItem ? estItem.qtd_estoque : 0;
        
        if (mov.entrada_saida === 'SAÍDA' && currentQtd < item.quantidade) {
            throw new Error(`Inconsistência de estoque para o produto ID ${item.id_produto} (Lote/Venc: ${item.vencimento}). Disponível: ${currentQtd}, Solicitado: ${item.quantidade}.`);
        }
      }

      // 2. Processing Updates
      const savedAuditoria = localStorage.getItem('app_auditoria_balanco');
      let auditoria = savedAuditoria ? JSON.parse(savedAuditoria) : [];

      for (const item of mov.itens) {
        let estItem = listaEstoque.find(e => e.id_produto === item.id_produto && e.vencimento === item.vencimento);
        const originalQtd = estItem ? estItem.qtd_estoque : 0;
        
        if (mov.entrada_saida === 'ENTRADA') {
          if (mov.tipo_movimentaca === 'BALANÇO' || mov.tipo_movimentaca === 'ESTOQUE INICIAL') {
            if (estItem) {
              estItem.qtd_estoque = item.quantidade;
            } else {
              listaEstoque.push({
                id_estoque: Date.now() + Math.floor(Math.random() * 1000),
                id_produto: item.id_produto,
                vencimento: item.vencimento,
                qtd_estoque: item.quantidade,
                produto: item.produto
              });
            }
          } else {
            if (estItem) {
              estItem.qtd_estoque += item.quantidade;
            } else {
              listaEstoque.push({
                id_estoque: Date.now() + Math.floor(Math.random() * 1000),
                id_produto: item.id_produto,
                vencimento: item.vencimento,
                qtd_estoque: item.quantidade,
                produto: item.produto
              });
            }
          }
        } else if (mov.entrada_saida === 'SAÍDA') {
          if (estItem) {
            estItem.qtd_estoque = Math.max(0, estItem.qtd_estoque - item.quantidade);
            if (estItem.qtd_estoque <= 0) {
              listaEstoque = listaEstoque.filter(e => e.id_estoque !== estItem.id_estoque);
            }
          }
        }

        if (mov.tipo_movimentaca === 'BALANÇO') {
            auditoria.push({
               id_produto: item.id_produto,
               vencimento: item.vencimento,
               estoque_anterior: originalQtd,
               estoque_informado: Number(item.quantidade),
               diferenca: Number(item.quantidade) - originalQtd,
               datahora: getCurrentCuiabaTimestamp(),
               id_movimentacao: mov.id_movimentacao,
               usuario: 'SISTEMA'
            });
        }
      }
      
      localStorage.setItem('app_auditoria_balanco', JSON.stringify(auditoria));
      await api.saveEstoque(listaEstoque);
    }
    
    const updatedMov = { ...mov, status: 'PROCESSADO' as const };
    await api.saveMovimentacao(updatedMov);
    return updatedMov;
  },

  getCategorias: async (): Promise<Categoria[]> => {
    if (isSupabaseConfigured()) {
        const { data, error } = await supabase.from('categorias').select('*');
        if (error) throw error;
        return data;
    }
    return mockCategorias;
  },
  
  // Barcode Methods
  getBarcodes: async () => {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('codbarras').select('*');
        if (error) {
          console.warn('Could not fetch from codbarras table (it might not exist). Falling back to local storage.', error.message);
        } else if (data) {
          const map: Record<number, { code: string; date: string }[]> = {};
          data.forEach((item: any) => {
            if (!map[item.id_produto]) map[item.id_produto] = [];
            map[item.id_produto].push({ code: item.cod_barras, date: new Date().toLocaleDateString('pt-BR') });
          });
          return map;
        }
      } catch (err) {
        console.error('Error fetching barcodes from supabase', err);
      }
    }
    const saved = localStorage.getItem('app_barcodes');
    return saved ? JSON.parse(saved) : {
      1024: [
        { code: '7891234567890', date: '12/03/2023' },
        { code: '7891234567812', date: '15/05/2023' }
      ],
      1025: [
        { code: '7899876543210', date: '10/01/2024' }
      ]
    };
  },
  
  addBarcode: async (productId: number, code: string) => {
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from('codbarras').insert({
          id_produto: productId,
          cod_barras: code
        });
        if (error) console.error("Error adding barcode", error);
      } catch (err) {
        console.error(err);
      }
    }
  },

  deleteBarcode: async (productId: number, code: string) => {
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from('codbarras')
          .delete()
          .eq('id_produto', productId)
          .eq('cod_barras', code);
        if (error) console.error("Error deleting barcode", error);
      } catch (err) {
        console.error(err);
      }
    }
  },

  saveBarcodes: async (barcodes: Record<number, { code: string; date: string }[]>) => {
    if (isSupabaseConfigured()) {
      // It's tricky to sync a whole map to Supabase. Assuming CodigosBarras.tsx was calling this to just save locally,
      // We will also save to local storage as a fallback, or handle the specific add/delete in other methods.
      // Since the app currently passes a whole map to saveBarcodes, we might not be able to easily sync everything to Supabase.
      // But we will still save locally so it works if the table doesn't exist.
    }
    localStorage.setItem('app_barcodes', JSON.stringify(barcodes));
  }
};

const apiHandler: ProxyHandler<any> = {
  get(target, prop, receiver) {
    const original = Reflect.get(target, prop, receiver);
    if (typeof original === 'function') {
      return function (this: any, ...args: any[]) {
        const name = String(prop);

        // Do not show toasts for read operations, connection checks, etc.
        if (
          name.startsWith('get') ||
          name.startsWith('check') ||
          name.startsWith('is') ||
          name.startsWith('fetch')
        ) {
          return original.apply(this === receiver ? target : this, args);
        }

        let msg = 'Processando no banco de dados...';
        
        if (
          name.startsWith('save') ||
          name.startsWith('add') ||
          name.startsWith('delete') ||
          name.startsWith('processar')
        ) {
          msg = 'Processando no banco de dados...';
        }

        window.dispatchEvent(
          new CustomEvent('database-loading', {
            detail: { active: true, message: msg, operation: name }
          })
        );

        try {
          const result = original.apply(this === receiver ? target : this, args);
          if (result instanceof Promise) {
            return result
              .then((res) => {
                window.dispatchEvent(
                  new CustomEvent('database-loading', {
                    detail: { active: false, success: true, operation: name }
                  })
                );
                return res;
              })
              .catch((err) => {
                window.dispatchEvent(
                  new CustomEvent('database-loading', {
                    detail: { active: false, success: false, error: err, operation: name }
                  })
                );
                throw err;
              });
          } else {
            window.dispatchEvent(
              new CustomEvent('database-loading', {
                detail: { active: false, success: true, operation: name }
              })
            );
            return result;
          }
        } catch (error) {
          window.dispatchEvent(
            new CustomEvent('database-loading', {
              detail: { active: false, success: false, error, operation: name }
            })
          );
          throw error;
        }
      };
    }
    return original;
  }
};

export const api = new Proxy(rawApi, apiHandler);

