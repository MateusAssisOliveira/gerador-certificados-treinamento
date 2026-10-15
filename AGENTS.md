# Regras do projeto

- Antes de qualquer tarefa, leia `docs/ARCHITECTURE-FASTAPI.md`. Ele é a fonte da verdade da arquitetura.
- Stack: FastAPI + Pydantic v2 + SQLAlchemy 2 + Alembic (Python 3.11+), React no front, deploy na Vercel.
- Trabalhe uma fase por vez e pare para revisão ao final de cada uma.
- Nunca coloque CPF ou dados pessoais em logs, filas, URLs, erros ou testes. Use dados sintéticos.
- Não use pandas, Chromium, Playwright nem Puppeteer.
- Onde o documento marcar [VERIFICAR DOCS], consulte a documentação oficial atual. Não invente APIs.
- Rode `ruff`, `mypy` e `pytest` antes de dar uma fase como concluída.
- Decisões relevantes vão em `docs/decisions/` como ADR curto.
