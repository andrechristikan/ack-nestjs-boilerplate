export enum EnumNotificationProcess {
    outboxDispatch = 'outboxDispatch',
    outboxHandle = 'outboxHandle',
    pushLogin = 'pushLogin',
    cleanupInvalidTokens = 'cleanupInvalidTokens',
}

export enum EnumNotificationDelivery {
    email = 'email',
    push = 'push',
    silent = 'silent',
    all = 'all',
}
