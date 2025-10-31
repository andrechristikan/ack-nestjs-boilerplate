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
import { AuthService } from '@modules/auth/services/auth.service';
import { ENUM_COUNTRY_STATUS_CODE_ERROR } from '@modules/country/enums/country.status-code.enum';
import { CountryRepository } from '@modules/country/repositories/country.repository';
import { EmailCreateByAdminDto } from '@modules/email/dtos/email.create-by-admin.dto';
import { EmailVerificationDto } from '@modules/email/dtos/email.verification.dto';
import { ENUM_SEND_EMAIL_PROCESS } from '@modules/email/enums/email.enum';
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
import { UserGeneratePhotoProfileRequestDto } from '@modules/user/dtos/request/user.generate-photo-profile.request.dto';
import { UserLoginRequestDto } from '@modules/user/dtos/request/user.login.request.dto';
import { UserAddMobileNumberRequestDto } from '@modules/user/dtos/request/user.mobile-number.request.dto';
import {
    UserUpdateProfilePhotoRequestDto,
    UserUpdateProfileRequestDto,
} from '@modules/user/dtos/request/user.profile.request.dto';
import { UserSignUpRequestDto } from '@modules/user/dtos/request/user.sign-up.request.dto';
import { UserUpdateStatusRequestDto } from '@modules/user/dtos/request/user.update-status.request.dto';
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
import { VerificationRepository } from '@modules/verification/repositories/verification.repository';
import { VerificationUtil } from '@modules/verification/utils/verification.util';
import { InjectQueue } from '@nestjs/bullmq';
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
    PasswordHistory,
} from '@prisma/client';
import { Queue } from 'bullmq';
import { Duration } from 'luxon';
import { ENUM_QUEUE } from 'src/queues/enums/queue.enum';

@Injectable()
export class UserService implements IUserService {
    private readonly userRoleName: string = 'user';

