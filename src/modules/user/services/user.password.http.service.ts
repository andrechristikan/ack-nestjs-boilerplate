import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { UserChangePasswordRequestDto } from '@modules/user/dtos/request/user.change-password.request.dto';
import { UserForgotPasswordResetRequestDto } from '@modules/user/dtos/request/user.forgot-password-reset.request.dto';
import { UserForgotPasswordRequestDto } from '@modules/user/dtos/request/user.forgot-password.request.dto';
import { IUserPasswordHttpService } from '@modules/user/interfaces/user.password.http.service.interface';
import { IUser } from '@modules/user/interfaces/user.interface';
import { UserPasswordService } from '@modules/user/services/user.password.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserPasswordHttpService implements IUserPasswordHttpService {
    constructor(private readonly userPasswordService: UserPasswordService) {}

    async updatePasswordByAdmin(
        userId: string,
        updatedBy: string
    ): Promise<IResponseReturn<void>> {
        await this.userPasswordService.updatePasswordByAdmin(userId, updatedBy);

        return {};
    }

    async changePassword(
        user: IUser,
        {
            newPassword,
            oldPassword,
            backupCode,
            code,
            method,
        }: UserChangePasswordRequestDto
    ): Promise<void> {
        await this.userPasswordService.changePassword(user, {
            newPassword,
            oldPassword,
            backupCode,
            code,
            method,
        });
    }

    async forgotPassword({
        email,
    }: UserForgotPasswordRequestDto): Promise<void> {
        await this.userPasswordService.forgotPassword(email);
    }

    async resetPassword({
        newPassword,
        token,
        backupCode,
        code,
        method,
    }: UserForgotPasswordResetRequestDto): Promise<void> {
        await this.userPasswordService.resetPassword({
            newPassword,
            token,
            backupCode,
            code,
            method,
        });
    }
}
