import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Testes E2E de Autenticação
 *
 * Testa o fluxo completo de autenticação:
 * - Registro de novo usuário
 * - Login com credenciais válidas e inválidas
 * - Acesso a rotas protegidas
 * - Validação de DTOs
 */
describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Aplicar mesmo ValidationPipe que o main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    prisma = app.get<PrismaService>(PrismaService);

    await app.init();
  });

  afterAll(async () => {
    // Limpar dados de teste
    await cleanupTestData();

    await prisma.$disconnect();
    await app.close();
  });

  afterEach(async () => {
    // Limpar usuários de teste após cada teste
    await prisma.usuario.deleteMany({
      where: {
        email: {
          contains: '@test.com',
        },
      },
    });
  });

  /**
   * Helper: Limpar dados de teste
   */
  async function cleanupTestData() {
    await prisma.usuario.deleteMany({
      where: {
        email: {
          contains: '@test.com',
        },
      },
    });
  }

  describe('POST /auth/registro', () => {
    it('deve registrar novo usuário com sucesso', () => {
      return request(app.getHttpServer())
        .post('/auth/registro')
        .send({
          nome: 'Usuário Teste',
          email: 'usuario@test.com',
          senha: 'senha123',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
          expect(res.body.access_token).toBeTruthy();
          expect(res.body.usuario).toHaveProperty('id');
          expect(res.body.usuario.nome).toBe('Usuário Teste');
          expect(res.body.usuario.email).toBe('usuario@test.com');
          expect(res.body.usuario.papelGlobal).toBe('USUARIO');
          expect(res.body.usuario).not.toHaveProperty('senhaHash');
        });
    });

    it('deve retornar 409 se email já cadastrado', async () => {
      // Primeiro registro
      await request(app.getHttpServer())
        .post('/auth/registro')
        .send({
          nome: 'Primeiro',
          email: 'duplicado@test.com',
          senha: 'senha123',
        })
        .expect(201);

      // Tentar registrar com mesmo email
      return request(app.getHttpServer())
        .post('/auth/registro')
        .send({
          nome: 'Segundo',
          email: 'duplicado@test.com',
          senha: 'outrasenha',
        })
        .expect(409)
        .expect((res) => {
          expect(res.body.message).toContain('Email já cadastrado');
        });
    });

    it('deve retornar 400 se dados inválidos', () => {
      return request(app.getHttpServer())
        .post('/auth/registro')
        .send({
          nome: 'Te', // Nome muito curto
          email: 'email-invalido',
          senha: '123', // Senha muito curta
        })
        .expect(400);
    });

    it('deve retornar 400 se email ausente', () => {
      return request(app.getHttpServer())
        .post('/auth/registro')
        .send({
          nome: 'Usuário Teste',
          senha: 'senha123',
        })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Criar usuário para testes de login
      await request(app.getHttpServer())
        .post('/auth/registro')
        .send({
          nome: 'Usuário Login',
          email: 'login@test.com',
          senha: 'senha123',
        });
    });

    it('deve fazer login com sucesso', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'login@test.com',
          senha: 'senha123',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
          expect(res.body.access_token).toBeTruthy();
          expect(res.body.usuario).toHaveProperty('id');
          expect(res.body.usuario.email).toBe('login@test.com');
          expect(res.body.usuario).not.toHaveProperty('senhaHash');
        });
    });

    it('deve retornar 401 se senha incorreta', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'login@test.com',
          senha: 'senhaerrada',
        })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toContain('Email ou senha inválidos');
        });
    });

    it('deve retornar 401 se email não existir', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'naoexiste@test.com',
          senha: 'senha123',
        })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toContain('Email ou senha inválidos');
        });
    });

    it('deve retornar 400 se dados inválidos', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'email-invalido',
          senha: '',
        })
        .expect(400);
    });
  });

  describe('GET /auth/perfil', () => {
    let authToken: string;

    beforeEach(async () => {
      // Registrar e obter token
      const response = await request(app.getHttpServer())
        .post('/auth/registro')
        .send({
          nome: 'Usuário Perfil',
          email: 'perfil@test.com',
          senha: 'senha123',
        });

      authToken = response.body.access_token;
    });

    it('deve retornar perfil do usuário autenticado', () => {
      return request(app.getHttpServer())
        .get('/auth/perfil')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.nome).toBe('Usuário Perfil');
          expect(res.body.email).toBe('perfil@test.com');
          expect(res.body.papelGlobal).toBe('USUARIO');
          expect(res.body).not.toHaveProperty('senhaHash');
        });
    });

    it('deve retornar 401 se não autenticado', () => {
      return request(app.getHttpServer())
        .get('/auth/perfil')
        .expect(401);
    });

    it('deve retornar 401 se token inválido', () => {
      return request(app.getHttpServer())
        .get('/auth/perfil')
        .set('Authorization', 'Bearer token-invalido')
        .expect(401);
    });
  });

  /**
   * Fluxo completo: Registro → Login → Acessar Perfil
   */
  describe('Fluxo Completo: Registro → Login → Perfil', () => {
    it('deve executar o fluxo de autenticação completo', async () => {
      const userData = {
        nome: 'Fluxo Completo',
        email: 'fluxo@test.com',
        senha: 'senha123',
      };

      // 1. Registrar
      const registroRes = await request(app.getHttpServer())
        .post('/auth/registro')
        .send(userData)
        .expect(201);

      expect(registroRes.body).toHaveProperty('access_token');
      const registroToken = registroRes.body.access_token;
      const userId = registroRes.body.usuario.id;

      // 2. Fazer login
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: userData.email,
          senha: userData.senha,
        })
        .expect(200);

      expect(loginRes.body).toHaveProperty('access_token');
      const loginToken = loginRes.body.access_token;
      expect(loginRes.body.usuario.id).toBe(userId);

      // 3. Acessar perfil com token de registro
      await request(app.getHttpServer())
        .get('/auth/perfil')
        .set('Authorization', `Bearer ${registroToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(userId);
          expect(res.body.email).toBe(userData.email);
        });

      // 4. Acessar perfil com token de login
      await request(app.getHttpServer())
        .get('/auth/perfil')
        .set('Authorization', `Bearer ${loginToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(userId);
          expect(res.body.email).toBe(userData.email);
        });
    });
  });
});
