import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  afterEach(async () => {
    await service.$disconnect();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('deve conectar ao banco de dados', async () => {
      const connectSpy = jest
        .spyOn(service, '$connect')
        .mockResolvedValue(undefined);

      await service.onModuleInit();

      expect(connectSpy).toHaveBeenCalled();
    });

    it('deve lançar erro se falhar ao conectar', async () => {
      const error = new Error('Falha na conexão');
      jest.spyOn(service, '$connect').mockRejectedValue(error);

      await expect(service.onModuleInit()).rejects.toThrow('Falha na conexão');
    });
  });

  describe('onModuleDestroy', () => {
    it('deve desconectar do banco de dados', async () => {
      const disconnectSpy = jest
        .spyOn(service, '$disconnect')
        .mockResolvedValue(undefined);

      await service.onModuleDestroy();

      expect(disconnectSpy).toHaveBeenCalled();
    });

    it('não deve lançar erro se falhar ao desconectar', async () => {
      const error = new Error('Erro ao desconectar');
      jest.spyOn(service, '$disconnect').mockRejectedValue(error);

      await expect(service.onModuleDestroy()).resolves.not.toThrow();
    });
  });

  describe('healthCheck', () => {
    it('deve retornar true se banco está acessível', async () => {
      jest.spyOn(service, '$queryRaw').mockResolvedValue([{ result: 1 }]);

      const result = await service.healthCheck();

      expect(result).toBe(true);
      expect(service.$queryRaw).toHaveBeenCalled();
    });

    it('deve retornar false se banco não está acessível', async () => {
      jest
        .spyOn(service, '$queryRaw')
        .mockRejectedValue(new Error('Connection refused'));

      const result = await service.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('cleanDatabase', () => {
    it('deve limpar todas as tabelas em ambiente de desenvolvimento', async () => {
      process.env.NODE_ENV = 'development';

      const transactionSpy = jest
        .spyOn(service, '$transaction')
        .mockResolvedValue([]);

      await service.cleanDatabase();

      expect(transactionSpy).toHaveBeenCalled();
    });

    it('deve lançar erro em ambiente de produção', async () => {
      process.env.NODE_ENV = 'production';

      await expect(service.cleanDatabase()).rejects.toThrow(
        'cleanDatabase() não pode ser executado em produção!',
      );
    });

    afterEach(() => {
      process.env.NODE_ENV = 'test';
    });
  });
});
