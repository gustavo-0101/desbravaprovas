import { SetMetadata } from '@nestjs/common';
import { PapelGlobal } from '@prisma/client';

/**
 * Chave de metadata para papéis requeridos
 */
export const ROLES_KEY = 'roles';

/**
 * Decorator @Roles()
 *
 * Define quais papéis globais têm permissão para acessar a rota.
 * Usado em conjunto com RolesGuard.
 *
 * @param {...PapelGlobal[]} roles - Papéis globais permitidos
 * @returns {MethodDecorator & ClassDecorator}
 *
 * @example
 * // Somente MASTER pode acessar
 * @Roles('MASTER')
 * @Delete('/usuarios/:id')
 * deletarUsuario() { ... }
 *
 * @example
 * // MASTER ou USUARIO (qualquer autenticado)
 * @Roles('MASTER', 'USUARIO')
 * @Get('/perfil')
 * verPerfil() { ... }
 */
export const Roles = (...roles: PapelGlobal[]) => SetMetadata(ROLES_KEY, roles);
