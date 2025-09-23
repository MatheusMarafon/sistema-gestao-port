from dateutil.relativedelta import relativedelta
from app.utils import to_float


def realizar_calculo_simulacao(dados_simulacao):
    """
    Função principal que executa o cálculo de custos projetados.

    :param dados_simulacao: Dicionário contendo todos os parâmetros necessários para o cálculo.
    :return: Dicionário com os resultados da simulação ou None em caso de falha.
    """
    # TODO: Idealmente, estas tarifas viriam do banco de dados (tabelas de parâmetros)
    # Por enquanto, mantemos como constantes conforme o código original.
    TARIFA_TE_PONTA = 0.65
    TARIFA_TE_FORA_PONTA = 0.45
    TARIFA_TUSD_DEMANDA = 30.00

    tipo = dados_simulacao.get("tipo")
    imposto_percentual = to_float(dados_simulacao.get("aliquota_icms", 0)) or 0.0
    imposto_fator = (
        1 / (1 - (imposto_percentual / 100)) if imposto_percentual < 100 else 1
    )

    if tipo == "cliente":
        historico = dados_simulacao.get("historico", [])
        if not historico:
            return None  # Retorna None se não houver histórico para calcular a média

        total_consumo = sum(
            (to_float(mes.get("kWhProjPonta")) or 0)
            + (to_float(mes.get("kWhProjForaPonta")) or 0)
            for mes in historico
        )
        total_demanda = sum(to_float(mes.get("DemandaCP")) or 0 for mes in historico)
        num_meses_historico = len(historico)

        consumo_medio_mensal = (
            total_consumo / num_meses_historico if num_meses_historico > 0 else 0
        )
        demanda_media_mensal = (
            total_demanda / num_meses_historico if num_meses_historico > 0 else 0
        )

        custo_consumo_medio = consumo_medio_mensal * TARIFA_TE_FORA_PONTA
        custo_demanda_medio = demanda_media_mensal * TARIFA_TUSD_DEMANDA

    elif tipo == "lead":
        consumo_medio_mensal = to_float(dados_simulacao.get("consumo_estimado")) or 0
        demanda_media_mensal = to_float(dados_simulacao.get("demanda_estimada")) or 0
        custo_consumo_medio = consumo_medio_mensal * TARIFA_TE_FORA_PONTA
        custo_demanda_medio = demanda_media_mensal * TARIFA_TUSD_DEMANDA
    else:
        return None  # Tipo de simulação inválido

    subtotal_medio = custo_consumo_medio + custo_demanda_medio
    custo_total_medio_mensal = subtotal_medio * imposto_fator
    custo_impostos_mes = custo_total_medio_mensal - subtotal_medio

    duracao_meses = dados_simulacao.get("duracao_meses", 12)
    custo_total_periodo = custo_total_medio_mensal * duracao_meses
    consumo_total_periodo = consumo_medio_mensal * duracao_meses

    detalhes_mensais = []
    data_inicio = dados_simulacao.get("data_inicio_obj")
    for i in range(duracao_meses):
        mes_atual = data_inicio + relativedelta(months=i)
        detalhes_mensais.append(
            {
                "mes": mes_atual.strftime("%Y-%m"),
                "consumo_total_kwh": consumo_medio_mensal,
                "demanda_total_kw": demanda_media_mensal,
                "custo_consumo": custo_consumo_medio,
                "custo_demanda": custo_demanda_medio,
                "custo_impostos": custo_impostos_mes,
                "custo_total_mes": custo_total_medio_mensal,
            }
        )

    return {
        "totais": {
            "custo_total_periodo": custo_total_periodo,
            "custo_medio_mensal": custo_total_medio_mensal,
            "consumo_total_periodo": consumo_total_periodo,
            "demanda_media": demanda_media_mensal,
            "duracao_meses": duracao_meses,
        },
        "detalhes_mensais": detalhes_mensais,
    }
