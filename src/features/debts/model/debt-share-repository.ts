import { DebtShare, DebtShareRepository, DebtStatus } from '@/shared/types/common';
import { InMemoryRepository } from '@/shared/repositories/in-memory-repository';
import {
  validateDebtShare,
  createDebtShareId,
  validateAmountMinor,
  validateDebtStatus,
  canTransitionStatus,
} from './debt-share';

export class DebtShareRepositoryImpl
  extends InMemoryRepository<
    DebtShare,
    Omit<DebtShare, 'createdAt' | 'updatedAt' | 'debtShareId' | 'status'> & {
      debtShareId?: string;
      status?: DebtStatus;
    }
  >
  implements DebtShareRepository
{
  protected getEntityId(entity: DebtShare): string {
    return entity.debtShareId;
  }

  async create(
    item: Omit<DebtShare, 'createdAt' | 'updatedAt' | 'debtShareId' | 'status'> & {
      debtShareId?: string;
      status?: DebtStatus;
    },
  ): Promise<DebtShare> {
    validateDebtShare(item);

    const debtShareId = item.debtShareId || createDebtShareId();
    const normalizedItem = {
      ...item,
      debtShareId,
      status: item.status || 'pending',
    };

    // Validate status if provided
    if (item.status && !validateDebtStatus(item.status)) {
      throw new Error(`Invalid status: ${item.status}`);
    }

    return super.create(normalizedItem);
  }

  async findByCreditorId(creditorId: string): Promise<DebtShare[]> {
    const all = await this.findAll();
    return all.filter((share) => share.creditorId === creditorId);
  }

  async findByDebtorId(debtorId: string): Promise<DebtShare[]> {
    const all = await this.findAll();
    return all.filter((share) => share.debtorId === debtorId);
  }

  async findByTransactionId(transactionId: string): Promise<DebtShare[]> {
    const all = await this.findAll();
    return all.filter((share) => share.transactionId === transactionId);
  }

  async findByStatus(status: DebtStatus): Promise<DebtShare[]> {
    if (!validateDebtStatus(status)) {
      throw new Error(`Invalid status: ${status}`);
    }

    const all = await this.findAll();
    return all.filter((share) => share.status === status);
  }

  async update(id: string, updates: Partial<DebtShare>): Promise<DebtShare> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Entity with id ${id} not found`);
    }

    // Prevent changing immutable fields
    /* eslint-disable @typescript-eslint/no-unused-vars */
    const {
      debtShareId: _debtShareId,
      creditorId: _creditorId,
      debtorId: _debtorId,
      transactionId: _transactionId,
      ...allowedUpdates
    } = updates;
    /* eslint-enable @typescript-eslint/no-unused-vars */

    // Validate amount if being updated
    if (allowedUpdates.amountMinor !== undefined) {
      validateAmountMinor(allowedUpdates.amountMinor);
    }

    // Validate status transition if being updated
    if (allowedUpdates.status) {
      if (!validateDebtStatus(allowedUpdates.status)) {
        throw new Error(`Invalid status: ${allowedUpdates.status}`);
      }

      if (!canTransitionStatus(existing.status, allowedUpdates.status)) {
        throw new Error(`Cannot transition from ${existing.status} to ${allowedUpdates.status}`);
      }
    }

    return super.update(id, allowedUpdates);
  }

  async updateStatus(debtShareId: string, newStatus: DebtStatus): Promise<DebtShare> {
    return this.update(debtShareId, { status: newStatus });
  }

  async getTotalByTransaction(transactionId: string): Promise<number> {
    const shares = await this.findByTransactionId(transactionId);
    return shares.reduce((total, share) => total + share.amountMinor, 0);
  }

  async findUnpaidByCreditorId(creditorId: string): Promise<DebtShare[]> {
    const creditorDebts = await this.findByCreditorId(creditorId);
    return creditorDebts.filter(
      (share) => share.status === 'pending' || share.status === 'partial',
    );
  }

  async findUnpaidByDebtorId(debtorId: string): Promise<DebtShare[]> {
    const debtorDebts = await this.findByDebtorId(debtorId);
    return debtorDebts.filter((share) => share.status === 'pending' || share.status === 'partial');
  }

  async delete(id: string): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Entity with id ${id} not found`);
    }

    // Prevent deletion of paid debts
    if (existing.status === 'paid') {
      throw new Error('Cannot delete paid debt shares');
    }

    return super.delete(id);
  }
}
