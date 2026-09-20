import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { IAuthToken } from '@modules/auth/interfaces/auth.interface';
import type { UserLoginSetupTwoFactorRequestDto } from '@modules/user/dtos/request/user.login-setup-two-factor.request.dto';
import type { UserLoginVerifyTwoFactorRequestDto } from '@modules/user/dtos/request/user.login-verify-two-factor.request.dto';
import type { UserTwoFactorDisableRequestDto } from '@modules/user/dtos/request/user.two-factor-disable.request.dto';
import type { UserTwoFactorEnableRequestDto } from '@modules/user/dtos/request/user.two-factor-enable.request.dto';
import type { UserTwoFactorRegenerateBackupCodeRequestDto } from '@modules/user/dtos/request/user.two-factor-regenerate-backup-code.request.dto';
import type { UserTwoFactorSetupRequestDto } from '@modules/user/dtos/request/user.two-factor-setup.request.dto';
import type { UserTwoFactorEnableResponseDto } from '@modules/user/dtos/response/user.two-factor-enable.response.dto';
import type { UserTwoFactorStatusResponseDto } from '@modules/user/dtos/response/user.two-factor-status.response.dto';
import type {
    IUser,
    IUserTwoFactorSetup,
} from '@modules/user/interfaces/user.interface';
import { UserTwoFactorDomain } from '@modules/user/domains/user.two-factor.domain';
import { UserUtil } from '@modules/user/utils/user.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserTwoFactorHttpService {
    constructor(
        private readonly userTwoFactorDomain: UserTwoFactorDomain,
        private readonly userUtil: UserUtil
    ) {}

    async loginVerifyTwoFactor({
        challengeToken,
        code,
        backupCode,
        method,
    }: UserLoginVerifyTwoFactorRequestDto): Promise<
        IResponseReturn<IAuthToken>
    > {
        const tokens = await this.userTwoFactorDomain.loginVerifyTwoFactor(
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
        const backupCodes = await this.userTwoFactorDomain.loginSetupTwoFactor(
            challengeToken,
            code
        );

        return { data: { backupCodes } };
    }

    getTwoFactorStatus(
        user: IUser
    ): IResponseReturn<UserTwoFactorStatusResponseDto> {
        const twoFactorStatus =
            this.userTwoFactorDomain.getTwoFactorStatus(user);
        const twoFactor = this.userUtil.mapTwoFactor(twoFactorStatus);

        return { data: twoFactor };
    }

    async setupTwoFactor(
        user: IUser,
        { backupCode }: UserTwoFactorSetupRequestDto
    ): Promise<IResponseReturn<IUserTwoFactorSetup>> {
        const setup = await this.userTwoFactorDomain.setupTwoFactor(
            user,
            backupCode ?? null
        );

        return { data: setup };
    }

    async enableTwoFactor(
        user: IUser,
        { code }: UserTwoFactorEnableRequestDto
    ): Promise<IResponseReturn<UserTwoFactorEnableResponseDto>> {
        const backupCodes = await this.userTwoFactorDomain.enableTwoFactor(
            user,
            code
        );

        return { data: { backupCodes } };
    }

    async disableTwoFactor(
        user: IUser,
        { code, backupCode, method }: UserTwoFactorDisableRequestDto
    ): Promise<void> {
        await this.userTwoFactorDomain.disableTwoFactor(user, {
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
            await this.userTwoFactorDomain.regenerateTwoFactorBackupCodes(
                user,
                code
            );

        return { data: { backupCodes } };
    }

    async resetTwoFactorByAdmin(
        userId: string,
        updatedBy: string
    ): Promise<void> {
        await this.userTwoFactorDomain.resetTwoFactorByAdmin(userId, updatedBy);
    }
}
