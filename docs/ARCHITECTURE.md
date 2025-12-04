# Arquitetura - Backend Desbrava Provas

## 📐 Visão Geral

O backend do Desbrava Provas é construído com **NestJS**, seguindo princípios de Clean Architecture e Domain-Driven Design (DDD). A aplicação utiliza **PostgreSQL** como banco de dados com **Prisma ORM** para migrations e queries.

## 🏗️ Stack Tecnológica

### Core
- **Runtime**: Node.js (v22+)
- **Framework**: NestJS 11.x
- **Linguagem**: TypeScript 5.7+
- **Package Manager**: npm

### Banco de Dados
- **Database**: PostgreSQL 15+ (rodando em Docker)
- **ORM**: Prisma 7.1+
- **Migrations**: Prisma Migrate

### Autenticação & Segurança
- **JWT**: JSON Web Tokens para autenticação stateless (expiração: 24h)
- **Passport**: Middleware de autenticação com estratégia JWT
- **Bcrypt**: Hash de senhas (10 salt rounds)
- **Guards**: JwtAuthGuard (autenticação) + RolesGuard (autorização)
- **Validation**: class-validator para validação de DTOs
- ✅ **Status**: Implementado (Sessão 01)

### Integrações
- **IA**: OpenAI API ou Anthropic Claude (para geração de questões)
- **OCR**: Tesseract.js ou Google Vision API
- **Storage**: Sistema de arquivos local (desenvolvimento) / AWS S3 (produção)

### Testes
- **Framework**: Jest 30.x
- **E2E**: Supertest 7.x
- **Coverage**: Jest Coverage (meta: >80%)

### Documentação
- **API Docs**: Swagger/OpenAPI 3.0
- **Code Docs**: Compodoc
- **Markdown**: docs/ folder

---

## 🗂️ Estrutura de Pastas

```
backend-desbravaprovas/
├── prisma/
│   ├── schema.prisma           # Schema do banco de dados
│   └── migrations/             # Migrations versionadas
├── src/
│   ├── main.ts                 # Bootstrap da aplicação
│   ├── app.module.ts           # Módulo raiz
│   │
│   ├── common/                 # Recursos compartilhados
│   │   ├── decorators/         # Decorators customizados
│   │   ├── filters/            # Exception filters globais
│   │   ├── guards/             # Guards de autenticação/autorização
│   │   ├── interceptors/       # Interceptors (logging, transformação)
│   │   ├── pipes/              # Validation pipes
│   │   └── utils/              # Utilitários diversos
│   │
│   ├── config/                 # Configurações da aplicação
│   │   ├── database.config.ts
│   │   ├── jwt.config.ts
│   │   └── ...
│   │
│   ├── prisma/                 # Módulo Prisma
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   │
│   ├── auth/                   # Módulo de autenticação
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── strategies/         # Passport strategies (JWT)
│   │   ├── guards/             # Guards específicos
│   │   └── dto/                # DTOs de login/registro
│   │
│   ├── usuarios/               # Módulo de usuários
│   │   ├── usuarios.module.ts
│   │   ├── usuarios.controller.ts
│   │   ├── usuarios.service.ts
│   │   └── dto/
│   │
│   ├── clubes/                 # Módulo de clubes e unidades
│   │   ├── clubes.module.ts
│   │   ├── clubes.controller.ts
│   │   ├── clubes.service.ts
│   │   ├── unidades/           # Submodule de unidades
│   │   └── dto/
│   │
│   ├── membros/                # Módulo de membros e aprovações
│   │   ├── membros.module.ts
│   │   ├── membros.controller.ts
│   │   ├── membros.service.ts
│   │   └── dto/
│   │
│   ├── especialidades/         # Módulo de especialidades
│   │   ├── especialidades.module.ts
│   │   ├── especialidades.controller.ts
│   │   ├── especialidades.service.ts
│   │   └── dto/
│   │
│   ├── provas/                 # Módulo de provas
│   │   ├── provas.module.ts
│   │   ├── provas.controller.ts
│   │   ├── provas.service.ts
│   │   └── dto/
│   │
│   ├── questoes/               # Módulo de questões
│   │   ├── questoes.module.ts
│   │   ├── questoes.controller.ts
│   │   ├── questoes.service.ts
│   │   ├── ia/                 # Geração por IA
│   │   └── dto/
│   │
│   ├── respostas/              # Módulo de respostas
│   │   ├── respostas.module.ts
│   │   ├── respostas.controller.ts
│   │   ├── respostas.service.ts
│   │   ├── correcao/           # Correção automática
│   │   └── dto/
│   │
│   ├── ocr/                    # Módulo OCR
│   │   ├── ocr.module.ts
│   │   ├── ocr.controller.ts
│   │   ├── ocr.service.ts
│   │   └── dto/
│   │
│   └── uploads/                # Módulo de upload de arquivos
│       ├── uploads.module.ts
│       ├── uploads.controller.ts
│       └── uploads.service.ts
│
├── test/                       # Testes E2E
│   └── *.e2e-spec.ts
│
├── docs/                       # Documentação
│   ├── ARCHITECTURE.md         # Este arquivo
│   ├── API.md
│   ├── DATABASE.md
│   ├── DEVELOPMENT.md
│   ├── BUSINESS_RULES.md
│   └── DOCUMENTATION_STRATEGY.md
│
└── uploads/                    # Arquivos enviados (gitignored)
    ├── profiles/               # Fotos de perfil
    └── ocr/                    # Provas escaneadas
```

