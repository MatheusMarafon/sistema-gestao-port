from ..utils import to_float


def validar_regras_tarifacao(dados_unidade, dados_historico_mes):
    """
    Valida os dados de um mês do histórico contra as regras de tarifação da unidade.
    Levanta um ValueError se uma regra for violada.

    :param dados_unidade: Dicionário com os dados da tabela de Unidades.
    :param dados_historico_mes: Dicionário com os dados de um único mês da tabela de Histórico.
    """
    # --- Extração e Preparação dos Dados ---
    subgrupo = dados_unidade.get("SubgrupoTarifario", "").upper()
    tarifa = dados_unidade.get("Tarifa", "").upper()
    possui_usina = bool(dados_unidade.get("PossuiUsina", False))

    # --- CORREÇÃO CRÍTICA AQUI ---
    # Verifica se o valor não é None antes de fazer a comparação numérica.
    beneficio_rural = to_float(dados_unidade.get("BeneficioRuralIrrigacao"))
    is_rural_irrigante = beneficio_rural is not None and beneficio_rural > 0

    gerador_diesel = to_float(dados_historico_mes.get("kWhProjDieselP"))
    tem_gerador_diesel = gerador_diesel is not None and gerador_diesel > 0
    # --- FIM DA CORREÇÃO ---

    is_grupo_a = subgrupo.startswith("A")
    is_grupo_b = subgrupo.startswith("B")
    is_tarifa_azul = "AZUL" in tarifa
    is_tarifa_verde = "VERDE" in tarifa

    regras_de_zeramento = {
        "kWProjPonta": is_tarifa_verde or is_grupo_b,
        "kWProjForaPonta": is_tarifa_verde or is_grupo_b,
        "kWhProjPonta": is_tarifa_verde or is_grupo_b,
        "kWhProjForaPonta": is_tarifa_verde or is_grupo_b,
        "kWhProjHRes": not is_rural_irrigante,
        "kWhCompensadoHr": not possui_usina and not is_rural_irrigante,
        "kWhProjDieselP": not tem_gerador_diesel,
        "kWhProjPontaG": not possui_usina,
        "kWhProjForaPontaG": not possui_usina,
        "kWProjG": not possui_usina,
        "kWhCompensadoP": not possui_usina,
        "kWhCompensadoFP": not possui_usina,
        "kWGeracaoProjetada": not possui_usina,
        "DemandaCP": is_grupo_b or is_tarifa_verde,
        "DemandaCFP": is_grupo_b,
        "DemandaCG": is_grupo_b or not possui_usina,
    }

    for campo, condicao_para_zerar in regras_de_zeramento.items():
        valor_campo = to_float(dados_historico_mes.get(campo))
        if condicao_para_zerar and valor_campo and valor_campo != 0:
            raise ValueError(
                f"O campo '{campo}' deve ser zero para as condições atuais da unidade."
            )

    campos_de_dados = list(regras_de_zeramento.keys())
    tem_dados_no_mes = any(
        to_float(dados_historico_mes.get(campo)) for campo in campos_de_dados
    )

    if tem_dados_no_mes:
        if is_grupo_a and (is_tarifa_azul or is_tarifa_verde):
            valor_demanda_cfp = to_float(dados_historico_mes.get("DemandaCFP"))
            if not valor_demanda_cfp or valor_demanda_cfp <= 0:
                raise ValueError(
                    "O campo 'Demanda CFP' é obrigatório para Grupo A com Tarifa Azul ou Verde."
                )

        if is_grupo_a and is_tarifa_azul:
            valor_demanda_cp = to_float(dados_historico_mes.get("DemandaCP"))
            if not valor_demanda_cp or valor_demanda_cp <= 0:
                raise ValueError(
                    "O campo 'Demanda CP' é obrigatório para Grupo A com Tarifa Azul."
                )

        if possui_usina:
            valor_demanda_cg = to_float(dados_historico_mes.get("DemandaCG"))
            if not valor_demanda_cg or valor_demanda_cg <= 0:
                raise ValueError(
                    "O campo 'Demanda CG' é obrigatório pois a unidade possui usina (Geração Distribuída)."
                )

    return True
