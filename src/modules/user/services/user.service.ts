import { ENUM_APP_STATUS_CODE_ERROR } from '@app/enums/app.status-code.enum';
import { AwsS3PresignDto } from '@common/aws/dtos/aws.s3-presign.dto';
import { AwsS3Dto } from '@common/aws/dtos/aws.s3.dto';
import { AwsS3Service } from '@common/aws/services/aws.s3.service';
import { DatabaseIdDto } from '@common/database/dtos/database.id.dto';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { ENUM_FILE_EXTENSION_IMAGE } from '@common/file/enums/file.enum';
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
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { ENUM_AUTH_STATUS_CODE_ERROR } from '@modules/auth/enums/auth.status-code.enum';
import {
    IAuthJwtRefreshTokenPayload,
    IAuthPassword,
} from '@modules/auth/interfaces/auth.interface';
import { AuthUtil } from '@modules/auth/utils/auth.util';
import { ENUM_COUNTRY_STATUS_CODE_ERROR } from '@modules/country/enums/country.status-code.enum';
import { CountryRepository } from '@modules/country/repositories/country.repository';
import { EmailService } from '@modules/email/services/email.service';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { PasswordHistoryRepository } from '@modules/password-history/repositories/password-history.repository';
import { ENUM_ROLE_STATUS_CODE_ERROR } from '@modules/role/enums/role.status-code.enum';
import { RoleRepository } from '@modules/role/repositories/role.repository';
import { ENUM_SESSION_STATUS_CODE_ERROR } from '@modules/session/enums/session.status-code.enum';
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
import { ENUM_USER_STATUS_CODE_ERROR } from '@modules/user/enums/user.status-code.enum';
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
    ENUM_ROLE_TYPE,
    ENUM_USER_LOGIN_WITH,
    ENUM_USER_STATUS,
    ENUM_VERIFICATION_TYPE,
} from '@prisma/client';
import { Duration } from 'luxon';

@Injectable()
export class UserService implements IUserService {
    private readonly userRoleName: string = 'user';

    constructor(
        private readonly userUtil: UserUtil,
        private readonly userRepository: UserRepository,
        private readonly countryRepository: CountryRepository,
        private readonly roleRepository: RoleRepository,
        private readonly passwordHistoryRepository: PasswordHistoryRepository,
        private readonly awsS3Service: AwsS3Service,
        private readonly helperService: HelperService,
        private readonly fileService: FileService,
        private readonly authUtil: AuthUtil,
        private readonly databaseUtil: DatabaseUtil,
        private readonly sessionUtil: SessionUtil,
        private readonly sessionRepository: SessionRepository,
        private readonly featureFlagService: FeatureFlagService,
        private readonly emailService: EmailService
    ) {}

