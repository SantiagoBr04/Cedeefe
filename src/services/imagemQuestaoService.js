import { cloudinary } from '../config/cloudinary.js';

class ImagemQuestaoService {
  /**
   * Remove uma lista de URLs de imagens do Cloudinary.
   */
  async descartarImagens(urls) {
    if (!urls || urls.length === 0) return;

    for (const url of urls) {
      try {
        const publicId = this.extrairPublicId(url);
        if (publicId) {
          await cloudinary.uploader.destroy(publicId);
          console.log(`[ImagemQuestaoService] Imagem descartada: ${publicId}`);
        }
      } catch (err) {
        console.error(`[ImagemQuestaoService] Erro ao descartar ${url}:`, err);
      }
    }
  }

  /**
   * Alias semântico para descartarImagens
   */
  async excluirImagensPorUrls(urls) {
    return this.descartarImagens(urls);
  }

  /**
   * Busca todas as URLs de imagens do Cloudinary presentes nos textos HTML passados.
   */
  buscarImagensNoHtml(...htmlTextos) {
    if (!htmlTextos || htmlTextos.length === 0) return [];

    const urls = new Set();
    const regex = /<img[^>]+src=["']([^"'>]+)["']/gi;
    
    for (const html of htmlTextos) {
      if (!html) continue;
      let match;
      while ((match = regex.exec(html)) !== null) {
        const url = match[1];
        if (url && url.includes('cloudinary.com')) {
          urls.add(url);
        }
      }
    }

    return Array.from(urls);
  }

  /**
   * Limpa imagens pendentes no Cloudinary que foram marcadas com a tag 'questao_pendente'
   * e que foram criadas há mais de 2 horas.
   */
  async limparPendentesAntigas() {
    try {
      console.log('[ImagemQuestaoService] Buscando imagens pendentes...');
      // A API do Cloudinary Search pode demorar alguns minutos para indexar novas tags
      const result = await cloudinary.search
        .expression('tags:questao_pendente')
        .sort_by('created_at', 'asc')
        .max_results(500) // limite razoável
        .execute();

      const resources = result.resources || [];
      const duasHorasAtras = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const publicIdsParaExcluir = [];

      for (const res of resources) {
        const createdAt = new Date(res.created_at);
        if (createdAt < duasHorasAtras) {
          publicIdsParaExcluir.push(res.public_id);
        }
      }

      if (publicIdsParaExcluir.length > 0) {
        console.log(`[ImagemQuestaoService] Encontradas ${publicIdsParaExcluir.length} imagens pendentes antigas. Iniciando exclusão...`);
        // O método delete_resources aceita até 100 public_ids por vez
        for (let i = 0; i < publicIdsParaExcluir.length; i += 100) {
          const lote = publicIdsParaExcluir.slice(i, i + 100);
          await cloudinary.api.delete_resources(lote);
        }
        console.log('[ImagemQuestaoService] Limpeza concluída.');
      } else {
        console.log('[ImagemQuestaoService] Nenhuma imagem pendente antiga encontrada.');
      }
    } catch (err) {
      console.error('[ImagemQuestaoService] Erro ao limpar pendentes antigas:', err);
      throw err;
    }
  }

  /**
   * Remove a tag 'questao_pendente' e adiciona 'questao_salva' nas imagens que 
   * efetivamente foram salvas junto com a questão.
   */
  async consolidarImagensSalvas(htmlTextos) {
    if (!htmlTextos || htmlTextos.length === 0) return;

    const urls = new Set();
    const regex = /<img[^>]+src="([^">]+)"/gi;
    
    for (const html of htmlTextos) {
      if (!html) continue;
      let match;
      while ((match = regex.exec(html)) !== null) {
        const url = match[1];
        if (url && url.includes('cloudinary.com')) {
          urls.add(url);
        }
      }
    }

    const publicIds = Array.from(urls).map(url => this.extrairPublicId(url)).filter(Boolean);

    if (publicIds.length > 0) {
      try {
        await cloudinary.uploader.remove_tag('questao_pendente', publicIds);
        await cloudinary.uploader.add_tag('questao_salva', publicIds);
      } catch (err) {
        console.error('[ImagemQuestaoService] Erro ao consolidar tags:', err);
      }
    }
  }

  extrairPublicId(url) {
    if (!url || !url.includes('cloudinary.com')) return null;
    const parts = url.split('/');
    const versionIndex = parts.findIndex(p => p.startsWith('v') && !isNaN(p.slice(1)));
    if (versionIndex === -1) {
      const splitAtUpload = url.split('/upload/');
      if (splitAtUpload.length > 1) {
        return splitAtUpload[1].replace(/\.[^/.]+$/, "");
      }
      return null;
    }
    const publicIdWithExt = parts.slice(versionIndex + 1).join('/');
    return publicIdWithExt.replace(/\.[^/.]+$/, "");
  }
}

export default new ImagemQuestaoService();
