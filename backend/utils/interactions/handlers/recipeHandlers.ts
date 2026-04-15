/**
 * @module RecipeHandlers
 * @description Button, select-menu, and modal interaction handlers for the
 * `/recipe plan` interactive flow. Implements the 7-recipe selection flow
 * (Pick Myself vs Bwaincell Chooses), serving collection, and final meal plan
 * creation with shopping list generation.
 */

import {
  ButtonInteraction,
  StringSelectMenuInteraction,
  ModalSubmitInteraction,
  CacheType,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
} from 'discord.js';
import { logger } from '../../../shared/utils/logger';
import Recipe from '../../../../supabase/models/Recipe';
import MealPlan from '../../../../supabase/models/MealPlan';
import RecipePreferences from '../../../../supabase/models/RecipePreferences';
import { GeminiService } from '../../geminiService';
import { generateShoppingList, RecipeWithServings } from '../../shoppingList';
import type { RecipeRow } from '../../../../supabase/types';
import {
  planSessions,
  planSessionKey,
  getPlanSession,
  getWeekStart,
  scaleIngredient,
  sanitizeFilename,
  PlanSession,
} from '../../../commands/recipe';
import type { RecipeUpdate, RecipeIngredient, RecipeNutrition } from '../../../../supabase/types';

const RECIPES_PER_PAGE = 25;

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function requireSession(
  interaction:
    | ButtonInteraction<CacheType>
    | StringSelectMenuInteraction<CacheType>
    | ModalSubmitInteraction<CacheType>
): PlanSession | null {
  const guildId = interaction.guild?.id;
  const userId = interaction.user.id;
  if (!guildId) return null;
  const session = getPlanSession(guildId, userId);
  return session ?? null;
}

async function sessionError(
  interaction:
    | ButtonInteraction<CacheType>
    | StringSelectMenuInteraction<CacheType>
    | ModalSubmitInteraction<CacheType>
): Promise<void> {
  const content =
    '❌ Your meal plan session has expired or was not found. Start again with `/recipe plan`.';
  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content, embeds: [], components: [] });
    } else {
      await interaction.reply({ content, ephemeral: true });
    }
  } catch {
    // Best-effort
  }
}

function truncateLabel(text: string, max = 100): string {
  if (text.length <= max) return text;
  return text.substring(0, max - 3) + '...';
}

function buildPickMenu(
  recipes: RecipeRow[],
  session: PlanSession,
  page: number
): ActionRowBuilder<StringSelectMenuBuilder>[] {
  const totalPages = Math.max(1, Math.ceil(recipes.length / RECIPES_PER_PAGE));
  const safePage = Math.min(Math.max(page, 0), totalPages - 1);
  const start = safePage * RECIPES_PER_PAGE;
  const slice = recipes.slice(start, start + RECIPES_PER_PAGE);

  const remaining = 7 - session.selectedRecipeIds.length;
  const maxValues = Math.max(1, Math.min(remaining, slice.length));

  const options = slice.map((r) => {
    const star = r.is_favorite ? '★ ' : '';
    const badges: string[] = [];
    if (r.cuisine) badges.push(r.cuisine);
    if (r.difficulty) badges.push(r.difficulty);
    const description = badges.length > 0 ? truncateLabel(badges.join(' • '), 100) : undefined;
    const opt = new StringSelectMenuOptionBuilder()
      .setLabel(truncateLabel(`${star}${r.name}`))
      .setValue(String(r.id));
    if (description) opt.setDescription(description);
    return opt;
  });

  const select = new StringSelectMenuBuilder()
    .setCustomId(`recipe_plan_pick_${safePage}`)
    .setPlaceholder(`Pick up to ${maxValues} recipes (page ${safePage + 1}/${totalPages})`)
    .setMinValues(1)
    .setMaxValues(maxValues)
    .addOptions(options);

  const rows: ActionRowBuilder<StringSelectMenuBuilder>[] = [
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select),
  ];
  return rows;
}

function buildPickNavRow(
  session: PlanSession,
  totalPages: number
): ActionRowBuilder<ButtonBuilder> | null {
  if (totalPages <= 1) return null;
  const prev = new ButtonBuilder()
    .setCustomId('recipe_plan_pick_prev')
    .setLabel('◀ Prev')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(session.currentPage <= 0);
  const next = new ButtonBuilder()
    .setCustomId('recipe_plan_pick_next')
    .setLabel('Next ▶')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(session.currentPage >= totalPages - 1);
  return new ActionRowBuilder<ButtonBuilder>().addComponents(prev, next);
}

function buildPickEmbed(session: PlanSession, recipes: RecipeRow[]): EmbedBuilder {
  const selected = session.selectedRecipeIds
    .map((id) => recipes.find((r) => r.id === id)?.name ?? `#${id}`)
    .map((name, idx) => `${idx + 1}. ${name}`)
    .join('\n');
  return new EmbedBuilder()
    .setTitle('📅 Pick 7 Recipes')
    .setDescription(
      `Selected: **${session.selectedRecipeIds.length}/7**\n\n${selected || '_No recipes selected yet._'}`
    )
    .setColor(0x5865f2);
}

