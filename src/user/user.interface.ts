import { UserEntity } from 'src/user/user.schema';
import { Document } from 'mongoose';
import { IRoleDocument } from 'src/role/role.interface';

export type UserDocument = UserEntity & Document;

export interface IUserDocument extends Omit<UserDocument, 'role'> {
    role: IRoleDocument;
}

export interface IUserCreate {
    firstName: string;
    lastName?: string;
    password: string;
    email: string;
    mobileNumber: string;
    role: string;
}

export type IUserUpdate = Pick<IUserCreate, 'firstName' | 'lastName'>;
