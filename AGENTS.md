<!-- bmad:context -->
<!-- Verified 2026-09-04 against 1cc550d. Managed by bmad-project-context; edits inside this block are replaced on refresh. Keep anything you want preserved outside the markers. -->

## finance-time

App de finanças pessoais em React 18 + Vite + Tailwind, estado em Zustand com `persist`, funções serverless da Vercel em `api/` e Postgres no Neon. IA via Gemini. Interface em pt-BR, valores em BRL. Artefatos de planejamento do BMAD ficam em `_bmad-output/`.

## Where things are

- Campo novo no store que precisa sobreviver a um deploy: adicione também em `SYNC_KEYS` (`src/hooks/useNeonSync.js`) — o que não está lá vive só no localStorage.
- Rotas serverless: um arquivo por rota em `api/`; as de IA passam por `api/ai/_gemini.js`.
- Tokens de cor e espaçamento: `tailwind.config.js`.

## Running and verifying

- Rode `npm run build` antes de cada commit — não há testes, lint nem CI; é a única verificação automática do projeto.
- `npm run dev` não serve `/api/*` — o Vite não executa funções da Vercel, elas dão 404. Use `vercel dev` com `DATABASE_URL`, `GEMINI_API_KEY`, `PLUGGY_CLIENT_ID`, `PLUGGY_CLIENT_SECRET` e `APP_PASSWORD` no ambiente.
- O app abre numa tela de senha. Para rodar local sem senha, grave `ft_token` no localStorage; sem isso nenhuma página renderiza.

## Conventions that differ from defaults

- Um seletor Zustand por campo: `const x = useStore((s) => s.x)`. Nunca um seletor que devolve objeto — ver pitfalls.
- Use os tokens (`bg-bg`, `text-fg`, `text-success`) em vez de hex cru. Hex só para séries de gráfico e cores escolhidas pelo usuário.

## Known pitfalls

- `npm run build` passa mesmo com identificador não importado usado em JSX — o erro só aparece em runtime, como tela branca. Depois de adicionar ícone ou componente, renderize a página de fato antes de commitar.
- `useStore((s) => ({ a: s.a }))` devolve objeto novo a cada render e trava em "Maximum update depth exceeded". Use um seletor por campo.

<!-- /bmad:context -->
