from flask import Blueprint, jsonify, request
from app.database import get_db_connection
from app.utils import row_to_dict, to_int
from config import Config
import pyodbc
from datetime import datetime

bp = Blueprint("leads", __name__, url_prefix="/api/leads")


@bp.route("", methods=["GET", "POST"])
def handle_leads():
    conn = get_db_connection()
    if not conn:
        return jsonify({"erro": "Falha na conexão com o banco de dados."}), 500

    try:
        cursor = conn.cursor()
        if request.method == "GET":
            filtro = request.args.get("filtro", "")
            query = f"""
                SELECT l.*, v.Vendedor, c.NomeContato AS Contato 
                FROM (({Config.LEADS_TABLE} AS l 
                LEFT JOIN {Config.VENDEDORES_TABLE} AS v ON l.Cpf_CnpjLead = v.Cpf_CnpjLead) 
                LEFT JOIN {Config.CONTATOS_TABLE} AS c ON l.Cpf_CnpjLead = c.Cpf_CnpjLead)
            """
            params = []
            if filtro:
                query += " WHERE l.RazaoSocialLead LIKE ? OR l.Cpf_CnpjLead LIKE ? OR l.NomeFantasia LIKE ?"
                filtro_param = f"%{filtro}%"
                params.extend([filtro_param, filtro_param, filtro_param])
            query += " ORDER BY l.DataResgistroLead DESC"
            cursor.execute(query, params)
            leads = [row_to_dict(cursor, row) for row in cursor.fetchall()]
            return jsonify(leads)

        if request.method == "POST":
            novo_lead = request.json
            if (
                not novo_lead
                or not novo_lead.get("Cpf_CnpjLead")
                or not novo_lead.get("RazaoSocialLead")
            ):
                return (
                    jsonify({"erro": "CPF/CNPJ e Razão Social são obrigatórios"}),
                    400,
                )

            sql = f"""INSERT INTO [{Config.LEADS_TABLE}] 
                      (Cpf_CnpjLead, RazaoSocialLead, NomeFantasia, Cnae, Logradouro, Numero, Complemento, Bairro, Uf, Cidade, Cep, DataResgistroLead, UsuriaEditorRegistro) 
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"""
            params = (
                novo_lead.get("Cpf_CnpjLead"),
                novo_lead.get("RazaoSocialLead"),
                novo_lead.get("NomeFantasia"),
                novo_lead.get("Cnae"),
                novo_lead.get("Logradouro"),
                novo_lead.get("Numero"),
                novo_lead.get("Complemento"),
                novo_lead.get("Bairro"),
                novo_lead.get("Uf"),
                to_int(novo_lead.get("Cidade")),
                novo_lead.get("Cep"),
                datetime.now(),
                novo_lead.get("UsuriaEditorRegistro"),
            )
            cursor.execute(sql, params)
            conn.commit()
            return jsonify({"sucesso": "Lead criado com sucesso"}), 201

    except pyodbc.IntegrityError:
        return jsonify({"erro": "Este CPF/CNPJ já existe na base de dados."}), 409
    except pyodbc.Error as ex:
        return jsonify({"erro": f"Erro de banco de dados: {ex}"}), 500
    finally:
        if conn:
            conn.close()


@bp.route("/<path:lead_id>", methods=["GET", "PUT"])
def handle_lead_by_id(lead_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({"erro": "Falha na conexão."}), 500
    try:
        cursor = conn.cursor()
        if request.method == "GET":
            cursor.execute(
                f"SELECT * FROM [{Config.LEADS_TABLE}] WHERE Cpf_CnpjLead = ?", lead_id
            )
            row = cursor.fetchone()
            if not row:
                return jsonify({"erro": "Lead não encontrado"}), 404
            return jsonify(row_to_dict(cursor, row))

        if request.method == "PUT":
            dados_lead = request.json
            sql = f"""UPDATE [{Config.LEADS_TABLE}] SET 
                      RazaoSocialLead = ?, NomeFantasia = ?, Cnae = ?, Logradouro = ?, 
                      Numero = ?, Complemento = ?, Bairro = ?, Uf = ?, Cidade = ?, 
                      Cep = ?, UsuriaEditorRegistro = ? WHERE Cpf_CnpjLead = ?"""
            params = (
                dados_lead.get("RazaoSocialLead"),
                dados_lead.get("NomeFantasia"),
                dados_lead.get("Cnae"),
                dados_lead.get("Logradouro"),
                dados_lead.get("Numero"),
                dados_lead.get("Complemento"),
                dados_lead.get("Bairro"),
                dados_lead.get("Uf"),
                to_int(dados_lead.get("Cidade")),
                dados_lead.get("Cep"),
                dados_lead.get("UsuriaEditorRegistro"),
                lead_id,
            )
            cursor.execute(sql, params)
            conn.commit()
            if cursor.rowcount == 0:
                return jsonify({"erro": "Lead não encontrado para atualizar"}), 404
            return jsonify({"sucesso": "Lead atualizado com sucesso"})

    except pyodbc.Error as ex:
        return jsonify({"erro": f"Erro de banco de dados: {ex}"}), 500
    finally:
        if conn:
            conn.close()


@bp.route("/<path:lead_id>/vendedor-contato", methods=["POST"])
def add_vendedor_contato(lead_id):
    """Adiciona ou atualiza as informações de vendedor e contato para um lead."""
    data = request.json
    conn = get_db_connection()
    if not conn:
        return jsonify({"erro": "Falha na conexão."}), 500
    try:
        cursor = conn.cursor()
        # Limpa os registos antigos para garantir que a informação é sempre a mais recente (upsert)
        cursor.execute(
            f"DELETE FROM [{Config.VENDEDORES_TABLE}] WHERE Cpf_CnpjLead = ?", lead_id
        )
        cursor.execute(
            f"DELETE FROM [{Config.CONTATOS_TABLE}] WHERE Cpf_CnpjLead = ?", lead_id
        )

        # Insere os novos dados do vendedor, se existirem
        if data.get("Vendedor"):
            try:
                data_envio = (
                    datetime.strptime(data["DataEnvio"], "%d/%m/%Y")
                    if data.get("DataEnvio")
                    else None
                )
                data_validade = (
                    datetime.strptime(data["DataValidade"], "%d/%m/%Y")
                    if data.get("DataValidade")
                    else None
                )
                sql_vendedor = f"INSERT INTO [{Config.VENDEDORES_TABLE}] (Cpf_CnpjLead, Vendedor, DataDeEnvioLead, ValidadeLead) VALUES (?, ?, ?, ?)"
                cursor.execute(
                    sql_vendedor, lead_id, data["Vendedor"], data_envio, data_validade
                )
            except (ValueError, TypeError) as e:
                return jsonify({"erro": f"Formato de data inválido: {e}"}), 400

        # Insere os novos dados do contato, se existirem
        if data.get("NomeContato"):
            sql_contato = f"INSERT INTO [{Config.CONTATOS_TABLE}] (Cpf_CnpjLead, NomeContato, [e-mail], Telefone) VALUES (?, ?, ?, ?)"
            cursor.execute(
                sql_contato,
                lead_id,
                data["NomeContato"],
                data.get("Email"),
                data.get("Telefone"),
            )

        conn.commit()
        return (
            jsonify({"sucesso": "Informações de Vendedor/Contato salvas com sucesso!"}),
            201,
        )

    except pyodbc.Error as ex:
        return jsonify({"erro": f"Erro de banco de dados: {ex}"}), 500
    finally:
        if conn:
            conn.close()
