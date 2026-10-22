# Regras do Projeto (Next.js & TypeScript Fullstack)

- Antes de qualquer tarefa, leia `docs/ARCHITECTURE-NEXTJS.md`. Ele é a fonte da verdade da arquitetura.
- **Stack 100% TypeScript:** Next.js 16+ (App Router), React 19, TypeScript, Tailwind CSS, pdf-lib, xlsx, JSZip. Deploy na Vercel.
- **Sem Python:** O projeto é unificado e 100% TypeScript. Não utilize Python, Flask, FastAPI nem dependências legadas.
- **Sem Puppeteer/Chromium:** Toda geração e manipulação de PDFs deve ser feita de forma vetorial e limpa via `pdf-lib`.
- **Privacidade e LGPD:** Nunca exponha CPF desnecessariamente. Suporte sempre mascaramento de dados sensíveis (`***.456.789-**`).
- Sempre rode `npm run lint` e `npm run build` antes de concluir tarefas para garantir qualidade total.