function buildAISuggestionEmbed(
  session: PlanSession,
  recipes: RecipeRow[],
  reasoning?: string
): EmbedBuilder {
  const ids = session.aiSuggestions ?? [];
  const lines = ids.map((id, idx) => {
    const r = recipes.find((rx) => rx.id === id);
    if (!r) return `${idx + 1}. _Unknown recipe #${id}_`;
    const badges: string[] = [];
    if (r.cuisine) badges.push(r.cuisine);
    if (r.difficulty) badges.push(r.difficulty);
    const badge = badges.length > 0 ? ` _(${badges.join(' • ')})_` : '';
    return `**${idx + 1}.** ${r.name}${badge}`;
  });
  const embed = new EmbedBuilder()
    .setTitle('🤖 Bwaincell Chose These 7 Meals')
    .setDescription(lines.join('\n'))
    .setColor(0x57f287);
  if (reasoning) {
    embed.addFields({ name: '💭 Reasoning', value: truncateLabel(reasoning, 1024) });
  }
  return embed;
}

function buildAISuggestionRows(): ActionRowBuilder<ButtonBuilder>[] {
  const acceptRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('recipe_plan_accept_all')
      .setLabel('Accept All')
      .setStyle(ButtonStyle.Success)
      .setEmoji('✅'),
    new ButtonBuilder()
      .setCustomId('recipe_plan_swap_0')
      .setLabel('Swap 1')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('recipe_plan_swap_1')
      .setLabel('Swap 2')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('recipe_plan_swap_2')
      .setLabel('Swap 3')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('recipe_plan_swap_3')
      .setLabel('Swap 4')
      .setStyle(ButtonStyle.Secondary)
  );
  const swapRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('recipe_plan_swap_4')
      .setLabel('Swap 5')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('recipe_plan_swap_5')
      .setLabel('Swap 6')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('recipe_plan_swap_6')
      .setLabel('Swap 7')
      .setStyle(ButtonStyle.Secondary)
  );
  return [acceptRow, swapRow];
}

function buildServingsEmbed(session: PlanSession, recipes: RecipeRow[]): EmbedBuilder {
  const lines = session.selectedRecipeIds.map((id, idx) => {
    const r = recipes.find((rx) => rx.id === id);
    const name = r?.name ?? `#${id}`;
    const servings = session.servingsCollected[idx];
    const status =
      servings !== undefined && servings !== null ? `✅ ${servings} servings` : '⬜ not set';
    return `**${idx + 1}.** ${name} — ${status}`;
  });
  const pending = session.selectedRecipeIds
    .map((_, idx) => idx)
    .filter(
      (idx) =>
        session.servingsCollected[idx] === undefined || session.servingsCollected[idx] === null
    );
  const pendingStr =
    pending.length > 0
      ? '\n\n_Click each meal and enter the number of servings you wish to make._'
      : '';
  return new EmbedBuilder()
    .setTitle('🍽️ How Many Servings Per Meal?')
    .setDescription(`${lines.join('\n')}${pendingStr}`)
    .setColor(0xfee75c);
}

function buildServingsButtons(
  session: PlanSession,
  recipes: RecipeRow[]
): ActionRowBuilder<ButtonBuilder>[] {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  // 7 buttons → 2 rows (4 + 3)
  const groups: number[][] = [
    [0, 1, 2, 3],
    [4, 5, 6],
  ];
  for (const group of groups) {
    const row = new ActionRowBuilder<ButtonBuilder>();
    for (const idx of group) {
      const id = session.selectedRecipeIds[idx];
      const r = recipes.find((rx) => rx.id === id);
      const name = r?.name ?? `#${id}`;
      const filled =
        session.servingsCollected[idx] !== undefined && session.servingsCollected[idx] !== null;
      const label = truncateLabel(`Meal ${idx + 1}: ${name}`, 80);
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`recipe_plan_servings_${idx}`)
          .setLabel(label)
          .setStyle(filled ? ButtonStyle.Success : ButtonStyle.Primary)
          .setDisabled(filled)
      );
    }
    rows.push(row);
  }
  return rows;
}

async function transitionToServings(
  interaction:
    | ButtonInteraction<CacheType>
    | StringSelectMenuInteraction<CacheType>
    | ModalSubmitInteraction<CacheType>,
  session: PlanSession
): Promise<void> {
  session.stage = 'servings';
  session.servingsCollected = [];
  const guildId = session.guildId;
  const recipes = await Recipe.getRecipes(guildId);
  const embed = buildServingsEmbed(session, recipes);
  const rows = buildServingsButtons(session, recipes);
  await interaction.editReply({ embeds: [embed], components: rows });
}

async function finalizePlan(
  interaction:
    | ModalSubmitInteraction<CacheType>
    | StringSelectMenuInteraction<CacheType>
    | ButtonInteraction<CacheType>,
  session: PlanSession
): Promise<void> {
  const guildId = session.guildId;
  const userId = session.userId;

  await MealPlan.upsertPlan({
    recipeIds: session.selectedRecipeIds,
    servingsPerRecipe: session.servingsCollected,
    weekStart: getWeekStart(),
    userId,
    guildId,
  });

  const allRecipes = await Recipe.getRecipes(guildId);
  const meals: RecipeWithServings[] = session.selectedRecipeIds.map((id, idx) => {
    const recipe = allRecipes.find((r) => r.id === id);
    if (!recipe) {
      throw new Error(`Recipe #${id} no longer exists in this guild.`);
    }
    return { recipe, targetServings: session.servingsCollected[idx] };
  });

  const { markdown, nutrition } = await generateShoppingList(meals);
  const attachment = new AttachmentBuilder(Buffer.from(markdown, 'utf-8'), {
    name: 'Shopping-List.md',
  });

  const mealsList = meals
    .map((m, idx) => `**${idx + 1}.** ${m.recipe.name} — ${m.targetServings} servings`)
    .join('\n');

  const embed = new EmbedBuilder()
    .setTitle('✅ Meal Plan Created!')
    .setDescription(`${mealsList}\n\n_Nutrition totals below are per person for the week._`)
    .setColor(0x00ff00)
    .addFields(
      { name: '🔥 Calories', value: `${Math.round(nutrition.totalCalories)}`, inline: true },
      { name: '🥩 Protein', value: `${Math.round(nutrition.totalProtein)} g`, inline: true },
      { name: '🍞 Carbs', value: `${Math.round(nutrition.totalCarbs)} g`, inline: true },
      { name: '🥑 Fat', value: `${Math.round(nutrition.totalFat)} g`, inline: true },
      { name: '🌾 Fiber', value: `${Math.round(nutrition.totalFiber)} g`, inline: true },
      { name: '📅 Week Of', value: getWeekStart(), inline: true }
    )
    .setTimestamp();

  await interaction.editReply({
    content: '🎉 Your meal plan is ready! Shopping list attached below.',
    embeds: [embed],
    components: [],
    files: [attachment],
  });

  planSessions.delete(planSessionKey(guildId, userId));
}

