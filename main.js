import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import chalk from 'chalk';
import figlet from 'figlet';
import { tryLogin } from './models/tryLogin.js';

const rl = readline.createInterface({ input, output });

const banner = figlet.textSync("UCT GOD", {
  font: "3D-ASCII"
});

const modules = [
  { nome: "UCT Module", type: "Brute Force - Login", command: "uct", exec: async () => tryLogin(rl) },
  { nome: "UCT Module - Courses", type: "Access", command: "uct -c" }
];

function normalizarComando(command) {
  return command
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

async function executarComando(inputCommand) {
  const command = normalizarComando(inputCommand);

  const modulo = modules.find(
    item => normalizarComando(item.command) === command
  );

  if (!modulo) {
    console.log(chalk.red(`\n[✖] Comando não encontrado: ${command}\n`));
    return;
  }

  if (typeof modulo.exec !== "function") {
    console.log( chalk.yellow(`\n[!] O comando "${modulo.command}" ainda não está disponível.\n`));
    return;
  }

  console.log( chalk.green(`\n[>_] Executando: ${modulo.nome}\n`));

  await modulo.exec();
}

async function main() {
  console.clear();
  console.log(chalk.greenBright(banner));

  console.table(
    modules.map(({ nome, type, command }) => ({
      nome,
      type,
      command
    }))
  );

  while (true) {
    const option = await rl.question( chalk.greenBright("UCT > ") );

    const command = normalizarComando(option);

    if (!command) { continue; }

    if (["exit", "quit", "q"].includes(command)) {
      console.log(chalk.yellow("\nEncerrando..."));
      break;
    }

    if (["clear", "cls"].includes(command)) {
      console.clear();
      console.log(chalk.greenBright(banner));
      continue;
    }

    if (["help", "?"].includes(command)) {
      console.table( modules.map(({ nome, type, command }) => ({ nome, type, command })) );
      continue;
    }

    await executarComando(command);
  }

  rl.close();
}

main();