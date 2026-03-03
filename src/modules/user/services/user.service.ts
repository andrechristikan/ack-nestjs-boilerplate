import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { AwsS3PresignDto } from '@common/aws/dtos/aws.s3-presign.dto';
import { AwsS3Dto } from '@common/aws/dtos/aws.s3.dto';
import { AwsS3Service } from '@common/aws/services/aws.s3.service';
import { DatabaseIdDto } from '@common/database/dtos/database.id.dto';
import {
    EnumFileExtensionDocument,
    EnumFileExtensionImage,
} from '@common/file/enums/file.enum';
import { IFile } from '@common/file/interfaces/file.interface';
import { FileService } from '@common/file/services/file.service';
import { HelperService } from '@common/helper/services/helper.service';
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
    IResponseFileReturn,
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import {
    IAuthJwtRefreshTokenPayload,
    IAuthPassword,
    IAuthTwoFactorVerify,
    IAuthTwoFactorVerifyResult,
} from '@modules/auth/interfaces/auth.interface';
import { AuthUtil } from '@modules/auth/utils/auth.util';
import { EnumCountryStatusCodeError } from '@modules/country/enums/country.status-code.enum';
import { CountryRepository } from '@modules/country/repositories/country.repository';
import { PasswordHistoryRepository } from '@modules/password-history/repositories/password-history.repository';
import { EnumRoleStatusCodeError } from '@modules/role/enums/role.status-code.enum';
import { RoleRepository } from '@modules/role/repositories/role.repository';
import { SessionRepository } from '@modules/session/repositories/session.repository';
import { SessionUtil } from '@modules/session/utils/session.util';
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
import { UserTwoFactorSetupResponseDto } from '@modules/user/dtos/response/user.two-factor-setup.response.dto';
import { UserTwoFactorStatusResponseDto } from '@modules/user/dtos/response/user.two-factor-status.response.dto';
import { UserMobileNumberResponseDto } from '@modules/user/dtos/user.mobile-number.dto';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { IUser } from '@modules/user/interfaces/user.interface';
import { IUserService } from '@modules/user/interfaces/user.service.interface';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserUtil } from '@modules/user/utils/user.util';
import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import {
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserStatus,
    EnumVerificationType,
    Prisma,
} from '@prisma/client';
import { Duration } from 'luxon';
import { AuthTwoFactorUtil } from '@modules/auth/utils/auth.two-factor.util';
import { UserTwoFactorDisableRequestDto } from '@modules/user/dtos/request/user.two-factor-disable.request.dto';
import { UserTwoFactorEnableRequestDto } from '@modules/user/dtos/request/user.two-factor-enable.request.dto';
import { UserTwoFactorEnableResponseDto } from '@modules/user/dtos/response/user.two-factor-enable.response.dto';
import { UserLoginVerifyTwoFactorRequestDto } from '@modules/user/dtos/request/user.login-verify-two-factor.request.dto';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { AuthTokenResponseDto } from '@modules/auth/dtos/response/auth.token.response.dto';
import { RequestTooManyException } from '@common/request/exceptions/request.too-many.exception';
import { UserImportRequestDto } from '@modules/user/dtos/request/user.import.request.dto';
import { ConfigService } from '@nestjs/config';
import { UserExportResponseDto } from '@modules/user/dtos/response/user.export.response.dto';
import { UserLoginSetupTwoFactorRequestDto } from '@modules/user/dtos/request/user.login-setup-two-factor.request.dto';
import { FeatureFlagUtil } from '@modules/feature-flag/utils/feature-flag.util';
import { DeviceDto } from '@modules/device/dtos/device.dto';
import { DeviceRepository } from '@modules/device/repositories/device.repository';
import { INotificationNewDeviceLoginPayload } from '@modules/notification/interfaces/notification.interface';
import { NotificationUtil } from '@modules/notification/utils/notification.util';

@Injectable()
export class UserService implements IUserService {
    private readonly userRoleName: string;
    private readonly userCountryName: string;

    constructor(
        private readonly userUtil: UserUtil,
        private readonly userRepository: UserRepository,
        private readonly countryRepository: CountryRepository,
        private readonly roleRepository: RoleRepository,
        private readonly passwordHistoryRepository: PasswordHistoryRepository,
        private readonly deviceRepository: DeviceRepository,
        private readonly awsS3Service: AwsS3Service,
        private readonly helperService: HelperService,
        private readonly fileService: FileService,
        private readonly notificationUtil: NotificationUtil,
        private readonly authUtil: AuthUtil,
        private readonly sessionUtil: SessionUtil,
        private readonly sessionRepository: SessionRepository,
        private readonly featureFlagUtil: FeatureFlagUtil,
        private readonly authTwoFactorUtil: AuthTwoFactorUtil,
        private readonly configService: ConfigService
    ) {
        this.userRoleName = this.configService.get<string>('user.default.role');
        this.userCountryName = this.configService.get<string>(
            'user.default.country'
        );
    }

    async validateUserGuard(
        request: IRequestApp,
        requiredVerified: boolean
    ): Promise<IUser> {
        if (!request.user) {
            throw new UnauthorizedException({
                statusCode: EnumAuthStatusCodeError.jwtAccessTokenInvalid,
                message: 'auth.error.accessTokenUnauthorized',
            });
        }

        const { userId } = request.user;
        const user = await this.userRepository.findOneWithRoleById(userId);
        if (!user) {
            throw new ForbiddenException({
                statusCode: EnumUserStatusCodeError.notFound,
                message: 'user.error.notFound',
            });
        } else if (user.status !== EnumUserStatus.active) {
            throw new ForbiddenException({
                statusCode: EnumUserStatusCodeError.inactiveForbidden,
                message: 'user.error.inactive',
            });
        }

        const checkPasswordExpired: boolean =
            this.authUtil.checkPasswordExpired(user.passwordExpired);
        if (checkPasswordExpired) {
            throw new ForbiddenException({
                statusCode: EnumUserStatusCodeError.passwordExpired,
                message: 'auth.error.passwordExpired',
            });
        } else if (requiredVerified === true && user.isVerified !== true) {
            throw new ForbiddenException({
                statusCode: EnumUserStatusCodeError.emailNotVerified,
                message: 'user.error.emailNotVerified',
            });
        }

        return user;
    }

