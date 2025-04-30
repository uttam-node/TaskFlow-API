import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { DeleteTaskCommand } from '../delete-task.command';
import { TasksService } from '../../tasks.service';
import { TaskDeletedEvent } from '../../events/task-deleted.event';

@CommandHandler(DeleteTaskCommand)
export class DeleteTaskHandler implements ICommandHandler<DeleteTaskCommand> {
  constructor(
    private readonly tasksService: TasksService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: DeleteTaskCommand): Promise<void> {
    await this.tasksService.remove(command.id);
    this.eventBus.publish(new TaskDeletedEvent(command.id));
  }
}
