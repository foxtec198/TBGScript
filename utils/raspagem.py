import json
import csv
import argparse
from pathlib import Path

def parse_bool(value):
    value = str(value).strip().lower()
    if value in {"true", "1", "sim", "yes"}: return True
    if value in {"false", "0", "sim", "nao", "não", "no"}: return False
    raise argparse.ArgumentTypeError("Use true/false, sim/nao ou 1/0.")

def carregar_json(caminho):
    with open(caminho, "r", encoding="utf-8") as arquivo:
        return json.load(arquivo)

def salvar_json(caminho, dados):
    with open(caminho, "w", encoding="utf-8") as arquivo:
        json.dump(dados, arquivo, ensure_ascii=False, indent=2)

def salvar_csv(caminho, dados):
    if not dados: return

    campos = set()
    print(dados)
    for item in dados: 
        campos.update(item.keys())
    campos = sorted(campos)

    with open(caminho, "w", encoding="utf-8-sig", newline="") as arquivo:
        writer = csv.DictWriter(arquivo, fieldnames=campos)
        writer.writeheader()
        writer.writerows(dados)

def extrair_dados(resposta):
    """
    ## Extrai cursos e alunos distintos de JSON contendo courses.
    `Importante ressaltar que os dados usados/encontrados são para fins de teste!`
    """

    cursos = resposta.get("courses", [])
    cursos_distintos = {}
    alunos_distintos = {}

    for curso in cursos:
        curso_id = curso.get("id")

        if curso_id is not None: cursos_distintos[curso_id] = curso

        for aluno in curso.get("students", []):
            aluno_id = aluno.get("student_id")

            if aluno_id is None: continue

            if aluno_id not in alunos_distintos:
                alunos_distintos[aluno_id] = { "student_id": aluno_id}

    return (
        list(cursos_distintos.values()),
        list(alunos_distintos.values())
    )

def extrair_certificados(resposta):
    """
    ## Extrai alunos e cursos/trilhas distintos de JSON contendo certificates.

    O aluno é identificado por `user_id`.
    
    A trilha/curso é identificada por `track_id`.
    """

    certificados = resposta.get("certificates", [])
    alunos_distintos = {}
    cursos_distintos = {}

    for certificado in certificados:
        user_id = certificado.get("user_id")
        track_id = certificado.get("track_id")

        usuario = certificado.get("user") or {}
        cargo = usuario.get("role") or {}
        departamento = usuario.get("department") or {}

        if user_id is not None:
            alunos_distintos[user_id] = {
                "user_id": user_id,
                "nome": certificado.get("user_name"),
                "cpf": certificado.get("user_cpf"),
                "email": usuario.get("email"),
                "cargo": cargo.get("name"),
                "departamento": departamento.get("name"),
                "is_active": usuario.get("is_active"),
            }

        if track_id is not None:
            cursos_distintos[track_id] = {
                "track_id": track_id,
                "titulo": certificado.get("track_title"),
                "conteudo": certificado.get("track_content"),
                "duracao": certificado.get("track_total_duration"),
            }

    return (
        list(cursos_distintos.values()),
        list(alunos_distintos.values())
    )

def extrair_empresas(resposta):
    """
    ## Extrai empresas e filiais distintas de JSON contendo companies.

    ### Empresas:
        Deduplicadas pelo `id` da empresa.

    ### Filiais:
        Deduplicadas por `company_id + id` da filial,
        pois o mesmo `id` de filial pode existir em empresas diferentes.
    """

    companies = resposta.get("companies", [])

    empresas_distintas = {}
    filiais_distintas = {}

    for empresa in companies:
        empresa_id = empresa.get("id")

        if empresa_id is not None:
            empresas_distintas[empresa_id] = {
                "id": empresa_id,
                "name": empresa.get("name"),
                "trade_name": empresa.get("trade_name"),
                "created_at": empresa.get("created_at"),
                "updated_at": empresa.get("updated_at"),
                "is_active": empresa.get("is_active"),
            }

        for filial in empresa.get("branches", []):
            filial_id = filial.get("id")
            company_id = filial.get("company_id")

            if filial_id is None:
                continue

            chave_filial = (
                company_id,
                filial_id
            )

            filiais_distintas[chave_filial] = {
                "id": filial_id,
                "company_id": company_id,
                "name": filial.get("name"),
                "trade_name": filial.get("trade_name"),
                "cpf_cnpj": (
                    str(filial.get("cpf_cnpj", "")).strip()
                ),
                "address": filial.get("address"),
                "state": filial.get("state"),
                "created_at": filial.get("created_at"),
                "updated_at": filial.get("updated_at"),
                "is_active": filial.get("is_active"),
            }

    return {
        "companies": list(empresas_distintas.values()),
        "branches": list(filiais_distintas.values()),
    }

