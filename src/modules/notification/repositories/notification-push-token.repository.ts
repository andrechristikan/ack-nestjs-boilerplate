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

    /**
     * Batch increment failure count for multiple tokens (single DB call)
     */
    async incrementFailureCountBatch(tokens: string[]): Promise<number> {
        if (tokens.length === 0) {return 0;}

        const now = this.helperService.dateCreate();
        const result =
            await this.databaseService.notificationPushToken.updateMany({
                where: {
                    token: { in: tokens },
                    isRevoked: false,
                },
                data: {
                    failureCount: { increment: 1 },
                    lastFailedAt: now,
                },
            });

        return result.count;
    }

    /**
     * Reset failure count on successful send (batch)
     */
    async resetFailureCountBatch(tokens: string[]): Promise<number> {
        if (tokens.length === 0) {return 0;}

        const result =
            await this.databaseService.notificationPushToken.updateMany({
                where: {
                    token: { in: tokens },
                    isRevoked: false,
                    failureCount: { gt: 0 },
                },
                data: {
                    failureCount: 0,
                    lastFailedAt: null,
                },
            });

        return result.count;
    }

    /**
     * Revoke tokens that have exceeded failure threshold
     * FCM best practice: only revoke after multiple consecutive failures
     */
    async revokeStaleTokens(
        maxFailures: number = 3,
        staleAfterDays: number = 7
    ): Promise<number> {
        const staleDate = this.helperService.dateCreate();
        staleDate.setDate(staleDate.getDate() - staleAfterDays);

        const result =
            await this.databaseService.notificationPushToken.updateMany({
                where: {
                    isRevoked: false,
                    failureCount: { gte: maxFailures },
                    lastFailedAt: { lte: staleDate },
                },
                data: {
                    isRevoked: true,
                    revokedAt: this.helperService.dateCreate(),
                },
            });

        return result.count;
    }

    /**
     * Find tokens that should be cleaned up
     */
    async findStaleTokens(
        maxFailures: number = 3,
        staleAfterDays: number = 7,
        limit: number = 100
    ): Promise<{ id: string; token: string }[]> {
        const staleDate = this.helperService.dateCreate();
        staleDate.setDate(staleDate.getDate() - staleAfterDays);

        return this.databaseService.notificationPushToken.findMany({
            where: {
                isRevoked: false,
                failureCount: { gte: maxFailures },
                lastFailedAt: { lte: staleDate },
            },
            select: {
                id: true,
                token: true,
            },
            take: limit,
        });
    }
}

