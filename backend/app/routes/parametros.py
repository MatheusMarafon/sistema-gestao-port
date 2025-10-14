# backend/app/routes/parametros.py (VERSÃO FINAL COMPLETA PARA JSON)

from flask import Blueprint, jsonify, request, current_app
from ..database import read_data, write_data
from datetime import datetime

bp = Blueprint("parametros", __name__, url_prefix="/api/parametros")


# Funções de utilidade para conversão segura de tipos
def to_float(value):
    try:
        return float(value)
    except (ValueError, TypeError):
        return None


def to_int(value):
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


@bp.route("", methods=["GET"])
def get_all_parametros():
    """Busca todos os dados de configuração para a primeira aba de Parâmetros."""
    db_data = read_data()

    # Pega os nomes das "tabelas" do config da aplicação
    clientes_table = current_app.config["PARAM_CLIENTES_TABLE"]
    simulacao_table = current_app.config["PARAM_SIMULACAO_TABLE"]
    precos_table = current_app.config["PARAM_PRECOS_ANO_TABLE"]
    custos_table = current_app.config["PARAM_CUSTOS_MES_TABLE"]

    # Pega os dados de cada "tabela" do nosso banco JSON
    param_clientes = db_data.get(clientes_table, [])
    param_simulacao_list = db_data.get(simulacao_table, [])
    param_precos_ano = db_data.get(precos_table, [])
    param_custos_mes = db_data.get(custos_table, [])

    # Simula 'SELECT TOP 1' (pega o primeiro item da lista, se existir)
    param_simulacao = param_simulacao_list[0] if param_simulacao_list else {}

    # Simula 'ORDER BY'
    param_precos_ano.sort(key=lambda x: x.get("Ano", 0), reverse=True)
    param_custos_mes.sort(key=lambda x: x.get("MesRef", "1900-01-01"), reverse=True)

    return jsonify(
        {
            "clientes": param_clientes,
            "simulacao_geral": param_simulacao,
            "precos_ano": param_precos_ano,
            "custos_mes": param_custos_mes,
        }
    )


@bp.route("/ajuste-ipca", methods=["GET", "POST"])
def handle_ajuste_ipca():
    db_data = read_data()
    ipca_table = current_app.config["AJUSTE_IPCA_TABLE"]

    if request.method == "POST":
        data = request.json
        if not data.get("Ano") or data.get("PctIPCA") is None:
            return jsonify({"erro": "Ano e Percentual são obrigatórios."}), 400

        novo_ajuste = {
            "Ano": to_int(data.get("Ano")),
            "PctIPCA": to_float(data.get("PctIPCA")),
        }

        db_data[ipca_table].append(novo_ajuste)
        write_data(db_data)
        return jsonify({"sucesso": "Ajuste IPCA adicionado com sucesso!"}), 201

    # Para o GET
    ajustes_ipca = db_data.get(ipca_table, [])
    ajustes_ipca.sort(key=lambda x: x.get("Ano", 0), reverse=True)
    return jsonify(ajustes_ipca)


@bp.route("/ajuste-ipca/<int:ano>", methods=["PUT"])
def update_ajuste_ipca(ano):
    data = request.json
    pct_ipca = data.get("PctIPCA")
    if pct_ipca is None:
        return jsonify({"erro": "Percentual é obrigatório."}), 400

    db_data = read_data()
    ipca_table = current_app.config["AJUSTE_IPCA_TABLE"]

    ajuste_encontrado = False
    for ajuste in db_data.get(ipca_table, []):
        if ajuste.get("Ano") == ano:
            ajuste["PctIPCA"] = to_float(pct_ipca)
            ajuste_encontrado = True
            break

    if not ajuste_encontrado:
        return (
            jsonify({"erro": "Nenhum registro encontrado para o ano fornecido."}),
            404,
        )

    write_data(db_data)
    return jsonify({"sucesso": "Ajuste IPCA atualizado com sucesso!"})


@bp.route("/distribuidoras", methods=["GET"])
def get_distribuidoras():
    db_data = read_data()
    tarifa_table = current_app.config["AJUSTE_TARIFA_TABLE"]
    tarifas = db_data.get(tarifa_table, [])

    # Simula 'SELECT DISTINCT' usando um set para garantir valores únicos
    cnpjs = {
        item.get("CnpjDistribuidora")
        for item in tarifas
        if item.get("CnpjDistribuidora")
    }
    return jsonify(sorted(list(cnpjs)))


