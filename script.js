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

async function buscarPrecos() {
  const res = await fetch("https://query.idleclans.com/api/market");
  const dados = await res.json();
  return Object.fromEntries(dados.map(i => [i.name, i.buy_price]));
}

function calcularLucro(precos) {
  return receitas.map(r => {
    const custo = r.ingredientes.reduce((sum, ing) => sum + (precos[ing] || 0), 0);
    const venda = precos[r.produto] || 0;
    const lucroUnid = venda - custo;
    const porHora = Math.floor(3600 / r.tempo);
    return {
      nome: r.nome,
      lucro: lucroUnid,
      lucroHora: lucroUnid * porHora,
      xpHora: (r.xp || 0) * porHora
    };
  });
}

function renderizarTabela(dados) {
  const tbody = document.querySelector("#resultTable tbody");
  tbody.innerHTML = ""; // Limpa o corpo da tabela

  if (dados.length === 0) {
    // Se não houver dados, exibe uma mensagem
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 4; // Faz a célula ocupar todas as colunas
    cell.textContent = "Nenhum item encontrado no mercado no momento. Tente novamente mais tarde.";
    cell.style.textAlign = "center";
    cell.style.padding = "20px";
    row.appendChild(cell);
    tbody.appendChild(row);
    return; // Sai da função, não tenta renderizar a tabela
  }

  dados.sort((a, b) => b.lucroHora - a.lucroHora); // Ordena os dados

  dados.forEach(item => {
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

// Não se esqueça de chamar renderizarTabela no main()
async function main() {
  try {
    const precos = await buscarPrecos();
    const lucros = calcularLucro(precos);
    renderizarTabela(lucros); // Passa os lucros para renderizar
  } catch (error) {
    console.error("Erro ao carregar ou processar dados:", error);
    // Opcional: Renderizar uma mensagem de erro na tabela
    const tbody = document.querySelector("#resultTable tbody");
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:red; padding:20px;">Erro ao carregar os dados. Verifique o console para mais detalhes.</td></tr>`;
  }
}

main(); // Chame a função principal