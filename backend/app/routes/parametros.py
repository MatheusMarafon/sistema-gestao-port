from flask import Blueprint, jsonify, request
from app.database import get_db_connection
from app.utils import row_to_dict, to_float, to_int
from config import Config
import pyodbc
from datetime import datetime

bp = Blueprint("parametros", __name__, url_prefix="/api/parametros")


@bp.route("", methods=["GET"])
def get_all_parametros():
    conn = get_db_connection()
    if not conn:
        return jsonify({"erro": "Falha na conexão com o banco de dados."}), 500
    try:
        cursor = conn.cursor()

        cursor.execute(f"SELECT * FROM [{Config.PARAM_CLIENTES_TABLE}]")
        param_clientes = [row_to_dict(cursor, row) for row in cursor.fetchall()]

        cursor.execute(f"SELECT TOP 1 * FROM [{Config.PARAM_SIMULACAO_TABLE}]")
        row = cursor.fetchone()
        param_simulacao = row_to_dict(cursor, row) if row else {}

        cursor.execute(
            f"SELECT * FROM [{Config.PARAM_PRECOS_ANO_TABLE}] ORDER BY Ano DESC"
        )
        param_precos_ano = [row_to_dict(cursor, row) for row in cursor.fetchall()]

        cursor.execute(
            f"SELECT * FROM [{Config.PARAM_CUSTOS_MES_TABLE}] ORDER BY MesRef DESC"
        )
        param_custos_mes = [row_to_dict(cursor, row) for row in cursor.fetchall()]

        return jsonify(
            {
                "clientes": param_clientes,
                "simulacao_geral": param_simulacao,
                "precos_ano": param_precos_ano,
                "custos_mes": param_custos_mes,
            }
        )
    except pyodbc.Error as ex:
        return jsonify({"erro": f"Erro de banco de dados: {ex}"}), 500
    finally:
        if conn:
            conn.close()


@bp.route("/ajuste-ipca", methods=["GET", "POST"])
def handle_ajuste_ipca():
    conn = get_db_connection()
    if not conn:
        return jsonify({"erro": "Falha na conexão."}), 500
    try:
        cursor = conn.cursor()
        if request.method == "POST":
            data = request.json
            if not data.get("Ano") or data.get("PctIPCA") is None:
                return jsonify({"erro": "Ano e Percentual são obrigatórios."}), 400
            sql = (
                f"INSERT INTO [{Config.AJUSTE_IPCA_TABLE}] (Ano, PctIPCA) VALUES (?, ?)"
            )
            cursor.execute(sql, int(data.get("Ano")), to_float(data.get("PctIPCA")))
            conn.commit()
            return jsonify({"sucesso": "Ajuste IPCA adicionado com sucesso!"}), 201

        cursor.execute(f"SELECT * FROM [{Config.AJUSTE_IPCA_TABLE}] ORDER BY Ano DESC")
        return jsonify([row_to_dict(cursor, row) for row in cursor.fetchall()])
    except pyodbc.Error as ex:
        return jsonify({"erro": f"Erro de banco de dados: {ex}"}), 500
    finally:
        if conn:
            conn.close()


@bp.route("/ajuste-ipca/<int:ano>", methods=["PUT"])
def update_ajuste_ipca(ano):
    conn = get_db_connection()
    if not conn:
        return jsonify({"erro": "Falha na conexão."}), 500
    try:
        data = request.json
        pct_ipca = data.get("PctIPCA")
        if pct_ipca is None:
            return jsonify({"erro": "Percentual é obrigatório."}), 400

        sql = f"UPDATE [{Config.AJUSTE_IPCA_TABLE}] SET PctIPCA = ? WHERE Ano = ?"
        cursor = conn.cursor()
        cursor.execute(sql, to_float(pct_ipca), ano)
        conn.commit()
        if cursor.rowcount == 0:
            return (
                jsonify({"erro": "Nenhum registro encontrado para o ano fornecido."}),
                404,
            )
        return jsonify({"sucesso": "Ajuste IPCA atualizado com sucesso!"})
    except pyodbc.Error as ex:
        return jsonify({"erro": f"Erro de banco de dados: {ex}"}), 500
    finally:
        if conn:
            conn.close()


@bp.route("/distribuidoras", methods=["GET"])
def get_distribuidoras():
    conn = get_db_connection()
    if not conn:
        return jsonify({"erro": "Falha na conexão."}), 500
    try:
        cursor = conn.cursor()
        cursor.execute(
            f"SELECT DISTINCT CnpjDistribuidora FROM [{Config.AJUSTE_TARIFA_TABLE}] ORDER BY CnpjDistribuidora"
        )
        data = [row[0] for row in cursor.fetchall() if row[0] is not None]
        return jsonify(data)
    except pyodbc.Error as ex:
        return jsonify({"erro": f"Erro de banco de dados: {ex}"}), 500
    finally:
        if conn:
            conn.close()


