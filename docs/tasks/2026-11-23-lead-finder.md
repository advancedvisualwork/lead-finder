# Task: Lead Finder — busca de leads por cidade e nicho com exportação CSV

Data: 2026-11-23

## 1. Resumo

Site para buscar empresas (leads) por **cidade** e **nicho** e exportar CSV com as colunas
**Nome, Telefone, Endereço, Nicho**. Monorepo npm workspaces, seguindo a stack de
`docs/specs/architecture.md` (NestJS + Next.js, TypeScript strict, Zod nas fronteiras).

- **Fonte de dados padrão:** OpenStreetMap (Nominatim para geocodificar a cidade + Overpass para os
  estabelecimentos). Gratuita e sem chave.
- **Fonte opcional:** Google Places API (New). É usada automaticamente quando `GOOGLE_PLACES_API_KEY`
  está definida em `apps/api/.env`. Tem mais telefones e endereços, mas é paga.
- A troca de fonte é feita pela interface `LeadProvider` (DIP/OCP): para incluir outra fonte, basta
  implementar a interface sem mexer no service nem no controller.

### Como executar

```bash
cd lead-finder
npm install
npm run dev:api     # terminal 1 → http://localhost:3001/api
npm run dev:web     # terminal 2 → http://localhost:3000
```

Variáveis: copie `apps/api/.env.example` → `apps/api/.env` e `apps/web/.env.example` → `apps/web/.env.local`.

### Endpoints da API

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/niches` | Lista os nichos disponíveis (`id`, `label`) |
| GET | `/api/leads?city=&niche=&onlyWithPhone=` | Busca leads (JSON) |
| GET | `/api/leads/export?city=&niche=&onlyWithPhone=` | Download do CSV |

## 2. Arquivos

### API (`apps/api/src`)
| Arquivo | Responsabilidade |
|---|---|
| `main.ts`, `app.module.ts` | Bootstrap, Helmet, CORS restrito a `WEB_ORIGIN`, rate limit (30 req/min/IP) |
| `config/app.config.ts` | Configuração por env, com defaults seguros |
| `common/domain-errors.ts`, `common/http-exception.filter.ts` | Erros de domínio → HTTP 404/502/500, sem stack trace e com log JSON |
| `common/zod-validation.pipe.ts` | Validação estrita das query strings |
| `leads/domain/*` | `Lead`, catálogo fechado de nichos (whitelist), contrato `LeadProvider`, normalização de telefone BR |
| `leads/application/search-leads.service.ts` | Caso de uso: cache, coalescência de buscas concorrentes, filtro "só com telefone" |
| `leads/application/ttl-cache.ts` | Cache LRU + TTL com tamanho limitado (O(1)) |
| `leads/application/dedupe-leads.ts` | Deduplicação O(n) com Set + ordenação |
| `leads/application/lead-csv.serializer.ts` | CSV `;` + BOM (Excel pt-BR) e neutralização de CSV injection |
| `leads/infrastructure/osm/*` | Clientes Nominatim e Overpass (failover entre mirrors), mapper, provider |
| `leads/infrastructure/google/google-places.provider.ts` | Provider Google Places (até 60 resultados) |
| `leads/presentation/*` | Controller e schema Zod da query |

### Web (`apps/web`)
| Arquivo | Responsabilidade |
|---|---|
| `app/page.tsx`, `app/layout.tsx`, `app/globals.css` | Página, tokens de design, dark mode, layout responsivo |
| `components/SearchForm.tsx` | Formulário com validação imediata e ARIA |
| `components/ResultsPanel.tsx` | Estados idle, loading (skeleton), erro, vazio e sucesso, mais o botão Exportar CSV |
| `components/LeadsTable.tsx` | Tabela semântica paginada (25 por página) |
| `hooks/useLeadSearch.ts`, `hooks/useNiches.ts` | Estado assíncrono com AbortController |
| `lib/api.ts`, `lib/search-form.schema.ts`, `lib/types.ts` | Cliente HTTP (URLSearchParams) e schema do formulário |

## 3. Testes e verificação

| Verificação | Resultado |
|---|---|
| `npm run typecheck` (api + web) | ✅ sem erros |
| `npm test` — API (Vitest) | ✅ 34/34 |
| `npm test` — Web (Vitest) | ✅ 3/3 |
| `npm run build` (tsc + next build) | ✅ |
| E2E manual: `GET /api/leads?city=Campinas, SP&niche=dentista` | ✅ 73 leads (44 com telefone), ~39s na 1ª busca |
| E2E manual: export CSV (cache) | ✅ 73 ms, `Content-Disposition` seguro, 44 linhas + cabeçalho |
| Validação: payload `<script>`, nicho inválido, campo extra | ✅ 400 com mensagens por campo |
| CORS / headers de segurança (Helmet, X-Frame-Options, nosniff) | ✅ |

Cobertura dos testes: serialização e escape de CSV, injeção de fórmula, nome de arquivo, normalização de
telefone (incluindo 0800), mapper OSM, construção da query Overpass com bloqueio de injeção, bbox,
filtro de cidade vizinha, failover e mirror preferido, cache TTL/LRU, deduplicação, coalescência,
falhas que não vão para o cache e schema de entrada.

## 4. Riscos técnicos remanescentes

1. **Instabilidade do Overpass público:** durante o desenvolvimento, `overpass-api.de` falhou no TLS a partir
   desta rede e os mirrors oscilaram entre 504 e timeout. Mitigações já aplicadas: failover entre 3 mirrors,
   mirror preferido, consulta por bounding box (mais leve que `area()`) e cache de 15 min. Para produção,
   recomenda-se usar Google Places ou uma instância própria do Overpass (`OVERPASS_URLS`).
2. **Cobertura de dados do OSM:** muitos estabelecimentos não têm telefone nem endereço completo. Use o
   filtro "Somente com telefone".
3. **Bounding box:** leads de cidades vizinhas sem `addr:city` podem aparecer (ex.: Itatiba em uma busca por Campinas).
4. **LGPD:** os dados são públicos e de pessoas jurídicas, mas o uso para prospecção deve respeitar a LGPD
   (legítimo interesse, opt-out). Há um aviso no rodapé.
5. **Licença ODbL:** a atribuição "© colaboradores OpenStreetMap" deve acompanhar os dados redistribuídos.
6. **Sem ESLint configurado:** a verificação estática se limita a TypeScript strict (`noUnusedLocals` e afins).
   Adicionar ESLint é a próxima etapa recomendada.
7. **Cache e rate limit em memória:** não são compartilhados entre instâncias. Para escalar horizontalmente,
   usar Redis.
8. **Sem persistência:** não há banco (PostgreSQL) porque persistência não fez parte do escopo. Ficaria para
   uma fase 2 (histórico de buscas, listas salvas).

## 5. Eficiência (Big-O)

- Dedupe O(n) via `Set`; ordenação O(n log n); lookup de nicho O(1) via `Map`.
- Cache: get/set O(1), limitado a 200 entradas (sem vazamento de memória).
- Resultados limitados a 200 por busca (OSM) e 60 (Google), sem conjuntos ilimitados em memória.
- Frontend: tabela paginada, com no máximo 25 linhas no DOM.
- Grafo de conhecimento: `graphify-out/graph.json` não existe neste projeto, então não se aplica.
