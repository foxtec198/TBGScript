import cliProgress from "cli-progress";

export function printTitulo(texto, caractere = '=', tamanhoTotal = 60) {
    const textoFormatado = ` ${texto.toUpperCase()} `;
    const metadeTamanho = Math.floor((tamanhoTotal + textoFormatado.length) / 2);
    const linhaCompleta = textoFormatado.padStart(metadeTamanho, caractere).padEnd(tamanhoTotal, caractere);
    console.log(linhaCompleta);
}

export function createBar(complete="█", incomplete="░" ){
    return new cliProgress.SingleBar({
        format: "Gerando |{bar}| {percentage}% | {value}/{total} | {duration}s ",
        barCompleteChar: complete,
        barIncompleteChar: incomplete,
    });
}