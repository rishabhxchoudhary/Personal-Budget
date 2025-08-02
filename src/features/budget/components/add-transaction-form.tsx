import React, { useState } from 'react';

export type AddTransactionFormProps = { onSubmit: (data: unknown) => void };

const todayString = (): string => new Date().toISOString().slice(0, 10);

export function AddTransactionForm({ onSubmit }: AddTransactionFormProps) {
  const [selectedType, setSelectedType] = useState<string>('');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Step 1: keep disabled; no submit while incomplete (M2 will add validation + enabling).
    // TODO: Call onSubmit when form validation is implemented
    void onSubmit;
  };

  const handleTypeChange = (value: string) => {
    setSelectedType(value);
  };

  return (
    <form data-testid="add-transaction-form" onSubmit={handleSubmit} noValidate>
      <label htmlFor="amount">Amount</label>
      <input id="amount" name="amount" type="number" inputMode="decimal" aria-required="true" />

      <label htmlFor="date">Date</label>
      <input id="date" name="date" type="date" defaultValue={todayString()} aria-required="true" />

      <label htmlFor="category">Category</label>
      <select id="category" name="category" aria-required="true">
        <option value="">Select</option>
        <option value="general">General</option>
      </select>

      <fieldset>
        <legend>Type</legend>
        <div>
          <input
            id="type-income"
            type="radio"
            name="type-income"
            value="income"
            checked={selectedType === 'income'}
            onChange={() => handleTypeChange('income')}
          />
          <label htmlFor="type-income">Income</label>
        </div>
        <div>
          <input
            id="type-expense"
            type="radio"
            name="type-expense"
            value="expense"
            checked={selectedType === 'expense'}
            onChange={() => handleTypeChange('expense')}
          />
          <label htmlFor="type-expense">Expense</label>
        </div>
      </fieldset>

      <label htmlFor="note">Note</label>
      <textarea id="note" name="note" rows={2} />

      <button
        type="submit"
        aria-disabled="true"
        style={{ opacity: 0.6, cursor: 'not-allowed' }}
        onClick={(e) => e.preventDefault()}
      >
        Add Transaction
      </button>
    </form>
  );
}
