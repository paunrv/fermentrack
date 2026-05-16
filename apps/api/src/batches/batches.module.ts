import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { BatchesController } from './batches.controller';
import { CreateBatchHandler } from './commands/create-batch.handler';
import { RecordLossHandler } from './commands/record-loss.handler';
import { GetBatchesHandler } from './queries/get-batches.handler';
import { GetBatchByIdHandler } from './queries/get-batch-by-id.handler';

export const CommandHandlers = [CreateBatchHandler, RecordLossHandler];
export const QueryHandlers = [GetBatchesHandler, GetBatchByIdHandler];

@Module({
  imports: [CqrsModule],
  controllers: [BatchesController],
  providers: [...CommandHandlers, ...QueryHandlers],
})
export class BatchesModule {}
