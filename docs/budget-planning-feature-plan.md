# Personal Budget Manager — Final Plan (DynamoDB)

## 1) Overview

Transform the simple transaction tracker into a full-featured **budget + debt** manager with:

- Zero/target-based **monthly budgeting** (allocations + rollover rules)
- **Accounts** (bank, cash, credit), **transfers**, and **split transactions**
- **Shared expenses** with per-person **debt shares** and **partial settlements**
- **Analytics & reports**, dashboard, and exports
- **DynamoDB single-table** schema with GSIs designed around access patterns
- Idempotent APIs, optimistic concurrency, and background rollups via streams

---

## 2) Core Features

### 2.1 Monthly Budget Planning

- Set monthly planned income (optional if you prefer strict zero-based).
- Master **Categories** per user; **Category Allocations** per month.
- Percentage or fixed allocation; per-category **rollover policy** (`none | surplus | deficit | both`).
- **To Be Budgeted (TBB)** / “Available to Allocate” bar.
- Carry-over logic and history preserved.

### 2.2 Transactions & Accounts

- **Accounts**: bank, cash, credit, wallet, etc.
- **Transactions**: pending/cleared/reconciled; supports **splits** across categories.
- **Transfers** (account ↔ account) as first-class transactions.
- **Attachments** (receipts) and notes.

### 2.3 Debt Tracking (Shared Expenses)

- Record shared expenses at the **split** level as **Debt Shares**.
- Track **creditor** (payer) vs **debtor** (app user or external person).
- **Partial payments** via **Debt Payments**, with status updates.
- Person-level summaries and netting (they owe you minus you owe them).

### 2.4 Analytics & Reporting

- Dashboard: TBB, per-category progress, monthly burn, recent txns, debt widget.
- Reports: Budget vs Actual, Category/Tag analysis, Month/Year trends, Debt summaries.
- Export CSV.

### 2.5 Recurring & Forecasting

- **RecurringTransaction** templates with RRULE-like schedule.
- “Due soon” list; optional auto-post or confirm-to-post.
- Simple cashflow forecast.

---

## 3) DynamoDB Data Model (Single Table)

### 3.1 Table & Indexes

**Table**: `BudgetApp`
**Primary Key**:

- `PK` (string), `SK` (string)

**Global Secondary Indexes (GSIs)**:

- **GSI1 (ByUserTypeDate)** — user-wide timelines & lists
  - `GSI1PK`, `GSI1SK`
  - Used for: user-level transactions (all accounts), budgets list by month, quick lookups by user.

- **GSI2 (DebtByRoleStatus)** — debts by **creditor** or **debtor** and status
  - `GSI2PK`, `GSI2SK`
  - On DebtShare & DebtPayment items to query “who owes me / what I owe”.

- **GSI3 (SchedulesDueSoon)** — recurring items due
  - `GSI3PK`, `GSI3SK`
  - Query “SCHEDULE” partition ordered by `nextRunAt`.

- _(Optional later)_ **GSI4 (LookupEmail/Phone)** — external people lookup by email/phone if you need reverse search.

> **Money** stored in minor units (integer), e.g. paise.
> **Dates** stored in `YYYY-MM-DD` and months as `YYYY-MM`.
> Timestamps `createdAt`, `updatedAt` in ISO 8601 (UTC).
> Each item includes `entity` (type) and `version` for optimistic concurrency.

---

### 3.2 Entity & Item Shapes

Below are **logical entities** and their **DynamoDB item shapes** (single-table).
Key naming conventions:

- `USER#{userId}`, `ACCOUNT#{accountId}`, `BUDGET#{userId}#{month}`, `TXN#{transactionId}`, etc.
- When you need range scans, the `SK` encodes sortable prefixes (e.g., `TXN#2025-08-03#<uuid>`).

> Types below are illustrative TypeScript-ish interfaces for **items as they live in DynamoDB**.

#### 3.2.1 User (meta/config)

