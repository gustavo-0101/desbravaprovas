import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegistroDto } from './dto/registro.dto';

// Mock do bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const mockPrismaService = {
    usuario: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
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
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);

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
      // Arrange
      mockPrismaService.usuario.findUnique.mockResolvedValue(usuarioMock);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('fake-jwt-token');

      // Act
      const result = await service.login(loginDto);

      // Assert
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
      // Arrange
      mockPrismaService.usuario.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        'Email ou senha inválidos',
      );
    });

    it('deve lançar UnauthorizedException se senha incorreta', async () => {
      // Arrange
      mockPrismaService.usuario.findUnique.mockResolvedValue(usuarioMock);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act & Assert
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
      // Arrange
      mockPrismaService.usuario.findUnique.mockResolvedValue(null); // Email não existe
      mockPrismaService.usuario.create.mockResolvedValue(usuarioCriado);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$hashedpassword');
      mockJwtService.sign.mockReturnValue('fake-jwt-token');

      // Act
      const result = await service.registro(registroDto);

      // Assert
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
      expect(prisma.usuario.create).toHaveBeenCalledWith({
        data: {
          nome: registroDto.nome,
          email: registroDto.email,
          senhaHash: '$2b$10$hashedpassword',
          papelGlobal: 'USUARIO',
        },
      });
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: usuarioCriado.id,
        email: usuarioCriado.email,
        papelGlobal: usuarioCriado.papelGlobal,
      });
    });

    it('deve lançar ConflictException se email já existir', async () => {
      // Arrange
      const usuarioExistente = {
        id: 1,
        email: 'newuser@example.com',
      };
      mockPrismaService.usuario.findUnique.mockResolvedValue(usuarioExistente);

      // Act & Assert
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
      // Arrange
      const token = 'valid-jwt-token';
      const payload = {
        sub: 1,
        email: 'test@example.com',
        papelGlobal: 'USUARIO',
      };
      mockJwtService.verify.mockReturnValue(payload);

      // Act
      const result = await service.verifyToken(token);

      // Assert
      expect(result).toEqual(payload);
      expect(jwtService.verify).toHaveBeenCalledWith(token);
    });

    it('deve lançar UnauthorizedException para token inválido', async () => {
      // Arrange
      const token = 'invalid-jwt-token';
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act & Assert
      await expect(service.verifyToken(token)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.verifyToken(token)).rejects.toThrow(
        'Token inválido ou expirado',
      );
    });
  });
});
