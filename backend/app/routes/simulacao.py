from flask import Blueprint, jsonify, request
from app.database import get_db_connection
from app.utils import row_to_dict
from app.services.simulation_service import realizar_calculo_simulacao
from config import Config
from datetime import datetime
from dateutil.relativedelta import relativedelta
import pyodbc

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

    conn = get_db_connection()
    if not conn:
        return jsonify({"erro": "Falha na conexão com o banco de dados."}), 500

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

            cursor = conn.cursor()
            cursor.execute(
                f"SELECT * FROM [{Config.UNIDADES_TABLE}] WHERE NumeroDaUcLead = ?",
                uc_id,
            )
            unidade_info = row_to_dict(cursor, cursor.fetchone())
            if not unidade_info:
                return jsonify({"erro": "Unidade não encontrada."}), 404

            dados_para_calculo["aliquota_icms"] = unidade_info.get("AliquotaICMS")

            cursor.execute(
                f"SELECT * FROM [{Config.HISTORICO_TABLE}] WHERE NumeroDaUcLead = ?",
                uc_id,
            )
            historico = [row_to_dict(cursor, r) for r in cursor.fetchall()]
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

        resultados = realizar_calculo_simulacao(dados_para_calculo)
        if resultados is None:
            return jsonify({"erro": "Não foi possível calcular a simulação."}), 400

        return jsonify(resultados)

    except pyodbc.Error as e:
        return jsonify({"erro": f"Erro de banco de dados: {e}"}), 500
    except Exception as e:
        return jsonify({"erro": f"Ocorreu um erro interno: {e}"}), 500
    finally:
        if conn:
            conn.close()


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

    conn = get_db_connection()
    if not conn:
        return jsonify({"erro": "Falha na conexão."}), 500

    try:
        uc_id = data_req.get("uc_id")
        cursor = conn.cursor()
        cursor.execute(
            f"SELECT * FROM [{Config.UNIDADES_TABLE}] WHERE NumeroDaUcLead = ?", uc_id
        )
        unidade_info = row_to_dict(cursor, cursor.fetchone())
        if not unidade_info:
            return jsonify({"erro": "Unidade não encontrada."}), 404

        cursor.execute(
            f"SELECT * FROM [{Config.HISTORICO_TABLE}] WHERE NumeroDaUcLead = ?", uc_id
        )
        historico = [row_to_dict(cursor, r) for r in cursor.fetchall()]
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
    finally:
        if conn:
            conn.close()
