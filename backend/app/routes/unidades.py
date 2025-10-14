# backend/app/routes/unidades.py (VERSÃO REFATORADA PARA JSON)

from flask import Blueprint, jsonify, request, current_app
from ..database import read_data, write_data
from ..services.validation_service import validar_regras_tarifacao
from datetime import datetime

bp = Blueprint("unidades", __name__, url_prefix="/api")


# Funções de utilidade (podem ser movidas para utils.py se preferir)
def to_float(value):
    try:
        return float(value)
    except (ValueError, TypeError):
        return None


@bp.route("/leads/<path:lead_id>/unidades", methods=["GET", "POST"])
def handle_unidades_by_lead(lead_id):
    db_data = read_data()
    unidades_table = current_app.config["UNIDADES_TABLE"]

    if request.method == "GET":
        # Filtra a lista de unidades para retornar apenas as do lead_id especificado
        unidades_do_lead = [
            unidade
            for unidade in db_data.get(unidades_table, [])
            if unidade.get("Cpf_CnpjLead") == lead_id
        ]
        return jsonify(unidades_do_lead)

    if request.method == "POST":
        data = request.json
        if not data.get("NumeroDaUcLead"):
            return jsonify({"erro": "O Nº da UC é obrigatório"}), 400

        try:
            validar_regras_tarifacao(data, data)
        except ValueError as e:
            return jsonify({"erro": f"Regra de negócio violada: {e}"}), 400

        # Simula 'IntegrityError' verificando se a unidade já existe para este lead
        if any(
            u.get("NumeroDaUcLead") == data.get("NumeroDaUcLead")
            and u.get("Cpf_CnpjLead") == lead_id
            for u in db_data.get(unidades_table, [])
        ):
            return (
                jsonify(
                    {"erro": "Já existe uma unidade com este número para este lead."}
                ),
                409,
            )

        nova_unidade = (
            data.copy()
        )  # Cria uma cópia para não modificar o objeto da requisição
        nova_unidade["Cpf_CnpjLead"] = lead_id
        nova_unidade["DataRegistroUC"] = datetime.now().isoformat()

        # Converte os tipos de dados conforme o código original
        nova_unidade["Cidade"] = to_float(data.get("Cidade"))
        nova_unidade["AliquotaICMS"] = to_float(data.get("AliquotaICMS"))
        nova_unidade["BeneficioRuralIrrigacao"] = to_float(
            data.get("BeneficioRuralIrrigacao")
        )
        nova_unidade["SaldoMaisRecenteSCEE"] = to_float(
            data.get("SaldoMaisRecenteSCEE")
        )
        nova_unidade["PossuiUsina"] = bool(data.get("PossuiUsina"))

        db_data.get(unidades_table, []).append(nova_unidade)
        write_data(db_data)

        return jsonify({"sucesso": "Unidade criada com sucesso!"}), 201


@bp.route("/unidade/<path:uc_id>", methods=["GET"])
def get_unidade_by_id(uc_id):
    db_data = read_data()
    unidades_table = current_app.config["UNIDADES_TABLE"]

    # Encontra a primeira unidade que corresponde ao uc_id
    unidade_encontrada = next(
        (
            unidade
            for unidade in db_data.get(unidades_table, [])
            if unidade.get("NumeroDaUcLead") == uc_id
        ),
        None,
    )

    if not unidade_encontrada:
        return jsonify({"erro": "Unidade Consumidora não encontrada."}), 404

    return jsonify(unidade_encontrada)


