# config.py
import os


class Config:
    """
    Classe de configuração central para a aplicação Flask.
    Armazena o caminho do nosso "banco de dados" JSON e os nomes das "tabelas".
    """

    # --- Configurações Gerais ---
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))

    # --- CAMINHO DO NOVO "BANCO DE DADOS" JSON ---
    # Aponta para o arquivo dados.json dentro da pasta instance que você criou.
    JSON_DB_PATH = os.path.join(BASE_DIR, "instance", "dados.json")

    EXCEL_LOCATIONS_PATH = os.path.join(BASE_DIR, "ListaDeMunicipios.xls")
    # --- Nomes das "Tabelas" (Chaves no JSON) ---
    # Manter isso aqui é uma boa prática para evitar erros de digitação no resto do código.
    LEADS_TABLE = "CadastroLead"
    UNIDADES_TABLE = "UnidadesLead"
    HISTORICO_TABLE = "HistoricoUcLead"
    VENDEDORES_TABLE = "VendedorResponsavel"
    CONTATOS_TABLE = "ContatoLead"
    PROPOSTA_TABLE = "Proposta"
    OBSERVACOES_TABLE = "Observacoes"
    UC_PROPOSTA_TABLE = "UcProposta"
    CONTATO_PROPOSTA_TABLE = "ContatoProposta"
    DATA_ENVIO_PROPOSTA_TABLE = "DataEnvioProposta"
    PARAM_CLIENTES_TABLE = "Clientes"
    PARAM_SIMULACAO_TABLE = "DadosSimulacao"
    PARAM_PRECOS_ANO_TABLE = "PrecoMWhAno"
    PARAM_CUSTOS_MES_TABLE = "CustosBaseMes"
    AJUSTE_IPCA_TABLE = "AjusteIPCA"
    AJUSTE_TARIFA_TABLE = "AjusteTarifa"
    DADOS_GERACAO_TABLE = "DadosGeracao"
    CURVA_GERACAO_TABLE = "CurvaGeracao"
