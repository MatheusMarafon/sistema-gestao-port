from flask import Blueprint, jsonify, request
from app.database import get_db_connection
from app.utils import (
    row_to_dict,
    to_float,
)  # Garante que 'to_float' está a ser importado
from config import Config
import pyodbc
from datetime import datetime
from app.services.validation_service import validar_regras_tarifacao

bp = Blueprint("unidades", __name__, url_prefix="/api")


@bp.route("/leads/<path:lead_id>/unidades", methods=["GET", "POST"])
def handle_unidades_by_lead(lead_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({"erro": "Falha na conexão."}), 500

    try:
        cursor = conn.cursor()
        if request.method == "GET":
            cursor.execute(
                f"SELECT * FROM [{Config.UNIDADES_TABLE}] WHERE Cpf_CnpjLead = ?",
                lead_id,
            )
            return jsonify([row_to_dict(cursor, row) for row in cursor.fetchall()])

        if request.method == "POST":
            data = request.json
            if not data.get("NumeroDaUcLead"):
                return jsonify({"erro": "O Nº da UC é obrigatório"}), 400

            validar_regras_tarifacao(data, data)

            sql = f"""INSERT INTO [{Config.UNIDADES_TABLE}] 
                      (Cpf_CnpjLead, NumeroDaUcLead, CnpjDistribuidora, CnpjDaUnidadeConsumidora, NomeDaUnidade, 
                       Logradouro, Numero, Complemento, Bairro, Uf, Cidade, Cep, MercadoAtual, SubgrupoTarifario, Tarifa, 
                       AliquotaICMS, AplicaContaEHidrica, LiminarICMSDemanda, LiminarICMSTusd, BeneficioRuralIrrigacao, 
                       RuralOuSazoReconhecida, SaldoMaisRecenteSCEE, PossuiUsina, DataRegistroUC) 
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"""

            params = (
                lead_id,
                data.get("NumeroDaUcLead"),
                data.get("CnpjDistribuidora"),
                data.get("CnpjDaUnidadeConsumidora"),
                data.get("NomeDaUnidade"),
                data.get("Logradouro"),
                data.get("Numero"),
                data.get("Complemento"),
                data.get("Bairro"),
                data.get("Uf"),
                # --- CORREÇÃO DE TIPO DE DADOS ---
                to_float(data.get("Cidade")),
                data.get("Cep"),
                data.get("MercadoAtual"),
                data.get("SubgrupoTarifario"),
                data.get("Tarifa"),
                to_float(data.get("AliquotaICMS")),
                data.get("AplicaContaEHidrica"),
                data.get("LiminarICMSDemanda"),
                data.get("LiminarICMSTusd"),
                to_float(data.get("BeneficioRuralIrrigacao")),
                data.get("RuralOuSazoReconhecida"),
                to_float(data.get("SaldoMaisRecenteSCEE")),
                bool(data.get("PossuiUsina")),
                datetime.now(),
            )
            cursor.execute(sql, params)
            conn.commit()
            return jsonify({"sucesso": "Unidade criada com sucesso!"}), 201

    except ValueError as e:
        return jsonify({"erro": f"Regra de negócio violada: {e}"}), 400
    except pyodbc.IntegrityError:
        return (
            jsonify({"erro": "Já existe uma unidade com este número para este lead."}),
            409,
        )
    except pyodbc.Error as ex:
        return jsonify({"erro": f"Erro de banco de dados: {ex}"}), 500
    finally:
        if conn:
            conn.close()


@bp.route("/unidade/<path:uc_id>", methods=["GET"])
def get_unidade_by_id(uc_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({"erro": "Falha na conexão."}), 500
    try:
        cursor = conn.cursor()
        cursor.execute(
            f"SELECT * FROM [{Config.UNIDADES_TABLE}] WHERE NumeroDaUcLead = ?", uc_id
        )
        unidade_row = cursor.fetchone()
        if not unidade_row:
            return jsonify({"erro": "Unidade Consumidora não encontrada."}), 404
        return jsonify(row_to_dict(cursor, unidade_row))
    except pyodbc.Error as e:
        return jsonify({"erro": f"Ocorreu um erro interno: {e}"}), 500
    finally:
        if conn:
            conn.close()


@bp.route("/unidades/<path:uc_id_original>", methods=["PUT", "DELETE"])
def update_or_delete_unidade(uc_id_original):
    conn = get_db_connection()
    if not conn:
        return jsonify({"erro": "Falha na conexão."}), 500
    try:
        cursor = conn.cursor()
        data = request.json
        if request.method == "PUT":
            validar_regras_tarifacao(data, data)
            sql = f"""UPDATE [{Config.UNIDADES_TABLE}] SET 
                        NumeroDaUcLead = ?, CnpjDistribuidora = ?, CnpjDaUnidadeConsumidora = ?, NomeDaUnidade = ?, 
                        Logradouro = ?, Numero = ?, Complemento = ?, Bairro = ?, Uf = ?, Cidade = ?, Cep = ?, 
                        MercadoAtual = ?, SubgrupoTarifario = ?, Tarifa = ?, AliquotaICMS = ?, AplicaContaEHidrica = ?, 
                        LiminarICMSDemanda = ?, LiminarICMSTusd = ?, BeneficioRuralIrrigacao = ?, RuralOuSazoReconhecida = ?, 
                        SaldoMaisRecenteSCEE = ?, PossuiUsina = ? WHERE NumeroDaUcLead = ? AND Cpf_CnpjLead = ?"""
            params = (
                data.get("NumeroDaUcLead"),
                data.get("CnpjDistribuidora"),
                data.get("CnpjDaUnidadeConsumidora"),
                data.get("NomeDaUnidade"),
                data.get("Logradouro"),
                data.get("Numero"),
                data.get("Complemento"),
                data.get("Bairro"),
                data.get("Uf"),
                # --- CORREÇÃO DE TIPO DE DADOS ---
                to_float(data.get("Cidade")),
                data.get("Cep"),
                data.get("MercadoAtual"),
                data.get("SubgrupoTarifario"),
                data.get("Tarifa"),
                to_float(data.get("AliquotaICMS")),
                data.get("AplicaContaEHidrica"),
                data.get("LiminarICMSDemanda"),
                data.get("LiminarICMSTusd"),
                to_float(data.get("BeneficioRuralIrrigacao")),
                data.get("RuralOuSazoReconhecida"),
                to_float(data.get("SaldoMaisRecenteSCEE")),
                bool(data.get("PossuiUsina")),
                uc_id_original,
                data.get("Cpf_CnpjLead"),
            )
            cursor.execute(sql, params)
            conn.commit()
            if cursor.rowcount == 0:
                return (
                    jsonify({"erro": "Nenhuma unidade encontrada para atualizar."}),
                    404,
                )
            return jsonify({"sucesso": "Unidade atualizada com sucesso!"})

        if request.method == "DELETE":
            lead_id = data.get("Cpf_CnpjLead")
            if not lead_id:
                return (
                    jsonify({"erro": "CPF/CNPJ do lead é necessário para exclusão."}),
                    400,
                )

            cursor.execute(
                f"DELETE FROM [{Config.HISTORICO_TABLE}] WHERE NumeroDaUcLead = ?",
                uc_id_original,
            )
            cursor.execute(
                f"DELETE FROM [{Config.UNIDADES_TABLE}] WHERE NumeroDaUcLead = ? AND Cpf_CnpjLead = ?",
                uc_id_original,
                lead_id,
            )
            conn.commit()
            if cursor.rowcount == 0:
                return (
                    jsonify(
                        {
                            "erro": "Unidade não encontrada ou não pertence ao lead informado."
                        }
                    ),
                    404,
                )
            return jsonify({"sucesso": "Unidade e seu histórico foram excluídos."})

    except ValueError as e:
        return jsonify({"erro": f"Regra de negócio violada: {e}"}), 400
    except pyodbc.Error as e:
        return jsonify({"erro": f"Erro de banco de dados: {e}"}), 500
    finally:
        if conn:
            conn.close()


@bp.route("/unidades/<path:uc_id>/historico", methods=["GET"])
def get_all_historico(uc_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({"erro": "Falha na conexão."}), 500
    try:
        cursor = conn.cursor()
        query = f"SELECT * FROM [{Config.HISTORICO_TABLE}] WHERE TRIM(NumeroDaUcLead) = ? ORDER BY IDMes DESC"
        cursor.execute(query, uc_id)
        historico = [row_to_dict(cursor, r) for r in cursor.fetchall()]
        for item in historico:
            if item.get("IDMes"):
                id_mes_str = str(item["IDMes"])
                if len(id_mes_str) == 6:
                    item["IDMes"] = f"{id_mes_str[:4]}-{id_mes_str[4:]}"
        return jsonify(historico)
    except pyodbc.Error as ex:
        return jsonify({"erro": f"Erro de banco de dados: {ex}"}), 500
    finally:
        if conn:
            conn.close()


@bp.route("/unidades/<path:uc_id>/historico/<int:ano>", methods=["GET"])
def get_historico_by_year(uc_id, ano):
    conn = get_db_connection()
    if not conn:
        return jsonify({"erro": "Falha na conexão."}), 500
    try:
        cursor = conn.cursor()
        start_idmes = ano * 100 + 1
        end_idmes = ano * 100 + 12
        query = f"SELECT * FROM [{Config.HISTORICO_TABLE}] WHERE NumeroDaUcLead = ? AND IDMes >= ? AND IDMes <= ? ORDER BY IDMes ASC"
        cursor.execute(query, uc_id, start_idmes, end_idmes)
        historico = [row_to_dict(cursor, r) for r in cursor.fetchall()]
        for item in historico:
            if item.get("IDMes"):
                id_mes_str = str(item["IDMes"])
                if len(id_mes_str) == 6:
                    item["IDMes"] = f"{id_mes_str[:4]}-{id_mes_str[4:]}"
        return jsonify(historico)
    except pyodbc.Error as ex:
        return jsonify({"erro": f"Erro de banco de dados: {ex}"}), 500
    finally:
        if conn:
            conn.close()


@bp.route("/unidades/<path:uc_id>/historico/batch", methods=["POST"])
def batch_update_historico(uc_id):
    data = request.json
    ano = data.get("ano")
    dados_meses = data.get("dados")

    if not ano or dados_meses is None:
        return jsonify({"erro": "Ano e dados do histórico são obrigatórios."}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({"erro": "Falha na conexão."}), 500

    try:
        cursor = conn.cursor()
        cursor.execute(
            f"SELECT * FROM [{Config.UNIDADES_TABLE}] WHERE NumeroDaUcLead = ?", uc_id
        )
        unidade_info = row_to_dict(cursor, cursor.fetchone())
        if not unidade_info:
            return jsonify({"erro": "Unidade não encontrada para validação."}), 404

        for mes_data in dados_meses:
            validar_regras_tarifacao(unidade_info, mes_data)

        conn.autocommit = False
        start_id, end_id = int(ano) * 100 + 1, int(ano) * 100 + 12
        cursor.execute(
            f"DELETE FROM [{Config.HISTORICO_TABLE}] WHERE NumeroDaUcLead = ? AND IDMes >= ? AND IDMes <= ?",
            uc_id,
            start_id,
            end_id,
        )

        insert_sql = f"""INSERT INTO [{Config.HISTORICO_TABLE}] 
                         (NumeroDaUcLead, IDMes, DemandaCP, DemandaCFP, DemandaCG, kWProjPonta, kWProjForaPonta, kWhProjPonta, 
                          kWhProjForaPonta, kWhProjHRes, kWhProjPontaG, kWhProjForaPontaG, kWProjG, kWhProjDieselP, 
                          kWhCompensadoP, kWhCompensadoFP, kWhCompensadoHr, kWGeracaoProjetada, DataRegistroHistorico) 
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"""

        for mes_data in dados_meses:
            params = (
                uc_id,
                int(str(mes_data.get("IDMes")).replace("-", "")),
                to_float(mes_data.get("DemandaCP")),
                to_float(mes_data.get("DemandaCFP")),
                to_float(mes_data.get("DemandaCG")),
                to_float(mes_data.get("kWProjPonta")),
                to_float(mes_data.get("kWProjForaPonta")),
                to_float(mes_data.get("kWhProjPonta")),
                to_float(mes_data.get("kWhProjForaPonta")),
                to_float(mes_data.get("kWhProjHRes")),
                to_float(mes_data.get("kWhProjPontaG")),
                to_float(mes_data.get("kWhProjForaPontaG")),
                to_float(mes_data.get("kWProjG")),
                to_float(mes_data.get("kWhProjDieselP")),
                to_float(mes_data.get("kWhCompensadoP")),
                to_float(mes_data.get("kWhCompensadoFP")),
                to_float(mes_data.get("kWhCompensadoHr")),
                to_float(mes_data.get("kWGeracaoProjetada")),
                datetime.now(),
            )
            cursor.execute(insert_sql, params)

        conn.commit()
        return jsonify({"sucesso": f"Histórico para o ano {ano} salvo com sucesso!"})

    except Exception as e:
        conn.rollback()
        print(f"[ERRO CRÍTICO EM BATCH UPDATE]: {e}")
        return jsonify({"erro": f"Ocorreu um erro inesperado no servidor: {e}"}), 500
    finally:
        if conn:
            conn.autocommit = True
            conn.close()
