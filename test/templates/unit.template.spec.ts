import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../src/prisma/prisma.service';
// Import do service a ser testado
// import { ExemploService } from '../../src/exemplo/exemplo.service';

/**
 * Template para testes unitários de Services
 *
 * INSTRUÇÕES:
 * 1. Copie este arquivo para o módulo que deseja testar
 * 2. Renomeie para: nome-do-service.service.spec.ts
 * 3. Substitua 'ExemploService' pelo nome do seu service
 * 4. Implemente os testes específicos
 * 5. Delete este comentário
 */

class PrismaServiceEx extends PrismaService {
    exemplo: any;
}

describe('ExemploService', () => {
  let service: any; // ExemploService
  let prisma: PrismaServiceEx;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        // ExemploService,
        {
          provide: PrismaService,
          useValue: {
            // Mock dos métodos do Prisma que você usa
            exemplo: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    // service = module.get<ExemploService>(ExemploService);
    prisma = module.get<PrismaServiceEx>(PrismaServiceEx);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('criar', () => {
    it('deve criar um novo registro', async () => {
      // Arrange (preparar)
      const dto = {
        campo1: 'valor1',
        campo2: 'valor2',
      };

      const expected = {
        id: 1,
        ...dto,
        criadoEm: new Date(),
      };

      jest.spyOn(prisma.exemplo, 'create').mockResolvedValue(expected as any);

      // Act (agir)
      const result = await service.criar(dto);

      // Assert (verificar)
      expect(result).toEqual(expected);
      expect(prisma.exemplo.create).toHaveBeenCalledWith({
        data: dto,
      });
    });

    it('deve lançar exceção se dados inválidos', async () => {
      const dtoInvalido = {};

      await expect(service.criar(dtoInvalido)).rejects.toThrow();
    });
  });

  describe('buscarPorId', () => {
    it('deve retornar um registro por ID', async () => {
      const id = 1;
      const expected = {
        id,
        campo1: 'valor1',
        campo2: 'valor2',
      };

      jest.spyOn(prisma.exemplo, 'findUnique').mockResolvedValue(expected as any);

      const result = await service.buscarPorId(id);

      expect(result).toEqual(expected);
      expect(prisma.exemplo.findUnique).toHaveBeenCalledWith({
        where: { id },
      });
    });

    it('deve lançar NotFoundException se não encontrar', async () => {
      const id = 999;

      jest.spyOn(prisma.exemplo, 'findUnique').mockResolvedValue(null);

      await expect(service.buscarPorId(id)).rejects.toThrow('não encontrado');
    });
  });

  describe('listar', () => {
    it('deve retornar uma lista de registros', async () => {
      const expected = [
        { id: 1, campo1: 'valor1' },
        { id: 2, campo1: 'valor2' },
      ];

      jest.spyOn(prisma.exemplo, 'findMany').mockResolvedValue(expected as any);

      const result = await service.listar();

      expect(result).toEqual(expected);
      expect(result).toHaveLength(2);
    });

    it('deve retornar lista vazia se não houver registros', async () => {
      jest.spyOn(prisma.exemplo, 'findMany').mockResolvedValue([]);

      const result = await service.listar();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('atualizar', () => {
    it('deve atualizar um registro', async () => {
      const id = 1;
      const dto = { campo1: 'novo valor' };
      const expected = { id, ...dto };

      jest.spyOn(prisma.exemplo, 'findUnique').mockResolvedValue({ id } as any);
      jest.spyOn(prisma.exemplo, 'update').mockResolvedValue(expected as any);

      const result = await service.atualizar(id, dto);

      expect(result).toEqual(expected);
      expect(prisma.exemplo.update).toHaveBeenCalledWith({
        where: { id },
        data: dto,
      });
    });
  });

  describe('deletar', () => {
    it('deve deletar um registro', async () => {
      const id = 1;

      jest.spyOn(prisma.exemplo, 'findUnique').mockResolvedValue({ id } as any);
      jest.spyOn(prisma.exemplo, 'delete').mockResolvedValue({ id } as any);

      await service.deletar(id);

      expect(prisma.exemplo.delete).toHaveBeenCalledWith({
        where: { id },
      });
    });

    it('deve lançar exceção se registro não existir', async () => {
      const id = 999;

      jest.spyOn(prisma.exemplo, 'findUnique').mockResolvedValue(null);

      await expect(service.deletar(id)).rejects.toThrow();
    });
  });
});
