export class CreateBatchCommand {
  constructor(
    public readonly organizationId: string,
    public readonly actorId: string,
    public readonly batchCode: string,
    public readonly initialLiters: number,
    public readonly recipeId?: string,
    public readonly notes?: string,
  ) {}
}
