import { Injectable, Logger, BadRequestException, ForbiddenException } from '@nestjs/common';
import { AIService, QuestaoGerada } from '../../ai/ai.service';
import { MdaWikiValidatorService } from './mda-wiki-validator.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../common/services/audit-log.service';
import { CategoriaEspecialidade, TipoQuestao, PapelClube, StatusMembro } from '@prisma/client';

export interface GerarQuestoesResult {
  questoes: QuestaoGerada[];
  urlValidada: boolean;
  especialidadeInfo?: {
    nome: string;
    descricao?: string;
  };
}

@Injectable()
export class QuestionsGeneratorService {
  private readonly logger = new Logger(QuestionsGeneratorService.name);

  constructor(
    private aiService: AIService,
    private mdaWikiValidator: MdaWikiValidatorService,
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

  async gerarQuestoes(
    provaId: number,
    especialidade: string,
    categoria: CategoriaEspecialidade,
    numeroQuestoes: number,
    urlReferenciaMDA?: string,
  ): Promise<GerarQuestoesResult> {
    this.logger.log(
      `Gerando ${numeroQuestoes} questões para prova ${provaId}: ${especialidade}`,
    );

    if (!this.aiService.isAvailable()) {
      throw new BadRequestException(
        'Serviço de IA não está disponível. Configure OPENAI_API_KEY no .env',
      );
    }

    let urlValidada = true;
    let especialidadeInfo: { nome: string; descricao?: string } | undefined;

    if (urlReferenciaMDA) {
      const validationResult = await this.mdaWikiValidator.validateUrl(urlReferenciaMDA);

      if (!validationResult.valid) {
        this.logger.warn(`URL do MDA Wiki inválida: ${validationResult.fullUrl}`);
        urlValidada = false;
      } else {
        const info = await this.mdaWikiValidator.extractEspecialidadeInfo(
          urlReferenciaMDA,
        );

        if (info) {
          especialidadeInfo = info;
          this.logger.log(`Informações extraídas: ${info.nome}`);
        }
      }
    }

    const questoes = await this.aiService.generateQuestions({
      especialidade,
      categoria: this.formatCategoria(categoria),
      numeroQuestoes,
      urlReferencia: urlReferenciaMDA,
    });

    this.logger.log(`${questoes.length} questões geradas com sucesso`);

    return {
      questoes,
      urlValidada,
      especialidadeInfo,
    };
  }

  async gerarESalvarQuestoes(
    provaId: number,
    usuarioId: number,
    especialidade: string,
    categoria: CategoriaEspecialidade,
    numeroQuestoes: number,
    urlReferenciaMDA?: string,
  ): Promise<{ questoesCriadas: number; urlValidada: boolean }> {
    const prova = await this.prisma.prova.findUnique({
      where: { id: provaId },
      include: { questoes: true, clube: true },
    });

    if (!prova) {
      throw new BadRequestException('Prova não encontrada');
    }

    const membro = await this.prisma.membroClube.findFirst({
      where: {
        usuarioId,
        clubeId: prova.clubeId,
        status: StatusMembro.ATIVO,
      },
    });

    if (membro && membro.papel === PapelClube.DESBRAVADOR) {
      this.logger.warn(
        `Tentativa de geração de questões por DESBRAVADOR (usuário ${usuarioId})`,
      );
      throw new ForbiddenException(
        'Desbravadores não podem gerar questões. Apenas líderes e instrutores têm essa permissão.',
      );
    }

    const result = await this.gerarQuestoes(
      provaId,
      especialidade,
      categoria,
      numeroQuestoes,
      urlReferenciaMDA,
    );

    const proximaOrdem = prova.questoes.length + 1;

    const questoesCriadas = await Promise.all(
      result.questoes.map(async (q, index) => {
        return this.prisma.questao.create({
          data: {
            provaId,
            tipo: q.tipo as TipoQuestao,
            enunciado: q.enunciado,
            opcoes: q.opcoes || undefined,
            respostaCorreta: q.respostaCorreta || undefined,
            pontuacao: q.pontuacao,
            ordem: proximaOrdem + index,
          },
        });
      }),
    );

    this.auditLog.log({
      timestamp: new Date(),
      userId: usuarioId,
      action: 'GERAR_QUESTOES_IA',
      entity: 'Prova',
      entityId: provaId,
      details: {
        especialidade,
        categoria,
        numeroQuestoes: questoesCriadas.length,
        urlReferenciaMDA: urlReferenciaMDA || null,
        urlValidada: result.urlValidada,
      },
    });

    this.logger.log(
      `${questoesCriadas.length} questões salvas na prova ${provaId} (Audit log criado)`,
    );

    return {
      questoesCriadas: questoesCriadas.length,
      urlValidada: result.urlValidada,
    };
  }

  private formatCategoria(categoria: CategoriaEspecialidade): string {
    const map: Record<CategoriaEspecialidade, string> = {
      ADRA: 'ADRA',
      ARTES_E_HABILIDADES_MANUAIS: 'Artes e Habilidades Manuais',
      ATIVIDADES_AGRICOLAS: 'Atividades Agrícolas',
      ATIVIDADES_MISSIONARIAS_E_COMUNITARIAS: 'Atividades Missionárias e Comunitárias',
      ATIVIDADES_PROFISSIONAIS: 'Atividades Profissionais',
      ATIVIDADES_RECREATIVAS: 'Atividades Recreativas',
      CIENCIA_E_SAUDE: 'Ciência e Saúde',
      ESTUDOS_DA_NATUREZA: 'Estudos da Natureza',
      HABILIDADES_DOMESTICAS: 'Habilidades Domésticas',
    };

    return map[categoria] || categoria;
  }
}