@bp.route("/unidades/<path:uc_id_original>", methods=["PUT", "DELETE"])
def update_or_delete_unidade(uc_id_original):
    db_data = read_data()
    unidades_table = current_app.config["UNIDADES_TABLE"]
    unidades = db_data.get(unidades_table, [])

    if request.method == "PUT":
        data = request.json
        try:
            validar_regras_tarifacao(data, data)
        except ValueError as e:
            return jsonify({"erro": f"Regra de negócio violada: {e}"}), 400

        unidade_atualizada = False
        for unidade in unidades:
            if unidade.get("NumeroDaUcLead") == uc_id_original and unidade.get(
                "Cpf_CnpjLead"
            ) == data.get("Cpf_CnpjLead"):
                unidade.update(data)  # Atualiza o dicionário com os novos dados
                unidade_atualizada = True
                break

        if not unidade_atualizada:
            return jsonify({"erro": "Nenhuma unidade encontrada para atualizar."}), 404

        write_data(db_data)
        return jsonify({"sucesso": "Unidade atualizada com sucesso!"})

    if request.method == "DELETE":
        data = request.json
        lead_id = data.get("Cpf_CnpjLead")
        if not lead_id:
            return (
                jsonify({"erro": "CPF/CNPJ do lead é necessário para exclusão."}),
                400,
            )

        unidades_antes = len(unidades)
        historico_table = current_app.config["HISTORICO_TABLE"]

        # Recria as listas, excluindo os registros a serem deletados
        db_data[unidades_table] = [
            u
            for u in unidades
            if not (
                u.get("NumeroDaUcLead") == uc_id_original
                and u.get("Cpf_CnpjLead") == lead_id
            )
        ]
        db_data[historico_table] = [
            h
            for h in db_data.get(historico_table, [])
            if h.get("NumeroDaUcLead") != uc_id_original
        ]

        if len(db_data[unidades_table]) == unidades_antes:
            return (
                jsonify(
                    {
                        "erro": "Unidade não encontrada ou não pertence ao lead informado."
                    }
                ),
                404,
            )

        write_data(db_data)
        return jsonify({"sucesso": "Unidade e seu histórico foram excluídos."})


@bp.route("/unidades/<path:uc_id>/historico", methods=["GET"])
def get_all_historico(uc_id):
    db_data = read_data()
    historico_table = current_app.config["HISTORICO_TABLE"]

    historico_filtrado = [
        h
        for h in db_data.get(historico_table, [])
        if str(h.get("NumeroDaUcLead")).strip() == uc_id
    ]
    historico_filtrado.sort(key=lambda x: x.get("IDMes", 0), reverse=True)

    # Formata o campo IDMes
    for item in historico_filtrado:
        if item.get("IDMes"):
            id_mes_str = str(item["IDMes"])
            if len(id_mes_str) == 6:
                item["IDMes"] = f"{id_mes_str[:4]}-{id_mes_str[4:]}"

    return jsonify(historico_filtrado)


@bp.route("/unidades/<path:uc_id>/historico/batch", methods=["POST"])
def batch_update_historico(uc_id):
    data = request.json
    ano = data.get("ano")
    dados_meses = data.get("dados")
    if not ano or dados_meses is None:
        return jsonify({"erro": "Ano e dados do histórico são obrigatórios."}), 400

    db_data = read_data()
    unidades_table = current_app.config["UNIDADES_TABLE"]
    historico_table = current_app.config["HISTORICO_TABLE"]

    unidade_info = next(
        (
            u
            for u in db_data.get(unidades_table, [])
            if u.get("NumeroDaUcLead") == uc_id
        ),
        None,
    )
    if not unidade_info:
        return jsonify({"erro": "Unidade não encontrada para validação."}), 404

    try:
        for mes_data in dados_meses:
            validar_regras_tarifacao(unidade_info, mes_data)
    except ValueError as e:
        return jsonify({"erro": f"Regra de negócio violada: {e}"}), 400

    # Simula a transação DELETE + INSERT
    start_id, end_id = int(ano) * 100 + 1, int(ano) * 100 + 12
    historico_atual = db_data.get(historico_table, [])

    # Mantém apenas os registros que NÃO estão no intervalo a ser atualizado
    historico_atualizado = [
        h
        for h in historico_atual
        if not (
            h.get("NumeroDaUcLead") == uc_id
            and start_id <= int(str(h.get("IDMes")).replace("-", "")) <= end_id
        )
    ]

    # Adiciona os novos registros
    novos_registros = []
    for mes_data in dados_meses:
        novo_registro = mes_data.copy()
        novo_registro["NumeroDaUcLead"] = uc_id
        novo_registro["IDMes"] = int(str(mes_data.get("IDMes")).replace("-", ""))
        novo_registro["DataRegistroHistorico"] = datetime.now().isoformat()
        novos_registros.append(novo_registro)

    historico_atualizado.extend(novos_registros)
    db_data[historico_table] = historico_atualizado

    write_data(db_data)
    return jsonify({"sucesso": f"Histórico para o ano {ano} salvo com sucesso!"})
