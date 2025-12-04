import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService, AuthResponse } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegistroDto } from './dto/registro.dto';
import { Public } from './decorators/public.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { CurrentUserType } from './decorators/current-user.decorator';

/**
 * Controller de Autenticação
 *
 * Gerencia endpoints de login, registro e perfil do usuário.
 *
 * @class AuthController
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Login de usuário
   *
   * Endpoint público para autenticação.
   * Retorna token JWT válido por 24h.
   *
   * @param {LoginDto} loginDto - Credenciais de login
   * @returns {Promise<AuthResponse>} Token e dados do usuário
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Fazer login',
    description:
      'Autentica usuário com email e senha. Retorna token JWT válido por 24 horas.',
  })
  @ApiResponse({
    status: 200,
    description: 'Login bem-sucedido',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        usuario: {
          id: 1,
          nome: 'João Silva',
          email: 'joao@exemplo.com',
          papelGlobal: 'USUARIO',
          fotoPerfilUrl: null,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Email ou senha inválidos',
  })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(loginDto);
  }

  /**
   * Registro de novo usuário
   *
   * Endpoint público para criar conta.
   * Usuário criado com papel USUARIO por padrão.
   *
   * @param {RegistroDto} registroDto - Dados de registro
   * @returns {Promise<AuthResponse>} Token e dados do usuário
   */
  @Public()
  @Post('registro')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Registrar novo usuário',
    description:
      'Cria novo usuário no sistema. Papel global inicial: USUARIO. Retorna token JWT.',
  })
  @ApiResponse({
    status: 201,
    description: 'Usuário criado com sucesso',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        usuario: {
          id: 2,
          nome: 'Maria Santos',
          email: 'maria@exemplo.com',
          papelGlobal: 'USUARIO',
          fotoPerfilUrl: null,
        },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Email já cadastrado',
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos',
  })
  async registro(@Body() registroDto: RegistroDto): Promise<AuthResponse> {
    return this.authService.registro(registroDto);
  }

  /**
   * Ver perfil do usuário autenticado
   *
   * Endpoint protegido para obter dados do usuário logado.
   * Requer token JWT no header Authorization.
   *
   * @param {CurrentUserType} user - Usuário extraído do token
   * @returns {CurrentUserType} Dados do usuário
   */
  @Get('perfil')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Ver perfil do usuário autenticado',
    description:
      'Retorna dados do usuário logado. Requer autenticação via token JWT.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dados do usuário',
    schema: {
      example: {
        id: 1,
        nome: 'João Silva',
        email: 'joao@exemplo.com',
        papelGlobal: 'USUARIO',
        fotoPerfilUrl: null,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Token inválido ou expirado',
  })
  async verPerfil(@CurrentUser() user: CurrentUserType): Promise<CurrentUserType> {
    return user;
  }
}
