import { AwsS3PresignDto } from '@common/aws/dtos/aws.s3-presign.dto';
import { DatabaseIdDto } from '@common/database/dtos/database.id.dto';
import { IFile } from '@common/file/interfaces/file.interface';
import {
    IPaginationEqual,
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import {
    IRequestApp,
    IRequestLog,
} from '@common/request/interfaces/request.interface';
import {
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
import { UserTwoFactorConfirmRequestDto } from '@modules/user/dtos/request/user.two-factor-confirm.request.dto';
import { UserTwoFactorVerifyLoginRequestDto } from '@modules/user/dtos/request/user.two-factor-verify-login.request.dto';
import { UserTwoFactorDisableRequestDto } from '@modules/user/dtos/request/user.two-factor-disable.request.dto';
import { UserTwoFactorRegenerateRequestDto } from '@modules/user/dtos/request/user.two-factor-regenerate.request.dto';
import {
    UserCheckEmailResponseDto,
    UserCheckUsernameResponseDto,
} from '@modules/user/dtos/response/user.check.response.dto';
import { UserListResponseDto } from '@modules/user/dtos/response/user.list.response.dto';
import { UserProfileResponseDto } from '@modules/user/dtos/response/user.profile.response.dto';
import { UserLoginResponseDto } from '@modules/user/dtos/response/user.login.response.dto';
import { UserTokenResponseDto } from '@modules/user/dtos/response/user.token.response.dto';
import { UserTwoFactorSetupResponseDto } from '@modules/user/dtos/response/user.two-factor-setup.response.dto';
import { UserTwoFactorBackupCodesResponseDto } from '@modules/user/dtos/response/user.two-factor-backup-codes.response.dto';
import { UserTwoFactorStatusResponseDto } from '@modules/user/dtos/response/user.two-factor-status.response.dto';
import { UserMobileNumberResponseDto } from '@modules/user/dtos/user.mobile-number.dto';
import { IUser } from '@modules/user/interfaces/user.interface';
import { EnumUserLoginWith } from '@prisma/client';

export interface IUserService {
    validateUserGuard(
        request: IRequestApp,
        requiredVerified: boolean
    ): Promise<IUser>;
    getListOffset(
        pagination: IPaginationQueryOffsetParams,
        status?: Record<string, IPaginationIn>,
        role?: Record<string, IPaginationEqual>,
        country?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<UserListResponseDto>>;
    getListActiveCursor(
        pagination: IPaginationQueryCursorParams,
        status?: Record<string, IPaginationIn>,
        role?: Record<string, IPaginationEqual>,
        country?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<UserListResponseDto>>;
    getOne(id: string): Promise<IResponseReturn<UserProfileResponseDto>>;
    createByAdmin(
        { countryId, email, name, roleId }: UserCreateRequestDto,
        requestLog: IRequestLog,
        createdBy: string
    ): Promise<IResponseReturn<DatabaseIdDto>>;
    updateStatusByAdmin(
        userId: string,
        { status }: UserUpdateStatusRequestDto,
        requestLog: IRequestLog,
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
        { countryId, ...data }: UserUpdateProfileRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>>;
    generatePhotoProfilePresign(
        userId: string,
        { extension, size }: UserGeneratePhotoProfileRequestDto
    ): Promise<IResponseReturn<AwsS3PresignDto>>;
    updatePhotoProfile(
        userId: string,
        { photo, size }: UserUpdateProfilePhotoRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>>;
    deleteSelf(
        userId: string,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>>;
    addMobileNumber(
        userId: string,
        { number, countryId, phoneCode }: UserAddMobileNumberRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<UserMobileNumberResponseDto>>;
    updateMobileNumber(
        userId: string,
        mobileNumberId: string,
        { number, countryId, phoneCode }: UserAddMobileNumberRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<UserMobileNumberResponseDto>>;
    deleteMobileNumber(
        userId: string,
        mobileNumberId: string,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<UserMobileNumberResponseDto>>;
    claimUsername(
        userId: string,
        { username }: UserClaimUsernameRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>>;
    uploadPhotoProfile(
        userId: string,
        file: IFile,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>>;
    updatePasswordByAdmin(
        userId: string,
        requestLog: IRequestLog,
        updatedBy: string
    ): Promise<IResponseReturn<void>>;
    disableTwoFactorByAdmin(
        userId: string,
        requestLog: IRequestLog,
        updatedBy: string
    ): Promise<IResponseReturn<void>>;
    changePassword(
        userId: string,
        { newPassword, oldPassword }: UserChangePasswordRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>>;
    loginCredential(
        { email, password, from }: UserLoginRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<UserLoginResponseDto>>;
    loginWithSocial(
        email: string,
        loginWith: EnumUserLoginWith,
        { from, ...others }: UserCreateSocialRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<UserLoginResponseDto>>;
    refreshToken(
        user: IUser,
        refreshToken: string,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<UserTokenResponseDto>>;
    verifyLoginTwoFactor(
        {
            challengeToken,
            code,
            backupCode,
        }: UserTwoFactorVerifyLoginRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<UserLoginResponseDto>>;
    getTwoFactorStatus(
        userId: string
    ): Promise<IResponseReturn<UserTwoFactorStatusResponseDto>>;
    setupTwoFactor(
        userId: string,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<UserTwoFactorSetupResponseDto>>;
    confirmTwoFactor(
        userId: string,
        { code }: UserTwoFactorConfirmRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<UserTwoFactorBackupCodesResponseDto>>;
    regenerateTwoFactorBackupCodes(
        userId: string,
        body: UserTwoFactorRegenerateRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<UserTwoFactorBackupCodesResponseDto>>;
    disableTwoFactor(
        userId: string,
        { code, backupCode }: UserTwoFactorDisableRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>>;
    signUp(
        { countryId, email, password, ...others }: UserSignUpRequestDto,
        requestLog: IRequestLog
    ): Promise<void>;
    verifyEmail(
        { token }: UserVerifyEmailRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>>;
    sendEmail(
        { email }: UserSendEmailVerificationRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>>;
    forgotPassword(
        { email }: UserForgotPasswordRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>>;
    resetPassword(
        { newPassword, token }: UserForgotPasswordResetRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>>;
}