    constructor(
        @InjectQueue(ENUM_QUEUE.EMAIL)
        private readonly emailQueue: Queue,
        private readonly userUtil: UserUtil,
        private readonly verificationUtil: VerificationUtil,
        private readonly userRepository: UserRepository,
        private readonly countryRepository: CountryRepository,
        private readonly roleRepository: RoleRepository,
        private readonly passwordHistoryRepository: PasswordHistoryRepository,
        private readonly awsS3Service: AwsS3Service,
        private readonly helperService: HelperService,
        private readonly fileService: FileService,
        private readonly authService: AuthService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly sessionUtil: SessionUtil,
        private readonly sessionRepository: SessionRepository,
        private readonly featureFlagService: FeatureFlagService,
        private readonly verificationRepository: VerificationRepository
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
        } else if (user.status !== ENUM_USER_STATUS.ACTIVE) {
            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.INACTIVE_FORBIDDEN,
                message: 'user.error.inactive',
            });
        }

        const checkPasswordExpired: boolean =
            this.authService.checkPasswordExpired(user.passwordExpired);
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
            const passwordString = this.authService.createPasswordRandom();
            const password: IAuthPassword = this.authService.createPassword(
                passwordString,
                {
                    temporary: true,
                }
            );
            const emailVerification = this.verificationUtil.createVerification(
                ENUM_VERIFICATION_TYPE.EMAIL
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

            const keyVerification = `${ENUM_SEND_EMAIL_PROCESS.VERIFICATION}-${created.id}`;
            await Promise.all([
                this.emailQueue.add(
                    ENUM_SEND_EMAIL_PROCESS.CREATE_BY_ADMIN,
                    {
                        send: {
                            email,
                            username: created.username,
                        },
                        data: {
                            passwordExpiredAt: password.passwordExpired,
                            password: passwordString,
                            passwordCreatedAt: password.passwordCreated,
                        } as EmailCreateByAdminDto,
                    },
                    {
                        jobId: `${ENUM_SEND_EMAIL_PROCESS.CREATE_BY_ADMIN}-${created.id}`,
                    }
                ),
                checkRole.type === ENUM_ROLE_TYPE.USER
                    ? this.emailQueue.add(
                          ENUM_SEND_EMAIL_PROCESS.VERIFICATION,
                          {
                              send: {
                                  email,
                                  username: created.username,
                              },
                              data: {
                                  token: emailVerification.token,
                                  expiredAt: emailVerification.expiredAt,
                                  reference: emailVerification.reference,
                                  link: emailVerification.link,
                              } as EmailVerificationDto,
                          },
                          {
                              deduplication: {
                                  id: keyVerification,
                                  ttl:
                                      emailVerification.expiredInMinutes *
                                      60 *
                                      1000,
                              },
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
        } else if (user.status === ENUM_USER_STATUS.BLOCKED) {
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
        const [checkExist, checkCountry] = await Promise.all([
            this.userRepository.existMobileNumber(userId, mobileNumberId),
            this.countryRepository.findOneById(countryId),
        ]);
        if (!checkExist) {
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
                mobileNumberId,
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
        } else if (user.status === ENUM_USER_STATUS.BLOCKED) {
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
            const passwordString = this.authService.createPasswordRandom();
            const password = this.authService.createPassword(passwordString, {
                temporary: true,
            });

            const updated = await this.userRepository.updatePasswordByAdmin(
                userId,
                password,
                requestLog,
                updatedBy
            );

            await this.emailQueue.add(
                ENUM_SEND_EMAIL_PROCESS.TEMPORARY_PASSWORD,
                {
                    send: { email: updated.email, username: updated.username },
                    data: {
                        passwordExpiredAt: password.passwordExpired,
                        password: passwordString,
                    },
                },
                {
                    deduplication: {
                        id: `${ENUM_SEND_EMAIL_PROCESS.TEMPORARY_PASSWORD}-${updated.id}`,
                        ttl: 5000,
                    },
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

    async checkPasswordHistoryActiveByPeriod(
        userId: string,
        password: string
    ): Promise<PasswordHistory | null> {
        const histories =
            await this.passwordHistoryRepository.findAllActiveByUser(userId);

        for (const history of histories) {
            if (this.helperService.bcryptCompare(password, history.password)) {
                return history;
            }
        }

        return null;
    }

    async changePassword(
        userId: string,
        { newPassword, oldPassword }: UserChangePasswordRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>> {
        const user = await this.userRepository.findOneActiveById(userId);

        if (this.authService.checkPasswordAttempt(user)) {
            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.PASSWORD_ATTEMPT_MAX,
                message: 'auth.error.passwordAttemptMax',
            });
        } else if (
            !this.authService.validatePassword(oldPassword, user.password)
        ) {
            await this.userRepository.increasePasswordAttempt(userId);

            throw new BadRequestException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.PASSWORD_NOT_MATCH,
                message: 'auth.error.passwordNotMatch',
            });
        }

        await this.userRepository.resetPasswordAttempt(userId);

        const passwordCheck = await this.checkPasswordHistoryActiveByPeriod(
            userId,
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
            const password = this.authService.createPassword(newPassword);

            const [updated] = await Promise.all([
                this.userRepository.changePassword(
                    userId,
                    password,
                    requestLog
                ),
                this.sessionUtil.deleteAllLogins(userId, sessions),
            ]);

            await this.emailQueue.add(
                ENUM_SEND_EMAIL_PROCESS.CHANGE_PASSWORD,
                {
                    send: { email: user.email, name: user.name },
                },
                {
                    deduplication: {
                        id: `${ENUM_SEND_EMAIL_PROCESS.CHANGE_PASSWORD}-${updated.id}`,
                        ttl: 5000,
                    },
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
        } else if (user.status !== ENUM_USER_STATUS.ACTIVE) {
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
        } else if (this.authService.checkPasswordAttempt(user)) {
            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.PASSWORD_ATTEMPT_MAX,
                message: 'auth.error.passwordAttemptMax',
            });
        } else if (
            !this.authService.validatePassword(password, user.password)
        ) {
            await this.userRepository.increasePasswordAttempt(user.id);

            throw new BadRequestException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.PASSWORD_NOT_MATCH,
                message: 'auth.error.passwordNotMatch',
            });
        }

        await this.userRepository.resetPasswordAttempt(user.id);

        const checkPasswordExpired: boolean =
            this.authService.checkPasswordExpired(user.passwordExpired);
        if (checkPasswordExpired) {
            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.PASSWORD_EXPIRED,
                message: 'auth.error.passwordExpired',
            });
        } else if (!user.isVerified) {
            const emailVerification = this.verificationUtil.createVerification(
                ENUM_VERIFICATION_TYPE.EMAIL
            );

            await this.verificationRepository.resendEmailByUser(
                user.id,
                user.email,
                emailVerification
            );

            const keyVerification = `${ENUM_SEND_EMAIL_PROCESS.VERIFICATION}-${user.id}`;
            await this.emailQueue.add(
                ENUM_SEND_EMAIL_PROCESS.VERIFICATION,
                {
                    send: {
                        email: user.email,
                        username: user.username,
                    },
                    data: {
                        token: emailVerification.token,
                        expiredAt: emailVerification.expiredAt,
                        reference: emailVerification.reference,
                        link: emailVerification.link,
                    } as EmailVerificationDto,
                },
                {
                    deduplication: {
                        id: keyVerification,
                        ttl: emailVerification.expiredInMinutes * 60 * 1000,
                    },
                }
            );

            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.EMAIL_NOT_VERIFIED,
                message: 'user.error.emailNotVerified',
            });
        }

        try {
            const sessionId = this.databaseUtil.createId();
            const tokens = this.authService.createTokens(
                user,
                sessionId,
                from,
                ENUM_USER_LOGIN_WITH.CREDENTIAL
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
                        loginWith: ENUM_USER_LOGIN_WITH.CREDENTIAL,
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
                loginWith === ENUM_USER_LOGIN_WITH.SOCIAL_GOOGLE
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

            await this.emailQueue.add(
                ENUM_SEND_EMAIL_PROCESS.WELCOME,
                {
                    send: { email: user.email, username: user.username },
                },
                {
                    jobId: `${ENUM_SEND_EMAIL_PROCESS.WELCOME}-${user.id}`,
                }
            );
        }

        if (user.status !== ENUM_USER_STATUS.ACTIVE) {
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
            const tokens = this.authService.createTokens(
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
            this.authService.payloadToken<IAuthJwtRefreshTokenPayload>(
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
            const tokens = this.authService.refreshToken(user, refreshToken);

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
            const password = this.authService.createPassword(passwordString);
            const randomUsername = this.userUtil.createRandomUsername();
            const emailVerification = this.verificationUtil.createVerification(
                ENUM_VERIFICATION_TYPE.EMAIL
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

            const keyVerification = `${ENUM_SEND_EMAIL_PROCESS.VERIFICATION}-${created.id}`;
            await Promise.all([
                this.emailQueue.add(
                    ENUM_SEND_EMAIL_PROCESS.WELCOME,
                    {
                        send: {
                            email: created.email,
                            username: created.username,
                        },
                    },
                    {
                        jobId: `${ENUM_SEND_EMAIL_PROCESS.WELCOME}-${created.id}`,
                    }
                ),
                this.emailQueue.add(
                    ENUM_SEND_EMAIL_PROCESS.VERIFICATION,
                    {
                        send: {
                            email,
                            username: created.username,
                        },
                        data: {
                            token: emailVerification.token,
                            expiredAt: emailVerification.expiredAt,
                            reference: emailVerification.reference,
                            link: emailVerification.link,
                        } as EmailVerificationDto,
                    },
                    {
                        deduplication: {
                            id: keyVerification,
                            ttl: emailVerification.expiredInMinutes * 60 * 1000,
                        },
                    }
                ),
            ]);
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }
}
