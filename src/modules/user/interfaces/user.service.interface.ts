import { IRequestApp } from '@common/request/interfaces/request.interface';
import { IUser } from '@modules/user/interfaces/user.interface';

export interface IUserService {
    validateUserGuard(
        request: IRequestApp,
        requiredVerified: boolean
    ): Promise<IUser>;
}
