import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  UseGuards,
  ForbiddenException,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsuariosService } from './usuarios.service';
import {
  UpdateUsuarioDto,
  AlterarSenhaDto,
  ListarUsuariosQueryDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserType } from '../auth/decorators/current-user.decorator';
import { PapelGlobal } from '@prisma/client';

@ApiTags('usuarios')
@Controller('usuarios')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(PapelGlobal.MASTER)
  @ApiOperation({ summary: 'Listar todos os usuários (apenas MASTER)' })
  @ApiQuery({
    name: 'pagina',
    required: false,
    type: Number,
    description: 'Página atual (padrão: 1)',
  })
  @ApiQuery({
    name: 'limite',
    required: false,
    type: Number,
    description: 'Itens por página (padrão: 10, máx: 100)',
  })
  @ApiResponse({ status: 200, description: 'Lista de usuários com paginação' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 403, description: 'Sem permissão (apenas MASTER)' })
  async listarTodos(@Query() query: ListarUsuariosQueryDto) {
    return this.usuariosService.listarTodos(query.pagina, query.limite);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar usuário por ID' })
  @ApiResponse({ status: 200, description: 'Usuário encontrado' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async buscarPorId(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.buscarPorId(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar dados do usuário' })
  @ApiResponse({ status: 200, description: 'Usuário atualizado com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 403, description: 'Sem permissão' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  @ApiResponse({ status: 409, description: 'Email já está em uso' })
  async atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUsuarioDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    if (user.papelGlobal !== PapelGlobal.MASTER && user.id !== id) {
      throw new ForbiddenException(
        'Você só pode atualizar seus próprios dados',
      );
    }

    return this.usuariosService.atualizar(id, dto);
  }

  @Patch(':id/senha')
  @ApiOperation({ summary: 'Alterar senha do usuário' })
  @ApiResponse({ status: 200, description: 'Senha alterada com sucesso' })
  @ApiResponse({ status: 401, description: 'Senha atual incorreta' })
  @ApiResponse({ status: 403, description: 'Sem permissão' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async alterarSenha(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AlterarSenhaDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    if (user.id !== id) {
      throw new ForbiddenException('Você só pode alterar sua própria senha');
    }

    return this.usuariosService.alterarSenha(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deletar usuário' })
  @ApiResponse({ status: 200, description: 'Usuário deletado com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 403, description: 'Sem permissão' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async deletar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserType,
  ) {
    if (user.papelGlobal !== PapelGlobal.MASTER && user.id !== id) {
      throw new ForbiddenException(
        'Você só pode deletar sua própria conta',
      );
    }

    return this.usuariosService.deletar(id);
  }

  @Post(':id/foto')
  @UseInterceptors(
    FileInterceptor('foto', {
      storage: require('multer').memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  @ApiOperation({ summary: 'Upload de foto de perfil' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        foto: {
          type: 'string',
          format: 'binary',
          description: 'Arquivo de imagem (JPG ou PNG, máx 5MB)',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Foto atualizada com sucesso' })
  @ApiResponse({ status: 400, description: 'Arquivo inválido' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 403, description: 'Sem permissão' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async atualizarFoto(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: CurrentUserType,
  ) {
    if (user.papelGlobal !== PapelGlobal.MASTER && user.id !== id) {
      throw new ForbiddenException(
        'Você só pode atualizar sua própria foto',
      );
    }

    if (!file) {
      throw new BadRequestException('Nenhum arquivo foi enviado');
    }

    return this.usuariosService.atualizarFotoPerfil(id, file);
  }
}
