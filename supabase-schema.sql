-- create the tables
create table pessoas (
    id_pessoas serial primary key,
    nome text not null,
    tipo_pessoa text not null,
    cpf_cnpj text,
    endereco text,
    numero text,
    bairro text,
    cidade text,
    uf text,
    cep text,
    telefone text
);

create table categorias (
    id_categoria serial primary key,
    descricao text not null
);

create table produtos (
    id_produto serial primary key,
    descricao text not null,
    unidade text,
    id_categoria int references categorias(id_categoria),
    preco numeric
);

create table movimentacao (
    id_movimentacao serial primary key,
    tipo_movimentaca text not null,
    id_pessoas int references pessoas(id_pessoas),
    datahora timestamp with time zone default now(),
    entrada_saida text not null,
    status text default 'DIGITANDO',
    doc_entrada text
);

create table movimentacao_detalhe (
    id_movimentacao_detalhe serial primary key,
    id_movimentacao int references movimentacao(id_movimentacao),
    id_produto int references produtos(id_produto),
    quantidade numeric not null,
    vencimento date
);

create table estoque (
    id_estoque serial primary key,
    id_produto int references produtos(id_produto),
    vencimento date,
    qtd_estoque numeric not null
);

-- populate test data
insert into categorias (id_categoria, descricao) values
(1, 'Escritório'),
(2, 'Tecnologia'),
(3, 'Limpeza');

insert into pessoas (id_pessoas, nome, tipo_pessoa, cpf_cnpj, endereco, numero, bairro, cidade, uf, cep, telefone) values
(1, 'Logística Pantanal Ltda', 'FORNECEDOR', '12.345.678/0001-99', 'Av. do CPA', '4500', 'Centro', 'Cuiabá', 'MT', '78000-000', '(65) 9999-8888'),
(2, 'José da Silva Ferreira', 'COLABORADOR', '123.456.789-00', 'Rua das Flores', '12', 'Jardim das Américas', 'Cuiabá', 'MT', '78060-000', '(65) 98109-6666'),
(3, 'Maria Souza Ramos', 'CLIENTE', '987.654.321-11', 'Bairro Jardim Itália', '100', 'Jardim Itália', 'Cuiabá', 'MT', '78000-111', '(65) 3030-2020');

insert into produtos (id_produto, descricao, unidade, id_categoria, preco) values
(1024, 'Papel A4 - 75g (Resma)', 'UN', 1, 24.90),
(1025, 'Cabo HDMI 2.0 - 1.5m', 'UN', 2, 45.00),
(1026, 'Limpador Multiuso 5L', 'GL', 3, 32.50);

insert into estoque (id_produto, vencimento, qtd_estoque) values
(1024, '2025-05-15', 1284),
(1025, '2026-06-20', 452);

-- Fix pk sequences
SELECT setval('categorias_id_categoria_seq', (SELECT MAX(id_categoria) FROM categorias));
SELECT setval('pessoas_id_pessoas_seq', (SELECT MAX(id_pessoas) FROM pessoas));
SELECT setval('produtos_id_produto_seq', (SELECT MAX(id_produto) FROM produtos));
