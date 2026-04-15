# recipeData Service

**Source:** `backend/utils/recipeData.ts`

In-memory curated movie dataset used by the `/random movie` command. The filename predates the recipe feature; it is NOT a CRUD wrapper over the `recipes` table. CRUD for recipes is handled by the `Recipe` model directly (see [docs/backend/models/Recipe.md](../models/Recipe.md)).

## Exports

```ts
export const movieData: Record<
  string,
  {
    year: string;
    genre: string;
    rating: string; // IMDb rating string e.g. '9.3'
    link: string; // IMDb title URL
  }
>;
```

Initial entries include: _The Shawshank Redemption_, _The Dark Knight_, _Inception_, _Pulp Fiction_, _Forrest Gump_, _The Matrix_, _Interstellar_, _The Godfather_.

## Usage

```ts
import { movieData } from '@/utils/recipeData';

const titles = Object.keys(movieData);
const pick = titles[Math.floor(Math.random() * titles.length)];
const details = movieData[pick];
// details.year, details.genre, details.rating, details.link
```

## Why it's named `recipeData`

The module was originally a seed file for the `/random dinner` command; movie data was added alongside. When the real Recipe Management feature landed (migration `20260414000000_recipes_schema.sql`), recipes moved to Supabase and this file was left as the movie dataset host. See [CHANGELOG / upstream commit 8555546].

## Related

- Command consumer: `backend/commands/random.ts` (`/random movie` subcommand).
- Real recipe CRUD: [docs/backend/models/Recipe.md](../models/Recipe.md).
