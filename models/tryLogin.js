import { appendFileSync, writeFileSync } from "node:fs";
import fs from "node:fs";
import chalk from 'chalk';
import readline from 'node:readline';
import 'dotenv/config';

const LAST_URL = process.env.LAST_URL // Obtem a ultima url usada
const LAST_WL = process.env.LAST_WORDLIST // Obtem a ultima WordList usada
const LOG_NAME = "tentativas.csv"
let try_res; // Opção de tentativa
let resultado; // Resultado a cada linha

// Esquema de cores
const cores = {
    SUCCESS: chalk.green,
    INVALID: chalk.red,
    RATE_LIMIT: chalk.yellow,
    OTHER: chalk.cyan
};

// Sincroniza o codigo com o csv
writeFileSync(LOG_NAME, "timestamp,tentativa,login,status,resultado,retry_after\n");

// Função responsavel por Limpar o CSV
function csv(value) {
    return `"${String(value).replaceAll('"', '""')}"`
};

// Faz o codigo "dormir"
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
};

async function contarLinhas(caminho) {
    let total = 0;
    const stream = fs.createReadStream(caminho, { encoding: "utf8" });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
    for await (const linha of rl) { if (linha.trim()) { total++; } }
    return total;
}

function printTitulo(texto, caractere = '=', tamanhoTotal = 60) {
    const textoFormatado = ` ${texto.toUpperCase()} `;
    const metadeTamanho = Math.floor((tamanhoTotal + textoFormatado.length) / 2);
    const linhaCompleta = textoFormatado.padStart(metadeTamanho, caractere).padEnd(tamanhoTotal, caractere);
    console.log(linhaCompleta);
}

export async function tryLogin(rl_input) {
    // Local da WordList
    printTitulo('WORDLISTS');
    LAST_WL ? console.log("[🟢] Ultimo WordList utilizado:", chalk.cyan(`[${LAST_WL}]`)) : null
    const wordlist = !LAST_WL
    ? await rl_input.question(chalk.green("Localização da WORDLIST: "))
    : (await rl_input.question("Deseja reutilizar? [s/N]: "))
    .toLocaleLowerCase() == 's' ? LAST_WL : await rl_input.question("Localização da WordList à ser utilizada: ")
    
    const TOTAL_ATTEMPTS = await contarLinhas(wordlist) // Total de Linhas
    console.log('\n');  // Quebra de linha

    // URL Target - Api, Host, IP, network
    printTitulo(' URL TARGET');
    LAST_URL ? console.log("[🟢] Ultimo Target utilizado:", chalk.cyan(`[${LAST_URL}]`)) : null
    const API = !LAST_URL
        ? await rl_input.question(chalk.green("URL Target (API, HOST, IP, Network...):: "))
        : (await rl_input.question("Deseja reutilizar? [s/N]: "))
            .toLocaleLowerCase() == 's' ? LAST_URL : await rl_input.question("Target URL à ser utilizada (API, HOST, IP, Network...): ")

    const stream = fs.createReadStream(wordlist, { encoding: "utf8" }); // Stream do arquivo, uma linha por vez
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity }); // Interface da stream

    // Incrementa a cada linha lida
    console.log('\n');
    printTitulo('✅ Iniciando a execução', '=');
    let attempt = 0;

    for await (const linha of rl) {
        try_res = linha.trim();
        if (!try_res) continue; 
        attempt++;
        
        const timestamp = new Date().toISOString();

        try {
            const response = await fetch(API, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({
                    login: try_res,
                    password: try_res
                })
            });

            const retryAfter = response.headers.get("retry-after") ?? "";

            // Seta o resultado da linha
            if (response.status === 429) { resultado = "RATE_LIMIT"; }
            else if (response.status === 401) { resultado = "INVALID"; }
            else if (response.ok) { resultado = "SUCCESS"; }
            else { resultado = "OTHER"; }

            // Escreve uma linha no LOG
            appendFileSync(
                LOG_NAME,
                [
                    csv(timestamp),
                    attempt,
                    csv(try_res),
                    response.status,
                    csv(resultado),
                    csv(retryAfter)
                ].join(",") + "\n"
            );

            console.log(
                `[${attempt}/${TOTAL_ATTEMPTS}] ${response.status} ` +
                (cores[resultado] || chalk.white)(`${resultado}`),
                `${try_res} ${typeof try_res}`
            );

            if (response.status !== 429) { continue; }
            const seconds = Number.parseInt(retryAfter, 10);
            const waitMs = Number.isFinite(seconds)
                ? Math.max(seconds, 1) * 1000
                : 1000;

            console.log(
                `  ↳ Rate limit. Aguardando ${waitMs / 1000}s e repetindo...`
            );

            await sleep(waitMs);
        } catch (error) {
            appendFileSync(LOG_NAME,
                [
                    csv(timestamp),
                    attempt,
                    csv(try_res),
                    "ERROR",
                    csv(error.message),
                    ""
                ].join(",") + "\n"
            );

            console.error(`[${attempt}/${TOTAL_ATTEMPTS}] ERROR: ${error.message}`);
            continue;
        }
    }

    console.log("✅ - Processo finalizado com", chalk.green("SUCESSO"), `LOG Salvo em ${LOG_NAME}`)

    rl.close()
}