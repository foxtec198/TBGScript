import "dotenv/config";
import fs from "node:fs/promises";

export async function atualizarEnv({ lastUrl, lastWl }) {
  let env;
  env = await fs.readFile(".env", "utf8");

  const valores = { LAST_URL: lastUrl, LAST_WORDLIST: lastWl };

  for (const [chave, valor] of Object.entries(valores)) {
    if(chave & valor){
      const linha = `${chave}=${valor ?? ""}`;
  
      const regex = new RegExp(`^${chave}=.*$`, "m");
  
      if (regex.test(env)) { env = env.replace(regex, linha); }
      else { env += `\n${linha}`; }
    }
  }

  return await fs.writeFile(".env", `${env.trimEnd()}\n`, "utf8");
}