@bp.route("/ajuste-tarifa/<path:cnpj_distribuidora>", methods=["GET"])
def get_ajuste_tarifa_por_cnpj(cnpj_distribuidora):
    db_data = read_data()
    tarifa_table = current_app.config["AJUSTE_TARIFA_TABLE"]

    # Simula 'WHERE CnpjDistribuidora = ?'
    resultados = [
        item
        for item in db_data.get(tarifa_table, [])
        if item.get("CnpjDistribuidora") == cnpj_distribuidora
    ]
    resultados.sort(key=lambda x: x.get("Ano", 0), reverse=True)
    return jsonify(resultados)


@bp.route("/ajuste-tarifa/<path:cnpj>/<int:ano>", methods=["PUT"])
def update_ajuste_tarifa(cnpj, ano):
    data = request.json
    db_data = read_data()
    tarifa_table = current_app.config["AJUSTE_TARIFA_TABLE"]

    registro_atualizado = False
    for registro in db_data.get(tarifa_table, []):
        if registro.get("CnpjDistribuidora") == cnpj and registro.get("Ano") == ano:
            registro.update(
                {
                    "PctTusdkWP": to_float(data.get("PctTusdkWP")),
                    "PctTusdkWFP": to_float(data.get("PctTusdkWFP")),
                    "PctTusdMWhP": to_float(data.get("PctTusdMWhP")),
                    "PctTusdMWhFP": to_float(data.get("PctTusdMWhFP")),
                    "PctTEMWhP": to_float(data.get("PctTEMWhP")),
                    "PctTEMWhFP": to_float(data.get("PctTEMWhFP")),
                }
            )
            registro_atualizado = True
            break

    if not registro_atualizado:
        return jsonify({"erro": "Registro não encontrado."}), 404

    write_data(db_data)
    return jsonify({"sucesso": "Ajuste de tarifa atualizado!"})


@bp.route("/geracao", methods=["GET"])
def get_dados_geracao():
    db_data = read_data()
    dados_geracao = db_data.get(current_app.config["DADOS_GERACAO_TABLE"], [])
    curva_geracao = db_data.get(current_app.config["CURVA_GERACAO_TABLE"], [])

    curva_geracao.sort(key=lambda x: x.get("IdMes", 0), reverse=True)

    return jsonify({"dados_geracao": dados_geracao, "curva_geracao": curva_geracao})


@bp.route("/preco-mwh/<int:ano>/<string:fonte>", methods=["PUT"])
def update_preco_mwh(ano, fonte):
    data = request.json
    db_data = read_data()
    precos_table = current_app.config["PARAM_PRECOS_ANO_TABLE"]

    registro_atualizado = False
    for registro in db_data.get(precos_table, []):
        if registro.get("Ano") == ano and registro.get("Fonte") == fonte:
            registro.update(
                {
                    "PrecoRS_MWh": to_float(data.get("PrecoRS_MWh")),
                    "Corrigir": data.get("Corrigir"),
                }
            )
            registro_atualizado = True
            break

    if not registro_atualizado:
        return jsonify({"erro": "Nenhum registro encontrado para atualizar."}), 404

    write_data(db_data)
    return jsonify({"sucesso": "Preço MWh atualizado com sucesso!"})


@bp.route("/custos-mes/<string:mes_ref>", methods=["PUT"])
def update_custos_mes(mes_ref):
    data = request.json
    db_data = read_data()
    custos_table = current_app.config["PARAM_CUSTOS_MES_TABLE"]

    registro_atualizado = False
    for registro in db_data.get(custos_table, []):
        # Compara apenas a parte da data, ignorando a hora, se houver
        if str(registro.get("MesRef", "")).startswith(mes_ref):
            registro.update(
                {
                    "LiqMCPACL": to_float(data.get("LiqMCPACL")),
                    "LiqMCPAPE": to_float(data.get("LiqMCPAPE")),
                    "LiqEnerReserva": to_float(data.get("LiqEnerReserva")),
                    "LiqRCAP": to_float(data.get("LiqRCAP")),
                    "SpreadVenda": to_float(data.get("SpreadVenda")),
                    "ModelagemMes": to_float(data.get("ModelagemMes")),
                }
            )
            registro_atualizado = True
            break

    if not registro_atualizado:
        return jsonify({"erro": "Nenhum registro encontrado para atualizar."}), 404

    write_data(db_data)
    return jsonify({"sucesso": "Custos do mês atualizados com sucesso!"})


