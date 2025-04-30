import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { Task } from './entities/task.entity';
import { CqrsModule } from '@nestjs/cqrs';
import { CreateTaskHandler } from './commands/handlers/create-task.handler';
import { GetTasksHandler } from './queries/handlers/get-tasks.handler';
import { UpdateTaskHandler } from './commands/handlers/update-task.handler';
import { DeleteTaskHandler } from './commands/handlers/delete-task.handler';
import { BatchProcessTasksHandler } from './commands/handlers/batch-process-tasks.handler';
import { TaskUpdatedHandler } from './events/handlers/task-updated.handler';
import { GetTaskStatisticsHandler } from './queries/handlers/get-tasks-statistics.handler';
import { TaskCreatedHandler } from './events/handlers/task-created.handler';
import { GetTaskDetailsHandler } from './queries/handlers/get-task-details.handler';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task]),
    BullModule.registerQueue({
      name: 'task-processing',
    }),
    CqrsModule,
  ],
  controllers: [TasksController],
  providers: [
    TasksService,
    // Command Handlers
    CreateTaskHandler,
    UpdateTaskHandler,
    DeleteTaskHandler,
    BatchProcessTasksHandler,
    GetTasksHandler,
    GetTaskDetailsHandler,
    GetTaskStatisticsHandler,
    // Event Handlers
    TaskCreatedHandler,
    TaskUpdatedHandler,
  ],
  exports: [TasksService, TypeOrmModule], //Exported TypeOrmModule too
})
export class TasksModule {}
