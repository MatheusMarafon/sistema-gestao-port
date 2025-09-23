from app.utils import to_float


def validar_regras_tarifacao(dados_unidade, dados_historico_mes):
    """
    Valida os dados de um mês do histórico contra as regras de tarifação da unidade.
    Levanta um ValueError se uma regra for violada.

    :param dados_unidade: Dicionário com os dados da tabela de Unidades.
    :param dados_historico_mes: Dicionário com os dados de um único mês da tabela de Histórico.
    """
    subgrupo = dados_unidade.get("SubgrupoTarifario", "").upper()
    tarifa = dados_unidade.get("Tarifa", "").upper()
    possui_usina = bool(dados_unidade.get("PossuiUsina", False))

    campos_de_dados = [
        "DemandaCP",
        "DemandaCFP",
        "DemandaCG",
        "kWhProjPonta",
        "kWhProjForaPonta",
        "kWhProjPontaG",
        "kWhProjForaPontaG",
        "kWProjG",
        "kWhCompensadoP",
        "kWhCompensadoFP",
        "kWhCompensadoHr",
        "kWGeracaoProjetada",
        "kWhProjDieselP",
    ]

    # Verifica se existe algum dado preenchido para o mês
    tem_dados_no_mes = any(
        to_float(dados_historico_mes.get(campo)) for campo in campos_de_dados
    )

    is_grupo_a = subgrupo.startswith("A")
    is_grupo_b = subgrupo.startswith("B")
    is_tarifa_azul = "AZUL" in tarifa
    is_tarifa_verde = "VERDE" in tarifa

    # --- Regra 1: Campos que DEVEM ser zero sob certas condições ---
    regras_de_zeramento = {
        "DemandaCP": is_grupo_b or is_tarifa_verde,
        "DemandaCFP": is_grupo_b,
        "DemandaCG": is_grupo_b or not possui_usina,
        "kWhProjPonta": is_grupo_b or is_tarifa_verde,
    }

    for campo, condicao_para_zerar in regras_de_zeramento.items():
        valor_campo = to_float(dados_historico_mes.get(campo))
        if condicao_para_zerar and valor_campo and valor_campo != 0:
            raise ValueError(
                f"O campo '{campo}' deve ser zero para as condições atuais (Subgrupo: {subgrupo}, Tarifa: {tarifa}, Possui Usina: {possui_usina})."
            )

    # --- Regra 2: Campos que SÃO OBRIGATÓRIOS (se houver dados no mês) ---
    if tem_dados_no_mes:
        if is_grupo_a and (is_tarifa_azul or is_tarifa_verde):
            valor_demanda_cfp = to_float(dados_historico_mes.get("DemandaCFP"))
            if not valor_demanda_cfp or valor_demanda_cfp <= 0:
                raise ValueError(
                    "O campo 'Demanda CFP' é obrigatório e deve ser maior que zero para Grupo A com Tarifa Azul ou Verde."
                )

        if is_grupo_a and is_tarifa_azul:
            valor_demanda_cp = to_float(dados_historico_mes.get("DemandaCP"))
            if not valor_demanda_cp or valor_demanda_cp <= 0:
                raise ValueError(
                    "O campo 'Demanda CP' é obrigatório e deve ser maior que zero para Grupo A com Tarifa Azul."
                )

        if possui_usina:
            valor_demanda_cg = to_float(dados_historico_mes.get("DemandaCG"))
            if not valor_demanda_cg or valor_demanda_cg <= 0:
                raise ValueError(
                    "O campo 'Demanda CG' é obrigatório e deve ser maior que zero pois a unidade possui usina."
                )

    return True
