import { Command } from 'commander';
import { Store, type Game } from './store.js';
import chalk from 'chalk';
import { select, input, confirm } from '@inquirer/prompts';

const program = new Command();
const store = new Store();

const STATUS_OPTIONS: { name: string; value: Game['status'] }[] = [
  { name: 'To Play', value: 'to-play' },
  { name: 'Playing', value: 'playing' },
  { name: 'Finished', value: 'finished' },
  { name: 'Dropped', value: 'dropped' },
];

async function addGameInteractive(name?: string, options: { status?: string, notes?: string } = {}) {
  let gameName = name;
  if (!gameName) {
    gameName = await input({ message: 'Enter game name:', validate: (val) => val.trim() !== '' ? true : 'Name is required' });
  }

  let status = options.status;
  if (!status) {
    status = await select({
      message: 'Select initial status:',
      choices: STATUS_OPTIONS,
    });
  }

  let notes = options.notes;
  if (name === undefined && notes === undefined) {
     notes = await input({ message: 'Enter notes (optional):' });
  }

  const game = store.addGame({
    name: gameName,
    status: status as Game['status'],
    notes: notes || undefined,
    tags: []
  });
  await store.save(`Add game: ${gameName}`);
  console.log(chalk.green(`✔ Added "${gameName}" (ID: ${game.id})`));
}

function listGames(status?: string) {
  let games = store.getGames();
  if (status) {
    games = games.filter(g => g.status === status);
  }

  if (games.length === 0) {
    console.log(chalk.yellow('No games found.'));
    return;
  }

  console.log(chalk.bold('\nGame Queue:'));
  games.forEach(g => {
    const statusColor = g.status === 'playing' ? chalk.cyan : g.status === 'finished' ? chalk.green : chalk.gray;
    console.log(`- ${chalk.bold(g.name)} [${statusColor(g.status)}] ${g.notes ? `(${g.notes})` : ''}`);
  });
  console.log('');
}

async function updateGameInteractive(identifier?: string, options: { status?: string, notes?: string } = {}) {
  let targetId = identifier;
  const games = store.getGames();

  if (games.length === 0) {
    console.log(chalk.yellow('No games to update.'));
    return;
  }

  if (!targetId) {
    targetId = await select({
      message: 'Select a game to update:',
      choices: games.map(g => ({ name: `${g.name} [${g.status}]`, value: g.id })),
    });
  }

  let status = options.status;
  let notes = options.notes;

  if (!status && !notes) {
    const action = await select({
      message: 'What do you want to update?',
      choices: [
        { name: 'Status', value: 'status' },
        { name: 'Notes', value: 'notes' },
        { name: 'Both', value: 'both' },
      ]
    });

    if (action === 'status' || action === 'both') {
      status = await select({
        message: 'Update status to:',
        choices: STATUS_OPTIONS,
      });
    }
    if (action === 'notes' || action === 'both') {
      notes = await input({ message: 'Enter new notes:' });
    }
  }

  const updated = store.updateGame(targetId, {
    status: status as Game['status'],
    notes: notes || undefined
  });

  if (updated) {
    await store.save(`Update game: ${updated.name}`);
    console.log(chalk.green(`✔ Updated "${updated.name}"`));
  } else {
    console.log(chalk.red(`✘ Game "${targetId}" not found.`));
  }
}

async function removeGameInteractive(identifier?: string) {
  let targetId = identifier;
  const games = store.getGames();

  if (games.length === 0) {
    console.log(chalk.yellow('No games to remove.'));
    return;
  }

  if (!targetId) {
    targetId = await select({
      message: 'Select a game to remove:',
      choices: games.map(g => ({ name: `${g.name} [${g.status}]`, value: g.id })),
    });
  }

  const gameToRemove = games.find(g => g.id === targetId || g.name === targetId);
  if (!gameToRemove) {
    console.log(chalk.red(`✘ Game "${targetId}" not found.`));
    return;
  }

  const confirmed = await confirm({ message: `Are you sure you want to remove "${gameToRemove.name}"?`, default: false });
  if (!confirmed) return;

  const removed = store.removeGame(targetId);
  if (removed) {
    await store.save(`Remove game: ${removed.name}`);
    console.log(chalk.green(`✔ Removed "${removed.name}"`));
  }
}

async function mainInteractive() {
  console.log(chalk.bold.blue('\n--- Game Queue Manager ---\n'));
  
  while (true) {
    const action = await select({
      message: 'What would you like to do?',
      choices: [
        { name: 'Add a game', value: 'add' },
        { name: 'List games', value: 'list' },
        { name: 'Update a game', value: 'update' },
        { name: 'Remove a game', value: 'remove' },
        { name: 'Exit', value: 'exit' },
      ]
    });

    if (action === 'exit') break;

    switch (action) {
      case 'add':
        await addGameInteractive();
        break;
      case 'list':
        listGames();
        break;
      case 'update':
        await updateGameInteractive();
        break;
      case 'remove':
        await removeGameInteractive();
        break;
    }
    console.log('');
  }
}

program
  .name('game-queue')
  .description('Manage your game backlog with Git-backed storage')
  .version('1.0.0');

program
  .command('add <name>')
  .description('Add a new game to the queue')
  .option('-s, --status <status>', 'Initial status')
  .option('-n, --notes <notes>', 'Optional notes')
  .action(async (name, options) => {
    await addGameInteractive(name, options);
  });

program
  .command('list')
  .description('List all games')
  .option('-s, --status <status>', 'Filter by status')
  .action((options) => {
    listGames(options.status);
  });

program
  .command('update <identifier>')
  .description('Update a game by ID or name')
  .option('-s, --status <status>', 'New status')
  .option('-n, --notes <notes>', 'New notes')
  .action(async (identifier, options) => {
    await updateGameInteractive(identifier, options);
  });

program
  .command('remove <identifier>')
  .description('Remove a game by ID or name')
  .action(async (identifier) => {
    await removeGameInteractive(identifier);
  });

// If no arguments provided, enter interactive mode
if (process.argv.length <= 2) {
  mainInteractive();
} else {
  program.parse(process.argv);
}
