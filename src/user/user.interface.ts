import { IRoleDocument } from 'src/role/role.interface';
import { UserDocument } from './user.schema';

export interface IUserDocument extends Omit<UserDocument, 'role'> {
    role: IRoleDocument;
}

export interface IUserCreate {
    firstName: string;
    lastName?: string;
    password: string;
    passwordExpiredDate: Date;
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
