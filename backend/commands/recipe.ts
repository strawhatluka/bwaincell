import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  AttachmentBuilder,
} from 'discord.js';
import { logger } from '../shared/utils/logger';
import Recipe from '@database/models/Recipe';
import MealPlan from '@database/models/MealPlan';
import RecipePreferences from '@database/models/RecipePreferences';
import { GeminiService, ParsedRecipe } from '../utils/geminiService';
import {
  ingestRecipeFromUrl,
  summarizeProvenance,
  FieldProvenance,
} from '../utils/recipeIngestion';
import { formatQuantity } from '../utils/fractionFormat';
import type { RecipeIngredient, RecipeSourceType } from '@database/types';

/**
 * Session state for an interactive `/recipe plan` flow.
 * Stored in module-level map, keyed by `${guildId}:${userId}`.
 */
export interface PlanSession {
  userId: string;
  guildId: string;
  mode: 'pick' | 'ai';
  selectedRecipeIds: number[];
  aiSuggestions?: number[];
  stage: 'picking' | 'confirming' | 'servings';
  servingsCollected: number[];
  currentPage: number;
  createdAt: number;
}

/**
 * In-memory session map for active `/recipe plan` flows. One concurrent session
 * per user per guild. Sessions older than 15 minutes are purged on access.
 * Exported for interaction handlers (see backend/utils/interactions/handlers/recipeHandlers.ts).
 */
export const planSessions = new Map<string, PlanSession>();

const PLAN_SESSION_TTL_MS = 15 * 60 * 1000;

export function planSessionKey(guildId: string, userId: string): string {
  return `${guildId}:${userId}`;
}

export function getPlanSession(guildId: string, userId: string): PlanSession | undefined {
  // Cleanup expired sessions on access.
  const now = Date.now();
  for (const [key, sess] of planSessions.entries()) {
    if (now - sess.createdAt > PLAN_SESSION_TTL_MS) {
      planSessions.delete(key);
    }
  }
  return planSessions.get(planSessionKey(guildId, userId));
}

/**
 * Compute the Monday of the current week as a YYYY-MM-DD string.
 */
export function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}

const SUBCOMMANDS_WITH_RECIPE_AUTOCOMPLETE = new Set(['view', 'delete', 'edit', 'favorite']);

function formatIngredient(ing: RecipeIngredient): string {
  const qty = formatQuantity(ing.quantity);
  const unit = ing.unit ? ` ${ing.unit}` : '';
  const name = ing.name;
  const prefix = qty ? `${qty}${unit} ` : '';
  return `- ${prefix}${name}`.trim();
}

// Units that typically represent whole countable items (no fractional quantities)
const UNITLESS_COUNT_UNITS = new Set(['', 'whole', 'piece', 'pieces', 'count', 'each']);

function parseQuantity(qty: number | string): number | null {
  if (typeof qty === 'number') {
    return Number.isFinite(qty) ? qty : null;
  }
  if (typeof qty !== 'string') return null;
  const trimmed = qty.trim();
  if (!trimmed) return null;

  // Handle mixed fraction like "1 1/2"
  const mixed = trimmed.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixed) {
    const whole = Number(mixed[1]);
    const num = Number(mixed[2]);
    const den = Number(mixed[3]);
    if (den !== 0 && Number.isFinite(whole) && Number.isFinite(num) && Number.isFinite(den)) {
      return whole + num / den;
    }
  }

  // Handle simple fraction like "1/2"
  const frac = trimmed.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (frac) {
    const num = Number(frac[1]);
    const den = Number(frac[2]);
    if (den !== 0 && Number.isFinite(num) && Number.isFinite(den)) {
      return num / den;
    }
  }

  // Handle decimal/integer like "1.5" or "2"
  const dec = trimmed.match(/^(\d+(?:\.\d+)?)$/);
  if (dec) {
    const n = Number(dec[1]);
    return Number.isFinite(n) ? n : null;
  }

  // Fallback: pull first number out
  const any = trimmed.match(/\d+(?:\.\d+)?/);
  if (any) {
    const n = Number(any[0]);
    return Number.isFinite(n) ? n : null;
  }

  return null;
}

function roundQty(value: number, unit: string): number {
  const u = (unit || '').trim().toLowerCase();
  const isCountUnit = UNITLESS_COUNT_UNITS.has(u);
  if (isCountUnit) {
    // Round countable items up to next whole number
    return Math.ceil(value);
  }
  // Round to at most 2 decimals
  return Math.round(value * 100) / 100;
}

export function scaleIngredient(ingredient: RecipeIngredient, scale: number): string {
  const unit = ingredient.unit ?? '';
  const name = ingredient.name;
  const parsed = parseQuantity(ingredient.quantity);

  let qtyStr: string;
  let note = '';
  if (parsed === null) {
    qtyStr = formatQuantity(ingredient.quantity);
    if (qtyStr) {
      note = ' _(unscaled — could not parse quantity)_';
    }
  } else {
    const scaled = parsed * scale;
    const rounded = roundQty(scaled, unit);
    qtyStr = formatQuantity(rounded);
  }

  const unitPart = unit ? ` ${unit}` : '';
  const qtyPart = qtyStr ? `${qtyStr}${unitPart} ` : '';
  return `- ${qtyPart}${name}${note}`.trim();
}

