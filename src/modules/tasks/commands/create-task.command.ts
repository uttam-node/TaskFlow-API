import { TaskPriority } from '../enums/task-priority.enum';
import { TaskStatus } from '../enums/task-status.enum';

export class CreateTaskCommand {
  constructor(
    public readonly title: string,
    public readonly userId: string,
    public readonly status?: TaskStatus,
    public readonly description?: string,
    public readonly dueDate?: string,
    public readonly priority?: TaskPriority,
  ) {}
}
