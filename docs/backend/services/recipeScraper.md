# recipeScraper Service

**Source:** `backend/utils/recipeScraper.ts`
**Role:** Pass 1 of the two-pass recipe ingestion pipeline. Deterministic, source-of-truth extraction from HTML.

Fetches a URL's HTML server-side and pulls structured data from JSON-LD (Schema.org `Recipe`), microdata, and Open Graph tags. Every field is optional — Pass 2 (AI research) only fills fields this pass couldn't find.

## Constants

- `FETCH_TIMEOUT_MS = 10_000`
- `MAX_BYTES = 10 * 1024 * 1024` (10 MB streaming cap)
- `USER_AGENT = 'Mozilla/5.0 (compatible; Bwaincell/1.0; +https://github.com/bwaincell)'`

## Supported Sources

Any site serving a Schema.org Recipe via JSON-LD (preferred), microdata, or Open Graph. YouTube URLs are NOT handled here — they are detected by the caller (`recipe.ts`) and routed to `GeminiService.parseRecipeFromUrl(url)` instead.

## Exported Types

```ts
interface ScrapedRecipe {
  name: string | null;
  ingredients: RecipeIngredient[] | null;
  instructions: string[] | null;
  servings: number | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  nutrition: RecipeNutrition | null;
  cuisine: string | null;
  difficulty: RecipeDifficulty | null;
  dietary_tags: string[] | null;
  image_url: string | null;
}

type Provenance = Partial<Record<keyof ScrapedRecipe, 'source'>>;

interface ScrapeResult {
  recipe: ScrapedRecipe;
  provenance: Provenance;
  extractor: 'jsonld' | 'microdata' | 'og' | 'empty';
}
```

## Exported Functions

| Function | Signature | Purpose |
| -------- | --------- | ------- |
| `scrapeRecipeFromUrl` | `(url: string) => Promise<ScrapeResult>` | Entry point. Fetches + tries JSON-LD, microdata, OG in that order. |
| `fetchRecipeHtml` | `(url: string) => Promise<string>` | Fetches HTML with timeout, 10 MB cap, HTML content-type check. |
| `parseIsoDurationToMinutes` | `(input: unknown) => number \| null` | Parses ISO-8601 duration (`PT1H30M`). |
| `splitIngredientString` | `(raw: string) => { quantity, unit, name }` | Best-effort free-text split for JSON-LD `recipeIngredient` strings. |

## Error Cases

`fetchRecipeHtml` throws on:
- `AbortError` (timeout)
- `HTTP <status> <statusText>` (non-2xx)
- `Non-HTML content-type: <type>` (not `html` or `xml`)
- `Response exceeds <MAX_BYTES> bytes`

`scrapeRecipeFromUrl` propagates fetch errors. If no extractor matches, returns `{ recipe: <all nulls>, provenance: {}, extractor: 'empty' }`.

## Rate-Limit Considerations

No per-host rate limiting is enforced. Callers should throttle rapid-fire ingest flows externally. The `User-Agent` is explicit so site owners can blocklist if abused.

## Example

```ts
import { scrapeRecipeFromUrl } from '@/utils/recipeScraper';

const result = await scrapeRecipeFromUrl('https://example.com/chicken-curry');
console.log(result.extractor); // 'jsonld' | 'microdata' | 'og' | 'empty'
console.log(result.recipe.name);
console.log(result.provenance); // which fields came from the source
```

## Related

- Consumer: [recipeIngestion.md](./recipeIngestion.md)
- Normalization: [recipeNormalize.md](./recipeNormalize.md)
