import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PapelGlobal } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<PapelGlobal[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException(
        'Usuário não autenticado. Use JwtAuthGuard antes de RolesGuard.',
      );
    }

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