@bp.route("/ajuste-tarifa/<path:cnpj_distribuidora>", methods=["GET"])
def get_ajuste_tarifa_por_cnpj(cnpj_distribuidora):
    conn = get_db_connection()
    if not conn:
        return jsonify({"erro": "Falha na conexão."}), 500
    try:
        cursor = conn.cursor()
        cursor.execute(
            f"SELECT * FROM [{Config.AJUSTE_TARIFA_TABLE}] WHERE CnpjDistribuidora = ? ORDER BY Ano DESC",
            cnpj_distribuidora,
        )
        data = [row_to_dict(cursor, row) for row in cursor.fetchall()]
        return jsonify(data)
    except pyodbc.Error as ex:
        return jsonify({"erro": f"Erro de banco de dados: {ex}"}), 500
    finally:
        if conn:
            conn.close()


@bp.route("/ajuste-tarifa/<path:cnpj>/<int:ano>", methods=["PUT"])
def update_ajuste_tarifa(cnpj, ano):
    conn = get_db_connection()
    if not conn:
        return jsonify({"erro": "Falha na conexão."}), 500
    try:
        data = request.json
        sql = f"""UPDATE [{Config.AJUSTE_TARIFA_TABLE}] SET 
                  PctTusdkWP = ?, PctTusdkWFP = ?, PctTusdMWhP = ?, PctTusdMWhFP = ?, 
                  PctTEMWhP = ?, PctTEMWhFP = ?
                  WHERE CnpjDistribuidora = ? AND Ano = ?"""
        params = (
            to_float(data.get("PctTusdkWP")),
            to_float(data.get("PctTusdkWFP")),
            to_float(data.get("PctTusdMWhP")),
            to_float(data.get("PctTusdMWhFP")),
            to_float(data.get("PctTEMWhP")),
            to_float(data.get("PctTEMWhFP")),
            cnpj,
            ano,
        )
        cursor = conn.cursor()
        cursor.execute(sql, params)
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({"erro": "Registro não encontrado."}), 404
        return jsonify({"sucesso": "Ajuste de tarifa atualizado!"})
    except pyodbc.Error as e:
        return jsonify({"erro": str(e)}), 500
    finally:
        if conn:
            conn.close()


@bp.route("/geracao", methods=["GET"])
def get_dados_geracao():
    conn = get_db_connection()
    if not conn:
        return jsonify({"erro": "Falha na conexão."}), 500
    try:
        cursor = conn.cursor()
        cursor.execute(f"SELECT * FROM [{Config.DADOS_GERACAO_TABLE}]")
        dados_geracao = [row_to_dict(cursor, row) for row in cursor.fetchall()]
        cursor.execute(
            f"SELECT * FROM [{Config.CURVA_GERACAO_TABLE}] ORDER BY IdMes DESC"
        )
        curva_geracao = [row_to_dict(cursor, row) for row in cursor.fetchall()]
        return jsonify({"dados_geracao": dados_geracao, "curva_geracao": curva_geracao})
    except pyodbc.Error as ex:
        return jsonify({"erro": f"Erro de banco de dados: {ex}"}), 500
    finally:
        if conn:
            conn.close()


@bp.route("/preco-mwh/<int:ano>/<string:fonte>", methods=["PUT"])
def update_preco_mwh(ano, fonte):
    conn = get_db_connection()
    if not conn:
        return jsonify({"erro": "Falha na conexão."}), 500
    try:
        data = request.json
        sql = f"""UPDATE [{Config.PARAM_PRECOS_ANO_TABLE}] SET PrecoRS_MWh = ?, Corrigir = ? 
                  WHERE Ano = ? AND Fonte = ?"""
        params = (to_float(data.get("PrecoRS_MWh")), data.get("Corrigir"), ano, fonte)
        cursor = conn.cursor()
        cursor.execute(sql, params)
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({"erro": "Nenhum registro encontrado para atualizar."}), 404
        return jsonify({"sucesso": "Preço MWh atualizado com sucesso!"})
    except pyodbc.Error as ex:
        return jsonify({"erro": f"Erro de banco de dados: {ex}"}), 500
    finally:
        if conn:
            conn.close()


@bp.route("/custos-mes/<string:mes_ref>", methods=["PUT"])
def update_custos_mes(mes_ref):
    conn = get_db_connection()
    if not conn:
        return jsonify({"erro": "Falha na conexão."}), 500
    try:
        data = request.json
        mes_ref_obj = datetime.strptime(mes_ref, "%Y-%m-%d")
        sql = f"""UPDATE [{Config.PARAM_CUSTOS_MES_TABLE}] SET 
                  LiqMCPACL = ?, LiqMCPAPE = ?, LiqEnerReserva = ?, LiqRCAP = ?, 
                  SpreadVenda = ?, ModelagemMes = ? WHERE MesRef = ?"""
        params = (
            to_float(data.get("LiqMCPACL")),
            to_float(data.get("LiqMCPAPE")),
            to_float(data.get("LiqEnerReserva")),
            to_float(data.get("LiqRCAP")),
            to_float(data.get("SpreadVenda")),
            to_float(data.get("ModelagemMes")),
            mes_ref_obj,
        )
        cursor = conn.cursor()
        cursor.execute(sql, params)
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({"erro": "Nenhum registro encontrado para atualizar."}), 404
        return jsonify({"sucesso": "Custos do mês atualizados com sucesso!"})
    except (pyodbc.Error, ValueError) as e:
        return (
            jsonify({"erro": f"Erro na base de dados ou formato de dados: {str(e)}"}),
            500,
        )
    finally:
        if conn:
            conn.close()


