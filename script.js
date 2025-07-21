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
  tbody.innerHTML = "";
  dados.sort((a, b) => b.lucroHora - a.lucroHora).forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.nome}</td>
      <td>${r.lucro.toFixed(0)}</td>
      <td>${r.lucroHora.toFixed(0)}</td>
      <td>${r.xpHora.toFixed(0)}</td>
    `;
    tbody.appendChild(tr);
  });
}

async function main() {
  const precos = await buscarPrecos();
  const resultados = calcularLucro(precos);
  renderizarTabela(resultados);
}

main();