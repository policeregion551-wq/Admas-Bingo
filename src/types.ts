import { Timestamp } from 'firebase/firestore';

export type Language = 'am' | 'en';

export type ActiveTab = 'arena' | 'bonus' | 'withdraw' | 'ledger';

export type GamePhase = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'ROUND_SUMMARY';

export type DrawMode = 'auto_normal' | 'auto_fast' | 'manual';

export type WinPattern = 'row' | 'column' | 'diagonal' | 'four_corners' | 'none';

export type CashierMethod = 'telebirr' | 'cbe_bank';

export type WithdrawalMethod =
  | 'telebirr'
  | 'cbe_birr'
  | 'cbe_bank'
  | 'awash_bank'
  | 'abyssinia_bank';

export type ToastVariant = 'success' | 'error';

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  title: string;
  message: string;
}

export interface UserAccount {
  uid: string;
  displayName: string;
  email: string;
  balance: number;
  totalBonusClaimed: number;
  totalDeposited?: number;
  totalWithdrawn: number;
  totalWagered: number;
  totalWon: number;
  gamesPlayed: number;
  gamesWon: number;
  lastBonusDate: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface BonusClaim {
  id: string;
  uid: string;
  dateKey: string;
  amount: number;
  claimedAt: Timestamp | null;
}

export interface DepositRecord {
  id: string;
  uid: string;
  amount: number;
  method: CashierMethod;
  accountNumber: string;
  accountHolder: string;
  transactionRef: string;
  referenceCode: string;
  status: 'completed';
  createdAt: Timestamp | null;
}

export interface WithdrawalRecord {
  id: string;
  uid: string;
  amount: number;
  method: WithdrawalMethod;
  accountNumber: string;
  accountHolder: string;
  referenceCode: string;
  status: 'completed';
  createdAt: Timestamp | null;
}

export interface BingoRound {
  id: string;
  uid: string;
  stake: number;
  payout: number;
  multiplier: number;
  ballsDrawnCount: number;
  pattern: WinPattern;
  outcome: 'won' | 'lost';
  createdAt: Timestamp | null;
}

export interface WalletTransaction {
  id: string;
  uid: string;
  type: 'daily_bonus' | 'deposit' | 'withdrawal' | 'bingo_wager' | 'bingo_win';
  amount: number;
  direction: 'credit' | 'debit';
  balanceAfter: number;
  description: string;
  referenceId: string;
  createdAt: Timestamp | null;
}

export interface BingoCell {
  row: number;
  col: number;
  letter: 'B' | 'I' | 'N' | 'G' | 'O';
  value: number | 'FREE';
  daubed: boolean;
}

export interface BingoWinResult {
  hasWin: boolean;
  pattern: WinPattern;
  winningCoords: string[];
}
