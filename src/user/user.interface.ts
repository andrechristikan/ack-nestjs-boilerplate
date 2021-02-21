import { UserEntity } from 'src/user/user.schema';

export type IUserCreate = Omit<UserEntity, '_id'>;

export type IUserUpdate = Pick<UserEntity, 'firstName' | 'lastName'>;

export interface IUserSafe extends Omit<UserEntity, 'password' | '_id'> {
    readonly id: string;
}
export interface IUserFind {
    readonly limit: number;
    readonly page: number;
}
