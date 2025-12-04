import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Guard de autenticação JWT
 *
 * Protege rotas que requerem autenticação.
 * Verifica se o token JWT é válido antes de permitir acesso.
 *
 * Respeita o decorator @Public() para rotas que não precisam de autenticação.
 *
 * @class JwtAuthGuard
 * @extends {AuthGuard}
 *
 * @example
 * // Aplicar em controller
 * @UseGuards(JwtAuthGuard)
 * export class MeuController { ... }
 *
 * @example
 * // Aplicar globalmente no main.ts
 * app.useGlobalGuards(new JwtAuthGuard());
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  /**
   * Determina se a requisição pode prosseguir
   *
   * Verifica se a rota é pública (@Public()) antes de validar o JWT.
   *
   * @param {ExecutionContext} context - Contexto da execução
   * @returns {boolean | Promise<boolean> | Observable<boolean>}
   */
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // Verificar se a rota é pública
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Se não for pública, validar JWT
    return super.canActivate(context);
  }

  /**
   * Manipula erros de autenticação
   *
   * @param {any} err - Erro capturado
   * @throws {UnauthorizedException}
   */
  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw err || new UnauthorizedException('Token inválido ou expirado');
    }
    return user;
  }
}
