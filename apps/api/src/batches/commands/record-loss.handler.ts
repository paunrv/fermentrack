import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { RecordLossCommand } from './record-loss.command';
import Decimal from 'decimal.js';

@CommandHandler(RecordLossCommand)
@Injectable()
export class RecordLossHandler implements ICommandHandler<RecordLossCommand> {
  constructor(private readonly db: DatabaseService) {}

  async execute(command: RecordLossCommand) {
    const { organizationId, actorId, batchId, lossType, litersLost, reason } = command;

    const result = await this.db.$transaction(async (tx) => {
      // 1. Fetch current batch
      const batch = await tx.batch.findFirst({
        where: { id: batchId, organizationId },
      });

      if (!batch) throw new NotFoundException(`Batch ${batchId} not found`);

      const loss = new Decimal(litersLost);
      const current = new Decimal(batch.currentLiters.toString());

      // 2. Guard: cannot lose more than available
      if (loss.greaterThan(current)) {
        throw new BadRequestException(
          `Cannot record ${litersLost}L loss — only ${current}L available`,
        );
      }

      // 3. Update lossBreakdown
      const breakdown = batch.lossBreakdown as Record<string, number>;
      const key = lossType.toLowerCase();
      breakdown[key] = new Decimal(breakdown[key] ?? 0).plus(loss).toNumber();

      // 4. Update batch
      const updatedBatch = await tx.batch.update({
        where: { id: batchId },
        data: {
          currentLiters: current.minus(loss),
          totalLossLiters: new Decimal(batch.totalLossLiters.toString()).plus(loss),
          lossBreakdown: breakdown,
          eventSequence: { increment: 1 },
        },
      });

      // 5. Record batch loss
      const batchLoss = await tx.batchLoss.create({
        data: {
          batchId,
          lossType,
          litersLost: loss,
          reason: reason ?? null,
          recordedBy: actorId,
        },
      });

      // 6. Record domain event
      await tx.domainEvent.create({
        data: {
          organizationId,
          aggregateType: 'batch',
          aggregateId: batchId,
          eventType: `${key}_loss_recorded`,
          sequence: updatedBatch.eventSequence,
          actorId,
          payload: {
            lossType,
            litersLost,
            reason: reason ?? null,
            currentLitersAfter: updatedBatch.currentLiters.toString(),
          },
        },
      });

      return { batch: updatedBatch, loss: batchLoss };
    });

    return result;
  }
}
