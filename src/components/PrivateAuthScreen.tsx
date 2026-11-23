import { useState } from 'react';
import { Check, Copy, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react';
import { getDict } from '../i18n';
import { Language } from '../types';

interface PrivateAuthScreenProps {
  lang: Language;
  onToggleLang: (lang: Language) => void;
  onSignIn: () => Promise<void>;
  signingIn: boolean;
  errorMsg: string | null;
}

const CALLER_IMG = '/src/assets/images/bingo_caller_balls_1795439386321.jpg';

export function PrivateAuthScreen({
  lang,
  onToggleLang,
  onSignIn,
  signingIn,
  errorMsg,
}: PrivateAuthScreenProps) {
  const t = getDict(lang);
  const [imgFailed, setImgFailed] = useState(false);
  const [copiedHost, setCopiedHost] = useState(false);
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
  const isUnauthorizedDomain = Boolean(errorMsg && errorMsg.includes('unauthorized-domain'));

  const handleCopyHost = () => {
    if (!currentHost || typeof navigator === 'undefined') return;
    navigator.clipboard?.writeText(currentHost).then(() => {
      setCopiedHost(true);
      window.setTimeout(() => setCopiedHost(false), 2000);
    }).catch(() => {});
  };

  return (
    <div className="min-h-screen bg-[#071f17] text-[#f4f1ea] flex flex-col">
      <header className="border-b border-white/10 bg-[#08241b]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          <span className="font-display text-xl font-bold tracking-tight text-[#f4f1ea] whitespace-nowrap shrink-0">
            {t.brand}
          </span>

          <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg border border-white/10">
            <button
              type="button"
              onClick={() => onToggleLang('am')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                lang === 'am'
                  ? 'bg-[#eab308] text-[#071f17]'
                  : 'text-[#cbd5d0] hover:text-white'
              }`}
            >
              አማርኛ
            </button>
            <button
              type="button"
              onClick={() => onToggleLang('en')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                lang === 'en'
                  ? 'bg-[#eab308] text-[#071f17]'
                  : 'text-[#cbd5d0] hover:text-white'
              }`}
            >
              English
            </button>
          </div>

          <button
            type="button"
            onClick={onSignIn}
            disabled={signingIn}
            className="px-4 py-2 rounded-lg bg-[#eab308] text-[#071f17] text-sm font-semibold hover:bg-[#facc15] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
          >
            {t.signInWithGoogle}
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center">
        <div className="max-w-[1200px] mx-auto w-full px-4 sm:px-6 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
          <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
            <p className="text-sm font-medium text-[#facc15] tracking-wide">
              {t.privateVaultKicker}
            </p>

            <h1 className="font-display text-3xl sm:text-4xl lg:text-[42px] font-bold leading-[1.18] text-[#f4f1ea]">
              {t.authTitle}
            </h1>

            <p className="text-base text-[#cbd5d0] leading-relaxed max-w-xl">
              {t.authSubtitle}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={onSignIn}
                disabled={signingIn}
                className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#eab308] text-[#071f17] text-base font-bold hover:bg-[#facc15] disabled:opacity-60 transition-all shadow-lg shadow-black/25 whitespace-nowrap"
              >
                <LockKeyhole className="w-4 h-4" />
                <span>{signingIn ? '...' : t.signInWithGoogle}</span>
              </button>
            </div>

            {errorMsg && (
              <div className="p-4 rounded-xl bg-red-950/60 border border-red-400/30 text-sm text-red-100 max-w-xl space-y-3">
                <p className="font-mono-num text-xs text-red-200">{errorMsg}</p>
                {isUnauthorizedDomain && currentHost && (
                  <div className="pt-2 border-t border-red-400/20 space-y-2 text-xs text-[#f4f1ea]">
                    <p className="leading-relaxed">
                      {lang === 'am'
                        ? 'ይህ ዶሜይን በFirebase Console (admas-bingo → Authentication → Settings → Authorized domains) ውስጥ መጨመር አለበት፡'
                        : 'Add this domain to Firebase Console (admas-bingo → Authentication → Settings → Authorized domains):'}
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-2 bg-black/35 border border-white/15 rounded-lg px-3 py-2">
                      <code className="font-mono-num text-xs text-[#facc15] break-all">
                        {currentHost}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopyHost}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#eab308] text-[#071f17] font-semibold text-xs hover:bg-[#facc15] whitespace-nowrap shrink-0"
                      >
                        {copiedHost ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedHost ? (lang === 'am' ? 'ተቀድቷል' : 'Copied') : (lang === 'am' ? 'ዶሜይን ቅዳ' : 'Copy Domain')}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="pt-6 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-1.5">
                <p className="text-sm font-semibold text-[#f4f1ea]">{t.authPoint1Title}</p>
                <p className="text-xs text-[#9fb3aa] leading-relaxed">{t.authPoint1Desc}</p>
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-semibold text-[#f4f1ea]">{t.authPoint2Title}</p>
                <p className="text-xs text-[#9fb3aa] leading-relaxed">{t.authPoint2Desc}</p>
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-semibold text-[#f4f1ea]">{t.authPoint3Title}</p>
                <p className="text-xs text-[#9fb3aa] leading-relaxed">{t.authPoint3Desc}</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 flex">
            <div className="relative w-full min-h-[340px] lg:h-full rounded-2xl overflow-hidden border border-white/10 bg-[#0d2b20]">
              {!imgFailed ? (
                <img
                  src={CALLER_IMG}
                  alt="Brass rotary bingo cage and ivory balls on emerald felt table"
                  referrerPolicy="no-referrer"
                  onError={() => setImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-[#0f3d2e] to-[#071f17] text-center gap-3">
                  <Sparkles className="w-10 h-10 text-[#eab308]" />
                  <p className="font-display text-xl font-semibold text-[#f4f1ea]">{t.brand}</p>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#071f17]/90 via-[#071f17]/25 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-[#facc15] font-medium">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>100,000 {t.birr}</span>
                  <span aria-hidden="true">·</span>
                  <span>75-Ball Bingo</span>
                </div>
                <p className="text-sm text-[#e7e5df]">
                  {lang === 'am'
                    ? 'በየቀኑ 100,000 ብር ቦነስ · መጫወት ወይም ማውጣት'
                    : 'Daily 100,000 Birr Bonus · Play or Withdraw'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
