import { UserEntity } from 'src/user/user.schema';
import { Document } from 'mongoose';
import { IRole } from 'src/role/role.interface';

export type IUserDocument = UserEntity & Document;

export interface IUserSafe extends Omit<UserEntity, 'password'> {
    readonly id: string;
}

export interface IUser extends Omit<IUserDocument, 'roleId'> {
    roleId: IRole;
}
