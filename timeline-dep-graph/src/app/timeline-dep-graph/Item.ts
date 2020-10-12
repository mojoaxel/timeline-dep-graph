import { Status } from './Status';
import { Task } from './Task';

// ItemData represents the vis-item data.
export interface ItemData {
  readonly 'id': string;
  name: string;
  status: Status;
  content: string;
  start?: Date;
  end?: Date;
  className: string;
  expandable: boolean;
}

/**
 * @param task The task to be mapped into a vis-item
 * @return The vis-item's data corresponding to the task fields.
 */
export function maptoItem(task: Task): ItemData {
  let className = 'transeparent';
  if (task.subTasks.length > 0) {
    className += ' tdg-pointer';
  }
  return {
    'id': task.id,
    name: task.name,
    status: task.status,
    start: task.startTime,
    end: task.finishTime,
    content: task.name,
    className,
    expandable: task.subTasks.length > 0,
  };
}
