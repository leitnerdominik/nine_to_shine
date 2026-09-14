const GAME_EMOJI_RULES: ReadonlyArray<{
  keywords: readonly string[];
  emoji: string;
}> = [
  { keywords: ['sudoku'], emoji: '🔢' },
  { keywords: ['basketball'], emoji: '🏀' },
  { keywords: ['stadt-land-fluss', 'stadt land fluss'], emoji: '🗺️' },
  { keywords: ['calcetto'], emoji: '⚽' },
  { keywords: ['trackmania'], emoji: '🏎️' },
  { keywords: ['triathlon'], emoji: '🏃' },
  { keywords: ['steinschleuder'], emoji: '🎯' },
  { keywords: ['minigolf', 'minigold'], emoji: '⛳' },
  { keywords: ['cornhole'], emoji: '🎯' },
  { keywords: ['warzone'], emoji: '🎮' },
  { keywords: ['watten', 'poker'], emoji: '🃏' },
  { keywords: ['eisstock'], emoji: '🥌' },
  { keywords: ['bowling', 'kegeln'], emoji: '🎳' },
  { keywords: ['pubquiz', 'pub quiz', 'quiz'], emoji: '💡' },
  {
    keywords: [
      'tischtennis',
      'tisch tennis',
      'table tennis',
      'ping pong',
      'pingpong',
    ],
    emoji: '🏓',
  },
  { keywords: ['schach', 'chess'], emoji: '♟️' },
  { keywords: ['darts', 'dart'], emoji: '🎯' },
  {
    keywords: [
      'kicker',
      'fußball',
      'fussball',
      'fuaßboll',
      'fuassboll',
      'tischfußball',
      'tischfussball',
      'table football',
      'foosball',
    ],
    emoji: '⚽',
  },
];

export function getGameEmoji(gameName: string): string {
  const normalizedName = gameName.toLocaleLowerCase('de-DE');
  return (
    GAME_EMOJI_RULES.find(({ keywords }) =>
      keywords.some((keyword) => normalizedName.includes(keyword))
    )?.emoji ?? '🎮'
  );
}
