import { UserEntity } from 'src/user/user.schema';
import { Document } from 'mongoose';

export type IUser = UserEntity & Document;

export interface IUserSafe extends Omit<UserEntity, 'password' | '_id'> {
    readonly id: string;
}
