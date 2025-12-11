import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, IsOptional, Min, Max, Matches, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class GenerateQuestionsIADto {
  @ApiProperty({
    description: 'Nome da especialidade para gerar questões',
    example: 'Primeiros Socorros',
  })
  @IsString({ message: 'Nome da especialidade deve ser uma string' })
  @MinLength(3, { message: 'Nome da especialidade deve ter pelo menos 3 caracteres' })
  @MaxLength(100, { message: 'Nome da especialidade deve ter no máximo 100 caracteres' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
    }
    return value;
  })
  especialidade: string;

  @ApiProperty({
    description: 'Número de questões a serem geradas',
    example: 10,
    minimum: 1,
    maximum: 20,
  })
  @IsInt({ message: 'Número de questões deve ser um inteiro' })
  @Min(1, { message: 'Deve gerar pelo menos 1 questão' })
  @Max(20, { message: 'Máximo de 20 questões por vez' })
  numeroQuestoes: number;

  @ApiProperty({
    description: 'URL de referência do MDA Wiki (apenas o slug)',
    example: 'Especialidade_de_Primeiros_Socorros_-_b%C3%A1sico/',
    required: false,
  })
  @IsOptional()
  @MinLength(5, { message: 'Slug do MDA Wiki deve ter pelo menos 5 caracteres' })
  @MaxLength(200, { message: 'Slug do MDA Wiki deve ter no máximo 200 caracteres' })
  @Matches(/^[a-zA-Z0-9_\-%\/]+\/$/, {
    message: 'Slug do MDA Wiki deve conter apenas caracteres alfanuméricos, _, -, %, / e terminar com /',
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.trim();
    }
    return value;
  })
  urlReferenciaMDA?: string;
}
