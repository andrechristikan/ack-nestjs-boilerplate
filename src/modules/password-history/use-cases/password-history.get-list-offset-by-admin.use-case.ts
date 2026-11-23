import { RoleService } from '@modules/role/services/role.service';
import type { IPolicyContext } from '@modules/policy/interfaces/policy.interface';
import { PolicyAbilityService } from '@modules/policy/services/policy.ability.service';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { PasswordHistoryAdminListRequestDto } from '@modules/password-history/dtos/request/password-history.admin-list.request.dto';
import type { IPasswordHistoryList } from '@modules/password-history/interfaces/password-history.interface';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import { Injectable } from '@nestjs/common';
import { PasswordHistoryDefaultAvailableOrderBy } from '@modules/password-history/constants/password-history.list.constant';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class PasswordHistoryGetListOffsetByAdminUseCase implements IAppUseCase<
    [IPolicyContext, string, PasswordHistoryAdminListRequestDto],
    IResponsePaginationReturn<IPasswordHistoryList>
> {
    constructor(
        private readonly passwordHistoryService: PasswordHistoryService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService,
        private readonly roleService: RoleService,
        private readonly policyAbilityService: PolicyAbilityService
    ) {}

    async execute(
        policyContext: IPolicyContext,
        userId: string,
        query: PasswordHistoryAdminListRequestDto
    ): Promise<IResponsePaginationReturn<IPasswordHistoryList>> {
        // Sequential by design: gate before the work it guards
        const additionalWhere = this.policyAbilityService.scope(
            policyContext,
            EnumPolicyAction.read,
            EnumPolicySubject.User
        );
        await this.roleService.getOneByUserId(userId, additionalWhere);
        const { params, storePatch } = this.paginationQueryUtil.offset(query, {
            availableOrderBy: PasswordHistoryDefaultAvailableOrderBy,
        });
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        const { data, ...others } =
            await this.passwordHistoryService.getListOffsetByAdmin(
                userId,
                params
            );

        return {
            data,
            ...others,
        };
    }
}
