# Flui Charge Platform — Etapa 3

Ecossistema completo de recarga de veículos elétricos: app mobile para motoristas, painel administrativo web e backend com API REST + autenticação JWT.

---

## Arquitetura

```
┌─────────────────────────┐     HTTPS / REST      ┌──────────────────────────┐
│   App Mobile            │ ──────────────────────▶│  Backend (Node.js)       │
│   mobile.html + JS      │                        │  Express + JWT           │
│   PWA / OpenStreetMap   │ ◀──────────────────────│  Porta 3001              │
└─────────────────────────┘     JSON Responses     └──────────┬───────────────┘
                                                              │
┌─────────────────────────┐     HTTPS / REST                 │ SQLite
│   Plataforma Web Admin  │ ──────────────────────▶          │ (better-sqlite3)
│   admin.html + JS       │                        └──────────▼───────────────┐
│   Chart.js + CRUD       │ ◀──────────────────────          flui.db          │
└─────────────────────────┘                        └──────────────────────────┘
```

### Stack

| Camada       | Tecnologia                                      |
|--------------|-------------------------------------------------|
| Frontend     | HTML5 · CSS3 · JavaScript (Vanilla)             |
| Mapa         | OpenStreetMap (iframe embed)                    |
| Gráficos     | Chart.js 4                                      |
| Backend      | Node.js 18 · Express 4                          |
| Banco        | SQLite via `better-sqlite3`                     |
| Auth         | JWT (jsonwebtoken) · bcryptjs                   |
| Deploy front | Vercel                                          |
| Deploy back  | Railway                                         |

---

## Banco de dados

### Tabelas

| Tabela            | Descrição                                         |
|-------------------|---------------------------------------------------|
| `users`           | Motoristas e administradores com hash de senha    |
| `stations`        | Pontos de recarga (conectores, potência, coords)  |
| `reviews`         | Avaliações de motoristas por ponto                |
| `reservations`    | Reservas de conector com TTL de 15 min            |
| `charge_history`  | Histórico de recargas (kWh, duração, custo)       |

### Diagrama simplificado

```
users ──< reviews >── stations
users ──< reservations >── stations
users ──< charge_history >── stations
```

---

## API REST — Endpoints

### Autenticação

| Método | Endpoint             | Auth | Descrição                      |
|--------|----------------------|------|--------------------------------|
| POST   | `/api/auth/login`    | ✗    | Login (motorista ou admin)     |
| POST   | `/api/auth/register` | ✗    | Cadastro de motorista          |
| GET    | `/api/auth/me`       | JWT  | Dados do usuário logado        |

**Corpo login:**
```json
{ "email": "carlos@flui.com", "password": "123456" }
```

**Resposta:**
```json
{ "token": "eyJ...", "user": { "id": 2, "name": "Carlos Mendes", "role": "driver", ... } }
```

---

### Estações

| Método | Endpoint                       | Auth         | Descrição                  |
|--------|--------------------------------|--------------|----------------------------|
| GET    | `/api/stations`                | ✗            | Lista com filtros opcionais |
| GET    | `/api/stations/:id`            | ✗            | Detalhe + avaliações        |
| POST   | `/api/stations`                | Admin        | Criar ponto                 |
| PUT    | `/api/stations/:id`            | Admin        | Atualizar ponto             |
| DELETE | `/api/stations/:id`            | Admin        | Excluir ponto               |
| POST   | `/api/stations/:id/reserve`    | Driver (JWT) | Reservar conector (15 min)  |
| POST   | `/api/stations/:id/reviews`    | Driver (JWT) | Enviar avaliação            |

**Filtros GET `/api/stations`:**
- `?connector=CCS2` — tipo de conector
- `?power=100` — potência mínima (kW)
- `?amenity=Wi-Fi` — comodidade
- `?q=paulista` — busca por texto
- `?status=Ativo` — status do ponto

---

### Usuários

| Método | Endpoint                    | Auth | Descrição                    |
|--------|-----------------------------|------|------------------------------|
| GET    | `/api/users/me`             | JWT  | Perfil do usuário            |
| PUT    | `/api/users/me`             | JWT  | Atualizar nome, carro, senha |
| GET    | `/api/users/me/history`     | JWT  | Histórico de recargas        |
| GET    | `/api/users/me/reservations`| JWT  | Reservas recentes            |

---

### Admin

| Método | Endpoint                              | Auth  | Descrição                     |
|--------|---------------------------------------|-------|-------------------------------|
| GET    | `/api/admin/metrics`                  | Admin | KPIs do painel                |
| GET    | `/api/admin/reports`                  | Admin | Relatórios e gráficos         |
| GET    | `/api/admin/users`                    | Admin | Lista de motoristas           |
| PATCH  | `/api/admin/stations/:id/availability`| Admin | Atualizar vagas disponíveis   |

