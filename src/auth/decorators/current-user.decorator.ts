import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Tipo do usuário autenticado
 *
 * Estrutura do objeto user anexado ao request após autenticação.
 */
export interface CurrentUserType {
  id: number;
  email: string;
  nome: string;
  papelGlobal: string;
  fotoPerfilUrl?: string | null;
}

/**
 * Decorator @CurrentUser()
 *
 * Extrai o usuário autenticado do request.
 * Deve ser usado em rotas protegidas por JwtAuthGuard.
 *
 * @returns {ParameterDecorator}
 *
 * @example
 * // Obter usuário completo
 * @Get('/perfil')
 * @UseGuards(JwtAuthGuard)
 * verPerfil(@CurrentUser() user: CurrentUserType) {
 *   return user;
 * }
 *
 * @example
 * // Obter apenas ID do usuário
 * @Post('/provas')
 * @UseGuards(JwtAuthGuard)
 * criarProva(
 *   @CurrentUser('id') usuarioId: number,
 *   @Body() dto: CriarProvaDto,
 * ) {
 *   return this.provasService.criar(usuarioId, dto);
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof CurrentUserType | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // Se especificou um campo, retornar apenas esse campo
    if (data) {
      return user?.[data];
    }

    // Caso contrário, retornar o objeto completo
    return user;
  },
);
