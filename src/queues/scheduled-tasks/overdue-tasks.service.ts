import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { Task } from '../../modules/tasks/entities/task.entity';
import { TaskStatus } from '../../modules/tasks/enums/task-status.enum';

@Injectable()
export class OverdueTasksService {
  private readonly logger = new Logger(OverdueTasksService.name);

  constructor(
    @InjectQueue('task-processing') private readonly taskQueue: Queue,
    @InjectRepository(Task) private readonly tasksRepository: Repository<Task>,
  ) {}

  /**
   * Runs every hour to detect overdue tasks and enqueue them for processing.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkOverdueTasks(): Promise<void> {
    this.logger.debug('Starting overdue tasks check...');

    const now = new Date();
    // 1. Fetch tasks whose dueDate has passed and are still pending
    const overdueTasks = await this.tasksRepository.find({
      where: {
        dueDate: LessThan(now),
        status: TaskStatus.PENDING,
      },
      select: ['id'], // only load ID for efficiency
    });

    const total = overdueTasks.length;
    this.logger.log(`Found ${total} overdue tasks`);

    if (total > 0) {
      // 2. Enqueue all overdue tasks in bulk
      const jobs = overdueTasks.map(task => ({
        name: 'process-overdue-task',
        data: { taskId: task.id },
      }));

      await this.taskQueue.addBulk(jobs);
      this.logger.log(`Enqueued ${jobs.length} overdue tasks for processing`);
    }

    this.logger.debug('Overdue tasks check completed');
  }
}
