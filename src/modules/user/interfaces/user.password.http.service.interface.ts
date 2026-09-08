import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { UserChangePasswordRequestDto } from '@modules/user/dtos/request/user.change-password.request.dto';
import { UserForgotPasswordResetRequestDto } from '@modules/user/dtos/request/user.forgot-password-reset.request.dto';
import { UserForgotPasswordRequestDto } from '@modules/user/dtos/request/user.forgot-password.request.dto';
import { IUser } from '@modules/user/interfaces/user.interface';

export interface IUserPasswordHttpService {
    updatePasswordByAdmin(
        userId: string,
        updatedBy: string
    ): Promise<IResponseReturn<void>>;
    changePassword(
        user: IUser,
        {
            newPassword,
            oldPassword,
            backupCode,
            code,
            method,
        }: UserChangePasswordRequestDto
    ): Promise<void>;
    forgotPassword({ email }: UserForgotPasswordRequestDto): Promise<void>;
    resetPassword({
        newPassword,
        token,
        backupCode,
        code,
        method,
    }: UserForgotPasswordResetRequestDto): Promise<void>;
}
