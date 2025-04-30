import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { TasksService } from '../../modules/tasks/tasks.service';
import { TaskStatus } from '../../modules/tasks/enums/task-status.enum';

/**
 * Processes jobs from the "task-processing" queue.
 */
@Processor('task-processing')
@Injectable()
export class TaskProcessorService extends WorkerHost {
  private readonly logger = new Logger(TaskProcessorService.name);

  constructor(private readonly tasksService: TasksService) {
    super();
  }

  /**
   * Called for every job in the queue.
   * Routes to appropriate handlers based on job.name.
   */
  async process(job: Job): Promise<void> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);

    try {
      switch (job.name) {
        case 'task-status-update':
          await this.handleStatusUpdate(job);
          break;
        case 'overdue-tasks-notification':
          await this.handleOverdueNotification(job);
          break;
        default:
          this.logger.warn(`Unknown job type: ${job.name}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : JSON.stringify(err);
      this.logger.error(`Error processing job ${job.id}: ${message}`);
      // rethrow so BullMQ can handle retries if configured
      throw err;
    }
  }

  private async handleStatusUpdate(job: Job<{ taskId: string; status: string }>) {
    const { taskId, status } = job.data;

    if (!taskId || !status) {
      this.logger.error('Missing taskId or status in job data');
      return;
    }
    if (!Object.values(TaskStatus).includes(status as TaskStatus)) {
      this.logger.error(`Invalid status: ${status}`);
      return;
    }

    const updated = await this.tasksService.updateStatus(taskId, status as TaskStatus);
    this.logger.log(`Updated task ${updated.id} to status ${updated.status}`);
  }

  private async handleOverdueNotification(job: Job) {
    this.logger.log('Processing overdue-tasks-notification');

    // Fetch overdue tasks via service (assumes service method exists)
    const overdue = await this.tasksService.findOverdue();
    this.logger.log(`Found ${overdue.length} overdue tasks`);

    // Example: send notification for each overdue task, batching as needed
    const batchSize = 20;
    for (let i = 0; i < overdue.length; i += batchSize) {
      const batch = overdue.slice(i, i + batchSize);
      await Promise.all(
        batch.map(task =>
          this.tasksService.notifyOverdue(task.id).catch(err => {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(`Notify failed for task ${task.id}: ${msg}`);
          }),
        ),
      );
      this.logger.log(`Processed overdue notification batch ${i / batchSize + 1}`);
    }
  }
}
