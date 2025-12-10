import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import {
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegistroDto } from './dto/registro.dto';
import { EmailService } from '../email/email.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let emailService: EmailService;

  const mockPrismaService = {
    usuario: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockEmailService = {
    enviarEmailVerificacao: jest.fn(),
    enviarEmailBoasVindas: jest.fn(),
    enviarEmailRecuperacaoSenha: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    emailService = module.get<EmailService>(EmailService);

    jest.clearAllMocks();
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      senha: 'senha123',
    };

    const usuarioMock = {
      id: 1,
      nome: 'Test User',
      email: 'test@example.com',
      senhaHash: '$2b$10$hashedpassword',
      papelGlobal: 'USUARIO',
      fotoPerfilUrl: null,
      criadoEm: new Date(),
      atualizadoEm: new Date(),
    };

    it('deve fazer login com sucesso', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(usuarioMock);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('fake-jwt-token');

      const result = await service.login(loginDto);

      expect(result).toEqual({
        access_token: 'fake-jwt-token',
        usuario: {
          id: usuarioMock.id,
          nome: usuarioMock.nome,
          email: usuarioMock.email,
          papelGlobal: usuarioMock.papelGlobal,
          fotoPerfilUrl: usuarioMock.fotoPerfilUrl,
        },
      });
      expect(prisma.usuario.findUnique).toHaveBeenCalledWith({
        where: { email: loginDto.email },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginDto.senha,
        usuarioMock.senhaHash,
      );
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: usuarioMock.id,
        email: usuarioMock.email,
        papelGlobal: usuarioMock.papelGlobal,
      });
    });

    it('deve lançar UnauthorizedException se email não existir', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        'Email ou senha inválidos',
      );
    });

    it('deve lançar UnauthorizedException se senha incorreta', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(usuarioMock);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        'Email ou senha inválidos',
      );
    });
  });

  describe('registro', () => {
    const registroDto: RegistroDto = {
      nome: 'New User',
      email: 'newuser@example.com',
      senha: 'senha123',
    };

    const usuarioCriado = {
      id: 2,
      nome: 'New User',
      email: 'newuser@example.com',
      senhaHash: '$2b$10$hashedpassword',
      papelGlobal: 'USUARIO',
      fotoPerfilUrl: null,
      criadoEm: new Date(),
      atualizadoEm: new Date(),
    };

    it('deve registrar novo usuário com sucesso', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(null);
      mockPrismaService.usuario.create.mockResolvedValue(usuarioCriado);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$hashedpassword');
      mockJwtService.sign.mockReturnValue('fake-jwt-token');
      mockEmailService.enviarEmailVerificacao.mockResolvedValue(undefined);

      const result = await service.registro(registroDto);

      expect(result).toEqual({
        access_token: 'fake-jwt-token',
        usuario: {
          id: usuarioCriado.id,
          nome: usuarioCriado.nome,
          email: usuarioCriado.email,
          papelGlobal: usuarioCriado.papelGlobal,
          fotoPerfilUrl: usuarioCriado.fotoPerfilUrl,
        },
      });
      expect(prisma.usuario.findUnique).toHaveBeenCalledWith({
        where: { email: registroDto.email },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(registroDto.senha, 10);
      expect(prisma.usuario.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            nome: registroDto.nome,
            email: registroDto.email,
            senhaHash: '$2b$10$hashedpassword',
            papelGlobal: 'USUARIO',
            emailVerificado: false,
          }),
        }),
      );
      expect(emailService.enviarEmailVerificacao).toHaveBeenCalledWith(
        usuarioCriado.email,
        usuarioCriado.nome,
        expect.any(String),
      );
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: usuarioCriado.id,
        email: usuarioCriado.email,
        papelGlobal: usuarioCriado.papelGlobal,
      });
    });

    it('deve lançar ConflictException se email já existir', async () => {
      const usuarioExistente = {
        id: 1,
        email: 'newuser@example.com',
      };
      mockPrismaService.usuario.findUnique.mockResolvedValue(usuarioExistente);

      await expect(service.registro(registroDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.registro(registroDto)).rejects.toThrow(
        'Email já cadastrado',
      );
      expect(prisma.usuario.create).not.toHaveBeenCalled();
    });
  });

  describe('verifyToken', () => {
    it('deve verificar token válido', async () => {
      const token = 'valid-jwt-token';
      const payload = {
        sub: 1,
        email: 'test@example.com',
        papelGlobal: 'USUARIO',
      };
      mockJwtService.verify.mockReturnValue(payload);

      const result = await service.verifyToken(token);

      expect(result).toEqual(payload);
      expect(jwtService.verify).toHaveBeenCalledWith(token);
    });

    it('deve lançar UnauthorizedException para token inválido', async () => {
      const token = 'invalid-jwt-token';
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.verifyToken(token)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.verifyToken(token)).rejects.toThrow(
        'Token inválido ou expirado',
      );
    });
  });

  describe('verificarEmail', () => {
    const tokenVerificacao = 'abc123def456';
    const usuarioMock = {
      id: 1,
      nome: 'Test User',
      email: 'test@example.com',
      emailVerificado: false,
      tokenVerificacao,
      senhaHash: '$2b$10$hash',
      papelGlobal: 'USUARIO',
    };

    it('deve verificar email com sucesso', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(usuarioMock);
      mockPrismaService.usuario.update.mockResolvedValue({
        ...usuarioMock,
        emailVerificado: true,
        tokenVerificacao: null,
      });
      mockEmailService.enviarEmailBoasVindas.mockResolvedValue(undefined);

      const result = await service.verificarEmail(tokenVerificacao);

      expect(result).toEqual({ message: 'Email verificado com sucesso!' });
      expect(prisma.usuario.findUnique).toHaveBeenCalledWith({
        where: { tokenVerificacao },
      });
      expect(prisma.usuario.update).toHaveBeenCalledWith({
        where: { id: usuarioMock.id },
        data: {
          emailVerificado: true,
          tokenVerificacao: null,
        },
      });
      expect(emailService.enviarEmailBoasVindas).toHaveBeenCalledWith(
        usuarioMock.email,
        usuarioMock.nome,
      );
    });

    it('deve lançar BadRequestException se token inválido', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(null);

      await expect(
        service.verificarEmail('invalid-token'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.verificarEmail('invalid-token'),
      ).rejects.toThrow('Token de verificação inválido');
    });

    it('deve lançar BadRequestException se email já verificado', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue({
        ...usuarioMock,
        emailVerificado: true,
      });

      await expect(
        service.verificarEmail(tokenVerificacao),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.verificarEmail(tokenVerificacao),
      ).rejects.toThrow('Email já verificado');
    });
  });

  describe('reenviarVerificacao', () => {
    const email = 'test@example.com';
    const usuarioMock = {
      id: 1,
      nome: 'Test User',
      email,
      emailVerificado: false,
      senhaHash: '$2b$10$hash',
      papelGlobal: 'USUARIO',
    };

    it('deve reenviar email de verificação com sucesso', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(usuarioMock);
      mockPrismaService.usuario.update.mockResolvedValue({
        ...usuarioMock,
        tokenVerificacao: expect.any(String),
      });
      mockEmailService.enviarEmailVerificacao.mockResolvedValue(undefined);

      const result = await service.reenviarVerificacao(email);

      expect(result).toEqual({
        message: 'Email de verificação reenviado com sucesso!',
      });
      expect(prisma.usuario.findUnique).toHaveBeenCalledWith({
        where: { email },
      });
      expect(prisma.usuario.update).toHaveBeenCalledWith({
        where: { id: usuarioMock.id },
        data: { tokenVerificacao: expect.any(String) },
      });
      expect(emailService.enviarEmailVerificacao).toHaveBeenCalledWith(
        usuarioMock.email,
        usuarioMock.nome,
        expect.any(String),
      );
    });

    it('deve lançar BadRequestException se usuário não existir', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(null);

      await expect(service.reenviarVerificacao(email)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.reenviarVerificacao(email)).rejects.toThrow(
        'Usuário não encontrado',
      );
    });

    it('deve lançar BadRequestException se email já verificado', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue({
        ...usuarioMock,
        emailVerificado: true,
      });

      await expect(service.reenviarVerificacao(email)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.reenviarVerificacao(email)).rejects.toThrow(
        'Email já verificado',
      );
    });

    it('deve lançar BadRequestException se usuário for do Google', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue({
        ...usuarioMock,
        senhaHash: null,
        googleId: 'google-id-123',
      });

      await expect(service.reenviarVerificacao(email)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.reenviarVerificacao(email)).rejects.toThrow(
        'Usuários que fazem login com Google não precisam verificar email',
      );
    });
  });

  describe('solicitarRecuperacaoSenha', () => {
    const email = 'test@example.com';
    const usuarioMock = {
      id: 1,
      nome: 'Test User',
      email,
      senhaHash: '$2b$10$hash',
      papelGlobal: 'USUARIO',
    };

    it('deve enviar email de recuperação com sucesso', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(usuarioMock);
      mockPrismaService.usuario.update.mockResolvedValue({
        ...usuarioMock,
        tokenRecuperacaoSenha: expect.any(String),
        tokenRecuperacaoExpira: expect.any(Date),
      });
      mockEmailService.enviarEmailRecuperacaoSenha.mockResolvedValue(undefined);

      const result = await service.solicitarRecuperacaoSenha(email);

      expect(result).toEqual({
        message: 'Se o email existir, um link de recuperação será enviado.',
      });
      expect(prisma.usuario.findUnique).toHaveBeenCalledWith({
        where: { email },
      });
      expect(prisma.usuario.update).toHaveBeenCalledWith({
        where: { id: usuarioMock.id },
        data: {
          tokenRecuperacaoSenha: expect.any(String),
          tokenRecuperacaoExpira: expect.any(Date),
        },
      });
      expect(emailService.enviarEmailRecuperacaoSenha).toHaveBeenCalledWith(
        usuarioMock.email,
        usuarioMock.nome,
        expect.any(String),
      );
    });

    it('deve retornar mensagem genérica se usuário não existir', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(null);

      const result = await service.solicitarRecuperacaoSenha(email);

      expect(result).toEqual({
        message: 'Se o email existir, um link de recuperação será enviado.',
      });
      expect(prisma.usuario.update).not.toHaveBeenCalled();
      expect(emailService.enviarEmailRecuperacaoSenha).not.toHaveBeenCalled();
    });

    it('deve lançar BadRequestException se usuário for do Google', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue({
        ...usuarioMock,
        senhaHash: null,
        googleId: 'google-id-123',
      });

      await expect(service.solicitarRecuperacaoSenha(email)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.solicitarRecuperacaoSenha(email)).rejects.toThrow(
        'Usuários que fazem login com Google não podem recuperar senha',
      );
    });
  });

  describe('redefinirSenha', () => {
    const token = 'valid-token-123';
    const novaSenha = 'novaSenha123';
    const usuarioMock = {
      id: 1,
      nome: 'Test User',
      email: 'test@example.com',
      senhaHash: '$2b$10$oldhash',
      tokenRecuperacaoSenha: token,
      tokenRecuperacaoExpira: new Date(Date.now() + 3600000),
      papelGlobal: 'USUARIO',
    };

    it('deve redefinir senha com sucesso', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(usuarioMock);
      mockPrismaService.usuario.update.mockResolvedValue({
        ...usuarioMock,
        senhaHash: '$2b$10$newhash',
        tokenRecuperacaoSenha: null,
        tokenRecuperacaoExpira: null,
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$newhash');

      const result = await service.redefinirSenha(token, novaSenha);

      expect(result).toEqual({ message: 'Senha redefinida com sucesso!' });
      expect(prisma.usuario.findUnique).toHaveBeenCalledWith({
        where: { tokenRecuperacaoSenha: token },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(novaSenha, 10);
      expect(prisma.usuario.update).toHaveBeenCalledWith({
        where: { id: usuarioMock.id },
        data: {
          senhaHash: '$2b$10$newhash',
          tokenRecuperacaoSenha: null,
          tokenRecuperacaoExpira: null,
        },
      });
    });

    it('deve lançar BadRequestException se token inválido', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(null);

      await expect(service.redefinirSenha('invalid-token', novaSenha)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.redefinirSenha('invalid-token', novaSenha)).rejects.toThrow(
        'Token de recuperação inválido',
      );
    });

    it('deve lançar BadRequestException se token expirado', async () => {
      const usuarioExpirado = {
        ...usuarioMock,
        tokenRecuperacaoExpira: new Date(Date.now() - 3600000),
      };
      mockPrismaService.usuario.findUnique.mockResolvedValue(usuarioExpirado);

      await expect(service.redefinirSenha(token, novaSenha)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.redefinirSenha(token, novaSenha)).rejects.toThrow(
        'Token de recuperação expirado',
      );
    });
  });
});
