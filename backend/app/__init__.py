# backend/app/__init__.py (VERSÃO FINAL E CORRIGIDA)

from flask import Flask
from flask_cors import CORS
from ..config import Config  # Importa a classe Config da raiz do projeto


def create_app(config_class=Config):
    """
    Função Application Factory: cria, configura e monta a aplicação Flask.
    """
    # Define a pasta 'frontend' como a pasta de arquivos estáticos (HTML, CSS, JS)
    app = Flask(__name__, static_folder="../../frontend", static_url_path="")

    # 1. Carrega as configurações do arquivo config.py
    app.config.from_object(config_class)

    # 2. Habilita o CORS para permitir que seu frontend se comunique com o backend
    CORS(app)

    # 3. Importa todos os blueprints (os arquivos .py de rotas)
    from .routes import (
        main,
        leads,
        unidades,
        propostas,
        parametros,
        simulacao,
        localidades,
    )

    # 4. Registra cada blueprint na aplicação, definindo seus prefixos de URL
    app.register_blueprint(main.bp)
    app.register_blueprint(leads.bp)
    app.register_blueprint(unidades.bp)
    app.register_blueprint(propostas.bp)
    app.register_blueprint(parametros.bp)
    app.register_blueprint(simulacao.bp)
    app.register_blueprint(localidades.bp)

    print("--- Aplicação Flask criada e rotas registradas com sucesso! ---")

    return app
