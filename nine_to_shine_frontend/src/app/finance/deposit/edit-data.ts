import type {
  FinanceDto,
  FinanceVersionReference,
  GameDto,
  UserDto,
} from '@/definitions/types';
import type { FormInput } from '@/schema/deposit';
import { STD_CLUB, STD_MEMBER } from '@/schema/deposit';

export interface DepositEditData {
  defaultValues: FormInput;
  transactions: FinanceVersionReference[];
  unmatchedDuesCount: number;
  blockingError?: string;
}

const BASE_DESCRIPTION = 'Mitgliedsbeitrag';
const NOTE_PREFIX = `${BASE_DESCRIPTION} - `;

const toDateInput = (value: string) => new Date(value).toISOString().slice(0, 10);
const sumMoney = (transactions: FinanceDto[]) =>
  transactions.reduce(
    (totalCents, transaction) =>
      totalCents + Math.round(transaction.amount * 100),
    0
  ) / 100;

const parseMemberNote = (description?: string): string | null => {
  const normalized = description?.trim() ?? '';
  if (normalized === '' || normalized === BASE_DESCRIPTION) return '';
  if (normalized.startsWith(NOTE_PREFIX)) return normalized.slice(NOTE_PREFIX.length);
  return null;
};

export function buildDepositEditData(
  users: UserDto[],
  game: GameDto,
  transactions: FinanceDto[]
): DepositEditData {
  const incomeDues = transactions.filter(
    (transaction) =>
      transaction.direction === 'income' && transaction.category === 'DUES'
  );
  const usersById = new Map(users.map((user) => [user.id, user]));
  const memberDues = incomeDues.filter(
    (transaction) =>
      typeof transaction.userId === 'number' && usersById.has(transaction.userId)
  );
  const anonymousDues = incomeDues.filter(
    (transaction) => typeof transaction.userId !== 'number'
  );
  const otherIncomes = transactions.filter(
    (transaction) =>
      transaction.direction === 'income' &&
      transaction.category === 'OTHER' &&
      typeof transaction.userId !== 'number'
  );

  const clubDuesByUserId = new Map<number, FinanceDto[]>();
  const matchedClubIds = new Set<number>();

  for (const transaction of anonymousDues) {
    const matches = users.filter((user) =>
      transaction.description?.trim().endsWith(` (${user.displayName})`)
    );

    if (matches.length !== 1) continue;

    const user = matches[0];
    const rows = clubDuesByUserId.get(user.id) ?? [];
    rows.push(transaction);
    clubDuesByUserId.set(user.id, rows);
    matchedClubIds.add(transaction.id);
  }

  const representedTransactions = [
    ...memberDues,
    ...anonymousDues.filter((transaction) => matchedClubIds.has(transaction.id)),
    ...otherIncomes,
  ];
  const representedDates = new Set(
    representedTransactions.map((transaction) => toDateInput(transaction.occurredAt))
  );

  let blockingError: string | undefined;
  if (representedDates.size > 1) {
    blockingError =
      'Die vorhandenen Einzahlungen haben unterschiedliche Buchungsdaten und können nicht gemeinsam bearbeitet werden.';
  }

  const entries = users.map((user) => {
    const userMemberDues = memberDues.filter(
      (transaction) => transaction.userId === user.id
    );
    const userClubDues = clubDuesByUserId.get(user.id) ?? [];
    const notes: Array<string | null> = [
      ...userMemberDues.map((transaction) =>
        parseMemberNote(transaction.description)
      ),
      ...userClubDues.map((transaction) => {
        const suffix = ` (${user.displayName})`;
        const description = transaction.description?.trim() ?? '';
        return parseMemberNote(description.slice(0, -suffix.length));
      }),
    ];
    const validNotes = notes.filter((note): note is string => note !== null);
    const uniqueNotes = new Set(validNotes);

    if (
      !blockingError &&
      (validNotes.length !== notes.length || uniqueNotes.size > 1)
    ) {
      blockingError = `Die Beschreibung der Beiträge für ${user.displayName} ist nicht eindeutig.`;
    }

    const memberAmount = sumMoney(userMemberDues);
    const clubAmount = sumMoney(userClubDues);
    const hasPaid = memberAmount > 0 || clubAmount > 0;

    return {
      userId: user.id,
      displayName: user.displayName,
      useStandard: true,
      hasPaid,
      description: validNotes[0] ?? '',
      memberAmount:
        memberAmount > 0 ? String(memberAmount) : hasPaid ? '0' : STD_MEMBER,
      clubAmount: clubAmount > 0 ? String(clubAmount) : hasPaid ? '0' : STD_CLUB,
    };
  });

  return {
    defaultValues: {
      globalDate:
        representedDates.values().next().value ?? toDateInput(game.playedAt),
      seasonId: game.seasonId,
      gameId: game.id,
      entries,
      otherIncomes:
        otherIncomes.length > 0
          ? otherIncomes.map((transaction) => ({
              amount: String(transaction.amount),
              description: transaction.description ?? '',
            }))
          : [{ amount: '', description: '' }],
    },
    transactions: representedTransactions.map(({ id, updatedAt }) => ({
      id,
      updatedAt,
    })),
    unmatchedDuesCount: anonymousDues.length - matchedClubIds.size,
    blockingError,
  };
}
