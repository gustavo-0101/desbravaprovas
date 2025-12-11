import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { AIService } from './ai.service';

describe('AIService', () => {
  let service: AIService;
  let configService: ConfigService;

  describe('com IA configurada', () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AIService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'GEMINI_API_KEY') return 'test-gemini-key';
                if (key === 'GROQ_API_KEY') return 'test-groq-key';
                if (key === 'AI_PROVIDER') return 'gemini';
                return null;
              }),
            },
          },
        ],
      }).compile();

      service = module.get<AIService>(AIService);
      configService = module.get<ConfigService>(ConfigService);
    });

    it('deve estar definido', () => {
      expect(service).toBeDefined();
    });

    it('deve estar disponível com API key configurada', () => {
      expect(service.isAvailable()).toBe(true);
    });

    it('deve identificar tipo MULTIPLA_ESCOLHA quando tem opcoes', () => {
      const questao = {
        enunciado: 'Qual é a capital do Brasil?',
        opcoes: { a: 'São Paulo', b: 'Brasília', c: 'Rio de Janeiro', d: 'Salvador' },
        respostaCorreta: 'b',
      };

      const tipo = service['identificarTipo'](questao);

      expect(tipo).toBe('MULTIPLA_ESCOLHA');
    });

    it('deve identificar tipo PRATICA quando enunciado tem palavra-chave', () => {
      const questao = {
        enunciado: 'Demonstre como fazer um nó direito',
      };

      const tipo = service['identificarTipo'](questao);

      expect(tipo).toBe('PRATICA');
    });

    it('deve identificar tipo DISSERTATIVA por padrão', () => {
      const questao = {
        enunciado: 'Explique o processo de polinização',
      };

      const tipo = service['identificarTipo'](questao);

      expect(tipo).toBe('DISSERTATIVA');
    });

    it('deve respeitar tipo informado como PRATICA', () => {
      const questao = {
        enunciado: 'Realize a atividade',
        tipo: 'PRATICA',
      };

      const tipo = service['identificarTipo'](questao);

      expect(tipo).toBe('PRATICA');
    });

    it('deve respeitar tipo informado como PRÁTICA (com acento)', () => {
      const questao = {
        enunciado: 'Realize a atividade',
        tipo: 'PRÁTICA',
      };

      const tipo = service['identificarTipo'](questao);

      expect(tipo).toBe('PRATICA');
    });
  });

  describe('sem IA configurada', () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AIService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(() => null),
            },
          },
        ],
      }).compile();

      service = module.get<AIService>(AIService);
    });

    it('não deve estar disponível sem API key', () => {
      expect(service.isAvailable()).toBe(false);
    });

    it('deve lançar erro ao tentar gerar questões sem API key', async () => {
      await expect(
        service.generateQuestions({
          especialidade: 'Primeiros Socorros',
          categoria: 'Ciência e Saúde',
          numeroQuestoes: 10,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