---

## Autenticação diferenciada

- **Motorista** (`role: "driver"`)  — acessa o app mobile, pode reservar e avaliar.
- **Administrador** (`role: "admin"`) — acessa o painel web via `colaborador.html` ou `admin.html`, pode criar/editar/excluir pontos, ver relatórios e gerir motoristas.

O token JWT é assinado com `JWT_SECRET` (variável de ambiente) e expira em **7 dias**.

---

## Como rodar localmente

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# Edite .env com seu JWT_SECRET se quiser
node src/seed.js   # popula o banco com dados demo
npm run dev        # nodemon — reinicia automaticamente
```

A API ficará disponível em `http://localhost:3001`.

### 2. Frontend

```bash
# Na raiz do projeto (onde está mobile.html)
python3 -m http.server 4173
```

Acesse:
- `http://localhost:4173/` — landing page
- `http://localhost:4173/mobile.html` — app mobile
- `http://localhost:4173/admin.html` — painel admin
- `http://localhost:4173/colaborador.html` — login colaborador

### Credenciais demo

| Tipo         | E-mail             | Senha    |
|--------------|--------------------|----------|
| Admin        | admin@flui.com     | admin123 |
| Motorista 1  | carlos@flui.com    | 123456   |
| Motorista 2  | ana@flui.com       | 123456   |

---

## Deploy

### Backend — Railway

1. Crie um projeto no [Railway](https://railway.app)
2. Conecte o repositório GitHub
3. Configure o **Root Directory** como `backend`
4. Adicione as variáveis de ambiente:
   ```
   PORT=3001
   JWT_SECRET=<segredo_forte_aqui>
   CORS_ORIGIN=https://seu-projeto.vercel.app
   ```
5. O Railway detecta automaticamente o `package.json` e executa `npm start`
6. Copie a URL gerada (ex: `https://flui-backend.up.railway.app`)

### Frontend — Vercel

1. Importe o repositório no [Vercel](https://vercel.com)
2. Configure o **Root Directory** como `.` (raiz do projeto front)
3. Atualize a URL da API em `config.js`:
   ```js
   : 'https://flui-backend.up.railway.app/api'
   ```
4. Deploy automático a cada push

---

## Funcionalidades entregues

### App Mobile (`mobile.html`)
- ✅ Login/cadastro com JWT real
- ✅ Mapa interativo (OpenStreetMap) com pins dinâmicos
- ✅ Ficha completa do ponto com conectores, comodidades e horários
- ✅ Filtros por conector, potência mínima, comodidade e texto livre
- ✅ Reserva de conector via API (TTL 15 min)
- ✅ Avaliações com star-picker e envio à API
- ✅ Perfil do usuário com edição persistida
- ✅ PWA (manifest + theme-color)

### Plataforma Web Admin (`admin.html`)
- ✅ Login admin com JWT (role check)
- ✅ Métricas em tempo real (6 KPIs)
- ✅ CRUD completo de pontos de recarga
- ✅ Gestão de disponibilidade inline por ponto
- ✅ Visualização de avaliações por ponto
- ✅ Relatórios: gráfico de reservas (7 dias), top pontos, top avaliados
- ✅ Lista de motoristas cadastrados

### Backend (`backend/`)
- ✅ API REST completa com 18 endpoints
- ✅ Auth JWT diferenciada (driver / admin)
- ✅ Banco SQLite robusto com 5 tabelas e FK
- ✅ CORS configurável por variável de ambiente
- ✅ Seed automatizado com dados demo

---

## Estrutura do repositório

```
flui-projeto-para-compartilhar-2026-05-22/
├── backend/
│   ├── server.js            # Entry point Express
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── db.js            # SQLite — criação de tabelas
│       ├── seed.js          # Popula banco com dados demo
│       ├── middleware/
│       │   └── auth.js      # JWT middleware (driver + admin)
│       └── routes/
│           ├── auth.js      # Login e registro
│           ├── stations.js  # CRUD + reserva + avaliação
│           ├── users.js     # Perfil e histórico
│           └── admin.js     # Métricas, relatórios, motoristas
├── assets/                  # SVGs e imagens
├── mobile.html              # App mobile (PWA)
├── mobile.js                # Lógica do app — integrado com API
├── mobile.css
├── admin.html               # Painel administrativo
├── admin.js                 # Lógica do painel — integrado com API
├── styles.css
├── colaborador.html         # Login colaborador → redireciona ao painel
├── site.js                  # Auth real no login colaborador
├── config.js                # URL da API (dev / produção)
├── data.js                  # Dados fallback (sem backend)
├── index.html               # Landing page
├── landing.css
├── manifest.webmanifest     # PWA manifest
└── vercel.json              # Configuração de deploy
```
