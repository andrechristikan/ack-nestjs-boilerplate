import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction, Prisma } from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationFilterUtil } from '@common/pagination/utils/pagination.filter.util';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { SessionAdminListRequestDto } from '@modules/session/dtos/request/session.admin-list.request.dto';
import type { SessionSharedListRequestDto } from '@modules/session/dtos/request/session.shared-list.request.dto';
import type { ISessionList } from '@modules/session/interfaces/session.interface';
import { SessionDomain } from '@modules/session/domains/session.domain';
import { SessionQueue } from '@modules/session/queues/session.queue';
import { SessionUtil } from '@modules/session/utils/session.util';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import {
    SessionCursorAvailableOrderBy,
    SessionDefaultAvailableOrderBy,
    SessionSharedListCursorScope,
} from '@modules/session/constants/session.list.constant';

@Injectable()
export class SessionHttpService {
    constructor(
        private readonly sessionDomain: SessionDomain,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly paginationFilterUtil: PaginationFilterUtil,
        private readonly requestStoreService: RequestStoreService,
        private readonly roleDomain: RoleDomain,
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly sessionQueue: SessionQueue,
        private readonly sessionUtil: SessionUtil,
        private readonly helperDateService: HelperDateService
    ) {}

    async getListOffsetByAdmin(
        userId: string,
        query: SessionAdminListRequestDto
    ): Promise<IResponsePaginationReturn<ISessionList>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.SessionWhereInput>(query, {
                availableOrderBy: SessionDefaultAvailableOrderBy,
            });
        const isRevoked = this.paginationFilterUtil.equalBoolean(
            Prisma.SessionScalarFieldEnum.isRevoked,
            query.isRevoked
        );
        this.requestStoreService.merge(PaginationStoreKey, {
            ...storePatch,
            filters: {
                ...storePatch.filters,
                ...(isRevoked?.storeFilter ?? {}),
            },
        });

        const { data, ...others } =
            await this.sessionDomain.getListOffsetByAdmin(
                userId,
                params,
                isRevoked?.where
            );
        return {
            data,
            ...others,
        };
    }

    async getListCursor(
        userId: string,
        query: SessionSharedListRequestDto
    ): Promise<IResponsePaginationReturn<ISessionList>> {
        const { params, storePatch } =
            this.paginationQueryUtil.cursor<Prisma.SessionWhereInput>(query, {
                scope: SessionSharedListCursorScope,
                availableOrderBy: SessionCursorAvailableOrderBy,
            });
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        const { data, ...others } = await this.sessionDomain.getListCursor(
            userId,
            params
        );
        return {
            data,
            ...others,
        };
    }

    async revoke(
        userId: string,
        sessionId: string
    ): Promise<IResponseReturn<void>> {
        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userRevokeSession,
            }),
        ];

        await this.sessionDomain.revoke(userId, sessionId);
        await this.sessionQueue.purgeLogins(userId, [{ id: sessionId }]);

        this.activityLogDomain.stagePrepared(activityLogs);

        return {};
    }

    async revokeByAdmin(
        userId: string,
        sessionId: string,
        user: IUser
    ): Promise<IResponseReturn<void>> {
        // Sequential by design: gate before the work it guards
        const targetRole = await this.roleDomain.getOneByUserId(userId);
        this.roleDomain.assertActorOutranks(user.role.type, targetRole.type);

        const revokedAt = this.helperDateService.create();
        const session = await this.sessionDomain.revokeByAdmin(
            userId,
            sessionId,
            user.id,
            revokedAt
        );

        const actorMetadata = this.sessionUtil.mapActivityLogActorMetadata(
            session,
            revokedAt
        );
        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.adminSessionRevoke,
                metadata: actorMetadata,
            }),
        ];
        if (userId !== user.id) {
            const targetMetadata =
                this.sessionUtil.mapActivityLogTargetMetadata(
                    session,
                    user.id,
                    revokedAt
                );
            const targetActivityLog = this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userRevokeSessionByAdmin,
                userId,
                createdBy: user.id,
                metadata: targetMetadata,
            });
            activityLogs.push(targetActivityLog);
        }

        await this.sessionQueue.purgeLogins(userId, [{ id: sessionId }]);

        this.activityLogDomain.stagePrepared(activityLogs);

        return {};
    }

    async revokeAllByAdmin(
        userId: string,
        user: IUser
    ): Promise<IResponseReturn<void>> {
        this.sessionDomain.assertNotSelf(userId, user.id);

        // Sequential by design: gate before the work it guards
        const targetRole = await this.roleDomain.getOneByUserId(userId);
        this.roleDomain.assertActorOutranks(user.role.type, targetRole.type);

        const revokedAt = this.helperDateService.create();
        const sessions = await this.sessionDomain.revokeAllByAdmin(
            userId,
            user.id,
            revokedAt
        );

        const actorMetadata =
            this.sessionUtil.mapActivityLogRevokeAllActorMetadata(
                userId,
                sessions.length
            );
        const targetMetadata =
            this.sessionUtil.mapActivityLogRevokeAllTargetMetadata(
                user.id,
                sessions.length
            );
        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.adminSessionRevokeAll,
                metadata: actorMetadata,
            }),
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userRevokeAllSessionsByAdmin,
                userId,
                createdBy: user.id,
                metadata: targetMetadata,
            }),
        ];

        await this.sessionQueue.purgeLogins(userId, sessions);

        this.activityLogDomain.stagePrepared(activityLogs);

        return {};
    }
}
