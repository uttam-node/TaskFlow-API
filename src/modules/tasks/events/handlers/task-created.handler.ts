import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { TaskCreatedEvent } from '../task-created.event';

@EventsHandler(TaskCreatedEvent)
export class TaskCreatedHandler implements IEventHandler<TaskCreatedEvent> {
  handle(event: TaskCreatedEvent) {
    // e.g. send email / push notification
    console.log(`Task ${event.taskId} was created`);
  }
}
