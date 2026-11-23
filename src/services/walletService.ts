import { User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { DAILY_BONUS_ETB } from '../i18n';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  BingoRound,
  CashierMethod,
  DepositRecord,
  UserAccount,
  WalletTransaction,
  WinPattern,
  WithdrawalRecord,
} from '../types';

export function getTodayDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function makeDocId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${rand}`;
}

export async function ensureUserAccount(user: User): Promise<void> {
  const path = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      const displayName = (user.displayName || user.email?.split('@')[0] || 'Member').slice(0, 80);
      const email = (user.email || 'member@example.com').slice(0, 120);
      await setDoc(userRef, {
        uid: user.uid,
        displayName,
        email,
        balance: 0,
        totalBonusClaimed: 0,
        totalDeposited: 0,
        totalWithdrawn: 0,
        totalWagered: 0,
        totalWon: 0,
        gamesPlayed: 0,
        gamesWon: 0,
        lastBonusDate: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeUserAccount(
  uid: string,
  onData: (account: UserAccount | null) => void,
  onError: (err: Error) => void
): () => void {
  const path = `users/${uid}`;
  return onSnapshot(
    doc(db, 'users', uid),
    (snapshot) => {
      if (snapshot.exists()) {
        onData(snapshot.data() as UserAccount);
      } else {
        onData(null);
      }
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (err) {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    }
  );
}

export function subscribeTransactions(
  uid: string,
  onData: (items: WalletTransaction[]) => void,
  onError: (err: Error) => void
): () => void {
  const path = `users/${uid}/transactions`;
  const q = query(collection(db, 'users', uid, 'transactions'), orderBy('createdAt', 'desc'), limit(40));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: WalletTransaction[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<WalletTransaction, 'id'>),
      }));
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (err) {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    }
  );
}

export function subscribeDeposits(
  uid: string,
  onData: (items: DepositRecord[]) => void,
  onError: (err: Error) => void
): () => void {
  const path = `users/${uid}/deposits`;
  const q = query(collection(db, 'users', uid, 'deposits'), orderBy('createdAt', 'desc'), limit(20));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: DepositRecord[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<DepositRecord, 'id'>),
      }));
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (err) {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    }
  );
}

export function subscribeWithdrawals(
  uid: string,
  onData: (items: WithdrawalRecord[]) => void,
  onError: (err: Error) => void
): () => void {
  const path = `users/${uid}/withdrawals`;
  const q = query(collection(db, 'users', uid, 'withdrawals'), orderBy('createdAt', 'desc'), limit(20));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: WithdrawalRecord[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<WithdrawalRecord, 'id'>),
      }));
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (err) {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    }
  );
}

export function subscribeBingoRounds(
  uid: string,
  onData: (items: BingoRound[]) => void,
  onError: (err: Error) => void
): () => void {
  const path = `users/${uid}/bingoRounds`;
  const q = query(collection(db, 'users', uid, 'bingoRounds'), orderBy('createdAt', 'desc'), limit(25));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: BingoRound[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<BingoRound, 'id'>),
      }));
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (err) {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    }
  );
}

export async function claimDailyBonus(account: UserAccount): Promise<string> {
  const dateKey = getTodayDateKey();
  const userRef = doc(db, 'users', account.uid);
  const claimRef = doc(db, 'users', account.uid, 'bonusClaims', dateKey);
  const txId = makeDocId('tx_bonus');
  const txRef = doc(db, 'users', account.uid, 'transactions', txId);

  try {
    await runTransaction(db, async (tx) => {
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists()) throw new Error('ACCOUNT_NOT_FOUND');
      const live = userSnap.data() as UserAccount;
      if (live.lastBonusDate === dateKey) {
        throw new Error('ALREADY_CLAIMED_TODAY');
      }

      const newBalance = Math.round(live.balance + DAILY_BONUS_ETB);
      const newTotalBonus = Math.round(live.totalBonusClaimed + DAILY_BONUS_ETB);

      tx.set(claimRef, {
        uid: account.uid,
        dateKey,
        amount: DAILY_BONUS_ETB,
        claimedAt: serverTimestamp(),
      });
      tx.update(userRef, {
        balance: newBalance,
        totalBonusClaimed: newTotalBonus,
        lastBonusDate: dateKey,
        updatedAt: serverTimestamp(),
      });
      tx.set(txRef, {
        uid: account.uid,
        type: 'daily_bonus',
        amount: DAILY_BONUS_ETB,
        direction: 'credit',
        balanceAfter: newBalance,
        description: `Daily Bonus (${dateKey})`,
        referenceId: dateKey,
        createdAt: serverTimestamp(),
      });
    });
    return dateKey;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${account.uid}/bonusClaims/${dateKey}`);
  }
}

