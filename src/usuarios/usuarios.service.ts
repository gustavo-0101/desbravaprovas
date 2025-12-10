import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUsuarioDto, AlterarSenhaDto } from './dto';
import * as bcrypt from 'bcrypt';
import sharp from 'sharp';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService) {}

  async listarTodos(pagina: number = 1, limite: number = 10) {
    const skip = (pagina - 1) * limite;

    const [usuarios, total] = await Promise.all([
      this.prisma.usuario.findMany({
        skip,
        take: limite,
        orderBy: { criadoEm: 'desc' },
        select: {
          id: true,
          nome: true,
          email: true,
          papelGlobal: true,
          fotoPerfilUrl: true,
          emailVerificado: true,
          criadoEm: true,
          atualizadoEm: true,
        },
      }),
      this.prisma.usuario.count(),
    ]);

    return {
      dados: usuarios,
      paginacao: {
        paginaAtual: pagina,
        itensPorPagina: limite,
        totalItens: total,
        totalPaginas: Math.ceil(total / limite),
      },
    };
  }

  async buscarPorId(id: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        email: true,
        papelGlobal: true,
        fotoPerfilUrl: true,
        emailVerificado: true,
        criadoEm: true,
        atualizadoEm: true,
      },
    });

    if (!usuario) {
      throw new NotFoundException(`Usuário com ID ${id} não encontrado`);
    }

    return usuario;
  }

  async buscarPorEmail(email: string) {
    return this.prisma.usuario.findUnique({
      where: { email },
      select: {
        id: true,
        nome: true,
        email: true,
        papelGlobal: true,
        fotoPerfilUrl: true,
        emailVerificado: true,
        criadoEm: true,
        atualizadoEm: true,
      },
    });
  }

  async buscarPorEmailComSenha(email: string) {
    return this.prisma.usuario.findUnique({
      where: { email },
    });
  }

  async atualizar(id: number, dto: UpdateUsuarioDto) {
    await this.buscarPorId(id);

    if (dto.email) {
      const usuarioExistente = await this.prisma.usuario.findUnique({
        where: { email: dto.email },
      });

      if (usuarioExistente && usuarioExistente.id !== id) {
        throw new ConflictException('Este email já está em uso');
      }

      const usuario = await this.prisma.usuario.update({
        where: { id },
        data: {
          ...dto,
          emailVerificado: false,
          tokenVerificacao: null,
        },
        select: {
          id: true,
          nome: true,
          email: true,
          papelGlobal: true,
          fotoPerfilUrl: true,
          emailVerificado: true,
          criadoEm: true,
          atualizadoEm: true,
        },
      });

      return usuario;
    }

    const usuario = await this.prisma.usuario.update({
      where: { id },
      data: dto,
      select: {
        id: true,
        nome: true,
        email: true,
        papelGlobal: true,
        fotoPerfilUrl: true,
        emailVerificado: true,
        criadoEm: true,
        atualizadoEm: true,
      },
    });

    return usuario;
  }

  async alterarSenha(id: number, dto: AlterarSenhaDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
    });

    if (!usuario) {
      throw new NotFoundException(`Usuário com ID ${id} não encontrado`);
    }

    if (!usuario.senhaHash) {
      throw new UnauthorizedException(
        'Usuários que fazem login com Google não possuem senha',
      );
    }

    const senhaValida = await bcrypt.compare(
      dto.senhaAtual,
      usuario.senhaHash,
    );

    if (!senhaValida) {
      throw new UnauthorizedException('Senha atual incorreta');
    }

    const novaSenhaHash = await bcrypt.hash(dto.novaSenha, 10);

    await this.prisma.usuario.update({
      where: { id },
      data: { senhaHash: novaSenhaHash },
    });

    return { message: 'Senha alterada com sucesso' };
  }

  async deletar(id: number) {
    await this.buscarPorId(id);

    await this.prisma.usuario.delete({
      where: { id },
    });

    return { message: 'Usuário deletado com sucesso' };
  }

  async atualizarFotoPerfil(id: number, file: Express.Multer.File) {
    const usuario = await this.buscarPorId(id);

    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!tiposPermitidos.includes(file.mimetype)) {
      throw new BadRequestException(
        'Formato de arquivo inválido. Use JPG ou PNG',
      );
    }

    const tamanhoMaximo = 5 * 1024 * 1024;
    if (file.size > tamanhoMaximo) {
      throw new BadRequestException(
        'Arquivo muito grande. Tamanho máximo: 5MB',
      );
    }

    const uploadsDir = path.join(process.cwd(), 'uploads', 'profiles');
    await fs.mkdir(uploadsDir, { recursive: true });

    const nomeArquivo = `${id}-${Date.now()}.jpg`;
    const caminhoCompleto = path.join(uploadsDir, nomeArquivo);

    await sharp(file.buffer)
      .resize(300, 300, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: 90 })
      .toFile(caminhoCompleto);

    if (usuario.fotoPerfilUrl) {
      const caminhoAntigo = path.join(process.cwd(), usuario.fotoPerfilUrl);
      try {
        await fs.unlink(caminhoAntigo);
      } catch (error) {
      }
    }

    const fotoPerfilUrl = `/uploads/profiles/${nomeArquivo}`;
    const usuarioAtualizado = await this.prisma.usuario.update({
      where: { id },
      data: { fotoPerfilUrl },
      select: {
        id: true,
        nome: true,
        email: true,
        papelGlobal: true,
        fotoPerfilUrl: true,
        emailVerificado: true,
        criadoEm: true,
        atualizadoEm: true,
      },
    });

    return usuarioAtualizado;
  }
}
