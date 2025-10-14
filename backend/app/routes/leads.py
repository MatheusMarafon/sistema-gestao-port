# backend/app/routes/leads.py (VERSÃO FINAL CORRIGIDA PARA JSON)

from flask import Blueprint, jsonify, request, current_app
from ..database import read_data, write_data  # <-- Importa as novas funções!
from datetime import datetime

# Cria o Blueprint para as rotas de leads
bp = Blueprint("leads", __name__, url_prefix="/api/leads")


@bp.route("", methods=["GET", "POST"])
def handle_leads():
    # Para operações com JSON, lemos o "banco de dados" no início de cada requisição
    db_data = read_data()

    if request.method == "GET":
        filtro = request.args.get("filtro", "").lower()

        # Pega os nomes das "tabelas" do app config
        leads_table = current_app.config["LEADS_TABLE"]
        vendedores_table = current_app.config["VENDEDORES_TABLE"]
        contatos_table = current_app.config["CONTATOS_TABLE"]

        # Pega as listas de dados do nosso "banco" JSON
        leads = db_data.get(leads_table, [])
        vendedores = db_data.get(vendedores_table, [])
        contatos = db_data.get(contatos_table, [])

        # --- SIMULAÇÃO DE 'LEFT JOIN' ---
        # Cria dicionários para busca rápida, evitando loops aninhados
        vendedores_map = {v["Cpf_CnpjLead"]: v for v in vendedores}
        contatos_map = {c["Cpf_CnpjLead"]: c for c in contatos}

        resultados = []
        for lead in leads:
            # Cria uma cópia para não modificar a "tabela" original em memória
            lead_copy = lead.copy()

            vendedor_info = vendedores_map.get(lead_copy.get("Cpf_CnpjLead"))
            if vendedor_info:
                lead_copy["Vendedor"] = vendedor_info.get("Vendedor")

            contato_info = contatos_map.get(lead_copy.get("Cpf_CnpjLead"))
            if contato_info:
                lead_copy["Contato"] = contato_info.get("NomeContato")

            resultados.append(lead_copy)

        # --- SIMULAÇÃO DE FILTRO 'LIKE' ---
        if filtro:
            resultados_filtrados = [
                lead
                for lead in resultados
                if filtro in str(lead.get("RazaoSocialLead", "")).lower()
                or filtro in str(lead.get("Cpf_CnpjLead", "")).lower()
                or filtro in str(lead.get("NomeFantasia", "")).lower()
            ]
            resultados = resultados_filtrados

        # --- SIMULAÇÃO DE 'ORDER BY' ---
        resultados.sort(
            key=lambda x: x.get("DataResgistroLead", "1900-01-01"), reverse=True
        )

        return jsonify(resultados)

    if request.method == "POST":
        novo_lead = request.json
        if (
            not novo_lead
            or not novo_lead.get("Cpf_CnpjLead")
            or not novo_lead.get("RazaoSocialLead")
        ):
            return jsonify({"erro": "CPF/CNPJ e Razão Social são obrigatórios"}), 400

        leads_table = current_app.config["LEADS_TABLE"]

        # Verifica se o lead já existe (simulação de 'IntegrityError')
        if any(
            lead.get("Cpf_CnpjLead") == novo_lead.get("Cpf_CnpjLead")
            for lead in db_data[leads_table]
        ):
            return jsonify({"erro": "Este CPF/CNPJ já existe na base de dados."}), 409

        # Adiciona dados automáticos
        novo_lead["DataResgistroLead"] = datetime.now().isoformat()

        db_data[leads_table].append(novo_lead)
        write_data(db_data)

        return jsonify({"sucesso": "Lead criado com sucesso"}), 201


@bp.route("/<path:lead_id>", methods=["GET", "PUT"])
def handle_lead_by_id(lead_id):
    db_data = read_data()
    leads_table = current_app.config["LEADS_TABLE"]
    leads = db_data.get(leads_table, [])

    # Encontra o lead e seu índice na lista
    lead_encontrado = None
    indice_lead = -1
    for i, lead in enumerate(leads):
        if lead.get("Cpf_CnpjLead") == lead_id:
            lead_encontrado = lead
            indice_lead = i
            break

    if not lead_encontrado:
        return jsonify({"erro": "Lead não encontrado"}), 404

    if request.method == "GET":
        return jsonify(lead_encontrado)

    if request.method == "PUT":
        dados_atualizacao = request.json
        lead_encontrado.update(dados_atualizacao)

        # Atualiza o lead na lista original
        db_data[leads_table][indice_lead] = lead_encontrado

        write_data(db_data)
        return jsonify({"sucesso": "Lead atualizado com sucesso"})


@bp.route("/<path:lead_id>/vendedor-contato", methods=["POST"])
def add_vendedor_contato(lead_id):
    data = request.json
    db_data = read_data()

    vendedores_table = current_app.config["VENDEDORES_TABLE"]
    contatos_table = current_app.config["CONTATOS_TABLE"]

    # Filtra as listas, mantendo apenas os registros que NÃO são do lead_id atual
    db_data[vendedores_table] = [
        v for v in db_data.get(vendedores_table, []) if v.get("Cpf_CnpjLead") != lead_id
    ]
    db_data[contatos_table] = [
        c for c in db_data.get(contatos_table, []) if c.get("Cpf_CnpjLead") != lead_id
    ]

    if data.get("Vendedor"):
        novo_vendedor = {
            "Cpf_CnpjLead": lead_id,
            "Vendedor": data.get("Vendedor"),
            "DataDeEnvioLead": data.get("DataEnvio"),  # Armazena como string
            "ValidadeLead": data.get("DataValidade"),  # Armazena como string
        }
        db_data[vendedores_table].append(novo_vendedor)

    if data.get("NomeContato"):
        novo_contato = {
            "Cpf_CnpjLead": lead_id,
            "NomeContato": data.get("NomeContato"),
            "e-mail": data.get("Email"),
            "Telefone": data.get("Telefone"),
        }
        db_data[contatos_table].append(novo_contato)

    write_data(db_data)
    return (
        jsonify({"sucesso": "Informações de Vendedor/Contato salvas com sucesso!"}),
        201,
    )
