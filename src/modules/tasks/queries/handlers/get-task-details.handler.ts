import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { TasksService } from '../../tasks.service';
import { GetTaskDetailsQuery } from '../get-task-details.query';

@QueryHandler(GetTaskDetailsQuery)
export class GetTaskDetailsHandler implements IQueryHandler<GetTaskDetailsQuery> {
  constructor(private readonly tasksService: TasksService) {}

  async execute(params: GetTaskDetailsQuery) {
    return this.tasksService.findOne(params.id);
  }
}
