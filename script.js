// --- Definição da URL Base da API do Idle Clans ---
const BASE_API_URL = "https://idleclans.com/api/";

// Referências aos elementos HTML
const itemRawNameInput = document.getElementById('item-raw-name');
const itemProcessedNameInput = document.getElementById('item-processed-name');
const calculateProfitButton = document.getElementById('calculate-profit-button');
const clearButton = document.getElementById('clear-button');
const apiDataElement = document.getElementById('api-data');
const errorMessageElement = document.getElementById('error-message');
const loadingMessageElement = document.getElementById('loading-message');

// Cache para armazenar o mapeamento de nome do item para ID
let itemNameToIdMap = new Map();

/**
 * Função genérica para fazer requisições à API.
 * @param {string} url O URL completo da API.
 * @returns {Promise<any>} Os dados parseados da resposta.
 */
async function fetchApiData(url) {
    console.log(Buscando dados de: ${url});
    const response = await fetch(url);

    if (!response.ok) {
        const errorBody = await response.text();
        console.error('Resposta de erro da API:', errorBody);
        throw new Error(Erro HTTP: ${response.status} ${response.statusText}. Detalhes: ${errorBody.substring(0, 200)}...);
    }

    let data;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        data = await response.json();
    } else {
        // Tenta parsear como JSON mesmo que o content-type não seja 'application/json'
        const text = await response.text();
        try {
            data = JSON.parse(text);
        } catch (e) {
            data = text; // Se não for JSON, mantém como texto puro
        }
    }
    return data;
}

/**
 * Busca todos os itens do mercado para criar um mapeamento de nome para ID.
 * Isso é essencial, pois a API de preços usa ItemId, não nome.
 */
async function loadItemNameToIdMap() {
    loadingMessageElement.textContent = 'Carregando lista de itens do mercado...';
    loadingMessageElement.style.display = 'block';
    errorMessageElement.textContent = '';
    itemNameToIdMap.clear(); // Limpa o mapa anterior

    try {
        // Obter todos os preços mais recentes (isso geralmente inclui o nome do item associado ao ID)
        // A API de /items/prices/latest retorna um array de objetos, onde cada objeto tem o itemId, lowestPrice, highestPrice e name.
        const allItemsPrices = await fetchApiData(${BASE_API_URL}PlayerMarket/items/prices/latest);

        if (Array.isArray(allItemsPrices)) {
            allItemsPrices.forEach(item => {
                if (item.name && item.itemId) {
                    itemNameToIdMap.set(item.name.toLowerCase(), item.itemId);
                }
            });
            console.log(Mapeamento de itens carregado: ${itemNameToIdMap.size} itens.);
        } else {
            throw new Error("Formato inesperado ao carregar lista de itens. Não é um array.");
        }
    } catch (error) {
        errorMessageElement.textContent = Erro ao carregar mapeamento de itens: ${error.message}. Não será possível buscar itens por nome.;
        console.error('Erro ao carregar mapeamento de itens:', error);
    } finally {
        loadingMessageElement.style.display = 'none';
    }
}


/**
 * Busca o ID de um item pelo seu nome.
 * @param {string} itemName O nome do item.
 * @returns {number|null} O ID do item ou null se não encontrado.
 */
function getItemIdByName(itemName) {
    return itemNameToIdMap.get(itemName.toLowerCase()) || null;
}

/**
 * Calcula o lucro potencial entre dois itens (ex: cru vs cozido).
 */
async function calculateProfit() {
    apiDataElement.innerHTML = ''; // Limpa dados anteriores
    errorMessageElement.textContent = ''; // Limpa mensagens de erro
    loadingMessageElement.textContent = 'Buscando preços...';
    loadingMessageElement.style.display = 'block';

    const rawItemName = itemRawNameInput.value.trim();
    const processedItemName = itemProcessedNameInput.value.trim();

    if (!rawItemName || !processedItemName) {
        errorMessageElement.textContent = "Por favor, insira o nome dos dois itens para calcular o lucro.";
        loadingMessageElement.style.display = 'none';
        return;
    }

    if (itemNameToIdMap.size === 0) {
        errorMessageElement.textContent = "Erro: Mapeamento de itens não carregado. Tente recarregar a página.";
        loadingMessageElement.style.display = 'none';
        return;
    }

    const rawItemId = getItemIdByName(rawItemName);
    const processedItemId = getItemIdByName(processedItemName);

    if (rawItemId === null) {
        errorMessageElement.textContent = Item "${rawItemName}" não encontrado na base de dados de itens. Verifique o nome.;
        loadingMessageElement.style.display = 'none';
        return;
    }
    if (processedItemId === null) {
        errorMessageElement.textContent = Item "${processedItemName}" não encontrado na base de dados de itens. Verifique o nome.;
        loadingMessageElement.style.display = 'none';
        return;
    }

    try {
        // Busca o preço do item cru
        const rawItemPriceData = await fetchApiData(${BASE_API_URL}PlayerMarket/items/prices/latest/${rawItemId});
        // Busca o preço do item processado
        const processedItemPriceData = await fetchApiData(${BASE_API_URL}PlayerMarket/items/prices/latest/${processedItemId});

        const rawItemLowestPrice = rawItemPriceData.lowestPrice;
        const processedItemHighestPrice = processedItemPriceData.highestPrice; // Geralmente vendemos pelo preço mais alto

        if (rawItemLowestPrice === undefined || processedItemHighestPrice === undefined) {
             throw new Error("Não foi possível obter os preços de compra/venda dos itens. Verifique se estão listados no mercado.");
        }

        const profit = processedItemHighestPrice - rawItemLowestPrice;

        let resultHtml = `
            <h2>Detalhes do Lucro</h2>
            <p><strong>Item Base (Compra):</strong> ${rawItemName} (ID: ${rawItemId})</p>
            <p>Preço Mais Baixo (Compra): <span style="color: green;">${rawItemLowestPrice}</span></p>
            <p><strong>Item Processado (Venda):</strong> ${processedItemName} (ID: ${processedItemId})</p>
            <p>Preço Mais Alto (Venda): <span style="color: blue;">${processedItemHighestPrice}</span></p>
            <hr>
            <h3>Lucro Potencial por Unidade: <span style="color: ${profit >= 0 ? 'green' : 'red'};">${profit}</span></h3>
            <p style="font-size: 0.9em; color: #666;">
                *Este cálculo considera o menor preço de compra para o item base e o maior preço de venda para o item processado. <br>
                Não inclui taxas de mercado ou custos adicionais de processamento (energia, etc.).
            </p>
        `;

        apiDataElement.innerHTML = resultHtml;

    } catch (error) {
        errorMessageElement.textContent = Falha ao calcular lucro: ${error.message};
        console.error('Erro no cálculo de lucro:', error);
    } finally {
        loadingMessageElement.style.display = 'none';
    }
}

/**
 * Limpa os campos de entrada e a área de exibição de dados.
 */
function clearFields() {
    itemRawNameInput.value = '';
    itemProcessedNameInput.value = '';
    apiDataElement.innerHTML = '';
    errorMessageElement.textContent = '';
    loadingMessageElement.style.display = 'none';
}

// --- Event Listeners ---
calculateProfitButton.addEventListener('click', calculateProfit);
clearButton.addEventListener('click', clearFields);

// Carrega o mapeamento de nome para ID quando a página é carregada
document.addEventListener('DOMContentLoaded', loadItemNameToIdMap);