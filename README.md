# 🎓 CertificaFlow — SaaS de Certificados de Treinamentos & NRs

> Plataforma moderna para **design visual**, **personalização** e **emissão em lote** de certificados de treinamentos regulamentares (NR-1, NR-20, NR-35, CIPA, SST) e corporativos.
> **100% Next.js 16 + React 19 + TypeScript + Tailwind CSS** — Pronto para deploy na Vercel com 1 clique.

---

## ✨ Funcionalidades Principais

1. **🎨 Estúdio Visual de Design (`/editor`)**:
   - Canvas com proporções exatas de papel A4 (Paisagem ou Retrato).
   - Inserção de textos, logos, assinaturas, molduras clássicas e QR Codes.
   - Variáveis dinâmicas inteligentes (ex: `{{nome_colaborador}}`, `{{cpf}}`, `{{carga_horaria}}`, `{{data_realizacao}}`).
   - Pré-visualização realista instantânea e download de PDF de teste.

2. **⚡ Emissão em Lote Ultrarrápida (`/lotes`)**:
   - Upload de planilhas Excel (`.xlsx`) ou CSV com auto-detecção de colunas (*De-Para inteligente*).
   - Mascaramento de dados e proteção LGPD para CPF (`***.456.789-**`).
   - Geração de PDFs em alta performance com barra de progresso em tempo real.
   - Download individual ou empacotamento completo em arquivo ZIP via streaming.

3. **🔍 Validação Pública de Autenticidade (`/verificar`)**:
   - Cada certificado recebe um código exclusivo de segurança.
   - Tela pública de validação que comprova a veracidade do treinamento sem expor dados sensíveis.

4. **📚 Biblioteca de Modelos (`/`)**:
   - Modelos prontos e homologados para normas regulamentadoras brasileiras (NRs).
   - Duplicação, arquivamento e exportação/importação em formato JSON.

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- Node.js 18+ (ou 20+)
- npm, yarn ou pnpm

### Instalação & Inicialização

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar servidor de desenvolvimento
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) no seu navegador.

---

## 🛠️ Scripts Disponíveis

- `npm run dev`: Inicia o servidor de desenvolvimento com Turbopack.
- `npm run build`: Compila e gera o build de produção otimizado.
- `npm run start`: Inicia o servidor em modo de produção.
- `npm run lint`: Executa a verificação estática de código com ESLint.

---

## ☁️ Deploy na Vercel

O projeto foi estruturado para ser implantado na **Vercel** de forma direta, sem necessidade de servidores dedicados ou containers Docker:

1. Conecte o repositório GitHub à [Vercel](https://vercel.com).
2. O framework preset será detectado automaticamente como **Next.js**.
3. Clique em **Deploy**.

---

## 📄 Licença

Distribuído sob licença proprietária/MIT corporativa.