export function sanitizeFilename(name: string): string {
  const lower = name.toLowerCase();
  const hyphenated = lower.replace(/\s+/g, '-');
  const cleaned = hyphenated.replace(/[^a-z0-9-]/g, '');
  const collapsed = cleaned.replace(/-+/g, '-').replace(/^-|-$/g, '');
  return collapsed || 'recipe';
}

function truncateUrl(url: string, max = 80): string {
  if (url.length <= max) return url;
  return url.substring(0, max - 3) + '...';
}

async function resolveUniqueName(guildId: string, baseName: string): Promise<string> {
  const existing = await Recipe.searchByName(guildId, baseName);
  const lower = baseName.toLowerCase();
  const exactMatches = existing.filter((r) => r.name.toLowerCase() === lower);

  if (exactMatches.length === 0) {
    return baseName;
  }

  // Try " (2)", " (3)", ... until unique
  let suffix = 2;
  // Build a set of all existing names (lowercased) for fast lookup
  const allNames = new Set(existing.map((r) => r.name.toLowerCase()));
  while (allNames.has(`${lower} (${suffix})`)) {
    suffix += 1;
  }
  return `${baseName} (${suffix})`;
}

export default {
  data: new SlashCommandBuilder()
    .setName('recipe')
    .setDescription('Manage recipes and meal plans')
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Add a new recipe from a link')
        .addStringOption((opt) =>
          opt
            .setName('link')
            .setDescription('Recipe URL (website or YouTube video)')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('view')
        .setDescription('View a recipe scaled to a given serving count')
        .addStringOption((opt) =>
          opt
            .setName('recipe')
            .setDescription('Recipe to view')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addIntegerOption((opt) =>
          opt
            .setName('servings')
            .setDescription('Number of servings to scale to')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(50)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('delete')
        .setDescription('Delete a recipe')
        .addStringOption((opt) =>
          opt
            .setName('recipe')
            .setDescription('Recipe to delete')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('edit')
        .setDescription('Edit a recipe')
        .addStringOption((opt) =>
          opt
            .setName('recipe')
            .setDescription('Recipe to edit')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('search')
        .setDescription('Search recipes by filters')
        .addStringOption((opt) =>
          opt.setName('cuisine').setDescription('Cuisine filter').setRequired(false)
        )
        .addStringOption((opt) =>
          opt
            .setName('difficulty')
            .setDescription('Difficulty filter')
            .setRequired(false)
            .addChoices(
              { name: 'Easy', value: 'easy' },
              { name: 'Medium', value: 'medium' },
              { name: 'Hard', value: 'hard' }
            )
        )
        .addStringOption((opt) =>
          opt.setName('tag').setDescription('Dietary tag filter').setRequired(false)
        )
        .addStringOption((opt) =>
          opt.setName('keyword').setDescription('Keyword in name').setRequired(false)
        )
        .addIntegerOption((opt) =>
          opt
            .setName('max_prep_time')
            .setDescription('Maximum prep time (minutes)')
            .setRequired(false)
            .setMinValue(1)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('favorite')
        .setDescription('Toggle favorite status on a recipe')
        .addStringOption((opt) =>
          opt
            .setName('recipe')
            .setDescription('Recipe to favorite/unfavorite')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((sub) => sub.setName('plan').setDescription('Generate a weekly meal plan'))
    .addSubcommand((sub) =>
      sub
        .setName('swap')
        .setDescription('Swap a recipe in the active meal plan')
        .addIntegerOption((opt) =>
          opt
            .setName('slot')
            .setDescription('Slot number (1-7)')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(7)
        )
    )
    .addSubcommand((sub) => sub.setName('week').setDescription('Show the current weekly meal plan'))
    .addSubcommand((sub) => sub.setName('history').setDescription('Show past meal plans'))
    .addSubcommand((sub) =>
      sub
        .setName('preferences')
        .setDescription('Manage recipe preferences')
        .addStringOption((opt) =>
          opt
            .setName('action')
            .setDescription('Preference action')
            .setRequired(true)
            .addChoices(
              { name: 'View', value: 'view' },
              { name: 'Add restriction', value: 'add_restriction' },
              { name: 'Remove restriction', value: 'remove_restriction' },
              { name: 'Add exclusion', value: 'add_exclusion' },
              { name: 'Remove exclusion', value: 'remove_exclusion' },
              { name: 'Clear', value: 'clear' }
            )
        )
        .addStringOption((opt) =>
          opt.setName('value').setDescription('Restriction or cuisine name').setRequired(false)
        )
    ),

  async autocomplete(interaction: AutocompleteInteraction): Promise<void> {
    const guildId = interaction.guild?.id;
    if (!guildId) {
      await interaction.respond([]);
      return;
    }

    try {
      const focused = interaction.options.getFocused(true);
      const subcommand = interaction.options.getSubcommand();

      if (focused.name !== 'recipe' || !SUBCOMMANDS_WITH_RECIPE_AUTOCOMPLETE.has(subcommand)) {
        await interaction.respond([]);
        return;
      }

      const recipes = await Recipe.getRecipes(guildId);
      const typed = (focused.value ?? '').toString().toLowerCase();

      const filtered = recipes.filter((r) => r.name.toLowerCase().includes(typed));

      // Sort: favorites first, then alpha (getRecipes already sorts this way, but be explicit)
      filtered.sort((a, b) => {
        if (a.is_favorite !== b.is_favorite) {
          return a.is_favorite ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

      const choices = filtered.slice(0, 25).map((r) => {
        const prefix = r.is_favorite ? '★ ' : '';
        const rawName = `${prefix}${r.name}`;
        const name = rawName.length > 100 ? rawName.substring(0, 97) + '...' : rawName;
        return { name, value: String(r.id) };
      });

      await interaction.respond(choices);
    } catch (error) {
      logger.error('[RECIPE] Error in autocomplete', {
        error: error instanceof Error ? error.message : 'Unknown error',
        guildId,
      });
      await interaction.respond([]);
    }
  },

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const subcommand = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    const guildId = interaction.guild?.id;

    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply();
    }

    if (!guildId) {
      await interaction.editReply({
        content: '❌ This command can only be used in a server.',
      });
      return;
    }

    try {
      switch (subcommand) {
        case 'add': {
          const link = interaction.options.getString('link', true);

          await interaction.editReply({ content: '⏳ Parsing recipe from source...' });

          let parsed: ParsedRecipe;
          const sourceUrl: string = link;
          const sourceType: RecipeSourceType = /youtube\.com|youtu\.be/i.test(link)
            ? 'video'
            : 'website';
          let provenance: Record<string, FieldProvenance> = {};
          let pass1Source = 'gemini-url';
          let researchRan = false;
          let sourceDietaryTags: string[] = [];

          try {
            const result = await ingestRecipeFromUrl(link);
            parsed = result.recipe;
            provenance = result.provenance;
            pass1Source = result.pass1Source;
            researchRan = result.researchRan;
            sourceDietaryTags = result.recipe.dietary_tags;
          } catch (parseError) {
            const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown error';
            logger.error('[RECIPE] Failed to parse recipe', {
              error: errorMessage,
              link,
            });
            await interaction.editReply({
              content: `❌ Failed to parse recipe: ${errorMessage}. You can add it manually with /recipe edit after creation, or try a different source.`,
            });
            return;
          }

          // Dietary tags: use source-provided if available, else fall back to rules-based heuristic.
          let dietaryTags: string[];
          if (sourceDietaryTags.length > 0 && provenance.dietary_tags !== 'unknown') {
            dietaryTags = sourceDietaryTags;
          } else {
            try {
              dietaryTags = await GeminiService.suggestDietaryTags(parsed.ingredients);
              provenance.dietary_tags = 'researched';
            } catch (tagError) {
              logger.warn('[RECIPE] Failed to suggest dietary tags; continuing with empty tags', {
                error: tagError instanceof Error ? tagError.message : 'Unknown error',
              });
              dietaryTags = [];
            }
          }

          // Dedupe name
          const uniqueName = await resolveUniqueName(guildId, parsed.name);

          // Save
          const created = await Recipe.createRecipe({
            name: uniqueName,
            source_url: sourceUrl,
            source_type: sourceType,
            ingredients: parsed.ingredients,
            instructions: parsed.instructions,
            servings: parsed.servings,
            prep_time_minutes: parsed.prep_time_minutes,
            cook_time_minutes: parsed.cook_time_minutes,
            nutrition: parsed.nutrition,
            cuisine: parsed.cuisine,
            difficulty: parsed.difficulty,
            dietary_tags: dietaryTags,
            image_url: parsed.image_url,
            user_id: userId,
            guild_id: guildId,
          });

          // Build embed
          const glyph = (field: string): string => {
            const p = provenance[field];
            if (p === 'source') return ' 🔍';
            if (p === 'researched') return ' 🤖';
            return '';
          };

          const badges: string[] = [];
          if (created.cuisine) badges.push(`🍽️ ${created.cuisine}${glyph('cuisine')}`);
          if (created.difficulty) badges.push(`⚙️ ${created.difficulty}${glyph('difficulty')}`);

          const embed = new EmbedBuilder().setTitle(created.name).setColor(0x00ff00).setTimestamp();

          if (badges.length > 0) {
            embed.setDescription(badges.join(' • '));
          }

          if (created.image_url) {
            embed.setImage(created.image_url);
          }

          embed.addFields(
            {
              name: '🍽️ Servings',
              value: created.servings !== null ? `${created.servings}${glyph('servings')}` : '?',
              inline: true,
            },
            {
              name: '⏱️ Prep Time',
              value:
                created.prep_time_minutes !== null
                  ? `${created.prep_time_minutes} min${glyph('prep_time_minutes')}`
                  : '?',
              inline: true,
            },
            {
              name: '🔥 Cook Time',
              value:
                created.cook_time_minutes !== null
                  ? `${created.cook_time_minutes} min${glyph('cook_time_minutes')}`
                  : '?',
              inline: true,
            },
            {
              name: '🥗 Dietary',
              value:
                created.dietary_tags && created.dietary_tags.length > 0
                  ? `${created.dietary_tags.join(', ')}${glyph('dietary_tags')}`
                  : '-',
              inline: false,
            },
            {
              name: `🧂 Ingredients (${created.ingredients.length})${glyph('ingredients')}`,
              value: `${created.ingredients.length} items`,
              inline: false,
            }
          );

          if (created.nutrition) {
            const n = created.nutrition;
            const parts: string[] = [];
            if (n.calories !== undefined) parts.push(`${Math.round(n.calories)} kcal`);
            if (n.protein !== undefined) parts.push(`${Math.round(n.protein)}g protein`);
            if (n.carbs !== undefined) parts.push(`${Math.round(n.carbs)}g carbs`);
            if (n.fat !== undefined) parts.push(`${Math.round(n.fat)}g fat`);
            if (parts.length > 0) {
              embed.addFields({
                name: `🔢 Nutrition (per serving)${glyph('nutrition')}`,
                value: parts.join(' • '),
                inline: false,
              });
            }
          }

          const firstFive = created.ingredients
            .slice(0, 5)
            .map((ing) => `\`${formatIngredient(ing)}\``)
            .join('\n');
          if (firstFive.length > 0) {
            embed.addFields({ name: '📋 Preview', value: firstFive });
          }

          const summary = summarizeProvenance(provenance);
          const provenanceLine = `🔍 ${summary.sourceCount} source • 🤖 ${summary.researchedCount} researched${summary.unknownCount > 0 ? ` • ❓ ${summary.unknownCount} unknown` : ''}`;
          const pass1Label =
            pass1Source === 'jsonld'
              ? 'JSON-LD'
              : pass1Source === 'microdata'
                ? 'microdata'
                : pass1Source === 'og'
                  ? 'OpenGraph'
                  : pass1Source === 'gemini-url'
                    ? 'AI URL parse'
                    : pass1Source === 'gemini-file'
                      ? 'AI file parse'
                      : 'unknown';
          const footerParts: string[] = [`Source: ${created.source_type}`, `Pass 1: ${pass1Label}`];
          if (researchRan) footerParts.push('AI research filled gaps');
          if (created.source_url) {
            footerParts.push(truncateUrl(created.source_url));
          }
          embed.addFields({ name: '📊 Field Provenance', value: provenanceLine, inline: false });
          embed.setFooter({ text: footerParts.join(' • ') });

          const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId(`recipe_view_full_${created.id}`)
              .setLabel('View Full Recipe')
              .setStyle(ButtonStyle.Primary)
              .setEmoji('📖')
          );

          await interaction.editReply({
            content: `✨ Recipe **${created.name}** saved (#${created.id}).`,
            embeds: [embed],
            components: [row],
          });
          break;
        }

        case 'delete': {
          const recipeIdStr = interaction.options.getString('recipe', true);
          const recipeId = parseInt(recipeIdStr, 10);

          if (Number.isNaN(recipeId)) {
            await interaction.editReply({ content: '❌ Recipe not found.' });
            return;
          }

          const recipe = await Recipe.getRecipe(recipeId, guildId);
          if (!recipe) {
            await interaction.editReply({ content: '❌ Recipe not found.' });
            return;
          }

          const plan = await MealPlan.getActivePlan(guildId);
          const inPlan = plan?.recipe_ids.includes(recipeId) ?? false;

          const embed = new EmbedBuilder()
            .setTitle('Delete Recipe?')
            .setDescription(`**${recipe.name}**`)
            .setColor(inPlan ? 0xffff00 : 0xff0000);

          if (inPlan) {
            embed.addFields({
              name: 'Warning',
              value:
                '⚠️ This recipe is in your active meal plan. Deleting it may leave a gap. Consider `/recipe swap` first.',
            });
          }

          const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId(`recipe_delete_confirm_${recipeId}`)
              .setLabel('Confirm Delete')
              .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
              .setCustomId('recipe_delete_cancel')
              .setLabel('Cancel')
              .setStyle(ButtonStyle.Secondary)
          );

          await interaction.editReply({
            embeds: [embed],
            components: [row],
          });
          break;
        }

        case 'edit': {
          const recipeIdStr = interaction.options.getString('recipe', true);
          const recipeId = parseInt(recipeIdStr, 10);

          if (Number.isNaN(recipeId)) {
            await interaction.editReply({ content: '❌ Recipe not found.' });
            return;
          }

          const recipe = await Recipe.getRecipe(recipeId, guildId);
          if (!recipe) {
            await interaction.editReply({ content: '❌ Recipe not found.' });
            return;
          }

          const ingredientsJson = JSON.stringify(recipe.ingredients);
          const ingredientsPlaceholder =
            ingredientsJson.length > 100
              ? ingredientsJson.substring(0, 97) + '...'
              : ingredientsJson;

          const embed = new EmbedBuilder()
            .setTitle(`Edit Recipe: ${recipe.name}`)
            .setColor(0x0099ff)
            .addFields(
              {
                name: '🍽️ Servings',
                value: recipe.servings !== null ? String(recipe.servings) : '-',
                inline: true,
              },
              {
                name: '⏱️ Prep',
                value: recipe.prep_time_minutes !== null ? `${recipe.prep_time_minutes} min` : '-',
                inline: true,
              },
              {
                name: '🔥 Cook',
                value: recipe.cook_time_minutes !== null ? `${recipe.cook_time_minutes} min` : '-',
                inline: true,
              },
              {
                name: 'Cuisine',
                value: recipe.cuisine ?? '-',
                inline: true,
              },
              {
                name: 'Difficulty',
                value: recipe.difficulty ?? '-',
                inline: true,
              },
              {
                name: 'Dietary Tags',
                value:
                  recipe.dietary_tags && recipe.dietary_tags.length > 0
                    ? recipe.dietary_tags.join(', ')
                    : '-',
                inline: true,
              },
              {
                name: `Ingredients (${recipe.ingredients.length})`,
                value:
                  recipe.ingredients.length > 0
                    ? recipe.ingredients
                        .slice(0, 5)
                        .map((ing) => `\`${formatIngredient(ing)}\``)
                        .join('\n')
                    : '-',
              }
            )
            .setFooter({ text: 'Select a field below to edit it.' });

          // Handler for recipe_edit_field_{id} select menu lives in utils/interactions/handlers/
          // which opens a single-field modal per selection. Modal customId: recipe_edit_modal_{id}_{field}.
          const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`recipe_edit_field_${recipeId}`)
            .setPlaceholder('Choose a field to edit')
            .addOptions(
              {
                label: 'Name',
                value: 'name',
                description: recipe.name.substring(0, 100),
              },
              {
                label: 'Ingredients',
                value: 'ingredients',
                description: ingredientsPlaceholder,
              },
              {
                label: 'Instructions',
                value: 'instructions',
              },
              {
                label: 'Servings',
                value: 'servings',
                description: recipe.servings !== null ? String(recipe.servings) : 'Not set',
              },
              {
                label: 'Prep Time (minutes)',
                value: 'prep_time_minutes',
                description:
                  recipe.prep_time_minutes !== null ? String(recipe.prep_time_minutes) : 'Not set',
              },
              {
                label: 'Cook Time (minutes)',
                value: 'cook_time_minutes',
                description:
                  recipe.cook_time_minutes !== null ? String(recipe.cook_time_minutes) : 'Not set',
              },
              {
                label: 'Cuisine',
                value: 'cuisine',
                description: recipe.cuisine ?? 'Not set',
              },
              {
                label: 'Difficulty',
                value: 'difficulty',
                description: recipe.difficulty ?? 'Not set',
              },
              {
                label: 'Dietary Tags',
                value: 'dietary_tags',
                description:
                  recipe.dietary_tags && recipe.dietary_tags.length > 0
                    ? recipe.dietary_tags.join(', ').substring(0, 100)
                    : 'Not set',
              },
              {
                label: 'Notes',
                value: 'notes',
              },
              {
                label: 'Photo URL',
                value: 'image_url',
                description: recipe.image_url ? 'Currently set' : 'Not set',
              },
              {
                label: 'Nutrition (JSON)',
                value: 'nutrition',
                description:
                  recipe.nutrition && recipe.nutrition.calories !== undefined
                    ? `${Math.round(recipe.nutrition.calories)} kcal`
                    : 'Not set',
              }
            );

          const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

          await interaction.editReply({
            embeds: [embed],
            components: [row],
          });
          break;
        }

        case 'view': {
          const recipeIdStr = interaction.options.getString('recipe', true);
          const targetServings = interaction.options.getInteger('servings', true);
          const recipeId = Number(recipeIdStr);

          if (!Number.isFinite(recipeId)) {
            await interaction.editReply({ content: '❌ Recipe not found.' });
            return;
          }

          const recipe = await Recipe.getRecipe(recipeId, guildId);
          if (!recipe) {
            await interaction.editReply({ content: '❌ Recipe not found.' });
            return;
          }

          const originalServings = recipe.servings;
          const baseline = originalServings ?? 1;
          const scale = targetServings / baseline;

          const lines: string[] = [];
          lines.push(`# ${recipe.name}`);
          lines.push('');
          lines.push(`**Serves:** ${targetServings}  `);
          lines.push(`**Cuisine:** ${recipe.cuisine ?? 'Not specified'}  `);
          lines.push(`**Difficulty:** ${recipe.difficulty ?? 'Not specified'}  `);
          lines.push(`**Prep Time:** ${recipe.prep_time_minutes ?? '?'} min  `);
          lines.push(`**Cook Time:** ${recipe.cook_time_minutes ?? '?'} min  `);
          if (recipe.dietary_tags && recipe.dietary_tags.length > 0) {
            lines.push(`**Dietary:** ${recipe.dietary_tags.join(' • ')}`);
          }
          lines.push('');

          if (originalServings === null) {
            lines.push(
              `_Original serving size was not specified; ingredients scaled assuming 1 serving baseline (factor: ${scale.toFixed(2)}x)._`
            );
            lines.push('');
          } else if (targetServings !== originalServings) {
            lines.push(
              `_Scaled from ${originalServings} to ${targetServings} servings (factor: ${scale.toFixed(2)}x)._`
            );
            lines.push('');
          }

          lines.push('## Ingredients');
          lines.push('');
          for (const ing of recipe.ingredients) {
            lines.push(scaleIngredient(ing, scale));
          }
          lines.push('');

          lines.push('## Instructions');
          lines.push('');
          recipe.instructions.forEach((step, idx) => {
            lines.push(`${idx + 1}. ${step}`);
          });
          lines.push('');

          if (recipe.nutrition) {
            lines.push('## Nutrition (per original serving)');
            lines.push('');
            const n = recipe.nutrition;
            if (n.calories !== undefined) lines.push(`- Calories: ${n.calories}`);
            if (n.protein !== undefined) lines.push(`- Protein: ${n.protein}g`);
            if (n.carbs !== undefined) lines.push(`- Carbs: ${n.carbs}g`);
            if (n.fat !== undefined) lines.push(`- Fat: ${n.fat}g`);
            if (n.fiber !== undefined) lines.push(`- Fiber: ${n.fiber}g`);
            if (n.sugar !== undefined) lines.push(`- Sugar: ${n.sugar}g`);
            if (n.sodium !== undefined) lines.push(`- Sodium: ${n.sodium}mg`);
            lines.push('');
          }

          if (recipe.notes) {
            lines.push('## Notes');
            lines.push('');
            lines.push(recipe.notes);
            lines.push('');
          }

          if (recipe.source_url) {
            lines.push('---');
            lines.push(`Source: ${recipe.source_url}`);
          }

          const markdown = lines.join('\n');
          const buffer = Buffer.from(markdown, 'utf8');
          const fileName = `${sanitizeFilename(recipe.name)}.md`;
          const attachment = new AttachmentBuilder(buffer).setName(fileName);

          const embed = new EmbedBuilder()
            .setTitle(`📄 ${recipe.name} — scaled for ${targetServings}`)
            .setColor(0x00ff00);
          if (recipe.image_url) {
            embed.setThumbnail(recipe.image_url);
          }

          await interaction.editReply({
            embeds: [embed],
            files: [attachment],
          });
          break;
        }

        case 'search': {
          const cuisine = interaction.options.getString('cuisine') ?? undefined;
          const difficulty = interaction.options.getString('difficulty') ?? undefined;
          const tag = interaction.options.getString('tag') ?? undefined;
          const keyword = interaction.options.getString('keyword') ?? undefined;
          const maxPrepTime = interaction.options.getInteger('max_prep_time') ?? undefined;

          const filters: {
            cuisine?: string;
            difficulty?: 'easy' | 'medium' | 'hard';
            tag?: string;
            keyword?: string;
            maxPrepTime?: number;
          } = {};
          if (cuisine !== undefined) filters.cuisine = cuisine;
          if (difficulty !== undefined) {
            filters.difficulty = difficulty as 'easy' | 'medium' | 'hard';
          }
          if (tag !== undefined) filters.tag = tag;
          if (keyword !== undefined) filters.keyword = keyword;
          if (maxPrepTime !== undefined) filters.maxPrepTime = maxPrepTime;

          if (Object.keys(filters).length === 0) {
            await interaction.editReply({
              content: '❌ Provide at least one filter option.',
            });
            return;
          }

          const results = await Recipe.searchByFilters(guildId, filters);

          if (results.length === 0) {
            const embed = new EmbedBuilder()
              .setColor(0x3498db)
              .setDescription('No recipes match those filters.');
            await interaction.editReply({ embeds: [embed] });
            return;
          }

          const embed = new EmbedBuilder().setTitle('🔍 Recipe Search Results').setColor(0x3498db);

          const shown = results.slice(0, 10);
          for (const r of shown) {
            const fieldName = r.is_favorite ? `★ ${r.name}` : r.name;
            const parts: string[] = [];
            if (r.cuisine) parts.push(r.cuisine);
            if (r.difficulty) parts.push(r.difficulty);
            const prep =
              r.prep_time_minutes !== null && r.prep_time_minutes !== undefined
                ? `${r.prep_time_minutes} min`
                : '? min';
            parts.push(prep);
            embed.addFields({ name: fieldName, value: parts.join(' • ') });
          }

          if (results.length > 10) {
            embed.setFooter({
              text: `Showing 10 of ${results.length}. Refine filters to see more.`,
            });
          }

          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'favorite': {
          const recipeIdStr = interaction.options.getString('recipe', true);
          const recipeId = parseInt(recipeIdStr, 10);

          if (Number.isNaN(recipeId)) {
            await interaction.editReply({ content: '❌ Recipe not found.' });
            return;
          }

          const updated = await Recipe.toggleFavorite(recipeId, guildId);

          if (!updated) {
            await interaction.editReply({ content: '❌ Recipe not found.' });
            return;
          }

          const favorited = updated.is_favorite;
          const embed = new EmbedBuilder()
            .setColor(favorited ? 0xffd700 : 0x95a5a6)
            .setDescription(
              `⭐ **${updated.name}** — ${favorited ? 'added to favorites' : 'removed from favorites'}`
            );

          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'plan': {
          const recipes = await Recipe.getRecipes(guildId);
          if (recipes.length < 7) {
            await interaction.editReply({
              content: `❌ You need at least 7 recipes to create a meal plan. You have ${recipes.length}. Add more with \`/recipe add\`.`,
            });
            break;
          }

          planSessions.set(planSessionKey(guildId, userId), {
            userId,
            guildId,
            mode: 'pick',
            selectedRecipeIds: [],
            stage: 'picking',
            servingsCollected: [],
            currentPage: 0,
            createdAt: Date.now(),
          });

          const embed = new EmbedBuilder()
            .setTitle('📅 Create Meal Plan')
            .setDescription('How would you like to choose your 7 meals?')
            .setColor(0x5865f2);

          const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId('recipe_plan_mode_pick')
              .setLabel('Pick Myself')
              .setStyle(ButtonStyle.Primary)
              .setEmoji('🖐️'),
            new ButtonBuilder()
              .setCustomId('recipe_plan_mode_ai')
              .setLabel('Bwaincell Chooses')
              .setStyle(ButtonStyle.Success)
              .setEmoji('🤖')
          );

          await interaction.editReply({ embeds: [embed], components: [row] });
          break;
        }

        case 'swap': {
          const slot = interaction.options.getInteger('slot', true);
          const slotIndex = slot - 1;

          const activePlan = await MealPlan.getActivePlan(guildId);
          if (!activePlan) {
            await interaction.editReply({
              content: '❌ No active meal plan. Use `/recipe plan` first.',
            });
            return;
          }

          if (slotIndex < 0 || slotIndex >= activePlan.recipe_ids.length) {
            await interaction.editReply({
              content: `❌ Slot ${slot} is out of range for the active meal plan.`,
            });
            return;
          }

          const currentRecipeId = activePlan.recipe_ids[slotIndex];
          const currentRecipe = await Recipe.getRecipe(currentRecipeId, guildId);
          const currentRecipeName = currentRecipe?.name ?? '(deleted recipe)';

          const recipes = await Recipe.getRecipes(guildId);
          if (recipes.length === 0) {
            await interaction.editReply({
              content: '❌ No recipes found. Add some recipes before swapping.',
            });
            return;
          }

          const options = recipes.slice(0, 25).map((r) => {
            const descParts: string[] = [];
            if (r.cuisine) descParts.push(r.cuisine);
            if (r.difficulty) descParts.push(r.difficulty);
            const description = descParts.join(' • ').slice(0, 100) || 'No details';
            return {
              label: r.name.slice(0, 100),
              value: String(r.id),
              description,
              default: r.id === currentRecipeId,
            };
          });

          const embed = new EmbedBuilder()
            .setTitle(`🔄 Swap meal for slot ${slot}`)
            .setDescription(
              `Currently: **${currentRecipeName}**\n\nSelect a replacement recipe below.`
            )
            .setColor(0x3498db);

          const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`recipe_swap_select_${slotIndex}`)
            .setPlaceholder('Choose a recipe to swap in...')
            .addOptions(options);

          const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

          // Handler for recipe_swap_select_{slot} lives in utils/interactions/handlers/recipeHandlers.ts
          // It should: call MealPlan.swapMeal(...), fetch all 7 meals, regenerate shopping list via generateShoppingList(), reply with new shopping list attachment.
          await interaction.editReply({ embeds: [embed], components: [row] });
          break;
        }

        case 'week': {
          const activePlan = await MealPlan.getActivePlan(guildId);
          if (!activePlan) {
            await interaction.editReply({
              content: '📅 No active meal plan. Use `/recipe plan` to create one.',
            });
            return;
          }

          const recipes = await Promise.all(
            activePlan.recipe_ids.map((id) => Recipe.getRecipe(id, guildId))
          );

          const embed = new EmbedBuilder()
            .setTitle("📅 This Week's Meals")
            .setDescription(`Week of **${activePlan.week_start}**`)
            .setColor(0x3498db);

          const selectOptions: { label: string; value: string; description: string }[] = [];

          for (let i = 0; i < activePlan.recipe_ids.length; i++) {
            const recipe = recipes[i];
            const servings = activePlan.servings_per_recipe[i];
            const name = recipe?.name ?? '(deleted recipe)';
            const cuisine = recipe?.cuisine ?? 'unknown';
            const difficulty = recipe?.difficulty ?? 'unknown';

            embed.addFields({
              name: `${i + 1}. ${name}`,
              value: `${servings} servings • ${cuisine} • ${difficulty}`,
              inline: false,
            });

            if (recipe) {
              selectOptions.push({
                label: `${i + 1}. ${name}`.slice(0, 100),
                value: `${i}_${recipe.id}`,
                description: `${servings} servings • ${cuisine}`.slice(0, 100),
              });
            }
          }

          const components: ActionRowBuilder<StringSelectMenuBuilder>[] = [];
          if (selectOptions.length > 0) {
            const selectMenu = new StringSelectMenuBuilder()
              .setCustomId('recipe_week_select')
              .setPlaceholder('View a recipe (scaled to plan servings)...')
              .addOptions(selectOptions);
            components.push(
              new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu)
            );
          }

          // Handler for recipe_week_select lives in utils/interactions/handlers/recipeHandlers.ts
          // It should: get selected recipe ID + stored servings from plan, generate recipe.md, attach.
          await interaction.editReply({ embeds: [embed], components });
          break;
        }

        case 'history': {
          const archived = await MealPlan.getArchivedPlans(guildId, 10);
          if (archived.length === 0) {
            await interaction.editReply({
              content: '📚 No archived meal plans yet.',
            });
            return;
          }

          const embed = new EmbedBuilder().setTitle('📚 Meal Plan History').setColor(0x9b59b6);

          const selectOptions = archived.map((plan, idx) => {
            const archivedDate = new Date(plan.updated_at || plan.created_at)
              .toISOString()
              .slice(0, 10);
            embed.addFields({
              name: `Plan ${idx + 1}`,
              value: `Week of ${plan.week_start} • Archived ${archivedDate}`,
              inline: false,
            });
            return {
              label: `Plan ${idx + 1} — Week of ${plan.week_start}`.slice(0, 100),
              value: String(plan.id),
              description: `Archived ${archivedDate}`.slice(0, 100),
            };
          });

          const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('recipe_history_select')
            .setPlaceholder('View plan details...')
            .addOptions(selectOptions);

          const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

          // Handler for recipe_history_select lives in utils/interactions/handlers/recipeHandlers.ts
          // It should: fetch plan by ID, display embed with 7 recipes + servings (read-only, no actions).
          await interaction.editReply({ embeds: [embed], components: [row] });
          break;
        }

        case 'preferences': {
          const action = interaction.options.getString('action', true);
          const rawValue = interaction.options.getString('value');
          const value = rawValue ? rawValue.trim().toLowerCase() : null;

          const requiresValue = action !== 'view' && action !== 'clear';
          if (requiresValue && !value) {
            const errorEmbed = new EmbedBuilder()
              .setColor(0xff0000)
              .setDescription('❌ Provide a `value` for this action.');
            await interaction.editReply({ embeds: [errorEmbed] });
            return;
          }

          switch (action) {
            case 'view': {
              const prefs = await RecipePreferences.getPreferences(guildId);
              const restrictions = prefs?.dietary_restrictions ?? [];
              const exclusions = prefs?.excluded_cuisines ?? [];

              if (!prefs || (restrictions.length === 0 && exclusions.length === 0)) {
                await interaction.editReply({
                  content:
                    'No preferences set. Use `/recipe preferences action:add_restriction value:vegetarian` to start.',
                });
                return;
              }

              const embed = new EmbedBuilder()
                .setTitle('🥗 Recipe Preferences')
                .setColor(0x00ff00)
                .addFields(
                  {
                    name: 'Dietary Restrictions',
                    value:
                      restrictions.length > 0
                        ? restrictions.map((r) => `\`${r}\``).join(', ')
                        : 'None',
                    inline: false,
                  },
                  {
                    name: 'Excluded Cuisines',
                    value:
                      exclusions.length > 0 ? exclusions.map((c) => `\`${c}\``).join(', ') : 'None',
                    inline: false,
                  }
                )
                .setTimestamp();

              await interaction.editReply({ embeds: [embed] });
              return;
            }

            case 'add_restriction': {
              await RecipePreferences.addDietaryRestriction(guildId, userId, value!);
              const embed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setDescription(`✅ Added \`${value}\` to dietary restrictions.`);
              await interaction.editReply({ embeds: [embed] });
              return;
            }

            case 'remove_restriction': {
              await RecipePreferences.removeDietaryRestriction(guildId, userId, value!);
              const embed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setDescription(`✅ Removed \`${value}\`.`);
              await interaction.editReply({ embeds: [embed] });
              return;
            }

            case 'add_exclusion': {
              await RecipePreferences.addExcludedCuisine(guildId, userId, value!);
              const embed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setDescription(`✅ Excluded cuisine: \`${value}\`.`);
              await interaction.editReply({ embeds: [embed] });
              return;
            }

            case 'remove_exclusion': {
              await RecipePreferences.removeExcludedCuisine(guildId, userId, value!);
              const embed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setDescription(`✅ Removed exclusion: \`${value}\`.`);
              await interaction.editReply({ embeds: [embed] });
              return;
            }

            case 'clear': {
              await RecipePreferences.upsertPreferences(guildId, userId, {
                dietary_restrictions: [],
                excluded_cuisines: [],
              });
              const embed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setDescription('✅ All preferences cleared.');
              await interaction.editReply({ embeds: [embed] });
              return;
            }

            default: {
              const errorEmbed = new EmbedBuilder()
                .setColor(0xff0000)
                .setDescription(`❌ Unknown preference action: ${action}`);
              await interaction.editReply({ embeds: [errorEmbed] });
              return;
            }
          }
        }

        default: {
          await interaction.editReply({
            content: `❌ Unknown subcommand: ${subcommand}`,
          });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      logger.error('[RECIPE] Error in recipe command', {
        command: interaction.commandName,
        subcommand,
        error: errorMessage,
        stack: errorStack,
        userId,
        guildId,
      });

      const replyMessage = {
        content: '❌ An error occurred while processing your request.',
      };

      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(replyMessage);
        } else {
          await interaction.reply(replyMessage);
        }
      } catch (replyError) {
        logger.error('[RECIPE] Failed to send error reply', {
          error: replyError instanceof Error ? replyError.message : 'Unknown error',
        });
      }
    }
  },
};
