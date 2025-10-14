# backend/app/database.py
import json
import os
from ..config import Config  # Importa a classe de configuração da raiz do projeto


def read_data():
    """
    Lê todos os dados do arquivo JSON.
    Se o arquivo não existir ou estiver vazio, retorna uma estrutura de dados padrão.
    """
    try:
        # Abre o arquivo usando o caminho definido no config.py
        with open(Config.JSON_DB_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        # Se o arquivo não for encontrado ou estiver corrompido/vazio,
        # criamos uma estrutura vazia para evitar que o app quebre.
        return {
            Config.LEADS_TABLE: [],
            Config.UNIDADES_TABLE: [],
            Config.HISTORICO_TABLE: [],
            Config.VENDEDORES_TABLE: [],
            Config.CONTATOS_TABLE: [],
            Config.PROPOSTA_TABLE: [],
            Config.OBSERVACOES_TABLE: [],
            Config.UC_PROPOSTA_TABLE: [],
            Config.CONTATO_PROPOSTA_TABLE: [],
            Config.DATA_ENVIO_PROPOSTA_TABLE: [],
            Config.PARAM_CLIENTES_TABLE: [],
            Config.PARAM_SIMULACAO_TABLE: [],
            Config.PARAM_PRECOS_ANO_TABLE: [],
            Config.PARAM_CUSTOS_MES_TABLE: [],
            Config.AJUSTE_IPCA_TABLE: [],
            Config.AJUSTE_TARIFA_TABLE: [],
            Config.DADOS_GERACAO_TABLE: [],
            Config.CURVA_GERACAO_TABLE: [],
        }


def write_data(data):
    """
    Escreve um dicionário Python inteiro de volta no arquivo JSON.
    """
    # Abre o arquivo em modo de escrita ('w')
    with open(Config.JSON_DB_PATH, "w", encoding="utf-8") as f:
        # Usa json.dump para salvar os dados de forma formatada (indent=4)
        # e garantindo a codificação correta de caracteres como 'ç' e 'ã'.
        json.dump(data, f, indent=4, ensure_ascii=False)
