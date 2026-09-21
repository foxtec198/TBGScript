import { appendFileSync, writeFileSync } from "node:fs";
import fs from "node:fs";
import chalk from 'chalk';
import readline from 'node:readline';
import 'dotenv/config';
import { printTitulo } from '../utils/ui.js'

const LAST_URL = process.env.LAST_URL // Obtem a ultima url usada
const LOG_NAME = "resultado/tentativas.csv"
const iteratorCache = new Map();
let try_res; // Opção de tentativa

// Esquema de cores
const cores = {
    SUCCESS: chalk.green,
    INVALID: chalk.red,
    RATE_LIMIT: chalk.yellow,
    OTHER: chalk.cyan
};

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

// export async function tryLogin(rl_input) {
//     // Sincroniza o codigo com o csv
//     writeFileSync(LOG_NAME, "timestamp,tentativa,login,status,resultado,retry_after\n");

//     // Local da WordList
//     // printTitulo('WORDLISTS');
//     // LAST_WL ? console.log("[🟢] Ultimo WordList utilizado:", chalk.cyan(`[${LAST_WL}]`)) : null
//     // const wordlist = !LAST_WL
//     //     ? await rl_input.question(chalk.green("Localização da WORDLIST: "))
//     //     : (await rl_input.question("Deseja reutilizar? [s/N]: "))
//     //         .toLocaleLowerCase() == 's' ? LAST_WL : await rl_input.question("Localização da WordList à ser utilizada: ")

//     const USER = await obterEntrada(
//         rl_input,
//         "WORDLIST DE USUÁRIOS",
//         "Usuário"
//     );

//     const PASSWORD = await obterEntrada(
//         rl_input,
//         "WORDLIST DE SENHAS",
//         "Senha"
//     )

//     // URL Target - Api, Host, IP, network
//     printTitulo(' URL TARGET');
//     LAST_URL ? console.log("[🟢] Ultimo Target utilizado:", chalk.cyan(`[${LAST_URL}]`)) : null
//     const API = !LAST_URL
//         ? await rl_input.question(chalk.green("URL Target (API, HOST, IP, Network...):: "))
//         : (await rl_input.question("Deseja reutilizar? [s/N]: "))
//             .toLocaleLowerCase() == 's' ? LAST_URL : await rl_input.question("Target URL à ser utilizada (API, HOST, IP, Network...): ")

//     const data = await rl_input.question(chalk.yellow(
//         "Qual o JSON que deverá ser enviado no POST?\n" +
//         "Exemplo:\n" +
//         '{"username":"$USER","password":"$PASS"}\n' +
//         "Pressione ENTER para utilizar o padrão: "
//     ));

//     const TOTAL_ATTEMPTS = await contarLinhas(USER.valor) // Total de Linhas
//     console.log('\n');  // Quebra de linha

//     const stream = fs.createReadStream(wordlist, { encoding: "utf8" }); // Stream do arquivo, uma linha por vez
//     const rl = readline.createInterface({ input: stream, crlfDelay: Infinity }); // Interface da stream

//     // Incrementa a cada linha lida
//     console.log('\n');
//     printTitulo('✅ Iniciando a execução', '=');
//     let attempt = 0;

//     for await (const linha of rl) {
//         try_res = linha.trim();
//         if (!try_res) continue;
//         attempt++;

//         const timestamp = new Date().toISOString();

//         try {
//             const response = await fetch(API, {
//                 method: "POST",
//                 headers: {
//                     "Content-Type": "application/json",
//                     "Accept": "application/json"
//                 },
//                 body: montarData(data)
//             });

//             const retryAfter = response.headers.get("retry-after") ?? "";

//             // Seta o resultado da linha
//             if (response.status === 429) { resultado = "RATE_LIMIT"; }
//             else if (response.status === 401) { resultado = "INVALID"; }
//             else if (response.ok) { resultado = "SUCCESS"; }
//             else { resultado = "OTHER"; }

//             // Escreve uma linha no LOG
//             appendFileSync(
//                 LOG_NAME,
//                 [
//                     csv(timestamp),
//                     attempt,
//                     csv(try_res),
//                     response.status,
//                     csv(resultado),
//                     csv(retryAfter)
//                 ].join(",") + "\n"
//             );

//             console.log(
//                 `[${attempt}/${TOTAL_ATTEMPTS}] ${response.status} ` +
//                 (cores[resultado] || chalk.white)(`${resultado}`),
//                 `${try_res} ${typeof try_res}`
//             );

//             if (response.status !== 429) { continue; }
//             const seconds = Number.parseInt(retryAfter, 10);
//             const waitMs = Number.isFinite(seconds)
//                 ? Math.max(seconds, 1) * 1000
//                 : 1000;

//             console.log(
//                 `  ↳ Rate limit. Aguardando ${waitMs / 1000}s e repetindo...`
//             );
//             await sleep(waitMs);

//         } catch (error) {
//             appendFileSync(LOG_NAME,
//                 [
//                     csv(timestamp),
//                     attempt,
//                     csv(try_res),
//                     "ERROR",
//                     csv(error.message),
//                     ""
//                 ].join(",") + "\n"
//             );

//             console.error(`[${attempt}/${TOTAL_ATTEMPTS}] ERROR: ${error.message}`);
//             continue;
//         }
//     }

