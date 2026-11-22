/** @public */
export enum EnumWorkspaceQueue {
    workspace = 'workspace',
}

/** @public */
export enum EnumWorkspaceProcess {
    expireStaleInvites = 'expireStaleInvites',
    expireStaleJoinRequests = 'expireStaleJoinRequests',
    softDelete = 'softDelete',
}

/** @public */
export enum EnumWorkspaceInviteExpiry {
    threeDays = 3,
    sevenDays = 7,
    twoWeeks = 14,
    oneMonth = 30,
}

/** @public */
export enum EnumWorkspaceOrderBy {
    latest = 'latest',
    name = 'name',
}

/** @public */
export enum EnumWorkspaceCursorOrderBy {
    latest = 'latest',
}

/** @public */
export enum EnumWorkspaceMemberOrderBy {
    latest = 'latest',
    recentlyJoined = 'recentlyJoined',
}

/** @public */
export enum EnumWorkspaceInviteOrderBy {
    latest = 'latest',
}

/** @public */
export enum EnumWorkspaceJoinRequestOrderBy {
    latest = 'latest',
}