```ts
interface UserItem {
  PK: `USER#${userId}`;
  SK: 'META';
  entity: 'User';
  userId: string;
  homeCurrency: string; // e.g., 'INR'
  createdAt: string;
  updatedAt: string;
  version: number;
}
```

#### 3.2.2 Account

- Stored under the user for easy listing.

```ts
interface AccountItem {
  PK: `USER#${userId}`;
  SK: `ACCOUNT#${accountId}`;
  entity: 'Account';
  userId: string;
  accountId: string;
  name: string;
  type: 'bank' | 'cash' | 'credit' | 'wallet' | 'investment' | 'loan';
  currency: string; // usually == homeCurrency
  openingBalanceMinor: number;
  isClosed: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}
```

#### 3.2.3 Category (master)

```ts
interface CategoryItem {
  PK: `USER#${userId}`;
  SK: `CAT#${categoryId}`;
  entity: 'Category';
  userId: string;
  categoryId: string;
  name: string;
  parentId?: string; // for hierarchy
  type: 'expense' | 'income';
  isArchived: boolean;
  color?: string;
  order?: number;
  createdAt: string;
  updatedAt: string;
  version: number;
}
```

#### 3.2.4 Budget (month header) & Allocations

- **All budget-month data** lives in the same partition for fast reads.

```ts
interface BudgetMetaItem {
  PK: `BUDGET#${userId}#${month}`; // month = YYYY-MM
  SK: 'META';
  entity: 'Budget';
  userId: string;
  month: string;
  plannedIncomeMinor?: number; // optional planned income
  createdAt: string;
  updatedAt: string;
  version: number;

  // For listing budgets by user:
  GSI1PK: `USER#${userId}`;
  GSI1SK: `BUDGET#${month}`;
}

interface CategoryAllocationItem {
  PK: `BUDGET#${userId}#${month}`;
  SK: `ALOC#${categoryId}`;
  entity: 'CategoryAllocation';
  userId: string;
  month: string;
  categoryId: string;
  allocationType: 'percentage' | 'fixed';
  allocationValue: number; // percentage(0–100) or fixed in minor units
  allocatedMinor: number; // computed snapshot
  rollover: 'none' | 'surplus' | 'deficit' | 'both';
  color?: string; // UI hint
  order?: number;
  createdAt: string;
  updatedAt: string;
  version: number;
}
```

#### 3.2.5 Transaction (with embedded splits)

- Partitioned by **account** for scalable write/read throughput.
- Also projected to **GSI1** for user-wide date queries.

```ts
interface TransactionItem {
  PK: `ACCOUNT#${accountId}`;
  SK: `TXN#${date}#${transactionId}`; // date = YYYY-MM-DD
  entity: 'Transaction';
  userId: string;
  accountId: string;
  transactionId: string;
  date: string;
  amountMinor: number; // signed: outflow negative, inflow positive
  type: 'standard' | 'transfer' | 'refund' | 'adjustment';
  status: 'pending' | 'cleared' | 'reconciled';
  counterparty?: string; // merchant/payee
  description?: string;
  note?: string;
  originalCurrency?: string;
  originalAmountMinor?: number;
  fxRate?: number;
  isShared: boolean; // any DebtShare exists for this txn?

  // Embedded splits (for budget math & UI)
  splits: Array<{
    splitId: string; // unique within txn
    categoryId?: string; // transfers may omit
    amountMinor: number; // signed; sum(splits) == amountMinor (non-transfer)
    memo?: string;
  }>;

  attachments?: Array<{
    attachmentId: string;
    s3Key: string;
    mime: string;
  }>;

  createdAt: string;
  updatedAt: string;
  version: number;

  // User-wide timeline (GSI1)
  GSI1PK: `USER#${userId}`;
  GSI1SK: `TXN#${date}#${transactionId}`;
}
```

> **Note:** Because splits are embedded, we create **DebtShare** items to point to `transactionId + splitId` for debt tracking & GSIs.

#### 3.2.6 Debt Share & Debt Payment

```ts
// One row per participant share of a (split) expense
interface DebtShareItem {
  PK: `DEBT#${creditorId}`; // query "who owes me"
  SK: `SHARE#${status}#${debtorKey}#${createdAt}#${debtShareId}`;
  entity: 'DebtShare';
  debtShareId: string;
  creditorId: string; // user who paid
  // Either internal user or external person:
  debtorId?: string;
  externalPersonId?: string;
  debtorKey: string; // 'U#<id>' or 'X#<externalPersonId>'

