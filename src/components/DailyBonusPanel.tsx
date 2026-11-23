import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Coins, Gamepad2, Landmark } from 'lucide-react';
import { DAILY_BONUS_ETB, formatEtb, getDict } from '../i18n';
import { getTodayDateKey } from '../services/walletService';
import { ActiveTab, Language, UserAccount } from '../types';

interface DailyBonusPanelProps {
  lang: Language;
  account: UserAccount;
  claiming: boolean;
  onClaimBonus: () => Promise<void>;
  onNavigate: (tab: ActiveTab) => void;
}

const VAULT_IMG = '/src/assets/images/gold_bonus_vault_1795439385316.jpg';

function getCountdownToMidnight(): string {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const diffMs = Math.max(0, midnight.getTime() - now.getTime());
  const hours = Math.floor(diffMs / 3600000);
  const minutes = Math.floor((diffMs % 3600000) / 60000);
  const seconds = Math.floor((diffMs % 60000) / 1000);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function DailyBonusPanel({
  lang,
  account,
  claiming,
  onClaimBonus,
  onNavigate,
}: DailyBonusPanelProps) {
  const t = getDict(lang);
  const todayKey = getTodayDateKey();
  const alreadyClaimed = account.lastBonusDate === todayKey;
  const [countdown, setCountdown] = useState(getCountdownToMidnight());
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdown(getCountdownToMidnight());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch bg-[#0c291f] border border-white/10 rounded-2xl p-6 sm:p-8">
        <div className="lg:col-span-5 relative min-h-[260px] rounded-xl overflow-hidden border border-white/10 bg-[#081d16]">
          {!imgFailed ? (
            <img
              src={VAULT_IMG}
              alt="Gold coins and brass vault seal on emerald velvet"
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#144333] to-[#081d16]">
              <Coins className="w-12 h-12 text-[#eab308]" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#071f17]/80 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-[#e7e5df]">
            <span>{todayKey}</span>
            <span className="font-mono-num text-[#facc15]">+{formatEtb(DAILY_BONUS_ETB)} {t.etb}</span>
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <p className="text-xs font-medium text-[#facc15]">
              {t.dailyBonusLabel} · {todayKey}
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#f4f1ea]">
              {t.bonusHeroTitle}
            </h2>
            <p className="text-sm sm:text-base text-[#cbd5d0] leading-relaxed">
              {t.bonusHeroDesc}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 border-y border-white/10">
            <div>
              <p className="text-xs text-[#9fb3aa]">{t.dailyBonusLabel}</p>
              <p className="font-mono-num text-2xl font-bold text-[#facc15] mt-1">
                {formatEtb(DAILY_BONUS_ETB)} {t.birr}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#9fb3aa]">{t.availableBalance}</p>
              <p className="font-mono-num text-2xl font-bold text-[#f4f1ea] mt-1">
                {formatEtb(account.balance)} {t.birr}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {!alreadyClaimed ? (
              <button
                type="button"
                onClick={onClaimBonus}
                disabled={claiming}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-[#eab308] text-[#071f17] text-base font-bold hover:bg-[#facc15] disabled:opacity-60 transition-all shadow-lg shadow-black/25 whitespace-nowrap"
              >
                <Coins className="w-5 h-5" />
                <span>{claiming ? t.claiming : t.claimNow}</span>
              </button>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-emerald-950/50 border border-emerald-500/30">
                <div className="flex items-center gap-2.5 text-emerald-300">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span className="text-sm font-semibold">{t.claimedToday}</span>
                </div>
                <div className="text-xs text-[#cbd5d0] font-mono-num">
                  {t.nextBonusIn}: <span className="text-[#facc15] font-semibold">{countdown}</span>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => onNavigate('arena')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition-colors whitespace-nowrap"
              >
                <Gamepad2 className="w-4 h-4" />
                <span>{t.goPlayBingo}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('withdraw')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-white/20 bg-white/5 text-[#f4f1ea] text-sm font-semibold hover:bg-white/10 transition-colors whitespace-nowrap"
              >
                <Landmark className="w-4 h-4" />
                <span>{t.goWithdraw}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
