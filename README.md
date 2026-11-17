# Amazon Agrosciences — Sistema de Gerenciamento de Estoque

Sistema web para gestão dos produtos armazenados nos galpões da Amazon Agrosciences,
com localização hierárquica: **Galpão → Setor/Área → Posição → Recipiente (IBC, barril...)**.

## Stack

| Camada    | Tecnologias                                                        |
|-----------|--------------------------------------------------------------------|
| Frontend  | React 19, TypeScript, Vite, CSS Modules, Lucide React              |
| Backend   | Python 3.11+, FastAPI, Pydantic v2, pydantic-settings, Uvicorn     |
| Banco     | MongoDB, via API assíncrona oficial do PyMongo (`AsyncMongoClient`) |

> O Motor foi descontinuado pelo MongoDB; a API assíncrona do PyMongo é a substituta oficial.

## Módulos disponíveis

| Tela              | O que faz                                                                                       |
|-------------------|--------------------------------------------------------------------------------------------------|
| **Dashboard**     | Produtos, recipientes, volume total, ocupação, estoque baixo, validade próxima, últimas movimentações |
| **Mapa do estoque** | Planta 2D de cada galpão. Cada setor é uma grade de posições; IBCs e barris aparecem com a cor do produto e o nível em litros. Busca "onde está?" destaca no mapa |
| **Produtos**      | Cadastro de fertilizantes: código, nome, categoria, composição, densidade, pH, risco, armazenamento, estoque mínimo e cor no mapa |
| **Movimentações** | Histórico de entradas, saídas, transferências e remoções, com responsável e horário |
| **Galpões**       | Cadastro de galpões e setores (linhas × colunas de posições), sem precisar mexer no código |

### Fluxo do dia a dia

1. **Galpões** → cadastre o galpão e os setores (ex.: Setor A com 4 linhas × 8 colunas = 32 posições).
2. **Produtos** → cadastre o fertilizante. Ao salvar, o sistema oferece "Armazenar agora".
3. **Mapa** → clique numa posição livre, informe produto, tipo (IBC/barril), litros, lote e validade.
4. Para achar algo, digite na busca do mapa (produto, código do IBC, lote ou posição como `G01-A-07`).
5. Clique num recipiente para registrar entrada, saída, transferência ou remoção.

O código de posição segue o padrão **`GALPÃO-SETOR-POSIÇÃO`**, ex.: `G01-A-07` = Galpão 01, Setor A, Posição 07
(numeradas da esquerda para a direita, linha a linha).

Para conhecer o sistema com o banco vazio, use **"Gerar dados de exemplo"** no Dashboard (cria 5 galpões,
7 fertilizantes e recipientes distribuídos).

### Consistência garantida pelo backend

- Códigos únicos de galpão, setor, produto e recipiente; nome de produto único (ignora maiúsculas e acentos).
- Uma posição só pode ter um recipiente ativo (índice único no MongoDB).
- Entradas e saídas não ultrapassam a capacidade nem deixam volume negativo (atualização atômica).
- Toda operação gera uma movimentação com responsável e data/hora.
- Produto com histórico é arquivado, não apagado; galpão/setor com recipientes não pode ser excluído.

## Estrutura

```
AmazonAgrosciences/
├── backend/
│   ├── app/
│   │   ├── core/          # configurações (.env), logging, exceções
│   │   ├── database/      # conexão MongoDB e nomes das coleções
│   │   ├── models/        # documentos do banco (próximas etapas)
│   │   ├── schemas/       # validação Pydantic (entrada/saída da API)
│   │   ├── services/      # regras de negócio (próximas etapas)
│   │   ├── routes/        # endpoints REST, agregados em /api/v1
│   │   └── main.py        # criação da aplicação FastAPI
│   ├── .env.example
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/    # componentes reutilizáveis
│   │   ├── pages/         # telas
│   │   ├── hooks/         # hooks customizados
│   │   ├── services/      # cliente HTTP e serviços por módulo
│   │   ├── contexts/      # contextos globais (ex.: autenticação)
│   │   ├── types/         # tipos TypeScript
│   │   ├── styles/        # variáveis de design e estilos globais
│   │   └── assets/
│   ├── .env.example
│   └── package.json
├── setup.bat              # instala tudo (Windows)
├── iniciar-backend.bat
└── iniciar-frontend.bat
```

## Pré-requisitos

- **Python 3.11 ou superior**: marque "Add python.exe to PATH" na instalação
- **Node.js 20.19+ ou 22 LTS** (exigência do Vite 7)
- **MongoDB**: um dos dois:
  - *MongoDB Community Server* instalado localmente (`mongodb://localhost:27017`), ou
  - um cluster gratuito no *MongoDB Atlas*, com a URI colocada em `backend\.env`

Confira no CMD:

```cmd
python --version
node --version
npm --version
```

## Instalação (uma vez só)

Dê dois cliques em `setup.bat`, ou no CMD:

```cmd
cd C:\Users\User\Desktop\AmazonAgrosciences
setup.bat
```

O script cria o ambiente virtual Python, instala as dependências do backend e do frontend e
cria os arquivos `.env` a partir dos `.env.example`.

## Executando pelo CMD do Windows

Use **duas janelas do CMD**, uma para cada parte.

**Janela 1 — Backend**

```cmd
cd C:\Users\User\Desktop\AmazonAgrosciences\backend
.venv\Scripts\activate
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**Janela 2 — Frontend**

```cmd
cd C:\Users\User\Desktop\AmazonAgrosciences\frontend
npm run dev
```

Atalho: dois cliques em `iniciar-backend.bat` e `iniciar-frontend.bat`.

## Endereços

| O quê                     | URL                                   |
|---------------------------|---------------------------------------|
| Sistema (frontend)        | http://localhost:5173                 |
| API                       | http://127.0.0.1:8000                 |
| Documentação da API       | http://127.0.0.1:8000/docs            |
| Health check              | http://127.0.0.1:8000/api/v1/health   |

A tela inicial mostra o status do frontend, da API e do MongoDB. Se os três estiverem
"Operacional", a integração está funcionando.

## Variáveis de ambiente

- `backend\.env`: URI do MongoDB, nome do banco, origens CORS. **Nunca versione este arquivo.**
- `frontend\.env`: apenas a URL da API. Tudo que começa com `VITE_` fica visível no navegador.

## Solução de problemas

| Sintoma                                     | Causa provável / solução                                              |
|---------------------------------------------|-----------------------------------------------------------------------|
| `'python' não é reconhecido`                | Reinstale o Python marcando "Add to PATH", ou use `py` no lugar.      |
| API "Indisponível" na tela                  | O backend não está rodando na janela 1.                               |
| MongoDB "Indisponível"                      | Serviço MongoDB parado ou URI errada em `backend\.env`.               |
| `npm` bloqueado no PowerShell               | Use o CMD, não o PowerShell, ou rode `npm.cmd`.                       |
