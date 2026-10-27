import { subject } from '@casl/ability';
import {
    EnumPolicyAction,
    EnumPolicySubject,
    Prisma,
} from '@generated/prisma-client/client';
import { UserDomain } from '@modules/user/domains/user.domain';
import { PolicyAbilityDomain } from '@modules/policy/domains/policy.ability.domain';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    PasswordHistoryCursorAvailableOrderBy,
    PasswordHistoryDefaultAvailableOrderBy,
} from '@modules/password-history/constants/password-history.list.constant';
import type { PasswordHistoryAdminListRequestDto } from '@modules/password-history/dtos/request/password-history.admin-list.request.dto';
import type { PasswordHistorySharedListRequestDto } from '@modules/password-history/dtos/request/password-history.shared-list.request.dto';
import type { IPasswordHistoryList } from '@modules/password-history/interfaces/password-history.interface';
import { PasswordHistoryDomain } from '@modules/password-history/domains/password-history.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PasswordHistoryHttpService {
    constructor(
        private readonly passwordHistoryDomain: PasswordHistoryDomain,
        private readonly userDomain: UserDomain,
        private readonly policyAbilityDomain: PolicyAbilityDomain,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async getListOffsetByAdmin(
        userId: string,
        query: PasswordHistoryAdminListRequestDto
    ): Promise<IResponsePaginationReturn<IPasswordHistoryList>> {
        const user = await this.userDomain.getOne(userId);
        this.policyAbilityDomain.authorize(
            EnumPolicyAction.read,
            subject(EnumPolicySubject.User, user)
        );

        const scopeWhere = this.policyAbilityDomain.scope(
            EnumPolicyAction.read,
            EnumPolicySubject.PasswordHistory
        );
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.PasswordHistoryWhereInput>(
                query,
                {
                    availableOrderBy: PasswordHistoryDefaultAvailableOrderBy,
                }
            );
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        const { data, ...others } =
            await this.passwordHistoryDomain.getListOffsetByAdmin(
                userId,
                params,
                scopeWhere
            );

        return {
            data,
            ...others,
        };
    }

    async getListCursor(
        userId: string,
        query: PasswordHistorySharedListRequestDto
    ): Promise<IResponsePaginationReturn<IPasswordHistoryList>> {
        const { params, storePatch } =
            this.paginationQueryUtil.cursor<Prisma.PasswordHistoryWhereInput>(
                query,
                {
                    availableOrderBy: PasswordHistoryCursorAvailableOrderBy,
                }
            );
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        const { data, ...others } =
            await this.passwordHistoryDomain.getListCursor(userId, params);

        return {
            data,
            ...others,
        };
    }
}
