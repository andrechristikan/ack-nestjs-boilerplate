/** @public */
export enum EnumUserQueue {
    user = 'user',
    userAuth = 'userAuth',
}

/** @public */
export enum EnumUserCreateWorkspaceContextType {
    personal = 'personal',
    invite = 'invite',
}

/** @public */
export enum EnumUserProcess {
    deletePhoto = 'deletePhoto',
    importByAdmin = 'importByAdmin',
    exportByAdmin = 'exportByAdmin',
    deleteSelf = 'deleteSelf',
}

/** @public */
export enum EnumUserAuthProcess {
    purgeExpired = 'purgeExpired',
}

/** @public */
export enum EnumUserOrderBy {
    latest = 'latest',
    name = 'name',
}
