from flask import Blueprint, redirect
import os

bp = Blueprint("main", __name__)


@bp.route("/")
def index():
    # Redireciona a rota raiz para a sua página principal do frontend
    return redirect("/leads.html")


@bp.route("/favicon.ico")
def favicon():
    return "", 204