export async function processDeposit(
  account: UserAccount,
  params: {
    amount: number;
    method: CashierMethod;
    accountNumber: string;
    accountHolder: string;
    transactionRef: string;
  }
): Promise<DepositRecord> {
  const amount = Math.round(params.amount);
  const accountNumber = params.accountNumber.trim().slice(0, 40);
  const accountHolder = params.accountHolder.trim().slice(0, 80);
  const transactionRef = params.transactionRef.trim().slice(0, 40);
  const depositId = makeDocId('dp');
  const referenceCode = `DP-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const txId = makeDocId('tx_dp');

  const userRef = doc(db, 'users', account.uid);
  const depositRef = doc(db, 'users', account.uid, 'deposits', depositId);
  const txRef = doc(db, 'users', account.uid, 'transactions', txId);

  try {
    await runTransaction(db, async (tx) => {
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists()) throw new Error('ACCOUNT_NOT_FOUND');
      const live = userSnap.data() as UserAccount;
      if (!Number.isFinite(amount) || amount <= 0 || amount > 10000000) {
        throw new Error('INVALID_DEPOSIT_AMOUNT');
      }

      const newBalance = Math.round(live.balance + amount);
      const prevDeposited = typeof live.totalDeposited === 'number' ? live.totalDeposited : 0;
      const newTotalDeposited = Math.round(prevDeposited + amount);

      tx.update(userRef, {
        balance: newBalance,
        totalDeposited: newTotalDeposited,
        updatedAt: serverTimestamp(),
      });
      tx.set(depositRef, {
        uid: account.uid,
        amount,
        method: params.method,
        accountNumber,
        accountHolder,
        transactionRef,
        referenceCode,
        status: 'completed',
        createdAt: serverTimestamp(),
      });
      tx.set(txRef, {
        uid: account.uid,
        type: 'deposit',
        amount,
        direction: 'credit',
        balanceAfter: newBalance,
        description: `Deposit via ${params.method === 'telebirr' ? 'Telebirr' : 'CBE'} (${accountNumber})`.slice(0, 140),
        referenceId: referenceCode,
        createdAt: serverTimestamp(),
      });
    });

    return {
      id: depositId,
      uid: account.uid,
      amount,
      method: params.method,
      accountNumber,
      accountHolder,
      transactionRef,
      referenceCode,
      status: 'completed',
      createdAt: null,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${account.uid}/deposits/${depositId}`);
  }
}

export async function processWithdrawal(
  account: UserAccount,
  params: {
    amount: number;
    method: CashierMethod;
    accountNumber: string;
    accountHolder: string;
  }
): Promise<WithdrawalRecord> {
  const amount = Math.round(params.amount);
  const accountNumber = params.accountNumber.trim().slice(0, 40);
  const accountHolder = params.accountHolder.trim().slice(0, 80);
  const withdrawalId = makeDocId('wd');
  const referenceCode = `WD-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const txId = makeDocId('tx_wd');

  const userRef = doc(db, 'users', account.uid);
  const withdrawalRef = doc(db, 'users', account.uid, 'withdrawals', withdrawalId);
  const txRef = doc(db, 'users', account.uid, 'transactions', txId);

  try {
    await runTransaction(db, async (tx) => {
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists()) throw new Error('ACCOUNT_NOT_FOUND');
      const live = userSnap.data() as UserAccount;
      if (!Number.isFinite(amount) || amount <= 0 || amount > live.balance) {
        throw new Error('INVALID_WITHDRAW_AMOUNT');
      }

      const newBalance = Math.round(live.balance - amount);
      const newTotalWithdrawn = Math.round(live.totalWithdrawn + amount);

      tx.update(userRef, {
        balance: newBalance,
        totalWithdrawn: newTotalWithdrawn,
        updatedAt: serverTimestamp(),
      });
      tx.set(withdrawalRef, {
        uid: account.uid,
        amount,
        method: params.method,
        accountNumber,
        accountHolder,
        referenceCode,
        status: 'completed',
        createdAt: serverTimestamp(),
      });
      tx.set(txRef, {
        uid: account.uid,
        type: 'withdrawal',
        amount,
        direction: 'debit',
        balanceAfter: newBalance,
        description: `Withdraw via ${params.method === 'telebirr' ? 'Telebirr' : 'CBE'} (${accountNumber})`.slice(0, 140),
        referenceId: referenceCode,
        createdAt: serverTimestamp(),
      });
    });

    return {
      id: withdrawalId,
      uid: account.uid,
      amount,
      method: params.method,
      accountNumber,
      accountHolder,
      referenceCode,
      status: 'completed',
      createdAt: null,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${account.uid}/withdrawals/${withdrawalId}`);
  }
}