// ---------------------------------------------------------------------------
// Button handlers
// ---------------------------------------------------------------------------

async function handlePickMode(interaction: ButtonInteraction<CacheType>): Promise<void> {
  const session = requireSession(interaction);
  if (!session) return sessionError(interaction);
  session.mode = 'pick';
  session.stage = 'picking';
  session.selectedRecipeIds = [];
  session.currentPage = 0;

  const recipes = await Recipe.getRecipes(session.guildId);
  const totalPages = Math.max(1, Math.ceil(recipes.length / RECIPES_PER_PAGE));
  const embed = buildPickEmbed(session, recipes);
  const components: ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[] = [
    ...buildPickMenu(recipes, session, session.currentPage),
  ];
  const nav = buildPickNavRow(session, totalPages);
  if (nav) components.push(nav);

  await interaction.editReply({ embeds: [embed], components });
}

async function handlePickNav(
  interaction: ButtonInteraction<CacheType>,
  direction: 'prev' | 'next'
): Promise<void> {
  const session = requireSession(interaction);
  if (!session) return sessionError(interaction);

  const recipes = await Recipe.getRecipes(session.guildId);
  const totalPages = Math.max(1, Math.ceil(recipes.length / RECIPES_PER_PAGE));
  if (direction === 'prev') session.currentPage = Math.max(0, session.currentPage - 1);
  else session.currentPage = Math.min(totalPages - 1, session.currentPage + 1);

  const embed = buildPickEmbed(session, recipes);
  const components: ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[] = [
    ...buildPickMenu(recipes, session, session.currentPage),
  ];
  const nav = buildPickNavRow(session, totalPages);
  if (nav) components.push(nav);

  await interaction.editReply({ embeds: [embed], components });
}

async function handleAIMode(interaction: ButtonInteraction<CacheType>): Promise<void> {
  const session = requireSession(interaction);
  if (!session) return sessionError(interaction);
  session.mode = 'ai';
  session.stage = 'confirming';
  session.selectedRecipeIds = [];

  await interaction.editReply({
    content: '🤖 Bwaincell is thinking...',
    embeds: [],
    components: [],
  });

  const recipes = await Recipe.getRecipes(session.guildId);
  const prefs = await RecipePreferences.getPreferences(session.guildId);
  const preferences = prefs
    ? {
        dietary_restrictions: prefs.dietary_restrictions ?? [],
        excluded_cuisines: prefs.excluded_cuisines ?? [],
      }
    : undefined;

  let selectedRecipeIds: number[];
  let reasoning: string;
  try {
    const result = await GeminiService.selectMealsForPlan(
      recipes.map((r) => ({
        id: r.id,
        name: r.name,
        cuisine: r.cuisine,
        difficulty: r.difficulty,
        dietary_tags: r.dietary_tags ?? [],
      })),
      preferences
    );
    selectedRecipeIds = result.selectedRecipeIds;
    reasoning = result.reasoning;
  } catch (error) {
    logger.error('[RECIPE] Bwaincell Chooses failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      guildId: session.guildId,
    });
    await interaction.editReply({
      content: `❌ Bwaincell couldn't pick meals: ${error instanceof Error ? error.message : 'Unknown error'}. Try \`/recipe plan\` again or use "Pick Myself".`,
      embeds: [],
      components: [],
    });
    planSessions.delete(planSessionKey(session.guildId, session.userId));
    return;
  }

  session.aiSuggestions = selectedRecipeIds;
  const embed = buildAISuggestionEmbed(session, recipes, reasoning);
  const rows = buildAISuggestionRows();
  await interaction.editReply({ content: null, embeds: [embed], components: rows });
}

