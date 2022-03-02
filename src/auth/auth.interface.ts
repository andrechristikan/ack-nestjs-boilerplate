export interface IAuthPassword {
    salt: string;
    passwordHash: string;
    passwordExpiredDate: Date;
}

export interface IAuthPayloadOptions {
    loginDate: Date;
    loginExpiredDate: Date;
}
