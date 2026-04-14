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
  PlanSession,
} from '../../../commands/recipe';

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
    pending.length > 0 ? `\n\nFill servings for: ${pending.map((i) => i + 1).join(', ')}` : '';
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
  interaction: ModalSubmitInteraction<CacheType>,
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

  const { markdown, nutrition } = generateShoppingList(meals);
  const attachment = new AttachmentBuilder(Buffer.from(markdown, 'utf-8'), {
    name: 'Shopping-List.md',
  });

  const mealsList = meals
    .map((m, idx) => `**${idx + 1}.** ${m.recipe.name} — ${m.targetServings} servings`)
    .join('\n');

  const embed = new EmbedBuilder()
    .setTitle('✅ Meal Plan Created!')
    .setDescription(mealsList)
    .setColor(0x00ff00)
    .addFields(
      { name: '🔥 Weekly Calories', value: `${Math.round(nutrition.totalCalories)}`, inline: true },
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

async function handleOpenServingsModal(interaction: ButtonInteraction<CacheType>): Promise<void> {
  const session = requireSession(interaction);
  if (!session) {
    // Can't editReply — interaction is NOT deferred (see bot.ts modalButtons list).
    try {
      await interaction.reply({
        content:
          '❌ Your meal plan session has expired or was not found. Start again with `/recipe plan`.',
        ephemeral: true,
      });
    } catch {
      // ignore
    }
    return;
  }

  const slotIndex = parseInt(interaction.customId.replace('recipe_plan_servings_', ''), 10);
  if (Number.isNaN(slotIndex) || slotIndex < 0 || slotIndex > 6) {
    await interaction.reply({ content: '❌ Invalid slot.', ephemeral: true });
    return;
  }

  const recipes = await Recipe.getRecipes(session.guildId);
  const recipeId = session.selectedRecipeIds[slotIndex];
  const recipe = recipes.find((r) => r.id === recipeId);
  const name = recipe?.name ?? `Meal ${slotIndex + 1}`;

  const modal = new ModalBuilder()
    .setCustomId(`recipe_plan_servings_modal_${slotIndex}`)
    .setTitle(truncateLabel(`Servings: ${name}`, 45));

  const defaultServings = recipe?.servings ? String(recipe.servings) : '';
  const input = new TextInputBuilder()
    .setCustomId('recipe_plan_servings_value')
    .setLabel('Number of servings (1-50)')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMinLength(1)
    .setMaxLength(2)
    .setValue(defaultServings);

  modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));

  await interaction.showModal(modal);
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

async function handleServingsModal(interaction: ModalSubmitInteraction<CacheType>): Promise<void> {
  const session = requireSession(interaction);
  if (!session) return sessionError(interaction);

  const slotIndex = parseInt(interaction.customId.replace('recipe_plan_servings_modal_', ''), 10);
  if (Number.isNaN(slotIndex) || slotIndex < 0 || slotIndex > 6) {
    await interaction.editReply({ content: '❌ Invalid slot.' });
    return;
  }

  const raw = interaction.fields.getTextInputValue('recipe_plan_servings_value').trim();
  const servings = parseInt(raw, 10);
  if (Number.isNaN(servings) || servings < 1 || servings > 50) {
    await interaction.editReply({
      content: '❌ Invalid servings. Enter a whole number from 1 to 50.',
    });
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

  // Modal's reply is ephemeral/separate; update the main plan message via followUp not needed.
  // Instead, acknowledge and re-render the servings selector as the modal reply.
  const recipes = await Recipe.getRecipes(session.guildId);
  const embed = buildServingsEmbed(session, recipes);
  const rows = buildServingsButtons(session, recipes);
  await interaction.editReply({ embeds: [embed], components: rows });
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
  if (customId.startsWith('recipe_plan_servings_')) return handleOpenServingsModal(interaction);

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
  if (customId.startsWith('recipe_plan_pick_')) return handlePickSelect(interaction);

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
  if (customId.startsWith('recipe_plan_servings_modal_')) return handleServingsModal(interaction);

  logger.warn('[RECIPE] Unknown recipe modal customId', { customId });
  try {
    await interaction.editReply({ content: '❌ Unknown recipe action.' });
  } catch {
    // ignore
  }
}
