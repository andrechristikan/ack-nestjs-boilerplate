import { subject } from '@casl/ability';
import {
    EnumPolicyAction,
    EnumPolicySubject,
    Prisma,
} from '@generated/prisma-client/client';
import { PolicyAbilityDomain } from '@modules/policy/domains/policy.ability.domain';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type {
    IResponsePaginationReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import {
    SessionCursorAvailableOrderBy,
    SessionDefaultAvailableOrderBy,
} from '@modules/session/constants/session.list.constant';
import type { SessionAdminListRequestDto } from '@modules/session/dtos/request/session.admin-list.request.dto';
import type { SessionSharedListRequestDto } from '@modules/session/dtos/request/session.shared-list.request.dto';
import type { ISessionList } from '@modules/session/interfaces/session.interface';
import { SessionDomain } from '@modules/session/domains/session.domain';
import { UserDomain } from '@modules/user/domains/user.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class SessionHttpService {
    constructor(
        private readonly sessionDomain: SessionDomain,
        private readonly userDomain: UserDomain,
        private readonly policyAbilityDomain: PolicyAbilityDomain,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async getListOffsetByAdmin(
        userId: string,
        query: SessionAdminListRequestDto
    ): Promise<IResponsePaginationReturn<ISessionList>> {
        const accessibleWhere = this.policyAbilityDomain.accessibleWhere(
            EnumPolicyAction.read,
            EnumPolicySubject.Session
        );
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.SessionWhereInput>(query, {
                availableOrderBy: SessionDefaultAvailableOrderBy,
            });
        const isRevoked = this.paginationQueryUtil.equalBoolean(
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
                isRevoked?.where,
                accessibleWhere
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

    async revoke(userId: string, sessionId: string): Promise<void> {
        await this.sessionDomain.revoke(userId, sessionId);

        return;
    }

    async revokeByAdmin(
        userId: string,
        sessionId: string,
        revokedBy: string
    ): Promise<IResponseReturn<void>> {
        const stored = await this.sessionDomain.validateActive(
            userId,
            sessionId
        );
        this.policyAbilityDomain.assertCan(
            EnumPolicyAction.delete,
            subject(EnumPolicySubject.Session, stored)
        );
        await this.sessionDomain.revokeByAdmin(userId, sessionId, revokedBy);

        return {};
    }

    async revokeAllByAdmin(
        userId: string,
        revokedBy: string
    ): Promise<IResponseReturn<void>> {
        const user = await this.userDomain.getOne(userId);
        this.policyAbilityDomain.assertCan(
            EnumPolicyAction.update,
            subject(EnumPolicySubject.User, user)
        );
        await this.sessionDomain.revokeAllByAdmin(userId, revokedBy);

        return {};
    }
}