---

## 🎯 Princípios Arquiteturais

### 1. Modularização
- Cada feature é um módulo NestJS independente
- Módulos comunicam-se através de injeção de dependência
- Evitar dependências circulares

### 2. Separation of Concerns
- **Controllers**: Recebem requisições HTTP, validam entrada, retornam respostas
- **Services**: Contêm lógica de negócio, orquestram operações
- **Repository Pattern**: Prisma Service abstrai acesso ao banco
- **DTOs**: Validação e transformação de dados de entrada/saída

### 3. Dependency Injection
- NestJS IoC container gerencia todas as dependências
- Facilita testes com mocks
- Promove baixo acoplamento

### 4. Guards & Interceptors
- **Guards**: Autenticação (JWT) e autorização (roles/permissions)
- **Interceptors**: Logging, transformação de resposta, cache
- **Pipes**: Validação com class-validator
- **Filters**: Tratamento centralizado de exceções

### 5. Testabilidade
- Cada service tem seu teste unitário (.spec.ts)
- Testes E2E para fluxos críticos
- Mocks para dependências externas (IA, OCR, DB)

---

## 🔄 Fluxo de Requisição

```
HTTP Request
    ↓
[Middleware]
    ↓
[Guards] → Autenticação JWT
    ↓
[Guards] → Autorização (Roles/Permissions)
    ↓
[Pipes] → Validação de DTOs
    ↓
[Controller] → Roteamento
    ↓
[Service] → Lógica de Negócio
    ↓
[Prisma Service] → Acesso ao Banco
    ↓
[Database] → PostgreSQL
    ↓
[Service] → Retorna resultado
    ↓
[Interceptors] → Transformação/Logging
    ↓
[Exception Filters] → Tratamento de erros
    ↓
HTTP Response (JSON)
```

---

## 🔐 Autenticação & Autorização

### Estratégia JWT

1. **Login**: POST /auth/login
   - Valida email/senha
   - Retorna access_token (JWT)
   - Payload: { sub: userId, email, papelGlobal }

2. **Requisições protegidas**: Header `Authorization: Bearer <token>`
   - Guard JWT valida token
   - Extrai payload e injeta no request.user

3. **Autorização por papéis**:
   - Guard customizado `@Roles()` verifica papelGlobal ou papel no clube
   - Decorator `@GetUser()` extrai usuário do request

### Fluxo de Aprovação

1. Usuário se cadastra → StatusMembro = PENDENTE
2. Admin do clube aprova → StatusMembro = ATIVO
3. Apenas membros ATIVO acessam recursos do clube

---

## 📊 Banco de Dados

### Prisma ORM

**Vantagens**:
- Type-safe queries (TypeScript completo)
- Migrations automáticas e versionadas
- Cliente auto-gerado
- Excelente DX (Developer Experience)