async function handleSwapSlot(interaction: ButtonInteraction<CacheType>): Promise<void> {
  const session = requireSession(interaction);
  if (!session) return sessionError(interaction);
  if (!session.aiSuggestions) return sessionError(interaction);

  const slotIndex = parseInt(interaction.customId.replace('recipe_plan_swap_', ''), 10);
  if (Number.isNaN(slotIndex) || slotIndex < 0 || slotIndex > 6) {
    await interaction.editReply({ content: '❌ Invalid slot.' });
    return;
  }

  const recipes = await Recipe.getRecipes(session.guildId);
  const chosenSet = new Set(session.aiSuggestions);
  const alternatives = recipes.filter((r) => !chosenSet.has(r.id)).slice(0, 25);

  if (alternatives.length === 0) {
    await interaction.editReply({ content: '❌ No alternative recipes available.' });
    return;
  }

  const options = alternatives.map((r) => {
    const star = r.is_favorite ? '★ ' : '';
    const badges: string[] = [];
    if (r.cuisine) badges.push(r.cuisine);
    if (r.difficulty) badges.push(r.difficulty);
    const opt = new StringSelectMenuOptionBuilder()
      .setLabel(truncateLabel(`${star}${r.name}`))
      .setValue(String(r.id));
    if (badges.length > 0) opt.setDescription(truncateLabel(badges.join(' • '), 100));
    return opt;
  });

  const select = new StringSelectMenuBuilder()
    .setCustomId(`recipe_plan_swap_select_${slotIndex}`)
    .setPlaceholder(`Pick a replacement for meal ${slotIndex + 1}`)
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(options);

  const embed = buildAISuggestionEmbed(session, recipes);
  embed.setFooter({ text: `Swapping meal ${slotIndex + 1}...` });

  await interaction.editReply({
    embeds: [embed],
    components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)],
  });
}

async function handleAcceptAllAI(interaction: ButtonInteraction<CacheType>): Promise<void> {
  const session = requireSession(interaction);
  if (!session) return sessionError(interaction);
  if (!session.aiSuggestions || session.aiSuggestions.length !== 7) {
    await interaction.editReply({ content: '❌ No AI suggestions available.' });
    return;
  }
  session.selectedRecipeIds = [...session.aiSuggestions];
  await transitionToServings(interaction, session);
}

/**
 * Serving values offered in the select menu. Realistic culinary range — anything
 * beyond 20 can be set post-creation via /recipe edit.
 */
const SERVINGS_OPTIONS: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15, 20];

async function handleOpenServingsSelect(interaction: ButtonInteraction<CacheType>): Promise<void> {
  const session = requireSession(interaction);
  if (!session) return sessionError(interaction);

  const slotIndex = parseInt(interaction.customId.replace('recipe_plan_servings_', ''), 10);
  if (Number.isNaN(slotIndex) || slotIndex < 0 || slotIndex > 6) {
    await interaction.editReply({ content: '❌ Invalid slot.' });
    return;
  }

  const recipes = await Recipe.getRecipes(session.guildId);
  const recipeId = session.selectedRecipeIds[slotIndex];
  const recipe = recipes.find((r) => r.id === recipeId);
  const name = recipe?.name ?? `Meal ${slotIndex + 1}`;

  const options = SERVINGS_OPTIONS.map((n) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(`${n} serving${n === 1 ? '' : 's'}`)
      .setValue(String(n))
  );
  const select = new StringSelectMenuBuilder()
    .setCustomId(`recipe_plan_servings_select_${slotIndex}`)
    .setPlaceholder(truncateLabel(`Servings for: ${name}`, 100))
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(options);

  const embed = buildServingsEmbed(session, recipes);
  embed.setFooter({ text: `Select servings for meal ${slotIndex + 1}: ${name}` });

  await interaction.editReply({
    embeds: [embed],
    components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)],
  });
}

// ---------------------------------------------------------------------------
// Select menu handlers
// ---------------------------------------------------------------------------

async function handlePickSelect(
  interaction: StringSelectMenuInteraction<CacheType>
): Promise<void> {
  const session = requireSession(interaction);
  if (!session) return sessionError(interaction);

  const chosenIds = interaction.values.map((v) => parseInt(v, 10)).filter((n) => !Number.isNaN(n));
  // Dedupe against already-selected
  for (const id of chosenIds) {
    if (!session.selectedRecipeIds.includes(id) && session.selectedRecipeIds.length < 7) {
      session.selectedRecipeIds.push(id);
    }
  }

  if (session.selectedRecipeIds.length >= 7) {
    // Trim to 7 in case of overshoot
    session.selectedRecipeIds = session.selectedRecipeIds.slice(0, 7);
    await transitionToServings(interaction, session);
    return;
  }

  const recipes = await Recipe.getRecipes(session.guildId);
  const totalPages = Math.max(1, Math.ceil(recipes.length / RECIPES_PER_PAGE));
  const embed = buildPickEmbed(session, recipes);
  const components: ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[] = [
    ...buildPickMenu(recipes, session, session.currentPage),
  ];
  const nav = buildPickNavRow(session, totalPages);
  if (nav) components.push(nav);

  await interaction.editReply({ embeds: [embed], components });
}

async function handleSwapSelect(
  interaction: StringSelectMenuInteraction<CacheType>
): Promise<void> {
  const session = requireSession(interaction);
  if (!session) return sessionError(interaction);
  if (!session.aiSuggestions) return sessionError(interaction);

  const slotIndex = parseInt(interaction.customId.replace('recipe_plan_swap_select_', ''), 10);
  if (Number.isNaN(slotIndex) || slotIndex < 0 || slotIndex > 6) {
    await interaction.editReply({ content: '❌ Invalid slot.' });
    return;
  }

  const newId = parseInt(interaction.values[0], 10);
  if (Number.isNaN(newId)) {
    await interaction.editReply({ content: '❌ Invalid recipe.' });
    return;
  }

  session.aiSuggestions[slotIndex] = newId;

  const recipes = await Recipe.getRecipes(session.guildId);
  const embed = buildAISuggestionEmbed(session, recipes);
  const rows = buildAISuggestionRows();
  await interaction.editReply({ embeds: [embed], components: rows });
}

// ---------------------------------------------------------------------------
// Modal handlers
// ---------------------------------------------------------------------------

