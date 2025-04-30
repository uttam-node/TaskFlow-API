export class TasksBatchProcessedEvent {
  constructor(
    public readonly taskIds: string[],
    public readonly action: 'complete' | 'delete',
    public readonly results: any[],
  ) {}
}
