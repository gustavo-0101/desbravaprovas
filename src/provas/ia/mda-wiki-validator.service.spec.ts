import { Test, TestingModule } from '@nestjs/testing';
import { MdaWikiValidatorService } from './mda-wiki-validator.service';

describe('MdaWikiValidatorService', () => {
  let service: MdaWikiValidatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MdaWikiValidatorService],
    }).compile();

    service = module.get<MdaWikiValidatorService>(MdaWikiValidatorService);
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  it('deve construir URL completa a partir do slug', () => {
    const slug = 'Especialidade_de_Primeiros_Socorros_-_b%C3%A1sico/';
    const fullUrl = service.getFullUrl(slug);

    expect(fullUrl).toBe('https://mda.wiki.br/Especialidade_de_Primeiros_Socorros_-_b%C3%A1sico/');
  });

  it('deve extrair nome do slug corretamente', () => {
    const slug = 'Especialidade_de_Primeiros_Socorros/';
    const nome = service['extractNameFromSlug'](slug);

    expect(nome).toBe('Primeiros Socorros');
  });

  it('deve extrair nome com caracteres especiais', () => {
    const slug = 'Especialidade_de_Primeiros_Socorros_-_b%C3%A1sico/';
    const nome = service['extractNameFromSlug'](slug);

    expect(nome).toBe('Primeiros Socorros - básico');
  });

  it('deve capitalizar primeira letra do nome extraído', () => {
    const slug = 'Especialidade_de_astronomia/';
    const nome = service['extractNameFromSlug'](slug);

    expect(nome[0]).toBe(nome[0].toUpperCase());
  });
});
