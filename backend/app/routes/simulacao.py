# backend/app/routes/simulacao.py (VERSÃO REFATORADA PARA JSON)

from flask import Blueprint, jsonify, request, current_app
from ..database import read_data  # <-- IMPORTA A NOVA FUNÇÃO!
from ..services.simulation_service import realizar_calculo_simulacao
from datetime import datetime
from dateutil.relativedelta import relativedelta

bp = Blueprint("simulacao", __name__, url_prefix="/api")


@bp.route("/simulacao/calcular", methods=["POST"])
def calcular_simulacao_acr():
    data = request.json
    try:
        data_inicio_obj = datetime.strptime(data.get("data_inicio"), "%d/%m/%Y")
        data_fim_obj = datetime.strptime(data.get("data_fim"), "%d/%m/%Y")
        delta = relativedelta(data_fim_obj, data_inicio_obj)
        duracao_meses = delta.years * 12 + delta.months + 1
    except (TypeError, ValueError):
        return jsonify({"erro": "Formato de data inválido. Use dd/mm/yyyy."}), 400

    # Lê todos os dados do nosso "banco" JSON
    db_data = read_data()

    try:
        dados_para_calculo = {
            "tipo": data.get("tipo", "cliente"),
            "data_inicio_obj": data_inicio_obj,
            "duracao_meses": duracao_meses,
        }

        if dados_para_calculo["tipo"] == "cliente":
            uc_id = data.get("uc_id")
            if not uc_id:
                return jsonify({"erro": "ID da Unidade é obrigatório."}), 400

            unidades_table = current_app.config["UNIDADES_TABLE"]
            historico_table = current_app.config["HISTORICO_TABLE"]

            # Simula 'SELECT * FROM Unidades WHERE NumeroDaUcLead = ?'
            unidade_info = next(
                (
                    unidade
                    for unidade in db_data.get(unidades_table, [])
                    if unidade.get("NumeroDaUcLead") == uc_id
                ),
                None,
            )

            if not unidade_info:
                return jsonify({"erro": "Unidade não encontrada."}), 404

            dados_para_calculo["aliquota_icms"] = unidade_info.get("AliquotaICMS")

            # Simula 'SELECT * FROM Historico WHERE NumeroDaUcLead = ?'
            historico = [
                h
                for h in db_data.get(historico_table, [])
                if h.get("NumeroDaUcLead") == uc_id
            ]

            if not historico:
                return (
                    jsonify({"erro": "Nenhum histórico de consumo para esta unidade."}),
                    404,
                )

            dados_para_calculo["historico"] = historico
        else:  # tipo 'lead'
            dados_para_calculo["consumo_estimado"] = data.get("consumo_estimado")
            dados_para_calculo["demanda_estimada"] = data.get("demanda_estimada")
            dados_para_calculo["aliquota_icms"] = 17.0  # Valor padrão para leads

        # A chamada ao serviço de cálculo permanece a mesma!
        resultados = realizar_calculo_simulacao(dados_para_calculo)

        if resultados is None:
            return jsonify({"erro": "Não foi possível calcular a simulação."}), 400

        return jsonify(resultados)

    except Exception as e:
        return jsonify({"erro": f"Ocorreu um erro interno: {e}"}), 500


@bp.route("/dashboard_data", methods=["POST"])
def get_dashboard_data():
    data_req = request.json
    try:
        data_inicio_obj = datetime.strptime(data_req.get("data_inicio"), "%d/%m/%Y")
        data_fim_obj = datetime.strptime(data_req.get("data_fim"), "%d/%m/%Y")
        delta = relativedelta(data_fim_obj, data_inicio_obj)
        duracao_meses = delta.years * 12 + delta.months + 1
    except (TypeError, ValueError):
        return jsonify({"erro": "Formato de data inválido."}), 400

    db_data = read_data()

    try:
        uc_id = data_req.get("uc_id")

        unidades_table = current_app.config["UNIDADES_TABLE"]
        historico_table = current_app.config["HISTORICO_TABLE"]

        # Simula 'SELECT * FROM Unidades WHERE NumeroDaUcLead = ?'
        unidade_info = next(
            (
                unidade
                for unidade in db_data.get(unidades_table, [])
                if unidade.get("NumeroDaUcLead") == uc_id
            ),
            None,
        )

        if not unidade_info:
            return jsonify({"erro": "Unidade não encontrada."}), 404

        # Simula 'SELECT * FROM Historico WHERE NumeroDaUcLead = ?'
        historico = [
            h
            for h in db_data.get(historico_table, [])
            if h.get("NumeroDaUcLead") == uc_id
        ]

        if not historico:
            return jsonify({"erro": "Nenhum histórico encontrado."}), 404

        dados_cativo = {
            "tipo": "cliente",
            "data_inicio_obj": data_inicio_obj,
            "duracao_meses": duracao_meses,
            "aliquota_icms": unidade_info.get("AliquotaICMS"),
            "historico": historico,
        }

        cativo_results = realizar_calculo_simulacao(dados_cativo)

        if cativo_results is None:
            return (
                jsonify(
                    {"erro": "Não foi possível calcular os dados para o dashboard."}
                ),
                400,
            )

        # A lógica de cálculo do dashboard permanece a mesma
        desconto_livre = 0.85
        custo_total_cativo = cativo_results["totais"]["custo_total_periodo"]
        custo_total_livre = custo_total_cativo * desconto_livre

        dashboard_data = {
            "custo_atual": custo_total_cativo,
            "custo_simulado": custo_total_livre,
            "economia_reais": custo_total_cativo - custo_total_livre,
            "economia_percentual": (1 - desconto_livre) * 100,
            "detalhes_mensais": [
                {
                    "mes": mes["mes"],
                    "custoAtual": mes["custo_total_mes"],
                    "custoSimulado": mes["custo_total_mes"] * desconto_livre,
                    "economia": mes["custo_total_mes"]
                    - (mes["custo_total_mes"] * desconto_livre),
                }
                for mes in cativo_results["detalhes_mensais"]
            ],
        }
        return jsonify(dashboard_data)

    except Exception as e:
        return jsonify({"erro": f"Ocorreu um erro interno no dashboard: {e}"}), 500
