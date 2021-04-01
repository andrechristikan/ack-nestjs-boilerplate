import { UserEntity } from 'src/user/user.schema';
import { Document } from 'mongoose';
import { IRole } from 'src/role/role.interface';

export type IUser = UserEntity & Document;

export interface IUserSafe extends Omit<UserEntity, 'password' | '_id'> {
    readonly id: string;
}

export interface IUserWithRole extends Omit<IUser, 'roleId'> {
    roleId: IRole;
}
