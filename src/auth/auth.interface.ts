export interface IAuthPassword {
    salt: string;
    passwordHash: string;
    passwordExpired: Date;
}
