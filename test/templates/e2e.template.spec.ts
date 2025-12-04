import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

/**
 * Template para testes E2E (End-to-End)
 *
 * INSTRUÇÕES:
 * 1. Copie este arquivo para test/
 * 2. Renomeie para: nome-do-modulo.e2e-spec.ts
 * 3. Substitua 'exemplo' pelo nome do seu módulo
 * 4. Implemente os testes de fluxo completo
 * 5. Delete este comentário
 */

class PrismaServiceEx extends PrismaService {
    exemplo: any;
}

describe('Exemplo (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaServiceEx;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get<PrismaServiceEx>(PrismaServiceEx);

    await app.init();

    // Opcional: criar usuário de teste e fazer login
    await setupTestUser();
  });

  afterAll(async () => {
    // Limpar dados de teste
    await cleanupTestData();

    await prisma.$disconnect();
    await app.close();
  });

  afterEach(async () => {
    // Limpar dados entre testes (opcional)
  });

  /**
   * Setup: Criar usuário de teste e obter token JWT
   */
  async function setupTestUser() {
    // Criar usuário de teste
    const usuario = await prisma.usuario.create({
      data: {
        nome: 'Usuário Teste',
        email: 'teste@exemplo.com',
        senhaHash: await hashPassword('senha123'),
        papelGlobal: 'USUARIO',
      },
    });

    // Fazer login e obter token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'teste@exemplo.com',
        senha: 'senha123',
      });

    authToken = loginResponse.body.access_token;
  }

  /**
   * Cleanup: Remover dados de teste
   */
  async function cleanupTestData() {
    // Delete em ordem reversa das foreign keys
    await prisma.respostaProva.deleteMany();
    await prisma.questao.deleteMany();
    await prisma.prova.deleteMany();
    await prisma.membroClube.deleteMany();
    await prisma.unidade.deleteMany();
    await prisma.clube.deleteMany();
    await prisma.usuario.deleteMany();
  }

  /**
   * Helper: Hash de senha (copiar do seu auth service)
   */
  async function hashPassword(senha: string): Promise<string> {
    const bcrypt = require('bcrypt');
    return bcrypt.hash(senha, 10);
  }

  describe('POST /exemplo', () => {
    it('deve criar um novo registro', () => {
      return request(app.getHttpServer())
        .post('/exemplo')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          campo1: 'valor1',
          campo2: 'valor2',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.campo1).toBe('valor1');
          expect(res.body.campo2).toBe('valor2');
        });
    });

    it('deve retornar 400 se dados inválidos', () => {
      return request(app.getHttpServer())
        .post('/exemplo')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // dados incompletos
        })
        .expect(400);
    });

    it('deve retornar 401 se não autenticado', () => {
      return request(app.getHttpServer())
        .post('/exemplo')
        .send({
          campo1: 'valor1',
        })
        .expect(401);
    });
  });

  describe('GET /exemplo', () => {
    it('deve retornar lista de registros', async () => {
      // Criar registros de teste
      await prisma.exemplo.createMany({
        data: [
          { campo1: 'valor1', campo2: 'valor2' },
          { campo1: 'valor3', campo2: 'valor4' },
        ],
      });

      return request(app.getHttpServer())
        .get('/exemplo')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThanOrEqual(2);
        });
    });

    it('deve retornar lista vazia se não houver registros', () => {
      return request(app.getHttpServer())
        .get('/exemplo')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('GET /exemplo/:id', () => {
    it('deve retornar um registro por ID', async () => {
      const registro = await prisma.exemplo.create({
        data: { campo1: 'valor1', campo2: 'valor2' },
      });

      return request(app.getHttpServer())
        .get(`/exemplo/${registro.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(registro.id);
          expect(res.body.campo1).toBe('valor1');
        });
    });

    it('deve retornar 404 se não encontrar', () => {
      return request(app.getHttpServer())
        .get('/exemplo/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('PATCH /exemplo/:id', () => {
    it('deve atualizar um registro', async () => {
      const registro = await prisma.exemplo.create({
        data: { campo1: 'valor1', campo2: 'valor2' },
      });

      return request(app.getHttpServer())
        .patch(`/exemplo/${registro.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          campo1: 'novo valor',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.campo1).toBe('novo valor');
        });
    });
  });

  describe('DELETE /exemplo/:id', () => {
    it('deve deletar um registro', async () => {
      const registro = await prisma.exemplo.create({
        data: { campo1: 'valor1', campo2: 'valor2' },
      });

      return request(app.getHttpServer())
        .delete(`/exemplo/${registro.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verificar que foi deletado
      const deletado = await prisma.exemplo.findUnique({
        where: { id: registro.id },
      });
      expect(deletado).toBeNull();
    });
  });

  /**
   * TESTES DE FLUXO COMPLETO
   *
   * Teste cenários reais de uso da aplicação
   */
  describe('Fluxo Completo: Criar → Listar → Atualizar → Deletar', () => {
    it('deve executar o fluxo CRUD completo', async () => {
      // 1. Criar
      const createRes = await request(app.getHttpServer())
        .post('/exemplo')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ campo1: 'teste', campo2: 'fluxo' })
        .expect(201);

      const id = createRes.body.id;

      // 2. Listar e verificar que existe
      const listRes = await request(app.getHttpServer())
        .get('/exemplo')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(listRes.body.some((item) => item.id === id)).toBe(true);

      // 3. Buscar por ID
      await request(app.getHttpServer())
        .get(`/exemplo/${id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(id);
        });

      // 4. Atualizar
      await request(app.getHttpServer())
        .patch(`/exemplo/${id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ campo1: 'atualizado' })
        .expect(200)
        .expect((res) => {
          expect(res.body.campo1).toBe('atualizado');
        });

      // 5. Deletar
      await request(app.getHttpServer())
        .delete(`/exemplo/${id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // 6. Verificar que foi deletado
      await request(app.getHttpServer())
        .get(`/exemplo/${id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  /**
   * TESTES DE AUTORIZAÇÃO
   *
   * Verificar permissões de acesso
   */
  describe('Autorização e Permissões', () => {
    it('CONSELHEIRO pode criar provas', async () => {
      // Setup: criar usuário conselheiro
      // Test: criar prova
      // Assert: sucesso
    });

    it('DESBRAVADOR não pode criar provas', async () => {
      // Setup: criar usuário desbravador
      // Test: tentar criar prova
      // Assert: 403 Forbidden
    });
  });
});
