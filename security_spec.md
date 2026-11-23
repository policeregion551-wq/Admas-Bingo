# Security Specification & Payload-First TDD

## 1. Data Invariants
1. A `UserAccount` at `/users/{userId}` can only be read or created by the authenticated, email-verified user whose `request.auth.uid == userId`, with initial `balance == 0` and all cumulative counters at `0`.
2. A `BonusClaim` at `/users/{userId}/bonusClaims/{claimId}` is strictly limited to `amount == 100000`, `dateKey == claimId`, and one claim per `YYYY-MM-DD` document ID, atomically updating the parent `UserAccount` balance by `+100000`.
3. A `WithdrawalRecord` at `/users/{userId}/withdrawals/{withdrawalId}` must have `0 < amount <= 10000000`, a valid payout method, and must accompany an atomic balance debit on `/users/{userId}` that never drives `balance < 0`.
4. A `BingoRound` and `WalletTransaction` cannot be updated or deleted once written (immutable audit trail), and `uid` must strictly equal `request.auth.uid`.
5. No user may list `/users` (PII isolation) or read/write any other user's documents or subcollections.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Write**: Creating `/users/u1` without `request.auth` -> `PERMISSION_DENIED`.
2. **Identity Spoofing**: User `u2` creating `/users/u1` or setting `uid: "u1"` -> `PERMISSION_DENIED`.
3. **Self-Minted Initial Balance**: Creating `/users/u1` with `balance: 5000000` instead of `0` -> `PERMISSION_DENIED`.
4. **Shadow Field Injection**: Creating `/users/u1` with extra field `isAdmin: true` -> `PERMISSION_DENIED`.
5. **Arbitrary Balance Manipulation**: Updating `/users/u1` directly to `balance: 9999999` without matching action invariants -> `PERMISSION_DENIED`.
6. **Inflated Daily Bonus**: Creating `/users/u1/bonusClaims/2026-11-23` with `amount: 500000` -> `PERMISSION_DENIED`.
7. **Duplicate Daily Bonus Replay**: Updating an existing `/users/u1/bonusClaims/2026-11-23` -> `PERMISSION_DENIED`.
8. **Negative Withdrawal / Balance Overdraft**: Updating `/users/u1` balance to `-500` during withdrawal -> `PERMISSION_DENIED`.
9. **Oversized Document ID Poisoning**: Creating `/users/u1/withdrawals/<200-char-id>` -> `PERMISSION_DENIED`.
10. **Client Timestamp Spoofing**: Submitting `createdAt` different from `request.time` -> `PERMISSION_DENIED`.
11. **Ledger Tampering**: Updating or deleting `/users/u1/transactions/tx1` -> `PERMISSION_DENIED`.
12. **Cross-Tenant List Scraping**: User `u2` listing `/users/u1/withdrawals` or `/users` -> `PERMISSION_DENIED`.
