import { UserEntity } from 'src/user/user.schema';
import { Document } from 'mongoose';
import { RoleEntity } from 'src/role/role.schema';

export type UserDocument = UserEntity & Document;

export interface UserDocumentFull extends Omit<UserDocument, 'role'> {
    role: RoleEntity;
}

export interface UserSafe
    extends Omit<UserDocument, 'password' | '__v' | '_id'> {
    id: string;
}
