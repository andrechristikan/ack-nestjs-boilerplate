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
