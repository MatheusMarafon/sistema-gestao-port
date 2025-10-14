# Sistema de Gerenciamento de Leads e Simulação

Este é um projeto full-stack desenvolvido como parte do meu portfólio, demonstrando habilidades em desenvolvimento back-end com Python/Flask e front-end com HTML, CSS e JavaScript.

**Nota Importante:** A versão original deste projeto conectava-se a um banco de dados MS Access corporativo. Para este portfólio público, o sistema foi migrado para usar um arquivo JSON como banco de dados simulado (`instance/dados.json`). Além disso, a lógica de negócio para os cálculos de simulação foi anonimizada e simplificada para proteger informações proprietárias.

## Funcionalidades Principais

- **Gerenciamento de Leads:** CRUD completo para clientes e contatos.
- **Criação de Propostas:** Geração de novas propostas associadas a leads e unidades consumidoras.
- **Simulação de Custos:** Cálculos de parâmetros de energia.
- **Painel de Parâmetros:** Interface para ajustar dados de simulação, tarifas e outros.

## Tecnologias Utilizadas

- **Back-end:** Python, Flask
- **Front-end:** HTML, CSS, JavaScript, Bootstrap 5
- **Dados:** JSON, Pandas (para o arquivo de localidades)

## Como Rodar o Projeto Localmente

1.  **Clone o Repositório**
    ```bash
    git clone [https://github.com/seu-usuario/sistema-leads-portfolio.git](https://github.com/seu-usuario/sistema-leads-portfolio.git)
    cd sistema-leads-portfolio
    ```

2.  **Crie e Ative um Ambiente Virtual**
    ```bash
    # Windows
    python -m venv venv
    .\venv\Scripts\activate

    # macOS/Linux
    python3 -m venv venv
    source venv/bin/activate
    ```

3.  **Instale as Dependências**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Configure os Dados Iniciais**
    - Crie a pasta `backend/instance`.
    - Dentro de `backend/instance`, crie um arquivo `dados.json` com a estrutura de chaves vazias (ex: `{"CadastroLead": [], ...}`).

5.  **Execute a Aplicação**
    ```bash
    python run.py
    ```

6.  Abra seu navegador e acesse `http://127.0.0.1:5000`.