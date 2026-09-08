import {
    IPaginationEqual,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { RequestLogStoreKey } from '@common/request/constants/request.constant';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client';
import { ActivityLogMetadataStoreKey } from '@modules/activity-log/constants/activity-log.constant';
import { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import { SessionNotFoundException } from '@modules/session/exceptions/session.not-found.exception';
import { ISession } from '@modules/session/interfaces/session.interface';
import { ISessionService } from '@modules/session/interfaces/session.service.interface';
import { SessionRepository } from '@modules/session/repositories/session.repository';
import { SessionCacheService } from '@modules/session/services/session.cache.service';
import { SessionUtil } from '@modules/session/utils/session.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class SessionService implements ISessionService {
    constructor(
        private readonly sessionRepository: SessionRepository,
        private readonly sessionUtil: SessionUtil,
        private readonly sessionCacheService: SessionCacheService,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async getListOffsetByAdmin(
        userId: string,
        pagination: IPaginationQueryOffsetParams<Prisma.SessionWhereInput>,
        isRevoked?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<ISession>> {
        return this.sessionRepository.findWithPaginationOffsetByAdmin(
            userId,
            pagination,
            isRevoked
        );
    }

    async getListCursor(
        userId: string,
        pagination: IPaginationQueryCursorParams<Prisma.SessionWhereInput>
    ): Promise<IResponsePagingReturn<ISession>> {
        return this.sessionRepository.findActiveWithPaginationCursor(
            userId,
            pagination
        );
    }

    async deleteAllLogins(userId: string): Promise<void> {
        const sessions = await this.sessionRepository.findActive(userId);
        await this.sessionCacheService.deleteAllLogins(userId, sessions);

        return;
    }

    async deleteOneLogin(userId: string, sessionId: string): Promise<void> {
        const checkActive = await this.sessionRepository.findOneActive(
            userId,
            sessionId
        );
        if (!checkActive) {
            throw new SessionNotFoundException();
        }

        await this.sessionCacheService.deleteOneLogin(userId, sessionId);

        return;
    }

    /**
     * Reads the still-active sessions before their rows are revoked: the read filters on
     * active rows, so a caller that revokes first purges nothing and leaves live logins.
     */
    async deleteLoginsByDeviceOwnership(
        userId: string,
        deviceOwnershipId: string
    ): Promise<void> {
        const sessions =
            await this.sessionRepository.findActiveByDeviceOwnership(
                userId,
                deviceOwnershipId
            );
        await this.sessionCacheService.deleteAllLogins(userId, sessions);

        return;
    }

    async revoke(userId: string, sessionId: string): Promise<void> {
        const requestLog: IRequestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        const checkActive = await this.sessionRepository.findOneActive(
            userId,
            sessionId
        );
        if (!checkActive) {
            throw new SessionNotFoundException();
        }

        await Promise.all([
            this.sessionRepository.revoke(userId, sessionId, requestLog),
            this.sessionCacheService.deleteOneLogin(userId, sessionId),
        ]);

        return;
    }

    async revokeByAdmin(
        userId: string,
        sessionId: string,
        revokedBy: string
    ): Promise<void> {
        const requestLog: IRequestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        const checkActive = await this.sessionRepository.findOneActive(
            userId,
            sessionId
        );
        if (!checkActive) {
            throw new SessionNotFoundException();
        }

        const [removed] = await Promise.all([
            this.sessionRepository.revokeByAdmin(
                sessionId,
                revokedBy,
                requestLog
            ),
            this.sessionCacheService.deleteOneLogin(userId, sessionId),
        ]);

        this.requestStoreService.merge<IActivityLogMetadata>(
            ActivityLogMetadataStoreKey,
            this.sessionUtil.mapActivityLogMetadata(removed)
        );

        return;
    }
}
