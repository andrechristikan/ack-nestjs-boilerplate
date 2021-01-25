export interface IUserCreate {
    readonly email: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly mobileNumber: string;
    readonly password: string;
}

export interface IUserUpdate {
    readonly firstName: string;
    readonly lastName: string;
}

export interface IUserFind {
    readonly limit: number;
    readonly page: number;
}

export interface IUser {
    readonly email: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly mobileNumber: string;
    readonly password: string;
    readonly salt: string;
}
