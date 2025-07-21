const receitas = [
  {
    nome: "Baiacu Cozido",
    produto: "Baiacu Cozido",
    ingredientes: ["Baiacu Cru"],
    xp: 105,
    tempo: 12
  },
  {
    nome: "Atum Cozido",
    produto: "Atum Cozido",
    ingredientes: ["Atum Cru"],
    xp: 381.2,
    tempo: 25.2
  },
  {
    nome: "Poção da Rapidez",
    produto: "Poção da Rapidez",
    ingredientes: ["Tomate", "Tomate", "Tomate", "Tomate", "Tomate", "Tomate", "Tomate", "Tomate", "Tomate", "Tomate", "Urtiga", "Urtiga", "Urtiga", "Urtiga", "Urtiga", "Tronco de Pinho", "Tronco de Pinho"],
    xp: 862.5,
    tempo: 55
  }
];

// Mapeamento de nomes de ingredientes para os nomes exatos retornados pela API, se necessário.
// Por enquanto, assumimos que os nomes das receitas são os mesmos da API.
// Se a API retornar nomes diferentes (ex: "Raw Anglerfish" em vez de "Baiacu Cru"),
// você precisará ajustar este mapeamento.
const itemNomeParaAPINome = {
  "Baiacu Cru": "Raw Anglerfish",
  "Baiacu Cozido": "Cooked Anglerfish",
  "Atum Cru": "Raw Tuna",
  "Atum Cozido": "Cooked Tuna",
  "Tomate": "Tomato",
  "Urtiga": "Nettle",
  "Tronco de Pinho": "Pine Log",
  "Poção da Rapidez": "Potion of Swiftness"
  // Adicione outros itens conforme necessário, se os nomes forem diferentes na API
};


async function buscarPrecos() {
  // Nova URL da API para os preços mais recentes de todos os itens
  // Adicionamos includeAveragePrice=true para ter mais opções de preço, se necessário.
  const url = "https://query.idleclans.com/api/PlayerMarket/items/prices/latest?includeAveragePrice=true";

  try {
    const res = await fetch(url);

    if (!res.ok) {
      // Se a resposta não for 2xx (ex: 404, 500), lançamos um erro
      const errorText = await res.text();
      throw new Error(`Erro HTTP: ${res.status} - ${res.statusText}. Resposta: ${errorText}`);
    }

    const dados = await res.json();
    console.log("Dados brutos da API:", dados); // Para depuração: veja a estrutura exata

    // Criar um mapa de preços usando o nome do item como chave
    // Tentamos usar o nome retornado pela API primeiro
    const precos = {};
    dados.forEach(item => {
      // Usamos o 'highestPrice' para venda (o que você compra) e 'lowestPrice' para custo (o que você vende)
      // Ajuste isso se houver um conceito de 'buy_price' e 'sell_price' mais claro na API
      precos[item.name] = {
        buy_price: item.lowestPrice, // Preço mais baixo no mercado (o que você pagaria para comprar)
        sell_price: item.highestPrice // Preço mais alto no mercado (o que alguém pagaria para comprar o seu)
      };
    });

    return precos;

  } catch (error) {
    console.error(`Erro ao buscar preços da API (${url}):`, error);
    throw error; // Relança o erro para que a função main possa tratá-lo
  }
}

function calcularLucro(precos) {
  return receitas.map(r => {
    let custoTotalIngredientes = 0;
    r.ingredientes.forEach(ingrediente => {
      // Tenta mapear o nome da receita para o nome da API, se houver
      const nomeApi = itemNomeParaAPINome[ingrediente] || ingrediente;
      // Pega o preço de compra (lowestPrice) do ingrediente
      custoTotalIngredientes += (precos[nomeApi] && precos[nomeApi].buy_price) ? precos[nomeApi].buy_price : 0;
    });

    // Pega o preço de venda (highestPrice) do produto final
    const nomeProdutoApi = itemNomeParaAPINome[r.produto] || r.produto;
    const precoVendaProduto = (precos[nomeProdutoApi] && precos[nomeProdutoApi].sell_price) ? precos[nomeProdutoApi].sell_price : 0;

    const lucroUnidade = precoVendaProduto - custoTotalIngredientes;
    const receitasPorHora = (r.tempo > 0) ? Math.floor(3600 / r.tempo) : 0; // Evita divisão por zero
    
    return {
      nome: r.nome,
      lucro: lucroUnidade,
      lucroHora: lucroUnidade * receitasPorHora,
      xpHora: (r.xp || 0) * receitasPorHora
    };
  });
}

function renderizarTabela(dados) {
  const tbody = document.querySelector("#resultTable tbody");
  tbody.innerHTML = ""; // Limpa o corpo da tabela

  if (!dados || dados.length === 0) {
    // Exibe mensagem se não houver dados ou eles estiverem vazios
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.textContent = "Nenhum dado de lucro disponível. Verifique o console para erros ou o status da API.";
    cell.style.textAlign = "center";
    cell.style.padding = "20px";
    row.appendChild(cell);
    tbody.appendChild(row);
    return;
  }

  // Filtra receitas com lucro por hora válido antes de ordenar
  const dadosValidos = dados.filter(item => typeof item.lucroHora === 'number' && !isNaN(item.lucroHora));
  
  dadosValidos.sort((a, b) => b.lucroHora - a.lucroHora); // Ordena pelo lucro por hora

  dadosValidos.forEach(item => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item.nome}</td>
      <td>${item.lucro.toFixed(2)}</td>
      <td>${item.lucroHora.toFixed(2)}</td>
      <td>${item.xpHora.toFixed(2)}</td>
    `;
    tbody.appendChild(row);
  });
}

// Função principal para orquestrar o carregamento e renderização
async function main() {
  const tbody = document.querySelector("#resultTable tbody");
  tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px;">Carregando dados do mercado...</td></tr>`;

  try {
    const precos = await buscarPrecos();
    const lucros = calcularLucro(precos);
    renderizarTabela(lucros);
  } catch (error) {
    console.error("Erro fatal ao carregar ou processar dados:", error);
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:red; padding:20px;">
      Ocorreu um erro ao carregar os dados do mercado. Por favor, tente novamente mais tarde.
      Detalhes no console do navegador (F12).
    </td></tr>`;
  }
}

// Inicia a aplicação quando a página é carregada
main();