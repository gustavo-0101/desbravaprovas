import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegistroDto } from './dto/registro.dto';
import * as bcrypt from 'bcrypt';
import { JwtPayload } from './strategies/jwt.strategy';
import { EmailService } from '../email/email.service';
import { randomBytes } from 'crypto';

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
    private emailService: EmailService,
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
    const tokenVerificacao = this.gerarTokenVerificacao();

    const usuario = await this.prisma.usuario.create({
      data: {
        nome,
        email,
        senhaHash,
        papelGlobal: 'USUARIO',
        tokenVerificacao,
        emailVerificado: false,
      },
    });

    await this.emailService.enviarEmailVerificacao(
      usuario.email,
      usuario.nome,
      tokenVerificacao,
    );

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

  async verificarEmail(token: string): Promise<{ message: string }> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { tokenVerificacao: token },
    });

    if (!usuario) {
      throw new BadRequestException('Token de verificação inválido');
    }

    if (usuario.emailVerificado) {
      throw new BadRequestException('Email já verificado');
    }

    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        emailVerificado: true,
        tokenVerificacao: null,
      },
    });

    await this.emailService.enviarEmailBoasVindas(usuario.email, usuario.nome);

    this.logger.log(`Email verificado: ${usuario.email}`);

    return { message: 'Email verificado com sucesso!' };
  }

  async reenviarVerificacao(email: string): Promise<{ message: string }> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email },
    });

    if (!usuario) {
      throw new BadRequestException('Usuário não encontrado');
    }

    if (usuario.emailVerificado) {
      throw new BadRequestException('Email já verificado');
    }

    if (!usuario.senhaHash) {
      throw new BadRequestException(
        'Usuários que fazem login com Google não precisam verificar email',
      );
    }

    const tokenVerificacao = this.gerarTokenVerificacao();

    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: { tokenVerificacao },
    });

    await this.emailService.enviarEmailVerificacao(
      usuario.email,
      usuario.nome,
      tokenVerificacao,
    );

    this.logger.log(`Email de verificação reenviado para: ${email}`);

    return { message: 'Email de verificação reenviado com sucesso!' };
  }

  private gerarTokenVerificacao(): string {
    return randomBytes(32).toString('hex');
  }

  async solicitarRecuperacaoSenha(email: string): Promise<{ message: string }> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email },
    });

    if (!usuario) {
      return { message: 'Se o email existir, um link de recuperação será enviado.' };
    }

    if (!usuario.senhaHash) {
      throw new BadRequestException(
        'Usuários que fazem login com Google não podem recuperar senha',
      );
    }

    const tokenRecuperacaoSenha = randomBytes(32).toString('hex');
    const tokenRecuperacaoExpira = new Date();
    tokenRecuperacaoExpira.setHours(tokenRecuperacaoExpira.getHours() + 1);

    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        tokenRecuperacaoSenha,
        tokenRecuperacaoExpira,
      },
    });

    await this.emailService.enviarEmailRecuperacaoSenha(
      usuario.email,
      usuario.nome,
      tokenRecuperacaoSenha,
    );

    this.logger.log(`Email de recuperação de senha enviado para: ${email}`);

    return { message: 'Se o email existir, um link de recuperação será enviado.' };
  }

  async redefinirSenha(
    token: string,
    novaSenha: string,
  ): Promise<{ message: string }> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { tokenRecuperacaoSenha: token },
    });

    if (!usuario) {
      throw new BadRequestException('Token de recuperação inválido');
    }

    if (
      !usuario.tokenRecuperacaoExpira ||
      usuario.tokenRecuperacaoExpira < new Date()
    ) {
      throw new BadRequestException('Token de recuperação expirado');
    }

    const senhaHash = await this.hashPassword(novaSenha);

    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        senhaHash,
        tokenRecuperacaoSenha: null,
        tokenRecuperacaoExpira: null,
      },
    });

    this.logger.log(`Senha redefinida com sucesso para: ${usuario.email}`);

    return { message: 'Senha redefinida com sucesso!' };
  }
}
