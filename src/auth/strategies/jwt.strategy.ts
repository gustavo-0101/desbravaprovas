import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Payload do JWT
 *
 * Estrutura dos dados armazenados no token JWT.
 */
export interface JwtPayload {
  sub: number; // ID do usuário
  email: string;
  papelGlobal: string;
  iat?: number; // issued at
  exp?: number; // expiration time
}

/**
 * Strategy de autenticação JWT
 *
 * Valida tokens JWT e extrai informações do usuário.
 * Usado pelo Passport automaticamente em rotas protegidas.
 *
 * @class JwtStrategy
 * @extends {PassportStrategy}
 *
 * @example
 * // Aplicar em rota
 * @UseGuards(JwtAuthGuard)
 * async minhaRota(@Req() req) {
 *   console.log(req.user); // { id, email, papelGlobal }
 * }
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'secret-key-dev',
    });
  }

  /**
   * Validação do payload do JWT
   *
   * Executado automaticamente após verificação da assinatura do token.
   * Verifica se o usuário ainda existe no banco.
   *
   * @param {JwtPayload} payload - Dados decodificados do token
   * @returns {Promise<any>} Objeto do usuário que será anexado em req.user
   * @throws {UnauthorizedException} Se usuário não existir
   */
  async validate(payload: JwtPayload) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        nome: true,
        papelGlobal: true,
        fotoPerfilUrl: true,
      },
    });

    if (!usuario) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    // Retorna objeto que será anexado em req.user
    return {
      id: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
      papelGlobal: usuario.papelGlobal,
      fotoPerfilUrl: usuario.fotoPerfilUrl,
    };
  }
}
