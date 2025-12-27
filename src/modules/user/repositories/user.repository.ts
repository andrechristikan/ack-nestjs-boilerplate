import { AwsS3Dto } from '@common/aws/dtos/aws.s3.dto';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperService } from '@common/helper/services/helper.service';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
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
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import {
    IAuthPassword,
    IAuthTwoFactorVerifyResult,
} from '@modules/auth/interfaces/auth.interface';
import { IRole } from '@modules/role/interfaces/role.interface';
import { UserClaimUsernameRequestDto } from '@modules/user/dtos/request/user.claim-username.request.dto';
import { UserCreateSocialRequestDto } from '@modules/user/dtos/request/user.create-social.request.dto';
import { UserCreateRequestDto } from '@modules/user/dtos/request/user.create.request.dto';
import { UserImportRequestDto } from '@modules/user/dtos/request/user.import.request.dto';
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
    EnumActivityLogAction,
    EnumPasswordHistoryType,
    EnumRoleType,
    EnumTermPolicyStatus,
    EnumTermPolicyType,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumVerificationType,
    ForgotPassword,
    Prisma,
    TermPolicyUserAcceptance,
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
            include: {
                role: true,
                twoFactor: true,
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
                deletedAt: null,
            },
            include: {
                role: true,
                twoFactor: true,
            },
        });
    }

    async findAllByEmails(emails: string[]): Promise<IUser[]> {
        return this.databaseService.user.findMany({
            where: {
                email: { in: emails },
            },
            include: {
                role: true,
                twoFactor: true,
            },
        });
    }

    async findAllExport(
        status?: Record<string, IPaginationIn>,
        role?: Record<string, IPaginationEqual>,
        country?: Record<string, IPaginationEqual>
    ): Promise<IUser[]> {
        return this.databaseService.user.findMany({
            where: {
                ...status,
                ...country,
                ...role,
                deletedAt: null,
            },
            include: {
                role: true,
                twoFactor: true,
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
            where: { id, deletedAt: null, status: EnumUserStatus.active },
        });
    }

    async findOneActiveByEmail(email: string): Promise<User | null> {
        return this.databaseService.user.findUnique({
            where: { email, deletedAt: null, status: EnumUserStatus.active },
        });
    }

    async findOneWithRoleByEmail(email: string): Promise<IUser | null> {
        return this.databaseService.user.findUnique({
            where: { email, deletedAt: null },
            include: {
                role: true,
                twoFactor: true,
            },
        });
    }

    async findOneProfileById(id: string): Promise<IUserProfile | null> {
        return this.databaseService.user.findUnique({
            where: { id, deletedAt: null },
            include: {
                role: true,
                country: true,
                twoFactor: true,
                mobileNumbers: {
                    include: {
                        country: true,
                    },
                },
            },
        });
    }

    async findOneActiveProfileById(id: string): Promise<IUserProfile | null> {
        return this.databaseService.user.findUnique({
            where: { id, deletedAt: null, status: EnumUserStatus.active },
            include: {
                role: true,
                country: true,
                twoFactor: true,
                mobileNumbers: {
                    include: {
                        country: true,
                    },
                },
            },
        });
    }

    async findOneWithRoleById(id: string): Promise<IUser | null> {
        return this.databaseService.user.findUnique({
            where: { id, deletedAt: null },
            include: {
                role: true,
                twoFactor: true,
            },
        });
    }

    async findOneActiveByForgotPasswordToken(
        token: string
    ): Promise<(ForgotPassword & { user: IUser }) | null> {
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
                    status: EnumUserStatus.active,
                },
            },
            include: {
                user: {
                    include: {
                        role: true,
                        twoFactor: true,
                    },
                },
            },
        });
    }

    async findOneLatestByForgotPassword(
        userId: string
    ): Promise<ForgotPassword | null> {
        return this.databaseService.forgotPassword.findFirst({
            where: {
                userId,
                user: {
                    deletedAt: null,
                    status: EnumUserStatus.active,
                },
            },
            orderBy: {
                createdAt: EnumPaginationOrderDirectionType.desc,
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
                type: EnumVerificationType.email,
                expiredAt: {
                    gt: today,
                },
                user: {
                    deletedAt: null,
                    status: EnumUserStatus.active,
                },
            },
            include: {
                user: true,
            },
        });
    }

    async findOneLatestByVerificationEmail(
        userId: string
    ): Promise<Verification | null> {
        return this.databaseService.verification.findFirst({
            where: {
                userId,
                type: EnumVerificationType.email,
                user: {
                    deletedAt: null,
                    status: EnumUserStatus.active,
                },
            },
            orderBy: {
                createdAt: EnumPaginationOrderDirectionType.desc,
            },
        });
    }

    async findOneMobileNumber(
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
            passwordPeriodExpired,
        }: IAuthPassword,
        { id: roleId, type: roleType }: IRole,
        { ipAddress, userAgent }: IRequestLog,
        createdBy: string
    ): Promise<User> {
        const termPolicies = await this.databaseService.termPolicy.findMany({
            where: {
                type: {
                    in: [
                        EnumTermPolicyType.termsOfService,
                        EnumTermPolicyType.privacy,
                    ],
                },
                status: EnumTermPolicyStatus.published,
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
                    signUpFrom: EnumUserSignUpFrom.admin,
                    signUpWith: EnumUserSignUpWith.credential,
                    passwordCreated,
                    passwordExpired,
                    password: passwordHash,
                    passwordAttempt: 0,
                    username,
                    isVerified: roleType === EnumRoleType.user ? false : true,
                    status: EnumUserStatus.active,
                    termPolicy: {
                        [EnumTermPolicyType.cookies]: false,
                        [EnumTermPolicyType.marketing]: false,
                        [EnumTermPolicyType.privacy]: true,
                        [EnumTermPolicyType.termsOfService]: true,
                    },
                    createdBy,
                    deletedAt: null,
                    passwordHistories: {
                        create: {
                            password: passwordHash,
                            type: EnumPasswordHistoryType.admin,
                            expiredAt: passwordPeriodExpired,
                            createdAt: passwordCreated,
                            createdBy,
                        },
                    },
                    activityLogs: {
                        createMany: {
                            data: [
                                {
                                    action: EnumActivityLogAction.userCreated,
                                    ipAddress,
                                    userAgent:
                                        this.databaseUtil.toPlainObject(
                                            userAgent
                                        ),
                                    createdBy,
                                },
                                {
                                    action: EnumActivityLogAction.userSendVerificationEmail,
                                    ipAddress,
                                    userAgent:
                                        this.databaseUtil.toPlainObject(
                                            userAgent
                                        ),
                                    createdBy,
                                },
                            ],
                        },
                    },
                    twoFactor: {
                        create: {
                            enabled: false,
                            requiredSetup: false,
                            createdBy,
                        },
                    },
                },
            }),
            ...termPolicies.map(termPolicy =>
                this.databaseService.termPolicyUserAcceptance.create({
                    data: {
                        userId,
                        termPolicyId: termPolicy.id,
                        createdBy,
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
                            status === EnumUserStatus.blocked
                                ? EnumActivityLogAction.userBlocked
                                : EnumActivityLogAction.userUpdateStatus,
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
                        action: EnumActivityLogAction.userUpdateProfile,
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
                        action: EnumActivityLogAction.userUpdatePhotoProfile,
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
                status: EnumUserStatus.inactive,
                activityLogs: {
                    create: {
                        action: EnumActivityLogAction.userDeleteSelf,
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
                        createdBy: userId,
                        createdAt: deletedAt,
                    },
                },
                sessions: {
                    updateMany: {
                        where: {
                            isRevoked: false,
                            expiredAt: { gte: deletedAt },
                        },
                        data: {
                            isRevoked: true,
                            revokedAt: deletedAt,
                            updatedBy: userId,
                        },
                    },
                },
            },
        });
    }

    async existMobileNumber(
        userId: string,
        { number, countryId, phoneCode }: UserAddMobileNumberRequestDto,
        excludeId?: string
    ): Promise<{ id: string } | null> {
        return this.databaseService.userMobileNumber.findFirst({
            where: {
                number,
                countryId,
                phoneCode,
                user: {
                    id: userId,
                },
                ...(excludeId
                    ? {
                          id: { not: excludeId },
                      }
                    : {}),
            },
            select: {
                id: true,
            },
        });
    }

    async addMobileNumber(
        userId: string,
        { number, countryId, phoneCode }: UserAddMobileNumberRequestDto,
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
                        createdBy: userId,
                    },
                },
                updatedBy: userId,
                activityLogs: {
                    create: {
                        action: EnumActivityLogAction.userAddMobileNumber,
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
                        action: EnumActivityLogAction.userUpdateMobileNumber,
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
                        createdBy: userId,
                    },
                },
            },
            include: {
                mobileNumbers: {
                    where: {
                        id: mobileNumber.id,
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
    ): Promise<UserMobileNumber & { country: Country }> {
        const user = await this.databaseService.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                mobileNumbers: {
                    delete: { id: mobileNumberId },
                },
                updatedBy: userId,
                activityLogs: {
                    create: {
                        action: EnumActivityLogAction.userDeleteMobileNumber,
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
                        createdBy: userId,
                    },
                },
            },
            include: {
                mobileNumbers: {
                    where: {
                        id: mobileNumberId,
                    },
                    take: 1,
                    include: {
                        country: true,
                    },
                },
            },
        });

        return user.mobileNumbers[0];
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
                        action: EnumActivityLogAction.userClaimUsername,
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
            passwordPeriodExpired,
        }: IAuthPassword,
        { ipAddress, userAgent }: IRequestLog,
        updatedBy: string
    ): Promise<User> {
        return this.databaseService.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                password: passwordHash,
                passwordCreated,
                passwordExpired,
                passwordAttempt: 0,
                updatedBy,
                passwordHistories: {
                    create: {
                        password: passwordHash,
                        type: EnumPasswordHistoryType.admin,
                        expiredAt: passwordPeriodExpired,
                        createdAt: passwordCreated,
                        createdBy: updatedBy,
                    },
                },
                activityLogs: {
                    create: {
                        action: EnumActivityLogAction.userUpdatePasswordByAdmin,
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
                        createdBy: updatedBy,
                    },
                },
                sessions: {
                    updateMany: {
                        where: {
                            isRevoked: false,
                            expiredAt: { gte: passwordCreated },
                        },
                        data: {
                            isRevoked: true,
                            revokedAt: passwordCreated,
                            updatedBy,
                        },
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
            passwordPeriodExpired,
        }: IAuthPassword,
        { ipAddress, userAgent }: IRequestLog
    ): Promise<User> {
        return this.databaseService.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                password: passwordHash,
                passwordCreated,
                passwordExpired,
                passwordAttempt: 0,
                updatedBy: userId,
                passwordHistories: {
                    create: {
                        password: passwordHash,
                        type: EnumPasswordHistoryType.profile,
                        expiredAt: passwordPeriodExpired,
                        createdAt: passwordCreated,
                        createdBy: userId,
                    },
                },
                activityLogs: {
                    create: {
                        action: EnumActivityLogAction.userChangePassword,
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
                        createdBy: userId,
                    },
                },
                sessions: {
                    updateMany: {
                        where: {
                            isRevoked: false,
                            expiredAt: {
                                gte: passwordCreated,
                            },
                        },
                        data: {
                            isRevoked: true,
                            revokedAt: passwordCreated,
                            updatedBy: userId,
                        },
                    },
                },
            },
        });
    }

    async login(
        userId: string,
        { loginFrom, loginWith, sessionId, expiredAt, jti }: IUserLogin,
        { ipAddress, userAgent }: IRequestLog
    ): Promise<User> {
        let action: EnumActivityLogAction =
            EnumActivityLogAction.userLoginCredential;
        switch (loginWith) {
            case EnumUserLoginWith.socialApple:
                action = EnumActivityLogAction.userLoginApple;
                break;
            case EnumUserLoginWith.socialGoogle:
                action = EnumActivityLogAction.userLoginGoogle;
                break;
            case EnumUserLoginWith.credential:
            default:
                action = EnumActivityLogAction.userLoginCredential;
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
                        jti,
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
        loginWith: EnumUserLoginWith,
        {
            countryId,
            name,
            from,
            cookies,
            marketing,
        }: UserCreateSocialRequestDto,
        { ipAddress, userAgent }: IRequestLog
    ): Promise<IUser> {
        const userId = this.databaseUtil.createId();
        const signUpWith =
            loginWith === EnumUserLoginWith.socialApple
                ? EnumUserSignUpWith.socialApple
                : EnumUserSignUpWith.socialGoogle;

        const termPolicies = await this.databaseService.termPolicy.findMany({
            where: {
                type: {
                    in: [
                        EnumTermPolicyType.termsOfService,
                        EnumTermPolicyType.privacy,
                        cookies ? EnumTermPolicyType.cookies : null,
                        marketing ? EnumTermPolicyType.marketing : null,
                    ].filter(Boolean) as EnumTermPolicyType[],
                },
                status: EnumTermPolicyStatus.published,
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
                    status: EnumUserStatus.active,
                    termPolicy: {
                        [EnumTermPolicyType.cookies]: cookies,
                        [EnumTermPolicyType.marketing]: marketing,
                        [EnumTermPolicyType.privacy]: true,
                        [EnumTermPolicyType.termsOfService]: true,
                    },
                    createdBy: userId,
                    deletedAt: null,
                    activityLogs: {
                        create: {
                            action: EnumActivityLogAction.userCreated,
                            ipAddress,
                            userAgent:
                                this.databaseUtil.toPlainObject(userAgent),
                            createdBy: userId,
                        },
                    },
                    twoFactor: {
                        create: {
                            enabled: false,
                            requiredSetup: false,
                            createdBy: userId,
                        },
                    },
                },
                include: {
                    role: true,
                    twoFactor: true,
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
                        action: EnumActivityLogAction.userVerifiedEmail,
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
            cookies,
        }: UserSignUpRequestDto,
        {
            passwordCreated,
            passwordExpired,
            passwordHash,
            passwordPeriodExpired,
        }: IAuthPassword,
        { expiredAt, reference, token, type }: IUserVerificationCreate,
        { ipAddress, userAgent }: IRequestLog
    ): Promise<User> {
        const termPolicies = await this.databaseService.termPolicy.findMany({
            where: {
                type: {
                    in: [
                        EnumTermPolicyType.termsOfService,
                        EnumTermPolicyType.privacy,
                        cookies ? EnumTermPolicyType.cookies : null,
                        marketing ? EnumTermPolicyType.marketing : null,
                    ].filter(Boolean) as EnumTermPolicyType[],
                },
                status: EnumTermPolicyStatus.published,
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
                    signUpWith: EnumUserSignUpWith.credential,
                    username,
                    isVerified: false,
                    status: EnumUserStatus.active,
                    passwordCreated,
                    passwordExpired,
                    password: passwordHash,
                    passwordAttempt: 0,
                    passwordHistories: {
                        create: {
                            password: passwordHash,
                            type: EnumPasswordHistoryType.signUp,
                            expiredAt: passwordPeriodExpired,
                            createdAt: passwordCreated,
                            createdBy: userId,
                        },
                    },
                    termPolicy: {
                        [EnumTermPolicyType.cookies]: cookies,
                        [EnumTermPolicyType.marketing]: marketing,
                        [EnumTermPolicyType.privacy]: true,
                        [EnumTermPolicyType.termsOfService]: true,
                    },
                    createdBy: userId,
                    deletedAt: null,
                    activityLogs: {
                        createMany: {
                            data: [
                                {
                                    action: EnumActivityLogAction.userSignedUp,
                                    ipAddress,
                                    userAgent:
                                        this.databaseUtil.toPlainObject(
                                            userAgent
                                        ),
                                    createdBy: userId,
                                },
                                {
                                    action: EnumActivityLogAction.userSendVerificationEmail,
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
                    twoFactor: {
                        create: {
                            enabled: false,
                            requiredSetup: false,
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
                status: EnumUserStatus.active,
            },
            data: {
                activityLogs: {
                    create: {
                        action: EnumActivityLogAction.userForgotPassword,
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

    async resetPassword(
        userId: string,
        forgotPasswordId: string,
        {
            passwordCreated,
            passwordExpired,
            passwordHash,
            passwordPeriodExpired,
        }: IAuthPassword,
        { ipAddress, userAgent }: IRequestLog
    ): Promise<User> {
        return this.databaseService.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                password: passwordHash,
                passwordCreated,
                passwordExpired,
                passwordAttempt: 0,
                updatedBy: userId,
                passwordHistories: {
                    create: {
                        password: passwordHash,
                        type: EnumPasswordHistoryType.forgot,
                        expiredAt: passwordPeriodExpired,
                        createdAt: passwordCreated,
                        createdBy: userId,
                    },
                },
                activityLogs: {
                    create: {
                        action: EnumActivityLogAction.userResetPassword,
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
                        createdBy: userId,
                    },
                },
                forgotPasswords: {
                    update: {
                        where: { id: forgotPasswordId },
                        data: {
                            isUsed: true,
                            resetAt: passwordCreated,
                        },
                    },
                },
                sessions: {
                    updateMany: {
                        where: {
                            isRevoked: false,
                            expiredAt: {
                                gte: passwordCreated,
                            },
                        },
                        data: {
                            isRevoked: true,
                            revokedAt: passwordCreated,
                            updatedBy: userId,
                        },
                    },
                },
            },
        });
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
                                action: EnumActivityLogAction.userVerifiedEmail,
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
                                    createdBy: userId,
                                    createdAt: today,
                                },
                            },
                            activityLogs: {
                                create: {
                                    action: EnumActivityLogAction.userSendVerificationEmail,
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

    async refresh(
        userId: string,
        { loginFrom, loginWith, sessionId, jti }: IUserLogin,
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
                    update: {
                        where: {
                            id: sessionId,
                        },
                        data: {
                            jti,
                        },
                    },
                },
                activityLogs: {
                    create: {
                        action: EnumActivityLogAction.userRefreshToken,
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
                        createdBy: userId,
                    },
                },
            },
        });
    }

    async reachMaxPasswordAttempt(
        userId: string,
        { ipAddress, userAgent }: IRequestLog
    ): Promise<User> {
        return this.databaseService.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                status: EnumUserStatus.inactive,
                activityLogs: {
                    create: {
                        action: EnumActivityLogAction.userReachMaxPasswordAttempt,
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
                        createdBy: userId,
                    },
                },
            },
        });
    }

    async verifyTwoFactor(
        userId: string,
        { method, newBackupCodes }: IAuthTwoFactorVerifyResult,
        { ipAddress, userAgent }: IRequestLog
    ): Promise<IUser> {
        const now = this.helperService.dateCreate();

        return this.databaseService.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                twoFactor: {
                    update: {
                        lastUsedAt: this.helperService.dateCreate(),
                        ...(method === EnumAuthTwoFactorMethod.backupCodes && {
                            backupCodes: newBackupCodes,
                        }),
                    },
                },
                activityLogs: {
                    create: {
                        action: EnumActivityLogAction.userVerifyTwoFactor,
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
                        createdBy: userId,
                        createdAt: now,
                    },
                },
            },
            include: {
                role: true,
                twoFactor: true,
            },
        });
    }

    async setupTwoFactor(
        userId: string,
        secretEncrypted: string,
        iv: string,
        { ipAddress, userAgent }: IRequestLog
    ): Promise<IUser> {
        const now = this.helperService.dateCreate();

        return this.databaseService.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                twoFactor: {
                    update: {
                        secret: secretEncrypted,
                        iv,
                        updatedAt: now,
                        updatedBy: userId,
                    },
                },
                activityLogs: {
                    create: {
                        action: EnumActivityLogAction.userSetupTwoFactor,
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
                        createdBy: userId,
                        createdAt: now,
                    },
                },
            },
            include: {
                role: true,
                twoFactor: true,
            },
        });
    }

    async enableTwoFactor(
        userId: string,
        backupCodesHashed: string[],
        { ipAddress, userAgent }: IRequestLog
    ): Promise<IUser> {
        const now = this.helperService.dateCreate();

        return this.databaseService.$transaction<IUser>(async tx => {
            const twoFactor = await tx.twoFactor.findUnique({
                where: { userId },
                select: {
                    confirmedAt: true,
                },
            });

            return tx.user.update({
                where: { id: userId, deletedAt: null },
                data: {
                    twoFactor: {
                        update: {
                            enabled: true,
                            confirmedAt: twoFactor.confirmedAt ?? now,
                            backupCodes: backupCodesHashed,
                            lastUsedAt: now,
                            updatedAt: now,
                            updatedBy: userId,
                        },
                    },
                    activityLogs: {
                        create: {
                            action: EnumActivityLogAction.userEnableTwoFactor,
                            ipAddress,
                            userAgent:
                                this.databaseUtil.toPlainObject(userAgent),
                            createdBy: userId,
                            createdAt: now,
                        },
                    },
                },
                include: {
                    role: true,
                    twoFactor: true,
                },
            });
        });
    }

    async disableTwoFactor(
        userId: string,
        { ipAddress, userAgent }: IRequestLog
    ): Promise<IUser> {
        const now = this.helperService.dateCreate();

        return this.databaseService.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                twoFactor: {
                    update: {
                        enabled: false,
                        requiredSetup: false,
                        backupCodes: [],
                        lastUsedAt: now,
                        secret: null,
                        iv: null,
                        updatedBy: userId,
                        updatedAt: now,
                    },
                },
                activityLogs: {
                    create: {
                        action: EnumActivityLogAction.userDisableTwoFactor,
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
                        createdBy: userId,
                        createdAt: now,
                    },
                },
            },
            include: {
                role: true,
                twoFactor: true,
            },
        });
    }

    async regenerateTwoFactorBackupCodes(
        userId: string,
        backupCodesHashed: string[],
        { ipAddress, userAgent }: IRequestLog
    ): Promise<IUser> {
        const now = this.helperService.dateCreate();

        return this.databaseService.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                twoFactor: {
                    update: {
                        backupCodes: backupCodesHashed,
                        updatedBy: userId,
                        updatedAt: now,
                    },
                },
                activityLogs: {
                    create: {
                        action: EnumActivityLogAction.userRegenerateTwoFactorBackupCodes,
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
                        createdBy: userId,
                        createdAt: now,
                    },
                },
            },
            include: {
                role: true,
                twoFactor: true,
            },
        });
    }

    async resetTwoFactorByAdmin(
        userId: string,
        updatedBy: string,
        { ipAddress, userAgent }: IRequestLog
    ): Promise<IUser> {
        const now = this.helperService.dateCreate();

        return this.databaseService.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                twoFactor: {
                    update: {
                        requiredSetup: true,
                        backupCodes: [],
                        secret: null,
                        iv: null,
                        updatedBy: updatedBy,
                        updatedAt: now,
                    },
                },
                activityLogs: {
                    create: {
                        action: EnumActivityLogAction.adminUserResetTwoFactor,
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
                        createdBy: updatedBy,
                        createdAt: now,
                    },
                },
                sessions: {
                    updateMany: {
                        where: { isRevoked: false, expiredAt: { gte: now } },
                        data: { isRevoked: true, revokedAt: now, updatedBy },
                    },
                },
            },
            include: {
                role: true,
                twoFactor: true,
            },
        });
    }

    async increaseTwoFactorAttempt(userId: string): Promise<User> {
        return this.databaseService.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                twoFactor: {
                    update: {
                        attempt: {
                            increment: 1,
                        },
                    },
                },
            },
        });
    }

    async resetTwoFactorAttempt(userId: string): Promise<User> {
        return this.databaseService.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                twoFactor: {
                    update: {
                        attempt: 0,
                    },
                },
            },
        });
    }

    async importByAdmin(
        data: UserImportRequestDto[],
        usernames: string[],
        passwordHasheds: IAuthPassword[],
        countryId: string,
        { id: roleId, type: roleType }: IRole,
        { ipAddress, userAgent }: IRequestLog,
        createdBy: string
    ): Promise<User[]> {
        const termPolicies = await this.databaseService.termPolicy.findMany({
            where: {
                type: {
                    in: [
                        EnumTermPolicyType.termsOfService,
                        EnumTermPolicyType.privacy,
                    ],
                },
                status: EnumTermPolicyStatus.published,
            },
            select: {
                id: true,
            },
        });

        const users = await this.databaseService.$transaction(
            async (tx: Prisma.TransactionClient) => {
                const usersToCreate: Prisma.PrismaPromise<User>[] = [];
                const termPolicyUserAcceptancesToCreate: Prisma.PrismaPromise<TermPolicyUserAcceptance>[] =
                    [];

                for (const [index, { email, name }] of data.entries()) {
                    const userId = this.databaseUtil.createId();
                    const username = usernames[index];
                    const {
                        passwordCreated,
                        passwordExpired,
                        passwordHash,
                        passwordPeriodExpired,
                    } = passwordHasheds[index];

                    usersToCreate.push(
                        tx.user.create({
                            data: {
                                id: userId,
                                email,
                                countryId,
                                roleId,
                                name,
                                signUpFrom: EnumUserSignUpFrom.admin,
                                signUpWith: EnumUserSignUpWith.credential,
                                passwordCreated,
                                passwordExpired,
                                password: passwordHash,
                                passwordAttempt: 0,
                                username,
                                isVerified:
                                    roleType === EnumRoleType.user
                                        ? false
                                        : true,
                                status: EnumUserStatus.active,
                                termPolicy: {
                                    [EnumTermPolicyType.cookies]: false,
                                    [EnumTermPolicyType.marketing]: false,
                                    [EnumTermPolicyType.privacy]: true,
                                    [EnumTermPolicyType.termsOfService]: true,
                                },
                                createdBy,
                                deletedAt: null,
                                passwordHistories: {
                                    create: {
                                        password: passwordHash,
                                        type: EnumPasswordHistoryType.admin,
                                        expiredAt: passwordPeriodExpired,
                                        createdAt: passwordCreated,
                                        createdBy,
                                    },
                                },
                                activityLogs: {
                                    createMany: {
                                        data: [
                                            {
                                                action: EnumActivityLogAction.userCreated,
                                                ipAddress,
                                                userAgent:
                                                    this.databaseUtil.toPlainObject(
                                                        userAgent
                                                    ),
                                                createdBy,
                                            },
                                            {
                                                action: EnumActivityLogAction.userSendVerificationEmail,
                                                ipAddress,
                                                userAgent:
                                                    this.databaseUtil.toPlainObject(
                                                        userAgent
                                                    ),
                                                createdBy,
                                            },
                                        ],
                                    },
                                },
                                twoFactor: {
                                    create: {
                                        enabled: false,
                                        requiredSetup: false,
                                        createdBy,
                                    },
                                },
                            },
                        })
                    );
                    termPolicyUserAcceptancesToCreate.push(
                        ...termPolicies.map(termPolicy =>
                            tx.termPolicyUserAcceptance.create({
                                data: {
                                    userId,
                                    termPolicyId: termPolicy.id,
                                    createdBy,
                                },
                            })
                        )
                    );
                }

                const users = await Promise.all(usersToCreate);
                await Promise.all(termPolicyUserAcceptancesToCreate);

                return users;
            }
        );

        return users;
    }
}
