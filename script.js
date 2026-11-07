// ============================================================
// CRUD DA LOJA DE HARDWARE - BANCO NÃO RELACIONAL SIMULADO
// ============================================================
// Banco não relacional (NoSQL) guarda os dados em "documentos",
// que são objetos no formato JSON, dentro de "coleções".
// Aqui temos uma coleção chamada "produtos", igual no MongoDB.
// Exemplo de um documento:
// { _id: "abc123", nome: "Ryzen 5 5600", preco: 749.9, estoque: 12 }
// ============================================================


// ---------- 1) O "BANCO DE DADOS" ----------
// "db" é o nosso banco. Dentro dele existe a coleção "produtos".
var db = {
  produtos: {

    // "docs" é o array onde ficam todos os documentos (produtos).
    // Começa vazio: [].
    docs: [],

    // Gera um _id único para cada documento, como o ObjectId do Mongo.
    // Date.now() = milissegundos atuais; Math.random() = número aleatório.
    // toString(16) converte o número para hexadecimal (letras e números).
    novoId: function () {
      return Date.now().toString(16) + Math.floor(Math.random() * 65536).toString(16);
    },

    // CREATE -> equivale ao insertOne do MongoDB.
    // Recebe um documento, dá um _id a ele e guarda no array.
    insertOne: function (doc) {
      doc._id = this.novoId();   // cria o _id do documento
      this.docs.push(doc);       // adiciona no final do array
      this.salvar();             // grava no navegador (localStorage)
      return doc;                // devolve o documento criado
    },

    // READ -> equivale ao find do MongoDB.
    // Sem filtro: devolve uma cópia de todos os documentos.
    // Com filtro: devolve só os que passam no teste (filter).
    find: function (filtro) {
      return filtro ? this.docs.filter(filtro) : this.docs.slice();
    },

    // READ de um só documento -> equivale ao findOne.
    // Procura o documento que tem o _id informado.
    findOne: function (id) {
      return this.docs.find(function (d) { return d._id === id; });
    },

    // UPDATE -> equivale ao updateOne com $set do MongoDB.
    // Acha o documento pelo _id e troca só os campos informados.
    updateOne: function (id, novosCampos) {
      var doc = this.findOne(id);
      if (!doc) { return false; }          // não achou: não faz nada
      Object.assign(doc, novosCampos);     // copia os campos novos por cima
      this.salvar();
      return true;
    },

    // DELETE -> equivale ao deleteOne do MongoDB.
    // Mantém no array só os documentos com _id diferente do informado.
    deleteOne: function (id) {
      var antes = this.docs.length;
      this.docs = this.docs.filter(function (d) { return d._id !== id; });
      this.salvar();
      return this.docs.length < antes;     // true se removeu algum
    },

    // Guarda o array no localStorage (memória do navegador) como texto JSON.
    // JSON.stringify transforma o array em texto.
    // O try/catch evita erro caso o navegador bloqueie o localStorage.
    salvar: function () {
      try { localStorage.setItem('bytebyte_produtos', JSON.stringify(this.docs)); } catch (e) {}
    },

    // Lê o que foi salvo antes. JSON.parse transforma o texto de volta em array.
    carregar: function () {
      try {
        var salvo = localStorage.getItem('bytebyte_produtos');
        if (salvo) { this.docs = JSON.parse(salvo); }
      } catch (e) {}
    }
  }
};


// ---------- 2) ATALHOS PARA OS ELEMENTOS DA TELA ----------
// $('algo') é um atalho para document.getElementById('algo'),
// que pega um elemento do HTML pelo seu id.
function $(id) { return document.getElementById(id); }

var form = $('formProduto');     // o formulário de cadastro
var lista = $('listaProdutos');  // o <tbody> da tabela


// ---------- 3) FUNÇÕES AUXILIARES ----------