def filtrar_cursos(cursos, titulo=None, ativo=None):
    resultado = cursos

    if titulo:
        titulo = titulo.lower()

        resultado = [
            curso
            for curso in resultado
            if titulo in (
                curso.get("title")
                or curso.get("titulo")
                or ""
            ).lower()
        ]

    if ativo is not None:
        resultado = [
            curso
            for curso in resultado
            if curso.get("is_active") == ativo
        ]

    return resultado

def filtrar_alunos(alunos, student_id=None):
    if student_id is None:
        return alunos

    return [
        aluno
        for aluno in alunos
        if str(
            aluno.get("student_id", aluno.get("user_id"))
        ) == str(student_id)
    ]

def main():
    parser = argparse.ArgumentParser(
        description=(
            "Extrai dados distintos de JSON de cursos, "
            "certificados ou empresas."
        )
    )

    parser.add_argument(
        "--arquivo",
        help="Caminho do arquivo JSON."
    )

    parser.add_argument(
        "--titulo",
        help="Filtra cursos ou trilhas pelo título."
    )

    parser.add_argument(
        "--ativo",
        type=parse_bool,
        help="Filtra cursos ativos ou inativos."
    )

    parser.add_argument(
        "--student-id",
        help="Filtra por ID de aluno."
    )

    parser.add_argument(
        "--saida",
        default="resultado",
        help="Nome da pasta de saída."
    )

    args = parser.parse_args()

    caminho_arquivo = Path(args.arquivo)
    pasta_saida = Path(args.saida)

    pasta_saida.mkdir( parents=True, exist_ok=True )
    resposta = carregar_json(caminho_arquivo)

    # JSON de empresas
    if "companies" in resposta:
        resultado = extrair_empresas(resposta)
        empresas = resultado["companies"]
        filiais = resultado["branches"]

        options = [
            {"type": empresas, "output": "empresas.csv"},
            {"type": filiais, "output": "filiais.csv"},
        ]

        print("Processamento de empresas concluído.")
        print(f"Empresas distintas: {len(empresas)}")
        print(f"Filiais distintas: {len(filiais)}")

    # JSON de certificados
    elif "certificates" in resposta:
        cursos, alunos = extrair_certificados(resposta)

        cursos = filtrar_cursos(
            cursos,
            titulo=args.titulo,
            ativo=args.ativo
        )

        alunos = filtrar_alunos(
            alunos,
            student_id=args.student_id
        )

        options = [
            {"type": cursos, "output": "cursos.csv"},
            {"type": alunos, "output": "alunos.csv"},   
        ]

        print("Processamento de certificados concluído.")
        print(f"Cursos/trilhas distintas: {len(cursos)}")
        print(f"Alunos distintos: {len(alunos)}")

    # JSON de cursos
    elif "courses" in resposta:
        cursos, alunos = extrair_dados(resposta)

        cursos = filtrar_cursos(
            cursos,
            titulo=args.titulo,
            ativo=args.ativo
        )

        alunos = filtrar_alunos(
            alunos,
            student_id=args.student_id
        )
        
        options = [
            {"type": cursos, "output": "cursos.csv"},
            {"type": alunos, "output": "alunos.csv"},   
        ]

        print("Processamento de cursos concluído.")
        print(f"Cursos distintos: {len(cursos)}")
        print(f"Alunos distintos: {len(alunos)}")

    else:
        raise ValueError(
            "JSON não reconhecido. Esperado: "
            "companies, certificates ou courses."
        )

    for option in options: salvar_csv(pasta_saida / option["output"], option["type"])
    print(f"Arquivos salvos em: {pasta_saida.resolve()}")

if __name__ == "__main__": main()