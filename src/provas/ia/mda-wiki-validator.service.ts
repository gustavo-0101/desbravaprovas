import { Injectable, Logger, BadRequestException } from '@nestjs/common';

@Injectable()
export class MdaWikiValidatorService {
  private readonly logger = new Logger(MdaWikiValidatorService.name);
  private readonly MDA_WIKI_BASE_URL = 'https://mda.wiki.br/';

  async validateUrl(slug: string): Promise<{ valid: boolean; fullUrl: string; title?: string }> {
    if (!/^[a-zA-Z0-9_\-%\/]+\/$/.test(slug)) {
      throw new BadRequestException('Formato de slug inválido');
    }

    const fullUrl = new URL(slug, this.MDA_WIKI_BASE_URL).href;

    if (!fullUrl.startsWith(this.MDA_WIKI_BASE_URL)) {
      throw new BadRequestException('URL deve ser do MDA Wiki');
    }

    const hostname = new URL(fullUrl).hostname;
    if (this.isInternalHost(hostname)) {
      throw new BadRequestException('Acesso a recursos internos não permitido');
    }

    this.logger.log(`Validating MDA Wiki URL: ${hostname}`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(fullUrl, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'DesbravadorProvas/0.1.0 (Educational Tool)',
        },
        signal: controller.signal,
        redirect: 'manual',
      });

      clearTimeout(timeout);

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (location && !location.startsWith(this.MDA_WIKI_BASE_URL)) {
          throw new BadRequestException('URL redireciona para fora do MDA Wiki');
        }
      }

      if (response.ok) {
        this.logger.log(`URL válida: ${hostname}`);
        return {
          valid: true,
          fullUrl,
        };
      } else if (response.status === 404) {
        this.logger.warn(`URL não encontrada: ${hostname}`);
        return {
          valid: false,
          fullUrl,
        };
      } else {
        this.logger.warn(`Resposta inesperada (${response.status}): ${hostname}`);
        return {
          valid: false,
          fullUrl,
        };
      }
    } catch (error) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        this.logger.error('Timeout ao validar URL do MDA Wiki');
        throw new BadRequestException('Timeout ao validar URL');
      }
      this.logger.error('Erro ao validar URL do MDA Wiki', error);
      return {
        valid: false,
        fullUrl,
      };
    }
  }

  private isInternalHost(hostname: string): boolean {
    const internalHosts = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '169.254.169.254', // AWS metadata endpoint
    ];

    return (
      internalHosts.some((h) => hostname.includes(h)) ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.16.') ||
      hostname.startsWith('172.17.') ||
      hostname.startsWith('172.18.') ||
      hostname.startsWith('172.19.') ||
      hostname.startsWith('172.20.') ||
      hostname.startsWith('172.21.') ||
      hostname.startsWith('172.22.') ||
      hostname.startsWith('172.23.') ||
      hostname.startsWith('172.24.') ||
      hostname.startsWith('172.25.') ||
      hostname.startsWith('172.26.') ||
      hostname.startsWith('172.27.') ||
      hostname.startsWith('172.28.') ||
      hostname.startsWith('172.29.') ||
      hostname.startsWith('172.30.') ||
      hostname.startsWith('172.31.')
    );
  }

  async extractEspecialidadeInfo(slug: string): Promise<{
    nome: string;
    descricao?: string;
  } | null> {
    const fullUrl = this.MDA_WIKI_BASE_URL + slug;

    this.logger.log(`Extraindo informações da especialidade: ${fullUrl}`);

    try {
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'DesbravadorProvas/0.1.0 (Educational Tool)',
        },
      });

      if (!response.ok) {
        this.logger.warn(`Falha ao buscar página (${response.status}): ${fullUrl}`);
        return null;
      }

      const html = await response.text();

      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      const nome = titleMatch
        ? titleMatch[1].replace(' - MDA Wiki', '').trim()
        : this.extractNameFromSlug(slug);

      const descriptionMatch = html.match(
        /<meta\s+name="description"\s+content="([^"]+)"/i,
      );
      const descricao = descriptionMatch ? descriptionMatch[1] : undefined;

      this.logger.log(`Informações extraídas: ${nome}`);

      return {
        nome,
        descricao,
      };
    } catch (error) {
      this.logger.error(`Erro ao extrair informações da especialidade: ${fullUrl}`, error);
      return null;
    }
  }

  private extractNameFromSlug(slug: string): string {
    const decoded = decodeURIComponent(slug);

    const cleaned = decoded
      .replace(/^Especialidade_de_/, '')
      .replace(/_/g, ' ')
      .replace(/\/$/, '')
      .trim();

    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  getFullUrl(slug: string): string {
    return this.MDA_WIKI_BASE_URL + slug;
  }
}
