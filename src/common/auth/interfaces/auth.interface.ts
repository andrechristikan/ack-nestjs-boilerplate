// Auth
export interface IAuthPassword {
    salt: string;
    passwordHash: string;
    passwordExpired: Date;
    passwordCreated: Date;
}

export interface IAuthPayloadOptions {
    loginDate: Date;
}

export interface IAuthRefreshTokenOptions {
    // in milis
    notBeforeExpirationTime?: number | string;
}

export interface IAuthGooglePayload {
    email: string;
    firstName: string;
    lastName: string;
    accessToken: string;
    refreshToken: string;
}
