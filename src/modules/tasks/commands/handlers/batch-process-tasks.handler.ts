import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { BatchProcessTasksCommand } from '../batch-process-tasks.command';
import { TasksService } from '../../tasks.service';
import { TasksBatchProcessedEvent } from '../../events/tasks-batch-processed.event';

@CommandHandler(BatchProcessTasksCommand)
export class BatchProcessTasksHandler implements ICommandHandler<BatchProcessTasksCommand> {
  constructor(
    private readonly tasksService: TasksService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: BatchProcessTasksCommand): Promise<any[]> {
    const results = await this.tasksService.batchProcess(command.taskIds, command.action);
    this.eventBus.publish(new TasksBatchProcessedEvent(command.taskIds, command.action, results));
    return results;
  }
}
