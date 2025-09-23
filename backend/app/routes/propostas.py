from flask import Blueprint, jsonify, request
from app.database import get_db_connection
from app.utils import row_to_dict
from config import Config
import pyodbc
from datetime import datetime

bp = Blueprint("propostas", __name__, url_prefix="/api/propostas")


@bp.route("", methods=["GET", "POST"])
def handle_propostas():
    conn = get_db_connection()
    if not conn:
        return jsonify({"erro": "Falha na conexão com o banco de dados."}), 500

    try:
        cursor = conn.cursor()
        if request.method == "GET":
            filtro = request.args.get("filtro", "")
            query = f"""
                SELECT p.NProposta, p.AgenteDeVenda, p.StatusNegociacao, p.DataStatusNegociacao, 
                       p.RazaoSocialLead, o.Usuario, cp.NomeContato 
                FROM (([{Config.PROPOSTA_TABLE}] AS p
                LEFT JOIN [{Config.OBSERVACOES_TABLE}] AS o ON p.NProposta = o.IdProposta)
                LEFT JOIN [{Config.CONTATO_PROPOSTA_TABLE}] as cp ON p.NProposta = cp.IdProposta)
            """
            params = []
            if filtro:
                query += " WHERE p.RazaoSocialLead LIKE ? OR p.AgenteDeVenda LIKE ? OR p.StatusNegociacao LIKE ? OR cp.NomeContato LIKE ? OR CStr(p.NProposta) LIKE ?"
                filtro_param = f"%{filtro}%"
                params.extend(
                    [
                        filtro_param,
                        filtro_param,
                        filtro_param,
                        filtro_param,
                        f"{filtro}%",
                    ]
                )
            query += " ORDER BY p.NProposta DESC"
            cursor.execute(query, params)
            return jsonify([row_to_dict(cursor, row) for row in cursor.fetchall()])

        if request.method == "POST":
            data = request.json
            required_fields = ["Cpf_CnpjLead", "NumeroDaUcLead"]
            if not all(field in data and data[field] for field in required_fields):
                return (
                    jsonify({"erro": "Lead e Unidade Consumidora são obrigatórios."}),
                    400,
                )

            cursor.execute(f"SELECT MAX(NProposta) FROM [{Config.PROPOSTA_TABLE}]")
            max_n_proposta = cursor.fetchone()[0]
            next_n_proposta = 1 if max_n_proposta is None else int(max_n_proposta) + 1
            id_proposta_texto = f"DPL_{datetime.now().year}_{next_n_proposta}"

            lead_id = data.get("Cpf_CnpjLead")
            cursor.execute(
                f"SELECT RazaoSocialLead, NomeFantasia, Cidade, Uf FROM [{Config.LEADS_TABLE}] WHERE Cpf_CnpjLead = ?",
                lead_id,
            )
            lead_info = cursor.fetchone()
            if not lead_info:
                return (
                    jsonify({"erro": f"Lead com CPF/CNPJ {lead_id} não encontrado."}),
                    404,
                )

            sql_proposta = f"""INSERT INTO [{Config.PROPOSTA_TABLE}] 
                               (IdProposta, NProposta, Cpf_CnpjLead, RazaoSocialLead, NomeFantasia, Cidade, Uf, 
                                AgenteDeVenda, StatusNegociacao, DataStatusNegociacao) 
                               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"""

            data_status = (
                datetime.strptime(data.get("DataStatusNegociacao"), "%d/%m/%Y")
                if data.get("DataStatusNegociacao")
                else None
            )

            params_proposta = (
                id_proposta_texto,
                next_n_proposta,
                lead_id,
                lead_info.RazaoSocialLead,
                lead_info.NomeFantasia,
                lead_info.Cidade,
                lead_info.Uf,
                data.get("AgenteDeVenda"),
                data.get("StatusNegociacao"),
                data_status,
            )
            cursor.execute(sql_proposta, params_proposta)

            sql_uc = f"INSERT INTO [{Config.UC_PROPOSTA_TABLE}] (IdProposta, Uc) VALUES (?, ?)"
            cursor.execute(sql_uc, (next_n_proposta, data.get("NumeroDaUcLead")))

            conn.commit()
            return (
                jsonify(
                    {"sucesso": f"Proposta {id_proposta_texto} salva com sucesso!"}
                ),
                201,
            )

    except pyodbc.Error as ex:
        return jsonify({"erro": f"Ocorreu um erro no banco de dados: {ex}"}), 500
    finally:
        if conn:
            conn.close()


