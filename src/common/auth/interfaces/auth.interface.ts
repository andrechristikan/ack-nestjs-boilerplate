import { PermissionEntity } from 'src/modules/permission/repository/entities/permission.entity';

// Auth
export interface IAuthPassword {
    salt: string;
    passwordHash: string;
    passwordExpired: Date;
}

export interface IAuthPayloadOptions {
    loginDate: Date;
}

export interface IAuthRefreshTokenOptions {
    // in milis
    notBeforeExpirationTime?: number | string;
    rememberMe?: boolean;
}

// permission
export interface IAuthGrantPermission {
    _id: string;
    permissions: PermissionEntity[];
}
