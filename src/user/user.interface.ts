import { UserEntity } from 'src/user/user.schema';
import { Document } from 'mongoose';
import { IRoleDocument } from 'src/role/role.interface';

export type UserDocument = UserEntity & Document;

export interface IUserDocument extends Omit<UserDocument, 'role'> {
    role: IRoleDocument;
}
