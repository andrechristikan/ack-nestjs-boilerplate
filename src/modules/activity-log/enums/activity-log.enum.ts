/**
 * Job names on the activity-log queue.
 * @public
 */
export enum EnumActivityLogProcess {
    createMany = 'createMany',
}

/**
 * Where an activity-log contract resolves the logged user from.
 * @public
 */
export enum EnumActivityLogUser {
    payload = 'payload',
    target = 'target',
}

/**
 * Where an activity-log contract resolves the workspace from, if any.
 * @public
 */
export enum EnumActivityLogWorkspace {
    none = 'none',
    payload = 'payload',
    target = 'target',
}
