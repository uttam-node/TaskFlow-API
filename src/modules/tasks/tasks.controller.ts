import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { TaskFilterDto } from './dto/task-filter.dto';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateTaskCommand } from './commands/create-task.command';
import { GetTasksQuery } from './queries/get-tasks.query';
import { GetTaskStaticsQuery } from './queries/get-task-statistics.query';
import { GetTaskDetailsQuery } from './queries/get-task-details.query';
import { UpdateTaskCommand } from './commands/update-task.command';
import { DeleteTaskCommand } from './commands/delete-task.command';
import { BatchProcessTasksCommand } from './commands/batch-process-tasks.command';

@ApiTags('tasks')
@Controller('tasks')
@UseGuards(JwtAuthGuard, RateLimitGuard)
@RateLimit({ limit: 100, windowMs: 60000 })
@ApiBearerAuth()
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task (via CQRS)' })
  create(@Body() { title, userId, description, status, dueDate, priority }: CreateTaskDto) {
    return this.commandBus.execute(
      new CreateTaskCommand(title, userId, status, description, dueDate, priority),
    );
    //return this.tasksService.create(dto);
  }

  @Get()
  @RateLimit({ limit: 50, windowMs: 30_000 }) // 50 reqs per 30s
  @ApiOperation({ summary: 'Find all tasks with optional filtering (via CQRS)' })
  async findAll(@Query() { status, priority, page, limit }: TaskFilterDto) {
    return this.queryBus.execute(new GetTasksQuery(page, limit, status, priority));
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get task statistics (via CQRS)' })
  getStats() {
    return this.queryBus.execute(new GetTaskStaticsQuery());
  }

  @Get(':id')
  @RateLimit({ limit: 20, windowMs: 60_000 }) // 20 reqs per 60s
  @ApiOperation({ summary: 'Get a task by ID (via CQRS)' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.queryBus.execute(new GetTaskDetailsQuery(id));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a task (via CQRS)' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTaskDto) {
    return this.commandBus.execute(new UpdateTaskCommand(id, dto));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a task (via CQRS)' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.commandBus.execute(new DeleteTaskCommand(id));
    return { success: true };
  }

  @Post('batch')
  @ApiOperation({ summary: 'Batch process multiple tasks (via CQRS)' })
  async batchProcess(
    @Body() { tasks: taskIds, action }: { tasks: string[]; action: 'complete' | 'delete' },
  ) {
    return this.commandBus.execute(new BatchProcessTasksCommand(taskIds, action));
  }
}
