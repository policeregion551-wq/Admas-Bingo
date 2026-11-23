import React, { useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Landmark,
  QrCode,
  Smartphone,
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { formatEtb, getDict } from '../i18n';
import { processDeposit, processWithdrawal } from '../services/walletService';
import {
  CashierMethod,
  DepositRecord,
  Language,
  ToastItem,
  UserAccount,
  WithdrawalRecord,
} from '../types';
import { playBonusSound, playWithdrawSound } from '../utils/sound';

interface WithdrawPanelProps {
  lang: Language;
  account: UserAccount;
  deposits: DepositRecord[];
  withdrawals: WithdrawalRecord[];
  soundEnabled: boolean;
  onNotify: (toast: Omit<ToastItem, 'id'>) => void;
}

type CashierMode = 'withdraw' | 'deposit';
type HistoryFilter = 'withdrawals' | 'deposits';

const CASHIER_METHODS: CashierMethod[] = ['telebirr', 'cbe_bank'];
const QUICK_WITHDRAW_AMOUNTS = [10000, 25000, 50000, 100000];
const QUICK_DEPOSIT_AMOUNTS = [1000, 5000, 10000, 50000, 100000];

function buildWithdrawalQrPayload(wd: WithdrawalRecord): string {
  return JSON.stringify({
    protocol: wd.method === 'telebirr' ? 'TELEBIRR_PAYOUT_VOUCHER' : 'CBE_PAYOUT_VOUCHER',
    reference: wd.referenceCode,
    amountEtb: wd.amount,
    currency: 'ETB',
    recipientAccount: wd.accountNumber,
    recipientName: wd.accountHolder,
    status: wd.status,
  });
}

export function WithdrawPanel({
  lang,
  account,
  deposits,
  withdrawals,
  soundEnabled,
  onNotify,
}: WithdrawPanelProps) {
  const t = getDict(lang);
  const [mode, setMode] = useState<CashierMode>('withdraw');
  const [historyView, setHistoryView] = useState<HistoryFilter>('withdrawals');
  const [method, setMethod] = useState<CashierMethod>('telebirr');
  const [amount, setAmount] = useState<string>('100000');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [accountHolder, setAccountHolder] = useState<string>(account.displayName || '');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [withdrawReceipt, setWithdrawReceipt] = useState<WithdrawalRecord | null>(null);
  const [depositReceipt, setDepositReceipt] = useState<DepositRecord | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);

  const numericAmount = Math.round(Number(amount) || 0);

  const canSubmitWithdraw =
    !submitting &&
    numericAmount > 0 &&
    numericAmount <= account.balance &&
    accountNumber.trim().length >= 4 &&
    accountHolder.trim().length >= 2;

  const canSubmitDeposit =
    !submitting &&
    numericAmount > 0 &&
    numericAmount <= 10000000 &&
    accountNumber.trim().length >= 4 &&
    accountHolder.trim().length >= 2 &&
    transactionRef.trim().length >= 4;

  const handleModeChange = (nextMode: CashierMode) => {
    setMode(nextMode);
    setErrorMsg(null);
    setDepositReceipt(null);
    if (nextMode === 'deposit') {
      setAmount('10000');
      setHistoryView('deposits');
    } else {
      setAmount(account.balance >= 100000 ? '100000' : String(Math.floor(account.balance) || ''));
      setHistoryView('withdrawals');
    }
  };

  const handleGenerateSampleRef = () => {
    const prefix = method === 'telebirr' ? 'TB' : 'FT';
    const code = `${prefix}${Math.random().toString(36).slice(2, 9).toUpperCase()}`;
    setTransactionRef(code);
  };

  const handleCopyRef = (refCode: string) => {
    if (typeof navigator === 'undefined') return;
    navigator.clipboard
      ?.writeText(refCode)
      .then(() => {
        setCopiedRef(true);
        window.setTimeout(() => setCopiedRef(false), 2000);
      })
      .catch(() => {});
  };

  const handleDownloadQr = (refCode: string) => {
    const canvas = document.getElementById('withdrawal-qr-canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    const pngUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = pngUrl;
    link.download = `${refCode}-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (mode === 'withdraw') {
      if (!canSubmitWithdraw) return;
      setSubmitting(true);
      try {
        const record = await processWithdrawal(account, {
          amount: numericAmount,
          method,
          accountNumber,
          accountHolder,
        });
        playWithdrawSound(soundEnabled);
        setWithdrawReceipt(record);
        setDepositReceipt(null);
        setAmount('');
        onNotify({
          variant: 'success',
          title: t.toastWithdrawSuccessTitle,
          message: `${formatEtb(record.amount)} ${t.birr} · ${t.methods[record.method]} (${record.accountNumber}) · ${record.referenceCode}`,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Withdrawal failed';
        setErrorMsg(msg);
        onNotify({
          variant: 'error',
          title: t.toastWithdrawErrorTitle,
          message: msg,
        });
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!canSubmitDeposit) return;
    setSubmitting(true);
    try {
      const record = await processDeposit(account, {
        amount: numericAmount,
        method,
        accountNumber,
        accountHolder,
        transactionRef,
      });
      playBonusSound(soundEnabled);
      setDepositReceipt(record);
      setTransactionRef('');
      onNotify({
        variant: 'success',
        title: t.toastDepositSuccessTitle,
        message: `+${formatEtb(record.amount)} ${t.birr} · ${t.methods[record.method]} · ${record.referenceCode}`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Deposit failed';
      setErrorMsg(msg);
      onNotify({
        variant: 'error',
        title: t.toastDepositErrorTitle,
        message: msg,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const quickPresets = mode === 'withdraw' ? QUICK_WITHDRAW_AMOUNTS : QUICK_DEPOSIT_AMOUNTS;

  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Unified Cashier Form */}
      <div className="lg:col-span-7 bg-[#0c291f] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="space-y-2 pb-4 border-b border-white/10">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#f4f1ea]">
            {t.cashierTitle}
          </h2>
          <p className="text-sm text-[#cbd5d0] leading-relaxed">{t.cashierSubtitle}</p>
        </div>

        {/* Mode Segmented Toggle: Withdraw vs Deposit */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-black/30 rounded-xl border border-white/10">
          <button
            type="button"
            onClick={() => handleModeChange('withdraw')}
            className={`inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
              mode === 'withdraw'
                ? 'bg-[#eab308] text-[#071f17]'
                : 'text-[#cbd5d0] hover:text-white'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>{t.modeWithdraw}</span>
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('deposit')}
            className={`inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
              mode === 'deposit'
                ? 'bg-emerald-500 text-[#071f17]'
                : 'text-[#cbd5d0] hover:text-white'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>{t.modeDeposit}</span>
          </button>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl bg-black/25 border border-white/10">
          <span className="text-sm text-[#9fb3aa]">{t.availableBalance}</span>
          <span className="font-mono-num text-2xl font-bold text-[#facc15]">
            {formatEtb(account.balance)} {t.birr}
          </span>
        </div>

        {/* Withdrawal QR Code Voucher Card */}
        {withdrawReceipt && (
          <div className="p-5 rounded-2xl bg-[#082118] border border-[#eab308]/40 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[#facc15] font-semibold text-sm">
                <QrCode className="w-4 h-4 shrink-0" />
                <span>{t.qrVoucherTitle}</span>
              </div>
              <span className="font-mono-num text-xs text-emerald-300">
                {withdrawReceipt.referenceCode}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
              <div className="sm:col-span-5 flex justify-center">
                <div className="bg-white p-3 rounded-xl shadow-lg">
                  <QRCodeCanvas
                    id="withdrawal-qr-canvas"
                    value={buildWithdrawalQrPayload(withdrawReceipt)}
                    size={176}
                    level="M"
                    includeMargin
                  />
                </div>
              </div>

              <div className="sm:col-span-7 space-y-3">
                <div>
                  <p className="text-xs text-[#9fb3aa]">{t.amountEtb}</p>
                  <p className="font-mono-num text-2xl font-bold text-[#facc15]">
                    {formatEtb(withdrawReceipt.amount)} {t.birr}
                  </p>
                </div>

                <div className="text-xs text-[#d6dfd9] space-y-1 font-mono-num">
                  <p>
                    {t.methods[withdrawReceipt.method]} · {withdrawReceipt.accountNumber}
                  </p>
                  <p>{withdrawReceipt.accountHolder}</p>
                </div>

                <p className="text-xs text-[#cbd5d0] leading-relaxed">{t.qrScanHint}</p>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleDownloadQr(withdrawReceipt.referenceCode)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#eab308] text-[#071f17] text-xs font-semibold hover:bg-[#facc15] whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{t.qrDownloadPng}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyRef(withdrawReceipt.referenceCode)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 bg-white/5 text-xs font-medium text-[#f4f1ea] hover:bg-white/10 whitespace-nowrap"
                  >
                    {copiedRef ? (
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedRef ? t.qrCopied : t.qrCopyRef}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {depositReceipt && (
          <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/35 space-y-2">
            <div className="flex items-center gap-2 text-emerald-300 font-semibold text-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{t.depositSuccessTitle}</span>
            </div>
            <div className="text-xs text-[#e7e5df] flex flex-wrap items-center gap-2 font-mono-num">
              <span>{depositReceipt.referenceCode}</span>
              <span aria-hidden="true">·</span>
              <span>+{formatEtb(depositReceipt.amount)} {t.etb}</span>
              <span aria-hidden="true">·</span>
              <span>{t.methods[depositReceipt.method]}</span>
              <span aria-hidden="true">·</span>
              <span>{depositReceipt.transactionRef}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Channel Selector: Telebirr vs CBE */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#f4f1ea] block">
              {mode === 'withdraw' ? t.payoutChannel : t.depositChannel}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CASHIER_METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={`py-3 px-4 rounded-xl text-left text-sm font-medium transition-colors flex items-center gap-3 ${
                    method === m
                      ? 'bg-[#eab308] text-[#071f17] font-bold'
                      : 'bg-white/5 text-[#cbd5d0] border border-white/10 hover:bg-white/10'
                  }`}
                >
                  {m === 'telebirr' ? (
                    <Smartphone className="w-4 h-4 shrink-0" />
                  ) : (
                    <Landmark className="w-4 h-4 shrink-0" />
                  )}
                  <span className="truncate">{t.methods[m]}</span>
                </button>
              ))}
            </div>
          </div>

          {mode === 'deposit' && (
            <div className="p-4 rounded-xl bg-black/25 border border-white/10 space-y-1">
              <p className="text-xs font-medium text-[#9fb3aa]">{t.depositDestinationLabel}</p>
              <p className="font-mono-num text-sm font-semibold text-[#facc15]">
                {method === 'telebirr' ? t.telebirrReceiver : t.cbeReceiver}
              </p>
            </div>
          )}

          {/* Amount */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="cashier-amount" className="text-sm font-medium text-[#f4f1ea]">
                {mode === 'withdraw' ? t.amountEtb : t.depositAmountEtb}
              </label>
              {mode === 'withdraw' && (
                <button
                  type="button"
                  onClick={() => setAmount(String(Math.floor(account.balance)))}
                  className="text-xs text-[#facc15] hover:underline whitespace-nowrap"
                >
                  {t.withdrawFull} ({formatEtb(account.balance)})
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2 pb-1">
              {quickPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() =>
                    setAmount(
                      mode === 'withdraw'
                        ? String(Math.min(preset, Math.floor(account.balance)))
                        : String(preset)
                    )
                  }
                  className="px-3 py-1.5 rounded-md bg-white/5 border border-white/10 text-xs font-mono-num text-[#e7e5df] hover:bg-white/10 whitespace-nowrap"
                >
                  {formatEtb(preset)}
                </button>
              ))}
            </div>

            <input
              id="cashier-amount"
              type="number"
              min={1}
              max={mode === 'withdraw' ? Math.max(1, Math.floor(account.balance)) : 10000000}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={mode === 'withdraw' ? '100000' : '10000'}
              className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/15 font-mono-num text-base text-[#f4f1ea] focus:outline-none focus:ring-2 focus:ring-[#eab308]"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="account-number" className="text-sm font-medium text-[#f4f1ea] block">
                {mode === 'withdraw' ? t.accountNumber : t.senderAccountNumber}
              </label>
              <input
                id="account-number"
                type="text"
                minLength={4}
                maxLength={40}
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder={method === 'telebirr' ? '09XXXXXXXX' : '1000XXXXXXXXX'}
                className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/15 font-mono-num text-sm text-[#f4f1ea] focus:outline-none focus:ring-2 focus:ring-[#eab308]"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="account-holder" className="text-sm font-medium text-[#f4f1ea] block">
                {t.accountHolder}
              </label>
              <input
                id="account-holder"
                type="text"
                minLength={2}
                maxLength={80}
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/15 text-sm text-[#f4f1ea] focus:outline-none focus:ring-2 focus:ring-[#eab308]"
                required
              />
            </div>
          </div>

          {mode === 'deposit' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="tx-ref" className="text-sm font-medium text-[#f4f1ea]">
                  {t.transactionRefLabel}
                </label>
                <button
                  type="button"
                  onClick={handleGenerateSampleRef}
                  className="text-xs text-[#facc15] hover:underline whitespace-nowrap"
                >
                  {t.generateSampleRef}
                </button>
              </div>
              <input
                id="tx-ref"
                type="text"
                minLength={4}
                maxLength={40}
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder={method === 'telebirr' ? 'TB8492014' : 'FT263279104'}
                className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/15 font-mono-num text-sm text-[#f4f1ea] focus:outline-none focus:ring-2 focus:ring-[#eab308]"
                required
              />
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-400/30 text-xs text-red-200">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={mode === 'withdraw' ? !canSubmitWithdraw : !canSubmitDeposit}
            className={`w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-base font-bold disabled:opacity-45 transition-colors whitespace-nowrap ${
              mode === 'withdraw'
                ? 'bg-[#eab308] text-[#071f17] hover:bg-[#facc15]'
                : 'bg-emerald-500 text-[#071f17] hover:bg-emerald-400'
            }`}
          >
            {mode === 'withdraw' ? (
              <ArrowUpRight className="w-4 h-4" />
            ) : (
              <ArrowDownLeft className="w-4 h-4" />
            )}
            <span>
              {mode === 'withdraw'
                ? submitting
                  ? t.processingWithdraw
                  : t.submitWithdraw
                : submitting
                ? t.processingDeposit
                : t.submitDeposit}
            </span>
          </button>

          <p className="text-xs text-[#9fb3aa] leading-relaxed">{t.cashierNote}</p>
        </form>
      </div>

      {/* Recent Deposits & Withdrawals */}
      <div className="lg:col-span-5 bg-[#0c291f] border border-white/10 rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
          <h3 className="font-display text-xl font-semibold text-[#f4f1ea]">
            {t.recentCashierTitle}
          </h3>

          <div className="flex items-center gap-1 p-1 bg-black/25 rounded-lg border border-white/10">
            <button
              type="button"
              onClick={() => setHistoryView('withdrawals')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                historyView === 'withdrawals'
                  ? 'bg-[#eab308] text-[#071f17] font-semibold'
                  : 'text-[#cbd5d0] hover:text-white'
              }`}
            >
              {t.recentWithdrawals} ({withdrawals.length})
            </button>
            <button
              type="button"
              onClick={() => setHistoryView('deposits')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                historyView === 'deposits'
                  ? 'bg-emerald-500 text-[#071f17] font-semibold'
                  : 'text-[#cbd5d0] hover:text-white'
              }`}
            >
              {t.recentDeposits} ({deposits.length})
            </button>
          </div>
        </div>

        {historyView === 'withdrawals' ? (
          withdrawals.length === 0 ? (
            <p className="text-sm text-[#9fb3aa] py-8 text-center">{t.noWithdrawals}</p>
          ) : (
            <ul className="divide-y divide-white/10">
              {withdrawals.map((wd) => (
                <li key={wd.id} className="py-3.5 flex items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <p className="text-sm font-semibold text-[#f4f1ea] truncate">
                      {t.methods[wd.method]}
                    </p>
                    <p className="text-xs text-[#9fb3aa] font-mono-num truncate">
                      {wd.accountNumber} · {wd.referenceCode}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="font-mono-num text-sm font-bold text-[#facc15]">
                        -{formatEtb(wd.amount)} {t.etb}
                      </p>
                      <p className="text-xs text-emerald-300">
                        {wd.createdAt ? wd.createdAt.toDate().toLocaleDateString() : 'Today'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setWithdrawReceipt(wd)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-white/15 bg-white/5 text-xs font-medium text-[#f4f1ea] hover:bg-white/10 whitespace-nowrap"
                    >
                      <QrCode className="w-3.5 h-3.5 text-[#facc15]" />
                      <span>{t.qrViewButton}</span>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : deposits.length === 0 ? (
          <p className="text-sm text-[#9fb3aa] py-8 text-center">{t.noDeposits}</p>
        ) : (
          <ul className="divide-y divide-white/10">
            {deposits.map((dp) => (
              <li key={dp.id} className="py-3.5 flex items-start justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <p className="text-sm font-semibold text-[#f4f1ea] truncate">
                    {t.methods[dp.method]}
                  </p>
                  <p className="text-xs text-[#9fb3aa] font-mono-num truncate">
                    {dp.accountNumber} · {dp.transactionRef}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono-num text-sm font-bold text-emerald-300">
                    +{formatEtb(dp.amount)} {t.etb}
                  </p>
                  <p className="text-xs text-[#cbd5d0]">
                    {dp.createdAt ? dp.createdAt.toDate().toLocaleDateString() : 'Today'}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
