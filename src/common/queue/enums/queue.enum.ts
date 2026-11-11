/** @public */
export enum EnumQueuePriority {
    high = 1,
    medium = 5,
    low = 10,
}

/** @public */
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
