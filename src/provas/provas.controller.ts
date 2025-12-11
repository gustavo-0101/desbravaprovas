import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ProvasService } from './provas.service';
import { CreateProvaDto } from './dto/create-prova.dto';
import { UpdateProvaDto } from './dto/update-prova.dto';
import { CreateQuestaoDto } from './dto/create-questao.dto';
import { UpdateQuestaoDto } from './dto/update-questao.dto';
import { ReordenarQuestoesDto } from './dto/reordenar-questoes.dto';
import { GenerateQuestionsIADto } from './dto/generate-questions-ia.dto';
import { QuestionsGeneratorService } from './ia/questions-generator.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Provas')
@Controller('provas')
export class ProvasController {
  constructor(
    private readonly provasService: ProvasService,
    private readonly questionsGeneratorService: QuestionsGeneratorService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Criar nova prova (Rate limit: 5/min)',
    description:
      'Cria uma prova de especialidade. Apenas ADMIN_CLUBE, DIRETORIA, CONSELHEIRO ou INSTRUTOR podem criar.',
  })
  @ApiResponse({ status: 201, description: 'Prova criada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 403, description: 'Sem permissão' })
  create(@Body() createProvaDto: CreateProvaDto, @GetUser('sub') usuarioId: number) {
    return this.provasService.create(usuarioId, createProvaDto);
  }

  @Post(':id/copiar')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Copiar prova pública para meu clube (Rate limit: 10/min)',
    description:
      'Copia uma prova pública da biblioteca global para o clube do usuário. Mantém a autoria original.',
  })
  @ApiParam({ name: 'id', description: 'ID da prova a ser copiada' })
  @ApiResponse({ status: 201, description: 'Prova copiada com sucesso' })
  @ApiResponse({ status: 403, description: 'Sem permissão ou prova não é pública' })
  @ApiResponse({ status: 404, description: 'Prova não encontrada' })
  copiarProva(
    @Param('id', ParseIntPipe) provaId: number,
    @GetUser('sub') usuarioId: number,
  ) {
    return this.provasService.copiarProva(usuarioId, provaId);
  }

  @Get('biblioteca')
  @ApiOperation({
    summary: 'Listar provas públicas (biblioteca global)',
    description: 'Lista todas as provas marcadas como públicas. Acesso público.',
  })
  @ApiResponse({ status: 200, description: 'Lista de provas públicas' })
  listarBiblioteca() {
    return this.provasService.listarBiblioteca();
  }

  @Get('meu-clube')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Listar provas do meu clube',
    description:
      'Lista provas do clube do usuário. DESBRAVADOR vê apenas provas permitidas (PUBLICA, PRIVADA_CLUBE, PRIVADA_UNIDADE da sua unidade). Outros papéis veem todas.',
  })
  @ApiResponse({ status: 200, description: 'Lista de provas do clube' })
  @ApiResponse({ status: 403, description: 'Não é membro de nenhum clube' })
  listarProvasClube(@GetUser('sub') usuarioId: number) {
    return this.provasService.listarProvasClube(usuarioId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Buscar prova por ID',
    description: 'Retorna prova específica com todas as questões ordenadas.',
  })
  @ApiParam({ name: 'id', description: 'ID da prova' })
  @ApiResponse({ status: 200, description: 'Prova encontrada' })
  @ApiResponse({ status: 403, description: 'Sem permissão para visualizar' })
  @ApiResponse({ status: 404, description: 'Prova não encontrada' })
  findOne(@Param('id', ParseIntPipe) id: number, @GetUser('sub') usuarioId: number) {
    return this.provasService.findOne(usuarioId, id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Atualizar prova (Rate limit: 10/min)',
    description:
      'Atualiza dados da prova. Apenas criador, ADMIN_CLUBE ou MASTER podem atualizar.',
  })
  @ApiParam({ name: 'id', description: 'ID da prova' })
  @ApiResponse({ status: 200, description: 'Prova atualizada' })
  @ApiResponse({ status: 403, description: 'Sem permissão' })
  @ApiResponse({ status: 404, description: 'Prova não encontrada' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProvaDto: UpdateProvaDto,
    @GetUser('sub') usuarioId: number,
  ) {
    return this.provasService.update(usuarioId, id, updateProvaDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Remover prova (Rate limit: 3/min)',
    description:
      'Remove prova e todas as questões (cascade). Apenas criador, ADMIN_CLUBE ou MASTER podem remover.',
  })
  @ApiParam({ name: 'id', description: 'ID da prova' })
  @ApiResponse({ status: 200, description: 'Prova removida' })
  @ApiResponse({ status: 403, description: 'Sem permissão' })
  @ApiResponse({ status: 404, description: 'Prova não encontrada' })
  remove(@Param('id', ParseIntPipe) id: number, @GetUser('sub') usuarioId: number) {
    return this.provasService.remove(usuarioId, id);
  }

  @Post(':id/questoes')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Adicionar questão à prova (Rate limit: 20/min)',
    description:
      'Adiciona nova questão à prova. Apenas criador, ADMIN_CLUBE ou MASTER podem adicionar.',
  })
  @ApiParam({ name: 'id', description: 'ID da prova' })
  @ApiResponse({ status: 201, description: 'Questão adicionada' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 403, description: 'Sem permissão' })
  @ApiResponse({ status: 404, description: 'Prova não encontrada' })
  adicionarQuestao(
    @Param('id', ParseIntPipe) provaId: number,
    @Body() createQuestaoDto: CreateQuestaoDto,
    @GetUser('sub') usuarioId: number,
  ) {
    return this.provasService.adicionarQuestao(usuarioId, provaId, createQuestaoDto);
  }

  @Post(':id/gerar-questoes-ia')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Gerar questões automaticamente por IA (Rate limit: 3/min)',
    description:
      'Gera questões automaticamente usando IA (OpenAI GPT-4). A IA cria questões variadas (múltipla escolha, dissertativas, práticas) baseadas na especialidade. Valida URL do MDA Wiki se fornecida. Requer OPENAI_API_KEY configurada.',
  })
  @ApiParam({ name: 'id', description: 'ID da prova' })
  @ApiResponse({
    status: 201,
    description: 'Questões geradas e adicionadas com sucesso',
    schema: {
      example: {
        questoesCriadas: 10,
        urlValidada: true,
        message: '10 questões geradas com sucesso para Primeiros Socorros',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos ou serviço de IA não configurado',
  })
  @ApiResponse({ status: 403, description: 'Sem permissão' })
  @ApiResponse({ status: 404, description: 'Prova não encontrada' })
  async gerarQuestoesIA(
    @Param('id', ParseIntPipe) provaId: number,
    @Body() dto: GenerateQuestionsIADto,
    @GetUser('sub') usuarioId: number,
  ) {
    const prova = await this.provasService.findOne(usuarioId, provaId);

    const result = await this.questionsGeneratorService.gerarESalvarQuestoes(
      provaId,
      usuarioId,
      dto.especialidade,
      prova.categoria,
      dto.numeroQuestoes,
      dto.urlReferenciaMDA,
    );

    return {
      ...result,
      message: `${result.questoesCriadas} questões geradas com sucesso para ${dto.especialidade}`,
    };
  }

  @Patch(':provaId/questoes/:questaoId')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Atualizar questão (Rate limit: 20/min)',
    description:
      'Atualiza questão existente. Apenas criador da prova, ADMIN_CLUBE ou MASTER podem atualizar.',
  })
  @ApiParam({ name: 'provaId', description: 'ID da prova' })
  @ApiParam({ name: 'questaoId', description: 'ID da questão' })
  @ApiResponse({ status: 200, description: 'Questão atualizada' })
  @ApiResponse({ status: 403, description: 'Sem permissão' })
  @ApiResponse({ status: 404, description: 'Questão não encontrada' })
  atualizarQuestao(
    @Param('questaoId', ParseIntPipe) questaoId: number,
    @Body() updateQuestaoDto: UpdateQuestaoDto,
    @GetUser('sub') usuarioId: number,
  ) {
    return this.provasService.atualizarQuestao(usuarioId, questaoId, updateQuestaoDto);
  }

  @Delete(':provaId/questoes/:questaoId')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Remover questão (Rate limit: 10/min)',
    description:
      'Remove questão da prova. Apenas criador da prova, ADMIN_CLUBE ou MASTER podem remover.',
  })
  @ApiParam({ name: 'provaId', description: 'ID da prova' })
  @ApiParam({ name: 'questaoId', description: 'ID da questão' })
  @ApiResponse({ status: 200, description: 'Questão removida' })
  @ApiResponse({ status: 403, description: 'Sem permissão' })
  @ApiResponse({ status: 404, description: 'Questão não encontrada' })
  removerQuestao(
    @Param('questaoId', ParseIntPipe) questaoId: number,
    @GetUser('sub') usuarioId: number,
  ) {
    return this.provasService.removerQuestao(usuarioId, questaoId);
  }

  @Patch(':id/questoes/reordenar')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Reordenar questões da prova (Rate limit: 10/min)',
    description:
      'Reordena questões da prova. Recebe array de IDs na ordem desejada. Apenas criador, ADMIN_CLUBE ou MASTER podem reordenar.',
  })
  @ApiParam({ name: 'id', description: 'ID da prova' })
  @ApiResponse({ status: 200, description: 'Questões reordenadas' })
  @ApiResponse({
    status: 400,
    description: 'IDs fornecidos não correspondem às questões da prova',
  })
  @ApiResponse({ status: 403, description: 'Sem permissão' })
  @ApiResponse({ status: 404, description: 'Prova não encontrada' })
  reordenarQuestoes(
    @Param('id', ParseIntPipe) provaId: number,
    @Body() reordenarQuestoesDto: ReordenarQuestoesDto,
    @GetUser('sub') usuarioId: number,
  ) {
    return this.provasService.reordenarQuestoes(
      usuarioId,
      provaId,
      reordenarQuestoesDto,
    );
  }
}
