# Budget Management Feature

This feature provides comprehensive budget management functionality for the Personal Budget Manager application, implementing a Test-Driven Development (TDD) approach with full test coverage.

## Overview

The Budget Management feature allows users to:

- Create monthly budgets with planned income
- Allocate funds to categories using fixed amounts or percentages
- Track spending against allocations
- Calculate remaining budget amounts
- Manage budget lifecycle (draft → active → closed)
- Support rollover allocations for future months

## Architecture

### Domain Models

#### Budget

Represents a monthly budget with the following properties:

- `budgetId`: Unique identifier
- `userId`: Owner of the budget
- `month`: YYYY-MM format
- `plannedIncomeMinor`: Expected income in minor currency units
- `actualIncomeMinor`: Actual income received
- `totalAllocatedMinor`: Total amount allocated to categories
- `status`: Budget state (draft, active, closed)

#### CategoryAllocation

Represents how budget funds are allocated to spending categories:

- `allocationId`: Unique identifier
- `budgetId`: Associated budget
- `categoryId`: Target category
- `allocationType`: 'fixed' or 'percentage'
- `allocationValue`: Amount (for fixed) or percentage (for percentage type)
- `allocatedMinor`: Calculated allocation in minor units
- `spentMinor`: Amount spent from this allocation
- `remainingMinor`: Available balance
- `rollover`: Whether unused funds roll to next month

### Repository Layer

#### BudgetRepository

In-memory implementation providing:

- `create()`: Create new budget with validation
- `findByUserIdAndMonth()`: Find specific month's budget
- `findByUserId()`: Get all budgets for a user
- `update()`: Update budget with field protection
- `delete()`: Remove budget

Key validations:

- Month format (YYYY-MM)
- No future months allowed
- Non-negative income amounts
- One active budget per month per user

#### CategoryAllocationRepository

In-memory implementation providing:

- `create()`: Create allocation with duplicate prevention
- `findByBudgetId()`: Get all allocations for a budget
- `findByBudgetIdAndCategoryId()`: Find specific allocation
- `update()`: Update with automatic recalculation
- `delete()`: Remove allocation

Key validations:

- Unique allocation per category per budget
- Non-negative amounts
- Spent cannot exceed allocated
- Percentage allocations ≤ 100%

### Service Layer

#### BudgetService

Business logic orchestration:

- `createMonthlyBudget()`: Initialize new budget
- `allocateToCategory()`: Create or update category allocation
- `calculateRemainingBudget()`: Compute unallocated funds
- `closeBudget()`: Finalize budget

Key features:

- Validates budget is editable (not closed)
- Ensures category is active
- Updates budget totals automatically
- Prevents over-allocation

#### BudgetCalculator

Pure calculation utilities:

- `calculateTotalAllocated()`: Sum all allocations
- `calculateRemainingBudget()`: Income minus allocations
- `calculatePercentageAllocation()`: Convert percentage to amount
- `calculateBudgetSummary()`: Complete budget statistics
- `validateAllocationTotals()`: Check allocation constraints
- `calculateRolloverAmount()`: Compute carryover amounts
- `compareBudgets()`: Month-to-month comparison
- `projectSpending()`: Forecast month-end spending

## Usage Examples

### Creating a Monthly Budget

```typescript
const budgetService = new BudgetServiceImpl(budgetRepo, allocationRepo, categoryRepo);

// Create budget with $5,000 planned income
const budget = await budgetService.createMonthlyBudget(
  'user123',
  '2024-01',
  500000, // $5,000 in cents
);
```

### Allocating to Categories

```typescript
// Fixed allocation of $1,000 to rent
await budgetService.allocateToCategory(budget.budgetId, 'rent-category-id', {
  allocationType: 'fixed',
  allocationValue: 100000, // $1,000 in cents
  rollover: false,
});

// Percentage allocation of 20% to savings
await budgetService.allocateToCategory(budget.budgetId, 'savings-category-id', {
  allocationType: 'percentage',
  allocationValue: 20, // 20%
  rollover: true,
});
```

### Calculating Budget Summary

```typescript
const calculator = new BudgetCalculator();
const allocations = await allocationRepo.findByBudgetId(budget.budgetId);
const summary = calculator.calculateBudgetSummary(budget, allocations);

console.log({
  totalIncome: summary.totalIncomeMinor,
  allocated: summary.totalAllocatedMinor,
  remaining: summary.unallocatedMinor,
  allocationPercentage: summary.allocationPercentage,
});
```

## Business Rules

1. **Budget Constraints**
   - Only one active budget per month per user
   - Cannot create budgets for future months
   - Income amounts must be positive
   - Budget status progression: draft → active → closed

2. **Allocation Rules**
   - Total allocations cannot exceed planned income
   - Percentage allocations cannot exceed 100% combined
   - Cannot allocate to inactive categories
   - Cannot modify closed budgets

3. **Calculation Rules**
   - All monetary values stored in minor units (cents)
   - Percentage calculations rounded to nearest cent
   - Remaining = Allocated - Spent
   - Rollover only applies to underspent categories

## Testing

The feature includes comprehensive test coverage:

- **Unit Tests**: All repositories, services, and calculators
- **Edge Cases**: Boundary conditions, invalid inputs
- **Integration**: Service interactions with repositories
- **Validation**: Business rule enforcement

Run tests:

```bash
pnpm test src/features/budgets
```

## File Structure

```
src/features/budgets/
├── model/
│   ├── budget-repository.ts
│   ├── budget.test.ts
│   ├── category-allocation-repository.ts
│   └── category-allocation.test.ts
├── services/
│   ├── budget-service.ts
│   ├── budget-service.test.ts
│   ├── budget-calculator.ts
│   └── budget-calculator.test.ts
└── components/
    └── (UI components to be implemented)
```

## Dependencies

- `uuid`: For generating unique IDs
- `@/shared/repositories/in-memory-repository`: Base repository class
- `@/shared/types/common`: Domain interfaces
- `@/shared/utils/date-helpers`: Month validation utilities
- `@/features/categories`: Category management

## Future Enhancements

1. **Persistence Layer**: Replace in-memory with database storage
2. **Budget Templates**: Save and reuse allocation patterns
3. **Multi-Currency**: Support different currencies per budget
4. **Recurring Budgets**: Auto-create from templates
5. **Budget History**: Track changes over time
6. **Analytics**: Spending trends and insights
7. **UI Components**: React components for budget management
