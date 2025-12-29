import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperService } from '@common/helper/services/helper.service';
import { RequestUserAgentDto } from '@common/request/dtos/request.user-agent.dto';
import { Injectable } from '@nestjs/common';
import {
    EnumNotificationPushProvider,
    NotificationPushToken,
    Prisma,
} from '@prisma/client';

@Injectable()
export class NotificationPushTokenRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly helperService: HelperService,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    async register(
        userId: string,
        sessionId: string,
        token: string,
        provider: EnumNotificationPushProvider,
        userAgent?: RequestUserAgentDto
    ): Promise<NotificationPushToken> {
        const userAgentPayload = userAgent
            ? (this.databaseUtil.toPlainObject(
                  userAgent
              ) as Prisma.InputJsonValue)
            : undefined;

        return this.databaseService.notificationPushToken.upsert({
            where: {
                provider_token: {
                    provider,
                    token,
                },
            },
            update: {
                userId,
                sessionId,
                userAgent: userAgentPayload,
                isRevoked: false,
                revokedAt: null,
                updatedBy: userId,
            },
            create: {
                userId,
                sessionId,
                provider,
                token,
                userAgent: userAgentPayload,
                createdBy: userId,
            },
        });
    }

    async findActiveTokensByUser(userId: string): Promise<
        {
            token: string;
            provider: EnumNotificationPushProvider;
        }[]
    > {
        const now = this.helperService.dateCreate();

        return this.databaseService.notificationPushToken.findMany({
            where: {
                userId,
                isRevoked: false,
                session: {
                    isRevoked: false,
                    expiredAt: {
                        gt: now,
                    },
                },
            },
            select: {
                token: true,
                provider: true,
            },
        });
    }

    async revokeBySessionId(
        sessionId: string,
        revokedBy?: string
    ): Promise<number> {
        const result =
            await this.databaseService.notificationPushToken.updateMany({
                where: {
                    sessionId,
                    isRevoked: false,
                },
                data: {
                    isRevoked: true,
                    revokedAt: this.helperService.dateCreate(),
                    updatedBy: revokedBy,
                },
            });

        return result.count;
    }

    async revokeByToken(token: string): Promise<number> {
        const result =
            await this.databaseService.notificationPushToken.updateMany({
                where: {
                    token,
                    isRevoked: false,
                },
                data: {
                    isRevoked: true,
                    revokedAt: this.helperService.dateCreate(),
                },
            });

        return result.count;
    }
}
