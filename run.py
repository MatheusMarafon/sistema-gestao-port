
# Importa a função que cria nossa aplicação de dentro da pasta `backend/app`
from backend.app import create_app

# Cria a instância da aplicação, chamando a função que configuramos no __init__.py
app = create_app()

if __name__ == "__main__":
    # Roda o servidor de desenvolvimento do Flask
    # debug=True faz o servidor reiniciar automaticamente quando você salva uma alteração.
    app.run(debug=True, port=5000)
