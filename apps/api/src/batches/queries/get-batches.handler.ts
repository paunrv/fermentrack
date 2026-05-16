import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { GetBatchesQuery } from './get-batches.query';

@QueryHandler(GetBatchesQuery)
@Injectable()
export class GetBatchesHandler implements IQueryHandler<GetBatchesQuery> {
  constructor(private readonly db: DatabaseService) {}

  async execute(query: GetBatchesQuery) {
    const { organizationId, state, limit = 20, offset = 0 } = query;

    const [batches, total] = await Promise.all([
      this.db.batch.findMany({
        where: {
          organizationId,
          ...(state ? { state: state as any } : {}),
        },
        include: {
          recipe: { select: { id: true, name: true, productType: true } },
          _count: { select: { losses: true, finishedGoods: true } },
        },
        orderBy: { startedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.db.batch.count({
        where: {
          organizationId,
          ...(state ? { state: state as any } : {}),
        },
      }),
    ]);

    return { batches, total, limit, offset };
  }
}
