import { UserEntity } from 'src/user/user.schema';
import { Document } from 'mongoose';
import { RoleDocument } from 'src/role/role.interface';

export type UserDocument = UserEntity & Document;

export interface UserDocumentFull extends Omit<UserDocument, 'role'> {
    role: RoleDocument;
}

export interface UserSafe
    extends Omit<UserDocument, 'password' | '__v' | '_id'> {
    id: string;
}

export interface UserFullSafe
    extends Omit<UserDocumentFull, 'role' | 'password' | '__v' | '_id'> {
    id: string;
}