  userId: string; // == creditorId (owner partition)
  transactionId: string;
  accountId: string;
  splitId: string; // points into Transaction.splits[]
  amountMinor: number; // owed amount
  status: 'pending' | 'partial' | 'settled';
  createdAt: string;
  updatedAt: string;
  version: number;

  // GSI for "what I owe" (as debtor)
  GSI2PK: `DEBTOR#${debtorKey}`;
  GSI2SK: `DEBT#${status}#${creditorId}#${createdAt}#${debtShareId}`;
}

// Payments recorded against a share
interface DebtPaymentItem {
  PK: `DEBT#SHARE#${debtShareId}`;
  SK: `PAY#${date}#${debtPaymentId}`;
  entity: 'DebtPayment';
  debtPaymentId: string;
  debtShareId: string;
  amountMinor: number;
  date: string;
  method: 'cash' | 'transfer' | 'adjustment';
  settlementTransactionId?: string; // optional link to a credit/back txn
  createdAt: string;
  updatedAt: string;

  // Project to DebtByRoleStatus index for recent payments lists
  GSI2PK: `CREDITOR#${creditorId}`; // duplicate attrs for GSI scans
  GSI2SK: `PAY#${date}#${debtPaymentId}`;
  // optional second projection
  // GSI2PK: `DEBTOR#${debtorKey}`, GSI2SK: `PAY#${date}#${debtPaymentId}`;
}
```

#### 3.2.7 External People (contacts)

```ts
interface ExternalPersonItem {
  PK: `USER#${userId}`;
  SK: `PERSON#${externalPersonId}`;
  entity: 'ExternalPerson';
  userId: string;
  externalPersonId: string;
  name: string;
  email?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;

  // Optional reverse lookups (enable later if needed):
  // GSI4PK: `EMAIL#${email}`, GSI4SK: `USER#${userId}#PERSON#${externalPersonId}`
  // GSI4PK: `PHONE#${phone}`, GSI4SK: `USER#${userId}#PERSON#${externalPersonId}`
}
```

#### 3.2.8 Recurring Transactions

```ts
interface RecurringTransactionItem {
  PK: `USER#${userId}`;
  SK: `RCR#${recurringId}`;
  entity: 'Recurring';
  userId: string;
  recurringId: string;
  template: {
    accountId: string;
    defaultCounterparty?: string;
    defaultSplits: Array<{ categoryId?: string; amountMinor: number; memo?: string }>;
  };
  schedule: string; // RRULE-like
  nextRunAt: string; // ISO timestamp
  lastRunAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;

  // Global due-soon queue:
  GSI3PK: 'SCHEDULE';
  GSI3SK: `DUE#${nextRunAt}#${userId}#${recurringId}`;
}
```

#### 3.2.9 Summaries (materialized rollups)

- Maintained via **DynamoDB Streams** + Lambda on Transaction writes/updates.

```ts
// Per (user, month, category): actuals/available for budget screen
interface CategoryMonthSummaryItem {
  PK: `BUDGET#${userId}#${month}`;
  SK: `SUM#CAT#${categoryId}`;
  entity: 'CategoryMonthSummary';
  userId: string;
  month: string;
  categoryId: string;

  // computed:
  allocatedMinor: number; // from CategoryAllocationItem
  actualMinor: number; // sum of splits in month
  carryInMinor: number; // from previous month per rollover rules
  availableMinor: number; // carryIn + allocated - actual
  updatedAt: string;
}

