# Task: Migração para projeto único na Vercel

Data: 2026-11-24

## 1. Resumo

O monorepo (NestJS em `apps/api` + Next.js em `apps/web`) virou **um único projeto Next.js na raiz do
repositório**, pronto para importar na Vercel sem configuração extra.

- A lógica de busca saiu do NestJS e foi para **Route Handlers** do Next.js (`app/api/leads`, `app/api/niches`),
  rodando como funções serverless (Node.js) na Vercel. A chave do Google continua só no servidor: o pacote
  `server-only` impede que o código do servidor entre no bundle do navegador.
- **Domínio, filtros, OSM/Google, validação e CSV foram reaproveitados sem mudança de regra**: o código já
  era independente de framework.
- **O CSV agora é gerado no navegador** a partir dos leads exibidos (`lib/lead-csv.ts`). Na Vercel, uma exportação
  feita no servidor poderia cair numa instância sem cache e estourar o limite de tempo refazendo até 10 cidades.
  A proteção contra CSV injection continua igual.
- **Cada busca cabe nos 60 s da função** (`maxDuration = 60`): Nominatim tem 10 s e o Overpass tem orçamento total de 45 s.
- **Disputa entre mirrors com reserva (hedging):** o mirror preferido começa a busca. Se não responder em 12 s, ou
  se falhar, o próximo entra em paralelo, e a primeira resposta vence enquanto as outras são canceladas.
  Com isso, Campinas, que antes falhava porque um mirror lento consumia o orçamento inteiro, passou a funcionar.

### NestJS → Next.js

| Antes (NestJS) | Agora |
|---|---|
| `LeadsController` | `app/api/leads/route.ts`, `app/api/niches/route.ts` |
| `ZodValidationPipe` | `server/http/parse-query.ts` (chaves repetidas viram array → rejeitadas pelo schema estrito) |
| `HttpExceptionFilter` | `server/http/error-response.ts` (400/404/502/500, sem stack trace) |
| `@nestjs/throttler` | `server/http/rate-limiter.ts` (30/min por IP, memória limitada a 10 mil chaves) |
| `helmet` | cabeçalhos de segurança em `next.config.mjs` |
| `LeadsModule` (DI) | `server/container.ts` (singletons em `globalThis`, reaproveitados enquanto a instância está "quente") |
| `GET /api/leads/export` | `downloadLeadsCsv()` no navegador |

Dependências removidas: `@nestjs/*`, `helmet`, `reflect-metadata`, `rxjs`, `@types/express` (107 pacotes a menos).
Adicionadas: `server-only` (guarda contra vazamento de código do servidor) e `tsx` (dev, roda o script de auditoria).

## 2. Como publicar na Vercel

1. Acesse **https://vercel.com** → *Sign Up / Log In* → **Continue with GitHub** (conta `advancedvisualwork`).
2. **Add New… → Project** → importe `advancedvisualwork/lead-finder`.
3. Framework: **Next.js** (detectado automaticamente). Root Directory: `./`. Não altere build/output.
4. *Environment Variables* (opcional):
   - `NOMINATIM_USER_AGENT` = `lead-finder/1.0 (seu-email-de-contato)`, recomendado pela política do Nominatim.
   - `GOOGLE_PLACES_API_KEY` = sua chave, se quiser usar o Google no lugar do OpenStreetMap.
5. **Deploy**. Cada `git push` na `main` publica uma nova versão automaticamente.

Rodar localmente: `npm install` → `npm run dev` → http://localhost:3000

## 3. Testes

| Verificação | Resultado |
|---|---|
| `npm run typecheck` | ✅ sem erros |
| `npm test` | ✅ **84/84** (novos: rota `/api/leads`, parse/erros/rate limit, hedging, orçamento de tempo) |
| `npm run build` | ✅ `/api/leads` dinâmica, `/api/niches` estática, página 121 kB |
| Vazamento de código do servidor no bundle do navegador | ✅ 0 ocorrências (chave, endpoints Google/OSM) |
| E2E produção (`next start`): academias em 4 cidades | ✅ Campinas 75, Santos 14, Florianópolis 51, Ribeirão Preto 13, entre **25 e 33 s** cada (limite de 60 s) |
| E2E: repetição em cache | ✅ 8–14 ms |
| E2E: filtro "sem site" | ✅ consistente nas 4 cidades |
| E2E: CSV combinado (gerado como no navegador) | ✅ 132 de 132 linhas, 7 colunas |
| E2E: validação | ✅ 400 para `<x>` e parâmetro extra |
| Auditoria de dados (`npm run audit:data`) | ✅ 3 cidades: DDD 22/22, 2/2, 13/13 · rua = mapa 5/5, 3/3, 5/5 · dentro da cidade 100% · 0 URLs inseguras. Na 1ª execução, logo após o E2E, Ribeirão e Florianópolis falharam por instabilidade do Overpass público; passaram ao repetir |

## 4. Riscos remanescentes

1. **Cache e limite de buscas valem por instância** na Vercel: são proteções de melhor esforço, não globais.
   Para um limite global, use Vercel KV ou Upstash Redis.
2. **Plano Hobby:** pelos termos da Vercel, ele é para uso pessoal e não comercial. Para uso comercial, use o plano Pro.
3. **Overpass público** continua sendo um serviço voluntário. Em caso de erro, basta repetir a busca da cidade.
4. Busca de 10 cidades leva ~5 min no total, uma requisição por vez, cada uma dentro do limite.
