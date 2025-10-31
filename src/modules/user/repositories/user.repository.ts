import { AwsS3Dto } from '@common/aws/dtos/aws.s3.dto';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
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
import { UserCreateSocialRequestDto } from '@modules/user/dtos/request/user.create-social.request.dto';
import { UserCreateRequestDto } from '@modules/user/dtos/request/user.create.request.dto';
import { UserAddMobileNumberRequestDto } from '@modules/user/dtos/request/user.mobile-number.request.dto';
import { UserUpdateProfileRequestDto } from '@modules/user/dtos/request/user.profile.request.dto';
import { UserSignUpRequestDto } from '@modules/user/dtos/request/user.sign-up.request.dto';
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
    ENUM_ROLE_TYPE,
    ENUM_TERM_POLICY_STATUS,
    ENUM_TERM_POLICY_TYPE,
    ENUM_USER_LOGIN_WITH,
    ENUM_USER_SIGN_UP_FROM,
    ENUM_USER_SIGN_UP_WITH,
    ENUM_USER_STATUS,
    Prisma,
    User,
    UserMobileNumber,
} from '@prisma/client';

@Injectable()
export class UserRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly paginationService: PaginationService,
        private readonly helperService: HelperService
    ) {}

    async findWithPaginationOffset(
        { where, ...params }: IPaginationQueryOffsetParams,
        status?: Record<string, IPaginationIn>,
        role?: Record<string, IPaginationEqual>,
        country?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<IUser>> {
        return this.paginationService.offset<IUser>(this.databaseService.user, {
            ...params,
            where: {
                ...where,
                ...status,
                ...country,
                ...role,
                deletedAt: null,
            },
            includes: {
                role: true,
            },
        });
    }

    async findActiveWithPaginationCursor(
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
                deletedAt: null,
                status: ENUM_USER_STATUS.ACTIVE,
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

    async findOneActiveById(id: string): Promise<User | null> {
        return this.databaseService.user.findUnique({
            where: { id, deletedAt: null, status: ENUM_USER_STATUS.ACTIVE },
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

    async findOneActiveProfileById(id: string): Promise<IUserProfile | null> {
        return this.databaseService.user.findUnique({
            where: { id, deletedAt: null, status: ENUM_USER_STATUS.ACTIVE },
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
        { countryId, email, name }: UserCreateRequestDto,
        {
            passwordCreated,
            passwordExpired,
            passwordHash,
            salt,
            passwordPeriodExpired,
        }: IAuthPassword,
        {
            expiredAt,
            reference,
            token,
            type: verificationType,
        }: IVerificationCreate,
        {
            id: roleId,
            type: roleType,
        }: {
            id: string;
            type: ENUM_ROLE_TYPE;
        },
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
                isVerified: roleType === ENUM_ROLE_TYPE.USER ? false : true,
                status: ENUM_USER_STATUS.ACTIVE,
                termPolicy: {
                    [ENUM_TERM_POLICY_TYPE.COOKIE]: false,
                    [ENUM_TERM_POLICY_TYPE.MARKETING]: false,
                    [ENUM_TERM_POLICY_TYPE.PRIVACY]: true,
                    [ENUM_TERM_POLICY_TYPE.TERMS_OF_SERVICE]: true,
                },
                createdBy,
                deletedAt: null,
                verifications: {
                    create: {
                        expiredAt,
                        reference,
                        token,
                        type: verificationType,
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
                        userAgent:
                            this.databaseService.toPlainObject(userAgent),
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
                        userAgent:
                            this.databaseService.toPlainObject(userAgent),
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
                        userAgent:
                            this.databaseService.toPlainObject(userAgent),
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
                        userAgent:
                            this.databaseService.toPlainObject(userAgent),
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
                        userAgent:
                            this.databaseService.toPlainObject(userAgent),
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
                        userAgent:
                            this.databaseService.toPlainObject(userAgent),
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
                        userAgent:
                            this.databaseService.toPlainObject(userAgent),
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
                        userAgent:
                            this.databaseService.toPlainObject(userAgent),
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
                        userAgent:
                            this.databaseService.toPlainObject(userAgent),
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
                        userAgent:
                            this.databaseService.toPlainObject(userAgent),
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
                        userAgent:
                            this.databaseService.toPlainObject(userAgent),
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
        let action: ENUM_ACTIVITY_LOG_ACTION =
            ENUM_ACTIVITY_LOG_ACTION.USER_LOGIN_CREDENTIAL;
        switch (loginWith) {
            case ENUM_USER_LOGIN_WITH.SOCIAL_GOOGLE:
                action = ENUM_ACTIVITY_LOG_ACTION.USER_LOGIN_GOOGLE;
                break;
            case ENUM_USER_LOGIN_WITH.SOCIAL_APPLE:
                action = ENUM_ACTIVITY_LOG_ACTION.USER_LOGIN_APPLE;
                break;
            case ENUM_USER_LOGIN_WITH.CREDENTIAL:
            default:
                action = ENUM_ACTIVITY_LOG_ACTION.USER_LOGIN_CREDENTIAL;
                break;
        }

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
                        userAgent:
                            this.databaseService.toPlainObject(userAgent),
                        createdBy: userId,
                    },
                },
                activityLogs: {
                    create: {
                        action,
                        ipAddress,
                        userAgent:
                            this.databaseService.toPlainObject(userAgent),
                        createdBy: userId,
                    },
                },
            },
        });
    }

    async createBySocial(
        email: string,
        username: string,
        roleId: string,
        loginWith: ENUM_USER_LOGIN_WITH,
        {
            countryId,
            name,
            from,
            cookie,
            marketing,
        }: UserCreateSocialRequestDto,
        { ipAddress, userAgent }: IRequestLog
    ): Promise<IUser> {
        const userId = this.databaseUtil.createId();
        const signUpWith =
            loginWith === ENUM_USER_LOGIN_WITH.SOCIAL_GOOGLE
                ? ENUM_USER_SIGN_UP_WITH.SOCIAL_GOOGLE
                : ENUM_USER_SIGN_UP_WITH.SOCIAL_APPLE;

        const termPolicies = await this.databaseService.termPolicy.findMany({
            where: {
                type: {
                    in: [
                        ENUM_TERM_POLICY_TYPE.TERMS_OF_SERVICE,
                        ENUM_TERM_POLICY_TYPE.PRIVACY,
                    ],
                },
                status: ENUM_TERM_POLICY_STATUS.PUBLISHED,
            },
            select: {
                id: true,
            },
        });

        const [user] = await Promise.all([
            this.databaseService.user.create({
                data: {
                    id: userId,
                    email,
                    countryId,
                    name,
                    roleId,
                    signUpFrom: from,
                    signUpWith,
                    username,
                    isVerified: true,
                    status: ENUM_USER_STATUS.ACTIVE,
                    termPolicy: {
                        [ENUM_TERM_POLICY_TYPE.COOKIE]: cookie,
                        [ENUM_TERM_POLICY_TYPE.MARKETING]: marketing,
                        [ENUM_TERM_POLICY_TYPE.PRIVACY]: true,
                        [ENUM_TERM_POLICY_TYPE.TERMS_OF_SERVICE]: true,
                    },
                    createdBy: userId,
                    deletedAt: null,
                    activityLogs: {
                        create: {
                            action: ENUM_ACTIVITY_LOG_ACTION.USER_CREATED,
                            ipAddress,
                            userAgent:
                                this.databaseService.toPlainObject(userAgent),
                            createdBy: userId,
                        },
                    },
                },
                include: {
                    role: true,
                },
            }),
            ...termPolicies.map(termPolicy =>
                this.databaseService.termPolicyUserAcceptance.create({
                    data: {
                        userId,
                        termPolicyId: termPolicy.id,
                        createdBy: userId,
                    },
                })
            ),
        ]);

        return user;
    }

    async verify(
        userId: string,
        { ipAddress, userAgent }: IRequestLog
    ): Promise<User> {
        return this.databaseService.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                isVerified: true,
                updatedBy: userId,
                activityLogs: {
                    create: {
                        action: ENUM_ACTIVITY_LOG_ACTION.USER_VERIFIED,
                        ipAddress,
                        userAgent:
                            this.databaseService.toPlainObject(userAgent),
                        createdBy: userId,
                    },
                },
            },
        });
    }

    async signUp(
        username: string,
        roleId: string,
        {
            countryId,
            email,
            marketing,
            name,
            from,
            cookie,
        }: UserSignUpRequestDto,
        {
            passwordCreated,
            passwordExpired,
            passwordHash,
            salt,
            passwordPeriodExpired,
        }: IAuthPassword,
        { expiredAt, reference, token, type }: IVerificationCreate,
        { ipAddress, userAgent }: IRequestLog
    ): Promise<User> {
        const termPolicies = await this.databaseService.termPolicy.findMany({
            where: {
                type: {
                    in: [
                        ENUM_TERM_POLICY_TYPE.TERMS_OF_SERVICE,
                        ENUM_TERM_POLICY_TYPE.PRIVACY,
                    ],
                },
                status: ENUM_TERM_POLICY_STATUS.PUBLISHED,
            },
            select: {
                id: true,
            },
        });

        const userId = this.databaseUtil.createId();
        const [user] = await Promise.all([
            this.databaseService.user.create({
                data: {
                    id: userId,
                    email,
                    countryId,
                    name,
                    roleId,
                    signUpFrom: from,
                    signUpWith: ENUM_USER_SIGN_UP_WITH.CREDENTIAL,
                    username,
                    isVerified: false,
                    status: ENUM_USER_STATUS.ACTIVE,
                    passwordCreated,
                    passwordExpired,
                    password: passwordHash,
                    salt,
                    passwordAttempt: 0,
                    passwordHistories: {
                        create: {
                            password: passwordHash,
                            salt,
                            type: ENUM_PASSWORD_HISTORY_TYPE.SIGN_UP,
                            expiredAt: passwordPeriodExpired,
                            createdAt: passwordCreated,
                            createdBy: userId,
                        },
                    },
                    termPolicy: {
                        [ENUM_TERM_POLICY_TYPE.COOKIE]: cookie,
                        [ENUM_TERM_POLICY_TYPE.MARKETING]: marketing,
                        [ENUM_TERM_POLICY_TYPE.PRIVACY]: true,
                        [ENUM_TERM_POLICY_TYPE.TERMS_OF_SERVICE]: true,
                    },
                    createdBy: userId,
                    deletedAt: null,
                    activityLogs: {
                        create: {
                            action: ENUM_ACTIVITY_LOG_ACTION.USER_SIGNED_UP,
                            ipAddress,
                            userAgent:
                                this.databaseService.toPlainObject(userAgent),
                            createdBy: userId,
                        },
                    },
                    verifications: {
                        create: {
                            expiredAt,
                            reference,
                            token,
                            type,
                            to: email,
                            createdBy: userId,
                        },
                    },
                },
                include: {
                    role: true,
                },
            }),
            ...termPolicies.map(termPolicy =>
                this.databaseService.termPolicyUserAcceptance.create({
                    data: {
                        userId,
                        termPolicyId: termPolicy.id,
                        createdBy: userId,
                    },
                })
            ),
        ]);

        return user;
    }
}
