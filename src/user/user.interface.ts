import { UserEntity } from 'src/user/user.schema';
import { Document } from 'mongoose';
import { RoleDocumentFull } from 'src/role/role.interface';

export type UserDocument = UserEntity & Document;

export interface UserDocumentFull extends Omit<UserDocument, 'role'> {
    role: RoleDocumentFull;
}
