import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(private configService: ConfigService) {
    const connectionString = configService.get<string>('DATABASE_URL');

    if (!connectionString) {
      throw new Error('DATABASE_URL não está definida no .env');
    }

    const pool = new Pool({ connectionString });

    const adapter = new PrismaPg(pool);

    super({
      adapter,
      log:
        configService.get<string>('NODE_ENV') === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['warn', 'error'],
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Conectado ao banco de dados PostgreSQL');
    } catch (error) {
      this.logger.error('Falha ao conectar ao banco de dados', error);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.$disconnect();
      this.logger.log('Desconectado do banco de dados PostgreSQL');
    } catch (error) {
      this.logger.error('Erro ao desconectar do banco de dados', error);
    }
  }

  async cleanDatabase(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'cleanDatabase() não pode ser executado em produção!',
      );
    }

    this.logger.warn('Limpando banco de dados...');

    await this.$transaction([
      this.respostaProva.deleteMany(),
      this.questao.deleteMany(),
      this.prova.deleteMany(),
      this.membroClube.deleteMany(),
      this.unidade.deleteMany(),
      this.clube.deleteMany(),
      this.especialidade.deleteMany(),
      this.usuario.deleteMany(),
    ]);

    this.logger.warn('Banco de dados limpo');
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error('Health check falhou', error);
      return false;
    }
  }
}