    async getListOffsetByAdmin(
        pagination: IPaginationQueryOffsetParams<
            Prisma.UserSelect,
            Prisma.UserWhereInput
        >,
        status?: Record<string, IPaginationIn>,
        role?: Record<string, IPaginationEqual>,
        country?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<UserListResponseDto>> {
        const { data, ...others } =
            await this.userRepository.findWithPaginationOffset(
                pagination,
                status,
                role,
                country
            );

        const users: UserListResponseDto[] = this.userUtil.mapList(data);
        return {
            data: users,
            ...others,
        };
    }

    async getListCursor(
        pagination: IPaginationQueryCursorParams<
            Prisma.UserSelect,
            Prisma.UserWhereInput
        >,
        status?: Record<string, IPaginationIn>,
        role?: Record<string, IPaginationEqual>,
        country?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<UserListResponseDto>> {
        const { data, ...others } =
            await this.userRepository.findWithPaginationCursor(
                pagination,
                status,
                role,
                country
            );

        const users: UserListResponseDto[] = this.userUtil.mapList(data);
        return {
            data: users,
            ...others,
        };
    }

    async getOne(id: string): Promise<IResponseReturn<UserProfileResponseDto>> {
        const user = await this.userRepository.findOneProfileById(id);
        if (!user) {
            throw new NotFoundException({
                statusCode: EnumUserStatusCodeError.notFound,
                message: 'user.error.notFound',
            });
        }

        return { data: this.userUtil.mapProfile(user) };
    }

    async createByAdmin(
        { countryId, email, name, roleId }: UserCreateRequestDto,
        requestLog: IRequestLog,
        createdBy: string
    ): Promise<IResponseReturn<DatabaseIdDto>> {
        const [checkRole, emailExist, checkCountry] = await Promise.all([
            this.roleRepository.existById(roleId),
            this.userRepository.existByEmail(email),
            this.countryRepository.existById(countryId),
        ]);

        if (!checkRole) {
            throw new NotFoundException({
                statusCode: EnumRoleStatusCodeError.notFound,
                message: 'role.error.notFound',
            });
        } else if (!checkCountry) {
            throw new NotFoundException({
                statusCode: EnumCountryStatusCodeError.notFound,
                message: 'country.error.notFound',
            });
        } else if (emailExist) {
            throw new ConflictException({
                statusCode: EnumUserStatusCodeError.emailExist,
                message: 'user.error.emailExist',
            });
        }

        try {
            const passwordString = this.authUtil.createPasswordRandom();
            const password: IAuthPassword = this.authUtil.createPassword(
                passwordString,
                {
                    temporary: true,
                }
            );
            const randomUsername = this.userUtil.createRandomUsername();
            const created = await this.userRepository.createByAdmin(
                randomUsername,
                {
                    countryId,
                    email,
                    name,
                    roleId,
                },
                password,
                checkRole,
                requestLog,
                createdBy
            );

            // @note: send email after all creation
            await this.notificationUtil.sendWelcomeByAdmin(
                created.id,
                {
                    password: passwordString,
                    passwordCreatedAt: password.passwordCreated.toISOString(),
                    passwordExpiredAt: password.passwordExpired.toISOString(),
                },
                createdBy
            );

            return {
                data: { id: created.id },
                metadataActivityLog:
                    this.userUtil.mapActivityLogMetadata(created),
            };
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async updateStatusByAdmin(
        userId: string,
        { status }: UserUpdateStatusRequestDto,
        requestLog: IRequestLog,
        updatedBy: string
    ): Promise<IResponseReturn<void>> {
        const user = await this.userRepository.findOneById(userId);
        if (!user) {
            throw new NotFoundException({
                statusCode: EnumUserStatusCodeError.notFound,
                message: 'user.error.notFound',
            });
        } else if (user.status === EnumUserStatus.blocked) {
            throw new BadRequestException({
                statusCode: EnumUserStatusCodeError.statusInvalid,
                message: 'user.error.statusInvalid',
                messageProperties: {
                    status: user.status.toLowerCase(),
                },
            });
        }

        try {
            const updated = await this.userRepository.updateStatusByAdmin(
                userId,
                { status },
                requestLog,
                updatedBy
            );

            return {
                metadataActivityLog:
                    this.userUtil.mapActivityLogMetadata(updated),
            };
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }

        return;
    }

    async checkUsername({
        username,
    }: UserCheckUsernameRequestDto): Promise<
        IResponseReturn<UserCheckUsernameResponseDto>
    > {
        const [checkUsername, checkBadWord, isExist] = await Promise.all([
            this.userUtil.checkUsernamePattern(username),
            this.userUtil.checkBadWord(username),
            this.userRepository.existByUsername(username),
        ]);

        return {
            data: {
                badWord: checkBadWord,
                exist: !!isExist,
                pattern: checkUsername,
            },
        };
    }

    async checkEmail({
        email,
    }: UserCheckEmailRequestDto): Promise<
        IResponseReturn<UserCheckEmailResponseDto>
    > {
        const [checkBadWord, isExist] = await Promise.all([
            this.userUtil.checkBadWord(email),
            this.userRepository.existByEmail(email),
        ]);

        return {
            data: {
                badWord: checkBadWord,
                exist: !!isExist,
            },
        };
    }

    async getProfile(
        userId: string
    ): Promise<IResponseReturn<UserProfileResponseDto>> {
        const user = await this.userRepository.findOneActiveProfileById(userId);
        const mapped = this.userUtil.mapProfile(user);

        return {
            data: mapped,
        };
    }

    async updateProfile(
        userId: string,
        { countryId, ...data }: UserUpdateProfileRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>> {
        const checkCountry = await this.countryRepository.existById(countryId);
        if (!checkCountry) {
            throw new NotFoundException({
                statusCode: EnumCountryStatusCodeError.notFound,
                message: 'country.error.notFound',
            });
        }

        try {
            await this.userRepository.updateProfile(
                userId,
                {
                    countryId,
                    ...data,
                },
                requestLog
            );

            return;
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async generatePhotoProfilePresign(
        userId: string,
        { extension, size }: UserGeneratePhotoProfileRequestDto
    ): Promise<IResponseReturn<AwsS3PresignDto>> {
        const key: string =
            this.userUtil.createRandomFilenamePhotoProfileWithPath(userId, {
                extension,
            });

        const aws: AwsS3PresignDto = await this.awsS3Service.presignPutItem(
            {
                key,
                size,
            },
            {
                forceUpdate: true,
            }
        );

        return { data: aws };
    }

    async updatePhotoProfile(
        userId: string,
        { photoKey, size }: UserUpdateProfilePhotoRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>> {
        try {
            const aws: AwsS3Dto = this.awsS3Service.mapPresign({
                key: photoKey,
                size,
            });

            await this.userRepository.updatePhotoProfile(
                userId,
                aws,
                requestLog
            );

            return;
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async deleteSelf(
        userId: string,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>> {
        try {
            const sessions = await this.sessionRepository.findActive(userId);
            await Promise.all([
                this.userRepository.deleteSelf(userId, requestLog),
                this.sessionUtil.deleteAllLogins(userId, sessions),
            ]);

            return;
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async addMobileNumber(
        userId: string,
        { number, countryId, phoneCode }: UserAddMobileNumberRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<UserMobileNumberResponseDto>> {
        const checkCountry =
            await this.countryRepository.findOneById(countryId);
        if (!checkCountry) {
            throw new NotFoundException({
                statusCode: EnumCountryStatusCodeError.notFound,
                message: 'country.error.notFound',
            });
        }

        const [checkValidMobileNumber, checkExist] = await Promise.all([
            this.userUtil.checkMobileNumber(checkCountry.phoneCode, phoneCode),
            this.userRepository.existMobileNumber(userId, {
                number,
                countryId: checkCountry.id,
                phoneCode,
            }),
        ]);
        if (!checkValidMobileNumber) {
            throw new BadRequestException({
                statusCode: EnumUserStatusCodeError.mobileNumberInvalid,
                message: 'user.error.mobileNumberInvalid',
            });
        } else if (checkExist) {
            throw new ConflictException({
                statusCode: EnumUserStatusCodeError.mobileNumberExist,
                message: 'user.error.mobileNumberExist',
            });
        }

        try {
            const updated = await this.userRepository.addMobileNumber(
                userId,
                {
                    number,
                    countryId,
                    phoneCode,
                },
                requestLog
            );

            const mapped = this.userUtil.mapMobileNumber(updated);

            return {
                data: mapped,
            };
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async updateMobileNumber(
        userId: string,
        mobileNumberId: string,
        { number, countryId, phoneCode }: UserAddMobileNumberRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<UserMobileNumberResponseDto>> {
        const [checkMobileNumberExist, checkCountry] = await Promise.all([
            this.userRepository.findOneMobileNumber(userId, mobileNumberId),
            this.countryRepository.findOneById(countryId),
        ]);
        if (!checkMobileNumberExist) {
            throw new NotFoundException({
                statusCode: EnumUserStatusCodeError.mobileNumberNotFound,
                message: 'user.error.mobileNumberNotFound',
            });
        } else if (!checkCountry) {
            throw new NotFoundException({
                statusCode: EnumCountryStatusCodeError.notFound,
                message: 'country.error.notFound',
            });
        }

        const checkExist = await this.userRepository.existMobileNumber(
            userId,
            { number, countryId, phoneCode },
            mobileNumberId
        );
        if (checkExist) {
            throw new ConflictException({
                statusCode: EnumUserStatusCodeError.mobileNumberExist,
                message: 'user.error.mobileNumberExist',
            });
        }

        const checkValidMobileNumber = this.userUtil.checkMobileNumber(
            checkCountry.phoneCode,
            phoneCode
        );
        if (!checkValidMobileNumber) {
            throw new BadRequestException({
                statusCode: EnumUserStatusCodeError.mobileNumberInvalid,
                message: 'user.error.mobileNumberInvalid',
            });
        }

        try {
            const updated = await this.userRepository.updateMobileNumber(
                userId,
                checkMobileNumberExist,
                {
                    number,
                    countryId,
                    phoneCode,
                },
                requestLog
            );

            const mapped = this.userUtil.mapMobileNumber(updated);

            return {
                data: mapped,
            };
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async deleteMobileNumber(
        userId: string,
        mobileNumberId: string,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<UserMobileNumberResponseDto>> {
        const checkExist = await this.userRepository.findOneMobileNumber(
            userId,
            mobileNumberId
        );
        if (!checkExist) {
            throw new NotFoundException({
                statusCode: EnumUserStatusCodeError.mobileNumberNotFound,
                message: 'user.error.mobileNumberNotFound',
            });
        }

        try {
            const updated = await this.userRepository.deleteMobileNumber(
                userId,
                mobileNumberId,
                requestLog
            );

            const mapped = this.userUtil.mapMobileNumber(updated);

            return {
                data: mapped,
            };
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async claimUsername(
        userId: string,
        { username }: UserClaimUsernameRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>> {
        const [checkUsername, checkBadWord, exist] = await Promise.all([
            this.userUtil.checkUsernamePattern(username),
            this.userUtil.checkBadWord(username),
            this.userRepository.existByUsername(username),
        ]);
        if (checkUsername) {
            throw new BadRequestException({
                statusCode: EnumUserStatusCodeError.usernameNotAllowed,
                message: 'user.error.usernameNotAllowed',
            });
        } else if (checkBadWord) {
            throw new BadRequestException({
                statusCode: EnumUserStatusCodeError.usernameContainBadWord,
                message: 'user.error.usernameContainBadWord',
            });
        } else if (exist) {
            throw new ConflictException({
                statusCode: EnumUserStatusCodeError.usernameExist,
                message: 'user.error.usernameExist',
            });
        }

        try {
            await this.userRepository.claimUsername(
                userId,
                { username },
                requestLog
            );

            return;
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async uploadPhotoProfile(
        userId: string,
        file: IFile,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>> {
        try {
            const extension: EnumFileExtensionImage =
                this.fileService.extractExtensionFromFilename(
                    file.originalname
                ) as EnumFileExtensionImage;

            const key: string =
                this.userUtil.createRandomFilenamePhotoProfileWithPath(userId, {
                    extension,
                });

            const aws: AwsS3Dto = await this.awsS3Service.putItem({
                key,
                size: file.size,
                file: file.buffer,
            });

            await this.userRepository.updatePhotoProfile(
                userId,
                aws,
                requestLog
            );

            return;
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async updatePasswordByAdmin(
        userId: string,
        requestLog: IRequestLog,
        updatedBy: string
    ): Promise<IResponseReturn<void>> {
        const user = await this.userRepository.findOneById(userId);
        if (!user) {
            throw new NotFoundException({
                statusCode: EnumUserStatusCodeError.notFound,
                message: 'user.error.notFound',
            });
        } else if (user.status === EnumUserStatus.blocked) {
            throw new BadRequestException({
                statusCode: EnumUserStatusCodeError.statusInvalid,
                message: 'user.error.statusInvalid',
                messageProperties: {
                    status: user.status.toLowerCase(),
                },
            });
        }

        try {
            const passwordString = this.authUtil.createPasswordRandom();
            const password = this.authUtil.createPassword(passwordString, {
                temporary: true,
            });

            const sessions = await this.sessionRepository.findActive(userId);
            const [updated] = await Promise.all([
                this.userRepository.updatePasswordByAdmin(
                    userId,
                    password,
                    requestLog,
                    updatedBy
                ),
                this.sessionUtil.deleteAllLogins(userId, sessions),
            ]);

            // @note: send email after all creation
            await this.notificationUtil.sendTemporaryPasswordByAdmin(
                updated.id,
                {
                    password: passwordString,
                    passwordCreatedAt: password.passwordCreated.toISOString(),
                    passwordExpiredAt: password.passwordExpired.toISOString(),
                },
                updatedBy
            );

            return {
                metadataActivityLog:
                    this.userUtil.mapActivityLogMetadata(updated),
            };
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async changePassword(
        user: IUser,
        {
            newPassword,
            oldPassword,
            backupCode,
            code,
            method,
        }: UserChangePasswordRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>> {
        if (this.authUtil.checkPasswordAttempt(user)) {
            throw new ForbiddenException({
                statusCode: EnumUserStatusCodeError.passwordAttemptMax,
                message: 'auth.error.passwordAttemptMax',
            });
        } else if (
            !this.authUtil.validatePassword(oldPassword, user.password)
        ) {
            await this.userRepository.increasePasswordAttempt(user.id);

            throw new BadRequestException({
                statusCode: EnumUserStatusCodeError.passwordNotMatch,
                message: 'auth.error.passwordNotMatch',
            });
        }

        await this.userRepository.resetPasswordAttempt(user.id);

        const passwordHistories =
            await this.passwordHistoryRepository.findActiveUser(user.id);
        const passwordCheck = this.userUtil.checkPasswordPeriod(
            passwordHistories,
            newPassword
        );
        if (passwordCheck) {
            throw new BadRequestException({
                statusCode: EnumUserStatusCodeError.passwordMustNew,
                message: 'auth.error.passwordMustNew',
                messageProperties: {
                    period: this.helperService.dateFormatToRFC2822(
                        passwordCheck.expiredAt
                    ),
                },
            });
        }

        let twoFactorVerified: IAuthTwoFactorVerifyResult | undefined;
        if (user.twoFactor.enabled) {
            twoFactorVerified = await this.handleTwoFactorValidation(user, {
                code,
                backupCode,
                method,
            });
        }

        try {
            const sessions = await this.sessionRepository.findActive(user.id);
            const password = this.authUtil.createPassword(newPassword);

            await Promise.all([
                this.userRepository.changePassword(
                    user.id,
                    password,
                    requestLog
                ),
                this.sessionUtil.deleteAllLogins(user.id, sessions),
                twoFactorVerified
                    ? this.userRepository.verifyTwoFactor(
                          user.id,
                          twoFactorVerified,
                          requestLog
                      )
                    : Promise.resolve(),
            ]);

            // @note: send email after all creation
            await this.notificationUtil.sendChangePassword(user.id);

            return;
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async loginCredential(
        { email, password, from, device }: UserLoginRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<UserLoginResponseDto>> {
        const user = await this.userRepository.findOneWithRoleByEmail(email);
        if (!user) {
            throw new NotFoundException({
                statusCode: EnumUserStatusCodeError.notFound,
                message: 'user.error.notFound',
            });
        } else if (user.status !== EnumUserStatus.active) {
            throw new ForbiddenException({
                statusCode: EnumUserStatusCodeError.inactiveForbidden,
                message: 'user.error.inactive',
            });
        } else if (!user.password) {
            throw new BadRequestException({
                statusCode: EnumUserStatusCodeError.passwordNotSet,
                message: 'auth.error.passwordNotSet',
            });
        }

        if (this.authUtil.checkPasswordAttempt(user)) {
            await this.userRepository.reachMaxPasswordAttempt(
                user.id,
                requestLog
            );

            throw new ForbiddenException({
                statusCode: EnumUserStatusCodeError.passwordAttemptMax,
                message: 'auth.error.passwordAttemptMax',
            });
        } else if (!this.authUtil.validatePassword(password, user.password)) {
            await this.userRepository.increasePasswordAttempt(user.id);

            throw new BadRequestException({
                statusCode: EnumUserStatusCodeError.passwordNotMatch,
                message: 'auth.error.passwordNotMatch',
            });
        }

        await this.userRepository.resetPasswordAttempt(user.id);

        const checkPasswordExpired: boolean =
            this.authUtil.checkPasswordExpired(user.passwordExpired);
        if (checkPasswordExpired) {
            throw new ForbiddenException({
                statusCode: EnumUserStatusCodeError.passwordExpired,
                message: 'auth.error.passwordExpired',
            });
        } else if (!user.isVerified) {
            throw new ForbiddenException({
                statusCode: EnumUserStatusCodeError.emailNotVerified,
                message: 'user.error.emailNotVerified',
            });
        }

        return this.handleLogin(
            user,
            from,
            EnumUserLoginWith.credential,
            device,
            requestLog
        );
    }

    async loginWithSocial(
        email: string,
        loginWith: EnumUserLoginWith,
        { from, device, ...others }: UserCreateSocialRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<UserLoginResponseDto>> {
        const featureFlag =
            await this.featureFlagUtil.getMetadataByKeyAndCache<{
                signUpAllowed: boolean;
            }>(
                loginWith === EnumUserLoginWith.socialGoogle
                    ? 'loginWithGoogle'
                    : 'loginWithApple'
            );
        let user = await this.userRepository.findOneWithRoleByEmail(email);

        if (!user && featureFlag.signUpAllowed) {
            const role = await this.roleRepository.existByName(
                this.userRoleName
            );
            if (!role) {
                throw new NotFoundException({
                    statusCode: EnumRoleStatusCodeError.notFound,
                    message: 'role.error.notFound',
                });
            }

            const randomUsername = this.userUtil.createRandomUsername();
            user = await this.userRepository.createBySocial(
                email,
                randomUsername,
                role.id,
                loginWith,
                { from, device, ...others },
                requestLog
            );

            // @note: send email after all creation
            await this.notificationUtil.sendWelcomeSocial(user.id);
        }

        if (user.status !== EnumUserStatus.active) {
            throw new ForbiddenException({
                statusCode: EnumUserStatusCodeError.inactiveForbidden,
                message: 'user.error.inactive',
            });
        }

        const promises = [];
        if (!user.isVerified) {
            promises.push(this.userRepository.verify(user.id, requestLog));
        }

        if (promises.length > 0) {
            await Promise.all(promises);
        }

        return this.handleLogin(user, from, loginWith, device, requestLog);
    }

    async refresh(
        user: IUser,
        refreshToken: string,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<AuthTokenResponseDto>> {
        const {
            sessionId,
            userId,
            jti: oldJti,
            loginFrom,
            loginWith,
        } = this.authUtil.payloadToken<IAuthJwtRefreshTokenPayload>(
            refreshToken
        );

        const session = await this.sessionUtil.getLogin(userId, sessionId);
        if (session.jti !== oldJti) {
            throw new UnauthorizedException({
                statusCode: EnumAuthStatusCodeError.jwtRefreshTokenInvalid,
                message: 'auth.error.refreshTokenInvalid',
            });
        }

        try {
            const {
                jti: newJti,
                tokens,
                expiredInMs,
            } = this.authUtil.refreshToken(user, refreshToken);

            await Promise.all([
                this.sessionUtil.updateLogin(
                    userId,
                    sessionId,
                    session,
                    newJti,
                    expiredInMs
                ),
                this.userRepository.refresh(
                    userId,
                    {
                        sessionId,
                        jti: newJti,
                        expiredAt: session.expiredAt,
                        loginFrom: loginFrom,
                        loginWith: loginWith,
                    },
                    requestLog
                ),
            ]);

            return {
                data: tokens,
            };
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async signUp(
        {
            countryId,
            email,
            password: passwordString,
            ...others
        }: UserSignUpRequestDto,
        requestLog: IRequestLog
    ): Promise<void> {
        const [role, emailExist, checkCountry] = await Promise.all([
            this.roleRepository.existByName(this.userRoleName),
            this.userRepository.existByEmail(email),
            this.countryRepository.existById(countryId),
        ]);
        if (!role) {
            throw new NotFoundException({
                statusCode: EnumRoleStatusCodeError.notFound,
                message: 'role.error.notFound',
            });
        } else if (!checkCountry) {
            throw new NotFoundException({
                statusCode: EnumCountryStatusCodeError.notFound,
                message: 'country.error.notFound',
            });
        } else if (emailExist) {
            throw new ConflictException({
                statusCode: EnumUserStatusCodeError.emailExist,
                message: 'user.error.emailExist',
            });
        }

        try {
            const password = this.authUtil.createPassword(passwordString);
            const randomUsername = this.userUtil.createRandomUsername();
            const emailVerification =
                this.userUtil.verificationCreateVerification(
                    EnumVerificationType.email
                );

            const created = await this.userRepository.signUp(
                randomUsername,
                role.id,
                {
                    countryId,
                    email,
                    password: passwordString,
                    ...others,
                },
                password,
                emailVerification,
                requestLog
            );

            // @note: send email after all creation
            await this.notificationUtil.sendWelcome(created.id, {
                expiredAt: emailVerification.expiredAt.toISOString(),
                reference: emailVerification.reference,
                link: emailVerification.link,
                expiredInMinutes: emailVerification.expiredInMinutes,
            });
            return;
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async verifyEmail(
        { token }: UserVerifyEmailRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>> {
        const verification =
            await this.userRepository.findOneActiveByVerificationEmailToken(
                token
            );
        if (!verification) {
            throw new BadRequestException({
                statusCode: EnumUserStatusCodeError.tokenInvalid,
                message: 'user.error.verificationTokenInvalid',
            });
        }

        try {
            await this.userRepository.verifyEmail(
                verification.id,
                verification.userId,
                requestLog
            );

            // @note: send email after all creation
            await this.notificationUtil.sendVerifiedEmail(verification.userId, {
                reference: verification.reference,
            });

            return;
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async sendVerificationEmail(
        { email }: UserSendEmailVerificationRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>> {
        const user = await this.userRepository.findOneActiveByEmail(email);
        if (!user) {
            throw new NotFoundException({
                statusCode: EnumUserStatusCodeError.notFound,
                message: 'user.error.notFound',
            });
        } else if (user.isVerified) {
            throw new BadRequestException({
                statusCode: EnumUserStatusCodeError.emailAlreadyVerified,
                message: 'user.error.emailAlreadyVerified',
            });
        }

        const lastVerification =
            await this.userRepository.findOneLatestByVerificationEmail(user.id);
        if (lastVerification) {
            const today = this.helperService.dateCreate();
            const canResendAt = this.helperService.dateForward(
                lastVerification.createdAt,
                Duration.fromObject({
                    minutes: this.userUtil.verificationExpiredInMinutes,
                })
            );

            if (today < canResendAt) {
                throw new BadRequestException({
                    statusCode:
                        EnumUserStatusCodeError.verificationEmailResendLimitExceeded,
                    message: 'user.error.verificationEmailResendLimitExceeded',
                    messageProperties: {
                        resendIn: this.helperService.dateDiff(
                            today,
                            canResendAt
                        ).minutes,
                    },
                });
            }
        }

        try {
            const emailVerification =
                this.userUtil.verificationCreateVerification(
                    EnumVerificationType.email
                );

            await this.userRepository.requestVerificationEmail(
                user.id,
                user.email,
                emailVerification,
                requestLog
            );

            await this.notificationUtil.sendWelcome(user.id, {
                expiredAt: emailVerification.expiredAt.toISOString(),
                reference: emailVerification.reference,
                link: emailVerification.link,
                expiredInMinutes: emailVerification.expiredInMinutes,
            });

            return;
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async forgotPassword(
        { email }: UserForgotPasswordRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>> {
        const user = await this.userRepository.findOneActiveByEmail(email);
        if (!user) {
            throw new NotFoundException({
                statusCode: EnumUserStatusCodeError.notFound,
                message: 'user.error.notFound',
            });
        }

        const lastForgotPassword =
            await this.userRepository.findOneLatestByForgotPassword(user.id);
        if (lastForgotPassword) {
            const today = this.helperService.dateCreate();
            const canResendAt = this.helperService.dateForward(
                lastForgotPassword.createdAt,
                Duration.fromObject({
                    minutes: this.userUtil.forgotResendInMinutes,
                })
            );

            if (today < canResendAt) {
                throw new BadRequestException({
                    statusCode:
                        EnumUserStatusCodeError.forgotPasswordRequestLimitExceeded,
                    message: 'user.error.forgotPasswordRequestLimitExceeded',
                    messageProperties: {
                        resendIn: this.helperService.dateDiff(
                            today,
                            canResendAt
                        ).minutes,
                    },
                });
            }
        }

        try {
            const resetPassword = this.userUtil.forgotPasswordCreate();

            await this.userRepository.forgotPassword(
                user.id,
                email,
                resetPassword,
                requestLog
            );

            await this.notificationUtil.sendForgotPassword(user.id, {
                expiredAt: resetPassword.expiredAt.toISOString(),
                link: resetPassword.link,
                reference: resetPassword.reference,
                expiredInMinutes: resetPassword.expiredInMinutes,
                resendInMinutes: resetPassword.resendInMinutes,
            });

            return;
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async resetPassword(
        {
            newPassword,
            token,
            backupCode,
            code,
            method,
        }: UserForgotPasswordResetRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>> {
        const resetPassword =
            await this.userRepository.findOneActiveByForgotPasswordToken(token);
        if (!resetPassword) {
            throw new NotFoundException({
                statusCode: EnumUserStatusCodeError.notFound,
                message: 'user.error.notFound',
            });
        }

        const passwordHistories =
            await this.passwordHistoryRepository.findActiveUser(
                resetPassword.userId
            );
        const passwordCheck = this.userUtil.checkPasswordPeriod(
            passwordHistories,
            newPassword
        );
        if (passwordCheck) {
            throw new BadRequestException({
                statusCode: EnumUserStatusCodeError.passwordMustNew,
                message: 'auth.error.passwordMustNew',
                messageProperties: {
                    period: this.helperService.dateFormatToRFC2822(
                        passwordCheck.expiredAt
                    ),
                },
            });
        }

        let twoFactorVerified: IAuthTwoFactorVerifyResult | undefined;
        if (resetPassword.user.twoFactor.enabled) {
            twoFactorVerified = await this.handleTwoFactorValidation(
                resetPassword.user,
                {
                    code,
                    backupCode,
                    method,
                }
            );
        }

        try {
            const sessions = await this.sessionRepository.findActive(
                resetPassword.userId
            );
            const password = this.authUtil.createPassword(newPassword);

            await Promise.all([
                this.userRepository.resetPassword(
                    resetPassword.userId,
                    resetPassword.id,
                    password,
                    requestLog
                ),
                this.sessionUtil.deleteAllLogins(
                    resetPassword.userId,
                    sessions
                ),
                twoFactorVerified
                    ? this.userRepository.verifyTwoFactor(
                          resetPassword.userId,
                          twoFactorVerified,
                          requestLog
                      )
                    : Promise.resolve(),
            ]);

            // @note: send email after all creation
            await this.notificationUtil.sendResetPassword(resetPassword.userId);

            return;
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    private async createTokenAndSession(
        user: IUser,
        loginFrom: EnumUserLoginFrom,
        loginWith: EnumUserLoginWith,
        device: DeviceDto,
        requestLog: IRequestLog
    ): Promise<AuthTokenResponseDto> {
        const [{ tokens, sessionId, jti }, existDevice] = await Promise.all([
            this.authUtil.createTokens(user, loginFrom, loginWith),
            this.deviceRepository.exist(user.id, device.fingerprint),
        ]);
        const loginAt = this.helperService.dateCreate();
        const expiredAt = this.helperService.dateForward(
            loginAt,
            Duration.fromObject({
                seconds: this.authUtil.jwtRefreshTokenExpirationTimeInSeconds,
            })
        );

        const promises = [
            this.sessionUtil.setLogin(user.id, sessionId, jti, expiredAt),
            this.userRepository.login(
                user.id,
                {
                    loginFrom,
                    loginWith,
                    jti,
                    sessionId,
                    expiredAt,
                },
                device,
                requestLog
            ),
        ];

        if (!existDevice) {
            promises.push(
                this.notificationUtil.sendNewDeviceLogin(user.id, {
                    loginFrom,
                    loginWith,
                    loginAt,
                    requestLog,
                } as INotificationNewDeviceLoginPayload)
            );
        }

        await Promise.all(promises);

        return tokens;
    }

    private async handleLogin(
        user: IUser,
        loginFrom: EnumUserLoginFrom,
        loginWith: EnumUserLoginWith,
        device: DeviceDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<UserLoginResponseDto>> {
        if (!user.twoFactor.enabled) {
            const tokens = await this.createTokenAndSession(
                user,
                loginFrom,
                loginWith,
                device,
                requestLog
            );

            return {
                data: {
                    isTwoFactorEnable: false,
                    tokens,
                },
            };
        }

        const { challengeToken, expiresInMs } =
            await this.authTwoFactorUtil.createChallenge({
                userId: user.id,
                loginFrom,
                loginWith,
            });
        if (user.twoFactor.requiredSetup) {
            const { encryptedSecret, otpauthUrl, secret, iv } =
                await this.authTwoFactorUtil.setupTwoFactor(user.email);
            await this.userRepository.setupTwoFactor(
                user.id,
                encryptedSecret,
                iv,
                requestLog
            );

            return {
                data: {
                    isTwoFactorEnable: true,
                    twoFactor: {
                        isRequiredSetup: true,
                        challengeToken,
                        challengeExpiresInMs: expiresInMs,
                        backupCodesRemaining:
                            user.twoFactor.backupCodes.length ?? 0,
                        otpauthUrl,
                        secret,
                    },
                },
            };
        }

        return {
            data: {
                isTwoFactorEnable: true,
                twoFactor: {
                    isRequiredSetup: false,
                    challengeToken,
                    challengeExpiresInMs: expiresInMs,
                    backupCodesRemaining:
                        user.twoFactor.backupCodes.length ?? 0,
                },
            },
        };
    }

    private async handleTwoFactorValidation(
        user: IUser,
        { method, code, backupCode }: IAuthTwoFactorVerify
    ): Promise<IAuthTwoFactorVerifyResult> {
        const retryAfterMs =
            await this.authTwoFactorUtil.getLockTwoFactorAttempt(user);
        if (retryAfterMs > 0) {
            throw new RequestTooManyException({
                statusCode:
                    EnumAuthStatusCodeError.twoFactorAttemptTemporaryLock,
                message: 'auth.error.twoFactorAttemptTemporaryLock',
                messageProperties: {
                    retryAfterSeconds: retryAfterMs / 1000,
                },
            });
        }

        const verified = await this.authTwoFactorUtil.verifyTwoFactor(
            user.twoFactor,
            {
                method,
                code,
                backupCode,
            }
        );
        if (!verified.isValid) {
            await this.userRepository.increaseTwoFactorAttempt(user.id);

            if (this.authTwoFactorUtil.checkAttempt(user)) {
                await this.authTwoFactorUtil.lockTwoFactorAttempt(user);
            }

            throw new UnauthorizedException({
                statusCode: EnumAuthStatusCodeError.twoFactorInvalid,
                message: 'auth.error.twoFactorInvalid',
            });
        }

        await this.userRepository.resetTwoFactorAttempt(user.id);

        return verified;
    }

    async loginVerifyTwoFactor(
        {
            challengeToken,
            code,
            backupCode,
            method,
            device,
        }: UserLoginVerifyTwoFactorRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<AuthTokenResponseDto>> {
        const challenge =
            await this.authTwoFactorUtil.getChallenge(challengeToken);
        if (!challenge) {
            throw new UnauthorizedException({
                statusCode: EnumAuthStatusCodeError.twoFactorChallengeInvalid,
                message: 'auth.error.twoFactorChallengeInvalid',
            });
        }

        const user = await this.userRepository.findOneWithRoleById(
            challenge.userId
        );
        if (!user) {
            throw new NotFoundException({
                statusCode: EnumUserStatusCodeError.notFound,
                message: 'user.error.notFound',
            });
        } else if (user.status !== EnumUserStatus.active) {
            throw new ForbiddenException({
                statusCode: EnumUserStatusCodeError.inactiveForbidden,
                message: 'user.error.inactive',
            });
        } else if (!user.isVerified) {
            throw new ForbiddenException({
                statusCode: EnumUserStatusCodeError.emailNotVerified,
                message: 'user.error.emailNotVerified',
            });
        } else if (!user.twoFactor.enabled) {
            throw new BadRequestException({
                statusCode: EnumAuthStatusCodeError.twoFactorNotEnabled,
                message: 'auth.error.twoFactorNotEnabled',
            });
        } else if (user.twoFactor.requiredSetup) {
            throw new BadRequestException({
                statusCode: EnumAuthStatusCodeError.twoFactorRequiredSetup,
                message: 'auth.error.twoFactorRequiredSetup',
            });
        }

        const twoFactorVerified = await this.handleTwoFactorValidation(user, {
            method,
            code,
            backupCode,
        });

        try {
            const [tokens] = await Promise.all([
                this.createTokenAndSession(
                    user,
                    challenge.loginFrom,
                    challenge.loginWith,
                    device,
                    requestLog
                ),
                this.authTwoFactorUtil.clearChallenge(challengeToken),
                this.userRepository.verifyTwoFactor(
                    user.id,
                    twoFactorVerified,
                    requestLog
                ),
            ]);

            return {
                data: tokens,
            };
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async loginSetupTwoFactor(
        { code, challengeToken }: UserLoginSetupTwoFactorRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<UserTwoFactorEnableResponseDto>> {
        const challenge =
            await this.authTwoFactorUtil.getChallenge(challengeToken);
        if (!challenge) {
            throw new UnauthorizedException({
                statusCode: EnumAuthStatusCodeError.twoFactorChallengeInvalid,
                message: 'auth.error.twoFactorChallengeInvalid',
            });
        }

        const user = await this.userRepository.findOneWithRoleById(
            challenge.userId
        );
        if (!user) {
            throw new NotFoundException({
                statusCode: EnumUserStatusCodeError.notFound,
                message: 'user.error.notFound',
            });
        } else if (user.status !== EnumUserStatus.active) {
            throw new ForbiddenException({
                statusCode: EnumUserStatusCodeError.inactiveForbidden,
                message: 'user.error.inactive',
            });
        } else if (!user.isVerified) {
            throw new ForbiddenException({
                statusCode: EnumUserStatusCodeError.emailNotVerified,
                message: 'user.error.emailNotVerified',
            });
        } else if (!user.twoFactor.enabled) {
            throw new BadRequestException({
                statusCode: EnumAuthStatusCodeError.twoFactorNotEnabled,
                message: 'auth.error.twoFactorNotEnabled',
            });
        } else if (!user.twoFactor.requiredSetup) {
            throw new BadRequestException({
                statusCode: EnumAuthStatusCodeError.twoFactorNotRequiredSetup,
                message: 'auth.error.twoFactorNotRequiredSetup',
            });
        }

        await this.handleTwoFactorValidation(user, {
            method: EnumAuthTwoFactorMethod.code,
            code,
        });

        try {
            const backupCodes = this.authTwoFactorUtil.generateBackupCodes();
            await this.userRepository.enableTwoFactor(
                user.id,
                backupCodes.hashes,
                requestLog
            );

            return {
                data: {
                    backupCodes: backupCodes.codes,
                },
            };
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async getTwoFactorStatus(
        user: IUser
    ): Promise<IResponseReturn<UserTwoFactorStatusResponseDto>> {
        return {
            data: this.userUtil.mapTwoFactor(user.twoFactor),
        };
    }

    async setupTwoFactor(
        user: IUser,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<UserTwoFactorSetupResponseDto>> {
        if (user.twoFactor.enabled) {
            throw new BadRequestException({
                statusCode: EnumAuthStatusCodeError.twoFactorAlreadyEnabled,
                message: 'auth.error.twoFactorAlreadyEnabled',
            });
        }

        try {
            const { encryptedSecret, otpauthUrl, secret, iv } =
                await this.authTwoFactorUtil.setupTwoFactor(user.email);
            await this.userRepository.setupTwoFactor(
                user.id,
                encryptedSecret,
                iv,
                requestLog
            );

            return {
                data: {
                    secret,
                    otpauthUrl,
                },
            };
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async enableTwoFactor(
        user: IUser,
        { code }: UserTwoFactorEnableRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<UserTwoFactorEnableResponseDto>> {
        if (user.twoFactor.enabled) {
            throw new BadRequestException({
                statusCode: EnumAuthStatusCodeError.twoFactorAlreadyEnabled,
                message: 'auth.error.twoFactorAlreadyEnabled',
            });
        } else if (!user.twoFactor.iv || !user.twoFactor.secret) {
            throw new BadRequestException({
                statusCode: EnumAuthStatusCodeError.twoFactorNotEnabled,
                message: 'auth.error.twoFactorSetupRequired',
            });
        }

        const secret = this.authTwoFactorUtil.decryptSecret(
            user.twoFactor.secret,
            user.twoFactor.iv
        );
        const isValidCode = this.authTwoFactorUtil.verifyCode(secret, code);
        if (!isValidCode) {
            throw new UnauthorizedException({
                statusCode: EnumAuthStatusCodeError.twoFactorInvalid,
                message: 'auth.error.twoFactorInvalid',
            });
        }

        try {
            const backupCodes = this.authTwoFactorUtil.generateBackupCodes();
            await this.userRepository.enableTwoFactor(
                user.id,
                backupCodes.hashes,
                requestLog
            );

            return {
                data: {
                    backupCodes: backupCodes.codes,
                },
            };
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async disableTwoFactor(
        user: IUser,
        { code, backupCode, method }: UserTwoFactorDisableRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>> {
        if (!user.twoFactor.enabled) {
            throw new BadRequestException({
                statusCode: EnumAuthStatusCodeError.twoFactorNotEnabled,
                message: 'auth.error.twoFactorNotEnabled',
            });
        }

        const verified = await this.authTwoFactorUtil.verifyTwoFactor(
            user.twoFactor,
            {
                method,
                code,
                backupCode,
            }
        );
        if (!verified.isValid) {
            await this.userRepository.increaseTwoFactorAttempt(user.id);

            throw new UnauthorizedException({
                statusCode: EnumAuthStatusCodeError.twoFactorInvalid,
                message: 'auth.error.twoFactorInvalid',
            });
        }

        try {
            await this.userRepository.disableTwoFactor(user.id, requestLog);

            return;
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async regenerateTwoFactorBackupCodes(
        user: IUser,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<UserTwoFactorEnableResponseDto>> {
        if (!user.twoFactor.enabled) {
            throw new BadRequestException({
                statusCode: EnumAuthStatusCodeError.twoFactorNotEnabled,
                message: 'auth.error.twoFactorNotEnabled',
            });
        }

        try {
            const backupCodes = this.authTwoFactorUtil.generateBackupCodes();
            await this.userRepository.regenerateTwoFactorBackupCodes(
                user.id,
                backupCodes.hashes,
                requestLog
            );

            return {
                data: {
                    backupCodes: backupCodes.codes,
                },
            };
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async resetTwoFactorByAdmin(
        userId: string,
        updatedBy: string,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>> {
        const user = await this.userRepository.findOneWithRoleById(userId);
        if (!user) {
            throw new NotFoundException({
                statusCode: EnumUserStatusCodeError.notFound,
                message: 'user.error.notFound',
            });
        } else if (user.status === EnumUserStatus.blocked) {
            throw new BadRequestException({
                statusCode: EnumUserStatusCodeError.statusInvalid,
                message: 'user.error.statusInvalid',
                messageProperties: {
                    status: user.status.toLowerCase(),
                },
            });
        } else if (!user.twoFactor.enabled) {
            throw new BadRequestException({
                statusCode: EnumAuthStatusCodeError.twoFactorNotEnabled,
                message: 'auth.error.twoFactorNotEnabled',
            });
        }

        try {
            const sessions = await this.sessionRepository.findActive(userId);

            await Promise.all([
                this.userRepository.resetTwoFactorByAdmin(
                    userId,
                    updatedBy,
                    requestLog
                ),
                this.sessionUtil.deleteAllLogins(userId, sessions),
            ]);

            // @note: send email after all creation
            await this.notificationUtil.sendResetTwoFactorByAdmin(
                user.id,
                updatedBy
            );

            return;
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async importByAdmin(
        data: UserImportRequestDto[],
        createdBy: string,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>> {
        // TODO: Optimize by doing
        // - in background job with bullmq, also before create check username uniqueness
        // - when upload file, upload using presign
        // - load data from s3, and not process all in one time
        // - think about how to show progress status to user with bullmq

        const emails = data.map(item => item.email);
        const [checkRole, checkCountry, existingUsers] = await Promise.all([
            this.roleRepository.existByName(this.userRoleName),
            this.countryRepository.existByAlpha2Code(this.userCountryName),
            this.userRepository.findByEmails(emails),
        ]);

        if (existingUsers.length > 0) {
            throw new ConflictException({
                statusCode: EnumUserStatusCodeError.emailExist,
                message: 'user.error.importEmailExist',
                messageProperties: {
                    emails: existingUsers.map(user => user.email).join(', '),
                },
            });
        } else if (!checkRole) {
            throw new NotFoundException({
                statusCode: EnumRoleStatusCodeError.notFound,
                message: 'role.error.notFound',
            });
        } else if (!checkCountry) {
            throw new NotFoundException({
                statusCode: EnumCountryStatusCodeError.notFound,
                message: 'country.error.notFound',
            });
        }

        try {
            const totalData = data.length;
            const usernames = Array(totalData)
                .fill(0)
                .map(() => this.userUtil.createRandomUsername());
            const passwords = Array(totalData)
                .fill(0)
                .map(() => this.authUtil.createPasswordRandom());
            const passwordHasheds = passwords.map(e =>
                this.authUtil.createPassword(e)
            );

            const newUsers = await this.userRepository.importByAdmin(
                data,
                usernames,
                passwordHasheds,
                checkCountry.id,
                checkRole,
                requestLog,
                createdBy
            );

            // @note: send email after all creation
            const sendEmailPromises = [];
            for (const [index, newUser] of newUsers.entries()) {
                sendEmailPromises.push(
                    this.notificationUtil.sendWelcomeByAdmin(
                        newUser.id,
                        {
                            password: passwords[index],
                            passwordCreatedAt:
                                newUser.passwordCreated.toISOString(),
                            passwordExpiredAt:
                                newUser.passwordExpired.toISOString(),
                        },
                        createdBy
                    )
                );
            }

            await Promise.all(sendEmailPromises);

            return;
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async exportByAdmin(
        status?: Record<string, IPaginationIn>,
        role?: Record<string, IPaginationEqual>,
        country?: Record<string, IPaginationEqual>
    ): Promise<IResponseFileReturn> {
        // TODO: Optimize by doing
        // - in background job with bullmq
        // - return aws s3 link
        // - think about how to show progress status to user with bullmq

        const data = await this.userRepository.findExport(
            status,
            role,
            country
        );

        const users: UserExportResponseDto[] = this.userUtil.mapExport(data);
        const csvString =
            this.fileService.writeCsv<UserExportResponseDto>(users);

        return {
            data: csvString,
            extension: EnumFileExtensionDocument.csv,
        };
    }
}
