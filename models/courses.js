import makeFetchCookie from "fetch-cookie";
import { CookieJar } from "tough-cookie";
import { printTitulo } from "../utils/ui.js";
import chalk from 'chalk';
import { atualizarEnv } from "./atualizarEnv.js";

const jar = new CookieJar();
const fetchComCookies = makeFetchCookie(fetch, jar);
const LAST_URL = process.env.LAST_URL // Obtem a ultima url usada

export class Courses {
    constructor(rl_input) { this.rl = rl_input }

    async finalizar() {
        const lesson_id = await this.rl.question(chalk.yellow("Qual o id da lição? "))

        const payload = {
            lesson_id: lesson_id,
            user_id: this.me.user.id,
            percentage: 100,
            is_completed: true,
        }

        const response = await fetchComCookies(`${this.base}/progress/update`, {
            method: "PATCH",
            credentials: "include",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        const raw = await response.text();
        let data;
        try { data = raw ? JSON.parse(raw) : null; } 
        catch { data = raw; }

        console.log(chalk.greenBright(`Sucesso: Aula ${lesson_id} marcada como completa para usuário ${this.me.user.name}.`));
    }

    async login() {
        const username = await this.rl.question(chalk.cyan("Username: "))
        const password = await this.rl.question(chalk.cyan("Password: "))

        printTitulo('URL/HOST TARGET');

        LAST_URL ? console.log("[🟢] Ultima URL/HOST utilizado:", chalk.cyan(`[${LAST_URL}]`)) : null
        const API = !LAST_URL
            ? await this.rl.question(chalk.green("URL Target (API, HOST, IP, Network...):: "))
            : (await this.rl.question("Deseja reutilizar? [s/N]: "))
                .toLocaleLowerCase() == 's' ? LAST_URL : await this.rl.question("Target URL à ser utilizada (API, HOST, IP, Network...): ")
        const baseURL = API ? new URL(API).origin : null;

        const req = await fetchComCookies(`${baseURL}/api/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({
                login: username,
                password: password
            })
        });

        
        const me_req = await fetchComCookies(`${baseURL}/api/me`)
        
        // Confere a requisição principal do login para ai conferir o ME
        this.me = req.ok? await me_req.json() : null
        this.api = API
        this.base = baseURL
        atualizarEnv(API)
        
        return console.log(req.ok
            ? ( chalk.green(`Login realizado com sucesso - [${req.status}]\n `), chalk.underlineGreen(`Seja bem vindo(a), ${this.me.user.name}`))
            : chalk.red(`Login Invalido - [${req.status}]`)
        )
    }

    async main() {
        if(this.me){ await this.finalizar()}
        else{ await this.login(); await this.finalizar() }
        return
    }
}