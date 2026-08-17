/**
 * Gerador de CPFs Válidos
 * Uso: node gerador_cpf.js [quantidade]
 */

function gerarCPF() {
    // Gera 9 dígitos aleatórios
    const n = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));

    // Calcula primeiro dígito verificador
    let soma = n.reduce((acc, val, idx) => acc + val * (10 - idx), 0);
    let resto = soma % 11;
    let d1 = resto < 2 ? 0 : 11 - resto;

    // Calcula segundo dígito verificador
    soma = n.reduce((acc, val, idx) => acc + val * (11 - idx), 0) + d1 * 2;
    resto = soma % 11;
    let d2 = resto < 2 ? 0 : 11 - resto;

    return [...n, d1, d2].join('');
}

// Configuração
const qtd = process.argv[2] ? parseInt(process.argv[2]) : 1000;

// Geração e Output
for (let i = 0; i < qtd; i++) {
    console.log(gerarCPF());
}
