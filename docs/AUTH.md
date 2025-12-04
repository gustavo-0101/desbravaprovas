# Documentação de Autenticação

## Visão Geral

Sistema de autenticação JWT (JSON Web Tokens) com bcrypt para hashing de senhas.

## Tecnologias

- **JWT**: Tokens stateless para autenticação
- **Passport**: Middleware de autenticação
- **Bcrypt**: Hashing de senhas (10 salt rounds)
- **class-validator**: Validação de DTOs

## Configuração

### Variáveis de Ambiente

```env
JWT_SECRET="dev-secret-key-change-in-production-2024"
JWT_EXPIRES_IN="24h"
```

⚠️ **IMPORTANTE**: Altere `JWT_SECRET` em produção para uma chave forte e aleatória.

## Endpoints

### POST /auth/registro

Registra novo usuário no sistema.

**Request Body:**
```json
{
  "nome": "João Silva",
  "email": "joao@exemplo.com",
  "senha": "senha123"
}
```

**Validações:**
- `nome`: 3-100 caracteres
- `email`: formato válido
- `senha`: mínimo 6 caracteres

**Response (201):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": {
    "id": 1,
    "nome": "João Silva",
    "email": "joao@exemplo.com",
    "papelGlobal": "USUARIO",
    "fotoPerfilUrl": null
  }
}
```

**Erros:**
- `409 Conflict`: Email já cadastrado
- `400 Bad Request`: Dados inválidos

---

### POST /auth/login

Autentica usuário existente.

**Request Body:**
```json
{
  "email": "joao@exemplo.com",
  "senha": "senha123"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": {
    "id": 1,
    "nome": "João Silva",
    "email": "joao@exemplo.com",
    "papelGlobal": "USUARIO",
    "fotoPerfilUrl": null
  }
}
```

**Erros:**
- `401 Unauthorized`: Email ou senha inválidos
- `400 Bad Request`: Dados inválidos

---

### GET /auth/perfil

Retorna dados do usuário autenticado.

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200):**
```json
{
  "id": 1,
  "nome": "João Silva",
  "email": "joao@exemplo.com",
  "papelGlobal": "USUARIO",
  "fotoPerfilUrl": null
}
```

**Erros:**
- `401 Unauthorized`: Token inválido, expirado ou ausente

## Arquitetura

### Fluxo de Autenticação

```
1. Cliente envia credenciais para /auth/login
2. AuthService valida email e senha (bcrypt)
3. Se válido, gera token JWT
4. Cliente recebe token
5. Cliente envia token no header Authorization em requisições futuras
6. JwtAuthGuard valida token
7. JwtStrategy extrai e valida usuário
8. Request.user é populado com dados do usuário
```

### Componentes

#### DTOs (Data Transfer Objects)

**LoginDto**
- `email`: string (required, email format)
- `senha`: string (required)

**RegistroDto**
- `nome`: string (required, 3-100 chars)
- `email`: string (required, email format)
- `senha`: string (required, min 6 chars)

#### Guards

**JwtAuthGuard**
- Protege rotas que requerem autenticação
- Respeita decorator `@Public()`
- Valida token JWT automaticamente

**RolesGuard**
- Autoriza acesso baseado em papéis globais
- Usado em conjunto com `@Roles()`
- Deve ser aplicado APÓS JwtAuthGuard

#### Decorators

**@Public()**
```typescript
@Public()
@Get('public-info')
getInfo() { ... }
```

**@Roles(...roles)**
```typescript
@Roles('MASTER', 'ADMIN_CLUBE')
@Post('admin-only')
adminAction() { ... }
```

**@CurrentUser(field?)**
```typescript
// Usuário completo
verPerfil(@CurrentUser() user: CurrentUserType) { ... }

// Apenas ID
criar(@CurrentUser('id') userId: number) { ... }
```

#### Strategy

**JwtStrategy**
- Extende PassportStrategy
- Valida token JWT
- Busca usuário no banco
- Popula `request.user`

**Payload JWT:**
```typescript
{
  sub: number;        // ID do usuário
  email: string;
  papelGlobal: string;
  iat?: number;       // issued at
  exp?: number;       // expiration
}
```

## Uso em Controllers

### Proteção Básica (Autenticação)

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth/guards';
import { CurrentUser } from './auth/decorators';

@Controller('usuarios')
@UseGuards(JwtAuthGuard)  // Todas as rotas requerem autenticação
export class UsuariosController {

  @Get('me')
  getMe(@CurrentUser() user: CurrentUserType) {
    return user;
  }
}
```

### Proteção com Papéis (Autorização)

```typescript
import { Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from './auth/guards';
import { Roles } from './auth/decorators';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)  // Ordem importa!
export class AdminController {

  @Post('action')
  @Roles('MASTER')  // Apenas MASTER
  masterAction() { ... }

  @Post('clube-action')
  @Roles('MASTER', 'ADMIN_CLUBE')  // MASTER OU ADMIN_CLUBE
  clubeAction() { ... }
}
```

### Rotas Públicas

```typescript
import { Controller, Get } from '@nestjs/common';
import { Public } from './auth/decorators';

@Controller('info')
export class InfoController {

  @Public()  // Não requer autenticação
  @Get('status')
  getStatus() {
    return { status: 'ok' };
  }
}
```

## Segurança

### Boas Práticas Implementadas

✅ Senhas nunca armazenadas em texto plano (bcrypt)
✅ Senhas nunca retornadas em respostas
✅ Tokens com expiração (24h padrão)
✅ Validação de entrada com class-validator
✅ Whitelist de propriedades (ValidationPipe)
✅ Logging de tentativas de login

### Melhorias Futuras (Produção)

- [ ] Rate limiting em endpoints de auth
- [ ] Refresh tokens
- [ ] Blacklist de tokens (logout)
- [ ] 2FA (Two-Factor Authentication)
- [ ] Account lockout após X tentativas
- [ ] Auditoria de logins
- [ ] Tokens curtos + refresh token longo

## Testes

### Unitários

```bash
npm test -- auth.service.spec.ts
```

Cobre:
- Login com credenciais válidas
- Login com email inexistente
- Login com senha incorreta
- Registro de novo usuário
- Registro com email duplicado
- Verificação de token

### E2E

```bash
npm run test:e2e -- auth.e2e-spec.ts
```

Cobre:
- Fluxo completo: Registro → Login → Perfil
- Validação de DTOs
- Códigos de status HTTP
- Proteção de rotas

## Troubleshooting

### "Token inválido ou expirado"

- Verifique se o token está no formato: `Bearer <token>`
- Token pode ter expirado (24h padrão)
- Faça login novamente para obter novo token

### "Email já cadastrado"

- Email deve ser único no sistema
- Use endpoint GET /auth/perfil para verificar se já está logado

### "Email ou senha inválidos"

- Verifique credenciais
- Email é case-sensitive no banco
- Senha deve ter no mínimo 6 caracteres

## Swagger

Documentação interativa disponível em:
```
http://localhost:3000/api-docs
```

Use o botão "Authorize" no Swagger para testar endpoints protegidos.
