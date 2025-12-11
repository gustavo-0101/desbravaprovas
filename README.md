# DesbravaProvas
[![License: CC BY-NC 4.0](https://img.shields.io/badge/License-CC%20BY--NC%204.0-blue.svg)](./LICENSE.txt)

Plataforma completa para criação, aplicação e correção de provas de especialidades para Clubes de Desbravadores.  
Desenvolvida com 
![NestJS](https://img.shields.io/badge/NestJS-11.x-E0234E?logo=nestjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-7.1-2D3748?logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-4169E1?logo=postgresql)
![Node.js](https://img.shields.io/badge/Node.js-22+-339933?logo=node.js)

---

## Funcionalidades

- Questões de múltipla escolha e dissertativas  
- Definição de valor por questão  
- Estrutura de **clubes e unidades**  
- Perfis individuais (desbravadores, conselheiros, admin)  
- Fluxo de aprovação para conselheiros  
- Impressão de provas  
- Correção automática via **foto da prova física**  
- Provas públicas, do clube ou apenas de uma unidade  
- Autenticação com JWT  
- Banco de dados PostgreSQL com Prisma 7 + driver adapter  
- **Geração de provas com IA** baseada na especialidade escolhida  

---

## Tecnologias Utilizadas

- **NestJS**
- **Node.js**
- **TypeScript**
- **PostgreSQL**
- **Prisma ORM 7**
- **Docker**
- **JWT**
- **IA (texto e OCR)**

---

## Rodando o projeto

### 1. Instalação
```bash
npm install
```

## Configuração do Ambiente

### 2. Configurar variáveis de ambiente

Crie um arquivo .env com:

```
DATABASE_URL="postgresql://NOMEDOBANCO:SENHADOBANCO123@localhost:5432/NOMEDOBANCO?schema=public&client_encoding=UTF8"

# JWT Configuration
JWT_SECRET="chave-secreta"
JWT_EXPIRES_IN="24h"

# Google OAuth2 Configuration
# Obter credenciais em: https://console.cloud.google.com/apis/credentials
GOOGLE_CLIENT_ID="id_google"
GOOGLE_CLIENT_SECRET="secret_google"
GOOGLE_CALLBACK_URL="http://localhost:3000/auth/google/callback"

# Email Configuration (NodeMailer)
# Para Gmail: use App Password (https://support.google.com/accounts/answer/185833)
# Para dev recomendamos o uso de Ethereal para testes.

MAIL_HOST="smtp.ethereal.email"
MAIL_PORT=587
MAIL_USER="gerar_com_ethereal"
MAIL_PASS="gerar_com_ethereal"
MAIL_FROM="noreply@desbravaprovas.com (ou como quiser chamar)"

# Application URL
APP_URL="http://localhost:3000"
```

### 3. Rodar migrations

```
npx prisma migrate dev
```

### 4. Gerar client do Prisma

```
npx prisma generate
```

### 5. Iniciar o servidor

```
npm run start:dev
```

## Estrutura do projeto

```
prisma/
src/
modules/
auth/
usuarios/
clubes/
unidades/
provas/
questoes/
prisma/
```

## 🤝 Contribuição

Contribuições são bem-vindas!
Apenas lembre que, por licença, o uso deve ser não comercial.

## Licença

Este projeto é licenciado sob a
**Creative Commons Attribution–NonCommercial 4.0 International (CC BY-NC 4.0).**

Você é livre para:

- copiar,
- modificar,
- adaptar,
- redistribuir,

desde que:

- **não seja para fins comerciais**.

Veja o arquivo LICENSE para mais informações.