import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';

type AIProvider = 'gemini' | 'groq';

export interface QuestaoGerada {
  enunciado: string;
  tipo: 'MULTIPLA_ESCOLHA' | 'DISSERTATIVA' | 'PRATICA';
  opcoes?: {
    a: string;
    b: string;
    c: string;
    d: string;
  };
  respostaCorreta?: string;
  pontuacao: number;
}

export interface GenerateQuestionsParams {
  especialidade: string;
  categoria: string;
  numeroQuestoes: number;
  urlReferencia?: string;
}

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private genAI: GoogleGenerativeAI | null = null;
  private groq: Groq | null = null;
  private provider: AIProvider | null = null;

  constructor(private configService: ConfigService) {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    const preferredProvider = this.configService.get<string>('AI_PROVIDER')?.toLowerCase();

    const groqKey = this.configService.get<string>('GROQ_API_KEY');
    const geminiKey = this.configService.get<string>('GEMINI_API_KEY');

    if (preferredProvider === 'groq' && groqKey) {
      this.groq = new Groq({ apiKey: groqKey });
      this.provider = 'groq';
      this.logger.log('✅ Groq provider initialized (GRATUITO: 14.400 req/dia, MUITO RÁPIDO)');
    } else if (preferredProvider === 'gemini' && geminiKey) {
      this.genAI = new GoogleGenerativeAI(geminiKey);
      this.provider = 'gemini';
      this.logger.log('✅ Google Gemini provider initialized (GRATUITO: 1500 req/dia)');
    } else if (groqKey) {
      this.groq = new Groq({ apiKey: groqKey });
      this.provider = 'groq';
      this.logger.log('✅ Groq provider initialized (auto-detected)');
    } else if (geminiKey) {
      this.genAI = new GoogleGenerativeAI(geminiKey);
      this.provider = 'gemini';
      this.logger.log('✅ Google Gemini provider initialized (auto-detected)');
    } else {
      this.logger.warn('⚠️ Nenhuma API key configurada. Configure GROQ_API_KEY ou GEMINI_API_KEY no .env');
    }
  }

  async generateQuestions(params: GenerateQuestionsParams): Promise<QuestaoGerada[]> {
    if (!this.isAvailable()) {
      throw new BadRequestException(
        'Serviço de IA não configurado. Configure GROQ_API_KEY ou GEMINI_API_KEY no .env',
      );
    }

    const { especialidade, categoria, numeroQuestoes, urlReferencia } = params;

    this.logger.log(`Gerando ${numeroQuestoes} questões para: ${especialidade} (provider: ${this.provider})`);

    const prompt = this.buildPrompt(especialidade, categoria, numeroQuestoes, urlReferencia);

    try {
      let content: string;

      if (this.provider === 'groq') {
        content = await this.generateWithGroq(prompt);
      } else if (this.provider === 'gemini') {
        content = await this.generateWithGemini(prompt);
      } else {
        throw new Error('Nenhum provider de IA configurado');
      }

      if (!content) {
        throw new Error('Resposta vazia da IA');
      }

      const parsedResult = JSON.parse(content);

      if (!parsedResult.questoes || !Array.isArray(parsedResult.questoes)) {
        throw new Error('Formato de resposta inválido da IA');
      }

      const questoes: QuestaoGerada[] = parsedResult.questoes.map((q: any, index: number) => {
        const questao: QuestaoGerada = {
          enunciado: q.enunciado,
          tipo: this.identificarTipo(q),
          pontuacao: 1,
        };

        if (questao.tipo === 'MULTIPLA_ESCOLHA' && q.opcoes && q.respostaCorreta) {
          questao.opcoes = {
            a: q.opcoes.a || q.opcoes.A,
            b: q.opcoes.b || q.opcoes.B,
            c: q.opcoes.c || q.opcoes.C,
            d: q.opcoes.d || q.opcoes.D,
          };
          questao.respostaCorreta = q.respostaCorreta.toLowerCase();
        }

        return questao;
      });

      this.logger.log(`${questoes.length} questões geradas com sucesso`);

      return questoes;
    } catch (error) {
      this.logger.error('Erro ao gerar questões com IA', error);
      throw new BadRequestException(
        'Erro ao gerar questões. Verifique os logs para mais detalhes.',
      );
    }
  }

  private buildPrompt(
    especialidade: string,
    categoria: string,
    numeroQuestoes: number,
    urlReferencia?: string,
  ): string {
    const especialidadeSanitizada = this.sanitizeInput(especialidade);
    const categoriaSanitizada = this.sanitizeInput(categoria);

    let prompt = `Crie ${numeroQuestoes} questões educacionais para a especialidade de Desbravadores: "${especialidadeSanitizada}" (Categoria: ${categoriaSanitizada}).\n\n`;

    if (urlReferencia) {
      prompt += `Referência: https://mda.wiki.br/${urlReferencia}\n\n`;
    }

    prompt += `IMPORTANTE:
- Crie questões variadas: múltipla escolha (maioria), dissertativas (algumas) e práticas (quando aplicável)
- Questões PRÁTICAS devem requerer demonstração física ou habilidade prática (ex: "Demonstre como fazer um nó direito", "Faça uma dobra de papel")
- Questões de múltipla escolha devem ter 4 alternativas (a, b, c, d)
- Use linguagem clara e adequada para jovens de 10-16 anos
- Evite ambiguidade nas questões
- As questões devem testar conhecimento teórico E habilidades práticas da especialidade

FORMATO DE RESPOSTA (JSON):
{
  "questoes": [
    {
      "enunciado": "Qual é o nome científico da abelha?",
      "tipo": "MULTIPLA_ESCOLHA",
      "opcoes": {
        "a": "Apis mellifera",
        "b": "Bombus terrestris",
        "c": "Vespa crabro",
        "d": "Formicidae apis"
      },
      "respostaCorreta": "a"
    },
    {
      "enunciado": "Explique o processo de polinização realizado pelas abelhas.",
      "tipo": "DISSERTATIVA"
    },
    {
      "enunciado": "Demonstre como manusear equipamento de apicultura com segurança.",
      "tipo": "PRATICA"
    }
  ]
}

Retorne APENAS o JSON, sem texto adicional.`;

    return prompt;
  }

  private identificarTipo(questao: any): 'MULTIPLA_ESCOLHA' | 'DISSERTATIVA' | 'PRATICA' {
    const tipoInformado = questao.tipo?.toUpperCase();

    if (tipoInformado === 'PRATICA' || tipoInformado === 'PRÁTICA') {
      return 'PRATICA';
    }

    if (questao.opcoes && questao.respostaCorreta) {
      return 'MULTIPLA_ESCOLHA';
    }

    const enunciadoLower = questao.enunciado?.toLowerCase() || '';

    const palavrasChavePratica = [
      'demonstre',
      'execute',
      'realize',
      'faça',
      'construa',
      'monte',
      'prepare',
      'apresente',
      'mostre',
      'pratique',
    ];

    if (palavrasChavePratica.some((palavra) => enunciadoLower.includes(palavra))) {
      return 'PRATICA';
    }

    return 'DISSERTATIVA';
  }

  isAvailable(): boolean {
    return this.provider !== null;
  }

  getProvider(): AIProvider | null {
    return this.provider;
  }

  private async generateWithGemini(prompt: string): Promise<string> {
    if (!this.genAI) {
      throw new Error('Gemini não inicializado');
    }

    const model = this.genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.7,
        responseMimeType: 'application/json',
      },
    });

    const systemInstruction = 'Você é um especialista em criar provas educacionais para Desbravadores (movimento juvenil adventista). Suas questões devem ser claras, educativas e adequadas para jovens entre 10-16 anos.';

    const fullPrompt = `${systemInstruction}\n\n${prompt}`;

    const result = await model.generateContent(fullPrompt);
    const response = result.response;
    return response.text();
  }

  private async generateWithGroq(prompt: string): Promise<string> {
    if (!this.groq) {
      throw new Error('Groq não inicializado');
    }

    const systemInstruction = 'Você é um especialista em criar provas educacionais para Desbravadores (movimento juvenil adventista). Suas questões devem ser claras, educativas e adequadas para jovens entre 10-16 anos.';

    const completion = await this.groq.chat.completions.create({
      model: 'llama-3.1-70b-versatile',
      messages: [
        {
          role: 'system',
          content: systemInstruction,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
    });

    return completion.choices[0]?.message?.content || '';
  }

  private sanitizeInput(input: string): string {
    if (!input) return '';

    return input
      .replace(/[\r\n]+/g, ' ')
      .replace(/[<>{}[\]]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 200);
  }
}
