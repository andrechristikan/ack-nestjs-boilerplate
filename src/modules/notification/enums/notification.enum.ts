export enum EnumNotificationProcess {
    outboxDispatch = 'outboxDispatch',
    outboxHandle = 'outboxHandle',
    pushLogin = 'pushLogin',
}

export enum EnumNotificationDelivery {
    email = 'email',
    push = 'push',
    silent = 'silent',
    all = 'all',
}
