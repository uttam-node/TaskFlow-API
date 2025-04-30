import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { TasksService } from '../../tasks.service';
import { CreateTaskCommand } from '../../commands/create-task.command';
import { TaskCreatedEvent } from '../../events/task-created.event';

@CommandHandler(CreateTaskCommand)
export class CreateTaskHandler implements ICommandHandler<CreateTaskCommand> {
  constructor(
    private readonly tasksService: TasksService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CreateTaskCommand) {
    const task = await this.tasksService.create({
      title: command.title,
      description: command.description,
      status: command.status,
      dueDate: command.dueDate,
      priority: command.priority,
      userId: command.userId,
    });

    // 2) publish an event for other parts of the system
    this.eventBus.publish(new TaskCreatedEvent(task.id));

    return task;
  }
}
