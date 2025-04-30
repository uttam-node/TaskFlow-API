import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { TasksService } from '../../tasks.service';
import { GetTasksQuery } from '../get-tasks.query';

@QueryHandler(GetTasksQuery)
export class GetTasksHandler implements IQueryHandler<GetTasksQuery> {
  constructor(private readonly tasksService: TasksService) {}

  async execute(query: GetTasksQuery) {
    return this.tasksService.findAll({
      status: query.status,
      priority: query.priority,
      page: query.page,
      limit: query.limit,
    });
  }
}
