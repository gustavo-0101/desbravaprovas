import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { AuthService, AuthResponse } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegistroDto } from './dto/registro.dto';
import { Public } from './decorators/public.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { CurrentUserType } from './decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
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

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
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

  @Public()
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({
    summary: 'Login com Google OAuth2',
    description: 'Redireciona para autenticação do Google',
  })
  @ApiResponse({
    status: 302,
    description: 'Redireciona para tela de login do Google',
  })
  async googleLogin() {
  }

  @Public()
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({
    summary: 'Callback do Google OAuth2',
    description:
      'Processa autenticação do Google e retorna token JWT. Cria usuário automaticamente se não existir.',
  })
  @ApiResponse({
    status: 200,
    description: 'Login com Google bem-sucedido',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        usuario: {
          id: 3,
          nome: 'Pedro Costa',
          email: 'pedro@gmail.com',
          papelGlobal: 'USUARIO',
          fotoPerfilUrl: 'https://lh3.googleusercontent.com/...',
        },
      },
    },
  })
  async googleCallback(@Req() req: Request): Promise<AuthResponse> {
    return this.authService.loginComGoogle(req.user);
  }
}
