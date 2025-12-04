import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO para login de usuário
 *
 * Valida credenciais de acesso ao sistema.
 *
 * @class LoginDto
 *
 * @example
 * {
 *   "email": "usuario@exemplo.com",
 *   "senha": "senha123"
 * }
 */
export class LoginDto {
  @ApiProperty({
    description: 'Email do usuário cadastrado',
    example: 'joao.silva@exemplo.com',
    type: String,
  })
  @IsEmail({}, { message: 'Email inválido' })
  @IsNotEmpty({ message: 'Email é obrigatório' })
  email: string;

  @ApiProperty({
    description: 'Senha do usuário',
    example: 'senha123',
    type: String,
    minLength: 6,
  })
  @IsString({ message: 'Senha deve ser uma string' })
  @IsNotEmpty({ message: 'Senha é obrigatória' })
  senha: string;
}
