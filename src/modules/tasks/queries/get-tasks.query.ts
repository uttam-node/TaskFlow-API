import { TaskPriority } from '../enums/task-priority.enum';
import { TaskStatus } from '../enums/task-status.enum';

export class GetTasksQuery {
  constructor(
    public readonly page: number,
    public readonly limit: number,
    public readonly status?: TaskStatus,
    public readonly priority?: TaskPriority,
  ) {}
}
