import { RoleService } from '@modules/role/services/role.service';
import type { IPolicyContext } from '@modules/policy/interfaces/policy.interface';
import { PolicyAbilityService } from '@modules/policy/services/policy.ability.service';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import { Prisma } from '@generated/prisma-client/client';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationFilterUtil } from '@common/pagination/utils/pagination.filter.util';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { DeviceAdminListRequestDto } from '@modules/device/dtos/request/device.admin-list.request.dto';
import type { IDeviceOwnershipDetail } from '@modules/device/interfaces/device.interface';
import { DeviceService } from '@modules/device/services/device.service';
import { Injectable } from '@nestjs/common';
import { DeviceDefaultAvailableOrderBy } from '@modules/device/constants/device.list.constant';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class DeviceGetListOffsetByAdminUseCase implements IAppUseCase<
    [IPolicyContext, string, DeviceAdminListRequestDto],
    IResponsePaginationReturn<IDeviceOwnershipDetail>
> {
    constructor(
        private readonly deviceService: DeviceService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly paginationFilterUtil: PaginationFilterUtil,
        private readonly requestStoreService: RequestStoreService,
        private readonly roleService: RoleService,
        private readonly policyAbilityService: PolicyAbilityService
    ) {}

    async execute(
        policyContext: IPolicyContext,
        userId: string,
        query: DeviceAdminListRequestDto
    ): Promise<IResponsePaginationReturn<IDeviceOwnershipDetail>> {
        // Sequential by design: gate before the work it guards
        const additionalWhere = this.policyAbilityService.scope(
            policyContext,
            EnumPolicyAction.read,
            EnumPolicySubject.User
        );
        const ownershipWhere = this.policyAbilityService.scope(
            policyContext,
            EnumPolicyAction.read,
            EnumPolicySubject.DeviceOwnership
        );
        await this.roleService.getOneByUserId(userId, additionalWhere);
        const { params, storePatch } = this.paginationQueryUtil.offset(query, {
            availableOrderBy: DeviceDefaultAvailableOrderBy,
        });
        const isRevoked = this.paginationFilterUtil.equalBoolean(
            Prisma.DeviceOwnershipScalarFieldEnum.isRevoked,
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
            await this.deviceService.getListOffsetByAdmin(
                userId,
                params,
                isRevoked?.where ?? null,
                ownershipWhere
            );
        const deviceOwnerships: IDeviceOwnershipDetail[] = data.map(
            deviceOwnership => ({
                ...deviceOwnership,
                activeSessionCount: deviceOwnership._count.sessions,
                isCurrentDevice: false,
            })
        );

        return {
            data: deviceOwnerships,
            ...others,
        };
    }
}