// Optional per-budget snapshot
interface BudgetMonthSnapshotItem {
  PK: `BUDGET#${userId}#${month}`;
  SK: 'SUM#BUDGET';
  entity: 'BudgetMonthSnapshot';
  userId: string;
  month: string;
  incomeMinor: number; // sum(txn.type income)
  outflowMinor: number;
  tbbMinor: number; // To Be Budgeted
  updatedAt: string;
}
```

#### 3.2.10 Attachments (receipts)

```ts
interface AttachmentItem {
  PK: `TXN#${transactionId}`;
  SK: `ATTACH#${attachmentId}`;
  entity: 'Attachment';
  userId: string;
  transactionId: string;
  attachmentId: string;
  s3Key: string;
  mime: string;
  createdAt: string;
}
```

#### 3.2.11 Audit Log (optional in-table)

```ts
interface AuditItem {
  PK: `USER#${userId}`;
  SK: `AUDIT#${timestamp}#${auditId}`;
  entity: 'Audit';
  action: string; // e.g., 'SET_ALLOCATION', 'ADD_TXN'
  actorId: string; // usually userId
  payload: Record<string, unknown>;
  createdAt: string;
}
```

---

### 3.3 Primary Access Patterns & How Keys Support Them

| Use case                                              | Query                                                                          |
| ----------------------------------------------------- | ------------------------------------------------------------------------------ |
| List **accounts** for a user                          | `Query PK = USER#u, begins_with(SK, 'ACCOUNT#')`                               |
| List **categories** for a user                        | `Query PK = USER#u, begins_with(SK, 'CAT#')`                                   |
| Get **budget month** (meta + allocations + summaries) | `Query PK = BUDGET#u#YYYY-MM` (1 round trip)                                   |
| List **budget months**                                | `Query GSI1PK = USER#u, begins_with(GSI1SK, 'BUDGET#')`                        |
| Transactions for an **account** in date range         | `Query PK = ACCOUNT#accId, SK between 'TXN#from' and 'TXN#to'`                 |
| Transactions **across all accounts** for a user       | `Query GSI1PK = USER#u, GSI1SK between 'TXN#from' and 'TXN#to'`                |
| Debts **owed to me** (creditor view)                  | `Query PK = DEBT#<myUserId>, begins_with(SK, 'SHARE#pending#')`                |
| Debts **I owe** (debtor view)                         | `Query GSI2PK = DEBTOR#<me or external>, begins_with(GSI2SK, 'DEBT#pending#')` |
| Payments for a **debt share**                         | `Query PK = DEBT#SHARE#<debtShareId>, begins_with(SK, 'PAY#')`                 |
| **Recurring** due soon                                | `Query GSI3PK = 'SCHEDULE', GSI3SK <= 'DUE#<now>'`                             |
| **Attachments** for a transaction                     | `Query PK = TXN#<transactionId>, begins_with(SK, 'ATTACH#')`                   |

---

## 4) API (v1)

> REST shape kept simple; server maps calls to Dynamo patterns above.
> All money fields in **minor units**.
> Support **Idempotency-Key** headers on POST/PUT.
> Use `version` with conditional writes (optimistic concurrency).

### 4.1 Accounts & Categories

```
GET   /v1/accounts
POST  /v1/accounts
PATCH /v1/accounts/:id
DELETE/v1/accounts/:id

GET   /v1/categories
POST  /v1/categories
PATCH /v1/categories/:id
DELETE/v1/categories/:id
```

### 4.2 Budgets & Allocations

```
GET   /v1/budgets?from=YYYY-MM&to=YYYY-MM     // lists months
POST  /v1/budgets                              // create month meta
GET   /v1/budgets/:month                       // returns budget meta, allocations, summaries
PATCH /v1/budgets/:month

GET   /v1/budgets/:month/allocations
POST  /v1/budgets/:month/allocations
PATCH /v1/allocations/:id
DELETE/v1/allocations/:id
```

### 4.3 Transactions & Attachments

```
GET   /v1/transactions?accountId=&from=&to=&status=&cursor=
GET   /v1/transactions?from=&to=&status=&cursor=            // user-wide via GSI1
POST  /v1/transactions                                       // includes splits; handles transfers
PATCH /v1/transactions/:id
DELETE/v1/transactions/:id

POST  /v1/transactions/:id/attachments
DELETE/v1/attachments/:id
```

### 4.4 Debts

