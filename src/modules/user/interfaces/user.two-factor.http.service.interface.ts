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
import { IUser } from '@modules/user/interfaces/user.interface';

export interface IUserTwoFactorHttpService {
    loginVerifyTwoFactor({
        challengeToken,
        code,
        backupCode,
        method,
    }: UserLoginVerifyTwoFactorRequestDto): Promise<
        IResponseReturn<AuthTokenResponseDto>
    >;
    loginSetupTwoFactor({
        code,
        challengeToken,
    }: UserLoginSetupTwoFactorRequestDto): Promise<
        IResponseReturn<UserTwoFactorEnableResponseDto>
    >;
    getTwoFactorStatus(
        user: IUser
    ): IResponseReturn<UserTwoFactorStatusResponseDto>;
    setupTwoFactor(
        user: IUser
    ): Promise<IResponseReturn<UserTwoFactorSetupResponseDto>>;
    enableTwoFactor(
        user: IUser,
        { code }: UserTwoFactorEnableRequestDto
    ): Promise<IResponseReturn<UserTwoFactorEnableResponseDto>>;
    disableTwoFactor(
        user: IUser,
        { code, backupCode, method }: UserTwoFactorDisableRequestDto
    ): Promise<void>;
    regenerateTwoFactorBackupCodes(
        user: IUser,
        { code }: UserTwoFactorRegenerateBackupCodeRequestDto
    ): Promise<IResponseReturn<UserTwoFactorEnableResponseDto>>;
    resetTwoFactorByAdmin(userId: string, updatedBy: string): Promise<void>;
}
