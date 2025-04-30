import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan, In } from 'typeorm';
import { Task } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { TaskFilterDto } from './dto/task-filter.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { TaskStatus } from './enums/task-status.enum';
import { TaskPriority } from './enums/task-priority.enum';

@Injectable()
export class TasksService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Task)
    private readonly tasksRepo: Repository<Task>,
    @InjectQueue('task-processing')
    private readonly taskQueue: Queue,
  ) {}

  async create(dto: CreateTaskDto): Promise<Task> {
    return this.dataSource.transaction(async manager => {
      const task = manager.create(Task, dto);
      const saved = await manager.save(task);
      await this.taskQueue.add('task-status-update', { taskId: saved.id, status: saved.status });
      return saved;
    });
  }

  async findAll({ status, priority, page, limit }: TaskFilterDto): Promise<{
    data: Task[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const qb = this.tasksRepo.createQueryBuilder('task').leftJoinAndSelect('task.user', 'user');

    if (status) qb.andWhere('task.status = :status', { status });
    if (priority) qb.andWhere('task.priority = :priority', { priority });

    qb.skip((page - 1) * limit).take(limit);
    const [data, total] = await qb.getManyAndCount();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getStatistics() {
    const raw = await this.tasksRepo
      .createQueryBuilder('task')
      .select('COUNT(*)', 'total')
      .addSelect(`SUM(CASE WHEN task.status = :completed THEN 1 ELSE 0 END)`, 'completed')
      .addSelect(`SUM(CASE WHEN task.status = :inProgress THEN 1 ELSE 0 END)`, 'inProgress')
      .addSelect(`SUM(CASE WHEN task.status = :pending THEN 1 ELSE 0 END)`, 'pending')
      .addSelect(`SUM(CASE WHEN task.priority = :high THEN 1 ELSE 0 END)`, 'highPriority')
      .setParameters({
        completed: TaskStatus.COMPLETED,
        inProgress: TaskStatus.IN_PROGRESS,
        pending: TaskStatus.PENDING,
        high: TaskPriority.HIGH,
      })
      .getRawOne();

    return {
      total: +raw.total,
      completed: +raw.completed,
      inProgress: +raw.inProgress,
      pending: +raw.pending,
      highPriority: +raw.highPriority,
    };
  }

  async findOne(id: string): Promise<Task> {
    const task = await this.tasksRepo.findOne({ where: { id }, relations: ['user'] });
    if (!task) throw new NotFoundException(`Task with ID "${id}" not found`);
    return task;
  }

  async update(id: string, dto: UpdateTaskDto): Promise<Task> {
    return this.dataSource
      .transaction(async manager => {
        const task = await manager.findOne(Task, { where: { id }, relations: ['user'] });
        if (!task) throw new NotFoundException(`Task with ID "${id}" not found`);

        const originalStatus = task.status;
        Object.assign(task, dto);
        const updated = await manager.save(task);

        if (dto.status && dto.status !== originalStatus) {
          await this.taskQueue.add('task-status-update', {
            taskId: updated.id,
            status: updated.status,
          });
        }

        return updated;
      })
      .catch(err => {
        if (err instanceof NotFoundException) throw err;
        throw new InternalServerErrorException('Failed to update task');
      });
  }

  async remove(id: string): Promise<void> {
    const result = await this.tasksRepo.delete(id);
    if (!result.affected) throw new NotFoundException(`Task with ID "${id}" not found`);
  }

  async batchProcess(
    taskIds: string[],
    action: 'complete' | 'delete',
  ): Promise<{ taskId: string; success: boolean; error?: string }[]> {
    // 1. Find which tasks actually exist
    const found = await this.tasksRepo.find({
      where: { id: In(taskIds) },
      select: ['id'],
    });
    const existingIds = found.map(t => t.id);
    const missingIds = taskIds.filter(id => !existingIds.includes(id));

    // 2. Perform bulk update or delete in a transaction
    await this.dataSource.transaction(async manager => {
      if (action === 'complete') {
        await manager
          .createQueryBuilder()
          .update(Task)
          .set({ status: TaskStatus.COMPLETED })
          .whereInIds(existingIds)
          .execute();
      } else {
        await manager.delete(Task, existingIds);
      }
    });

    // 3. Build result per task
    const results: { taskId: string; success: boolean; error?: string }[] = [];
    existingIds.forEach(id => results.push({ taskId: id, success: true }));
    missingIds.forEach(id => results.push({ taskId: id, success: false, error: 'Task not found' }));

    return results;
  }

  async updateStatus(id: string, status: TaskStatus): Promise<Task> {
    const result = await this.tasksRepo
      .createQueryBuilder()
      .update(Task)
      .set({ status })
      .where('id = :id', { id })
      .returning('*')
      .execute();

    if (!result.affected) throw new NotFoundException(`Task with ID "${id}" not found`);
    return result.raw[0] as Task;
  }

  /**
   * Finds all overdue tasks (dueDate in the past and still pending)
   */
  async findOverdue(): Promise<Task[]> {
    const now = new Date();
    return this.tasksRepo.find({
      where: {
        dueDate: LessThan(now),
        status: TaskStatus.PENDING,
      },
    });
  }

  async notifyOverdue(taskId: string): Promise<void> {
    const task = await this.findOne(taskId);
    // TODO: Integrate with notification service (email, SMS, etc.)
    //this.logger.log(`Notification sent for overdue task ${task.id}`);
  }
}
