/**
 * Job names on the workspace queue.
 * @public
 */
export enum EnumWorkspaceProcess {
    expireStaleInvites = 'expireStaleInvites',
}

/**
 * Workspace invite lifetimes, valued in days.
 * @public
 */
export enum EnumWorkspaceInviteExpiry {
    threeDays = 3,
    sevenDays = 7,
    twoWeeks = 14,
    oneMonth = 30,
}
