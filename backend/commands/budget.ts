import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction } from 'discord.js';
import { logger } from '../shared/utils/logger';
import Budget from '@database/models/Budget';

interface BudgetSummary {
  income: string;
  expenses: string;
  balance: string;
  categories: Array<{
    name: string;
    amount: string;
    percentage: string;
  }>;
  entryCount: number;
}

interface CategoryData {
  category: string;
  total: string;
  count: number;
}

interface MonthlyTrend {
  month: string;
  income: string;
  expenses: string;
  balance: string;
}

export default {
  data: new SlashCommandBuilder()
    .setName('budget')
    .setDescription('Track your budget and expenses')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('add')
        .setDescription('Add an expense')
        .addStringOption((option) =>
          option.setName('category').setDescription('Expense category').setRequired(true)
        )
        .addNumberOption((option) =>
          option.setName('amount').setDescription('Amount spent').setRequired(true)
        )
        .addStringOption((option) =>
          option.setName('description').setDescription('Description of expense').setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('income')
        .setDescription('Add income')
        .addNumberOption((option) =>
          option.setName('amount').setDescription('Income amount').setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('description')
            .setDescription('Income source/description')
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('summary')
        .setDescription('Show budget summary')
        .addIntegerOption((option) =>
          option
            .setName('month')
            .setDescription('Month number (1-12)')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(12)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('categories').setDescription('List spending by category')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('recent')
        .setDescription('Show recent transactions')
        .addIntegerOption((option) =>
          option
            .setName('limit')
            .setDescription('Number of transactions to show')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(25)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('trend')
        .setDescription('Show monthly spending trend')
        .addIntegerOption((option) =>
          option
            .setName('months')
            .setDescription('Number of months to show')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(12)
        )
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    // Note: Interaction is already deferred by bot.js for immediate acknowledgment

    const subcommand = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    const guildId = interaction.guild?.id;

    if (!guildId) {
      await interaction.editReply({
        content: 'This command can only be used in a server.',
      });
      return;
    }

    try {
      switch (subcommand) {
        case 'add': {
          const category = interaction.options.getString('category', true);
          const amount = interaction.options.getNumber('amount', true);
          const description = interaction.options.getString('description');

          if (amount <= 0) {
            await interaction.editReply({
              content: 'Amount must be greater than 0.',
            });
            return;
          }

          await Budget.addExpense(guildId, category, amount, description, userId);

          const embed = new EmbedBuilder()
            .setTitle('Expense Recorded')
            .setDescription(`💸 -$${amount.toFixed(2)}`)
            .addFields(
              { name: 'Category', value: category, inline: true },
              { name: 'Amount', value: `$${amount.toFixed(2)}`, inline: true }
            )
            .setColor(0xff0000)
            .setTimestamp();

          if (description) {
            embed.addFields({ name: 'Description', value: description });
          }

          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'income': {
          const amount = interaction.options.getNumber('amount', true);
          const description = interaction.options.getString('description');

          if (amount <= 0) {
            await interaction.editReply({
              content: 'Amount must be greater than 0.',
            });
            return;
          }

          await Budget.addIncome(guildId, amount, description, userId);

          const embed = new EmbedBuilder()
            .setTitle('Income Recorded')
            .setDescription(`💰 +$${amount.toFixed(2)}`)
            .addFields({ name: 'Amount', value: `$${amount.toFixed(2)}` })
            .setColor(0x00ff00)
            .setTimestamp();

          if (description) {
            embed.addFields({ name: 'Source', value: description });
          }

          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'summary': {
          const month = interaction.options.getInteger('month');
          const summary: BudgetSummary = await Budget.getSummary(guildId, month);

          const monthName = month
            ? new Date(2024, month - 1).toLocaleString('default', { month: 'long' })
            : 'Current Month';

          const embed = new EmbedBuilder()
            .setTitle(`Budget Summary - ${monthName}`)
            .addFields(
              { name: '💰 Income', value: `$${summary.income}`, inline: true },
              { name: '💸 Expenses', value: `$${summary.expenses}`, inline: true },
              { name: '💵 Balance', value: `$${summary.balance}`, inline: true }
            )
            .setColor(parseFloat(summary.balance) >= 0 ? 0x00ff00 : 0xff0000)
            .setTimestamp();

          if (summary.categories.length > 0) {
            const topCategories = summary.categories
              .slice(0, 5)
              .map((cat) => `${cat.name}: $${cat.amount} (${cat.percentage}%)`)
              .join('\n');
            embed.addFields({ name: 'Top Expense Categories', value: topCategories });
          }

          embed.setFooter({ text: `${summary.entryCount} transactions this month` });

          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'categories': {
          const categories: CategoryData[] = await Budget.getCategories(guildId);

          if (categories.length === 0) {
            await interaction.editReply({
              content: 'No expense categories found.',
            });
            return;
          }

          const embed = new EmbedBuilder()
            .setTitle('Spending by Category')
            .setColor(0x0099ff)
            .setTimestamp();

          const categoryList = categories
            .slice(0, 15)
            .map((cat, index) => {
              const bar = '█'.repeat(Math.floor(parseFloat(cat.total) / 100));
              return `${index + 1}. **${cat.category}**\n   $${cat.total} (${cat.count} transactions)\n   ${bar}`;
            })
            .join('\n\n');

          embed.setDescription(categoryList);

          if (categories.length > 15) {
            embed.setFooter({ text: `Showing 15 of ${categories.length} categories` });
          }

          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'recent': {
          const limit = interaction.options.getInteger('limit') || 10;
          const entries = await Budget.getRecentEntries(guildId, limit);

          if (entries.length === 0) {
            await interaction.editReply({
              content: 'No transactions found.',
            });
            return;
          }

          const embed = new EmbedBuilder()
            .setTitle('Recent Transactions')
            .setColor(0x0099ff)
            .setTimestamp();

          const transactionList = entries
            .map((entry) => {
              const emoji = entry.type === 'income' ? '💰' : '💸';
              const sign = entry.type === 'income' ? '+' : '-';
              const date = new Date(entry.date).toLocaleDateString();
              const desc = entry.description ? ` - ${entry.description}` : '';
              const amount = Number(entry.amount);
              return `${emoji} ${date} | **${sign}$${amount.toFixed(2)}** | ${entry.category}${desc}`;
            })
            .join('\n');

          embed.setDescription(transactionList);
          embed.setFooter({ text: `Showing ${entries.length} transactions` });

          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'trend': {
          const months = interaction.options.getInteger('months') || 6;
          const trend: MonthlyTrend[] = await Budget.getMonthlyTrend(guildId, months);

          const embed = new EmbedBuilder()
            .setTitle(`Budget Trend - Last ${months} Months`)
            .setColor(0x0099ff)
            .setTimestamp();

          const trendList = trend
            .map((month) => {
              const balance = parseFloat(month.balance);
              const balanceEmoji = balance >= 0 ? '✅' : '❌';
              return `**${month.month}**\n💰 Income: $${month.income}\n💸 Expenses: $${month.expenses}\n${balanceEmoji} Balance: $${month.balance}`;
            })
            .join('\n\n');

          embed.setDescription(trendList);

          await interaction.editReply({ embeds: [embed] });
          break;
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      logger.error('Error in budget command', {
        command: interaction.commandName,
        subcommand,
        error: errorMessage,
        stack: errorStack,
        userId: interaction.user.id,
        guildId: interaction.guild?.id,
      });

      const replyMessage = {
        content: 'An error occurred while processing your request.',
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(replyMessage);
      } else {
        await interaction.editReply(replyMessage);
      }
    }
  },
};
