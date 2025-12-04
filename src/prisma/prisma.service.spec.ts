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
    // Desconectar após cada teste para evitar conexões pendentes
    await service.$disconnect();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('deve conectar ao banco de dados', async () => {
      // Arrange
      const connectSpy = jest
        .spyOn(service, '$connect')
        .mockResolvedValue(undefined);

      // Act
      await service.onModuleInit();

      // Assert
      expect(connectSpy).toHaveBeenCalled();
    });

    it('deve lançar erro se falhar ao conectar', async () => {
      // Arrange
      const error = new Error('Falha na conexão');
      jest.spyOn(service, '$connect').mockRejectedValue(error);

      // Act & Assert
      await expect(service.onModuleInit()).rejects.toThrow('Falha na conexão');
    });
  });

  describe('onModuleDestroy', () => {
    it('deve desconectar do banco de dados', async () => {
      // Arrange
      const disconnectSpy = jest
        .spyOn(service, '$disconnect')
        .mockResolvedValue(undefined);

      // Act
      await service.onModuleDestroy();

      // Assert
      expect(disconnectSpy).toHaveBeenCalled();
    });

    it('não deve lançar erro se falhar ao desconectar', async () => {
      // Arrange
      const error = new Error('Erro ao desconectar');
      jest.spyOn(service, '$disconnect').mockRejectedValue(error);

      // Act & Assert
      // Deve apenas logar o erro, não lançar exceção
      await expect(service.onModuleDestroy()).resolves.not.toThrow();
    });
  });

  describe('healthCheck', () => {
    it('deve retornar true se banco está acessível', async () => {
      // Arrange
      jest.spyOn(service, '$queryRaw').mockResolvedValue([{ result: 1 }]);

      // Act
      const result = await service.healthCheck();

      // Assert
      expect(result).toBe(true);
      expect(service.$queryRaw).toHaveBeenCalled();
    });

    it('deve retornar false se banco não está acessível', async () => {
      // Arrange
      jest
        .spyOn(service, '$queryRaw')
        .mockRejectedValue(new Error('Connection refused'));

      // Act
      const result = await service.healthCheck();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('cleanDatabase', () => {
    it('deve limpar todas as tabelas em ambiente de desenvolvimento', async () => {
      // Arrange
      process.env.NODE_ENV = 'development';

      const transactionSpy = jest
        .spyOn(service, '$transaction')
        .mockResolvedValue([]);

      // // Mock dos deleteMany
      // service.respostaProva = { deleteMany: jest.fn() } as any;
      // service.questao = { deleteMany: jest.fn() } as any;
      // service.prova = { deleteMany: jest.fn() } as any;
      // service.membroClube = { deleteMany: jest.fn() } as any;
      // service.unidade = { deleteMany: jest.fn() } as any;
      // service.clube = { deleteMany: jest.fn() } as any;
      // service.especialidade = { deleteMany: jest.fn() } as any;
      // service.usuario = { deleteMany: jest.fn() } as any;

      // Act
      await service.cleanDatabase();

      // Assert
      expect(transactionSpy).toHaveBeenCalled();
    });

    it('deve lançar erro em ambiente de produção', async () => {
      // Arrange
      process.env.NODE_ENV = 'production';

      // Act & Assert
      await expect(service.cleanDatabase()).rejects.toThrow(
        'cleanDatabase() não pode ser executado em produção!',
      );
    });

    afterEach(() => {
      // Resetar NODE_ENV
      process.env.NODE_ENV = 'test';
    });
  });
});
