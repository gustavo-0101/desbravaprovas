import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PapelGlobal } from '@prisma/client';

describe('Usuarios (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let userId: number;
  let masterToken: string;
  let masterId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    prisma = app.get<PrismaService>(PrismaService);

    // Limpar banco antes dos testes
    await prisma.respostaProva.deleteMany();
    await prisma.questao.deleteMany();
    await prisma.prova.deleteMany();
    await prisma.membroClube.deleteMany();
    await prisma.unidade.deleteMany();
    await prisma.clube.deleteMany();
    await prisma.especialidade.deleteMany();
    await prisma.usuario.deleteMany();

    // Criar usuário MASTER para testes
    const masterResponse = await request(app.getHttpServer())
      .post('/auth/registro')
      .send({
        nome: 'Master User',
        email: 'master@test.com',
        senha: 'master123',
      });

    masterId = masterResponse.body.usuario.id;

    // Promover para MASTER
    await prisma.usuario.update({
      where: { id: masterId },
      data: { papelGlobal: PapelGlobal.MASTER },
    });

    // Fazer login como MASTER
    const masterLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'master@test.com',
        senha: 'master123',
      });

    masterToken = masterLogin.body.access_token;

    // Criar usuário normal para testes
    const userResponse = await request(app.getHttpServer())
      .post('/auth/registro')
      .send({
        nome: 'Test User',
        email: 'test@test.com',
        senha: 'test123',
      });

    userId = userResponse.body.usuario.id;
    authToken = userResponse.body.access_token;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('GET /usuarios', () => {
    it('deve retornar 403 se não for MASTER', () => {
      return request(app.getHttpServer())
        .get('/usuarios')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });

    it('deve listar usuários se for MASTER', () => {
      return request(app.getHttpServer())
        .get('/usuarios')
        .set('Authorization', `Bearer ${masterToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('dados');
          expect(res.body).toHaveProperty('paginacao');
          expect(Array.isArray(res.body.dados)).toBe(true);
          expect(res.body.dados.length).toBeGreaterThan(0);
        });
    });

    it('deve paginar corretamente', () => {
      return request(app.getHttpServer())
        .get('/usuarios?pagina=1&limite=1')
        .set('Authorization', `Bearer ${masterToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.paginacao.itensPorPagina).toBe(1);
          expect(res.body.dados.length).toBeLessThanOrEqual(1);
        });
    });
  });

  describe('GET /usuarios/:id', () => {
    it('deve retornar usuário por ID', () => {
      return request(app.getHttpServer())
        .get(`/usuarios/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(userId);
          expect(res.body.email).toBe('test@test.com');
          expect(res.body).not.toHaveProperty('senhaHash');
        });
    });

    it('deve retornar 404 se usuário não existir', () => {
      return request(app.getHttpServer())
        .get('/usuarios/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('deve retornar 401 se não autenticado', () => {
      return request(app.getHttpServer()).get(`/usuarios/${userId}`).expect(401);
    });
  });

  describe('PATCH /usuarios/:id', () => {
    it('deve atualizar próprio usuário', () => {
      return request(app.getHttpServer())
        .patch(`/usuarios/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ nome: 'Updated Name' })
        .expect(200)
        .expect((res) => {
          expect(res.body.nome).toBe('Updated Name');
        });
    });

    it('deve retornar 403 ao tentar atualizar outro usuário', () => {
      return request(app.getHttpServer())
        .patch(`/usuarios/${masterId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ nome: 'Hacked' })
        .expect(403);
    });

    it('MASTER deve poder atualizar qualquer usuário', () => {
      return request(app.getHttpServer())
        .patch(`/usuarios/${userId}`)
        .set('Authorization', `Bearer ${masterToken}`)
        .send({ nome: 'Master Updated' })
        .expect(200)
        .expect((res) => {
          expect(res.body.nome).toBe('Master Updated');
        });
    });

    it('deve retornar 409 se email já estiver em uso', async () => {
      return request(app.getHttpServer())
        .patch(`/usuarios/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: 'master@test.com' })
        .expect(409);
    });
  });

  describe('PATCH /usuarios/:id/senha', () => {
    it('deve alterar senha com sucesso', () => {
      return request(app.getHttpServer())
        .patch(`/usuarios/${userId}/senha`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          senhaAtual: 'test123',
          novaSenha: 'newpass123',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toContain('sucesso');
        });
    });

    it('deve retornar 401 se senha atual incorreta', () => {
      return request(app.getHttpServer())
        .patch(`/usuarios/${userId}/senha`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          senhaAtual: 'senhaErrada',
          novaSenha: 'newpass123',
        })
        .expect(401);
    });

    it('deve retornar 403 ao tentar alterar senha de outro usuário', () => {
      return request(app.getHttpServer())
        .patch(`/usuarios/${masterId}/senha`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          senhaAtual: 'master123',
          novaSenha: 'hacked123',
        })
        .expect(403);
    });
  });

  describe('DELETE /usuarios/:id', () => {
    it('deve retornar 403 ao tentar deletar outro usuário (não MASTER)', () => {
      return request(app.getHttpServer())
        .delete(`/usuarios/${masterId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });

    it('MASTER deve poder deletar qualquer usuário', async () => {
      // Criar usuário temporário para deletar
      const tempUser = await request(app.getHttpServer())
        .post('/auth/registro')
        .send({
          nome: 'Temp User',
          email: 'temp@test.com',
          senha: 'temp123',
        });

      return request(app.getHttpServer())
        .delete(`/usuarios/${tempUser.body.usuario.id}`)
        .set('Authorization', `Bearer ${masterToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toContain('deletado');
        });
    });
  });

  describe('POST /usuarios/:id/foto', () => {
    it('deve retornar 400 se nenhum arquivo enviado', () => {
      return request(app.getHttpServer())
        .post(`/usuarios/${userId}/foto`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('deve retornar 403 ao tentar fazer upload para outro usuário', () => {
      return request(app.getHttpServer())
        .post(`/usuarios/${masterId}/foto`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('foto', Buffer.from('fake image'), 'test.jpg')
        .expect(403);
    });

    // Nota: Teste de upload real requer arquivo válido
    // Pode ser implementado com mock ou arquivo de teste real
  });

  describe('Fluxo completo', () => {
    it('deve executar fluxo completo de usuário', async () => {
      // 1. Registrar
      const registro = await request(app.getHttpServer())
        .post('/auth/registro')
        .send({
          nome: 'Flow User',
          email: 'flow@test.com',
          senha: 'flow123',
        })
        .expect(201);

      const flowToken = registro.body.access_token;
      const flowUserId = registro.body.usuario.id;

      // 2. Buscar perfil
      await request(app.getHttpServer())
        .get(`/usuarios/${flowUserId}`)
        .set('Authorization', `Bearer ${flowToken}`)
        .expect(200);

      // 3. Atualizar dados
      await request(app.getHttpServer())
        .patch(`/usuarios/${flowUserId}`)
        .set('Authorization', `Bearer ${flowToken}`)
        .send({ nome: 'Flow User Updated' })
        .expect(200);

      // 4. Alterar senha
      await request(app.getHttpServer())
        .patch(`/usuarios/${flowUserId}/senha`)
        .set('Authorization', `Bearer ${flowToken}`)
        .send({
          senhaAtual: 'flow123',
          novaSenha: 'newflow123',
        })
        .expect(200);

      // 5. Deletar conta
      await request(app.getHttpServer())
        .delete(`/usuarios/${flowUserId}`)
        .set('Authorization', `Bearer ${flowToken}`)
        .expect(200);

      // 6. Verificar que foi deletado (token inválido pois usuário foi deletado)
      await request(app.getHttpServer())
        .get(`/usuarios/${flowUserId}`)
        .set('Authorization', `Bearer ${flowToken}`)
        .expect(401); // Token inválido após delete
    });
  });
});