    async validateUserGuard(
        request: IRequestApp,
        requiredVerified: boolean
    ): Promise<IUser> {
        if (!request.user) {
            throw new UnauthorizedException({
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.JWT_ACCESS_TOKEN,
                message: 'auth.error.accessTokenUnauthorized',
            });
        }

        const { userId } = request.user;
        const user = await this.userRepository.findOneWithRoleById(userId);
        if (!user) {
            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'user.error.notFound',
            });
        } else if (user.status !== ENUM_USER_STATUS.active) {
            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.INACTIVE_FORBIDDEN,
                message: 'user.error.inactive',
            });
        }

        const checkPasswordExpired: boolean =
            this.authUtil.checkPasswordExpired(user.passwordExpired);
        if (checkPasswordExpired) {
            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.PASSWORD_EXPIRED,
                message: 'auth.error.passwordExpired',
            });
        } else if (requiredVerified === true && user.isVerified !== true) {
            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.EMAIL_NOT_VERIFIED,
                message: 'user.error.emailNotVerified',
            });
        }

        return user;
    }

    async getListOffset(
        pagination: IPaginationQueryOffsetParams,
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

    async getListActiveCursor(
        pagination: IPaginationQueryCursorParams,
        status?: Record<string, IPaginationIn>,
        role?: Record<string, IPaginationEqual>,
        country?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<UserListResponseDto>> {
        const { data, ...others } =
            await this.userRepository.findActiveWithPaginationCursor(
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
                statusCode: ENUM_USER_STATUS_CODE_ERROR.NOT_FOUND,
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
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'role.error.notFound',
            });
        } else if (!checkCountry) {
            throw new NotFoundException({
                statusCode: ENUM_COUNTRY_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'country.error.notFound',
            });
        } else if (emailExist) {
            throw new ConflictException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.EMAIL_EXIST,
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
            const emailVerification =
                this.userUtil.verificationCreateVerification(
                    ENUM_VERIFICATION_TYPE.email
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
                emailVerification,
                checkRole,
                requestLog,
                createdBy
            );

            // @note: send email after all creation
            await Promise.all([
                this.emailService.sendWelcomeByAdmin(
                    created.id,
                    {
                        email,
                        username: randomUsername,
                    },
                    {
                        password: passwordString,
                        passwordCreatedAt: password.passwordCreated,
                        passwordExpiredAt: password.passwordExpired,
                    }
                ),
                checkRole.type !== ENUM_ROLE_TYPE.user
                    ? this.emailService.sendVerification(
                          created.id,
                          {
                              email,
                              username: created.username,
                          },
                          {
                              expiredAt: emailVerification.expiredAt,
                              reference: emailVerification.reference,
                              link: emailVerification.link,
                              expiredInMinutes:
                                  emailVerification.expiredInMinutes,
                          }
                      )
                    : Promise.resolve(),
            ]);

            return {
                data: { id: created.id },
                metadataActivityLog:
                    this.userUtil.mapActivityLogMetadata(created),
            };
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
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
                statusCode: ENUM_USER_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'user.error.notFound',
            });
        } else if (user.status === ENUM_USER_STATUS.blocked) {
            throw new BadRequestException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.STATUS_INVALID,
                message: 'user.error.statusInvalid',
                _metadata: {
                    customProperty: {
                        messageProperties: {
                            status: user.status.toLowerCase(),
                        },
                    },
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
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
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
                statusCode: ENUM_COUNTRY_STATUS_CODE_ERROR.NOT_FOUND,
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
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
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
        { photo, size }: UserUpdateProfilePhotoRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>> {
        try {
            const aws: AwsS3Dto = this.awsS3Service.mapPresign({
                key: photo,
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
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
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
            const sessions = await this.sessionRepository.findAllByUser(userId);
            await Promise.all([
                this.userRepository.deleteSelf(userId, requestLog),
                this.sessionUtil.deleteAllLogins(userId, sessions),
            ]);

            return;
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async addMobileNumber(
        userId: string,
        { number, countryId, phoneCode }: UserAddMobileNumberRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<DatabaseIdDto>> {
        const checkCountry =
            await this.countryRepository.findOneById(countryId);
        if (!checkCountry) {
            throw new NotFoundException({
                statusCode: ENUM_COUNTRY_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'country.error.notFound',
            });
        }

        const checkValidMobileNumber = this.userUtil.checkMobileNumber(
            checkCountry.phoneCode,
            phoneCode
        );
        if (!checkValidMobileNumber) {
            throw new BadRequestException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.MOBILE_NUMBER_INVALID,
                message: 'user.error.mobileNumberInvalid',
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
                userId,
                requestLog
            );

            return {
                data: {
                    id: updated.id,
                },
            };
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
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
    ): Promise<IResponseReturn<void>> {
        const [checkMobileNumberExist, checkCountry] = await Promise.all([
            this.userRepository.existMobileNumber(userId, mobileNumberId),
            this.countryRepository.findOneById(countryId),
        ]);
        if (!checkMobileNumberExist) {
            throw new NotFoundException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.MOBILE_NUMBER_NOT_FOUND,
                message: 'user.error.mobileNumberNotFound',
            });
        } else if (!checkCountry) {
            throw new NotFoundException({
                statusCode: ENUM_COUNTRY_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'country.error.notFound',
            });
        }

        const checkValidMobileNumber = this.userUtil.checkMobileNumber(
            checkCountry.phoneCode,
            phoneCode
        );
        if (!checkValidMobileNumber) {
            throw new BadRequestException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.MOBILE_NUMBER_INVALID,
                message: 'user.error.mobileNumberInvalid',
            });
        }

        try {
            await this.userRepository.updateMobileNumber(
                userId,
                checkMobileNumberExist,
                {
                    number,
                    countryId,
                    phoneCode,
                },
                requestLog
            );

            return;
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async deleteMobileNumber(
        userId: string,
        mobileNumberId: string,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>> {
        const checkExist = await this.userRepository.existMobileNumber(
            userId,
            mobileNumberId
        );
        if (!checkExist) {
            throw new NotFoundException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.MOBILE_NUMBER_NOT_FOUND,
                message: 'user.error.mobileNumberNotFound',
            });
        }

        try {
            await this.userRepository.deleteMobileNumber(
                userId,
                mobileNumberId,
                requestLog
            );

            return;
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
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
                statusCode: ENUM_USER_STATUS_CODE_ERROR.USERNAME_NOT_ALLOWED,
                message: 'user.error.usernameNotAllowed',
            });
        } else if (checkBadWord) {
            throw new BadRequestException({
                statusCode:
                    ENUM_USER_STATUS_CODE_ERROR.USERNAME_CONTAIN_BAD_WORD,
                message: 'user.error.usernameContainBadWord',
            });
        } else if (exist) {
            throw new ConflictException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.USERNAME_EXIST,
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
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
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
            const extension: ENUM_FILE_EXTENSION_IMAGE =
                this.fileService.extractExtensionFromFilename(
                    file.originalname
                ) as ENUM_FILE_EXTENSION_IMAGE;
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
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
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
                statusCode: ENUM_USER_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'user.error.notFound',
            });
        } else if (user.status === ENUM_USER_STATUS.blocked) {
            throw new BadRequestException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.STATUS_INVALID,
                message: 'user.error.statusInvalid',
                _metadata: {
                    customProperty: {
                        messageProperties: {
                            status: user.status.toLowerCase(),
                        },
                    },
                },
            });
        }

        try {
            const passwordString = this.authUtil.createPasswordRandom();
            const password = this.authUtil.createPassword(passwordString, {
                temporary: true,
            });

            const updated = await this.userRepository.updatePasswordByAdmin(
                userId,
                password,
                requestLog,
                updatedBy
            );

            // @note: send email after all creation
            await this.emailService.sendTemporaryPassword(
                updated.id,
                {
                    email: updated.email,
                    username: updated.username,
                },
                {
                    password: passwordString,
                    passwordCreatedAt: password.passwordCreated,
                    passwordExpiredAt: password.passwordExpired,
                }
            );

            return {
                metadataActivityLog:
                    this.userUtil.mapActivityLogMetadata(updated),
            };
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async changePassword(
        userId: string,
        { newPassword, oldPassword }: UserChangePasswordRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>> {
        const user = await this.userRepository.findOneActiveById(userId);

        if (this.authUtil.checkPasswordAttempt(user)) {
            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.PASSWORD_ATTEMPT_MAX,
                message: 'auth.error.passwordAttemptMax',
            });
        } else if (
            !this.authUtil.validatePassword(oldPassword, user.password)
        ) {
            await this.userRepository.increasePasswordAttempt(userId);

            throw new BadRequestException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.PASSWORD_NOT_MATCH,
                message: 'auth.error.passwordNotMatch',
            });
        }

        await this.userRepository.resetPasswordAttempt(userId);

        const passwordHistories =
            await this.passwordHistoryRepository.findAllActiveByUser(userId);
        const passwordCheck = this.userUtil.checkPasswordPeriod(
            passwordHistories,
            newPassword
        );
        if (passwordCheck) {
            throw new BadRequestException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.PASSWORD_MUST_NEW,
                message: 'auth.error.passwordMustNew',
                _metadata: {
                    customProperty: {
                        messageProperties: {
                            period: this.helperService.dateFormatToRFC2822(
                                passwordCheck.expiredAt
                            ),
                        },
                    },
                },
            });
        }

        try {
            const sessions = await this.sessionRepository.findAllByUser(userId);
            const password = this.authUtil.createPassword(newPassword);

            await Promise.all([
                this.userRepository.changePassword(
                    userId,
                    password,
                    requestLog
                ),
                this.sessionUtil.deleteAllLogins(userId, sessions),
            ]);

            // @note: send email after all creation
            await this.emailService.sendChangePassword(user.id, {
                email: user.email,
                username: user.username,
            });

            return;
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async loginCredential(
        { email, password, from }: UserLoginRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<UserTokenResponseDto>> {
        const user = await this.userRepository.findOneWithRoleByEmail(email);
        if (!user) {
            throw new NotFoundException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'user.error.notFound',
            });
        } else if (user.status !== ENUM_USER_STATUS.active) {
            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.INACTIVE_FORBIDDEN,
                message: 'user.error.inactive',
            });
        }

        if (!user.password) {
            throw new BadRequestException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.PASSWORD_NOT_SET,
                message: 'auth.error.passwordNotSet',
            });
        } else if (this.authUtil.checkPasswordAttempt(user)) {
            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.PASSWORD_ATTEMPT_MAX,
                message: 'auth.error.passwordAttemptMax',
            });
        } else if (!this.authUtil.validatePassword(password, user.password)) {
            await this.userRepository.increasePasswordAttempt(user.id);

            throw new BadRequestException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.PASSWORD_NOT_MATCH,
                message: 'auth.error.passwordNotMatch',
            });
        }

        await this.userRepository.resetPasswordAttempt(user.id);

        const checkPasswordExpired: boolean =
            this.authUtil.checkPasswordExpired(user.passwordExpired);
        if (checkPasswordExpired) {
            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.PASSWORD_EXPIRED,
                message: 'auth.error.passwordExpired',
            });
        } else if (!user.isVerified) {
            const emailVerification =
                this.userUtil.verificationCreateVerification(
                    ENUM_VERIFICATION_TYPE.email
                );

            await this.userRepository.requestVerificationEmail(
                user.id,
                user.email,
                emailVerification
            );

            // @note: send email after all creation
            await this.emailService.sendVerification(
                user.id,
                {
                    email: user.email,
                    username: user.username,
                },
                {
                    expiredAt: emailVerification.expiredAt,
                    reference: emailVerification.reference,
                    link: emailVerification.link,
                    expiredInMinutes: emailVerification.expiredInMinutes,
                }
            );

            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.EMAIL_NOT_VERIFIED,
                message: 'user.error.emailNotVerified',
            });
        }

        try {
            const sessionId = this.databaseUtil.createId();
            const tokens = this.authUtil.createTokens(
                user,
                sessionId,
                from,
                ENUM_USER_LOGIN_WITH.credential
            );
            const expiredAt = this.helperService.dateForward(
                this.helperService.dateCreate(),
                Duration.fromObject({
                    seconds: tokens.expiresIn,
                })
            );

            await Promise.all([
                this.sessionUtil.setLogin(user.id, sessionId, expiredAt),
                this.userRepository.updateLoginInfo(
                    user.id,
                    {
                        loginFrom: from,
                        loginWith: ENUM_USER_LOGIN_WITH.credential,
                        sessionId,
                        expiredAt,
                    },
                    requestLog
                ),
            ]);

            return {
                data: tokens,
            };
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async loginWithSocial(
        email: string,
        loginWith: ENUM_USER_LOGIN_WITH,
        { from, ...others }: UserCreateSocialRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<UserTokenResponseDto>> {
        const featureFlag =
            await this.featureFlagService.findOneMetadataByKeyAndCache<{
                signUpAllowed: boolean;
            }>(
                loginWith === ENUM_USER_LOGIN_WITH.socialGoogle
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
                    statusCode: ENUM_ROLE_STATUS_CODE_ERROR.NOT_FOUND,
                    message: 'role.error.notFound',
                });
            }

            const randomUsername = this.userUtil.createRandomUsername();
            user = await this.userRepository.createBySocial(
                email,
                randomUsername,
                role.id,
                loginWith,
                { from, ...others },
                requestLog
            );

            // @note: send email after all creation
            await this.emailService.sendWelcome(user.id, {
                email: user.email,
                username: user.username,
            });
        }

        if (user.status !== ENUM_USER_STATUS.active) {
            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.INACTIVE_FORBIDDEN,
                message: 'user.error.inactive',
            });
        }

        try {
            const promises = [];
            if (!user.isVerified) {
                promises.push(this.userRepository.verify(user.id, requestLog));
            }

            const sessionId = this.databaseUtil.createId();
            const tokens = this.authUtil.createTokens(
                user,
                sessionId,
                from,
                loginWith
            );
            const expiredAt = this.helperService.dateForward(
                this.helperService.dateCreate(),
                Duration.fromObject({
                    seconds: tokens.expiresIn,
                })
            );

            await Promise.all([
                ...promises,
                this.sessionUtil.setLogin(user.id, sessionId, expiredAt),
                this.userRepository.updateLoginInfo(
                    user.id,
                    {
                        loginFrom: from,
                        loginWith,
                        sessionId,
                        expiredAt,
                    },
                    requestLog
                ),
            ]);

            return {
                data: tokens,
            };
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async refreshToken(
        user: IUser,
        refreshToken: string
    ): Promise<IResponseReturn<UserTokenResponseDto>> {
        const { sessionId, userId } =
            this.authUtil.payloadToken<IAuthJwtRefreshTokenPayload>(
                refreshToken
            );

        const checkActive = this.sessionUtil.getLogin(userId, sessionId);
        if (!checkActive) {
            throw new UnauthorizedException({
                statusCode: ENUM_SESSION_STATUS_CODE_ERROR.FORBIDDEN,
                message: 'session.error.forbidden',
            });
        }

        try {
            const tokens = this.authUtil.refreshToken(user, refreshToken);

            return {
                data: tokens,
            };
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
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
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'role.error.notFound',
            });
        } else if (!checkCountry) {
            throw new NotFoundException({
                statusCode: ENUM_COUNTRY_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'country.error.notFound',
            });
        } else if (emailExist) {
            throw new ConflictException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.EMAIL_EXIST,
                message: 'user.error.emailExist',
            });
        }

        try {
            const password = this.authUtil.createPassword(passwordString);
            const randomUsername = this.userUtil.createRandomUsername();
            const emailVerification =
                this.userUtil.verificationCreateVerification(
                    ENUM_VERIFICATION_TYPE.email
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
            await Promise.all([
                this.emailService.sendWelcome(created.id, {
                    email: created.email,
                    username: created.username,
                }),
                this.emailService.sendVerification(
                    created.id,
                    {
                        email: created.email,
                        username: created.username,
                    },
                    {
                        expiredAt: emailVerification.expiredAt,
                        reference: emailVerification.reference,
                        link: emailVerification.link,
                        expiredInMinutes: emailVerification.expiredInMinutes,
                    }
                ),
            ]);

            return;
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
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
                statusCode: ENUM_USER_STATUS_CODE_ERROR.TOKEN_INVALID,
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
            await this.emailService.sendVerified(
                verification.user.id,
                {
                    email: verification.user.email,
                    username: verification.user.username,
                },
                {
                    reference: verification.reference,
                }
            );

            return;
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
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
                statusCode: ENUM_USER_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'user.error.notFound',
            });
        }

        try {
            const resetPassword = this.userUtil.forgotPasswordCreate();

            await this.userRepository.forgotPassword(
                user.id,
                email,
                resetPassword,
                requestLog
            );

            // @note: send email after all creation
            await this.emailService.sendForgotPassword(
                user.id,
                {
                    email: user.email,
                    username: user.username,
                },
                {
                    expiredAt: resetPassword.expiredAt,
                    link: resetPassword.link,
                    reference: resetPassword.reference,
                    expiredInMinutes: resetPassword.expiredInMinutes,
                },
                resetPassword.resendInMinutes
            );

            return;
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async resetPassword(
        { newPassword, token }: UserForgotPasswordResetRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>> {
        const resetPassword =
            await this.userRepository.findOneActiveByForgotPasswordToken(token);
        if (!resetPassword) {
            throw new NotFoundException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'user.error.notFound',
            });
        }

        const passwordHistories =
            await this.passwordHistoryRepository.findAllActiveByUser(
                resetPassword.userId
            );
        const passwordCheck = this.userUtil.checkPasswordPeriod(
            passwordHistories,
            newPassword
        );
        if (passwordCheck) {
            throw new BadRequestException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.PASSWORD_MUST_NEW,
                message: 'auth.error.passwordMustNew',
                _metadata: {
                    customProperty: {
                        messageProperties: {
                            period: this.helperService.dateFormatToRFC2822(
                                passwordCheck.expiredAt
                            ),
                        },
                    },
                },
            });
        }

        try {
            const sessions = await this.sessionRepository.findAllByUser(
                resetPassword.userId
            );
            const password = this.authUtil.createPassword(newPassword);

            await Promise.all([
                this.userRepository.changePassword(
                    resetPassword.userId,
                    password,
                    requestLog
                ),
                this.sessionUtil.deleteAllLogins(
                    resetPassword.userId,
                    sessions
                ),
            ]);

            // @note: send email after all creation
            await this.emailService.sendChangePassword(resetPassword.user.id, {
                email: resetPassword.user.email,
                username: resetPassword.user.username,
            });

            return;
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }
}
