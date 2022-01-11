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
    passwordExpired: Date;
    email: string;
    mobileNumber: string;
    role: string;
    salt: string;
}

export type IUserUpdate = Pick<IUserCreate, 'firstName' | 'lastName'>;

export interface IUserCheckExist {
    email: boolean;
    mobileNumber: boolean;
}
