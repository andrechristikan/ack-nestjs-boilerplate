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
import { UserSignUpRequestDto } from '@modules/user/dtos/request/user.sign-up.request.dto';
import { UserUpdateStatusRequestDto } from '@modules/user/dtos/request/user.update-status.request.dto';
import { UserVerifyEmailRequestDto } from '@modules/user/dtos/request/user.verify-email.request.dto';
import {
    UserCheckEmailResponseDto,
    UserCheckUsernameResponseDto,
} from '@modules/user/dtos/response/user.check.response.dto';
import { UserListResponseDto } from '@modules/user/dtos/response/user.list.response.dto';
import { UserProfileResponseDto } from '@modules/user/dtos/response/user.profile.response.dto';
import { UserTokenResponseDto } from '@modules/user/dtos/response/user.token.response.dto';
import { IUser } from '@modules/user/interfaces/user.interface';
import { ENUM_USER_LOGIN_WITH } from '@prisma/client';

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
    ): Promise<IResponseReturn<DatabaseIdDto>>;
    updateMobileNumber(
        userId: string,
        mobileNumberId: string,
        { number, countryId, phoneCode }: UserAddMobileNumberRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>>;
    deleteMobileNumber(
        userId: string,
        mobileNumberId: string,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>>;
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
    changePassword(
        userId: string,
        { newPassword, oldPassword }: UserChangePasswordRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>>;
    loginCredential(
        { email, password, from }: UserLoginRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<UserTokenResponseDto>>;
    loginWithSocial(
        email: string,
        loginWith: ENUM_USER_LOGIN_WITH,
        { from, ...others }: UserCreateSocialRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<UserTokenResponseDto>>;
    refreshToken(
        user: IUser,
        refreshToken: string
    ): Promise<IResponseReturn<UserTokenResponseDto>>;
    signUp(
        { countryId, email, password, ...others }: UserSignUpRequestDto,
        requestLog: IRequestLog
    ): Promise<void>;
    verifyEmail(
        { token }: UserVerifyEmailRequestDto,
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
