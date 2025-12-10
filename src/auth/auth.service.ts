import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegistroDto } from './dto/registro.dto';
import * as bcrypt from 'bcrypt';
import { JwtPayload } from './strategies/jwt.strategy';

export interface AuthResponse {
  access_token: string;
  usuario: {
    id: number;
    nome: string;
    email: string;
    papelGlobal: string;
    fotoPerfilUrl?: string | null;
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly SALT_ROUNDS = 10;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { email, senha } = loginDto;

    const usuario = await this.prisma.usuario.findUnique({
      where: { email },
    });

    if (!usuario) {
      this.logger.warn(`Tentativa de login com email inexistente: ${email}`);
      throw new UnauthorizedException('Email ou senha inválidos');
    }

    if (!usuario.senhaHash) {
      this.logger.warn(`Tentativa de login com senha em conta Google: ${email}`);
      throw new UnauthorizedException('Esta conta usa login com Google');
    }

    const senhaValida = await this.comparePassword(senha, usuario.senhaHash);

    if (!senhaValida) {
      this.logger.warn(`Tentativa de login com senha incorreta: ${email}`);
      throw new UnauthorizedException('Email ou senha inválidos');
    }

    const token = this.generateToken(usuario.id, usuario.email, usuario.papelGlobal);

    this.logger.log(`Login bem-sucedido: ${email}`);

    return {
      access_token: token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        papelGlobal: usuario.papelGlobal,
        fotoPerfilUrl: usuario.fotoPerfilUrl,
      },
    };
  }

  async registro(registroDto: RegistroDto): Promise<AuthResponse> {
    const { nome, email, senha } = registroDto;

    const usuarioExistente = await this.prisma.usuario.findUnique({
      where: { email },
    });

    if (usuarioExistente) {
      this.logger.warn(`Tentativa de registro com email já existente: ${email}`);
      throw new ConflictException('Email já cadastrado');
    }

    const senhaHash = await this.hashPassword(senha);

    const usuario = await this.prisma.usuario.create({
      data: {
        nome,
        email,
        senhaHash,
        papelGlobal: 'USUARIO',
      },
    });

    const token = this.generateToken(usuario.id, usuario.email, usuario.papelGlobal);

    this.logger.log(`Novo usuário registrado: ${email}`);

    return {
      access_token: token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        papelGlobal: usuario.papelGlobal,
        fotoPerfilUrl: usuario.fotoPerfilUrl,
      },
    };
  }

  private async hashPassword(senha: string): Promise<string> {
    return bcrypt.hash(senha, this.SALT_ROUNDS);
  }

  private async comparePassword(senha: string, hash: string): Promise<boolean> {
    return bcrypt.compare(senha, hash);
  }

  private generateToken(userId: number, email: string, papelGlobal: string): string {
    const payload: JwtPayload = {
      sub: userId,
      email,
      papelGlobal,
    };

    return this.jwtService.sign(payload);
  }

  async loginComGoogle(googleUser: any): Promise<AuthResponse> {
    const { googleId, email, nome, fotoPerfilUrl, emailVerificado } = googleUser;

    let usuario = await this.prisma.usuario.findUnique({
      where: { googleId },
    });

    if (!usuario) {
      usuario = await this.prisma.usuario.findUnique({
        where: { email },
      });

      if (usuario) {
        usuario = await this.prisma.usuario.update({
          where: { id: usuario.id },
          data: {
            googleId,
            emailVerificado: emailVerificado || usuario.emailVerificado,
            fotoPerfilUrl: fotoPerfilUrl || usuario.fotoPerfilUrl,
          },
        });

        this.logger.log(`Conta existente vinculada ao Google: ${email}`);
      }
    }

    if (!usuario) {
      usuario = await this.prisma.usuario.create({
        data: {
          googleId,
          email,
          nome,
          fotoPerfilUrl,
          emailVerificado,
          senhaHash: null,
        },
      });

      this.logger.log(`Nova conta criada via Google: ${email}`);
    } else {
      this.logger.log(`Login via Google: ${email}`);
    }

    const token = this.generateToken(usuario.id, usuario.email, usuario.papelGlobal);

    return {
      access_token: token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        papelGlobal: usuario.papelGlobal,
        fotoPerfilUrl: usuario.fotoPerfilUrl,
      },
    };
  }

  async verifyToken(token: string): Promise<JwtPayload> {
    try {
      return this.jwtService.verify<JwtPayload>(token);
    } catch (error) {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }
}
