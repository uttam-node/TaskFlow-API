import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { TaskStatus } from '../enums/task-status.enum';
import { TaskPriority } from '../enums/task-priority.enum';

/**
 * DTO for filtering and paginating tasks
 */
export class TaskFilterDto {
  @ApiPropertyOptional({
    enum: TaskStatus,
    description: 'Filter tasks by status',
  })
  @IsOptional()
  @IsEnum(TaskStatus, {
    message: `status must be one of the following values: ${Object.values(TaskStatus).join(', ')}`,
  })
  status?: TaskStatus;

  @ApiPropertyOptional({
    enum: TaskPriority,
    description: 'Filter tasks by priority',
  })
  @IsOptional()
  @IsEnum(TaskPriority, {
    message: `priority must be one of the following values: ${Object.values(TaskPriority).join(', ')}`,
  })
  priority?: TaskPriority;

  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    type: Number,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    type: Number,
    minimum: 1,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number = 10;
}
