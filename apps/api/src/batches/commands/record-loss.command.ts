export class RecordLossCommand {
  constructor(
    public readonly organizationId: string,
    public readonly actorId: string,
    public readonly batchId: string,
    public readonly lossType: 'EVAPORATION' | 'SAMPLING' | 'CONTAMINATION' | 'TRANSFER' | 'WASTE' | 'UNACCOUNTED',
    public readonly litersLost: number,
    public readonly reason?: string,
  ) {}
}
