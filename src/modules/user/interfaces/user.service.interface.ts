import { IRequestApp } from '@common/request/interfaces/request.interface';
import { UserDto } from '@modules/user/dtos/user.dto';
import { IUser } from '@modules/user/interfaces/user.interface';

export interface IUserService {
    validateUserGuard(
        request: IRequestApp,
        requiredVerified: boolean
    ): Promise<IUser>;
}