# --- CÓDIGO NOVO ADICIONADO ABAIXO ---


@bp.route("/<int:n_proposta>", methods=["GET", "PUT", "DELETE"])
def handle_proposta_by_id(n_proposta):
    """Lida com requisições para uma proposta específica (GET, PUT, DELETE)."""
    conn = get_db_connection()
    if not conn:
        return jsonify({"erro": "Falha na conexão."}), 500

    try:
        cursor = conn.cursor()
        if request.method == "GET":
            # Busca todos os dados de uma única proposta para preencher o formulário de edição
            cursor.execute(
                f"SELECT * FROM [{Config.PROPOSTA_TABLE}] WHERE NProposta = ?",
                n_proposta,
            )
            proposta = cursor.fetchone()
            if not proposta:
                return jsonify({"erro": "Proposta não encontrada"}), 404
            return jsonify(row_to_dict(cursor, proposta))

        if request.method == "PUT":
            # Atualiza uma proposta existente
            data = request.json
            sql = f"""UPDATE [{Config.PROPOSTA_TABLE}] SET
                        AgenteDeVenda = ?, StatusNegociacao = ?, DataStatusNegociacao = ?,
                        DataDeEnvio = ?, DataValidade = ?
                      WHERE NProposta = ?"""

            # Converte as datas do formato "dd/mm/yyyy" para objetos datetime
            data_status = (
                datetime.strptime(data.get("DataStatusNegociacao"), "%d/%m/%Y")
                if data.get("DataStatusNegociacao")
                else None
            )
            data_envio = (
                datetime.strptime(data.get("DataDeEnvio"), "%d/%m/%Y")
                if data.get("DataDeEnvio")
                else None
            )
            data_validade = (
                datetime.strptime(data.get("DataValidade"), "%d/%m/%Y")
                if data.get("DataValidade")
                else None
            )

            params = (
                data.get("AgenteDeVenda"),
                data.get("StatusNegociacao"),
                data_status,
                data_envio,
                data_validade,
                n_proposta,
            )
            cursor.execute(sql, params)
            conn.commit()
            if cursor.rowcount == 0:
                return jsonify({"erro": "Proposta não encontrada para atualizar"}), 404
            return jsonify({"sucesso": "Proposta atualizada com sucesso!"})

        if request.method == "DELETE":
            # Exclui uma proposta e seus registros relacionados
            cursor.execute(
                f"DELETE FROM [{Config.UC_PROPOSTA_TABLE}] WHERE IdProposta = ?",
                n_proposta,
            )
            cursor.execute(
                f"DELETE FROM [{Config.OBSERVACOES_TABLE}] WHERE IdProposta = ?",
                n_proposta,
            )
            cursor.execute(
                f"DELETE FROM [{Config.CONTATO_PROPOSTA_TABLE}] WHERE IdProposta = ?",
                n_proposta,
            )

            cursor.execute(
                f"DELETE FROM [{Config.PROPOSTA_TABLE}] WHERE NProposta = ?", n_proposta
            )
            conn.commit()
            if cursor.rowcount == 0:
                return jsonify({"erro": "Proposta não encontrada para excluir"}), 404
            return jsonify({"sucesso": "Proposta excluída com sucesso!"})

    except pyodbc.Error as ex:
        return jsonify({"erro": f"Erro de banco de dados: {ex}"}), 500
    finally:
        if conn:
            conn.close()