async function handleServingsSelect(
  interaction: StringSelectMenuInteraction<CacheType>
): Promise<void> {
  const session = requireSession(interaction);
  if (!session) return sessionError(interaction);

  const slotIndex = parseInt(interaction.customId.replace('recipe_plan_servings_select_', ''), 10);
  if (Number.isNaN(slotIndex) || slotIndex < 0 || slotIndex > 6) {
    await interaction.editReply({ content: '❌ Invalid slot.' });
    return;
  }

  const servings = parseInt(interaction.values[0], 10);
  if (Number.isNaN(servings) || servings < 1 || servings > 50) {
    await interaction.editReply({ content: '❌ Invalid servings.' });
    return;
  }

  session.servingsCollected[slotIndex] = servings;

  const allFilled =
    session.selectedRecipeIds.length === 7 &&
    session.selectedRecipeIds.every(
      (_, idx) =>
        session.servingsCollected[idx] !== undefined && session.servingsCollected[idx] !== null
    );

  if (allFilled) {
    try {
      await finalizePlan(interaction, session);
    } catch (error) {
      logger.error('[RECIPE] Failed to finalize meal plan', {
        error: error instanceof Error ? error.message : 'Unknown error',
        guildId: session.guildId,
      });
      await interaction.editReply({
        content: `❌ Failed to finalize meal plan: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
    return;
  }

  // Re-render the servings selector (buttons view) so the user can pick the next meal.
  const recipes = await Recipe.getRecipes(session.guildId);
  const embed = buildServingsEmbed(session, recipes);
  const rows = buildServingsButtons(session, recipes);
  await interaction.editReply({ embeds: [embed], components: rows });
}

// ---------------------------------------------------------------------------
// Non-plan recipe flows: view, delete, edit, swap, week, history
// ---------------------------------------------------------------------------

function renderFullRecipeMarkdown(
  recipe: {
    name: string;
    servings: number | null;
    cuisine: string | null;
    difficulty: string | null;
    prep_time_minutes: number | null;
    cook_time_minutes: number | null;
    dietary_tags: string[] | null;
    ingredients: RecipeIngredient[];
    instructions: string[];
    nutrition?: {
      calories?: number;
      protein?: number;
      carbs?: number;
      fat?: number;
      fiber?: number;
      sugar?: number;
      sodium?: number;
    } | null;
    notes?: string | null;
    source_url?: string | null;
  },
  targetServings: number
): string {
  const baseline = recipe.servings ?? 1;
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
  if (recipe.servings !== null && targetServings !== recipe.servings) {
    lines.push(
      `_Scaled from ${recipe.servings} to ${targetServings} servings (factor: ${scale.toFixed(2)}x)._`
    );
    lines.push('');
  }
  lines.push('## Ingredients');
  lines.push('');
  for (const ing of recipe.ingredients) lines.push(scaleIngredient(ing, scale));
  lines.push('');
  lines.push('## Instructions');
  lines.push('');
  recipe.instructions.forEach((step, idx) => lines.push(`${idx + 1}. ${step}`));
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
  return lines.join('\n');
}

async function handleViewFull(interaction: ButtonInteraction<CacheType>): Promise<void> {
  const guildId = interaction.guild?.id;
  if (!guildId) {
    await interaction.editReply({ content: '❌ This command can only be used in a server.' });
    return;
  }
  const recipeId = parseInt(interaction.customId.replace('recipe_view_full_', ''), 10);
  if (Number.isNaN(recipeId)) {
    await interaction.editReply({ content: '❌ Invalid recipe.' });
    return;
  }
  const recipe = await Recipe.getRecipe(recipeId, guildId);
  if (!recipe) {
    await interaction.editReply({ content: '❌ Recipe not found.' });
    return;
  }
  const targetServings = recipe.servings ?? 1;
  const markdown = renderFullRecipeMarkdown(recipe, targetServings);
  const attachment = new AttachmentBuilder(Buffer.from(markdown, 'utf8')).setName(
    `${sanitizeFilename(recipe.name)}.md`
  );
  const embed = new EmbedBuilder().setTitle(`📄 ${recipe.name}`).setColor(0x00ff00);
  if (recipe.image_url) embed.setThumbnail(recipe.image_url);
  await interaction.editReply({ embeds: [embed], files: [attachment], components: [] });
}

async function handleDeleteConfirm(interaction: ButtonInteraction<CacheType>): Promise<void> {
  const guildId = interaction.guild?.id;
  if (!guildId) {
    await interaction.editReply({ content: '❌ This command can only be used in a server.' });
    return;
  }
  const recipeId = parseInt(interaction.customId.replace('recipe_delete_confirm_', ''), 10);
  if (Number.isNaN(recipeId)) {
    await interaction.editReply({ content: '❌ Invalid recipe.' });
    return;
  }
  const recipe = await Recipe.getRecipe(recipeId, guildId);
  if (!recipe) {
    await interaction.editReply({ content: '❌ Recipe not found.', components: [], embeds: [] });
    return;
  }
  const deleted = await Recipe.deleteRecipe(recipeId, guildId);
  if (!deleted) {
    await interaction.editReply({
      content: '❌ Failed to delete recipe.',
      components: [],
      embeds: [],
    });
    return;
  }
  const embed = new EmbedBuilder()
    .setTitle('🗑️ Recipe Deleted')
    .setDescription(`**${recipe.name}** has been deleted.`)
    .setColor(0xff0000)
    .setTimestamp();
  await interaction.editReply({ embeds: [embed], components: [] });
}

async function handleDeleteCancel(interaction: ButtonInteraction<CacheType>): Promise<void> {
  await interaction.editReply({
    content: '✅ Cancelled — recipe not deleted.',
    embeds: [],
    components: [],
  });
}

async function handleEditFieldSelect(
  interaction: StringSelectMenuInteraction<CacheType>
): Promise<void> {
  const guildId = interaction.guild?.id;
  if (!guildId) {
    await interaction.reply({
      content: '❌ This command can only be used in a server.',
      ephemeral: true,
    });
    return;
  }
  const recipeId = parseInt(interaction.customId.replace('recipe_edit_field_', ''), 10);
  const field = interaction.values[0];
  if (Number.isNaN(recipeId) || !field) {
    await interaction.reply({ content: '❌ Invalid edit target.', ephemeral: true });
    return;
  }
  const recipe = await Recipe.getRecipe(recipeId, guildId);
  if (!recipe) {
    await interaction.reply({ content: '❌ Recipe not found.', ephemeral: true });
    return;
  }

  const fieldLabels: Record<string, string> = {
    name: 'Name',
    ingredients: 'Ingredients (JSON)',
    instructions: 'Instructions (one per line)',
    servings: 'Servings',
    prep_time_minutes: 'Prep Time (minutes)',
    cook_time_minutes: 'Cook Time (minutes)',
    cuisine: 'Cuisine',
    difficulty: 'Difficulty (easy/medium/hard)',
    dietary_tags: 'Dietary Tags (comma-separated)',
    notes: 'Notes',
    image_url: 'Photo URL',
    nutrition: 'Nutrition (JSON)',
  };
  const label = fieldLabels[field];
  if (!label) {
    await interaction.reply({ content: `❌ Unknown field: ${field}`, ephemeral: true });
    return;
  }

  let currentValue = '';
  switch (field) {
    case 'name':
      currentValue = recipe.name;
      break;
    case 'ingredients':
      currentValue = JSON.stringify(recipe.ingredients);
      break;
    case 'instructions':
      currentValue = recipe.instructions.join('\n');
      break;
    case 'servings':
      currentValue = recipe.servings !== null ? String(recipe.servings) : '';
      break;
    case 'prep_time_minutes':
      currentValue = recipe.prep_time_minutes !== null ? String(recipe.prep_time_minutes) : '';
      break;
    case 'cook_time_minutes':
      currentValue = recipe.cook_time_minutes !== null ? String(recipe.cook_time_minutes) : '';
      break;
    case 'cuisine':
      currentValue = recipe.cuisine ?? '';
      break;
    case 'difficulty':
      currentValue = recipe.difficulty ?? '';
      break;
    case 'dietary_tags':
      currentValue = (recipe.dietary_tags ?? []).join(', ');
      break;
    case 'notes':
      currentValue = recipe.notes ?? '';
      break;
    case 'nutrition':
      currentValue = recipe.nutrition ? JSON.stringify(recipe.nutrition) : '';
      break;
    case 'image_url':
      currentValue = recipe.image_url ?? '';
      break;
  }

  const multiLineFields = new Set(['ingredients', 'instructions', 'notes', 'nutrition']);
  const style = multiLineFields.has(field) ? TextInputStyle.Paragraph : TextInputStyle.Short;
  const maxLen = multiLineFields.has(field) ? 4000 : 200;

  const modal = new ModalBuilder()
    .setCustomId(`recipe_edit_modal_${recipeId}_${field}`)
    .setTitle(truncateLabel(`Edit ${label}`, 45));
  const input = new TextInputBuilder()
    .setCustomId('recipe_edit_value')
    .setLabel(truncateLabel(label, 45))
    .setStyle(style)
    .setRequired(field === 'name')
    .setMaxLength(maxLen)
    .setValue(currentValue.substring(0, maxLen));
  modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
  await interaction.showModal(modal);
}

async function handleEditModal(interaction: ModalSubmitInteraction<CacheType>): Promise<void> {
  const guildId = interaction.guild?.id;
  if (!guildId) {
    await interaction.editReply({ content: '❌ This command can only be used in a server.' });
    return;
  }
  const rest = interaction.customId.replace('recipe_edit_modal_', '');
  const firstSep = rest.indexOf('_');
  if (firstSep === -1) {
    await interaction.editReply({ content: '❌ Invalid edit target.' });
    return;
  }
  const recipeId = parseInt(rest.substring(0, firstSep), 10);
  const field = rest.substring(firstSep + 1);
  if (Number.isNaN(recipeId) || !field) {
    await interaction.editReply({ content: '❌ Invalid edit target.' });
    return;
  }

  const raw = interaction.fields.getTextInputValue('recipe_edit_value');
  const update: RecipeUpdate = {};

  try {
    switch (field) {
      case 'name': {
        const v = raw.trim();
        if (!v) throw new Error('Name cannot be empty.');
        update.name = v;
        break;
      }
      case 'ingredients': {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) throw new Error('Ingredients must be a JSON array.');
        for (const ing of parsed) {
          if (!ing || typeof ing.name !== 'string') {
            throw new Error('Each ingredient must have a string `name`.');
          }
        }
        update.ingredients = parsed as RecipeIngredient[];
        break;
      }
      case 'instructions': {
        const lines = raw
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l.length > 0);
        if (lines.length === 0) throw new Error('Instructions cannot be empty.');
        update.instructions = lines;
        break;
      }
      case 'servings':
      case 'prep_time_minutes':
      case 'cook_time_minutes': {
        const v = raw.trim();
        if (v === '') {
          update[field] = null;
        } else {
          const n = parseInt(v, 10);
          if (Number.isNaN(n) || n < 0 || n > 10000) {
            throw new Error(`${field} must be a non-negative integer ≤ 10000.`);
          }
          update[field] = n;
        }
        break;
      }
      case 'cuisine': {
        const v = raw.trim().toLowerCase();
        update.cuisine = v === '' ? null : v;
        break;
      }
      case 'notes': {
        const v = raw.trim();
        update.notes = v === '' ? null : v;
        break;
      }
      case 'difficulty': {
        const v = raw.trim().toLowerCase();
        if (v === '') {
          update.difficulty = null;
        } else if (v !== 'easy' && v !== 'medium' && v !== 'hard') {
          throw new Error('Difficulty must be easy, medium, or hard.');
        } else {
          update.difficulty = v;
        }
        break;
      }
      case 'dietary_tags': {
        const tags = raw
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter((t) => t.length > 0);
        update.dietary_tags = tags;
        break;
      }
      case 'image_url': {
        const v = raw.trim();
        if (v === '') {
          update.image_url = null;
        } else if (!/^https?:\/\/\S+$/i.test(v)) {
          throw new Error('Photo URL must start with http:// or https://');
        } else {
          update.image_url = v;
        }
        break;
      }
      case 'nutrition': {
        const v = raw.trim();
        if (v === '') {
          update.nutrition = null;
        } else {
          const parsed = JSON.parse(v);
          if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new Error('Nutrition must be a JSON object.');
          }
          const allowed = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium'];
          const nutrition: RecipeNutrition = {};
          for (const key of allowed) {
            const val = (parsed as Record<string, unknown>)[key];
            if (val === undefined || val === null) continue;
            const num = typeof val === 'number' ? val : Number(val);
            if (!Number.isFinite(num) || num < 0) {
              throw new Error(`Nutrition field ${key} must be a non-negative number.`);
            }
            (nutrition as Record<string, number>)[key] = num;
          }
          update.nutrition = nutrition;
        }
        break;
      }
      default:
        throw new Error(`Unknown field: ${field}`);
    }
  } catch (err) {
    await interaction.editReply({
      content: `❌ Validation failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
    });
    return;
  }

  const updated = await Recipe.updateRecipe(recipeId, guildId, update);
  if (!updated) {
    await interaction.editReply({ content: '❌ Recipe not found.' });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(`✏️ Updated ${updated.name}`)
    .setDescription(`Field **${field}** was updated.`)
    .setColor(0x00ff00)
    .setTimestamp();
  await interaction.editReply({ embeds: [embed], components: [] });
}

async function handleSwapMealSelect(
  interaction: StringSelectMenuInteraction<CacheType>
): Promise<void> {
  const guildId = interaction.guild?.id;
  if (!guildId) {
    await interaction.editReply({ content: '❌ This command can only be used in a server.' });
    return;
  }
  const slotIndex = parseInt(interaction.customId.replace('recipe_swap_select_', ''), 10);
  if (Number.isNaN(slotIndex)) {
    await interaction.editReply({ content: '❌ Invalid slot.' });
    return;
  }
  const newRecipeId = parseInt(interaction.values[0], 10);
  if (Number.isNaN(newRecipeId)) {
    await interaction.editReply({ content: '❌ Invalid recipe.' });
    return;
  }

  const activePlan = await MealPlan.getActivePlan(guildId);
  if (!activePlan) {
    await interaction.editReply({ content: '❌ No active meal plan.' });
    return;
  }
  const currentServings = activePlan.servings_per_recipe[slotIndex];
  const newRecipe = await Recipe.getRecipe(newRecipeId, guildId);
  if (!newRecipe) {
    await interaction.editReply({ content: '❌ Replacement recipe not found.' });
    return;
  }

  const updated = await MealPlan.swapMeal(guildId, slotIndex, newRecipeId, currentServings);
  if (!updated) {
    await interaction.editReply({ content: '❌ Failed to swap meal.' });
    return;
  }

  // Regenerate shopping list
  const allRecipes = await Recipe.getRecipes(guildId);
  const meals: RecipeWithServings[] = updated.recipe_ids.map((id, idx) => {
    const r = allRecipes.find((rx) => rx.id === id);
    if (!r) throw new Error(`Recipe #${id} no longer exists.`);
    return { recipe: r, targetServings: updated.servings_per_recipe[idx] };
  });
  const { markdown } = await generateShoppingList(meals);
  const attachment = new AttachmentBuilder(Buffer.from(markdown, 'utf-8'), {
    name: 'Shopping-List.md',
  });

  const embed = new EmbedBuilder()
    .setTitle(`🔄 Swapped meal ${slotIndex + 1}`)
    .setDescription(`New meal: **${newRecipe.name}** (${currentServings} servings)`)
    .setColor(0x3498db)
    .setTimestamp();
  await interaction.editReply({ embeds: [embed], components: [], files: [attachment] });
}

async function handleWeekSelect(
  interaction: StringSelectMenuInteraction<CacheType>
): Promise<void> {
  const guildId = interaction.guild?.id;
  if (!guildId) {
    await interaction.editReply({ content: '❌ This command can only be used in a server.' });
    return;
  }
  // Value format: `${slotIndex}_${recipeId}`
  const value = interaction.values[0];
  const parts = value.split('_');
  if (parts.length !== 2) {
    await interaction.editReply({ content: '❌ Invalid selection.' });
    return;
  }
  const slotIndex = parseInt(parts[0], 10);
  const recipeId = parseInt(parts[1], 10);
  if (Number.isNaN(slotIndex) || Number.isNaN(recipeId)) {
    await interaction.editReply({ content: '❌ Invalid selection.' });
    return;
  }

  const activePlan = await MealPlan.getActivePlan(guildId);
  if (!activePlan) {
    await interaction.editReply({ content: '❌ No active meal plan.' });
    return;
  }
  const targetServings = activePlan.servings_per_recipe[slotIndex] ?? 1;
  const recipe = await Recipe.getRecipe(recipeId, guildId);
  if (!recipe) {
    await interaction.editReply({ content: '❌ Recipe not found.' });
    return;
  }

  const markdown = renderFullRecipeMarkdown(recipe, targetServings);
  const attachment = new AttachmentBuilder(Buffer.from(markdown, 'utf8')).setName(
    `${sanitizeFilename(recipe.name)}.md`
  );
  const embed = new EmbedBuilder()
    .setTitle(`📄 ${recipe.name} — scaled for ${targetServings}`)
    .setColor(0x00ff00);
  if (recipe.image_url) embed.setThumbnail(recipe.image_url);
  await interaction.editReply({ embeds: [embed], files: [attachment] });
}

async function handleHistorySelect(
  interaction: StringSelectMenuInteraction<CacheType>
): Promise<void> {
  const guildId = interaction.guild?.id;
  if (!guildId) {
    await interaction.editReply({ content: '❌ This command can only be used in a server.' });
    return;
  }
  const planId = parseInt(interaction.values[0], 10);
  if (Number.isNaN(planId)) {
    await interaction.editReply({ content: '❌ Invalid plan.' });
    return;
  }
  const plan = await MealPlan.getPlanById(planId, guildId);
  if (!plan) {
    await interaction.editReply({ content: '❌ Plan not found.' });
    return;
  }

  const recipes = await Promise.all(plan.recipe_ids.map((id) => Recipe.getRecipe(id, guildId)));
  const embed = new EmbedBuilder()
    .setTitle(`📚 Plan — Week of ${plan.week_start}`)
    .setColor(0x9b59b6);
  for (let i = 0; i < plan.recipe_ids.length; i++) {
    const r = recipes[i];
    const name = r?.name ?? '(deleted recipe)';
    const servings = plan.servings_per_recipe[i];
    embed.addFields({
      name: `${i + 1}. ${name}`,
      value: `${servings} servings${r?.cuisine ? ` • ${r.cuisine}` : ''}${r?.difficulty ? ` • ${r.difficulty}` : ''}`,
      inline: false,
    });
  }
  await interaction.editReply({ embeds: [embed], components: [] });
}

// ---------------------------------------------------------------------------
// Dispatchers (public entry points)
// ---------------------------------------------------------------------------

export async function handleRecipeButton(interaction: ButtonInteraction<CacheType>): Promise<void> {
  const customId = interaction.customId;

  if (customId === 'recipe_plan_mode_pick') return handlePickMode(interaction);
  if (customId === 'recipe_plan_mode_ai') return handleAIMode(interaction);
  if (customId === 'recipe_plan_pick_prev') return handlePickNav(interaction, 'prev');
  if (customId === 'recipe_plan_pick_next') return handlePickNav(interaction, 'next');
  if (customId === 'recipe_plan_accept_all') return handleAcceptAllAI(interaction);
  if (
    customId.startsWith('recipe_plan_swap_') &&
    !customId.startsWith('recipe_plan_swap_select_')
  ) {
    return handleSwapSlot(interaction);
  }
  if (customId.startsWith('recipe_plan_servings_')) return handleOpenServingsSelect(interaction);

  // Non-plan recipe buttons
  if (customId.startsWith('recipe_view_full_')) return handleViewFull(interaction);
  if (customId.startsWith('recipe_delete_confirm_')) return handleDeleteConfirm(interaction);
  if (customId === 'recipe_delete_cancel') return handleDeleteCancel(interaction);

  logger.warn('[RECIPE] Unknown recipe button customId', { customId });
  try {
    await interaction.editReply({ content: '❌ Unknown recipe action.' });
  } catch {
    // ignore
  }
}

export async function handleRecipeSelect(
  interaction: StringSelectMenuInteraction<CacheType>
): Promise<void> {
  const customId = interaction.customId;
  if (customId.startsWith('recipe_plan_swap_select_')) return handleSwapSelect(interaction);
  if (customId.startsWith('recipe_plan_servings_select_')) return handleServingsSelect(interaction);
  if (customId.startsWith('recipe_plan_pick_')) return handlePickSelect(interaction);

  // Non-plan recipe select menus
  if (customId.startsWith('recipe_edit_field_')) return handleEditFieldSelect(interaction);
  if (customId.startsWith('recipe_swap_select_')) return handleSwapMealSelect(interaction);
  if (customId === 'recipe_week_select') return handleWeekSelect(interaction);
  if (customId === 'recipe_history_select') return handleHistorySelect(interaction);

  logger.warn('[RECIPE] Unknown recipe select customId', { customId });
  try {
    await interaction.editReply({ content: '❌ Unknown recipe action.' });
  } catch {
    // ignore
  }
}

export async function handleRecipeModal(
  interaction: ModalSubmitInteraction<CacheType>
): Promise<void> {
  const customId = interaction.customId;
  if (customId.startsWith('recipe_edit_modal_')) return handleEditModal(interaction);

  logger.warn('[RECIPE] Unknown recipe modal customId', { customId });
  try {
    await interaction.editReply({ content: '❌ Unknown recipe action.' });
  } catch {
    // ignore
  }
}
