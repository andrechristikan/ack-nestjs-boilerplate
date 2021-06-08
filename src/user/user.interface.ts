import { UserEntity } from 'src/user/user.schema';
import { Document } from 'mongoose';
import { RoleEntity } from 'src/role/role.schema';

export type UserDocument = UserEntity & Document;

export interface UserDocumentFull extends Omit<UserDocument, 'role'> {
    role: RoleEntity;
}
export interface UserSavedPlaces {
    address: string;
    name: string;
    default: boolean;
    receiver: string;
    receiverPhone: string;
}
