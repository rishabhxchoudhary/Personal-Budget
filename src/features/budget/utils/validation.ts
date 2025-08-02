import { z } from 'zod';

export const transactionFormSchema = z.object({
  amount: z
    .string()
    .min(1, 'Amount is required')
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    }, 'Amount must be a positive number'),
  date: z
    .string()
    .min(1, 'Date is required')
    .refine((val) => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    }, 'Please enter a valid date'),
  category: z.string().min(1, 'Please select a category'),
  type: z.string().refine((val) => val === 'income' || val === 'expense', {
    message: 'Please select a transaction type',
  }),
  note: z.string().optional(),
});

export type TransactionFormData = z.infer<typeof transactionFormSchema>;

export const validateTransactionForm = (data: unknown) => {
  return transactionFormSchema.safeParse(data);
};
