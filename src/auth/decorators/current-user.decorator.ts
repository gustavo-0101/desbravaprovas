import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserType {
  id: number;
  email: string;
  nome: string;
  papelGlobal: string;
  fotoPerfilUrl?: string | null;
}

export const CurrentUser = createParamDecorator(
  (data: keyof CurrentUserType | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (data) {
      return user?.[data];
    }

    return user;
  },
);
