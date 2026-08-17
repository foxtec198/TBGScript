import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

async function main() {
  const rl = readline.createInterface({ input, output });

  // Wait for user input
  const name = await rl.question('What is your name? ');
  console.log(`Hello, ${name}!`);
  const name2 = await rl.question('What is your name? ');
  console.log(`Hello, ${name2}!`);
  
  rl.close();
}

main();
