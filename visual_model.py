"""Transforma uma cópia da configuração visual em um modelo Word independente."""
import base64
from pathlib import Path
import gerador_modelo


def build_visual_model(config, directory):
    directory = Path(directory)
    front, back, style = config.get('front', {}), config.get('verso', {}), config.get('style', {})
    args = {key: front[key] for key in (
        'titulo', 'subtitulo', 'instituicao', 'texto_corpo', 'assinatura_1_nome',
        'assinatura_1_cargo', 'assinatura_2_nome', 'assinatura_2_cargo', 'codigo_verificacao') if key in front}
    args.update({key: back[key] for key in (
        'habilitar_verso', 'verso_titulo', 'verso_conteudo', 'verso_livro', 'verso_folha',
        'verso_registro', 'verso_amparo_legal', 'verso_assinatura_nome', 'verso_assinatura_cargo') if key in back})
    args.update({key: style[key] for key in ('tema', 'orientacao') if key in style})
    for key in ('logo_prestadora', 'logo_contratante'):
        value = front.get(key)
        if value:
            header, encoded = value.split(',', 1)
            extension = {'data:image/png;base64': 'png', 'data:image/jpeg;base64': 'jpg',
                         'data:image/webp;base64': 'webp'}.get(header)
            if not extension:
                raise ValueError('Use logotipos PNG, JPEG ou WebP para gerar o Word.')
            path = directory / f'{key}.{extension}'
            path.write_bytes(base64.b64decode(encoded, validate=True))
            args[key + '_path'] = str(path)
    path = directory / 'modelo.docx'
    gerador_modelo.criar_modelo_docx(caminho_saida=path, **args)
    return path
