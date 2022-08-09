import { IRoleDocument } from '../role/role.interface';
import { UserCreateDto } from './dtos/user.create.dto';
import { UserDocument } from './schemas/user.schema';

export interface IUserDocument extends Omit<UserDocument, 'role'> {
    role: IRoleDocument;
}

export interface IUserCreate extends UserCreateDto {
    passwordExpired: Date;
    salt: string;
}

export interface IUserCheckExist {
    email: boolean;
    mobileNumber: boolean;
}