@bp.route("/dados-geracao/<string:fonte>/<string:local>", methods=["PUT"])
def update_dados_geracao(fonte, local):
    data = request.json
    db_data = read_data()
    geracao_table = current_app.config["DADOS_GERACAO_TABLE"]

    registro_atualizado = False
    for registro in db_data.get(geracao_table, []):
        if registro.get("Fonte") == fonte and registro.get("Local") == local:
            registro.update(
                {
                    "VolumeMWhAno": to_float(data.get("VolumeMWhAno")),
                    "PrecoRS_MWh": to_float(data.get("PrecoRS_MWh")),
                }
            )
            registro_atualizado = True
            break

    if not registro_atualizado:
        return jsonify({"erro": "Registro não encontrado."}), 404

    write_data(db_data)
    return jsonify({"sucesso": "Dados de geração atualizados!"})


@bp.route("/curva-geracao/<int:id_mes>/<string:fonte>/<string:local>", methods=["PUT"])
def update_curva_geracao(id_mes, fonte, local):
    data = request.json
    db_data = read_data()
    curva_table = current_app.config["CURVA_GERACAO_TABLE"]

    registro_atualizado = False
    for registro in db_data.get(curva_table, []):
        if (
            registro.get("IdMes") == id_mes
            and registro.get("Fonte") == fonte
            and registro.get("Local") == local
        ):
            registro["PctSazonalizacaoMes"] = to_float(data.get("PctSazonalizacaoMes"))
            registro_atualizado = True
            break

    if not registro_atualizado:
        return jsonify({"erro": "Registro não encontrado."}), 404

    write_data(db_data)
    return jsonify({"sucesso": "Curva de sazonalização atualizada!"})


@bp.route("/simulacao", methods=["POST"])
def save_parametros_simulacao():
    data = request.json
    cliente_data = data.get("cliente_params")
    gerais_data = data.get("gerais_params")

    db_data = read_data()

    if cliente_data and cliente_data.get("Cliente"):
        clientes_table = current_app.config["PARAM_CLIENTES_TABLE"]
        for cliente in db_data.get(clientes_table, []):
            if cliente.get("Cliente") == cliente_data.get("Cliente"):
                cliente.update(
                    {
                        "DataInicialSimula": cliente_data.get("DataInicialSimula"),
                        "DataFinalSimula": cliente_data.get("DataFinalSimula"),
                        "TipoGeracao": cliente_data.get("TipoGeracao"),
                        "IncluirGrupoB": bool(cliente_data.get("IncluirGrupoB")),
                    }
                )
                break

    if gerais_data:
        simulacao_table = current_app.config["PARAM_SIMULACAO_TABLE"]
        if db_data.get(simulacao_table):
            db_data[simulacao_table][0].update(
                {
                    "Pis": to_float(gerais_data.get("Pis")),
                    "Cofins": to_float(gerais_data.get("Cofins")),
                    "PctCustoGarantia": to_float(gerais_data.get("PctCustoGarantia")),
                    "MesesGarantia": to_int(gerais_data.get("MesesGarantia")),
                    "Perdas": to_float(gerais_data.get("Perdas")),
                    "FonteEnergiaBase": gerais_data.get("FonteEnergiaBase"),
                    "PrecoDiesel": to_float(gerais_data.get("PrecoDiesel")),
                    "RendimentoGerador": to_float(gerais_data.get("RendimentoGerador")),
                }
            )
        else:
            db_data[simulacao_table].append(gerais_data)

    write_data(db_data)
    return jsonify({"sucesso": "Parâmetros de simulação salvos com sucesso!"})


# A rota /gerais era idêntica à parte de gerais_data da rota /simulacao,
# então ela foi removida para evitar duplicação. Se precisar dela separada,
# basta copiar a lógica de 'if gerais_data:' acima para uma nova rota.
