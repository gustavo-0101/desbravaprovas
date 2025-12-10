import { Test, TestingModule } from '@nestjs/testing';
import { UsuariosService } from './usuarios.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotFoundException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock('sharp', () => {
  return jest.fn(() => ({
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    toFile: jest.fn().mockResolvedValue({}),
  }));
});

describe('UsuariosService', () => {
  let service: UsuariosService;
  let prisma: PrismaService;

  const mockPrismaService = {
    usuario: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuariosService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsuariosService>(UsuariosService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('listarTodos', () => {
    it('deve listar usuários com paginação', async () => {
      const mockUsuarios = [
        {
          id: 1,
          nome: 'João',
          email: 'joao@test.com',
          papelGlobal: 'USUARIO',
          fotoPerfilUrl: null,
          emailVerificado: false,
          criadoEm: new Date(),
          atualizadoEm: new Date(),
        },
      ];

      mockPrismaService.usuario.findMany.mockResolvedValue(mockUsuarios);
      mockPrismaService.usuario.count.mockResolvedValue(1);

      const result = await service.listarTodos(1, 10);

      expect(result.dados).toEqual(mockUsuarios);
      expect(result.paginacao).toEqual({
        paginaAtual: 1,
        itensPorPagina: 10,
        totalItens: 1,
        totalPaginas: 1,
      });
      expect(prisma.usuario.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        orderBy: { criadoEm: 'desc' },
        select: expect.any(Object),
      });
    });
  });

  describe('buscarPorId', () => {
    it('deve retornar usuário se encontrado', async () => {
      const mockUsuario = {
        id: 1,
        nome: 'João',
        email: 'joao@test.com',
        papelGlobal: 'USUARIO',
        fotoPerfilUrl: null,
        emailVerificado: false,
        googleId: null,
        criadoEm: new Date(),
        atualizadoEm: new Date(),
      };

      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuario);

      const result = await service.buscarPorId(1);

      expect(result).toEqual(mockUsuario);
      expect(prisma.usuario.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: expect.any(Object),
      });
    });

    it('deve lançar NotFoundException se usuário não existir', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(null);

      await expect(service.buscarPorId(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('buscarPorEmail', () => {
    it('deve retornar usuário por email', async () => {
      const mockUsuario = {
        id: 1,
        email: 'joao@test.com',
        senhaHash: 'hash',
      };

      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuario);

      const result = await service.buscarPorEmail('joao@test.com');

      expect(result).toEqual(mockUsuario);
    });
  });

  describe('atualizar', () => {
    const mockUsuario = {
      id: 1,
      nome: 'João',
      email: 'joao@test.com',
      papelGlobal: 'USUARIO',
      fotoPerfilUrl: null,
      emailVerificado: true,
      googleId: null,
      criadoEm: new Date(),
      atualizadoEm: new Date(),
    };

    it('deve atualizar usuário sem mudar email', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuario);
      mockPrismaService.usuario.update.mockResolvedValue({
        ...mockUsuario,
        nome: 'João Silva',
      });

      const result = await service.atualizar(1, { nome: 'João Silva' });

      expect(result.nome).toBe('João Silva');
      expect(prisma.usuario.update).toHaveBeenCalled();
    });

    it('deve atualizar email e marcar como não verificado', async () => {
      mockPrismaService.usuario.findUnique
        .mockResolvedValueOnce(mockUsuario)
        .mockResolvedValueOnce(null);

      mockPrismaService.usuario.update.mockResolvedValue({
        ...mockUsuario,
        email: 'novo@test.com',
        emailVerificado: false,
      });

      const result = await service.atualizar(1, { email: 'novo@test.com' });

      expect(result.emailVerificado).toBe(false);
    });

    it('deve lançar ConflictException se email já estiver em uso', async () => {
      mockPrismaService.usuario.findUnique
        .mockResolvedValueOnce(mockUsuario)
        .mockResolvedValueOnce({ id: 2, email: 'outro@test.com' });

      await expect(
        service.atualizar(1, { email: 'outro@test.com' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('alterarSenha', () => {
    const mockUsuarioComSenha = {
      id: 1,
      senhaHash: 'hash-antigo',
    };

    it('deve alterar senha com sucesso', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(
        mockUsuarioComSenha,
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('novo-hash');
      mockPrismaService.usuario.update.mockResolvedValue({});

      const result = await service.alterarSenha(1, {
        senhaAtual: 'senha123',
        novaSenha: 'novaSenha123',
      });

      expect(result.message).toBe('Senha alterada com sucesso');
      expect(bcrypt.compare).toHaveBeenCalledWith('senha123', 'hash-antigo');
      expect(bcrypt.hash).toHaveBeenCalledWith('novaSenha123', 10);
    });

    it('deve lançar UnauthorizedException se senha atual incorreta', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(
        mockUsuarioComSenha,
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.alterarSenha(1, {
          senhaAtual: 'senhaErrada',
          novaSenha: 'novaSenha123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve lançar UnauthorizedException se usuário usar login Google', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue({
        id: 1,
        senhaHash: null,
      });

      await expect(
        service.alterarSenha(1, {
          senhaAtual: 'senha',
          novaSenha: 'nova',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('deletar', () => {
    it('deve deletar usuário com sucesso', async () => {
      const mockUsuario = {
        id: 1,
        nome: 'João',
        email: 'joao@test.com',
      };

      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuario);
      mockPrismaService.usuario.delete.mockResolvedValue(mockUsuario);

      const result = await service.deletar(1);

      expect(result.message).toBe('Usuário deletado com sucesso');
      expect(prisma.usuario.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('deve lançar NotFoundException se usuário não existir', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(null);

      await expect(service.deletar(999)).rejects.toThrow(NotFoundException);
    });
  });
});
