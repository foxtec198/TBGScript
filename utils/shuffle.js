import fs from 'fs'

// Configuração dos arquivos
const arquivo1 = 'teste2.txt';
const arquivo2 = 'teste.txt';
const arquivoSaida = 'shuffle.txt';

function lerLinhas(arquivo) {
    try {
        const dados = fs.readFileSync(arquivo, 'utf-8');
        // Filtra linhas vazias e remove espaços em branco
        return dados.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    } catch (err) {
        console.error(`Erro ao ler ${arquivo}: ${err.message}`);
        return [];
    }
}

// Algoritmo Fisher-Yates para embaralhamento imparcial
function embaralhar(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Execução
console.log('Lendo wordlists...');
const lista1 = lerLinhas(arquivo1);
const lista2 = lerLinhas(arquivo2);

console.log(`Encontrados: ${lista1.length} no arquivo 1, ${lista2.length} no arquivo 2.`);

// Junta as duas listas
const combinada = [...lista1, ...lista2];

if (combinada.length === 0) {
    console.log('Nenhum dado encontrado para processar.');
    process.exit(1);
}

console.log('Embaralhando...');
const misturada = embaralhar(combinada);

console.log('Salvando resultado...');
fs.writeFileSync(arquivoSaida, misturada.join('\n') + '\n');

console.log(`Pronto! ${misturada.length} CPFs salvos em ${arquivoSaida}`);
