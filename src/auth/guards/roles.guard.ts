import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PapelGlobal } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Guard de autorização por papéis
 *
 * Verifica se o usuário tem um dos papéis globais necessários para acessar a rota.
 * Deve ser usado em conjunto com JwtAuthGuard.
 *
 * @class RolesGuard
 * @implements {CanActivate}
 *
 * @example
 * // Aplicar em rota
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles('MASTER', 'ADMIN_CLUBE')
 * async criarProva() { ... }
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  /**
   * Determina se o usuário tem permissão para acessar a rota
   *
   * Verifica se o papel global do usuário está na lista de papéis permitidos.
   *
   * @param {ExecutionContext} context - Contexto da execução
   * @returns {boolean}
   * @throws {ForbiddenException} Se usuário não tiver permissão
   */
  canActivate(context: ExecutionContext): boolean {
    // Buscar papéis requeridos pelo decorator @Roles()
    const requiredRoles = this.reflector.getAllAndOverride<PapelGlobal[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Se não houver papéis definidos, permitir acesso
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Extrair usuário do request (colocado lá pelo JwtAuthGuard)
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException(
        'Usuário não autenticado. Use JwtAuthGuard antes de RolesGuard.',
      );
    }

    // Verificar se o papel do usuário está na lista de papéis permitidos
    const hasRole = requiredRoles.some(
      (role) => user.papelGlobal === role,
    );

    if (!hasRole) {
      throw new ForbiddenException(
        `Você não tem permissão para acessar este recurso. Papéis necessários: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
