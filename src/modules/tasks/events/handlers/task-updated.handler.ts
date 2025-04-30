import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { TaskUpdatedEvent } from '../task-updated.event';

@EventsHandler(TaskUpdatedEvent)
export class TaskUpdatedHandler implements IEventHandler<TaskUpdatedEvent> {
  handle(event: TaskUpdatedEvent) {
    // e.g. send notification, update search index, etc.
    console.log(`Task ${event.id} has been updated.`);
  }
}
