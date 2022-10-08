import { ENUM_AUTH_ACCESS_FOR } from 'src/common/auth/constants/auth.enum.constant';
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

export interface IUserRolePayload {
    name: string;
    permissions: string[];
    accessFor: ENUM_AUTH_ACCESS_FOR;
}
