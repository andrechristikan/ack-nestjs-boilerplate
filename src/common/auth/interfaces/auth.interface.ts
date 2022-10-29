// Auth
export interface IAuthPassword {
    salt: string;
    passwordHash: string;
    passwordExpired: Date;
}

export interface IAuthPayloadOptions {
    loginDate: Date;
}

export interface IAuthPermission {
    code: string;
    name: string;
    description?: string;
    isActive?: boolean;
}

export interface IAuthRefreshTokenOptions {
    // in milis
    notBeforeExpirationTime?: number | string;
    rememberMe?: boolean;
}
