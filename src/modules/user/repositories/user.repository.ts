import { IAwsS3 } from '@common/aws/interfaces/aws.interface';
import { DatabaseUniqueValueGenerationFailedException } from '@common/database/exceptions/database.unique-value-generation-failed.exception';
import { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import {
    IPaginationEqual,
    IPaginationIn,
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
import { DeviceRequestDto } from '@modules/device/dtos/request/device.request.dto';
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
    IUserLoginResult,
    IUserProfile,
    IUserSignUpWorkspaceContext,
    IUserVerificationCreate,
} from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import {
    Country,
    EnumActivityLogAction,
    EnumDeviceNotificationProvider,
    EnumDevicePlatform,
    EnumNotificationChannel,
    EnumNotificationType,
    EnumPasswordHistoryType,
    EnumRoleType,
    EnumTermPolicyStatus,
    EnumTermPolicyType,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumVerificationType,
    EnumWorkspaceInviteStatus,
    EnumWorkspaceMemberRole,
    ForgotPassword,
    Prisma,
    User,
    UserMobileNumber,
    Verification,
} from '@generated/prisma-client';
import { ActivityLogUtil } from '@modules/activity-log/utils/activity-log.util';
import { EnumUserSignUpWorkspaceContextType } from '@modules/user/enums/user.enum';
import {
    IUserSignUpWorkspaceInvite,
    IUserSignUpWorkspacePersonal,
} from '@modules/user/interfaces/user.interface';
import { WorkspaceActiveFilter } from '@modules/workspace/constants/workspace.constant';

@Injectable()
export class UserRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly activityLogUtil: ActivityLogUtil,
        private readonly paginationService: PaginationService,
        private readonly helperDateService: HelperDateService,
        private readonly helperHashService: HelperHashService
    ) {}

    async findWithPaginationOffset(
        {
            where,
            ...params
        }: IPaginationQueryOffsetParams<Prisma.UserWhereInput>,
        status?: Record<string, IPaginationIn>,
        roleId?: Record<string, IPaginationEqual>,
        countryId?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<IUser>> {
        return this.paginationService.offset<IUser, Prisma.UserWhereInput>(
            this.databaseService.client.user,
            {
                ...params,
                where: {
                    ...where,
                    ...status,
                    ...countryId,
                    ...roleId,
                    deletedAt: null,
                },
                include: {
                    role: true,
                    twoFactor: true,
                },
            }
        );
    }

    async findByEmails(emails: string[]): Promise<IUser[]> {
        return this.databaseService.client.user.findMany({
            where: {
                email: { in: emails },
            },
            include: {
                role: true,
                twoFactor: true,
            },
        });
    }

    async findByUsernames(usernames: string[]): Promise<IUser[]> {
        return this.databaseService.client.user.findMany({
            where: {
                username: { in: usernames },
            },
            include: {
                role: true,
                twoFactor: true,
            },
        });
    }

    async findExport(
        status?: Record<string, IPaginationIn>,
        roleId?: Record<string, IPaginationEqual>,
        countryId?: Record<string, IPaginationEqual>
    ): Promise<IUser[]> {
        return this.databaseService.client.user.findMany({
            where: {
                ...status,
                ...countryId,
                ...roleId,
                deletedAt: null,
            },
            include: {
                role: true,
                twoFactor: true,
            },
        });
    }

    async findActive(): Promise<
        {
            id: string;
            email: string;
            username: string;
        }[]
    > {
        return this.databaseService.client.user.findMany({
            where: {
                status: EnumUserStatus.active,
                deletedAt: null,
            },
            select: {
                id: true,
                username: true,
                email: true,
            },
        });
    }

    async findOneById(id: string): Promise<User | null> {
        return this.databaseService.client.user.findUnique({
            where: { id, deletedAt: null },
        });
    }

    async findOneActiveById(id: string): Promise<User | null> {
        return this.databaseService.client.user.findUnique({
            where: { id, deletedAt: null, status: EnumUserStatus.active },
        });
    }

    async findOneActiveByEmail(email: string): Promise<User | null> {
        return this.databaseService.client.user.findUnique({
            where: { email, deletedAt: null, status: EnumUserStatus.active },
        });
    }

    async findOneWithRoleByEmail(email: string): Promise<IUser | null> {
        return this.databaseService.client.user.findUnique({
            where: { email, deletedAt: null },
            include: {
                role: true,
                twoFactor: true,
            },
        });
    }

    async findOneProfileById(id: string): Promise<IUserProfile | null> {
        return this.databaseService.client.user.findUnique({
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
        return this.databaseService.client.user.findUnique({
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
        return this.databaseService.client.user.findUnique({
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
        const today = this.helperDateService.create();

        return this.databaseService.client.forgotPassword.findFirst({
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
        return this.databaseService.client.forgotPassword.findFirst({
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
    ): Promise<Verification | null> {
        const today = this.helperDateService.create();

        return this.databaseService.client.verification.findFirst({
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
        });
    }

    async findOneLatestByVerificationEmail(
        userId: string
    ): Promise<Verification | null> {
        return this.databaseService.client.verification.findFirst({
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
        return this.databaseService.client.userMobileNumber.findFirst({
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
        return this.databaseService.client.user.findFirst({
            where: { email: email },
            select: { id: true },
        });
    }

    async existByUsername(username: string): Promise<{ id: string } | null> {
        return this.databaseService.client.user.findUnique({
            where: { username },
            select: { id: true },
        });
    }

    async createByAdmin(
        userId: string,
        { username, countryId, email, name }: UserCreateRequestDto,
        {
            passwordCreated,
            passwordExpired,
            passwordHash,
            passwordPeriodExpired,
        }: IAuthPassword,
        { id: roleId, type: roleType }: IRole,
        workspaceContext: IUserSignUpWorkspacePersonal,
        requestLog: IRequestLog,
        createdBy: string
    ): Promise<User> {
        const { ipAddress, userAgent, geoLocation } = requestLog;

        return this.databaseService.client.$transaction(
            async tx => {
                const termPolicies = await tx.termPolicy.findMany({
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

                const createdUser = await tx.user.create({
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
                            roleType === EnumRoleType.user ? false : true,
                        status: EnumUserStatus.active,
                        lastWorkspaceId: workspaceContext.workspaceId,
                        lastWorkspaceChangedAt: this.helperDateService.create(),
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
                                        description:
                                            this.activityLogUtil.getDescription(
                                                EnumActivityLogAction.userCreated
                                            ),
                                        ipAddress,
                                        userAgent:
                                            this.databaseUtil.toPlainObject(
                                                userAgent
                                            ),
                                        geoLocation:
                                            this.databaseUtil.toPlainObject(
                                                geoLocation
                                            ),
                                        createdBy,
                                    },
                                    {
                                        action: EnumActivityLogAction.userSendVerificationEmail,
                                        description:
                                            this.activityLogUtil.getDescription(
                                                EnumActivityLogAction.userSendVerificationEmail
                                            ),
                                        ipAddress,
                                        userAgent:
                                            this.databaseUtil.toPlainObject(
                                                userAgent
                                            ),
                                        geoLocation:
                                            this.databaseUtil.toPlainObject(
                                                geoLocation
                                            ),
                                        createdBy,
                                    },
                                    this.buildWorkspaceSignUpActivityLog(
                                        workspaceContext,
                                        requestLog,
                                        createdBy
                                    ),
                                ],
                            },
                        },
                        notificationSettings: {
                            createMany: {
                                data: Object.values(EnumNotificationChannel)
                                    .map(channel =>
                                        Object.values(EnumNotificationType).map(
                                            type => ({
                                                channel,
                                                type,
                                                isActive: true,
                                            })
                                        )
                                    )
                                    .flat(),
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
                });

                await Promise.all([
                    ...this.buildWorkspaceSignUpOperations(
                        tx,
                        userId,
                        workspaceContext,
                        createdBy
                    ),
                    ...termPolicies.map(termPolicy =>
                        tx.termPolicyUserAcceptance.create({
                            data: {
                                userId,
                                termPolicyId: termPolicy.id,
                                createdBy,
                            },
                        })
                    ),
                ]);

                return createdUser;
            },
            { timeout: 10_000 }
        );
    }

    async updateStatusByAdmin(
        id: string,
        { status }: UserUpdateStatusRequestDto,
        { ipAddress, userAgent, geoLocation }: IRequestLog,
        updatedBy: string
    ): Promise<User> {
        const action =
            status === EnumUserStatus.blocked
                ? EnumActivityLogAction.userBlocked
                : EnumActivityLogAction.userUpdateStatus;
        return this.databaseService.client.user.update({
            where: { id, deletedAt: null },
            data: {
                status,
                updatedBy,
                activityLogs: {
                    create: {
                        action,
                        description:
                            this.activityLogUtil.getDescription(action),
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
                        geoLocation:
                            this.databaseUtil.toPlainObject(geoLocation),
                        createdBy: updatedBy,
                    },
                },
            },
        });
    }

    async updateProfile(
        userId: string,
        { countryId, ...data }: UserUpdateProfileRequestDto,
        { ipAddress, userAgent, geoLocation }: IRequestLog
    ): Promise<User> {
        return this.databaseService.client.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                ...data,
                countryId,
                updatedBy: userId,
                activityLogs: {
                    create: {
                        action: EnumActivityLogAction.userUpdateProfile,
                        description: this.activityLogUtil.getDescription(
                            EnumActivityLogAction.userUpdateProfile
                        ),
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
                        geoLocation:
                            this.databaseUtil.toPlainObject(geoLocation),
                        createdBy: userId,
                    },
                },
            },
        });
    }

    async updatePhotoProfile(
        userId: string,
        photo: IAwsS3,
        { ipAddress, userAgent, geoLocation }: IRequestLog
    ): Promise<User> {
        return this.databaseService.client.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                photo: this.databaseUtil.toPlainObject(photo),
                updatedBy: userId,
                activityLogs: {
                    create: {
                        action: EnumActivityLogAction.userUpdatePhotoProfile,
                        description: this.activityLogUtil.getDescription(
                            EnumActivityLogAction.userUpdatePhotoProfile
                        ),
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
                        geoLocation:
                            this.databaseUtil.toPlainObject(geoLocation),
                        createdBy: userId,
                    },
                },
            },
        });
    }

    async deleteSelf(
        userId: string,
        { ipAddress, userAgent, geoLocation }: IRequestLog
    ): Promise<User> {
        const deletedAt = this.helperDateService.create();
        return this.databaseService.client.user.softDelete({
            where: { id: userId, deletedAt: null },
            data: {
                deletedAt,
                status: EnumUserStatus.inactive,
                activityLogs: {
                    create: {
                        action: EnumActivityLogAction.userDeleteSelf,
                        description: this.activityLogUtil.getDescription(
                            EnumActivityLogAction.userDeleteSelf
                        ),
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
                        geoLocation:
                            this.databaseUtil.toPlainObject(geoLocation),
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
                            revokedById: userId,
                            updatedBy: userId,
                        },
                    },
                },
            },
        }) as Promise<User>;
    }

    async existMobileNumber(
        userId: string,
        { number, countryId, phoneCode }: UserAddMobileNumberRequestDto,
        excludeId?: string
    ): Promise<{ id: string } | null> {
        return this.databaseService.client.userMobileNumber.findFirst({
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
        { ipAddress, userAgent, geoLocation }: IRequestLog
    ): Promise<UserMobileNumber & { country: Country }> {
        const updated = await this.databaseService.client.user.update({
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
                        description: this.activityLogUtil.getDescription(
                            EnumActivityLogAction.userAddMobileNumber
                        ),
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
                        geoLocation:
                            this.databaseUtil.toPlainObject(geoLocation),
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
        { ipAddress, userAgent, geoLocation }: IRequestLog
    ): Promise<UserMobileNumber & { country: Country }> {
        const updated = await this.databaseService.client.user.update({
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
                        description: this.activityLogUtil.getDescription(
                            EnumActivityLogAction.userUpdateMobileNumber
                        ),
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
                        geoLocation:
                            this.databaseUtil.toPlainObject(geoLocation),
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
        { ipAddress, userAgent, geoLocation }: IRequestLog
    ): Promise<UserMobileNumber & { country: Country }> {
        const user = await this.databaseService.client.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                mobileNumbers: {
                    delete: { id: mobileNumberId },
                },
                updatedBy: userId,
                activityLogs: {
                    create: {
                        action: EnumActivityLogAction.userDeleteMobileNumber,
                        description: this.activityLogUtil.getDescription(
                            EnumActivityLogAction.userDeleteMobileNumber
                        ),
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
                        geoLocation:
                            this.databaseUtil.toPlainObject(geoLocation),
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
        { ipAddress, userAgent, geoLocation }: IRequestLog
    ): Promise<User> {
        return this.databaseService.client.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                username,
                updatedBy: userId,
                activityLogs: {
                    create: {
                        action: EnumActivityLogAction.userClaimUsername,
                        description: this.activityLogUtil.getDescription(
                            EnumActivityLogAction.userClaimUsername
                        ),
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
                        geoLocation:
                            this.databaseUtil.toPlainObject(geoLocation),
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
        { ipAddress, userAgent, geoLocation }: IRequestLog,
        updatedBy: string
    ): Promise<User> {
        return this.databaseService.client.user.update({
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
                        description: this.activityLogUtil.getDescription(
                            EnumActivityLogAction.userUpdatePasswordByAdmin
                        ),
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
                        geoLocation:
                            this.databaseUtil.toPlainObject(geoLocation),
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
                            revokedById: updatedBy,
                            updatedBy: userId,
                        },
                    },
                },
            },
        });
    }

    async increasePasswordAttempt(userId: string): Promise<User> {
        return this.databaseService.client.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                passwordAttempt: {
                    increment: 1,
                },
            },
        });
    }

    async resetPasswordAttempt(userId: string): Promise<User> {
        return this.databaseService.client.user.update({
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
        { ipAddress, userAgent, geoLocation }: IRequestLog
    ): Promise<User> {
        return this.databaseService.client.user.update({
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
                        description: this.activityLogUtil.getDescription(
                            EnumActivityLogAction.userChangePassword
                        ),
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
                        geoLocation:
                            this.databaseUtil.toPlainObject(geoLocation),
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
                            revokedById: userId,
                            updatedBy: userId,
                        },
                    },
                },
            },
        });
    }

    async login(
        userId: string,
        { fingerprint, name, notificationToken, platform }: DeviceRequestDto,
        { loginFrom, loginWith, sessionId, expiredAt, jti }: IUserLogin,
        { ipAddress, userAgent, geoLocation }: IRequestLog
    ): Promise<IUserLoginResult> {
        const today = this.helperDateService.create();

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

        let notificationProvider: EnumDeviceNotificationProvider | null = null;
        platform = platform ?? EnumDevicePlatform.web;
        switch (platform) {
            case EnumDevicePlatform.android:
                notificationProvider = EnumDeviceNotificationProvider.fcm;
                break;
            case EnumDevicePlatform.ios:
                notificationProvider = EnumDeviceNotificationProvider.apns;
                break;
            default:
                notificationProvider = null;
                break;
        }

        return this.databaseService.client.$transaction(async tx => {
            const device = await tx.device.upsert({
                where: {
                    fingerprint,
                },
                update: {
                    name,
                    platform,
                    notificationToken,
                    lastActiveAt: today,
                    notificationProvider,
                    updatedBy: userId,
                },
                create: {
                    fingerprint,
                    name,
                    platform,
                    notificationToken,
                    lastActiveAt: today,
                    notificationProvider,
                    createdBy: userId,
                },
            });

            let isNewDevice = false;
            let sessionShouldBeInactive: { id: string }[] = [];
            let deviceOwnership = await tx.deviceOwnership.findFirst({
                where: {
                    deviceId: device.id,
                    userId,
                    isRevoked: false,
                },
            });
            if (!deviceOwnership) {
                isNewDevice = true;
                deviceOwnership = await tx.deviceOwnership.create({
                    data: {
                        userId,
                        createdBy: userId,
                        lastActiveAt: today,
                        isRevoked: false,
                        deviceId: device.id,
                    },
                });
            } else {
                const activeSessions = await tx.session.findMany({
                    where: {
                        deviceOwnershipId: deviceOwnership.id,
                        isRevoked: false,
                        expiredAt: { gte: today },
                    },
                });

                sessionShouldBeInactive = activeSessions.map(session => ({
                    id: session.id,
                }));

                [deviceOwnership] = await Promise.all([
                    tx.deviceOwnership.update({
                        where: { id: deviceOwnership.id },
                        data: {
                            lastActiveAt: today,
                            updatedBy: userId,
                        },
                    }),
                    tx.session.updateMany({
                        where: {
                            id: { in: activeSessions.map(s => s.id) },
                        },
                        data: {
                            isRevoked: true,
                            revokedAt: today,
                            revokedById: userId,
                            updatedBy: userId,
                        },
                    }),
                ]);
            }

            const user = await tx.user.update({
                where: { id: userId, deletedAt: null },
                data: {
                    lastLoginAt: today,
                    lastIPAddress: ipAddress,
                    lastLoginFrom: loginFrom,
                    lastLoginWith: loginWith,
                    updatedBy: userId,
                    activityLogs: {
                        create: {
                            action,
                            description:
                                this.activityLogUtil.getDescription(action),
                            ipAddress,
                            userAgent:
                                this.databaseUtil.toPlainObject(userAgent),
                            geoLocation:
                                this.databaseUtil.toPlainObject(geoLocation),
                            createdBy: userId,
                        },
                    },
                    sessions: {
                        create: {
                            id: sessionId,
                            jti,
                            expiredAt,
                            isRevoked: false,
                            ipAddress,
                            deviceOwnershipId: deviceOwnership.id,
                            userAgent:
                                this.databaseUtil.toPlainObject(userAgent),
                            geoLocation:
                                this.databaseUtil.toPlainObject(geoLocation),
                            createdBy: userId,
                        },
                    },
                },
            });

            const result: IUserLoginResult = {
                device,
                deviceOwnership,
                isNewDevice,
                user,
                sessionShouldBeInactive,
            };

            return result;
        });
    }

    async resolveWorkspaceSignUpContext(
        workspaceInviteToken: string | null,
        email: string,
        personalContext: IUserSignUpWorkspacePersonal
    ): Promise<IUserSignUpWorkspaceContext | null> {
        return workspaceInviteToken
            ? this.resolveInviteWorkspaceContext(workspaceInviteToken, email)
            : personalContext;
    }

    /** Resolves a sign-up invite token to its workspace context, accepting only pending, unexpired invites whose workspace is still active. */
    private async resolveInviteWorkspaceContext(
        token: string,
        email: string
    ): Promise<IUserSignUpWorkspaceInvite | null> {
        const hashedToken = this.helperHashService.sha256Hash(token);
        const today = this.helperDateService.create();

        const invite =
            await this.databaseService.client.workspaceInvite.findFirst({
                where: {
                    token: hashedToken,
                    status: EnumWorkspaceInviteStatus.pending,
                    expiredAt: { gt: today },
                    workspace: { OR: WorkspaceActiveFilter },
                },
            });

        if (!invite || invite.email.toLowerCase() !== email.toLowerCase()) {
            return null;
        }

        return {
            type: EnumUserSignUpWorkspaceContextType.invite,
            workspaceId: invite.workspaceId,
            workspaceInviteId: invite.id,
            workspaceMemberRole: invite.workspaceRole,
            projectId: invite.projectId ?? undefined,
            projectMemberRole: invite.projectRole ?? undefined,
        };
    }

    /** Picks one workspace slug per row: the first candidate free in the database and not already handed out earlier in the same call. */
    async findFreeWorkspaceSlugs(
        candidatesPerRow: string[][]
    ): Promise<string[]> {
        const slugs: string[] = [];

        for (const candidates of candidatesPerRow) {
            let picked: string | null = null;

            for (const slug of candidates) {
                if (slugs.includes(slug)) {
                    continue;
                }

                const taken =
                    await this.databaseService.client.workspace.findFirst({
                        where: { slug },
                        select: { id: true },
                    });
                if (!taken) {
                    picked = slug;
                    break;
                }
            }

            if (!picked) {
                throw new DatabaseUniqueValueGenerationFailedException();
            }

            slugs.push(picked);
        }

        return slugs;
    }

    private buildWorkspaceSignUpOperations(
        tx: IDatabaseTransactionClient,
        userId: string,
        workspaceContext: IUserSignUpWorkspaceContext,
        actorId: string
    ): Prisma.PrismaPromise<unknown>[] {
        if (
            workspaceContext.type ===
            EnumUserSignUpWorkspaceContextType.personal
        ) {
            return [
                tx.workspace.create({
                    data: {
                        id: workspaceContext.workspaceId,
                        name: workspaceContext.name,
                        slug: workspaceContext.slug,
                        createdBy: actorId,
                        deletedAt: null,
                    },
                }),
                tx.workspaceMember.create({
                    data: {
                        workspaceId: workspaceContext.workspaceId,
                        userId,
                        role: EnumWorkspaceMemberRole.owner,
                        createdBy: actorId,
                    },
                }),
            ];
        }

        const operations: Prisma.PrismaPromise<unknown>[] = [
            tx.workspaceMember.create({
                data: {
                    workspaceId: workspaceContext.workspaceId,
                    userId,
                    role: workspaceContext.workspaceMemberRole,
                    createdBy: actorId,
                },
            }),
            tx.workspaceInvite.update({
                where: { id: workspaceContext.workspaceInviteId },
                data: {
                    status: EnumWorkspaceInviteStatus.accepted,
                    acceptedAt: this.helperDateService.create(),
                    acceptedByUserId: userId,
                    updatedBy: actorId,
                },
            }),
        ];

        if (workspaceContext.projectId && workspaceContext.projectMemberRole) {
            operations.push(
                tx.projectMember.create({
                    data: {
                        projectId: workspaceContext.projectId,
                        userId,
                        role: workspaceContext.projectMemberRole,
                        createdBy: actorId,
                    },
                })
            );
        }

        return operations;
    }

    private buildWorkspaceSignUpActivityLog(
        workspaceContext: IUserSignUpWorkspaceContext,
        { ipAddress, userAgent, geoLocation }: IRequestLog,
        actorId: string
    ): Prisma.ActivityLogCreateManyUserInput {
        const action =
            workspaceContext.type ===
            EnumUserSignUpWorkspaceContextType.personal
                ? EnumActivityLogAction.workspaceCreated
                : EnumActivityLogAction.workspaceInviteAccepted;

        return {
            action,
            description: this.activityLogUtil.getDescription(action),
            workspaceId: workspaceContext.workspaceId,
            ipAddress,
            userAgent: this.databaseUtil.toPlainObject(userAgent),
            geoLocation: this.databaseUtil.toPlainObject(geoLocation),
            createdBy: actorId,
        };
    }

    async createBySocial(
        email: string,
        roleId: string,
        loginWith: EnumUserLoginWith,
        {
            username,
            countryId,
            name,
            from,
            cookies,
            marketing,
        }: UserCreateSocialRequestDto,
        requestLog: IRequestLog,
        workspaceContext: IUserSignUpWorkspaceContext
    ): Promise<IUser> {
        const { ipAddress, userAgent, geoLocation } = requestLog;
        const userId = this.databaseUtil.createId();
        const signUpWith =
            loginWith === EnumUserLoginWith.socialApple
                ? EnumUserSignUpWith.socialApple
                : EnumUserSignUpWith.socialGoogle;

        return this.databaseService.client.$transaction(
            async tx => {
                const termPolicies = await tx.termPolicy.findMany({
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

                const createdUser = await tx.user.create({
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
                        lastWorkspaceId: workspaceContext.workspaceId,
                        lastWorkspaceChangedAt: this.helperDateService.create(),
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
                                        action: EnumActivityLogAction.userCreated,
                                        description:
                                            this.activityLogUtil.getDescription(
                                                EnumActivityLogAction.userCreated
                                            ),
                                        ipAddress,
                                        userAgent:
                                            this.databaseUtil.toPlainObject(
                                                userAgent
                                            ),
                                        geoLocation:
                                            this.databaseUtil.toPlainObject(
                                                geoLocation
                                            ),
                                        createdBy: userId,
                                    },
                                    this.buildWorkspaceSignUpActivityLog(
                                        workspaceContext,
                                        requestLog,
                                        userId
                                    ),
                                ],
                            },
                        },
                        notificationSettings: {
                            createMany: {
                                data: Object.values(EnumNotificationChannel)
                                    .map(channel =>
                                        Object.values(EnumNotificationType).map(
                                            type => ({
                                                channel,
                                                type,
                                                isActive: true,
                                            })
                                        )
                                    )
                                    .flat(),
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
                });

                await Promise.all([
                    ...this.buildWorkspaceSignUpOperations(
                        tx,
                        userId,
                        workspaceContext,
                        userId
                    ),
                    ...termPolicies.map(termPolicy =>
                        tx.termPolicyUserAcceptance.create({
                            data: {
                                userId,
                                termPolicyId: termPolicy.id,
                                createdBy: userId,
                            },
                        })
                    ),
                ]);

                return createdUser;
            },
            { timeout: 10_000 }
        );
    }

    async verify(
        userId: string,
        { ipAddress, userAgent, geoLocation }: IRequestLog
    ): Promise<User> {
        return this.databaseService.client.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                isVerified: true,
                updatedBy: userId,
                activityLogs: {
                    create: {
                        action: EnumActivityLogAction.userVerifiedEmail,
                        description: this.activityLogUtil.getDescription(
                            EnumActivityLogAction.userVerifiedEmail
                        ),
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
                        geoLocation:
                            this.databaseUtil.toPlainObject(geoLocation),
                        createdBy: userId,
                    },
                },
            },
        });
    }

    async signUp(
        userId: string,
        roleId: string,
        {
            username,
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
        { expiredAt, reference, hashedToken, type }: IUserVerificationCreate,
        requestLog: IRequestLog,
        workspaceContext: IUserSignUpWorkspaceContext
    ): Promise<User> {
        const { ipAddress, userAgent, geoLocation } = requestLog;

        return this.databaseService.client.$transaction(
            async tx => {
                const termPolicies = await tx.termPolicy.findMany({
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

                const createdUser = await tx.user.create({
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
                        lastWorkspaceId: workspaceContext.workspaceId,
                        lastWorkspaceChangedAt: this.helperDateService.create(),
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
                                        description:
                                            this.activityLogUtil.getDescription(
                                                EnumActivityLogAction.userSignedUp
                                            ),
                                        ipAddress,
                                        userAgent:
                                            this.databaseUtil.toPlainObject(
                                                userAgent
                                            ),
                                        geoLocation:
                                            this.databaseUtil.toPlainObject(
                                                geoLocation
                                            ),
                                        createdBy: userId,
                                    },
                                    {
                                        action: EnumActivityLogAction.userSendVerificationEmail,
                                        description:
                                            this.activityLogUtil.getDescription(
                                                EnumActivityLogAction.userSendVerificationEmail
                                            ),
                                        ipAddress,
                                        userAgent:
                                            this.databaseUtil.toPlainObject(
                                                userAgent
                                            ),
                                        geoLocation:
                                            this.databaseUtil.toPlainObject(
                                                geoLocation
                                            ),
                                        createdBy: userId,
                                    },
                                    this.buildWorkspaceSignUpActivityLog(
                                        workspaceContext,
                                        requestLog,
                                        userId
                                    ),
                                ],
                            },
                        },
                        notificationSettings: {
                            createMany: {
                                data: Object.values(EnumNotificationChannel)
                                    .map(channel =>
                                        Object.values(EnumNotificationType).map(
                                            type => ({
                                                channel,
                                                type,
                                                isActive: true,
                                            })
                                        )
                                    )
                                    .flat(),
                            },
                        },
                        verifications: {
                            create: {
                                expiredAt,
                                reference,
                                token: hashedToken,
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
                });

                await Promise.all([
                    ...this.buildWorkspaceSignUpOperations(
                        tx,
                        userId,
                        workspaceContext,
                        userId
                    ),
                    ...termPolicies.map(termPolicy =>
                        tx.termPolicyUserAcceptance.create({
                            data: {
                                userId,
                                termPolicyId: termPolicy.id,
                                createdBy: userId,
                            },
                        })
                    ),
                ]);

                return createdUser;
            },
            { timeout: 10_000 }
        );
    }

    async forgotPassword(
        userId: string,
        email: string,
        { expiredAt, reference, hashedToken }: IUserForgotPasswordCreate,
        { ipAddress, userAgent, geoLocation }: IRequestLog
    ): Promise<void> {
        await this.databaseService.client.user.update({
            where: {
                id: userId,
                deletedAt: null,
                status: EnumUserStatus.active,
            },
            data: {
                activityLogs: {
                    create: {
                        action: EnumActivityLogAction.userForgotPassword,
                        description: this.activityLogUtil.getDescription(
                            EnumActivityLogAction.userForgotPassword
                        ),
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
                        geoLocation:
                            this.databaseUtil.toPlainObject(geoLocation),
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
                        token: hashedToken,
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
        { ipAddress, userAgent, geoLocation }: IRequestLog
    ): Promise<User> {
        return this.databaseService.client.user.update({
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
                        description: this.activityLogUtil.getDescription(
                            EnumActivityLogAction.userResetPassword
                        ),
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
                        geoLocation:
                            this.databaseUtil.toPlainObject(geoLocation),
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
                            revokedById: userId,
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
        { ipAddress, userAgent, geoLocation }: IRequestLog
    ): Promise<Verification> {
        const today = this.helperDateService.create();

        return this.databaseService.client.verification.update({
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
                                description:
                                    this.activityLogUtil.getDescription(
                                        EnumActivityLogAction.userVerifiedEmail
                                    ),
                                ipAddress,
                                userAgent:
                                    this.databaseUtil.toPlainObject(userAgent),
                                geoLocation:
                                    this.databaseUtil.toPlainObject(
                                        geoLocation
                                    ),
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
        { expiredAt, reference, hashedToken, type }: IUserVerificationCreate,
        { ipAddress, userAgent, geoLocation }: IRequestLog
    ): Promise<User> {
        const today = this.helperDateService.create();

        return this.databaseService.client.$transaction(async tx => {
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
                                token: hashedToken,
                                type,
                                to: userEmail,
                                createdBy: userId,
                                createdAt: today,
                            },
                        },
                        activityLogs: {
                            create: {
                                action: EnumActivityLogAction.userSendVerificationEmail,
                                description:
                                    this.activityLogUtil.getDescription(
                                        EnumActivityLogAction.userSendVerificationEmail
                                    ),
                                ipAddress,
                                userAgent:
                                    this.databaseUtil.toPlainObject(userAgent),
                                geoLocation:
                                    this.databaseUtil.toPlainObject(
                                        geoLocation
                                    ),
                                createdBy: userId,
                            },
                        },
                    },
                }),
            ]);

            return newVerification;
        });
    }

    async refresh(
        userId: string,
        { loginFrom, loginWith, sessionId, jti }: IUserLogin,
        { ipAddress, userAgent, geoLocation }: IRequestLog
    ): Promise<User> {
        const today = this.helperDateService.create();

        return this.databaseService.client.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                lastLoginAt: today,
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
                        description: this.activityLogUtil.getDescription(
                            EnumActivityLogAction.userRefreshToken
                        ),
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
                        geoLocation:
                            this.databaseUtil.toPlainObject(geoLocation),
                        createdBy: userId,
                    },
                },
            },
        });
    }

    async reachMaxPasswordAttempt(
        userId: string,
        { ipAddress, userAgent, geoLocation }: IRequestLog
    ): Promise<User> {
        return this.databaseService.client.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                status: EnumUserStatus.inactive,
                activityLogs: {
                    create: {
                        action: EnumActivityLogAction.userReachMaxPasswordAttempt,
                        description: this.activityLogUtil.getDescription(
                            EnumActivityLogAction.userReachMaxPasswordAttempt
                        ),
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
                        geoLocation:
                            this.databaseUtil.toPlainObject(geoLocation),
                        createdBy: userId,
                    },
                },
            },
        });
    }

    async verifyTwoFactor(
        userId: string,
        { method, newBackupCodes }: IAuthTwoFactorVerifyResult,
        { ipAddress, userAgent, geoLocation }: IRequestLog
    ): Promise<IUser> {
        const now = this.helperDateService.create();

        return this.databaseService.client.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                twoFactor: {
                    update: {
                        lastUsedAt: this.helperDateService.create(),
                        ...(method === EnumAuthTwoFactorMethod.backupCodes && {
                            backupCodes: newBackupCodes,
                        }),
                    },
                },
                activityLogs: {
                    create: {
                        action: EnumActivityLogAction.userVerifyTwoFactor,
                        description: this.activityLogUtil.getDescription(
                            EnumActivityLogAction.userVerifyTwoFactor
                        ),
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
                        geoLocation:
                            this.databaseUtil.toPlainObject(geoLocation),
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
        { ipAddress, userAgent, geoLocation }: IRequestLog
    ): Promise<IUser> {
        const now = this.helperDateService.create();

        return this.databaseService.client.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                twoFactor: {
                    update: {
                        secret: secretEncrypted,
                        iv,
                        attempt: 0,
                        updatedAt: now,
                        updatedBy: userId,
                    },
                },
                activityLogs: {
                    create: {
                        action: EnumActivityLogAction.userSetupTwoFactor,
                        description: this.activityLogUtil.getDescription(
                            EnumActivityLogAction.userSetupTwoFactor
                        ),
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
                        geoLocation:
                            this.databaseUtil.toPlainObject(geoLocation),
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
        { ipAddress, userAgent, geoLocation }: IRequestLog
    ): Promise<IUser> {
        const now = this.helperDateService.create();

        return this.databaseService.client.$transaction<IUser>(async tx => {
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
                            requiredSetup: false,
                            confirmedAt: twoFactor?.confirmedAt ?? now,
                            backupCodes: backupCodesHashed,
                            lastUsedAt: now,
                            updatedAt: now,
                            updatedBy: userId,
                        },
                    },
                    activityLogs: {
                        create: {
                            action: EnumActivityLogAction.userEnableTwoFactor,
                            description: this.activityLogUtil.getDescription(
                                EnumActivityLogAction.userEnableTwoFactor
                            ),
                            ipAddress,
                            userAgent:
                                this.databaseUtil.toPlainObject(userAgent),
                            geoLocation:
                                this.databaseUtil.toPlainObject(geoLocation),
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
        { ipAddress, userAgent, geoLocation }: IRequestLog
    ): Promise<IUser> {
        const now = this.helperDateService.create();

        return this.databaseService.client.user.update({
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
                        description: this.activityLogUtil.getDescription(
                            EnumActivityLogAction.userDisableTwoFactor
                        ),
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
                        geoLocation:
                            this.databaseUtil.toPlainObject(geoLocation),
                        createdBy: userId,
                        createdAt: now,
                    },
                },
                sessions: {
                    updateMany: {
                        where: {
                            isRevoked: false,
                            expiredAt: { gte: now },
                        },
                        data: {
                            isRevoked: true,
                            revokedAt: now,
                            revokedById: userId,
                            updatedBy: userId,
                        },
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
        { ipAddress, userAgent, geoLocation }: IRequestLog
    ): Promise<IUser> {
        const now = this.helperDateService.create();

        return this.databaseService.client.user.update({
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
                        description: this.activityLogUtil.getDescription(
                            EnumActivityLogAction.userRegenerateTwoFactorBackupCodes
                        ),
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
                        geoLocation:
                            this.databaseUtil.toPlainObject(geoLocation),
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
        { ipAddress, userAgent, geoLocation }: IRequestLog
    ): Promise<IUser> {
        const now = this.helperDateService.create();

        return this.databaseService.client.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                twoFactor: {
                    update: {
                        requiredSetup: true,
                        attempt: 0,
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
                        description: this.activityLogUtil.getDescription(
                            EnumActivityLogAction.adminUserResetTwoFactor
                        ),
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
                        geoLocation:
                            this.databaseUtil.toPlainObject(geoLocation),
                        createdBy: updatedBy,
                        createdAt: now,
                    },
                },
                sessions: {
                    updateMany: {
                        where: { isRevoked: false, expiredAt: { gte: now } },
                        data: {
                            isRevoked: true,
                            revokedAt: now,
                            revokedById: updatedBy,
                            updatedBy: userId,
                        },
                    },
                },
            },
            include: {
                role: true,
                twoFactor: true,
            },
        });
    }

    async increaseTwoFactorAttempt(userId: string): Promise<IUser> {
        return this.databaseService.client.user.update({
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
            include: {
                role: true,
                twoFactor: true,
            },
        });
    }

    async resetTwoFactorAttempt(userId: string): Promise<User> {
        return this.databaseService.client.user.update({
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
        userIds: string[],
        usernames: string[],
        passwordHasheds: IAuthPassword[],
        countryId: string,
        { id: roleId, type: roleType }: IRole,
        workspaceContexts: IUserSignUpWorkspacePersonal[],
        requestLog: IRequestLog,
        createdBy: string
    ): Promise<User[]> {
        const { ipAddress, userAgent, geoLocation } = requestLog;
        const termPolicies =
            await this.databaseService.client.termPolicy.findMany({
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

        const users = await this.databaseService.client.$transaction(
            async tx => {
                const usersToCreate: Prisma.PrismaPromise<User>[] = [];
                const relatedToCreate: Prisma.PrismaPromise<unknown>[] = [];

                for (const [index, { email, name }] of data.entries()) {
                    // The caller's id is reused: the temporary password is
                    // AES-keyed with it.
                    const userId = userIds[index];
                    const username = usernames[index];
                    const workspaceContext = workspaceContexts[index];
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
                                lastWorkspaceId: workspaceContext.workspaceId,
                                lastWorkspaceChangedAt:
                                    this.helperDateService.create(),
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
                                                description:
                                                    this.activityLogUtil.getDescription(
                                                        EnumActivityLogAction.userCreated
                                                    ),
                                                ipAddress,
                                                userAgent:
                                                    this.databaseUtil.toPlainObject(
                                                        userAgent
                                                    ),
                                                geoLocation:
                                                    this.databaseUtil.toPlainObject(
                                                        geoLocation
                                                    ),
                                                createdBy,
                                            },
                                            {
                                                action: EnumActivityLogAction.userSendVerificationEmail,
                                                description:
                                                    this.activityLogUtil.getDescription(
                                                        EnumActivityLogAction.userSendVerificationEmail
                                                    ),
                                                ipAddress,
                                                userAgent:
                                                    this.databaseUtil.toPlainObject(
                                                        userAgent
                                                    ),
                                                geoLocation:
                                                    this.databaseUtil.toPlainObject(
                                                        geoLocation
                                                    ),
                                                createdBy,
                                            },
                                            this.buildWorkspaceSignUpActivityLog(
                                                workspaceContext,
                                                requestLog,
                                                createdBy
                                            ),
                                        ],
                                    },
                                },
                                notificationSettings: {
                                    createMany: {
                                        data: Object.values(
                                            EnumNotificationChannel
                                        )
                                            .map(channel =>
                                                Object.values(
                                                    EnumNotificationType
                                                ).map(type => ({
                                                    channel,
                                                    type,
                                                    isActive: true,
                                                }))
                                            )
                                            .flat(),
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
                    relatedToCreate.push(
                        ...this.buildWorkspaceSignUpOperations(
                            tx,
                            userId,
                            workspaceContext,
                            createdBy
                        ),
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
                await Promise.all(relatedToCreate);

                return users;
            },
            { timeout: 30_000 }
        );

        return users;
    }

    async logout(
        userId: string,
        sessionId: string,
        deviceOwnershipId: string,
        { ipAddress, userAgent, geoLocation }: IRequestLog
    ): Promise<User> {
        const today = this.helperDateService.create();
        return this.databaseService.client.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                activityLogs: {
                    create: {
                        action: EnumActivityLogAction.userLogout,
                        description: this.activityLogUtil.getDescription(
                            EnumActivityLogAction.userLogout
                        ),
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
                        geoLocation:
                            this.databaseUtil.toPlainObject(geoLocation),
                        createdBy: userId,
                    },
                },
                sessions: {
                    update: {
                        where: {
                            id: sessionId,
                        },
                        data: {
                            isRevoked: true,
                            revokedAt: this.helperDateService.create(),
                            revokedBy: {
                                connect: {
                                    id: userId,
                                },
                            },
                            updatedBy: userId,
                            deviceOwnership: {
                                update: {
                                    where: {
                                        id: deviceOwnershipId,
                                    },
                                    data: {
                                        device: {
                                            update: {
                                                notificationToken: null,
                                                notificationProvider: null,
                                                lastActiveAt: today,
                                                updatedBy: userId,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
    }
}
