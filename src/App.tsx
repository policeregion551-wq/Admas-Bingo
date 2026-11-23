import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { Coins, Volume2, VolumeX } from 'lucide-react';
import { BingoArena } from './components/BingoArena';
import { DailyBonusPanel } from './components/DailyBonusPanel';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LedgerPanel } from './components/LedgerPanel';
import { PrivateAuthScreen } from './components/PrivateAuthScreen';
import { TopBar } from './components/TopBar';
import { WithdrawPanel } from './components/WithdrawPanel';
import { auth, googleProvider } from './firebase';
import { DAILY_BONUS_ETB, formatEtb, getDict } from './i18n';
import {
  claimDailyBonus,
  ensureUserAccount,
  getTodayDateKey,
  subscribeBingoRounds,
  subscribeDeposits,
  subscribeTransactions,
  subscribeUserAccount,
  subscribeWithdrawals,
} from './services/walletService';
import {
  ActiveTab,
  BingoRound,
  DepositRecord,
  Language,
  UserAccount,
  WalletTransaction,
  WithdrawalRecord,
} from './types';
import { playBonusSound } from './utils/sound';

function AppShell() {
  const [lang, setLang] = useState<Language>('am');
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [account, setAccount] = useState<UserAccount | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [deposits, setDeposits] = useState<DepositRecord[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [bingoRounds, setBingoRounds] = useState<BingoRound[]>([]);
  const [runtimeError, setRuntimeError] = useState<Error | null>(null);

  const [activeTab, setActiveTab] = useState<ActiveTab>('arena');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [claimingBonus, setClaimingBonus] = useState<boolean>(false);

  const t = getDict(lang);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      if (nextUser) {
        try {
          await ensureUserAccount(nextUser);
        } catch (err) {
          setRuntimeError(err instanceof Error ? err : new Error(String(err)));
        }
      } else {
        setAccount(null);
        setTransactions([]);
        setDeposits([]);
        setWithdrawals([]);
        setBingoRounds([]);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authReady || !user) return;

    const unsubAccount = subscribeUserAccount(user.uid, setAccount, setRuntimeError);
    const unsubTx = subscribeTransactions(user.uid, setTransactions, setRuntimeError);
    const unsubDp = subscribeDeposits(user.uid, setDeposits, setRuntimeError);
    const unsubWd = subscribeWithdrawals(user.uid, setWithdrawals, setRuntimeError);
    const unsubRounds = subscribeBingoRounds(user.uid, setBingoRounds, setRuntimeError);

    return () => {
      unsubAccount();
      unsubTx();
      unsubDp();
      unsubWd();
      unsubRounds();
    };
  }, [authReady, user]);

  if (runtimeError) {
    throw runtimeError;
  }

  const handleSignIn = async () => {
    setSigningIn(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  const handleClaimDailyBonus = async () => {
    if (!account || claimingBonus) return;
    setClaimingBonus(true);
    try {
      await claimDailyBonus(account);
      playBonusSound(soundEnabled);
    } catch (err) {
      setRuntimeError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setClaimingBonus(false);
    }
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#071f17] text-[#f4f1ea] flex items-center justify-center p-6">
        <p className="text-sm text-[#cbd5d0]">{t.loadingAccount}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <PrivateAuthScreen
        lang={lang}
        onToggleLang={setLang}
        onSignIn={handleSignIn}
        signingIn={signingIn}
        errorMsg={authError}
      />
    );
  }

  if (!account) {
    return (
      <div className="min-h-screen bg-[#071f17] text-[#f4f1ea] flex items-center justify-center p-6">
        <p className="text-sm text-[#cbd5d0]">{t.loadingAccount}</p>
      </div>
    );
  }

  const todayKey = getTodayDateKey();
  const bonusAvailableToday = account.lastBonusDate !== todayKey;

  return (
    <div className="min-h-screen bg-[#071f17] text-[#f4f1ea] flex flex-col">
      <TopBar
        lang={lang}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onSignOut={handleSignOut}
      />

      {/* Workspace Toolbar below Header */}
      <div className="border-b border-white/10 bg-[#082219]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <p className="text-xs text-[#9fb3aa]">{t.availableBalance}</p>
              <p className="font-mono-num text-xl sm:text-2xl font-bold text-[#facc15]">
                {formatEtb(account.balance)} {t.birr}
              </p>
            </div>

            <div className="h-9 w-px bg-white/10 hidden sm:block" />

            {bonusAvailableToday ? (
              <button
                type="button"
                onClick={handleClaimDailyBonus}
                disabled={claimingBonus}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#eab308] text-[#071f17] text-xs sm:text-sm font-bold hover:bg-[#facc15] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
              >
                <Coins className="w-4 h-4" />
                <span>
                  {claimingBonus ? t.claiming : `+${formatEtb(DAILY_BONUS_ETB)} ${t.birr} · ${t.claimNow}`}
                </span>
              </button>
            ) : (
              <div className="text-xs text-[#cbd5d0]">
                <span>{account.displayName}</span>
                <span aria-hidden="true" className="mx-2">·</span>
                <span className="text-emerald-300 font-medium">{t.claimedToday}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSoundEnabled((s) => !s)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 bg-white/5 text-xs font-medium text-[#cbd5d0] hover:text-white hover:bg-white/10 transition-colors whitespace-nowrap shrink-0"
              aria-label={soundEnabled ? t.soundOn : t.soundOff}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span>{soundEnabled ? t.soundOn : t.soundOff}</span>
            </button>

            <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg border border-white/10">
              <button
                type="button"
                onClick={() => setLang('am')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  lang === 'am'
                    ? 'bg-[#eab308] text-[#071f17] font-semibold'
                    : 'text-[#cbd5d0] hover:text-white'
                }`}
              >
                አማ
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  lang === 'en'
                    ? 'bg-[#eab308] text-[#071f17] font-semibold'
                    : 'text-[#cbd5d0] hover:text-white'
                }`}
              >
                EN
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 py-8">
        {activeTab === 'arena' && (
          <BingoArena
            lang={lang}
            account={account}
            soundEnabled={soundEnabled}
            onNavigate={setActiveTab}
          />
        )}

        {activeTab === 'bonus' && (
          <DailyBonusPanel
            lang={lang}
            account={account}
            claiming={claimingBonus}
            onClaimBonus={handleClaimDailyBonus}
            onNavigate={setActiveTab}
          />
        )}

        {activeTab === 'withdraw' && (
          <WithdrawPanel
            lang={lang}
            account={account}
            deposits={deposits}
            withdrawals={withdrawals}
            soundEnabled={soundEnabled}
          />
        )}

        {activeTab === 'ledger' && (
          <LedgerPanel
            lang={lang}
            account={account}
            transactions={transactions}
            bingoRounds={bingoRounds}
          />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppShell />
    </ErrorBoundary>
  );
}
