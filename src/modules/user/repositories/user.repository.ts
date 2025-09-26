import { AwsS3Dto } from '@common/aws/dtos/aws.s3.dto';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperService } from '@common/helper/services/helper.service';
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
import { UserClaimUsernameRequestDto } from '@modules/user/dtos/request/user.claim-username.request.dto';
import { UserCreateRequestDto } from '@modules/user/dtos/request/user.create.request.dto';
import { UserAddMobileNumberRequestDto } from '@modules/user/dtos/request/user.mobile-number.request.dto';
import { UserUpdateProfileRequestDto } from '@modules/user/dtos/request/user.profile.request.dto';
import { UserUpdateStatusRequestDto } from '@modules/user/dtos/request/user.update-status.request.dto';
import {
    IUser,
    IUserLogin,
    IUserProfile,
} from '@modules/user/interfaces/user.interface';
import { IVerificationCreate } from '@modules/verification/interfaces/verification.interface';
import { Injectable } from '@nestjs/common';
import {
    Country,
    ENUM_ACTIVITY_LOG_ACTION,
    ENUM_PASSWORD_HISTORY_TYPE,
    ENUM_TERM_POLICY_TYPE,
    ENUM_USER_SIGN_UP_FROM,
    ENUM_USER_SIGN_UP_WITH,
    ENUM_USER_STATUS,
    PasswordHistory,
    Prisma,
    User,
    UserMobileNumber,
} from '@prisma/client';

