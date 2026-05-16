export class GetBatchesQuery {
  constructor(
    public readonly organizationId: string,
    public readonly state?: string,
    public readonly limit?: number,
    public readonly offset?: number,
  ) {}
}