```
GET   /v1/debts?role=creditor|debtor&status=pending|partial|settled&personId=&cursor=
GET   /v1/debts/:debtShareId
POST  /v1/debts/:debtShareId/payments
GET   /v1/debts/:debtShareId/payments
```

### 4.5 External People & Recurring

```
GET   /v1/people
POST  /v1/people
PATCH /v1/people/:id
DELETE/v1/people/:id

GET   /v1/recurring
POST  /v1/recurring
PATCH /v1/recurring/:id
POST  /v1/recurring/:id/run-now
```

### 4.6 Reports & Export

```
GET /v1/reports/budget-vs-actual?month=YYYY-MM
GET /v1/reports/spending-by-category?from=&to=
GET /v1/reports/debts?asOf=YYYY-MM-DD
GET /v1/export
```

**Server-side behaviors**

- **POST /transactions**: `TransactWrite` to upsert `TransactionItem` + any `DebtShareItem`s.
- **PATCH /transactions/\:id**: Conditional update on `version`; write an Audit item.
- **POST /debts/\:id/payments**: `TransactWrite` payment + status update on share.
- **Streams**: Recompute `CategoryMonthSummaryItem` + `BudgetMonthSnapshotItem`.

---

## 5) Budget Engine (deterministic math)

- For category **available** in month `M`:

  ```
  available[M] = carryIn[M] + allocated[M] - actual[M]
  carryIn[M]  =
    if rollover == 'none'      then 0
    if 'surplus'               then max(available[M-1], 0)
    if 'deficit'               then min(available[M-1], 0)
    if 'both'                  then available[M-1]
  ```

- **TBB (To Be Budgeted):**
  `tbb[M] = sum(income posted in M) + priorTbb - sum(allocated[M])`
- **Transfers**: no category; don’t affect income/outflow aggregates.
- **Credit accounts**: define overspend handling explicitly (reduce next month’s available or move to liability category).

---

## 6) UI & Pages

### 6.1 Pages

- `/dashboard`: TBB, budget overview cards, category progress, quick add, debts summary, recent txns.
- `/budget`: Monthly editor (allocations table with %/fixed & rollover), historical switcher.
- `/transactions`: Filters (account, category), split editor, bulk categorize, export.
- `/debts`: People-first view; breakdown and settlement modal; payment history.

### 6.2 Components (unchanged structure, renamed where helpful)

```
/src/features/budget/
├── components/
│   ├── budget-creator/
│   │   ├── BudgetCreator.tsx
│   │   ├── CategoryManager.tsx
│   │   └── AllocationCalculator.tsx
│   ├── budget-overview/
│   │   ├── BudgetOverview.tsx
│   │   ├── CategoryProgress.tsx
│   │   └── SpendingChart.tsx
│   ├── shared-expense/
│   │   ├── SharedExpenseForm.tsx
│   │   ├── DebtorSelector.tsx
│   │   └── SplitCalculator.tsx
│   └── debt-tracker/
│       ├── DebtSummary.tsx
│       ├── DebtList.tsx
│       └── SettleDebtModal.tsx
```

**UX tips**

- Sticky **TBB** bar + “Apply % to income” button.
- Inline split editor with keyboard shortcuts.
- Debt quick action “Record payment”.
- Empty states & templates (50/30/20, essentials).
- Accessible charts (ARIA) and focus traps in modals.

---

## 7) Implementation Phases (8–10 weeks)

**Phase 0 (Week 0–1)** — _Design & Foundations_

- Finalize Dynamo key patterns & GSIs; money precision; timezones.
- Auth (Cognito/NextAuth), RBAC (single-tenant by `userId`).
- Infra: API Gateway/Lambda (or Node backend), S3 for attachments, DynamoDB Streams, CloudWatch Events for schedules.
- Shared library for **Idempotency-Key**, `version` checks, Zod schema validation.

**Phase 1 (Week 2)** — _Accounts & Categories_

- CRUD + list (Dynamo queries).
- Basic UI for accounts and categories.
- Seeds/fixtures.

**Phase 2 (Week 3–4)** — _Budgets & Allocations_

