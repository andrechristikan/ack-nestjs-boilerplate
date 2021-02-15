export type IUserCreate = Omit<IUser, 'salt' | '_id'>;

export type IUserUpdate = Pick<IUser, 'firstName' | 'lastName'>;

export interface IUserSafe extends Omit<IUser, 'password' | 'salt' | '_id'> {
    readonly id: string;
}

export interface IUser {
    readonly _id: string;
    readonly email: string;
    readonly mobileNumber: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly password: string;
    readonly salt: string;
}

export interface IUserFind {
    readonly limit: number;
    readonly page: number;
}
