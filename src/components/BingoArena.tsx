import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Pause,
  Play,
  RotateCcw,
  Shuffle,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { formatEtb, getDict, MAX_BALLS_PER_ROUND } from '../i18n';
import { settleBingoRound, startBingoWager } from '../services/walletService';
import {
  ActiveTab,
  BingoCell,
  DrawMode,
  GamePhase,
  Language,
  UserAccount,
  WinPattern,
} from '../types';
import {
  BINGO_LETTERS,
  createShuffledDeck,
  evaluateBingoCard,
  generateBingoCard,
  getLetterForNumber,
  getMultiplierForBallCount,
} from '../utils/bingoEngine';
import {
  playBallCallSound,
  playBingoWinSound,
  playDaubSound,
  playMissSound,
} from '../utils/sound';

interface BingoArenaProps {
  lang: Language;
  account: UserAccount;
  soundEnabled: boolean;
  onNavigate: (tab: ActiveTab) => void;
}

const FELT_IMG = '/src/assets/images/bingo_felt_table_1795439384947.jpg';
const PRESET_STAKES = [500, 1000, 5000, 10000, 25000, 50000];

export function BingoArena({ lang, account, soundEnabled, onNavigate }: BingoArenaProps) {
  const t = getDict(lang);

  const [phase, setPhase] = useState<GamePhase>('TITLE_MENU');
  const [stake, setStake] = useState<number>(5000);
  const [drawMode, setDrawMode] = useState<DrawMode>('auto_normal');
  const [autoDaub, setAutoDaub] = useState<boolean>(true);
  const [card, setCard] = useState<BingoCell[][]>(() => generateBingoCard());
  const [deck, setDeck] = useState<number[]>([]);
  const [calledBalls, setCalledBalls] = useState<number[]>([]);
  const [activeRoundId, setActiveRoundId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [settling, setSettling] = useState(false);
  const [hintMsg, setHintMsg] = useState<string | null>(null);
  const [feltFailed, setFeltFailed] = useState(false);
  const [summary, setSummary] = useState<{
    outcome: 'won' | 'lost';
    pattern: WinPattern;
    multiplier: number;
    payout: number;
    ballsCount: number;
    winningCoords: string[];
  } | null>(null);

  const accountRef = useRef(account);
  accountRef.current = account;
  const settledRef = useRef(false);

  const calledSet = useMemo(() => new Set(calledBalls), [calledBalls]);
  const lastBall = calledBalls.length > 0 ? calledBalls[calledBalls.length - 1] : null;
  const recentBalls = useMemo(() => calledBalls.slice(-6).reverse(), [calledBalls]);

  const winEvaluation = useMemo(
    () => evaluateBingoCard(card, calledSet),
    [card, calledSet]
  );

  const finishRoundAsLoss = useCallback(
    async (roundId: string, roundStake: number, ballsCount: number) => {
      if (settledRef.current) return;
      settledRef.current = true;
      setSettling(true);
      try {
        await settleBingoRound(accountRef.current, {
          roundId,
          stake: roundStake,
          payout: 0,
          multiplier: 0,
          ballsDrawnCount: ballsCount,
          pattern: 'none',
          outcome: 'lost',
        });
        playMissSound(soundEnabled);
        setSummary({
          outcome: 'lost',
          pattern: 'none',
          multiplier: 0,
          payout: 0,
          ballsCount,
          winningCoords: [],
        });
        setPhase('ROUND_SUMMARY');
      } catch (err) {
        settledRef.current = false;
        setHintMsg(err instanceof Error ? err.message : 'Unable to settle round');
      } finally {
        setSettling(false);
      }
    },
    [soundEnabled]
  );

  const drawNextBall = useCallback(() => {
    if (phase !== 'PLAYING' || settling) return;
    if (calledBalls.length >= MAX_BALLS_PER_ROUND || calledBalls.length >= deck.length) {
      if (activeRoundId) {
        finishRoundAsLoss(activeRoundId, stake, calledBalls.length);
      }
      return;
    }

    const nextNumber = deck[calledBalls.length];
    const nextCalled = [...calledBalls, nextNumber];
    setCalledBalls(nextCalled);
    setHintMsg(null);
    playBallCallSound(soundEnabled);

    if (autoDaub) {
      setCard((prev) =>
        prev.map((row) =>
          row.map((cell) =>
            cell.value === nextNumber ? { ...cell, daubed: true } : cell
          )
        )
      );
    }

    if (nextCalled.length >= MAX_BALLS_PER_ROUND && activeRoundId) {
      // Allow a brief pause so player sees the 52nd ball; if autoDaub creates a win, don't auto-lose immediately
      const updatedGrid = autoDaub
        ? card.map((row) =>
            row.map((cell) =>
              cell.value === nextNumber ? { ...cell, daubed: true } : cell
            )
          )
        : card;
      const evalAtEnd = evaluateBingoCard(updatedGrid, new Set(nextCalled));
      if (!evalAtEnd.hasWin) {
        window.setTimeout(() => {
          finishRoundAsLoss(activeRoundId, stake, nextCalled.length);
        }, 700);
      }
    }
  }, [
    activeRoundId,
    autoDaub,
    calledBalls,
    card,
    deck,
    finishRoundAsLoss,
    phase,
    settling,
    soundEnabled,
    stake,
  ]);

  useEffect(() => {
    if (phase !== 'PLAYING' || drawMode === 'manual' || settling) return;
    if (calledBalls.length >= MAX_BALLS_PER_ROUND) return;

    const intervalMs = drawMode === 'auto_fast' ? 800 : 1500;
    const timer = window.setTimeout(() => {
      drawNextBall();
    }, intervalMs);

    return () => window.clearTimeout(timer);
  }, [phase, drawMode, calledBalls.length, settling, drawNextBall]);

  const handleShufflePreview = () => {
    if (phase !== 'TITLE_MENU') return;
    setCard(generateBingoCard());
    playDaubSound(soundEnabled);
  };

  const handleStartRound = async () => {
    if (starting || stake <= 0 || stake > account.balance) return;
    setStarting(true);
    setHintMsg(null);
    settledRef.current = false;
    try {
      const roundId = await startBingoWager(accountRef.current, stake);
      const freshDeck = createShuffledDeck();
      const firstBall = freshDeck[0];
      const initialCard = card.map((row) =>
        row.map((cell) => ({
          ...cell,
          daubed: cell.value === 'FREE' || (autoDaub && cell.value === firstBall),
        }))
      );

      setCard(initialCard);
      setDeck(freshDeck);
      setCalledBalls([firstBall]);
      setActiveRoundId(roundId);
      setSummary(null);
      setPhase('PLAYING');
      playBallCallSound(soundEnabled);
    } catch (err) {
      setHintMsg(err instanceof Error ? err.message : 'Unable to start round');
    } finally {
      setStarting(false);
    }
  };

  const handleCellClick = (rowIdx: number, colIdx: number) => {
    if (phase !== 'PLAYING' && phase !== 'PAUSED') return;
    const cell = card[rowIdx][colIdx];
    if (cell.value === 'FREE') return;
    if (!calledSet.has(cell.value)) {
      playMissSound(soundEnabled);
      return;
    }

    playDaubSound(soundEnabled);
    setHintMsg(null);
    setCard((prev) =>
      prev.map((row, r) =>
        row.map((c, col) =>
          r === rowIdx && col === colIdx ? { ...c, daubed: !c.daubed } : c
        )
      )
    );
  };

  const handleCallBingo = async () => {
    if (
      (phase !== 'PLAYING' && phase !== 'PAUSED') ||
      settling ||
      settledRef.current ||
      !activeRoundId
    ) {
      return;
    }

    if (!winEvaluation.hasWin) {
      playMissSound(soundEnabled);
      setHintMsg(t.notEnoughPattern);
      return;
    }

    settledRef.current = true;
    setSettling(true);
    setHintMsg(null);
    const ballsCount = calledBalls.length;
    const multiplier = getMultiplierForBallCount(ballsCount);
    const payout = Math.round(stake * multiplier);

    try {
      await settleBingoRound(accountRef.current, {
        roundId: activeRoundId,
        stake,
        payout,
        multiplier,
        ballsDrawnCount: ballsCount,
        pattern: winEvaluation.pattern,
        outcome: 'won',
      });
      playBingoWinSound(soundEnabled);
      setSummary({
        outcome: 'won',
        pattern: winEvaluation.pattern,
        multiplier,
        payout,
        ballsCount,
        winningCoords: winEvaluation.winningCoords,
      });
      setPhase('ROUND_SUMMARY');
    } catch (err) {
      settledRef.current = false;
      setHintMsg(err instanceof Error ? err.message : 'Unable to settle round');
    } finally {
      setSettling(false);
    }
  };

  const handlePlayAgain = () => {
    setCard(generateBingoCard());
    setDeck([]);
    setCalledBalls([]);
    setActiveRoundId(null);
    setSummary(null);
    setHintMsg(null);
    setPhase('TITLE_MENU');
  };

  const canAffordStake = stake > 0 && stake <= account.balance;
  const currentPotentialMultiplier = getMultiplierForBallCount(Math.max(1, calledBalls.length));

  return (
    <section className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#0b2a1f]">
      {/* Subtle Felt Table Backdrop */}
      {!feltFailed && (
        <div className="absolute inset-0 pointer-events-none opacity-25">
          <img
            src={FELT_IMG}
            alt="Emerald felt bingo table"
            referrerPolicy="no-referrer"
            onError={() => setFeltFailed(true)}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#071f17]/80 via-[#071f17]/65 to-[#071f17]/90" />
        </div>
      )}

      <div className="relative z-10 p-5 sm:p-8 space-y-6">
        {/* Arena Top Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-white/10">
          <div className="space-y-1">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#f4f1ea]">
              {t.arenaTitle}
            </h2>
            <p className="text-xs sm:text-sm text-[#cbd5d0]">
              {t.tier1} <span aria-hidden="true">·</span> {t.tier2} <span aria-hidden="true">·</span> {t.tier3}
            </p>
          </div>

          {phase === 'PLAYING' || phase === 'PAUSED' ? (
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-[#9fb3aa]">{t.ballsDrawn}</p>
                <p className="font-mono-num text-lg font-bold text-[#facc15]">
                  {calledBalls.length} / {MAX_BALLS_PER_ROUND}
                </p>
              </div>
              <div className="h-8 w-px bg-white/15" />
              <div className="text-right">
                <p className="text-xs text-[#9fb3aa]">Multiplier</p>
                <p className="font-mono-num text-lg font-bold text-emerald-300">
                  {currentPotentialMultiplier}x
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Main 2-Column Arena */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left / Center: 5x5 Interactive Bingo Card */}
          <div className="lg:col-span-6 flex flex-col items-center">
            <div className="w-full max-w-[430px] bg-[#faf8f3] text-[#14201b] rounded-2xl p-4 sm:p-5 shadow-2xl shadow-black/40 border border-[#d6cfc0]">
              {/* B I N G O Header */}
              <div className="grid grid-cols-5 gap-2 mb-2.5">
                {BINGO_LETTERS.map((letter) => (
                  <div
                    key={letter}
                    className="h-11 rounded-lg bg-[#0d3527] text-[#facc15] font-display text-xl font-bold flex items-center justify-center tracking-wider"
                  >
                    {letter}
                  </div>
                ))}
              </div>

              {/* 5x5 Grid */}
              <div className="grid grid-cols-5 gap-2">
                {card.map((row, rIdx) =>
                  row.map((cell, cIdx) => {
                    const coord = `${rIdx}-${cIdx}`;
                    const isWinningTile = summary?.winningCoords.includes(coord) ?? false;
                    const isCalled =
                      cell.value === 'FREE' || calledSet.has(cell.value);
                    const isJustCalled = cell.value === lastBall;

                    return (
                      <button
                        key={coord}
                        type="button"
                        disabled={phase === 'TITLE_MENU' || phase === 'ROUND_SUMMARY' || cell.value === 'FREE'}
                        onClick={() => handleCellClick(rIdx, cIdx)}
                        className={`relative aspect-square min-h-[48px] rounded-xl font-mono-num text-lg sm:text-xl font-bold flex items-center justify-center transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d3527] ${
                          isWinningTile
                            ? 'bg-[#eab308] text-[#071f17] ring-2 ring-[#b45309] scale-[1.03]'
                            : cell.daubed
                            ? 'bg-[#0f5132] text-white shadow-inner'
                            : isJustCalled && phase === 'PLAYING'
                            ? 'bg-amber-100 text-[#14201b] ring-2 ring-[#eab308]'
                            : 'bg-white text-[#14201b] border border-[#e2ddd2] hover:bg-[#f2efe8]'
                        } ${phase === 'PLAYING' && isCalled && !cell.daubed ? 'cursor-pointer' : ''}`}
                      >
                        {cell.value === 'FREE' ? (
                          <span className="text-xs font-sans font-bold tracking-wide text-[#facc15]">
                            ★ {t.freeSpace}
                          </span>
                        ) : (
                          <span>{cell.value}</span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              {/* Card Footer */}
              <div className="mt-4 pt-3 border-t border-[#e2ddd2] flex items-center justify-between text-xs text-[#4b5b53]">
                <span>75-Ball Card</span>
                <span className="font-mono-num">
                  {t.selectStake}: {formatEtb(stake)} {t.etb}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: State-Driven Controls & Caller */}
          <div className="lg:col-span-6 space-y-6">
            {phase === 'TITLE_MENU' && (
              <div className="bg-[#081f17]/90 border border-white/10 rounded-2xl p-6 space-y-6">
                {/* Stake Selection */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-[#f4f1ea]">
                      {t.selectStake}
                    </label>
                    <span className="font-mono-num text-xs text-[#facc15]">
                      {t.availableBalance}: {formatEtb(account.balance)} {t.etb}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {PRESET_STAKES.map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => setStake(amount)}
                        className={`py-2.5 px-3 rounded-lg font-mono-num text-sm font-semibold transition-colors whitespace-nowrap ${
                          stake === amount
                            ? 'bg-[#eab308] text-[#071f17]'
                            : 'bg-white/5 text-[#e7e5df] border border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {formatEtb(amount)}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <span className="text-xs text-[#9fb3aa] shrink-0">{t.customStake}:</span>
                    <input
                      type="number"
                      min={100}
                      max={1000000}
                      step={100}
                      value={stake}
                      onChange={(e) => setStake(Math.max(0, Math.round(Number(e.target.value))))}
                      className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/15 text-sm font-mono-num text-[#f4f1ea] focus:outline-none focus:ring-2 focus:ring-[#eab308]"
                    />
                  </div>
                </div>

                {/* Draw Speed */}
                <div className="space-y-2.5">
                  <label className="text-sm font-semibold text-[#f4f1ea] block">
                    {t.drawSpeed}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {(
                      [
                        { id: 'auto_normal', label: t.autoNormal },
                        { id: 'auto_fast', label: t.autoFast },
                        { id: 'manual', label: t.manualDraw },
                      ] as const
                    ).map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setDrawMode(mode.id)}
                        className={`py-2 px-3 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                          drawMode === mode.id
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white/5 text-[#cbd5d0] border border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payout Schedule */}
                <div className="p-4 rounded-xl bg-black/25 border border-white/10 space-y-2">
                  <p className="text-xs font-semibold text-[#facc15]">{t.payoutTableTitle}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-[#cbd5d0]">
                    <span>{t.tier1}</span>
                    <span>{t.tier2}</span>
                    <span>{t.tier3}</span>
                    <span>{t.tier4}</span>
                  </div>
                </div>

                {!canAffordStake && (
                  <div className="p-3.5 rounded-xl bg-amber-950/50 border border-amber-500/30 text-xs text-amber-200 flex flex-wrap items-center justify-between gap-3">
                    <span>{t.insufficientBalance}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onNavigate('bonus')}
                        className="px-3 py-1.5 rounded-md bg-[#eab308] text-[#071f17] font-semibold whitespace-nowrap"
                      >
                        {t.navBonus}
                      </button>
                      <button
                        type="button"
                        onClick={() => onNavigate('withdraw')}
                        className="px-3 py-1.5 rounded-md bg-emerald-500 text-[#071f17] font-semibold whitespace-nowrap"
                      >
                        {t.navWithdraw}
                      </button>
                    </div>
                  </div>
                )}

                {hintMsg && (
                  <div className="p-3 rounded-xl bg-red-950/50 border border-red-400/30 text-xs text-red-200">
                    {hintMsg}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleStartRound}
                    disabled={!canAffordStake || starting}
                    className="flex-1 min-w-[200px] inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#eab308] text-[#071f17] text-base font-bold hover:bg-[#facc15] disabled:opacity-50 transition-colors whitespace-nowrap"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>{starting ? t.startingRound : t.startRound}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleShufflePreview}
                    className="inline-flex items-center gap-2 px-4 py-3.5 rounded-xl border border-white/15 bg-white/5 text-sm font-medium text-[#f4f1ea] hover:bg-white/10 transition-colors whitespace-nowrap"
                  >
                    <Shuffle className="w-4 h-4" />
                    <span>{t.shuffleCard}</span>
                  </button>
                </div>
              </div>
            )}

            {(phase === 'PLAYING' || phase === 'PAUSED') && (
              <div className="bg-[#081f17]/90 border border-white/10 rounded-2xl p-6 space-y-5">
                {/* Active Called Ball + Recent Balls */}
                <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-white/10">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#fef08a] via-[#eab308] to-[#a16207] text-[#071f17] flex flex-col items-center justify-center shadow-lg shadow-black/40 border-2 border-[#fef9c3]">
                      <span className="text-xs font-bold leading-none">
                        {lastBall ? getLetterForNumber(lastBall) : '-'}
                      </span>
                      <span className="font-mono-num text-2xl font-bold leading-tight">
                        {lastBall ?? '--'}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-[#9fb3aa]">{t.lastCalled}</p>
                      <p className="font-mono-num text-xl font-bold text-[#f4f1ea]">
                        {lastBall ? `${getLetterForNumber(lastBall)}-${lastBall}` : '--'}
                      </p>
                      <p className="text-xs text-[#cbd5d0] mt-0.5">
                        {t.selectStake}: {formatEtb(stake)} {t.etb}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-[#9fb3aa] mb-1.5">{t.recentBalls}</p>
                    <div className="flex items-center gap-1.5">
                      {recentBalls.map((num, idx) => (
                        <span
                          key={`${num}-${idx}`}
                          className={`w-9 h-9 rounded-lg font-mono-num text-xs font-bold flex items-center justify-center ${
                            idx === 0
                              ? 'bg-[#eab308] text-[#071f17]'
                              : 'bg-white/10 text-[#e7e5df]'
                          }`}
                        >
                          {num}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Controls Row */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="inline-flex items-center gap-2.5 text-sm text-[#e7e5df] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoDaub}
                      onChange={(e) => setAutoDaub(e.target.checked)}
                      className="w-4 h-4 accent-[#eab308] rounded"
                    />
                    <span>{t.autoDaub}</span>
                  </label>

                  <div className="flex items-center gap-2">
                    {drawMode !== 'manual' && (
                      <button
                        type="button"
                        onClick={() => setPhase(phase === 'PLAYING' ? 'PAUSED' : 'PLAYING')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-white/15 bg-white/5 text-xs font-medium text-[#f4f1ea] hover:bg-white/10 whitespace-nowrap"
                      >
                        {phase === 'PLAYING' ? (
                          <>
                            <Pause className="w-3.5 h-3.5" />
                            <span>{t.pauseGame}</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5" />
                            <span>{t.resumeGame}</span>
                          </>
                        )}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={drawNextBall}
                      disabled={settling || calledBalls.length >= MAX_BALLS_PER_ROUND}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/10 text-xs font-semibold text-[#f4f1ea] hover:bg-white/20 disabled:opacity-40 whitespace-nowrap"
                    >
                      <span>{t.drawBall}</span>
                    </button>
                  </div>
                </div>

                {hintMsg && (
                  <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/30 text-xs text-amber-200">
                    {hintMsg}
                  </div>
                )}

                {/* Call BINGO Action */}
                <button
                  type="button"
                  onClick={handleCallBingo}
                  disabled={settling}
                  className={`w-full py-4 rounded-xl font-display text-xl font-bold tracking-wide transition-all flex items-center justify-center gap-2.5 whitespace-nowrap ${
                    winEvaluation.hasWin
                      ? 'bg-[#eab308] text-[#071f17] hover:bg-[#facc15] shadow-xl shadow-[#eab308]/25 ring-2 ring-[#fef08a]'
                      : 'bg-emerald-700/80 text-white hover:bg-emerald-600'
                  }`}
                >
                  <Sparkles className="w-5 h-5" />
                  <span>
                    {settling
                      ? '...'
                      : winEvaluation.hasWin
                      ? `${t.callBingo} (+${formatEtb(stake * currentPotentialMultiplier)} ${t.etb})`
                      : t.callBingo}
                  </span>
                </button>

                {/* Compact 75-Number Master Tracker */}
                <div className="pt-2 space-y-2">
                  <p className="text-xs font-medium text-[#9fb3aa]">{t.masterBoard}</p>
                  <div className="space-y-1">
                    {BINGO_LETTERS.map((letter, rowIdx) => {
                      const start = rowIdx * 15 + 1;
                      return (
                        <div key={letter} className="grid grid-cols-16 gap-1 items-center">
                          <span className="text-[11px] font-bold text-[#facc15] text-center">
                            {letter}
                          </span>
                          {Array.from({ length: 15 }, (_, i) => start + i).map((num) => {
                            const hit = calledSet.has(num);
                            return (
                              <span
                                key={num}
                                className={`h-6 rounded text-[10px] font-mono-num flex items-center justify-center ${
                                  num === lastBall
                                    ? 'bg-[#eab308] text-[#071f17] font-bold'
                                    : hit
                                    ? 'bg-emerald-600 text-white font-semibold'
                                    : 'bg-white/5 text-[#7c9489]'
                                }`}
                              >
                                {num}
                              </span>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {phase === 'ROUND_SUMMARY' && summary && (
              <div className="bg-[#081f17]/95 border border-white/15 rounded-2xl p-6 sm:p-7 space-y-5">
                <div className="flex items-start gap-3.5">
                  {summary.outcome === 'won' ? (
                    <Trophy className="w-8 h-8 text-[#facc15] shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-8 h-8 text-[#9fb3aa] shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1.5">
                    <h3 className="font-display text-2xl font-bold text-[#f4f1ea]">
                      {summary.outcome === 'won' ? t.roundWonTitle : t.roundLostTitle}
                    </h3>
                    <p className="text-sm text-[#cbd5d0] leading-relaxed">
                      {summary.outcome === 'won' ? t.roundWonDesc : t.roundLostDesc}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-y border-white/10">
                  <div>
                    <p className="text-xs text-[#9fb3aa]">{t.selectStake}</p>
                    <p className="font-mono-num text-base font-bold text-[#f4f1ea] mt-0.5">
                      {formatEtb(stake)} {t.etb}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#9fb3aa]">{t.ballsDrawn}</p>
                    <p className="font-mono-num text-base font-bold text-[#f4f1ea] mt-0.5">
                      {summary.ballsCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#9fb3aa]">Pattern</p>
                    <p className="text-sm font-semibold text-[#f4f1ea] mt-0.5">
                      {t.patternNames[summary.pattern]}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#9fb3aa]">Payout</p>
                    <p
                      className={`font-mono-num text-base font-bold mt-0.5 ${
                        summary.outcome === 'won' ? 'text-[#facc15]' : 'text-[#9fb3aa]'
                      }`}
                    >
                      {summary.outcome === 'won' ? `+${formatEtb(summary.payout)}` : '0'} {t.etb}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handlePlayAgain}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#eab308] text-[#071f17] text-sm font-bold hover:bg-[#facc15] transition-colors whitespace-nowrap"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>{t.playAgain}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigate('withdraw')}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-white/15 bg-white/5 text-sm font-semibold text-[#f4f1ea] hover:bg-white/10 transition-colors whitespace-nowrap"
                  >
                    <span>{t.goWithdraw}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
