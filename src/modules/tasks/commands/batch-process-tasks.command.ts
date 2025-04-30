export class BatchProcessTasksCommand {
  constructor(
    public readonly taskIds: string[],
    public readonly action: 'complete' | 'delete',
  ) {}
}
