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
    possui_usina = bool(
        dados_unidade.get("possuiUsina", False)
    )  # Usado para GD ou geração própria

    is_rural_irrigante = to_float(dados_unidade.get("BeneficioRuralIrrigacao", 0)) > 0
    tem_gerador_diesel = to_float(dados_historico_mes.get("kWhProjDieselP", 0)) > 0

    is_grupo_a = subgrupo.startswith("A")
    is_grupo_b = subgrupo.startswith("B")
    is_tarifa_azul = "AZUL" in tarifa
    is_tarifa_verde = "VERDE" in tarifa

    # --- Regras de 'Quando deve ser 0' ---
    regras_de_zeramento = {
        # Condição para a regra: kW Proj Ponta e Fora Ponta
        # Devem ser zero se a Tarifa for Verde ou se for Grupo B
        "kWProjPonta": is_tarifa_verde or is_grupo_b,
        "kWProjForaPonta": is_tarifa_verde or is_grupo_b,
        # Condição para a regra: kWh Proj Ponta e Fora Ponta
        # Devem ser zero se a Tarifa for Verde ou se for Grupo B
        "kWhProjPonta": is_tarifa_verde or is_grupo_b,
        "kWhProjForaPonta": is_tarifa_verde or is_grupo_b,
        # Condição para a regra: kWh Proj HRes
        # Deve ser zero se a classe NÃO for Rural Irrigante
        "kWhProjHRes": not is_rural_irrigante,
        # Condição para a regra: kWh Compensado Hr
        # deve ser zero se NÃO for GD e NÃO for Rural Irrigante
        "kWhCompensadoHr": not possui_usina and not is_rural_irrigante,
        # Condição para a regra: kWh Proj Diesel P
        # Deve ser zero se não houver gerador a diesel
        "kWhProjDieselP": not tem_gerador_diesel,
        # Condição par aa regra: Todos os campos de Geração (G) e Compensado (P, FP)
        # Deve ser zero se não houver GD (se a unidade não possui usina)
        "kWhProjPontaG": not possui_usina,
        "kWhProjForaPontaG": not possui_usina,
        "kWProjG": not possui_usina,
        "kWhCompensadoP": not possui_usina,
        "kWhCompensadoFP": not possui_usina,
        "kWGeracaoProjetada": not possui_usina,
    }
    for campo, condicao_para_zerar in regras_de_zeramento.items():
        valor_campo = to_float(dados_historico_mes.get(campo))
        if condicao_para_zerar and valor_campo and valor_campo != 0:
            raise ValueError(
                f"O campo '{campo}' deve ser zero para as condições atuais da unidade."
            )

    # --- Regras de 'Condições de Uso' (Campos Obrigatórios) ---
    # Verifica se o usuário inseriu algum dado para o mês
    # Se o mês estiver todo em branco, as regras de obrigatoriedade não são aplicadas
    campos_de_dados = list(regras_de_zeramento.keys()) + [
        "DemandaCP",
        "DemandaCFP",
        "DemandaCG",
    ]
    tem_dados_no_mes = any(
        to_float(dados_historico_mes.get(campo)) for campo in campos_de_dados
    )

    if tem_dados_no_mes:
        # Condição para a regra: Demanda CFP (Obrigatória se Grupo A + Tarifa Azul|Verde)
        if is_grupo_a and (is_tarifa_azul or is_tarifa_verde):
            if not to_float(dados_historico_mes.get("DemandaCFP")):
                raise ValueError(
                    "O campo 'Demanda CFP' é obrigatório para o Grupo A com Tarifa Azul ou Verde."
                )

        # Condição para a regra: Demanda CP (Obrigatória se Grupo A + Tarifa Azul)
        if is_grupo_a and is_tarifa_azul:
            if not to_float(dados_historico_mes.get("DemandaCP")):
                raise ValueError(
                    "O campo 'Demanda CP' é obrigatório apara o Grupo A com Tarifa Azul."
                )

        # Condição para a regra: Demanda CG (Obrigatória se possui usina)
        if possui_usina:
            if not to_float(dados_historico_mes.get("DemandaCG")):
                raise ValueError(
                    "O campo 'Demanda CG' é obrigatório pois a unidade possui usina."
                )
    return True
