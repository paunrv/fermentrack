import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { GetBatchByIdQuery } from './get-batch-by-id.query';

@QueryHandler(GetBatchByIdQuery)
@Injectable()
export class GetBatchByIdHandler implements IQueryHandler<GetBatchByIdQuery> {
  constructor(private readonly db: DatabaseService) {}

  async execute(query: GetBatchByIdQuery) {
    const { organizationId, batchId } = query;

    const batch = await this.db.batch.findFirst({
      where: { id: batchId, organizationId },
      include: {
        recipe: true,
        losses: { orderBy: { recordedAt: 'desc' } },
        finishedGoods: { include: { sku: true } },
        domainEvents: { orderBy: { sequence: 'asc' } },
      },
    });

    if (!batch) throw new NotFoundException(`Batch ${batchId} not found`);

    return batch;
  }
}
