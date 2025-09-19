import { ENUM_APP_STATUS_CODE_ERROR } from '@app/enums/app.status-code.enum';
import { AwsS3PresignDto } from '@common/aws/dtos/aws.s3-presign.dto';
import { AwsS3Dto } from '@common/aws/dtos/aws.s3.dto';
import { AwsS3Service } from '@common/aws/services/aws.s3.service';
import { DatabaseIdResponseDto } from '@common/database/dtos/database.id.dto';
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
import { IAuthPassword } from '@modules/auth/interfaces/auth.interface';
import { AuthService } from '@modules/auth/services/auth.service';
import { ENUM_COUNTRY_STATUS_CODE_ERROR } from '@modules/country/enums/country.status-code.enum';
import { CountryRepository } from '@modules/country/repositories/country.repository';
import { EmailCreateByAdminDto } from '@modules/email/dtos/email.create-by-admin.dto';
import { EmailVerificationDto } from '@modules/email/dtos/email.verification.dto';
import { ENUM_SEND_EMAIL_PROCESS } from '@modules/email/enums/email.enum';
import { ENUM_ROLE_STATUS_CODE_ERROR } from '@modules/role/enums/role.status-code.enum';
import { RoleRepository } from '@modules/role/repositories/role.repository';
import {
    UserCheckEmailRequestDto,
    UserCheckUsernameRequestDto,
} from '@modules/user/dtos/request/user.check.request.dto';
import { UserCreateRequestDto } from '@modules/user/dtos/request/user.create.request.dto';
import { UserGeneratePhotoProfileRequestDto } from '@modules/user/dtos/request/user.generate-photo-profile.request.dto';
import {
    UserUpdatePhotoProfileResponseDto,
    UserUpdateProfileRequestDto,
} from '@modules/user/dtos/request/user.update-profile.request.dto';
import { UserUpdateStatusRequestDto } from '@modules/user/dtos/request/user.update-status.request.dto';
import {
    UserCheckEmailResponseDto,
    UserCheckUsernameResponseDto,
} from '@modules/user/dtos/response/user.check.response.dto';
import { UserListResponseDto } from '@modules/user/dtos/response/user.list.response.dto';
import { UserProfileResponseDto } from '@modules/user/dtos/response/user.profile.response.dto';
import { ENUM_USER_STATUS_CODE_ERROR } from '@modules/user/enums/user.status-code.enum';
import { IUser } from '@modules/user/interfaces/user.interface';
import { IUserService } from '@modules/user/interfaces/user.service.interface';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserUtil } from '@modules/user/utils/user.util';
import { VerificationUtil } from '@modules/verification/utils/verification.util';
import { InjectQueue } from '@nestjs/bullmq';
import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { ENUM_USER_STATUS, ENUM_VERIFICATION_TYPE } from '@prisma/client';
import { ENUM_WORKER_QUEUES } from '@workers/enums/worker.enum';
import { Queue } from 'bullmq';

@Injectable()
export class UserService implements IUserService {
    constructor(
        @InjectQueue(ENUM_WORKER_QUEUES.EMAIL)
        private readonly emailQueue: Queue,
        private readonly userUtil: UserUtil,
        private readonly verificationUtil: VerificationUtil,
        private readonly userRepository: UserRepository,
        private readonly countryRepository: CountryRepository,
        private readonly roleRepository: RoleRepository,
        private readonly awsS3Service: AwsS3Service,
        private readonly authService: AuthService
    ) {}

    async validateUserGuard(
        request: IRequestApp,
        requiredVerified: boolean
    ): Promise<IUser> {
        const { userId } = request.user;
        const user = await this.userRepository.findOneById(userId);
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

    async getListCursor(
        pagination: IPaginationQueryCursorParams,
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
    ): Promise<IResponseReturn<DatabaseIdResponseDto>> {
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
                requestLog,
                createdBy
            );

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
                        debounce: {
                            id: `${ENUM_SEND_EMAIL_PROCESS.CREATE_BY_ADMIN}-${created.id}`,
                            ttl: 1000,
                        },
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
                        debounce: {
                            id: `${ENUM_SEND_EMAIL_PROCESS.VERIFICATION}-${created.id}`,
                            ttl: 1000,
                        },
                    }
                ),
            ]);

            return {
                data: { id: created.id },
            };
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async updateStatus(
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
                            status: status.toLowerCase(),
                        },
                    },
                },
            });
        }

        try {
            await this.userRepository.updateStatus(
                userId,
                { status },
                requestLog,
                updatedBy
            );
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
        const user = await this.userRepository.findOneProfileById(userId);
        const mapped = this.userUtil.mapProfile(user);

        return {
            data: mapped,
        };
    }

    async updateProfile(
        userId: string,
        { countryId, ...data }: UserUpdateProfileRequestDto,
        requestLog: IRequestLog
    ): Promise<void> {
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
                requestLog,
                userId
            );
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
        { mime, size }: UserGeneratePhotoProfileRequestDto
    ): Promise<IResponseReturn<AwsS3PresignDto>> {
        const key: string = this.userUtil.createRandomFilenamePhotoWithPath(
            userId,
            {
                mime,
            }
        );

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
        { photo, size }: UserUpdatePhotoProfileResponseDto,
        requestLog: IRequestLog
    ): Promise<void> {
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
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }
}
