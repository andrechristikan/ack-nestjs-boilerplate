export type IUserCreate = Omit<IUser, '_id'>;

export type IUserUpdate = Pick<IUser, 'firstName' | 'lastName'>;

export interface IUserSafe extends Omit<IUser, 'password' | '_id'> {
    readonly id: string;
}

export interface IUser {
    readonly _id: string;
    readonly email: string;
    readonly mobileNumber: string;
    firstName: string;
    lastName: string;
    readonly password: string;
}

export interface IUserFind {
    readonly limit: number;
    readonly page: number;
}
