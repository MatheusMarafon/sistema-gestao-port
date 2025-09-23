from flask import Flask
from flask_cors import CORS
from config import Config


def create_app(config_class=Config):
    app = Flask(__name__, static_folder="../../frontend", static_url_path="")
    app.config.from_object(config_class)
    CORS(app)

    from .routes import main
    from .routes import leads
    from .routes import unidades
    from .routes import propostas
    from .routes import parametros
    from .routes import simulacao
    from .routes import localidades

    app.register_blueprint(main.bp)
    app.register_blueprint(leads.bp)
    app.register_blueprint(unidades.bp)
    app.register_blueprint(propostas.bp)
    app.register_blueprint(parametros.bp)
    app.register_blueprint(simulacao.bp)
    app.register_blueprint(localidades.bp)

    return app
