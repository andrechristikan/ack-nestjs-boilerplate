import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { AuthTokenResponseDto } from '@modules/auth/dtos/response/auth.token.response.dto';
import { UserLoginSetupTwoFactorRequestDto } from '@modules/user/dtos/request/user.login-setup-two-factor.request.dto';
import { UserLoginVerifyTwoFactorRequestDto } from '@modules/user/dtos/request/user.login-verify-two-factor.request.dto';
import { UserTwoFactorDisableRequestDto } from '@modules/user/dtos/request/user.two-factor-disable.request.dto';
import { UserTwoFactorEnableRequestDto } from '@modules/user/dtos/request/user.two-factor-enable.request.dto';
import { UserTwoFactorRegenerateBackupCodeRequestDto } from '@modules/user/dtos/request/user.two-factor-regenerate-backup-code.request.dto';
import { UserTwoFactorEnableResponseDto } from '@modules/user/dtos/response/user.two-factor-enable.response.dto';
import { UserTwoFactorSetupResponseDto } from '@modules/user/dtos/response/user.two-factor-setup.response.dto';
import { UserTwoFactorStatusResponseDto } from '@modules/user/dtos/response/user.two-factor-status.response.dto';
import { IUserTwoFactorHttpService } from '@modules/user/interfaces/user.two-factor.http.service.interface';
import { IUser } from '@modules/user/interfaces/user.interface';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import { UserUtil } from '@modules/user/utils/user.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserTwoFactorHttpService implements IUserTwoFactorHttpService {
    constructor(
        private readonly userTwoFactorService: UserTwoFactorService,
        private readonly userUtil: UserUtil
    ) {}

    async loginVerifyTwoFactor({
        challengeToken,
        code,
        backupCode,
        method,
    }: UserLoginVerifyTwoFactorRequestDto): Promise<
        IResponseReturn<AuthTokenResponseDto>
    > {
        const tokens = await this.userTwoFactorService.loginVerifyTwoFactor(
            challengeToken,
            { code, backupCode, method }
        );

        return { data: tokens };
    }

    async loginSetupTwoFactor({
        code,
        challengeToken,
    }: UserLoginSetupTwoFactorRequestDto): Promise<
        IResponseReturn<UserTwoFactorEnableResponseDto>
    > {
        const backupCodes = await this.userTwoFactorService.loginSetupTwoFactor(
            challengeToken,
            code
        );

        return { data: { backupCodes } };
    }

    getTwoFactorStatus(
        user: IUser
    ): IResponseReturn<UserTwoFactorStatusResponseDto> {
        return {
            data: this.userUtil.mapTwoFactor(
                this.userTwoFactorService.getTwoFactorStatus(user)
            ),
        };
    }

    async setupTwoFactor(
        user: IUser
    ): Promise<IResponseReturn<UserTwoFactorSetupResponseDto>> {
        const setup = await this.userTwoFactorService.setupTwoFactor(user);

        return { data: setup };
    }

    async enableTwoFactor(
        user: IUser,
        { code }: UserTwoFactorEnableRequestDto
    ): Promise<IResponseReturn<UserTwoFactorEnableResponseDto>> {
        const backupCodes = await this.userTwoFactorService.enableTwoFactor(
            user,
            code
        );

        return { data: { backupCodes } };
    }

    async disableTwoFactor(
        user: IUser,
        { code, backupCode, method }: UserTwoFactorDisableRequestDto
    ): Promise<void> {
        await this.userTwoFactorService.disableTwoFactor(user, {
            code,
            backupCode,
            method,
        });
    }

    async regenerateTwoFactorBackupCodes(
        user: IUser,
        { code }: UserTwoFactorRegenerateBackupCodeRequestDto
    ): Promise<IResponseReturn<UserTwoFactorEnableResponseDto>> {
        const backupCodes =
            await this.userTwoFactorService.regenerateTwoFactorBackupCodes(
                user,
                code
            );

        return { data: { backupCodes } };
    }

    async resetTwoFactorByAdmin(
        userId: string,
        updatedBy: string
    ): Promise<void> {
        await this.userTwoFactorService.resetTwoFactorByAdmin(
            userId,
            updatedBy
        );
    }
}
