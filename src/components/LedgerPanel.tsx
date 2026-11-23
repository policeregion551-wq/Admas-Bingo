import { useMemo, useState } from 'react';
import { formatEtb, getDict } from '../i18n';
import { BingoRound, Language, UserAccount, WalletTransaction } from '../types';

interface LedgerPanelProps {
  lang: Language;
  account: UserAccount;
  transactions: WalletTransaction[];
  bingoRounds: BingoRound[];
}

type TxFilter = 'all' | 'bonus' | 'deposit' | 'bingo' | 'withdraw';

export function LedgerPanel({
  lang,
  account,
  transactions,
  bingoRounds,
}: LedgerPanelProps) {
  const t = getDict(lang);
  const [filter, setFilter] = useState<TxFilter>('all');

  const filteredTx = useMemo(() => {
    if (filter === 'all') return transactions;
    if (filter === 'bonus') return transactions.filter((tx) => tx.type === 'daily_bonus');
    if (filter === 'deposit') return transactions.filter((tx) => tx.type === 'deposit');
    if (filter === 'withdraw') return transactions.filter((tx) => tx.type === 'withdrawal');
    return transactions.filter(
      (tx) => tx.type === 'bingo_wager' || tx.type === 'bingo_win'
    );
  }, [transactions, filter]);

  return (
    <section className="space-y-8">
      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-[#0c291f] border border-white/10 rounded-2xl p-5 space-y-1">
          <p className="text-xs text-[#9fb3aa]">{t.totalClaimed}</p>
          <p className="font-mono-num text-xl font-bold text-[#facc15]">
            {formatEtb(account.totalBonusClaimed)} {t.etb}
          </p>
        </div>
        <div className="bg-[#0c291f] border border-white/10 rounded-2xl p-5 space-y-1">
          <p className="text-xs text-[#9fb3aa]">{t.totalDeposited}</p>
          <p className="font-mono-num text-xl font-bold text-emerald-300">
            {formatEtb(account.totalDeposited ?? 0)} {t.etb}
          </p>
        </div>
        <div className="bg-[#0c291f] border border-white/10 rounded-2xl p-5 space-y-1">
          <p className="text-xs text-[#9fb3aa]">{t.totalWithdrawn}</p>
          <p className="font-mono-num text-xl font-bold text-[#f4f1ea]">
            {formatEtb(account.totalWithdrawn)} {t.etb}
          </p>
        </div>
        <div className="bg-[#0c291f] border border-white/10 rounded-2xl p-5 space-y-1">
          <p className="text-xs text-[#9fb3aa]">{t.totalWon}</p>
          <p className="font-mono-num text-xl font-bold text-emerald-300">
            {formatEtb(account.totalWon)} {t.etb}
          </p>
        </div>
        <div className="bg-[#0c291f] border border-white/10 rounded-2xl p-5 space-y-1">
          <p className="text-xs text-[#9fb3aa]">{t.winRate}</p>
          <p className="font-mono-num text-xl font-bold text-[#f4f1ea]">
            {account.gamesPlayed} / {account.gamesWon}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Transactions Table */}
        <div className="lg:col-span-7 bg-[#0c291f] border border-white/10 rounded-2xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
            <h2 className="font-display text-xl font-bold text-[#f4f1ea]">
              {t.ledgerTitle}
            </h2>

            <div className="flex flex-wrap items-center gap-1 p-1 bg-black/25 rounded-lg border border-white/10">
              {(
                [
                  { id: 'all', label: t.filterAll },
                  { id: 'bonus', label: t.filterBonus },
                  { id: 'deposit', label: t.filterDeposit },
                  { id: 'bingo', label: t.filterBingo },
                  { id: 'withdraw', label: t.filterWithdraw },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    filter === tab.id
                      ? 'bg-[#eab308] text-[#071f17] font-semibold'
                      : 'text-[#cbd5d0] hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {filteredTx.length === 0 ? (
            <p className="text-sm text-[#9fb3aa] py-10 text-center">{t.noTransactions}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-xs text-[#9fb3aa]">
                    <th className="py-2.5 pr-4 font-medium">Description</th>
                    <th className="py-2.5 px-4 font-medium text-right">Amount</th>
                    <th className="py-2.5 pl-4 font-medium text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 text-sm">
                  {filteredTx.map((tx) => (
                    <tr key={tx.id}>
                      <td className="py-3 pr-4">
                        <p className="font-medium text-[#f4f1ea]">{tx.description}</p>
                        <p className="text-xs text-[#9fb3aa] font-mono-num">
                          {tx.referenceId} ·{' '}
                          {tx.createdAt ? tx.createdAt.toDate().toLocaleString() : 'Just now'}
                        </p>
                      </td>
                      <td
                        className={`py-3 px-4 font-mono-num font-semibold text-right whitespace-nowrap ${
                          tx.direction === 'credit' ? 'text-emerald-300' : 'text-amber-300'
                        }`}
                      >
                        {tx.direction === 'credit' ? '+' : '-'}
                        {formatEtb(tx.amount)} {t.etb}
                      </td>
                      <td className="py-3 pl-4 font-mono-num text-right text-[#cbd5d0] whitespace-nowrap">
                        {formatEtb(tx.balanceAfter)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Bingo Rounds History */}
        <div className="lg:col-span-5 bg-[#0c291f] border border-white/10 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <h3 className="font-display text-xl font-bold text-[#f4f1ea]">
              {t.navArena}
            </h3>
            <span className="font-mono-num text-xs text-[#9fb3aa]">{bingoRounds.length}</span>
          </div>

          {bingoRounds.length === 0 ? (
            <p className="text-sm text-[#9fb3aa] py-10 text-center">{t.noTransactions}</p>
          ) : (
            <ul className="divide-y divide-white/10">
              {bingoRounds.map((round) => (
                <li key={round.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-[#f4f1ea]">
                      {round.outcome === 'won'
                        ? `${t.patternNames[round.pattern]} · ${round.multiplier}x`
                        : `${round.ballsDrawnCount} Balls · No Line`}
                    </p>
                    <p className="text-xs text-[#9fb3aa] font-mono-num">
                      {t.selectStake}: {formatEtb(round.stake)} {t.etb} · {round.ballsDrawnCount}{' '}
                      balls
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={`font-mono-num text-sm font-bold ${
                        round.outcome === 'won' ? 'text-[#facc15]' : 'text-[#9fb3aa]'
                      }`}
                    >
                      {round.outcome === 'won'
                        ? `+${formatEtb(round.payout)} ${t.etb}`
                        : `-${formatEtb(round.stake)} ${t.etb}`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
