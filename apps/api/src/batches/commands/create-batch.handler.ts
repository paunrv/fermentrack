import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateBatchCommand } from './create-batch.command';
import Decimal from 'decimal.js';

@CommandHandler(CreateBatchCommand)
@Injectable()
export class CreateBatchHandler implements ICommandHandler<CreateBatchCommand> {
  constructor(private readonly db: DatabaseService) {}

  async execute(command: CreateBatchCommand) {
    const {
      organizationId,
      actorId,
      batchCode,
      initialLiters,
      recipeId,
      notes,
    } = command;

    const batch = await this.db.$transaction(async (tx) => {
      // 1. Create the batch
      const newBatch = await tx.batch.create({
        data: {
          organizationId,
          batchCode,
          initialLiters: new Decimal(initialLiters),
          currentLiters: new Decimal(initialLiters),
          recipeId: recipeId ?? null,
          notes: notes ?? null,
          createdBy: actorId,
          state: 'CREATED',
        },
      });

      // 2. Record domain event
      await tx.domainEvent.create({
        data: {
          organizationId,
          aggregateType: 'batch',
          aggregateId: newBatch.id,
          eventType: 'batch_created',
          sequence: 1,
          actorId,
          payload: {
            batchCode,
            initialLiters,
            recipeId: recipeId ?? null,
          },
        },
      });

      // 3. Return batch AFTER sequence update
      return tx.batch.update({
        where: { id: newBatch.id },
        data: { eventSequence: 1 },
      });
    });

    return batch;
  }
}
