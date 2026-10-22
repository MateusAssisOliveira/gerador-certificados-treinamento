<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Regras do Projeto (Next.js & TypeScript Fullstack)

- Antes de qualquer tarefa, leia `docs/ARCHITECTURE-NEXTJS.md`. Ele é a fonte da verdade da arquitetura.
- **Stack 100% TypeScript:** Next.js 16+ (App Router), React 19, TypeScript, Tailwind CSS, pdf-lib, xlsx, JSZip. Deploy na Vercel.
- **Sem Python:** O projeto é unificado e 100% TypeScript. Não utilize Python, Flask, FastAPI nem dependências legadas.
- **Sem Puppeteer/Chromium:** Toda geração e manipulação de PDFs deve ser feita de forma vetorial e limpa via `pdf-lib`.
- **Privacidade e LGPD:** Nunca exponha CPF desnecessariamente. Suporte sempre mascaramento de dados sensíveis (`***.456.789-**`).
- Sempre rode `npm run lint` e `npm run build` antes de concluir tarefas para garantir qualidade total.
