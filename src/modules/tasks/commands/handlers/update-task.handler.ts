import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { UpdateTaskCommand } from '../update-task.command';
import { TasksService } from '../../tasks.service';
import { TaskUpdatedEvent } from '../../events/task-updated.event';

@CommandHandler(UpdateTaskCommand)
export class UpdateTaskHandler implements ICommandHandler<UpdateTaskCommand> {
  constructor(
    private readonly tasksService: TasksService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: UpdateTaskCommand) {
    const updated = await this.tasksService.update(command.id, command.dto);
    this.eventBus.publish(new TaskUpdatedEvent(updated.id));
    return updated;
  }
}
