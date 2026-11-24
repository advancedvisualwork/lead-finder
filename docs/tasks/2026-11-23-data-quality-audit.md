# Task: Auditoria de qualidade dos dados (endereço e telefone)

Data: 2026-11-23

## 1. Resumo

Testes por amostragem para medir a eficácia do Lead Finder:

- os **telefones** são válidos e pertencem à cidade (DDD)?
- os **endereços** correspondem à localização real do estabelecimento?
- os resultados são **só da cidade** buscada?

Três métodos:

1. **Automático (script `scripts/audit-lead-quality.mjs`):** para cada busca real, valida o formato e o DDD
   dos telefones. Para uma amostra de leads, faz geocodificação reversa das coordenadas do
   estabelecimento (Nominatim `/reverse`, com 1 req/s conforme a política de uso) e compara a rua
   devolvida com a rua cadastrada.
2. **Externo (busca na web):** confronta 6 leads com diretórios públicos (Wellhub, Telelistas, Doctoralia).
3. **Revisão manual** dos resultados exportados.

Execução: `npm run build -w apps/api && node scripts/audit-lead-quality.mjs [amostras] [saida.json]`

## 2. Resultados

### 2.1 Antes das correções

| Busca | Leads | Com telefone | Formato válido | DDD correto | Rua = mapa |
|---|---|---|---|---|---|
| Dentista em Campinas, SP | 73 | 44 (60%) | — | **falhou**: havia DDD 11 (Itatiba) | — |
| Padaria em Ribeirão Preto, SP | 20 | 2 (10%) | 2/2 | 2/2 | 3/3 |
| Academia em Florianópolis, SC | 52 | 13 (25%) | 13/13 | 13/13 | 8/8 |

**Problema 1 — leads de cidades vizinhas.** Na busca por Campinas apareceram estabelecimentos de
Itatiba (DDD 11) e Valinhos (CEP 13270-xxx). A causa era a consulta por bounding box: o retângulo
cobre parte dos municípios vizinhos, e o filtro por `addr:city` não pegava cadastros sem cidade preenchida.

**Problema 2 — DDD fantasma.** O cadastro `+55 19 324-2966`, com um dígito a menos, era exibido como `(55) 19324-2966`:
o código do país virava DDD.

### 2.2 Correções aplicadas

1. **Filtro por polígono do município:** o Nominatim agora devolve o contorno oficial da cidade
   (`polygon_geojson`, simplificado para ~50 m) e cada estabelecimento é testado por *point-in-polygon*
   (ray casting, com suporte a MultiPolygon e buracos). O fallback por `addr:city` continua valendo quando não há polígono.
   Arquivo: `apps/api/src/leads/infrastructure/osm/city-boundary.ts`.
2. **Telefone com `+55` explícito:** o código do país nunca é reinterpretado como DDD. Números malformados
   são mantidos como vieram da fonte.

### 2.3 Depois das correções

| Busca | Leads | Com telefone | Formato válido | DDD correto | Rua = mapa | Dentro da cidade |
|---|---|---|---|---|---|---|
| Dentista em Campinas, SP | **43** (−30 vizinhos) | 23 (53%) | 22/23 (96%) | **22/22 (100%)** | **10/10** | **10/10** |
| Padaria em Ribeirão Preto, SP | 18 (−2) | 2 (11%) | 2/2 | 2/2 | 3/3 | 3/3 |
| Academia em Florianópolis, SC | 52 (antes) | 13 (25%) | 13/13 | 13/13 | 8/8 | 8/8 |

Florianópolis não foi reexecutado depois da correção porque o Overpass público estava indisponível naquele momento.
O único telefone "inválido" restante (`+55 19 324-2966`) é um erro do próprio cadastro no OSM (falta um dígito).

### 2.4 Verificação externa (web)

| Lead | Cadastro (OSM) | Fonte externa | Endereço | Telefone |
|---|---|---|---|---|
| Workout Gym (Florianópolis) | R. Itapiranga, 295 – Itacorubi | Wellhub | ✅ confere | não publicado |
| Energym (Florianópolis) | R. Marechal Guilherme, 87 | Wellhub + Telelistas | ✅ confere | não publicado |
| Academia Flex (Florianópolis) | R. Waldemar Ouriques, **632** | Wellhub: nº **535** | ⚠️ número diverge | não publicado |
| Clínica Lagôa (Campinas) | R. Frei Manuel da Ressurreição, 916 | não encontrado | ❔ inconclusivo | ❔ |
| Arbora Saúde Integrada (Campinas) | R. Dr. Miguel Penteado, 295 | não encontrado | ❔ inconclusivo | ❔ |
| Dra. Mônica Cantadori (Campinas) | R. Dr. Miguel Penteado, 980 | não encontrado | ❔ inconclusivo | ❔ |

Fontes consultadas: wellhub.com, telelistas.net, doctoralia.com.br e guiatelefone.com.

## 3. Conclusões

- **Consistência interna: alta.** 21/21 ruas amostradas batem com a posição no mapa, e 100% dos telefones
  válidos têm o DDD da cidade depois da correção.
- **Precisão da cidade: corrigida.** O filtro por polígono eliminou 41% dos resultados de Campinas, que eram de
  cidades vizinhas.
- **Cobertura de telefone: baixa a média** (11% a 53%, conforme o nicho e a cidade). É uma limitação do OpenStreetMap.
- **Atualidade: não garantida.** O OSM é colaborativo; 1 de 3 endereços verificados externamente diverge
  (provável mudança de endereço). Telefones não puderam ser confirmados por busca web, porque os diretórios
  não os exibem publicamente.
- **Recomendação:** para uso comercial, ativar o provider **Google Places** (`GOOGLE_PLACES_API_KEY`), que tem
  dados mais completos e atualizados, e validar telefones antes de campanhas (ligação ou WhatsApp).

## 4. Testes

- `npm run typecheck`: ✅
- `npm test`: API ✅ 39/39 (novos: polígono, multipolígono com buraco, geometria malformada, `+55` malformado) · Web ✅ 3/3
- `npm run build -w apps/api`: ✅

## 5. Riscos remanescentes

- Amostra pequena (3 cidades, 21 geochecks, 6 verificações externas): os resultados indicam tendência, não são
  estatisticamente conclusivos.
- A geocodificação reversa usa a mesma base (OSM): ela detecta inconsistência interna, não desatualização.
- O polígono simplificado (~50 m) pode excluir estabelecimentos exatamente na divisa entre municípios.
