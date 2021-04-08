import { UserEntity } from 'src/user/user.schema';
import { Document } from 'mongoose';
import { RoleEntity } from 'src/role/role.schema';
import { RoleSafe } from 'src/role/role.interface';

export type UserDocument = UserEntity & Document;

export interface UserDocumentFull extends Omit<UserDocument, 'role'> {
    role: RoleEntity;
}

export interface UserSafe
    extends Omit<UserEntity, 'password' | '__v' | 'role'> {
    _id: string;
    role: RoleSafe;
}
