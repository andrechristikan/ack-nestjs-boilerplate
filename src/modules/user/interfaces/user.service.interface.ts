import { AwsS3PresignResponseDto } from '@common/aws/dtos/response/aws.s3-presign.response.dto';
import { DatabaseIdResponseDto } from '@common/database/dtos/response/database.id.response.dto';
import { IFile } from '@common/file/interfaces/file.interface';
import {
    IPaginationEqual,
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import {
    IResponseFileReturn,
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { UserChangePasswordRequestDto } from '@modules/user/dtos/request/user.change-password.request.dto';
import {
    UserCheckEmailRequestDto,
    UserCheckUsernameRequestDto,
} from '@modules/user/dtos/request/user.check.request.dto';
import { UserClaimUsernameRequestDto } from '@modules/user/dtos/request/user.claim-username.request.dto';
import { UserCreateSocialRequestDto } from '@modules/user/dtos/request/user.create-social.request.dto';
import { UserCreateRequestDto } from '@modules/user/dtos/request/user.create.request.dto';
import { UserForgotPasswordResetRequestDto } from '@modules/user/dtos/request/user.forgot-password-reset.request.dto';
import { UserForgotPasswordRequestDto } from '@modules/user/dtos/request/user.forgot-password.request.dto';
import { UserGeneratePhotoProfileRequestDto } from '@modules/user/dtos/request/user.generate-photo-profile.request.dto';
import { UserLoginRequestDto } from '@modules/user/dtos/request/user.login.request.dto';
import { UserAddMobileNumberRequestDto } from '@modules/user/dtos/request/user.mobile-number.request.dto';
import {
    UserUpdateProfilePhotoRequestDto,
    UserUpdateProfileRequestDto,
} from '@modules/user/dtos/request/user.profile.request.dto';
import { UserSendEmailVerificationRequestDto } from '@modules/user/dtos/request/user.send-email-verification.request.dto';
import { UserSignUpRequestDto } from '@modules/user/dtos/request/user.sign-up.request.dto';
import { UserUpdateStatusRequestDto } from '@modules/user/dtos/request/user.update-status.request.dto';
import { UserVerifyEmailRequestDto } from '@modules/user/dtos/request/user.verify-email.request.dto';
import {
    UserCheckEmailResponseDto,
    UserCheckUsernameResponseDto,
} from '@modules/user/dtos/response/user.check.response.dto';
import { UserListResponseDto } from '@modules/user/dtos/response/user.list.response.dto';
import { UserProfileResponseDto } from '@modules/user/dtos/response/user.profile.response.dto';
import { UserLoginResponseDto } from '@modules/user/dtos/response/user.login.response.dto';
import { UserMobileNumberResponseDto } from '@modules/user/dtos/user.mobile-number.dto';
import { IUser } from '@modules/user/interfaces/user.interface';
import { EnumUserLoginWith, Prisma } from '@generated/prisma-client';
import { UserTwoFactorSetupResponseDto } from '@modules/user/dtos/response/user.two-factor-setup.response.dto';
import { UserTwoFactorStatusResponseDto } from '@modules/user/dtos/response/user.two-factor-status.response.dto';
import { UserTwoFactorEnableRequestDto } from '@modules/user/dtos/request/user.two-factor-enable.request.dto';
import { UserTwoFactorEnableResponseDto } from '@modules/user/dtos/response/user.two-factor-enable.response.dto';
import { UserTwoFactorDisableRequestDto } from '@modules/user/dtos/request/user.two-factor-disable.request.dto';
import { UserLoginVerifyTwoFactorRequestDto } from '@modules/user/dtos/request/user.login-verify-two-factor.request.dto';
import { AuthTokenResponseDto } from '@modules/auth/dtos/response/auth.token.response.dto';
import { UserImportRequestDto } from '@modules/user/dtos/request/user.import.request.dto';
import { UserLoginSetupTwoFactorRequestDto } from '@modules/user/dtos/request/user.login-setup-two-factor.request.dto';

export interface IUserService {
    validateUserGuard(
        request: IRequestApp,
        requiredVerified: boolean
    ): Promise<IUser>;
    getListOffsetByAdmin(
        pagination: IPaginationQueryOffsetParams<
            Prisma.UserSelect,
            Prisma.UserWhereInput
        >,
        status?: Record<string, IPaginationIn>,
        role?: Record<string, IPaginationEqual>,
        country?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<UserListResponseDto>>;
    getListCursor(
        pagination: IPaginationQueryCursorParams<
            Prisma.UserSelect,
            Prisma.UserWhereInput
        >,
        status?: Record<string, IPaginationIn>,
        role?: Record<string, IPaginationEqual>,
        country?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<UserListResponseDto>>;
    getOne(id: string): Promise<IResponseReturn<UserProfileResponseDto>>;
    createByAdmin(
        { countryId, email, name, roleId }: UserCreateRequestDto,
        createdBy: string
    ): Promise<IResponseReturn<DatabaseIdResponseDto>>;
    updateStatusByAdmin(
        userId: string,
        { status }: UserUpdateStatusRequestDto,
        updatedBy: string
    ): Promise<IResponseReturn<void>>;
    checkUsername({
        username,
    }: UserCheckUsernameRequestDto): Promise<
        IResponseReturn<UserCheckUsernameResponseDto>
    >;
    checkEmail({
        email,
    }: UserCheckEmailRequestDto): Promise<
        IResponseReturn<UserCheckEmailResponseDto>
    >;
    getProfile(
        userId: string
    ): Promise<IResponseReturn<UserProfileResponseDto>>;
    updateProfile(
        userId: string,
        { countryId, ...data }: UserUpdateProfileRequestDto
    ): Promise<void>;
    generatePhotoProfilePresign(
        userId: string,
        { extension, size }: UserGeneratePhotoProfileRequestDto
    ): Promise<IResponseReturn<AwsS3PresignResponseDto>>;
    updatePhotoProfile(
        userId: string,
        { photoKey, size }: UserUpdateProfilePhotoRequestDto
    ): Promise<void>;
    deleteSelf(userId: string): Promise<void>;
    addMobileNumber(
        userId: string,
        { number, countryId, phoneCode }: UserAddMobileNumberRequestDto
    ): Promise<IResponseReturn<UserMobileNumberResponseDto>>;
    updateMobileNumber(
        userId: string,
        mobileNumberId: string,
        { number, countryId, phoneCode }: UserAddMobileNumberRequestDto
    ): Promise<IResponseReturn<UserMobileNumberResponseDto>>;
    deleteMobileNumber(
        userId: string,
        mobileNumberId: string
    ): Promise<IResponseReturn<UserMobileNumberResponseDto>>;
    claimUsername(
        userId: string,
        { username }: UserClaimUsernameRequestDto
    ): Promise<void>;
    uploadPhotoProfile(
        userId: string,
        file: IFile
    ): Promise<void>;
    updatePasswordByAdmin(
        userId: string,
        updatedBy: string
    ): Promise<IResponseReturn<void>>;
    changePassword(
        user: IUser,
        { newPassword, oldPassword }: UserChangePasswordRequestDto
    ): Promise<void>;
    loginCredential(
        { email, password, from }: UserLoginRequestDto
    ): Promise<IResponseReturn<UserLoginResponseDto>>;
    loginWithSocial(
        email: string,
        loginWith: EnumUserLoginWith,
        { from, device, ...others }: UserCreateSocialRequestDto
    ): Promise<IResponseReturn<UserLoginResponseDto>>;
    refresh(
        user: IUser,
        refreshToken: string
    ): Promise<IResponseReturn<AuthTokenResponseDto>>;
    signUp(
        { countryId, email, password, ...others }: UserSignUpRequestDto
    ): Promise<void>;
    verifyEmail(
        { token }: UserVerifyEmailRequestDto
    ): Promise<void>;
    sendVerificationEmail(
        { email }: UserSendEmailVerificationRequestDto
    ): Promise<void>;
    forgotPassword(
        { email }: UserForgotPasswordRequestDto
    ): Promise<void>;
    resetPassword(
        { newPassword, token }: UserForgotPasswordResetRequestDto
    ): Promise<void>;
    loginVerifyTwoFactor(
        {
            challengeToken,
            code,
            backupCode,
            method,
        }: UserLoginVerifyTwoFactorRequestDto
    ): Promise<IResponseReturn<AuthTokenResponseDto>>;
    loginSetupTwoFactor(
        { code, challengeToken }: UserLoginSetupTwoFactorRequestDto
    ): Promise<IResponseReturn<UserTwoFactorEnableResponseDto>>;
    getTwoFactorStatus(
        user: IUser
    ): Promise<IResponseReturn<UserTwoFactorStatusResponseDto>>;
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
        user: IUser
    ): Promise<IResponseReturn<UserTwoFactorEnableResponseDto>>;
    resetTwoFactorByAdmin(
        userId: string,
        updatedBy: string
    ): Promise<void>;
    importByAdmin(
        data: UserImportRequestDto[],
        createdBy: string
    ): Promise<void>;
    exportByAdmin(
        status?: Record<string, IPaginationIn>,
        role?: Record<string, IPaginationEqual>,
        country?: Record<string, IPaginationEqual>
    ): Promise<IResponseFileReturn>;
    logout(
        userId: string,
        sessionId: string,
        deviceOwnershipId: string
    ): Promise<void>;
}
