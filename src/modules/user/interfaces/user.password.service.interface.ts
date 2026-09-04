import {
    IUser,
    IUserChangePassword,
    IUserResetPassword,
} from '@modules/user/interfaces/user.interface';

export interface IUserPasswordService {
    updatePasswordByAdmin(userId: string, updatedBy: string): Promise<void>;
    changePassword(
        user: IUser,
        {
            newPassword,
            oldPassword,
            backupCode,
            code,
            method,
        }: IUserChangePassword
    ): Promise<void>;
    forgotPassword(email: string): Promise<void>;
    resetPassword({
        newPassword,
        token,
        backupCode,
        code,
        method,
    }: IUserResetPassword): Promise<void>;
}