**Prisma Service**:
```typescript
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

### Estratégia de Migrations

- **Desenvolvimento**: `npx prisma migrate dev`
- **Produção**: `npx prisma migrate deploy`
- Cada migration é versionada e rastreável
- Nunca editar migrations aplicadas

---

## 🤖 Integração com IA

### Geração de Questões

**Provider**: OpenAI GPT-4 ou Anthropic Claude

**Prompt Engineering**:
```
Contexto: Especialidade de Desbravadores "[Nome da Especialidade]"
Tarefa: Gere 10 questões de múltipla escolha
Formato: JSON com enunciado, 5 alternativas, resposta correta
```

**Serviço**:
- `questoes/ia/ia-generator.service.ts`
- Rate limiting para evitar custos excessivos
- Cache de questões geradas

---

## 🖼️ OCR (Optical Character Recognition)

### Provider

**Opções**:
1. **Tesseract.js** (Open-source, grátis)
   - Bom para provas simples
   - Requer pré-processamento de imagem

2. **Google Vision API** (Pago)
   - Maior precisão
   - Suporta marcações de checkbox

### Fluxo

1. Upload de foto da prova → `/ocr/scan`
2. Pré-processamento (crop, threshold, binarização)
3. OCR extrai marcações (A, B, C, D, E)
4. Retorna JSON: `{ "1": "A", "2": "C", ... }`
5. Usuário revisa e confirma

---

## 📁 Upload de Arquivos

### Storage

**Desenvolvimento**: Sistema de arquivos local (`uploads/`)
**Produção**: AWS S3 ou equivalente

### Tipos de Upload

1. **Foto de perfil**:
   - Rota: `/uploads/profile`
   - Formato: JPG, PNG
   - Tamanho máx: 5MB
   - Resize automático: 300x300px

2. **Prova escaneada (OCR)**:
   - Rota: `/ocr/upload`
   - Formato: JPG, PNG, PDF
   - Tamanho máx: 10MB
   - Processamento assíncrono

---

## 🧪 Estratégia de Testes

### Testes Unitários

**Alvo**: Services, Guards, Pipes
**Coverage**: >80%

```typescript
describe('ProvasService', () => {
  let service: ProvasService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ProvasService, PrismaService],
    }).compile();

    service = module.get<ProvasService>(ProvasService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('deve criar uma prova', async () => {
    // ...
  });
});
```

### Testes E2E

**Alvo**: Fluxos completos de usuário
**Banco**: Test database (separado)

```typescript
describe('Provas (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Setup test app
  });

  it('POST /provas - deve criar uma prova', () => {
    return request(app.getHttpServer())
      .post('/provas')
      .set('Authorization', `Bearer ${token}`)
      .send(dto)
      .expect(201);
  });
});
```

---

## 🚀 Deployment

### Variáveis de Ambiente

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# IA Provider
OPENAI_API_KEY=sk-...
# ou
ANTHROPIC_API_KEY=sk-ant-...

# OCR
GOOGLE_VISION_API_KEY=...

# Storage (Produção)
AWS_S3_BUCKET=desbrava-provas
AWS_REGION=us-east-1
```

### Docker

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npx prisma generate
RUN npm run build
CMD ["npm", "run", "start:prod"]
```

---

## 🔄 Versionamento (Preparado para o futuro)

### Estrutura de Versões

Quando lançarmos a v1.0, a estrutura estará pronta:

```
src/
├── v1/                   # API v1 (estável)
│   ├── auth/
│   ├── usuarios/
│   └── ...
│
└── v2/                   # API v2 (futuro)
    ├── auth/
    └── ...
```

### Estratégia de Versionamento

- **URL-based**: `/api/v1/provas`, `/api/v2/provas`
- **Header-based** (alternativo): `Accept: application/vnd.api+json; version=1`
- Manter v1 por pelo menos 6 meses após lançamento da v2

---

## 📈 Decisões Arquiteturais Importantes

### ADR 001: Por que NestJS?
- Framework opinativo (reduz decisões)
- Arquitetura modular escalável
- Suporte nativo a TypeScript
- Ecossistema rico (Swagger, Prisma, Jest)

### ADR 002: Por que Prisma?
- Type-safety completo
- Migrations automáticas
- Melhor DX que TypeORM
- Comunidade ativa

### ADR 003: JWT Stateless
- Escalabilidade (sem sessões no servidor)
- Funciona bem com mobile
- Simples de implementar

### ADR 004: Monolito Modular (não Microservices)
- Complexidade adequada ao projeto
- Mais fácil de desenvolver e debugar
- Possível migrar para microservices no futuro

---

**Versão**: 0.1.0-beta
**Última atualização**: 2025-12-04
**Autor**: Backend Team
