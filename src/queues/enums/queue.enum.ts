/**
 * Names of the registered BullMQ queues.
 * @public
 */
export enum EnumQueue {
    notification = 'notification',
    notificationEmail = 'notificationEmail',
    notificationPush = 'notificationPush',
    workspace = 'workspace',
}

/**
 * BullMQ job priorities; a lower value runs first.
 * @public
 */
export enum EnumQueuePriority {
    high = 1,
    medium = 5,
    low = 10,
}

/**
 * BullMQ job states as `Job.getState()` reports them; the values equal BullMQ's own strings.
 * @public
 */
export enum EnumQueueJobState {
    completed = 'completed',
    failed = 'failed',
    active = 'active',
    delayed = 'delayed',
    prioritized = 'prioritized',
    waiting = 'waiting',
    waitingChildren = 'waiting-children',
    unknown = 'unknown',
}
