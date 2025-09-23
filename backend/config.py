import os


class Config:
    """
    Classe de configuração central para a aplicação Flask.
    Armazena caminhos de arquivos, nomes de tabelas e outras constantes.
    """

    # --- Configurações Gerais ---
    # Obtém o caminho absoluto do diretório onde este arquivo está.
    # Isso torna os caminhos dos arquivos relativos ao projeto, e não ao seu C:\
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))

    # --- Caminhos dos Arquivos ---
    DB_PATH = os.path.join(BASE_DIR, "proposta-simulacao-acr.accdb")
    EXCEL_LOCATIONS_PATH = os.path.join(BASE_DIR, "ListaDeMunicipios.xls")

    # --- Nomes das Tabelas do Banco de Dados ---
    LEADS_TABLE = "tbl_22_01_01_CadastroLead"
    UNIDADES_TABLE = "tbl_22_02_01_UnidadesLead"
    HISTORICO_TABLE = "tbl_22_03_01_HistoricoUcLead"
    VENDEDORES_TABLE = "tbl_22_04_01_VendedorResponsavel"
    CONTATOS_TABLE = "tbl_22_05_01_ContatoLead"
    PROPOSTA_TABLE = "tbl_24_01_01_Proposta"
    OBSERVACOES_TABLE = "tbl_24_01_02_Observacoes"
    UC_PROPOSTA_TABLE = "tbl_24_02_01_UcProposta"
    CONTATO_PROPOSTA_TABLE = "tbl_24_04_01_ContatoProposta"
    DATA_ENVIO_PROPOSTA_TABLE = "tbl_24_03_01_DataEnvioProposta"

    # Tabelas de Parâmetros
    PARAM_CLIENTES_TABLE = "tbl_P_01_01_01_Clientes"
    PARAM_SIMULACAO_TABLE = "tbl_P_01_01_03_DadosSimulacao"
    PARAM_PRECOS_ANO_TABLE = "tbl_P_01_01_04_PrecoMWhAno"
    PARAM_CUSTOS_MES_TABLE = "tbl_P_01_01_02_CustosBaseMes"
    AJUSTE_IPCA_TABLE = "tbl_P_02_01_01_AjusteIPCA"
    AJUSTE_TARIFA_TABLE = "tbl_P_02_01_02_AjusteTarifa"
    DADOS_GERACAO_TABLE = "tbl_P_03_01_01_DadosGeracao"
    CURVA_GERACAO_TABLE = "tbl_P_03_01_02_CurvaGeracao"
