import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { QuestionsGeneratorService } from './questions-generator.service';
import { AIService } from '../../ai/ai.service';
import { MdaWikiValidatorService } from './mda-wiki-validator.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../common/services/audit-log.service';
import { CategoriaEspecialidade, PapelClube, StatusMembro } from '@prisma/client';

describe('QuestionsGeneratorService', () => {
  let service: QuestionsGeneratorService;
  let aiService: AIService;
  let mdaWikiValidator: MdaWikiValidatorService;
  let prisma: PrismaService;
  let auditLog: AuditLogService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionsGeneratorService,
        {
          provide: AIService,
          useValue: {
            isAvailable: jest.fn(),
            generateQuestions: jest.fn(),
          },
        },
        {
          provide: MdaWikiValidatorService,
          useValue: {
            validateUrl: jest.fn(),
            extractEspecialidadeInfo: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            prova: {
              findUnique: jest.fn(),
            },
            questao: {
              create: jest.fn(),
            },
            membroClube: {
              findFirst: jest.fn(),
            },
          },
        },
        {
          provide: AuditLogService,
          useValue: {
            log: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<QuestionsGeneratorService>(QuestionsGeneratorService);
    aiService = module.get<AIService>(AIService);
    mdaWikiValidator = module.get<MdaWikiValidatorService>(MdaWikiValidatorService);
    prisma = module.get<PrismaService>(PrismaService);
    auditLog = module.get<AuditLogService>(AuditLogService);
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('gerarQuestoes', () => {
    it('deve lançar erro se IA não estiver disponível', async () => {
      jest.spyOn(aiService, 'isAvailable').mockReturnValue(false);

      await expect(
        service.gerarQuestoes(1, 'Primeiros Socorros', CategoriaEspecialidade.CIENCIA_E_SAUDE, 10),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve gerar questões com sucesso', async () => {
      jest.spyOn(aiService, 'isAvailable').mockReturnValue(true);
      jest.spyOn(aiService, 'generateQuestions').mockResolvedValue([
        {
          enunciado: 'O que é primeiros socorros?',
          tipo: 'MULTIPLA_ESCOLHA',
          opcoes: {
            a: 'Cuidados iniciais',
            b: 'Cuidados finais',
            c: 'Cirurgia',
            d: 'Exame',
          },
          respostaCorreta: 'a',
          pontuacao: 1,
        },
      ]);

      const result = await service.gerarQuestoes(
        1,
        'Primeiros Socorros',
        CategoriaEspecialidade.CIENCIA_E_SAUDE,
        10,
      );

      expect(result.questoes).toHaveLength(1);
      expect(result.urlValidada).toBe(true);
    });

    it('deve validar URL do MDA Wiki se fornecida', async () => {
      jest.spyOn(aiService, 'isAvailable').mockReturnValue(true);
      jest.spyOn(aiService, 'generateQuestions').mockResolvedValue([]);
      jest.spyOn(mdaWikiValidator, 'validateUrl').mockResolvedValue({
        valid: true,
        fullUrl: 'https://mda.wiki.br/test/',
      });
      jest.spyOn(mdaWikiValidator, 'extractEspecialidadeInfo').mockResolvedValue({
        nome: 'Primeiros Socorros',
        descricao: 'Descrição da especialidade',
      });

      const result = await service.gerarQuestoes(
        1,
        'Primeiros Socorros',
        CategoriaEspecialidade.CIENCIA_E_SAUDE,
        10,
        'test/',
      );

      expect(mdaWikiValidator.validateUrl).toHaveBeenCalledWith('test/');
      expect(mdaWikiValidator.extractEspecialidadeInfo).toHaveBeenCalledWith('test/');
      expect(result.urlValidada).toBe(true);
      expect(result.especialidadeInfo).toBeDefined();
    });

    it('deve marcar URL como inválida se validação falhar', async () => {
      jest.spyOn(aiService, 'isAvailable').mockReturnValue(true);
      jest.spyOn(aiService, 'generateQuestions').mockResolvedValue([]);
      jest.spyOn(mdaWikiValidator, 'validateUrl').mockResolvedValue({
        valid: false,
        fullUrl: 'https://mda.wiki.br/invalid/',
      });

      const result = await service.gerarQuestoes(
        1,
        'Primeiros Socorros',
        CategoriaEspecialidade.CIENCIA_E_SAUDE,
        10,
        'invalid/',
      );

      expect(result.urlValidada).toBe(false);
    });
  });

  describe('gerarESalvarQuestoes', () => {
    it('deve lançar erro se prova não encontrada', async () => {
      jest.spyOn(prisma.prova, 'findUnique').mockResolvedValue(null);

      await expect(
        service.gerarESalvarQuestoes(
          999,
          1,
          'Primeiros Socorros',
          CategoriaEspecialidade.CIENCIA_E_SAUDE,
          10,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve gerar e salvar questões com sucesso', async () => {
      const mockProva = {
        id: 1,
        titulo: 'Prova Teste',
        categoria: CategoriaEspecialidade.CIENCIA_E_SAUDE,
        clubeId: 1,
        questoes: [],
      };

      jest.spyOn(prisma.prova, 'findUnique').mockResolvedValue(mockProva as any);
      jest.spyOn(prisma.membroClube, 'findFirst').mockResolvedValue(null); // Não é DESBRAVADOR
      jest.spyOn(aiService, 'isAvailable').mockReturnValue(true);
      jest.spyOn(aiService, 'generateQuestions').mockResolvedValue([
        {
          enunciado: 'Teste',
          tipo: 'MULTIPLA_ESCOLHA',
          opcoes: { a: '1', b: '2', c: '3', d: '4' },
          respostaCorreta: 'a',
          pontuacao: 1,
        },
      ]);
      jest.spyOn(prisma.questao, 'create').mockResolvedValue({
        id: 1,
        provaId: 1,
        tipo: 'MULTIPLA_ESCOLHA',
        enunciado: 'Teste',
        opcoes: { a: '1', b: '2', c: '3', d: '4' },
        respostaCorreta: 'a',
        pontuacao: 1,
        ordem: 1,
        criadoEm: new Date(),
        atualizadoEm: new Date(),
      } as any);
      jest.spyOn(auditLog, 'log').mockImplementation();

      const result = await service.gerarESalvarQuestoes(
        1,
        1,
        'Primeiros Socorros',
        CategoriaEspecialidade.CIENCIA_E_SAUDE,
        1,
      );

      expect(result.questoesCriadas).toBe(1);
      expect(prisma.questao.create).toHaveBeenCalled();
      expect(auditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          action: 'GERAR_QUESTOES_IA',
          entity: 'Prova',
          entityId: 1,
        }),
      );
    });

    it('deve bloquear DESBRAVADOR de gerar questões', async () => {
      const mockProva = {
        id: 1,
        titulo: 'Prova Teste',
        categoria: CategoriaEspecialidade.CIENCIA_E_SAUDE,
        clubeId: 1,
        questoes: [],
      };

      const mockMembroDesbravador = {
        id: 1,
        usuarioId: 1,
        clubeId: 1,
        papel: PapelClube.DESBRAVADOR,
        status: StatusMembro.ATIVO,
      };

      jest.spyOn(prisma.prova, 'findUnique').mockResolvedValue(mockProva as any);
      jest.spyOn(prisma.membroClube, 'findFirst').mockResolvedValue(mockMembroDesbravador as any);

      await expect(
        service.gerarESalvarQuestoes(
          1,
          1,
          'Primeiros Socorros',
          CategoriaEspecialidade.CIENCIA_E_SAUDE,
          10,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('formatCategoria', () => {
    it('deve formatar categoria ADRA corretamente', () => {
      const formatted = service['formatCategoria'](CategoriaEspecialidade.ADRA);
      expect(formatted).toBe('ADRA');
    });

    it('deve formatar categoria CIENCIA_E_SAUDE corretamente', () => {
      const formatted = service['formatCategoria'](CategoriaEspecialidade.CIENCIA_E_SAUDE);
      expect(formatted).toBe('Ciência e Saúde');
    });

    it('deve formatar categoria ARTES_E_HABILIDADES_MANUAIS corretamente', () => {
      const formatted = service['formatCategoria'](
        CategoriaEspecialidade.ARTES_E_HABILIDADES_MANUAIS,
      );
      expect(formatted).toBe('Artes e Habilidades Manuais');
    });
  });
});
