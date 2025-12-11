import { Module } from '@nestjs/common';
import { ProvasService } from './provas.service';
import { ProvasController } from './provas.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AIModule } from '../ai/ai.module';
import { CommonModule } from '../common/common.module';
import { MdaWikiValidatorService } from './ia/mda-wiki-validator.service';
import { QuestionsGeneratorService } from './ia/questions-generator.service';

@Module({
  imports: [PrismaModule, AIModule, CommonModule],
  controllers: [ProvasController],
  providers: [ProvasService, MdaWikiValidatorService, QuestionsGeneratorService],
  exports: [ProvasService],
})
export class ProvasModule {}
