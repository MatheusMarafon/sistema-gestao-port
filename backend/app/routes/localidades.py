from flask import Blueprint, jsonify, current_app
import pandas as pd
import os

bp = Blueprint("localidades", __name__, url_prefix="/api/localidades")

# Variável para servir como cache em memória para o DataFrame do Excel.
_localidades_df = None


def get_localidades_df():
    """
    Carrega o DataFrame de localidades a partir do arquivo Excel na primeira vez
    e o reutiliza (cacheia) nas chamadas subsequentes.
    """
    global _localidades_df

    # Se o DataFrame ainda não foi carregado, lê o arquivo
    if _localidades_df is None:
        excel_path = current_app.config["EXCEL_LOCATIONS_PATH"]
        if not os.path.exists(excel_path):
            print(f"[AVISO] Arquivo de localidades não encontrado: {excel_path}")
            _localidades_df = (
                pd.DataFrame()
            )  # Cria um DataFrame vazio para evitar novos erros
        else:
            try:
                df = pd.read_excel(excel_path, sheet_name="Municípios")
                _localidades_df = df
                print(f"[INFO] Carregadas {len(df)} localidades do arquivo Excel.")
            except Exception as e:
                print(f"[ERRO] Falha ao carregar o arquivo de localidades: {e}")
                _localidades_df = pd.DataFrame()

    return _localidades_df


@bp.route("/estados", methods=["GET"])
def get_estados():
    try:
        df = get_localidades_df()
        if not df.empty:
            estados = sorted(df["Uf"].unique().tolist())
            return jsonify(estados)
        return jsonify([])
    except Exception as e:
        print(f"[ERRO] ao buscar estados: {e}")
        return jsonify({"erro": "Erro interno ao processar a lista de estados"}), 500


@bp.route("/cidades/<string:uf>", methods=["GET"])
def get_cidades_por_uf(uf):
    try:
        df = get_localidades_df()
        if not df.empty and uf:
            cidades_df = df[df["Uf"] == uf][["Cidade", "Codigo"]]
            cidades_list = [
                {
                    "Cidade": row["Cidade"],
                    "Codigo": int(row["Codigo"]) if pd.notna(row["Codigo"]) else None,
                }
                for _, row in cidades_df.sort_values(by="Cidade").iterrows()
            ]
            return jsonify(cidades_list)
        return jsonify([])
    except Exception as e:
        print(f"[ERRO] ao buscar cidades para a UF {uf}: {e}")
        return jsonify({"erro": "Erro interno ao processar a lista de cidades"}), 500
