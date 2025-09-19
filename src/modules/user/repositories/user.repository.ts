import { AwsS3Dto } from '@common/aws/dtos/aws.s3.dto';
import { DatabaseService } from '@common/database/services/database.service';
import {
    IPaginationCursorReturn,
    IPaginationEqual,
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { IAuthPassword } from '@modules/auth/interfaces/auth.interface';
import { UserCreateRequestDto } from '@modules/user/dtos/request/user.create.request.dto';
import { UserUpdateProfileRequestDto } from '@modules/user/dtos/request/user.update-profile.request.dto';
import { UserUpdateStatusRequestDto } from '@modules/user/dtos/request/user.update-status.request.dto';
import { IUser, IUserProfile } from '@modules/user/interfaces/user.interface';
import { IVerificationCreate } from '@modules/verification/interfaces/verification.interface';
import { Injectable } from '@nestjs/common';
import {
    ENUM_ACTIVITY_LOG_ACTION,
    ENUM_PASSWORD_HISTORY_TYPE,
    ENUM_TERM_POLICY_TYPE,
    ENUM_USER_SIGN_UP_FROM,
    ENUM_USER_SIGN_UP_WITH,
    ENUM_USER_STATUS,
    Prisma,
    User,
} from '@prisma/client';

@Injectable()
export class UserRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService
    ) {}

    async findWithPaginationOffset(
        { where, ...params }: IPaginationQueryOffsetParams,
        status?: Record<string, IPaginationIn>,
        role?: Record<string, IPaginationEqual>,
        country?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<IUser>> {
        return this.paginationService.offSet<IUser>(this.databaseService.user, {
            ...params,
            where: {
                ...where,
                ...status,
                ...country,
                ...role,
            },
            includes: {
                role: true,
            },
        });
    }

    async findWithPaginationCursor(
        { where, ...params }: IPaginationQueryCursorParams,
        status?: Record<string, IPaginationIn>,
        role?: Record<string, IPaginationEqual>,
        country?: Record<string, IPaginationEqual>
    ): Promise<IPaginationCursorReturn<IUser>> {
        return this.paginationService.cursor<IUser>(this.databaseService.user, {
            ...params,
            where: {
                ...where,
                ...status,
                ...country,
                ...role,
            },
            includes: {
                role: true,
            },
        });
    }

    async findOneById(id: string): Promise<IUser | null> {
        return this.databaseService.user.findUnique({
            where: { id },
            include: {
                role: true,
            },
        });
    }

    async findOneProfileById(id: string): Promise<IUserProfile | null> {
        return this.databaseService.user.findUnique({
            where: { id },
            include: {
                role: true,
                country: true,
                mobileNumbers: true,
            },
        });
    }

    async existByRole(roleId: string): Promise<{ id: string } | null> {
        return this.databaseService.user.findFirst({
            where: { roleId },
            select: { id: true },
        });
    }

    async existByEmail(email: string): Promise<{ id: string } | null> {
        return this.databaseService.user.findFirst({
            where: { email: email },
            select: { id: true },
        });
    }

    async existByUsername(username: string): Promise<{ id: string } | null> {
        return this.databaseService.user.findUnique({
            where: { username },
            select: { id: true },
        });
    }

    async createByAdmin(
        username: string,
        { countryId, email, name, roleId }: UserCreateRequestDto,
        {
            passwordCreated,
            passwordExpired,
            passwordHash,
            salt,
            passwordPeriodExpired,
        }: IAuthPassword,
        { expiredAt, reference, token, type }: IVerificationCreate,
        { ipAddress, userAgent }: IRequestLog,
        createdBy: string
    ): Promise<User> {
        return this.databaseService.user.create({
            data: {
                email,
                countryId,
                roleId,
                name,
                signUpFrom: ENUM_USER_SIGN_UP_FROM.ADMIN,
                signUpWith: ENUM_USER_SIGN_UP_WITH.CREDENTIAL,
                passwordCreated,
                passwordExpired,
                password: passwordHash,
                salt,
                passwordAttempt: 0,
                username,
                isVerified: false,
                status: ENUM_USER_STATUS.ACTIVE,
                termPolicy: {
                    [ENUM_TERM_POLICY_TYPE.COOKIE]: true,
                    [ENUM_TERM_POLICY_TYPE.MARKETING]: false,
                    [ENUM_TERM_POLICY_TYPE.PRIVACY]: true,
                    [ENUM_TERM_POLICY_TYPE.TERMS_OF_SERVICE]: true,
                },
                createdBy,
                verifications: {
                    create: {
                        expiredAt,
                        reference,
                        token,
                        type,
                        to: email,
                        createdBy: createdBy,
                    },
                },
                passwordHistories: {
                    create: {
                        password: passwordHash,
                        salt,
                        type: ENUM_PASSWORD_HISTORY_TYPE.ADMIN,
                        expiredAt: passwordPeriodExpired,
                        createdAt: passwordCreated,
                        createdBy: createdBy,
                    },
                },
                activityLogs: {
                    create: {
                        action: ENUM_ACTIVITY_LOG_ACTION.USER_CREATED,
                        ipAddress,
                        userAgent: { ...userAgent },
                        createdBy: createdBy,
                    },
                },
            },
        });
    }

    async updateStatus(
        id: string,
        { status }: UserUpdateStatusRequestDto,
        { ipAddress, userAgent }: IRequestLog,
        updatedBy: string
    ): Promise<void> {
        await this.databaseService.user.update({
            where: { id },
            data: {
                status,
                updatedBy,
                activityLogs: {
                    create: {
                        action:
                            status === ENUM_USER_STATUS.BLOCKED
                                ? ENUM_ACTIVITY_LOG_ACTION.USER_BLOCKED
                                : ENUM_ACTIVITY_LOG_ACTION.USER_UPDATE_STATUS,
                        ipAddress,
                        userAgent: { ...userAgent },
                        createdBy: updatedBy,
                    },
                },
            },
        });
    }

    async updateProfile(
        userId: string,
        { countryId, ...data }: UserUpdateProfileRequestDto,
        { ipAddress, userAgent }: IRequestLog,
        updatedBy: string
    ): Promise<void> {
        await this.databaseService.user.update({
            where: { id: userId },
            data: {
                ...data,
                countryId,
                updatedBy,
                activityLogs: {
                    create: {
                        action: ENUM_ACTIVITY_LOG_ACTION.USER_UPDATE_PROFILE,
                        ipAddress,
                        userAgent: { ...userAgent },
                        createdBy: updatedBy,
                    },
                },
            },
        });
    }

    async updatePhotoProfile(
        userId: string,
        photo: AwsS3Dto,
        { ipAddress, userAgent }: IRequestLog
    ): Promise<void> {
        await this.databaseService.user.update({
            where: { id: userId },
            data: {
                photo: photo as unknown as Prisma.InputJsonValue,
                updatedBy: userId,
                activityLogs: {
                    create: {
                        action: ENUM_ACTIVITY_LOG_ACTION.USER_UPDATE_PHOTO_PROFILE,
                        ipAddress: ipAddress,
                        userAgent: { ...userAgent },
                        createdBy: userId,
                    },
                },
            },
        });
    }
}