//     console.log("✅ - Processo finalizado com", chalk.green("SUCESSO"), `LOG Salvo em ${LOG_NAME}`)

//     rl.close()
// }

export async function tryLogin(rl_input) {
    // Sincroniza o código com o CSV
    writeFileSync(
        LOG_NAME,
        "timestamp,user,password,status,resultado,retry_after\n"
    );

    // ============================================================
    // USUÁRIO
    // ============================================================

    printTitulo("USUÁRIOS");
    const USER = await obterEntrada(
        rl_input,
        "WORDLIST DE USUÁRIOS",
        "Usuário"
    );

    console.log(
        USER.tipo === "single"
            ? `[🟢] Usuário: ${chalk.cyan(USER.valor)}`
            : `[🟢] WordList: ${chalk.cyan(USER.valor)} (${USER.total} linhas)`
    );

    // ============================================================
    // SENHA
    // ============================================================
    printTitulo("SENHAS");
    const PASSWORD = await obterEntrada(
        rl_input,
        "WORDLIST DE SENHAS",
        "Senha"
    );
    console.log(
        PASSWORD.tipo === "single"
            ? `[🟢] Senha individual informada`
            : `[🟢] WordList: ${chalk.cyan(PASSWORD.valor)} (${PASSWORD.total} linhas)`
    );


    // ============================================================
    // TARGET
    // ============================================================
    printTitulo("URL TARGET");
    LAST_URL
        ? console.log(
            "[🟢] Último Target utilizado:",
            chalk.cyan(`[${LAST_URL}]`)
        )
        : null;

    const API = !LAST_URL
        ? await rl_input.question(
            chalk.green("URL Target: ")
        )
        : (
            await rl_input.question(
                "Deseja reutilizar? [s/N]: "
            )
        ).toLocaleLowerCase() === "s"
            ? LAST_URL
            : await rl_input.question(
                "Target URL à ser utilizada: "
            );

    // ============================================================
    // PAYLOAD
    // ============================================================

    const data = await rl_input.question(
        chalk.yellow(
            "Qual o JSON que deverá ser enviado no POST?\n" +
            'Exemplo: {"login":"$USER","password":"$PASS"}\n' +
            "ENTER para utilizar o padrão: "
        )
    );

    const DATA = data || '{"login":"$USER","password":"$PASS"}';

    // ============================================================
    // TOTAL
    // ============================================================

    const totalUsers = USER.total;
    const totalPasswords = PASSWORD.total;

    let totalAttempts;

    if (
        USER.tipo === "single" &&
        PASSWORD.tipo === "single"
    ) {
        totalAttempts = 1;
    } else if (
        USER.tipo === "single" ||
        PASSWORD.tipo === "single"
    ) {
        totalAttempts = Math.max(
            totalUsers,
            totalPasswords
        );
    } else {
        totalAttempts = totalUsers * totalPasswords;
    }

    console.log(
        `\nTotal estimado de combinações: ${chalk.cyan(totalAttempts)}`
    );

    console.log("\n");
    printTitulo("✅ Entradas carregadas", "=");

    // ============================================================
    // ITERADORES
    // ============================================================
    let attempt = 0;
    const userIterator = criarIterador(USER);
    for await (const user of userIterator) {
        const passwordIterator = criarIterador(PASSWORD);

        for await (const pass of passwordIterator) {
            let resultado, SUCCESS = false;
            const payload = montarData(DATA, user, pass);
            attempt++;
            const timestamp = new Date().toISOString();
            
            while (!SUCCESS){
                try {
    
                    const response = await fetch(API, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Accept": "application/json"
                        },
                        body: payload
                    });
    
                    const retryAfter = response.headers.get("retry-after") ?? "";
    
                    // Seta o resultado da linha
                    if (response.status === 429) { resultado = "RATE_LIMIT"; }
                    else if (response.status === 401) { resultado = "INVALID"; }
                    else if (response.ok) { resultado = "SUCCESS"; }
                    else { resultado = "OTHER"; }
    
                    // "timestamp,user,password,status,resultado,retry_after\n"
    
                    // Escreve uma linha no LOG
                    appendFileSync(
                        LOG_NAME,
                        [
                            csv(timestamp),
                            user,
                            pass,
                            response.status,
                            csv(resultado),
                            csv(retryAfter)
                        ].join(",") + "\n"
                    );
    
                    console.log(
                        `[${attempt}/${totalAttempts}] ${response.status} ` +
                        (cores[resultado] || chalk.white)(`${resultado}`),
                        `${user} - ${pass}`
                    );
    
                    if (response.status !== 429) { continue; }
                    const seconds = Number.parseInt(retryAfter, 10);
                    const waitMs = Number.isFinite(seconds)
                        ? Math.max(seconds, 1) * 1000
                        : 1000;
    
                    console.log(
                        `  ↳ Rate limit. Aguardando ${waitMs / 1000}s e repetindo...`
                    );
                    SUCCESS = false
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
    
                    console.error(`[${attempt}/${attempt}] ERROR: ${error.message}`);
                    continue;
                }
            }
        }
    }

    console.log(
        "✅ - Processo finalizado com",
        chalk.green("SUCESSO")
    );
}