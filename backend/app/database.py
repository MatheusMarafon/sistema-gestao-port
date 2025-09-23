import pyodbc
import os
from flask import current_app


def get_db_connection():
    """Cria e retorna uma conexão com o banco de dados MS Access."""
    db_path = current_app.config["DB_PATH"]

    if not os.path.exists(db_path):
        print(f"[ERRO CRÍTICO] Arquivo do banco de dados não encontrado em: {db_path}")
        return None

    connection_string = (
        f"DRIVER={{Microsoft Access Driver (*.mdb, *.accdb)}};DBQ={db_path};"
    )

    try:
        conn = pyodbc.connect(connection_string)
        return conn
    except pyodbc.Error as ex:
        print(f"[ERRO DE CONEXÃO] Falha ao conectar ao banco de dados: {ex}")
        return None
