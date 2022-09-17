import { IRoleDocument } from 'src/modules/role/interfaces/role.interface';
import { UserCreateDto } from 'src/modules/user/dtos/user.create.dto';
import { UserDocument } from 'src/modules/user/schemas/user.schema';

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