- Create budget month; allocations editor.
- TBB bar + validation (sum %, fixed caps).
- Budget overview on dashboard.
- GSI1 listing of months.

**Phase 3 (Week 5–6)** — _Transactions, Splits, Transfers_

- Transaction form + split editor, attachments, reconcile mode.
- Streams-driven rollups to CategoryMonthSummary & Budget snapshot.
- Dashboard progress bars.

**Phase 4 (Week 7–8)** — _Shared Expenses & Debt_

- DebtShare + DebtPayment + external people.
- Debts page, person chips, settlement flow, partial payments.
- Reports: debts summary & net by person.

**Phase 5 (Week 9–10)** — _Analytics, Recurring, Polish_

- Trends & category analysis; CSV export.
- Recurring with GSI3 “due soon” + run-now/auto-post.
- Perf pass (indexes, hot partitions), mobile polish.

---

## 8) Validation, Security, Performance

- **Validation**: server-side Zod; reject allocations sum issues; enforce split sum equals txn amount; validate debt shares ≤ split value.
- **Security**: row-level access by `userId` on every request; encrypt PII (external people) at rest; avoid logging PII.
- **Idempotency**: POSTs require `Idempotency-Key`; store a request ledger item `REQ#${userId}` to dedupe.
- **Optimistic concurrency**: `version` + `ConditionExpression` on updates.
- **Streams**: Update rollups on transaction/allocations changes; reconcile deletions/edits.
- **Indexes & hot keys**: Transactions partitioned by **account** avoids user-level hot partitions; user-wide scans use GSI1.
- **Backups**: PITR for Dynamo; object versioning in S3 for receipts.
- **Export**: on-demand export from rollups + raw txns to CSV.

---

## 9) Edge Cases & Rules of Thumb

- **Refunds/chargebacks**: `type='refund'` with negative/positive signs accordingly; link to original via `relatedTransactionId`.
- **Transfers**: two legs or single item? Keep **single item** with `type='transfer'` and both `fromAccountId`/`toAccountId` in payload; you may also create a mirrored transaction for the other account if you prefer symmetric ledgers.
- **Rounding**: percent-based allocations snapshot to integer at time of set; don’t retroactively change unless user re-applies.
- **Category changes**: archive old category; keep history; reassign if needed via maintenance tool.
- **Imports**: hash rows to detect duplicates; map columns; save mapping per user.
- **External → internal**: when an external person becomes a user, populate `debtorId` and keep `externalPersonId` for history.

---

## 10) Example Items (abbreviated)

**Budget Month (2025-08)**

```json
{ "PK":"BUDGET#U#123#2025-08","SK":"META","entity":"Budget","userId":"U#123","month":"2025-08","plannedIncomeMinor":12000000,"GSI1PK":"USER#U#123","GSI1SK":"BUDGET#2025-08","createdAt":"2025-08-01T00:00:00Z","updatedAt":"2025-08-01T00:00:00Z","version":1 }
{ "PK":"BUDGET#U#123#2025-08","SK":"ALOC#CAT#groceries","entity":"CategoryAllocation","userId":"U#123","month":"2025-08","categoryId":"CAT#groceries","allocationType":"fixed","allocationValue":150000,"allocatedMinor":150000,"rollover":"both","createdAt":"2025-08-01T00:00:00Z","updatedAt":"2025-08-01T00:00:00Z","version":1 }
```

**Transaction with splits (and GSI1 projection)**

```json
{
  "PK": "ACCOUNT#A#bank1",
  "SK": "TXN#2025-08-03#TXN#abc",
  "entity": "Transaction",
  "userId": "U#123",
  "accountId": "A#bank1",
  "transactionId": "TXN#abc",
  "date": "2025-08-03",
  "amountMinor": -230000,
  "type": "standard",
  "status": "cleared",
  "counterparty": "Big Bazaar",
  "splits": [
    { "splitId": "S1", "categoryId": "CAT#groceries", "amountMinor": -200000 },
    { "splitId": "S2", "categoryId": "CAT#household", "amountMinor": -30000 }
  ],
  "GSI1PK": "USER#U#123",
  "GSI1SK": "TXN#2025-08-03#TXN#abc",
  "createdAt": "2025-08-03T10:15:00Z",
  "updatedAt": "2025-08-03T10:15:00Z",
  "version": 1
}
```

