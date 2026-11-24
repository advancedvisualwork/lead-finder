# Task: Várias cidades, filtro "sem site" (Instagram) e leads por cidade

Data: 2026-11-24

## 1. Resumo

- **Várias cidades por busca:** uma por linha (ou separadas por `;`), até 10, sem duplicatas. O frontend busca
  uma cidade por vez, mostra o progresso, permite cancelar e continua quando uma cidade falha.
- **Filtro "Somente sem site"** com a opção **"Considerar Instagram como sem site"** (ligada por padrão).
  Perfis de Instagram, Facebook, Linktree, WhatsApp, TikTok, X, LinkedIn e YouTube nunca contam como site.
- **Leads por cidade:** tabela de resumo (encontrados, na lista, com telefone, sem site, com Instagram, com
  total geral) e campo **"Máx. de leads por cidade"** (1–200).
- **CSV combinado de várias cidades** com as novas colunas: `Nome;Telefone;Endereço;Nicho;Cidade;Instagram;Site`.

## 2. Arquivos

| Arquivo | Mudança |
|---|---|
| `api/src/leads/domain/web-presence.ts` | **Novo.** Classifica site × Instagram e só aceita URLs http(s) (bloqueia `javascript:`) |
| `api/src/leads/application/lead-filters.ts` | **Novo.** Filtros (telefone, sem site, limite) e contagens em uma passada O(n) |
| `api/src/leads/domain/lead.ts` | Campos `city`, `website`, `instagram`; `counts` no resultado |
| `api/src/leads/presentation/search-leads.query.ts` | Novos parâmetros validados; `exportLeadsQuerySchema` com `city` repetido (máx. 10) |
| `api/src/leads/application/search-leads.service.ts` | Filtros, contagens e `executeForCities` (sequencial, com cache) |
| `api/src/leads/infrastructure/osm/osm-lead.mapper.ts` | Lê `website`, `contact:website`, `url`, `contact:instagram` (multivalor com `;`) |
| `api/src/leads/infrastructure/google/google-places.provider.ts` | Lê `websiteUri` |
| `api/src/leads/application/lead-csv.serializer.ts` | Colunas Cidade/Instagram/Site; nome de arquivo `leads-N-cidades-…` |
| `web/hooks/useMultiCitySearch.ts` | **Novo** (substitui `useLeadSearch.ts`). Busca sequencial com status por cidade e cancelamento |
| `web/components/CitySummary.tsx` | **Novo.** Tabela de leads por cidade |
| `web/components/SearchForm.tsx`, `ResultsPanel.tsx`, `LeadsTable.tsx` | Novo formulário, resumo, links seguros de Site/Instagram |
| `scripts/audit-lead-quality.mjs` | Métricas de site, Instagram e URLs inseguras |

## 3. Testes

| Verificação | Resultado |
|---|---|
| `npm run typecheck` (api + web) | ✅ |
| `npm test` (API) | ✅ 62/62 (novos: presença web, filtros, limite, várias cidades, schema de exportação) |
| `npm test` (Web) | ✅ 5/5 (lista de cidades, linha inválida, limite de 10, URL com `city` repetido) |
| `npm run build` | ✅ |
| E2E: academias em Campinas + Santos + Florianópolis | ✅ Campinas 75 e Santos 14 leads. Florianópolis teve erro 502 (Overpass público), tratado e as outras cidades continuaram |
| E2E: consistência dos filtros | ✅ `sem site` = total − com site; com Instagram desligado = sem site − só Instagram; limite 5 = 5 |
| E2E: CSV combinado | ✅ 77 linhas = 64 + 13 (soma esperada), 0 linhas com site no filtro "sem site", 7 colunas |
| E2E: 11 cidades | ✅ 400 "Máximo de 10 cidades por exportação." |
| Auditoria (Campinas, dentistas) | ✅ DDD 22/22, rua = mapa 8/8, dentro da cidade 8/8, 0 URLs inseguras, `+55` malformado mantido sem DDD falso |
| Auditoria (Ribeirão Preto, Florianópolis) | ⚠️ não executada: Overpass público indisponível no momento |

## 4. Riscos remanescentes

1. **Instagram no OSM é raro:** 0 de 43 dentistas e 2 de 75 academias em Campinas tinham Instagram. Logo, "sem site"
   inclui muitos negócios cujo Instagram existe mas não está cadastrado no OSM.
2. **Tempo:** cada cidade leva de 30 a 60 s na primeira busca (OSM público), então 10 cidades levam ~5–10 min.
3. **Overpass público instável:** algumas cidades podem falhar. Basta repetir a busca, e as que já deram certo vêm do cache.
4. O Google Places não informa Instagram, só o site.
