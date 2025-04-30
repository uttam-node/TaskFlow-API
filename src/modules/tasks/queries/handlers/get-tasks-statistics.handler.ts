import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { TasksService } from '../../tasks.service';
import { GetTaskStaticsQuery } from '../get-task-statistics.query';

@QueryHandler(GetTaskStaticsQuery)
export class GetTaskStatisticsHandler implements IQueryHandler<GetTaskStaticsQuery> {
  constructor(private readonly tasksService: TasksService) {}

  async execute() {
    return this.tasksService.getStatistics();
  }
}
