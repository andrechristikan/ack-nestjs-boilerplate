export interface IAuthPassword {
    salt: string;
    passwordHash: string;
    passwordExpired: Date;
    passwordCreated: Date;
}

export interface IAuthPasswordOptions {
    temporary: boolean;
}
