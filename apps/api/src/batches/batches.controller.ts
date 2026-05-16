import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateBatchCommand } from './commands/create-batch.command';
import { RecordLossCommand } from './commands/record-loss.command';
import { GetBatchesQuery } from './queries/get-batches.query';
import { GetBatchByIdQuery } from './queries/get-batch-by-id.query';

@Controller()
export class BatchesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post('commands/batches')
  @HttpCode(HttpStatus.CREATED)
  async createBatch(@Body() body: {
    organizationId: string;
    actorId: string;
    batchCode: string;
    initialLiters: number;
    recipeId?: string;
    notes?: string;
  }) {
    return this.commandBus.execute(
      new CreateBatchCommand(
        body.organizationId,
        body.actorId,
        body.batchCode,
        body.initialLiters,
        body.recipeId,
        body.notes,
      ),
    );
  }

  @Post('commands/batches/:id/record-loss')
  @HttpCode(HttpStatus.OK)
  async recordLoss(
    @Param('id') batchId: string,
    @Body() body: {
      organizationId: string;
      actorId: string;
      lossType: 'EVAPORATION' | 'SAMPLING' | 'CONTAMINATION' | 'TRANSFER' | 'WASTE' | 'UNACCOUNTED';
      litersLost: number;
      reason?: string;
    },
  ) {
    return this.commandBus.execute(
      new RecordLossCommand(
        body.organizationId,
        body.actorId,
        batchId,
        body.lossType,
        body.litersLost,
        body.reason,
      ),
    );
  }

  @Get('query/batches')
  async getBatches(
    @Query('organizationId') organizationId: string,
    @Query('state') state?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.queryBus.execute(
      new GetBatchesQuery(
        organizationId,
        state,
        limit ? parseInt(limit) : undefined,
        offset ? parseInt(offset) : undefined,
      ),
    );
  }

  @Get('query/batches/:id')
  async getBatchById(
    @Param('id') batchId: string,
    @Query('organizationId') organizationId: string,
  ) {
    return this.queryBus.execute(
      new GetBatchByIdQuery(organizationId, batchId),
    );
  }
}
