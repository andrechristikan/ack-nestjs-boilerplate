import { ENUM_AUTH_ACCESS_FOR } from 'src/common/auth/constants/auth.enum.constant';
import { IRole } from 'src/modules/role/interfaces/role.interface';
import { UserCreateDto } from 'src/modules/user/dtos/user.create.dto';
import { User } from 'src/modules/user/schemas/user.schema';

export interface IUser extends Omit<User, 'role'> {
    role: IRole;
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
