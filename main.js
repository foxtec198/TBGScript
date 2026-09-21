import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import chalk from 'chalk';
import figlet from 'figlet';
import { tryLogin } from './models/tryLogin.js';
import { Courses } from './models/courses.js'
import { CPF, Wordlist } from './models/generator.js'

const rl = readline.createInterface({ input, output });
const banner = figlet.textSync("TBG Script", { font: "3D-ASCII" });
const courses = new Courses(rl)
const c = new CPF(rl);
const wl = new Wordlist(rl)

const modules = [
  { nome: "Brute Force Module", type: "Brute Force - Login (Generic)", command: "brt", exec: async () => tryLogin(rl) },
  { nome: "Action Realizer - UCT", type: "Login and make courses by URL", command: "uct", exec: async () => courses.main() },
  { nome: "Wordlist generator", type: "Create a personalized wordlist", command: "gen", exec: async () => wl.create() },
  { nome: "CPF - Wordlist generator", type: "Create a wordlist with numbers of CPFS(IDS)", command: "gen -c", exec: async () => c.module() },
];

function normalizarComando(command) {
  return command
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

async function executarComando(inputCommand) {
  const command = normalizarComando(inputCommand);

  // Porocura se o comando digitado é valido
  const modulo = modules.find(item => normalizarComando(item.command) === command);

  
  // Caso não retorna erro
  if (!modulo) {
    console.log(chalk.red(`\n[✖] Comando não encontrado: ${command}\n`));
    return;
  }

  // Caso o comando nao tenha o exec (Esteja em dev)
  if (typeof modulo.exec !== "function") {
    console.log(chalk.yellow(`\n[!] O comando "${modulo.command}" ainda não está disponível.\n`));
    return;
  }

  console.log(typeof modulo.exec)
  // FUnção padrão de execução
  if (typeof modulo.exec === "function") {
    console.log(chalk.bgGreenBright(`\n[>_] Executando: ${modulo.nome}\n`));
    await modulo.exec();
  }
}

async function main() {
  console.clear();
  console.log(chalk.greenBright(banner));
  console.table(modules.map(({ nome, type, command }) => ({ nome, type, command })));

  while (true) {
    const option = await rl.question(chalk.greenBright("TBG > ")); // Input de Option
    const command = normalizarComando(option); // limpa caracteres e minusculas/maiusculas
    if (!command) { continue; } // Somente ignora e continua o modulo

    // Função para sair do modulo
    if (["exit", "quit", "q"].includes(command)) {
      console.log(chalk.yellow("\nEncerrando..."));
      break;
    }

    // Função para limpar a tela (Ctrl + l também funciona) 
    if (["clear", "cls"].includes(command)) {
      console.clear();
      console.log(chalk.greenBright(banner));
      continue;
    }

    // Printa o help 
    if (["help", "?"].includes(command)) {
      console.table(modules.map(({ nome, type, command }) => ({ nome, type, command })));
      continue;
    }

    await executarComando(command); // Executa o comando 
  }

  rl.close(); // Fecha o input
}

main(); // Execução principal