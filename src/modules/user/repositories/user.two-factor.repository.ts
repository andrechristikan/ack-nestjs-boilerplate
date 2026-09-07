import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { EnumActivityLogAction, User } from '@generated/prisma-client';
import { ActivityLogUtil } from '@modules/activity-log/utils/activity-log.util';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { IAuthTwoFactorVerifyResult } from '@modules/auth/interfaces/auth.interface';
import { IUser } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserTwoFactorRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly activityLogUtil: ActivityLogUtil,
        private readonly helperDateService: HelperDateService
    ) {}

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
                role: { include: { policies: true } },
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
                role: { include: { policies: true } },
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
                    role: { include: { policies: true } },
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
                role: { include: { policies: true } },
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
                role: { include: { policies: true } },
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
                role: { include: { policies: true } },
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
                role: { include: { policies: true } },
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
}
