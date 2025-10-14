# backend/app/routes/propostas.py (VERSÃO REFATORADA PARA JSON)

from flask import Blueprint, jsonify, request, current_app
from ..database import read_data, write_data
from datetime import datetime

bp = Blueprint("propostas", __name__, url_prefix="/api/propostas")


@bp.route("", methods=["GET", "POST"])
def handle_propostas():
    db_data = read_data()

    if request.method == "GET":
        filtro = request.args.get("filtro", "").lower()

        # Pega os nomes das "tabelas" do config
        propostas_table = current_app.config["PROPOSTA_TABLE"]
        obs_table = current_app.config["OBSERVACOES_TABLE"]
        contato_proposta_table = current_app.config["CONTATO_PROPOSTA_TABLE"]

        # Pega as listas de dados
        propostas = db_data.get(propostas_table, [])
        observacoes = db_data.get(obs_table, [])
        contatos_proposta = db_data.get(contato_proposta_table, [])

        # --- SIMULAÇÃO DE 'LEFT JOIN' ---
        # Cria mapas para busca rápida
        obs_map = {o["IdProposta"]: o for o in observacoes}
        contatos_map = {cp["IdProposta"]: cp for cp in contatos_proposta}

        resultados = []
        for proposta in propostas:
            proposta_copy = proposta.copy()
            n_proposta = proposta_copy.get("NProposta")

            obs_info = obs_map.get(n_proposta)
            if obs_info:
                proposta_copy["Usuario"] = obs_info.get("Usuario")

            contato_info = contatos_map.get(n_proposta)
            if contato_info:
                proposta_copy["NomeContato"] = contato_info.get("NomeContato")

            resultados.append(proposta_copy)

        # --- SIMULAÇÃO DE FILTRO 'LIKE' ---
        if filtro:
            resultados_filtrados = [
                p
                for p in resultados
                if filtro in str(p.get("RazaoSocialLead", "")).lower()
                or filtro in str(p.get("AgenteDeVenda", "")).lower()
                or filtro in str(p.get("StatusNegociacao", "")).lower()
                or filtro in str(p.get("NomeContato", "")).lower()
                or str(p.get("NProposta", "")).startswith(filtro)
            ]
            resultados = resultados_filtrados

        # --- SIMULAÇÃO DE 'ORDER BY' ---
        resultados.sort(key=lambda x: int(x.get("NProposta", 0)), reverse=True)

        return jsonify(resultados)

    if request.method == "POST":
        data = request.json
        if not all(
            field in data and data[field]
            for field in ["Cpf_CnpjLead", "NumeroDaUcLead"]
        ):
            return (
                jsonify({"erro": "Lead e Unidade Consumidora são obrigatórios."}),
                400,
            )

        # --- LÓGICA PARA GERAR NOVO ID DA PROPOSTA ---
        propostas_table = current_app.config["PROPOSTA_TABLE"]
        propostas = db_data.get(propostas_table, [])
        if not propostas:
            next_n_proposta = 1
        else:
            # Simula 'SELECT MAX(NProposta)'
            max_n_proposta = max(int(p.get("NProposta", 0)) for p in propostas)
            next_n_proposta = max_n_proposta + 1

        id_proposta_texto = f"DPL_{datetime.now().year}_{next_n_proposta}"

        # --- BUSCA INFORMAÇÕES DO LEAD ---
        lead_id = data.get("Cpf_CnpjLead")
        leads_table = current_app.config["LEADS_TABLE"]
        lead_info = next(
            (
                lead
                for lead in db_data.get(leads_table, [])
                if lead.get("Cpf_CnpjLead") == lead_id
            ),
            None,
        )

        if not lead_info:
            return (
                jsonify({"erro": f"Lead com CPF/CNPJ {lead_id} não encontrado."}),
                404,
            )

        # --- CRIA OS NOVOS REGISTROS ---
        nova_proposta = {
            "IdProposta": id_proposta_texto,
            "NProposta": next_n_proposta,
            "Cpf_CnpjLead": lead_id,
            "RazaoSocialLead": lead_info.get("RazaoSocialLead"),
            "NomeFantasia": lead_info.get("NomeFantasia"),
            "Cidade": lead_info.get("Cidade"),
            "Uf": lead_info.get("Uf"),
            "AgenteDeVenda": data.get("AgenteDeVenda"),
            "StatusNegociacao": data.get("StatusNegociacao"),
            "DataStatusNegociacao": data.get(
                "DataStatusNegociacao"
            ),  # Salva como string
        }

        uc_proposta_table = current_app.config["UC_PROPOSTA_TABLE"]
        nova_uc_proposta = {
            "IdProposta": next_n_proposta,
            "Uc": data.get("NumeroDaUcLead"),
        }

        # --- SALVA OS DADOS ---
        db_data[propostas_table].append(nova_proposta)
        db_data.get(uc_proposta_table, []).append(nova_uc_proposta)
        write_data(db_data)

        return (
            jsonify({"sucesso": f"Proposta {id_proposta_texto} salva com sucesso!"}),
            201,
        )


@bp.route("/<int:n_proposta>", methods=["GET", "PUT", "DELETE"])
def handle_proposta_by_id(n_proposta):
    db_data = read_data()
    propostas_table = current_app.config["PROPOSTA_TABLE"]
    propostas = db_data.get(propostas_table, [])

    # Encontra a proposta e seu índice
    proposta_encontrada = None
    indice_proposta = -1
    for i, p in enumerate(propostas):
        if p.get("NProposta") == n_proposta:
            proposta_encontrada = p
            indice_proposta = i
            break

    if not proposta_encontrada:
        return jsonify({"erro": "Proposta não encontrada"}), 404

    if request.method == "GET":
        return jsonify(proposta_encontrada)

    if request.method == "PUT":
        data = request.json
        proposta_encontrada.update(
            {
                "AgenteDeVenda": data.get("AgenteDeVenda"),
                "StatusNegociacao": data.get("StatusNegociacao"),
                "DataStatusNegociacao": data.get("DataStatusNegociacao"),
                "DataDeEnvio": data.get("DataDeEnvio"),
                "DataValidade": data.get("DataValidade"),
            }
        )

        db_data[propostas_table][indice_proposta] = proposta_encontrada
        write_data(db_data)
        return jsonify({"sucesso": "Proposta atualizada com sucesso!"})

    if request.method == "DELETE":
        # Simula 'DELETE' em cascata
        uc_table = current_app.config["UC_PROPOSTA_TABLE"]
        obs_table = current_app.config["OBSERVACOES_TABLE"]
        contato_table = current_app.config["CONTATO_PROPOSTA_TABLE"]

        # Recria as listas, excluindo os registros relacionados
        db_data[propostas_table] = [
            p for p in propostas if p.get("NProposta") != n_proposta
        ]
        db_data[uc_table] = [
            uc for uc in db_data.get(uc_table, []) if uc.get("IdProposta") != n_proposta
        ]
        db_data[obs_table] = [
            o for o in db_data.get(obs_table, []) if o.get("IdProposta") != n_proposta
        ]
        db_data[contato_table] = [
            c
            for c in db_data.get(contato_table, [])
            if c.get("IdProposta") != n_proposta
        ]

        write_data(db_data)
        return jsonify(
            {"sucesso": "Proposta e registros relacionados foram excluídos!"}
        )
