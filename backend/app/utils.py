def row_to_dict(cursor, row):
    """Converte uma linha do pyodbc para um dicionário."""
    columns = [column[0] for column in cursor.description]
    return dict(zip(columns, row))


def to_float(value):
    """Converte um valor para float, tratando vírgulas e valores nulos/vazios."""
    if value is None or str(value).strip() == "":
        return None
    try:
        return float(str(value).replace(",", "."))
    except (ValueError, TypeError):
        return None


def to_int(value):
    """Converte um valor para int, tratando valores vazios ou None."""
    if value is None or str(value).strip() == "":
        return None
    try:
        # Converte para float primeiro para lidar com casos como "10.0"
        return int(float(str(value)))
    except (ValueError, TypeError):
        return None
