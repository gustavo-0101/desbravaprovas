import { SetMetadata } from '@nestjs/common';

/**
 * Chave de metadata para identificar rotas públicas
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator @Public()
 *
 * Marca uma rota como pública (não requer autenticação).
 * Usado em conjunto com JwtAuthGuard global.
 *
 * @returns {MethodDecorator & ClassDecorator}
 *
 * @example
 * // Aplicar em método
 * @Public()
 * @Get('/public-info')
 * getPublicInfo() { ... }
 *
 * @example
 * // Aplicar em controller inteiro
 * @Public()
 * @Controller('public')
 * export class PublicController { ... }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
