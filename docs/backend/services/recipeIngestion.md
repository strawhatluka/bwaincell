# recipeIngestion Service

**Source:** `backend/utils/recipeIngestion.ts`
**Role:** End-to-end two-pass recipe ingestion pipeline.

## Pipeline

**Pass 1 — Deterministic source extraction:**

- URL input: `scrapeRecipeFromUrl()` tries JSON-LD → microdata → Open Graph.
- File input: `GeminiService.parseRecipeFromFile(buffer, mimeType, filename)` (no reliable deterministic alternative).

**Pass 2 — Targeted AI research:**

- For each required field still missing after Pass 1, `GeminiService.researchMissingFields(...)` is called with Google Search grounding to research ONLY that field. Source-provided fields are NEVER overwritten.

Each field's provenance (`'source' | 'researched' | 'unknown'`) is returned so callers can display which values were verified.

## Exported Types

```ts
type FieldProvenance = 'source' | 'researched' | 'unknown';

interface IngestedRecipe extends ParsedRecipe {
  dietary_tags: string[];
}

interface IngestionResult {
  recipe: IngestedRecipe;
  provenance: Record<string, FieldProvenance>;
  pass1Source: string; // 'jsonld' | 'microdata' | 'og' | 'gemini-url' | 'gemini-file' | 'empty'
  researchRan: boolean;
}
```

`TRACKED_FIELDS` (string literal tuple): `name`, `ingredients`, `instructions`, `servings`, `prep_time_minutes`, `cook_time_minutes`, `nutrition`, `cuisine`, `difficulty`, `dietary_tags`, `image_url`.

`REQUIRED_FOR_SAVE`: `name`, `ingredients`, `instructions`.

## Exported Functions

| Function               | Signature                                                                                   | Purpose                                 |
| ---------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------- |
| `ingestRecipeFromUrl`  | `(url: string) => Promise<IngestionResult>`                                                 | Full pipeline for website/YouTube URLs. |
| `ingestRecipeFromFile` | `(buffer: Buffer, mimeType: string, filename: string) => Promise<IngestionResult>`          | Full pipeline for uploaded files.       |
| `summarizeProvenance`  | `(prov: Record<string, FieldProvenance>) => { sourceCount, researchedCount, unknownCount }` | UI helper for the provenance footer.    |

## Flow (`ingestRecipeFromUrl`)

1. `scrapeRecipeFromUrl(url)` → `ScrapeResult`.
2. If `hasAllRequired(scraped)`, base = scraped; provenance = `buildProvenance(scrapedProv, TRACKED_FIELDS)` (source / unknown).
3. Otherwise, fallback: `GeminiService.parseRecipeFromUrl(url)` (YouTube-aware); `pass1Source = 'gemini-url'`. All present fields become `'researched'`; absent fields stay `'unknown'`.
4. Pass 2: collect `gaps` = `ALLOWED_GAPS` fields still `'unknown'` AND we have ingredients + instructions (required context).
5. `GeminiService.researchMissingFields({ name, ingredients, instructions, servings }, url, gaps)` → partial fields.
6. `mergeResearched(...)` applies new values only where provenance ≠ `'source'`, marks as `'researched'`. `normalizeResult(...)` lowercases cuisine/difficulty/dietary_tags.

## Interaction with Recipe Model

`/recipe add` consumes the result and maps it 1-1 to [`Recipe.createRecipe(...)`](../models/Recipe.md), storing only the final merged values; provenance is NOT persisted.

## Example

```ts
import { ingestRecipeFromUrl, summarizeProvenance } from '@/utils/recipeIngestion';

const result = await ingestRecipeFromUrl('https://example.com/curry');
const { sourceCount, researchedCount, unknownCount } = summarizeProvenance(result.provenance);
console.log(result.pass1Source, 'research ran:', result.researchRan);
```

## Related

- [recipeScraper.md](./recipeScraper.md) — Pass 1 HTML extraction.
- [geminiService.md](./geminiService.md) — Pass 1 fallback + Pass 2 research.
- [recipeNormalize.md](./recipeNormalize.md) — cuisine/difficulty/tag normalization.