export async function startBingoWager(account: UserAccount, stakeAmount: number): Promise<string> {
  const stake = Math.round(stakeAmount);
  const roundId = makeDocId('rnd');
  const txId = makeDocId('tx_wager');

  const userRef = doc(db, 'users', account.uid);
  const txRef = doc(db, 'users', account.uid, 'transactions', txId);

  try {
    await runTransaction(db, async (tx) => {
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists()) throw new Error('ACCOUNT_NOT_FOUND');
      const live = userSnap.data() as UserAccount;
      if (!Number.isFinite(stake) || stake <= 0 || stake > live.balance || stake > 1000000) {
        throw new Error('INVALID_STAKE');
      }

      const newBalance = Math.round(live.balance - stake);
      const newTotalWagered = Math.round(live.totalWagered + stake);

      tx.update(userRef, {
        balance: newBalance,
        totalWagered: newTotalWagered,
        gamesPlayed: live.gamesPlayed + 1,
        updatedAt: serverTimestamp(),
      });
      tx.set(txRef, {
        uid: account.uid,
        type: 'bingo_wager',
        amount: stake,
        direction: 'debit',
        balanceAfter: newBalance,
        description: `Bingo Round Stake (${stake} ETB)`,
        referenceId: roundId,
        createdAt: serverTimestamp(),
      });
    });
    return roundId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${account.uid}`);
  }
}

export async function settleBingoRound(
  account: UserAccount,
  params: {
    roundId: string;
    stake: number;
    payout: number;
    multiplier: number;
    ballsDrawnCount: number;
    pattern: WinPattern;
    outcome: 'won' | 'lost';
  }
): Promise<void> {
  const payout = Math.round(params.payout);
  const stake = Math.round(params.stake);
  const roundRef = doc(db, 'users', account.uid, 'bingoRounds', params.roundId);
  const userRef = doc(db, 'users', account.uid);

  try {
    await runTransaction(db, async (tx) => {
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists()) throw new Error('ACCOUNT_NOT_FOUND');
      const live = userSnap.data() as UserAccount;

      tx.set(roundRef, {
        uid: account.uid,
        stake,
        payout,
        multiplier: params.multiplier,
        ballsDrawnCount: params.ballsDrawnCount,
        pattern: params.pattern,
        outcome: params.outcome,
        createdAt: serverTimestamp(),
      });

      if (params.outcome === 'won' && payout > 0) {
        const newBalance = Math.round(live.balance + payout);
        const newTotalWon = Math.round(live.totalWon + payout);
        const txId = makeDocId('tx_win');
        const txRef = doc(db, 'users', account.uid, 'transactions', txId);

        tx.update(userRef, {
          balance: newBalance,
          totalWon: newTotalWon,
          gamesWon: live.gamesWon + 1,
          updatedAt: serverTimestamp(),
        });
        tx.set(txRef, {
          uid: account.uid,
          type: 'bingo_win',
          amount: payout,
          direction: 'credit',
          balanceAfter: newBalance,
          description: `Bingo Win ${params.multiplier}x (${params.pattern})`.slice(0, 140),
          referenceId: params.roundId,
          createdAt: serverTimestamp(),
        });
      }
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${account.uid}/bingoRounds/${params.roundId}`);
  }
}
