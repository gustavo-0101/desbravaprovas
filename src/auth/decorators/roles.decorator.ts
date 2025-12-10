import { SetMetadata } from '@nestjs/common';
import { PapelGlobal } from '@prisma/client';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: PapelGlobal[]) => SetMetadata(ROLES_KEY, roles);
