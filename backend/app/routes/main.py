from flask import Blueprint, redirect

bp = Blueprint("main", __name__)


@bp.route("/")
def index():
    # Redireciona a rota raiz para a sua página principal do frontend
    return redirect("/leads.html")