@Injectable()
export class UserRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService,
        private readonly helperService: HelperService
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

    async findOneById(id: string): Promise<User | null> {
        return this.databaseService.user.findUnique({
            where: { id, deletedAt: null },
        });
    }

    async findOneWithRoleByEmail(email: string): Promise<IUser | null> {
        return this.databaseService.user.findUnique({
            where: { email, deletedAt: null },
            include: {
                role: true,
            },
        });
    }

    async findOneProfileById(id: string): Promise<IUserProfile | null> {
        return this.databaseService.user.findUnique({
            where: { id, deletedAt: null },
            include: {
                role: true,
                country: true,
                mobileNumbers: true,
            },
        });
    }

    async findOneWithRoleById(id: string): Promise<IUser | null> {
        return this.databaseService.user.findUnique({
            where: { id, deletedAt: null },
            include: {
                role: true,
            },
        });
    }

    async existMobileNumber(
        userId: string,
        mobileNumberId: string
    ): Promise<{ id: string } | null> {
        return this.databaseService.userMobileNumber.findFirst({
            where: {
                id: mobileNumberId,
                user: {
                    id: userId,
                    deletedAt: null,
                },
            },
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

    async updateStatusByAdmin(
        id: string,
        { status }: UserUpdateStatusRequestDto,
        { ipAddress, userAgent }: IRequestLog,
        updatedBy: string
    ): Promise<User> {
        return this.databaseService.user.update({
            where: { id, deletedAt: null },
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
        { ipAddress, userAgent }: IRequestLog
    ): Promise<User> {
        return this.databaseService.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                ...data,
                countryId,
                updatedBy: userId,
                activityLogs: {
                    create: {
                        action: ENUM_ACTIVITY_LOG_ACTION.USER_UPDATE_PROFILE,
                        ipAddress,
                        userAgent: { ...userAgent },
                        createdBy: userId,
                    },
                },
            },
        });
    }

    async updatePhotoProfile(
        userId: string,
        photo: AwsS3Dto,
        { ipAddress, userAgent }: IRequestLog
    ): Promise<User> {
        return this.databaseService.user.update({
            where: { id: userId, deletedAt: null },
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

    async deleteSelf(
        userId: string,
        { ipAddress, userAgent }: IRequestLog
    ): Promise<User> {
        const deletedAt = this.helperService.dateCreate();
        return this.databaseService.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                deletedAt,
                deletedBy: userId,
                updatedBy: userId,
                status: ENUM_USER_STATUS.INACTIVE,
                activityLogs: {
                    create: {
                        action: ENUM_ACTIVITY_LOG_ACTION.USER_DELETE_SELF,
                        ipAddress,
                        userAgent: { ...userAgent },
                        createdBy: userId,
                        createdAt: deletedAt,
                    },
                },
                sessions: {
                    updateMany: {
                        where: { isRevoked: false },
                        data: { isRevoked: true },
                    },
                },
            },
        });
    }

    async addMobileNumber(
        userId: string,
        { number, countryId, phoneCode }: UserAddMobileNumberRequestDto,
        updatedBy: string,
        { ipAddress, userAgent }: IRequestLog
    ): Promise<UserMobileNumber & { country: Country }> {
        const updated = await this.databaseService.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                mobileNumbers: {
                    create: {
                        countryId,
                        number,
                        phoneCode,
                        createdBy: updatedBy,
                    },
                },
                updatedBy,
                activityLogs: {
                    create: {
                        action: ENUM_ACTIVITY_LOG_ACTION.USER_ADD_MOBILE_NUMBER,
                        ipAddress,
                        userAgent: { ...userAgent },
                        createdBy: userId,
                    },
                },
            },
            include: {
                mobileNumbers: {
                    where: {
                        countryId,
                        number,
                        phoneCode,
                    },
                    take: 1,
                    include: {
                        country: true,
                    },
                },
            },
        });

        return updated.mobileNumbers[0];
    }

    async updateMobileNumber(
        userId: string,
        mobileNumberId: string,
        { number, countryId, phoneCode }: UserAddMobileNumberRequestDto,
        { ipAddress, userAgent }: IRequestLog
    ): Promise<UserMobileNumber & { country: Country }> {
        const updated = await this.databaseService.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                mobileNumbers: {
                    update: {
                        where: { id: mobileNumberId },
                        data: {
                            countryId,
                            number,
                            phoneCode,
                            updatedBy: userId,
                        },
                    },
                },
                updatedBy: userId,
                activityLogs: {
                    create: {
                        action: ENUM_ACTIVITY_LOG_ACTION.USER_UPDATE_MOBILE_NUMBER,
                        ipAddress,
                        userAgent: { ...userAgent },
                        createdBy: userId,
                    },
                },
            },
            include: {
                mobileNumbers: {
                    where: {
                        countryId,
                        number,
                        phoneCode,
                    },
                    take: 1,
                    include: {
                        country: true,
                    },
                },
            },
        });

        return updated.mobileNumbers[0];
    }

    async deleteMobileNumber(
        userId: string,
        mobileNumberId: string,
        { ipAddress, userAgent }: IRequestLog
    ): Promise<User> {
        return this.databaseService.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                mobileNumbers: {
                    delete: { id: mobileNumberId },
                },
                updatedBy: userId,
                activityLogs: {
                    create: {
                        action: ENUM_ACTIVITY_LOG_ACTION.USER_DELETE_MOBILE_NUMBER,
                        ipAddress,
                        userAgent: { ...userAgent },
                        createdBy: userId,
                    },
                },
            },
        });
    }

    async claimUsername(
        userId: string,
        { username }: UserClaimUsernameRequestDto,
        { ipAddress, userAgent }: IRequestLog
    ): Promise<User> {
        return this.databaseService.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                username,
                updatedBy: userId,
                activityLogs: {
                    create: {
                        action: ENUM_ACTIVITY_LOG_ACTION.USER_CLAIM_USERNAME,
                        ipAddress,
                        userAgent: { ...userAgent },
                        createdBy: userId,
                    },
                },
            },
        });
    }

    async updatePasswordByAdmin(
        userId: string,
        {
            passwordCreated,
            passwordExpired,
            passwordHash,
            salt,
            passwordPeriodExpired,
        }: IAuthPassword,
        { ipAddress, userAgent }: IRequestLog,
        updatedBy: string
    ): Promise<User> {
        return this.databaseService.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                password: passwordHash,
                salt,
                passwordCreated,
                passwordExpired,
                passwordAttempt: 0,
                updatedBy,
                passwordHistories: {
                    create: {
                        password: passwordHash,
                        salt,
                        type: ENUM_PASSWORD_HISTORY_TYPE.ADMIN,
                        expiredAt: passwordPeriodExpired,
                        createdAt: passwordCreated,
                        createdBy: updatedBy,
                    },
                },
                activityLogs: {
                    create: {
                        action: ENUM_ACTIVITY_LOG_ACTION.USER_UPDATE_PASSWORD_BY_ADMIN,
                        ipAddress,
                        userAgent: { ...userAgent },
                        createdBy: updatedBy,
                    },
                },
            },
        });
    }

    async increasePasswordAttempt(userId: string): Promise<User> {
        return this.databaseService.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                passwordAttempt: {
                    increment: 1,
                },
            },
        });
    }

    async resetPasswordAttempt(userId: string): Promise<User> {
        return this.databaseService.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                passwordAttempt: 0,
            },
        });
    }

    async findAllPasswordHistoryActive(
        userId: string
    ): Promise<PasswordHistory[]> {
        const today = this.helperService.dateCreate();
        return this.databaseService.passwordHistory.findMany({
            where: {
                userId,
                expiredAt: {
                    gte: today,
                },
            },
            orderBy: {
                createdAt: Prisma.SortOrder.desc,
            },
        });
    }

    async changePassword(
        userId: string,
        {
            passwordCreated,
            passwordExpired,
            passwordHash,
            salt,
            passwordPeriodExpired,
        }: IAuthPassword,
        { ipAddress, userAgent }: IRequestLog
    ): Promise<User> {
        return this.databaseService.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                password: passwordHash,
                salt,
                passwordCreated,
                passwordExpired,
                passwordAttempt: 0,
                updatedBy: userId,
                passwordHistories: {
                    create: {
                        password: passwordHash,
                        salt,
                        type: ENUM_PASSWORD_HISTORY_TYPE.PROFILE,
                        expiredAt: passwordPeriodExpired,
                        createdAt: passwordCreated,
                        createdBy: userId,
                    },
                },
                activityLogs: {
                    create: {
                        action: ENUM_ACTIVITY_LOG_ACTION.USER_CHANGE_PASSWORD,
                        ipAddress,
                        userAgent: { ...userAgent },
                        createdBy: userId,
                    },
                },
                sessions: {
                    updateMany: {
                        where: { isRevoked: false },
                        data: { isRevoked: true },
                    },
                },
            },
        });
    }

    async updateLoginInfo(
        userId: string,
        { loginFrom, loginWith, sessionId, expiredAt }: IUserLogin,
        { ipAddress, userAgent }: IRequestLog
    ): Promise<User> {
        return this.databaseService.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                lastLoginAt: this.helperService.dateCreate(),
                lastIPAddress: ipAddress,
                lastLoginFrom: loginFrom,
                lastLoginWith: loginWith,
                updatedBy: userId,
                sessions: {
                    create: {
                        id: sessionId,
                        expiredAt,
                        isRevoked: false,
                        ipAddress,
                        userAgent: { ...userAgent },
                        createdBy: userId,
                    },
                },
                activityLogs: {
                    create: {
                        action: ENUM_ACTIVITY_LOG_ACTION.USER_LOGIN_CREDENTIAL,
                        ipAddress,
                        userAgent: { ...userAgent },
                        createdBy: userId,
                    },
                },
            },
        });
    }
}
