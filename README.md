# CertificaFlow • Gerador e Estúdio Visual de Certificados em Lote

Automação em Python com **interface web interativa** e **modo terminal (CLI)** para criação de modelos, personalização de textos, definição de variáveis dinâmicas e geração de certificados individuais em lote (`.docx` e `.pdf`), preservando 100% da formatação original (fontes, molduras, assinaturas, bordas e imagens).

---

## Organização da interface

A interface tem três etapas: **Certificado**, **Participantes** e **Gerar e baixar**.
Na primeira, escolha um modelo e edite o conteúdo. Aparência, logotipos, verso
e arquivos Word ficam em seções recolhidas. A prévia acompanha a edição.

Os templates são renderizados pelo FastAPI com Jinja2:

- `templates/base.html`: estrutura da página, estilos e scripts.
- `templates/index.html`: composição da tela.
- `templates/components/`: cabeçalho, etapas, editor, participantes, geração,
  prévia, folhas do certificado e modal. As opções do editor têm arquivos próprios.
- `static/js/workspace.js`: navegação entre as três etapas e ajuste da prévia.
- `static/js/app.js`: edição, participantes, persistência e comunicação com a API.

Os blocos `{% raw %}` preservam as variáveis literais do certificado, como
`{{NOME}}` e `{{CPF}}`. Mantenha esses blocos ao editar textos com variáveis
e preserve os IDs usados pelo JavaScript. Acesse a interface pelo servidor;
abrir o HTML diretamente não processa os componentes.

## 🌟 Novidades da Versão 2.0 (Estúdio Visual)

Agora você tem duas formas de usar o sistema:

1. **Estúdio Web Interativo (Recomendado):** Uma interface visual completa no navegador para editar textos, clicar em botões para inserir variáveis (`{{NOME}}`, `{{CPF}}`, etc.), ver o certificado pronto ao vivo na tela, gerenciar a lista de participantes e gerar tudo com 1 clique.
2. **Linha de Comando (CLI Clássico):** Execução direta via terminal para fluxos automatizados em segundo plano.

---

## 🚀 Como Iniciar

### 1. Iniciar a Interface Web (1 Duplo-Clique)

Dê um duplo clique no arquivo:
```
iniciar_app.bat
```
*(Ou abra o terminal e digite: `python app.py`)*

O sistema abrirá automaticamente no seu navegador em:
👉 **`http://127.0.0.1:8000`**

### 2. Executar via Terminal (CLI)
Se preferir usar o terminal como antes:
```bash
python gerar_certificados.py
```

---

## 🎨 Recursos do Estúdio Web

### ✍️ 1. Editor de Texto com Inserção de Variáveis em 1 Clique
- Digite livremente o título, subtítulo, nome da instituição e corpo do certificado.
- **Botões rápidos de tags**: clique em `+ {{NOME}}`, `+ {{CPF}}`, `+ {{CURSO}}`, `+ {{DATA}}`, `+ {{CARGA_HORARIA}}` para inserir a variável exatamente na posição do cursor.
- **Botão "+ Nova Tag..."**: crie qualquer variável personalizada que quiser (ex.: `{{INSTRUTOR}}`, `{{CIDADE}}`, `{{NOTA}}`). Qualquer palavra dentro de `{{...}}` vira automaticamente uma coluna na planilha!

### 👁️ 2. Pré-visualização ao Vivo (Live Preview)
- O certificado é desenhado em tempo real ao lado enquanto você digita.
- **Modo Tags vs Modo Preenchido**: alterne entre ver as marcações `{{TAGS}}` ou ver o certificado preenchido com dados reais simulados de um participante.
- Suporta impressão ou salvamento em PDF direto pelo navegador (`Ctrl+P` ou botão *Imprimir*).

### 🎨 3. Temas & Estilos Visuais
- **Ouro Real & Azul Marinho**: Elegante corporativo com molduras douradas.
- **Verde Esmeralda Nobre**: Acadêmico e institucional.
- **Clássico Minimalista**: Preto, branco e cinza moderno.
- **Rubi Imperial & Dourado**: Solene e caloroso.
- Alternância entre orientação **Paisagem (Landscape)** e **Retrato (Portrait)**.
- Botão para **salvar o texto e estilo como arquivo `.docx` oficial** na pasta `modelo/`.
- Suporte a upload do seu próprio `.docx` criado no Word.

### 👥 4. Gestão de Participantes
- **Tabela Direta na Tela**: Adicione, edite ou remova participantes diretamente no navegador sem precisar abrir o Excel.
- **Botão "⚡ Preencher 3 Exemplos"**: Preenche participantes de teste instantaneamente para você testar a geração em 1 segundo.
- **Importar Planilha Excel (`.xlsx`, `.csv`)**: Arraste e solte sua planilha; o sistema lê as colunas e dados automaticamente.
- **Botão "📥 Baixar Excel Modelo"**: Gera e baixa uma planilha Excel já com as colunas certinhas das variáveis usadas no seu texto.

### ⚡ 5. Geração em Lote e Download
- Gera todos os certificados em `.docx` e converte automaticamente para `.pdf` usando o Microsoft Word do Windows.
- Console de log e barra de progresso em tempo real.
- Botão para **Baixar Todos em .ZIP** e **Abrir Pasta de Saída** no Windows Explorer.

---

## 📁 Estrutura de Pastas

```
certificados/
├── app.py                      <- Servidor web local (FastAPI)
├── gerador_modelo.py           <- Criação programática de modelos Word e planilhas
├── gerar_certificados.py       <- Motor de geração em lote (Web & CLI)
├── iniciar_app.bat             <- Atalho de 1 clique para iniciar no Windows
├── requirements.txt            <- Dependências do projeto
├── README.md                   <- Documentação completa
├── templates/
│   └── index.html              <- Interface do Estúdio Web
├── static/
│   ├── css/style.css           <- Design visual do estúdio e folha de certificado
│   └── js/app.js               <- Lógica reativa da aplicação
├── modelo/                     <- Onde ficam os modelos Word (.docx)
│   └── certificado_base.docx   <- Modelo inicial pré-configurado
├── entrada/                    <- Onde ficam as planilhas de participantes (.xlsx)
│   └── participantes_exemplo.xlsx <- Planilha de teste pré-configurada
└── saida/                      <- Onde os certificados gerados são salvos (.docx e .pdf)
```

---

## 📦 Dependências

As bibliotecas necessárias já foram instaladas no seu ambiente Python:
- `docxtpl` — Preenchimento inteligente do documento Word mantendo formatação
- `python-docx` — Criação e manipulação de arquivos Word
- `openpyxl` — Leitura e geração de planilhas Excel
- `docx2pdf` — Conversão em lote para PDF usando o Microsoft Word
- `fastapi` e `uvicorn` — Servidor web local
