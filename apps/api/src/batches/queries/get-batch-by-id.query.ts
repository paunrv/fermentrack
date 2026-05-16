export class GetBatchByIdQuery {
  constructor(
    public readonly organizationId: string,
    public readonly batchId: string,
  ) {}
}