// Formata número como dinheiro brasileiro: 2199.9 vira "R$ 2.199,90".
function moeda(valor) {
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Protege contra HTML malicioso digitado nos campos.
// Se alguém digitar <script>, ele vira texto comum e não executa.
function escapar(texto) {
  var div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

// Mostra uma mensagem embaixo do formulário.
// Se ehErro for true, a classe "erro" deixa o texto vermelho.
function aviso(texto, ehErro) {
  var m = $('mensagem');
  m.textContent = texto;
  m.className = ehErro ? 'erro' : '';
}


// ---------- 4) READ: DESENHA A TABELA NA TELA ----------
function mostrar() {

  // Pega o que foi digitado na busca e a categoria escolhida no filtro.
  var termo = $('busca').value.toLowerCase().trim();
  var cat = $('filtroCategoria').value;

  // Pede ao banco só os produtos que combinam com a busca e o filtro.
  var resultado = db.produtos.find(function (p) {
    // Procura o termo no nome OU na marca (indexOf devolve -1 se não achar).
    var achouTexto = p.nome.toLowerCase().indexOf(termo) !== -1 ||
                     p.marca.toLowerCase().indexOf(termo) !== -1;
    // Categoria vazia = "Todas"; senão precisa ser igual à escolhida.
    var achouCat = cat === '' || p.categoria === cat;
    return achouTexto && achouCat;   // só passa quem atende aos dois
  });

  if (resultado.length === 0) {
    // Nenhum produto: mostra uma linha de aviso na tabela.
    lista.innerHTML = '<tr><td colspan="5" class="vazio">Nenhum produto encontrado. Cadastre um ao lado.</td></tr>';
  } else {
    // map() transforma cada produto em uma linha <tr> da tabela.
    // join('') junta todas as linhas em um só texto HTML.
    lista.innerHTML = resultado.map(function (p) {
      // Estoque de 3 ou menos fica vermelho (classe "baixo").
      var classe = p.estoque <= 3 ? 'num baixo' : 'num';
      return '<tr>' +
        '<td>' + escapar(p.nome) + '<small>' + escapar(p.marca) + '</small></td>' +
        '<td>' + escapar(p.categoria) + '</td>' +
        '<td class="num">' + moeda(p.preco) + '</td>' +
        '<td class="' + classe + '">' + p.estoque + (p.estoque <= 3 ? ' (baixo)' : '') + '</td>' +
        '<td>' +
          // data-acao diz o que o botão faz; data-id guarda o _id do produto.
          '<button class="acao" data-acao="editar" data-id="' + p._id + '">Editar</button>' +
          '<button class="acao excluir" data-acao="excluir" data-id="' + p._id + '">Excluir</button>' +
        '</td></tr>';
    }).join('');
  }

  atualizarResumo();   // atualiza os totais do topo

  // Mostra a coleção inteira como JSON bonito (o 2 é o espaçamento).
  $('jsonColecao').textContent = JSON.stringify(db.produtos.docs, null, 2);
}

// Calcula e escreve os totais: produtos, unidades e valor em estoque.
function atualizarResumo() {
  var todos = db.produtos.find();   // todos os produtos, sem filtro
  var unidades = 0, valor = 0;
  todos.forEach(function (p) {
    unidades += p.estoque;           // soma as unidades
    valor += p.estoque * p.preco;    // soma estoque x preço
  });
  $('totalItens').textContent = todos.length;
  $('totalUnidades').textContent = unidades;
  $('totalValor').textContent = moeda(valor);
}


// ---------- 5) CREATE e UPDATE: ENVIO DO FORMULÁRIO ----------
// Executa quando o usuário clica em "Cadastrar" ou "Salvar alterações".
form.addEventListener('submit', function (e) {
  e.preventDefault();   // impede a página de recarregar ao enviar

  // Monta um documento com o que foi digitado.
  // parseFloat/parseInt convertem texto em número.
  var dados = {
    nome: $('nome').value.trim(),
    categoria: $('categoria').value,
    marca: $('marca').value.trim(),
    preco: parseFloat($('preco').value),
    estoque: parseInt($('estoque').value, 10)
  };

  // Validação: se algo estiver vazio ou não for número, avisa e para.
  if (!dados.nome || !dados.categoria || !dados.marca || isNaN(dados.preco) || isNaN(dados.estoque)) {
    aviso('Preencha todos os campos antes de salvar.', true);
    return;
  }

  // O campo escondido "idEdicao" decide o que fazer:
  // se tem um _id, estamos editando; se está vazio, é um produto novo.
  var id = $('idEdicao').value;
  if (id) {
    db.produtos.updateOne(id, dados);      // UPDATE
    aviso('Produto atualizado.');
  } else {
    db.produtos.insertOne(dados);          // CREATE
    aviso('Produto cadastrado.');
  }

  sairDaEdicao();   // limpa o formulário
  mostrar();        // redesenha a tabela com os dados novos
});


// ---------- 6) EDITAR e EXCLUIR (cliques nos botões da tabela) ----------
// Em vez de ligar um evento em cada botão, ouvimos a tabela toda.
// Assim funciona também para botões criados depois (event delegation).
lista.addEventListener('click', function (e) {
  var botao = e.target.closest('button');   // acha o botão que foi clicado
  if (!botao) { return; }                   // clicou fora de botão: ignora
  var id = botao.getAttribute('data-id');   // lê o _id do produto

  // --- Botão EDITAR: joga os dados do produto de volta no formulário ---
  if (botao.getAttribute('data-acao') === 'editar') {
    var p = db.produtos.findOne(id);
    $('idEdicao').value = p._id;            // guarda o _id no campo escondido
    $('nome').value = p.nome;
    $('categoria').value = p.categoria;
    $('marca').value = p.marca;
    $('preco').value = p.preco;
    $('estoque').value = p.estoque;
    $('tituloForm').textContent = 'Editar produto';
    $('btnSalvar').textContent = 'Salvar alterações';
    $('btnCancelar').hidden = false;        // mostra o botão Cancelar
    $('nome').focus();                      // coloca o cursor no nome
  }

  // --- Botão EXCLUIR: pede confirmação e apaga o documento ---
  if (botao.getAttribute('data-acao') === 'excluir') {
    var alvo = db.produtos.findOne(id);
    if (confirm('Excluir "' + alvo.nome + '"?')) {   // DELETE
      db.produtos.deleteOne(id);
      aviso('Produto excluído.');
      mostrar();
    }
  }
});

// Volta o formulário ao estado inicial (modo "novo produto").
function sairDaEdicao() {
  form.reset();                               // limpa todos os campos
  $('idEdicao').value = '';                   // zera o _id escondido
  $('tituloForm').textContent = 'Novo produto';
  $('btnSalvar').textContent = 'Cadastrar produto';
  $('btnCancelar').hidden = true;             // esconde o Cancelar
}

// Botão Cancelar: sai do modo edição sem salvar nada.
$('btnCancelar').addEventListener('click', function () {
  sairDaEdicao();
  aviso('Edição cancelada.');
});

// Atualiza a tabela a cada letra digitada na busca
// e sempre que a categoria do filtro mudar.
$('busca').addEventListener('input', mostrar);
$('filtroCategoria').addEventListener('change', mostrar);


// ---------- 7) INÍCIO: O QUE RODA AO ABRIR A PÁGINA ----------
db.produtos.carregar();   // recupera produtos salvos anteriormente

// Se o banco está vazio, cria 3 produtos de exemplo.
if (db.produtos.docs.length === 0) {
  db.produtos.insertOne({ nome: 'GeForce RTX 4060 8GB', categoria: 'Placa de vídeo', marca: 'Gigabyte', preco: 2199.9, estoque: 6 });
  db.produtos.insertOne({ nome: 'Ryzen 5 5600', categoria: 'Processador', marca: 'AMD', preco: 749.9, estoque: 12 });
  db.produtos.insertOne({ nome: 'Fury Beast DDR4 16GB 3200MHz', categoria: 'Memória RAM', marca: 'Kingston', preco: 229.9, estoque: 2 });
}

mostrar();   // desenha a tabela pela primeira vez