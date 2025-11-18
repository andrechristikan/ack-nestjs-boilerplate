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
    IUserForgotPasswordCreate,
    IUserLogin,
    IUserProfile,
    IUserVerificationCreate,
} from '@modules/user/interfaces/user.interface';
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
    ENUM_VERIFICATION_TYPE,
    ForgotPassword,
    Prisma,
    User,
    UserMobileNumber,
    Verification,
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
                status: ENUM_USER_STATUS.active,
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
            where: { id, deletedAt: null, status: ENUM_USER_STATUS.active },
        });
    }

    async findOneActiveByEmail(email: string): Promise<User | null> {
        return this.databaseService.user.findUnique({
            where: { email, deletedAt: null, status: ENUM_USER_STATUS.active },
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
            where: { id, deletedAt: null, status: ENUM_USER_STATUS.active },
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

    async findOneActiveByForgotPasswordToken(
        token: string
    ): Promise<(ForgotPassword & { user: User }) | null> {
        const today = this.helperService.dateCreate();

        return this.databaseService.forgotPassword.findFirst({
            where: {
                token,
                isUsed: false,
                expiredAt: {
                    gt: today,
                },
                user: {
                    deletedAt: null,
                    status: ENUM_USER_STATUS.active,
                },
            },
            include: {
                user: true,
            },
        });
    }

    async findOneActiveByVerificationEmailToken(
        token: string
    ): Promise<(Verification & { user: User }) | null> {
        const today = this.helperService.dateCreate();

        return this.databaseService.verification.findFirst({
            where: {
                token,
                isUsed: false,
                type: ENUM_VERIFICATION_TYPE.email,
                expiredAt: {
                    gt: today,
                },
                user: {
                    deletedAt: null,
                    status: ENUM_USER_STATUS.active,
                },
            },
            include: {
                user: true,
            },
        });
    }

    async existMobileNumber(
        userId: string,
        mobileNumberId: string
    ): Promise<{
        id: string;
        number: string;
        phoneCode: string;
        isVerified: boolean;
    } | null> {
        return this.databaseService.userMobileNumber.findFirst({
            where: {
                id: mobileNumberId,
                user: {
                    id: userId,
                },
            },
            select: {
                id: true,
                number: true,
                phoneCode: true,
                isVerified: true,
            },
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
        }: IUserVerificationCreate,
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
        const termPolicies = await this.databaseService.termPolicy.findMany({
            where: {
                type: {
                    in: [
                        ENUM_TERM_POLICY_TYPE.termsOfService,
                        ENUM_TERM_POLICY_TYPE.privacy,
                    ],
                },
                status: ENUM_TERM_POLICY_STATUS.published,
            },
            select: {
                id: true,
            },
        });

        const userId = this.databaseUtil.createId();
        const [user] = await this.databaseService.$transaction([
            this.databaseService.user.create({
                data: {
                    id: userId,
                    email,
                    countryId,
                    roleId,
                    name,
                    signUpFrom: ENUM_USER_SIGN_UP_FROM.admin,
                    signUpWith: ENUM_USER_SIGN_UP_WITH.credential,
                    passwordCreated,
                    passwordExpired,
                    password: passwordHash,
                    salt,
                    passwordAttempt: 0,
                    username,
                    isVerified: roleType === ENUM_ROLE_TYPE.user ? false : true,
                    status: ENUM_USER_STATUS.active,
                    termPolicy: {
                        [ENUM_TERM_POLICY_TYPE.cookie]: false,
                        [ENUM_TERM_POLICY_TYPE.marketing]: false,
                        [ENUM_TERM_POLICY_TYPE.privacy]: true,
                        [ENUM_TERM_POLICY_TYPE.termsOfService]: true,
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
                            type: ENUM_PASSWORD_HISTORY_TYPE.admin,
                            expiredAt: passwordPeriodExpired,
                            createdAt: passwordCreated,
                            createdBy: createdBy,
                        },
                    },
                    activityLogs: {
                        createMany: {
                            data: [
                                {
                                    action: ENUM_ACTIVITY_LOG_ACTION.userCreated,
                                    ipAddress,
                                    userAgent:
                                        this.databaseUtil.toPlainObject(
                                            userAgent
                                        ),
                                    createdBy: createdBy,
                                },
                                {
                                    action: ENUM_ACTIVITY_LOG_ACTION.userSendVerificationEmail,
                                    ipAddress,
                                    userAgent:
                                        this.databaseUtil.toPlainObject(
                                            userAgent
                                        ),
                                    createdBy: userId,
                                },
                            ],
                        },
                    },
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
                            status === ENUM_USER_STATUS.blocked
                                ? ENUM_ACTIVITY_LOG_ACTION.userBlocked
                                : ENUM_ACTIVITY_LOG_ACTION.userUpdateStatus,
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
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
                        action: ENUM_ACTIVITY_LOG_ACTION.userUpdateProfile,
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
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
                        action: ENUM_ACTIVITY_LOG_ACTION.userUpdatePhotoProfile,
                        ipAddress: ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
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
                status: ENUM_USER_STATUS.inactive,
                activityLogs: {
                    create: {
                        action: ENUM_ACTIVITY_LOG_ACTION.userDeleteSelf,
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
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
                        action: ENUM_ACTIVITY_LOG_ACTION.userAddMobileNumber,
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
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
        mobileNumber: {
            id: string;
            number: string;
            phoneCode: string;
            isVerified: boolean;
        },
        { number, countryId, phoneCode }: UserAddMobileNumberRequestDto,
        { ipAddress, userAgent }: IRequestLog
    ): Promise<UserMobileNumber & { country: Country }> {
        const updated = await this.databaseService.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                mobileNumbers: {
                    update: {
                        where: { id: mobileNumber.id },
                        data: {
                            countryId,
                            number,
                            phoneCode,
                            updatedBy: userId,
                            isVerified:
                                mobileNumber.number === number &&
                                mobileNumber.phoneCode === phoneCode
                                    ? mobileNumber.isVerified
                                    : false,
                        },
                    },
                },
                updatedBy: userId,
                activityLogs: {
                    create: {
                        action: ENUM_ACTIVITY_LOG_ACTION.userUpdateMobileNumber,
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
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
                        action: ENUM_ACTIVITY_LOG_ACTION.userDeleteMobileNumber,
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
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
                        action: ENUM_ACTIVITY_LOG_ACTION.userClaimUsername,
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
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
                        type: ENUM_PASSWORD_HISTORY_TYPE.admin,
                        expiredAt: passwordPeriodExpired,
                        createdAt: passwordCreated,
                        createdBy: updatedBy,
                    },
                },
                activityLogs: {
                    create: {
                        action: ENUM_ACTIVITY_LOG_ACTION.userUpdatePasswordByAdmin,
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
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
                        type: ENUM_PASSWORD_HISTORY_TYPE.profile,
                        expiredAt: passwordPeriodExpired,
                        createdAt: passwordCreated,
                        createdBy: userId,
                    },
                },
                activityLogs: {
                    create: {
                        action: ENUM_ACTIVITY_LOG_ACTION.userChangePassword,
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
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
            ENUM_ACTIVITY_LOG_ACTION.userLoginCredential;
        switch (loginWith) {
            case ENUM_USER_LOGIN_WITH.socialApple:
                action = ENUM_ACTIVITY_LOG_ACTION.userLoginApple;
                break;
            case ENUM_USER_LOGIN_WITH.socialGoogle:
                action = ENUM_ACTIVITY_LOG_ACTION.userLoginGoogle;
                break;
            case ENUM_USER_LOGIN_WITH.credential:
            default:
                action = ENUM_ACTIVITY_LOG_ACTION.userLoginCredential;
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
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
                        createdBy: userId,
                    },
                },
                activityLogs: {
                    create: {
                        action,
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
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
            loginWith === ENUM_USER_LOGIN_WITH.socialApple
                ? ENUM_USER_SIGN_UP_WITH.socialApple
                : ENUM_USER_SIGN_UP_WITH.socialGoogle;

        const termPolicies = await this.databaseService.termPolicy.findMany({
            where: {
                type: {
                    in: [
                        ENUM_TERM_POLICY_TYPE.termsOfService,
                        ENUM_TERM_POLICY_TYPE.privacy,
                        cookie ? ENUM_TERM_POLICY_TYPE.cookie : null,
                        marketing ? ENUM_TERM_POLICY_TYPE.marketing : null,
                    ].filter(Boolean) as ENUM_TERM_POLICY_TYPE[],
                },
                status: ENUM_TERM_POLICY_STATUS.published,
            },
            select: {
                id: true,
            },
        });

        const [user] = await this.databaseService.$transaction([
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
                    status: ENUM_USER_STATUS.active,
                    termPolicy: {
                        [ENUM_TERM_POLICY_TYPE.cookie]: cookie,
                        [ENUM_TERM_POLICY_TYPE.marketing]: marketing,
                        [ENUM_TERM_POLICY_TYPE.privacy]: true,
                        [ENUM_TERM_POLICY_TYPE.termsOfService]: true,
                    },
                    createdBy: userId,
                    deletedAt: null,
                    activityLogs: {
                        create: {
                            action: ENUM_ACTIVITY_LOG_ACTION.userCreated,
                            ipAddress,
                            userAgent:
                                this.databaseUtil.toPlainObject(userAgent),
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
                        action: ENUM_ACTIVITY_LOG_ACTION.userVerifiedEmail,
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
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
        { expiredAt, reference, token, type }: IUserVerificationCreate,
        { ipAddress, userAgent }: IRequestLog
    ): Promise<User> {
        const termPolicies = await this.databaseService.termPolicy.findMany({
            where: {
                type: {
                    in: [
                        ENUM_TERM_POLICY_TYPE.termsOfService,
                        ENUM_TERM_POLICY_TYPE.privacy,
                        cookie ? ENUM_TERM_POLICY_TYPE.cookie : null,
                        marketing ? ENUM_TERM_POLICY_TYPE.marketing : null,
                    ].filter(Boolean) as ENUM_TERM_POLICY_TYPE[],
                },
                status: ENUM_TERM_POLICY_STATUS.published,
            },
            select: {
                id: true,
            },
        });

        const userId = this.databaseUtil.createId();
        const [user] = await this.databaseService.$transaction([
            this.databaseService.user.create({
                data: {
                    id: userId,
                    email,
                    countryId,
                    name,
                    roleId,
                    signUpFrom: from,
                    signUpWith: ENUM_USER_SIGN_UP_WITH.credential,
                    username,
                    isVerified: false,
                    status: ENUM_USER_STATUS.active,
                    passwordCreated,
                    passwordExpired,
                    password: passwordHash,
                    salt,
                    passwordAttempt: 0,
                    passwordHistories: {
                        create: {
                            password: passwordHash,
                            salt,
                            type: ENUM_PASSWORD_HISTORY_TYPE.signUp,
                            expiredAt: passwordPeriodExpired,
                            createdAt: passwordCreated,
                            createdBy: userId,
                        },
                    },
                    termPolicy: {
                        [ENUM_TERM_POLICY_TYPE.cookie]: cookie,
                        [ENUM_TERM_POLICY_TYPE.marketing]: marketing,
                        [ENUM_TERM_POLICY_TYPE.privacy]: true,
                        [ENUM_TERM_POLICY_TYPE.termsOfService]: true,
                    },
                    createdBy: userId,
                    deletedAt: null,
                    activityLogs: {
                        createMany: {
                            data: [
                                {
                                    action: ENUM_ACTIVITY_LOG_ACTION.userSignedUp,
                                    ipAddress,
                                    userAgent:
                                        this.databaseUtil.toPlainObject(
                                            userAgent
                                        ),
                                    createdBy: userId,
                                },
                                {
                                    action: ENUM_ACTIVITY_LOG_ACTION.userSendVerificationEmail,
                                    ipAddress,
                                    userAgent:
                                        this.databaseUtil.toPlainObject(
                                            userAgent
                                        ),
                                    createdBy: userId,
                                },
                            ],
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

    async forgotPassword(
        userId: string,
        email: string,
        { expiredAt, reference, token }: IUserForgotPasswordCreate,
        { ipAddress, userAgent }: IRequestLog
    ): Promise<void> {
        await this.databaseService.user.update({
            where: {
                id: userId,
                deletedAt: null,
                status: ENUM_USER_STATUS.active,
            },
            data: {
                activityLogs: {
                    create: {
                        action: ENUM_ACTIVITY_LOG_ACTION.userForgotPassword,
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
                        createdBy: userId,
                    },
                },
                forgotPasswords: {
                    updateMany: {
                        where: { isUsed: false },
                        data: { isUsed: true },
                    },
                    create: {
                        expiredAt,
                        reference,
                        token,
                        createdBy: userId,
                        to: email,
                    },
                },
            },
            select: {
                id: true,
            },
        });

        return;
    }

    async verifyEmail(
        id: string,
        userId: string,
        { ipAddress, userAgent }: IRequestLog
    ): Promise<Verification> {
        const today = this.helperService.dateCreate();

        return this.databaseService.verification.update({
            where: {
                id,
            },
            data: {
                isUsed: true,
                verifiedAt: today,
                user: {
                    update: {
                        verifiedAt: today,
                        isVerified: true,
                        activityLogs: {
                            create: {
                                action: ENUM_ACTIVITY_LOG_ACTION.userVerifiedEmail,
                                ipAddress,
                                userAgent:
                                    this.databaseUtil.toPlainObject(userAgent),
                                createdBy: userId,
                            },
                        },
                    },
                },
            },
        });
    }

    async requestVerificationEmail(
        userId: string,
        userEmail: string,
        { expiredAt, reference, token, type }: IUserVerificationCreate,
        requestLog: IRequestLog
    ): Promise<User> {
        const today = this.helperService.dateCreate();

        return this.databaseService.$transaction(
            async (tx: Prisma.TransactionClient) => {
                const [_, newVerification] = await Promise.all([
                    tx.verification.updateMany({
                        where: {
                            userId,
                            type,
                            isUsed: false,
                            expiredAt: {
                                gt: today,
                            },
                        },
                        data: {
                            expiredAt: today,
                        },
                    }),
                    tx.user.update({
                        where: {
                            id: userId,
                        },
                        data: {
                            verifications: {
                                create: {
                                    expiredAt,
                                    reference,
                                    token,
                                    type,
                                    to: userEmail,
                                    createdBy: reference,
                                    createdAt: today,
                                },
                            },
                            activityLogs: {
                                create: {
                                    action: ENUM_ACTIVITY_LOG_ACTION.userSendVerificationEmail,
                                    ipAddress: requestLog.ipAddress,
                                    userAgent: this.databaseUtil.toPlainObject(
                                        requestLog.userAgent
                                    ),
                                    createdBy: userId,
                                },
                            },
                        },
                    }),
                ]);

                return newVerification;
            }
        );
    }
}
