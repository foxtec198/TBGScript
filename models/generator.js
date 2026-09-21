import { pathToFileURL } from "url";
import { createWriteStream } from "fs";
import { createBar, printTitulo } from "../utils/ui.js";
import { Crunch } from './crunch.js'
import { mkdir } from "fs/promises";

import path from "path";
import chalk from 'chalk';

const bar = createBar()

export class CPF {
    constructor(rl) {
        this.qtd = process.argv[2] ? parseInt(process.argv[2]) : 1000;
        this.rl = rl
    }

    gerar() {
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

    async salvar(arquivo, qtd = this.qtd) {
        bar.start(qtd, 0);

        // Abre a stram do arquivo caso haja
        const stream = arquivo
            ? createWriteStream(arquivo, { encoding: "utf8" })
            : null

        // Salva no arquivo cada cpf
        for (let i = 0; i < qtd; i++) {
            const cpf = this.gerar() + '\n'
            if (arquivo) {
                if (!stream.write(cpf)) {
                    await new Promise(resolve => {
                        stream.once("drain", resolve);
                    })
                }
            }
            else { console.log(cpf) }
            bar.update(i + 1);
        };

        // Confere se há salvamento ou somente visualização
        if (arquivo) {
            stream.end();

            await new Promise((resolve, reject) => {
                stream.once("finish", resolve);
                stream.once("error", reject);
            });
        }

        bar.stop();
        return console.log(chalk.green(`\n[>_] - Gerado um total de ${qtd} CPFs (Ids)`))
    }

    async module() {
        const arquivo = await this.rl.question(
            chalk.blue("(Opicional) - Deseja salvar em um arquivo? Se sim passe o nome do arquivo: ")
        );

        const qtd = await this.rl.question(
            chalk.blue("(Opicional) - Quantidade de CPFs que deseja gerar: ")
        );

        return await this.salvar(
            arquivo,
            parseInt(qtd
                ? qtd
                : this.qtd
            )
        )
    }
}

export class Wordlist {
    constructor(rl) { this.rl = rl }

    async create() {
        const min = await this.rl.question(chalk.cyan(
            "(OBRIGATÓRIO) Qual o minimo de caracteres: "
        ));

        const max = await this.rl.question(chalk.cyan(
            "(OBRIGATÓRIO) Qual o máximo de caracteres: "
        ));

        const prefix = await this.rl.question(chalk.cyan(
            "(OPCIONAL) - Prefixo [user]: "
        ));

        const suffix = await this.rl.question(chalk.cyan(
            "(OPCIONAL) - Sufixo [@123]: "
        ));

        printTitulo("CUIDADO -- PERIGO")
        console.log(
            chalk.red(
                "⚠️ - Cuidado ao setar o CHARSET abaixo tente ser o mais especifico possivel, se colocar todas combinações, é perigoso que fique para todo sempre gerando wordlist."
            )
        );

        const charset = await this.rl.question(chalk.cyan(
            "(OBRIGATÓRIO) Qual o padrão(charset) a ser utilizado? Exemplo: 'abc123': "
        ));

        let arquivo = await this.rl.question(
            chalk.green(
                "(OBRIGATÓRIO) Local onde deseja salvar a Wordlist \nPadrão: (/resultado/wordlist.txt): "
            )
        );

        arquivo = arquivo || "resultado/wordlist.txt";

        await mkdir(path.dirname(arquivo), {
            recursive: true
        });

        const stream = createWriteStream(arquivo, { encoding: "utf8" })
        const crunch = new Crunch({
            minLength: parseInt(min),
            maxLength: parseInt(max),
            charset: charset,
            prefix: prefix,
            suffix: suffix,
        })

        const total = crunch.count();
        let generated = 0;

        console.log(
            chalk.yellow(
                `\nTotal de combinações: ${total.toLocaleString()}`
            )
        );
        bar.start(total, 0);


        for (const value of crunch.generate()) {
            const word = value + '\n'
            if (!stream.write(word)) {
                await new Promise(resolve => {
                    stream.once("drain", resolve);
                })
            }
            bar.update(generated++);
        }
        stream.end();
        bar.stop()
    }
}
