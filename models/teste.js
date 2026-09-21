import { appendFileSync, writeFileSync } from "node:fs";
import fs from "node:fs";
import chalk from "chalk";
import readline from "node:readline";
import "dotenv/config";

const LAST_URL = process.env.LAST_URL;
const LAST_WL = process.env.LAST_WORDLIST;
const LOG_NAME = "resultado/tentativas.csv";

let try_res;
let resultado;

// Esquema de cores
const cores = {
    SUCCESS: chalk.green,
    INVALID: chalk.red,
    RATE_LIMIT: chalk.yellow,
    OTHER: chalk.cyan
};

// Função responsável por limpar o CSV
function csv(value) {
    return `"${String(value).replaceAll('"', '""')}"`;
}

// Faz o código "dormir"
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Conta linhas de um arquivo sem carregar tudo na memória
async function contarLinhas(caminho) {
    let total = 0;

    const stream = fs.createReadStream(caminho, {
        encoding: "utf8"
    });

    const rl = readline.createInterface({
        input: stream,
        crlfDelay: Infinity
    });

    for await (const linha of rl) {
        if (linha.trim()) {
            total++;
        }
    }

    return total;
}

// Lê uma entrada que pode ser:
// 1. Valor único
// 2. Wordlist
async function obterEntrada(rl_input, tipo, label) {
    const individual = (
        await rl_input.question(
            `${label} é um valor individual? [s/N]: `
        )
    ).trim().toLocaleLowerCase();

    if (individual === "s") {
        const valor = (
            await rl_input.question(`${label}: `)
        ).trim();

        return {
            tipo: "single",
            valor,
            total: valor ? 1 : 0
        };
    }

    const caminho = (
        await rl_input.question(
            `Localização da ${tipo}: `
        )
    ).trim();

    if (!caminho) {
        throw new Error(`${tipo} não informada.`);
    }

    if (!fs.existsSync(caminho)) {
        throw new Error(`Arquivo não encontrado: ${caminho}`);
    }

    const total = await contarLinhas(caminho);

    return {
        tipo: "wordlist",
        valor: caminho,
        total
    };
}

// Cria um iterador para qualquer tipo de entrada
function criarIterador(entrada) {
    if (entrada.tipo === "single") {
        return (async function* () {
            if (entrada.valor) {
                yield entrada.valor;
            }
        })();
    }

    const stream = fs.createReadStream(entrada.valor, {
        encoding: "utf8"
    });

    const rl = readline.createInterface({
        input: stream,
        crlfDelay: Infinity
    });

    return (async function* () {
        try {
            for await (const linha of rl) {
                const valor = linha.trim();

                if (!valor) {
                    continue;
                }

                yield valor;
            }
        } finally {
            rl.close();
            stream.destroy();
        }
    })();
}

// Monta o JSON informado pelo usuário
function montarData(template, user, password) {
    return template
        .replaceAll("$USER", user)
        .replaceAll("$PASS", password);
}