**Debt Share (friend owes part of S1)**

```json
{
  "PK": "DEBT#U#123",
  "SK": "SHARE#pending#X#ext-42#2025-08-03T10:16:00Z#DS#1",
  "entity": "DebtShare",
  "debtShareId": "DS#1",
  "creditorId": "U#123",
  "externalPersonId": "ext-42",
  "debtorKey": "X#ext-42",
  "userId": "U#123",
  "transactionId": "TXN#abc",
  "accountId": "A#bank1",
  "splitId": "S1",
  "amountMinor": -100000,
  "status": "pending",
  "createdAt": "2025-08-03T10:16:00Z",
  "updatedAt": "2025-08-03T10:16:00Z",
  "version": 1,
  "GSI2PK": "DEBTOR#X#ext-42",
  "GSI2SK": "DEBT#pending#U#123#2025-08-03T10:16:00Z#DS#1"
}
```

**Debt Payment**

```json
{
  "PK": "DEBT#SHARE#DS#1",
  "SK": "PAY#2025-08-05#DP#1",
  "entity": "DebtPayment",
  "debtPaymentId": "DP#1",
  "debtShareId": "DS#1",
  "amountMinor": -50000,
  "date": "2025-08-05",
  "method": "transfer",
  "createdAt": "2025-08-05T09:00:00Z",
  "updatedAt": "2025-08-05T09:00:00Z",
  "GSI2PK": "CREDITOR#U#123",
  "GSI2SK": "PAY#2025-08-05#DP#1"
}
```

---

## 11) Testing & Observability

- **Golden tests** for budget math (rollover edge cases, credit overspend).
- **API contract tests** (OpenAPI + Prism).
- **E2E flows**: budget→txn/split→shared→partial payment→reports.
- **Telemetry**: Dynamo consumed capacity, hot partitions, stream lag, recompute durations.
- **Alarms**: stream processing failures, recurring scheduler drift.

---

## 12) What’s intentionally deferred (v2+)

- Multi-currency with FX revaluation across months.
- Bank import integrations (SMS/UPI/email parsers).
- Groups/Trips for shared expenses (nice-to-have layer over DebtShare).
- Budget templates marketplace.

---

### TL;DR

- **Single-table Dynamo** with `PK/SK` + **GSI1** (user timelines), **GSI2** (debts by role/status), **GSI3** (schedules).
- **Accounts + split transactions + transfers** are first-class.
- **DebtShare + DebtPayment** model enables partial settlements.
- **Budget allocations** are per-month items; **summaries** are stream-built for fast dashboards.
- APIs are idempotent with **optimistic concurrency**.

If you want, I can generate an **OpenAPI spec** for these endpoints or a **CloudFormation/CDK snippet** for the table + GSIs next.

## Migration Strategy

1. Keep existing transaction system functional
2. Add new features incrementally
3. Provide data migration for existing transactions
4. Allow users to categorize old transactions

## Testing Strategy

### Unit Tests

- Budget calculation logic
- Debt splitting algorithms
- API endpoint validation

### Integration Tests

- Budget creation flow
- Transaction categorization
- Debt settlement process

### E2E Tests

- Complete budget setup
- Monthly budget cycle
- Debt tracking workflow

## Future Enhancements

1. **Budget Templates**: Pre-defined budget categories for common scenarios
2. **Recurring Transactions**: Auto-create monthly expenses
3. **Budget Alerts**: Notifications when approaching limits
4. **Multi-currency Support**: Handle different currencies
5. **Collaborative Budgets**: Share budgets with family members
6. **AI Insights**: Smart spending recommendations
7. **Bill Reminders**: Track and remind about upcoming bills
8. **Investment Tracking**: Link to investment accounts

## Conclusion

This implementation plan transforms the Personal Budget Manager into a comprehensive financial management tool. By following this phased approach, we can deliver value incrementally while maintaining system stability and user experience.