@bp.route("/dados-geracao/<string:fonte>/<string:local>", methods=["PUT"])
def update_dados_geracao(fonte, local):
    conn = get_db_connection()
    if not conn:
        return jsonify({"erro": "Falha na conexão."}), 500
    try:
        data = request.json
        sql = f"""UPDATE [{Config.DADOS_GERACAO_TABLE}] SET VolumeMWhAno = ?, PrecoRS_MWh = ? 
                  WHERE Fonte = ? AND Local = ?"""
        params = (
            to_float(data.get("VolumeMWhAno")),
            to_float(data.get("PrecoRS_MWh")),
            fonte,
            local,
        )
        cursor = conn.cursor()
        cursor.execute(sql, params)
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({"erro": "Registro não encontrado."}), 404
        return jsonify({"sucesso": "Dados de geração atualizados!"})
    except pyodbc.Error as e:
        return jsonify({"erro": str(e)}), 500
    finally:
        if conn:
            conn.close()


@bp.route("/curva-geracao/<int:id_mes>/<string:fonte>/<string:local>", methods=["PUT"])
def update_curva_geracao(id_mes, fonte, local):
    conn = get_db_connection()
    if not conn:
        return jsonify({"erro": "Falha na conexão."}), 500
    try:
        data = request.json
        sql = f"""UPDATE [{Config.CURVA_GERACAO_TABLE}] SET PctSazonalizacaoMes = ?
                  WHERE IdMes = ? AND Fonte = ? AND Local = ?"""
        params = (to_float(data.get("PctSazonalizacaoMes")), id_mes, fonte, local)
        cursor = conn.cursor()
        cursor.execute(sql, params)
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({"erro": "Registro não encontrado."}), 404
        return jsonify({"sucesso": "Curva de sazonalização atualizada!"})
    except pyodbc.Error as e:
        return jsonify({"erro": str(e)}), 500
    finally:
        if conn:
            conn.close()


@bp.route("/simulacao", methods=["POST"])
def save_parametros_simulacao():
    conn = get_db_connection()
    if not conn:
        return jsonify({"erro": "Falha na conexão."}), 500
    try:
        data = request.json
        cliente_data = data.get("cliente_params")
        gerais_data = data.get("gerais_params")
        cursor = conn.cursor()

        if cliente_data and cliente_data.get("Cliente"):
            data_inicial_obj = (
                datetime.strptime(cliente_data.get("DataInicialSimula"), "%d/%m/%Y")
                if cliente_data.get("DataInicialSimula")
                else None
            )
            data_final_obj = (
                datetime.strptime(cliente_data.get("DataFinalSimula"), "%d/%m/%Y")
                if cliente_data.get("DataFinalSimula")
                else None
            )
            sql_cliente = f"""UPDATE [{Config.PARAM_CLIENTES_TABLE}] SET
                              DataInicialSimula = ?, DataFinalSimula = ?, TipoGeracao = ?, IncluirGrupoB = ?
                              WHERE Cliente = ?"""
            params_cliente = (
                data_inicial_obj,
                data_final_obj,
                cliente_data.get("TipoGeracao"),
                bool(cliente_data.get("IncluirGrupoB")),
                cliente_data.get("Cliente"),
            )
            cursor.execute(sql_cliente, params_cliente)

        if gerais_data:
            sql_gerais = f"""UPDATE [{Config.PARAM_SIMULACAO_TABLE}] SET
                             Pis = ?, Cofins = ?, PctCustoGarantia = ?, MesesGarantia = ?,
                             Perdas = ?, FonteEnergiaBase = ?, PrecoDiesel = ?, RendimentoGerador = ?"""
            params_gerais = (
                to_float(gerais_data.get("Pis")),
                to_float(gerais_data.get("Cofins")),
                to_float(gerais_data.get("PctCustoGarantia")),
                to_int(gerais_data.get("MesesGarantia")),
                to_float(gerais_data.get("Perdas")),
                gerais_data.get("FonteEnergiaBase"),
                to_float(gerais_data.get("PrecoDiesel")),
                to_float(gerais_data.get("RendimentoGerador")),
            )
            cursor.execute(sql_gerais, params_gerais)

        conn.commit()
        return jsonify({"sucesso": "Parâmetros de simulação salvos com sucesso!"})

    except (pyodbc.Error, ValueError) as e:
        conn.rollback()
        return jsonify({"erro": f"Ocorreu um erro inesperado: {e}"}), 500
    finally:
        if conn:
            conn.close()
