import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type {
    IPaginationEqual,
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { EnumRoleScope, Prisma } from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStagedEvent } from '@modules/activity-log/interfaces/activity-log.interface';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import { RoleScopeMismatchException } from '@modules/role/exceptions/role.scope-mismatch.exception';
import type {
    IRole,
    IRoleUpdate,
    IRoleWithPolicies,
    IRoleWithPolicyCount,
} from '@modules/role/interfaces/role.interface';
import { RoleRepository } from '@modules/role/repositories/role.repository';
import { RoleUtil } from '@modules/role/utils/role.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class RoleDomain {
    constructor(
        private readonly roleRepository: RoleRepository,
        private readonly roleUtil: RoleUtil,
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly helperDateService: HelperDateService
    ) {}

    private prepareActivityLog(
        action: EnumActivityLogAction,
        role: IRole,
        timestamp: Date
    ): IActivityLogStagedEvent {
        const metadata = this.roleUtil.mapActivityLogMetadata(role, timestamp);

        return this.activityLogDomain.prepare({
            action,
            metadata,
        });
    }

    async getListOffsetByAdmin(
        pagination: IPaginationQueryOffsetParams<Prisma.RoleWhereInput>,
        scope?: Record<string, IPaginationIn>
    ): Promise<IResponsePaginationReturn<IRoleWithPolicyCount>> {
        return this.roleRepository.findWithPaginationOffsetByAdmin(
            pagination,
            scope
        );
    }

    async getListCursorBySystem(
        pagination: IPaginationQueryCursorParams<Prisma.RoleWhereInput>,
        scope?: Record<string, IPaginationIn>
    ): Promise<IResponsePaginationReturn<IRoleWithPolicyCount>> {
        return this.roleRepository.findWithPaginationCursorBySystem(
            pagination,
            scope
        );
    }

    async getListOffsetByShared(
        pagination: IPaginationQueryOffsetParams<Prisma.RoleWhereInput>,
        scope?: Record<string, IPaginationEqual>
    ): Promise<IResponsePaginationReturn<IRoleWithPolicyCount>> {
        return this.roleRepository.findWithPaginationOffsetByShared(
            pagination,
            scope
        );
    }

    async getById(roleId: string): Promise<IRole | null> {
        return this.roleRepository.findOneById(roleId);
    }

    async getByIds(roleIds: string[]): Promise<IRole[]> {
        return this.roleRepository.findManyByIds(roleIds);
    }

    async getByScopeAndKey(
        scope: EnumRoleScope,
        key: string
    ): Promise<IRole | null> {
        return this.roleRepository.findOneByScopeAndKey(scope, key);
    }

    async getByScopeAndKeyInTx(
        tx: IDatabaseTransactionClient,
        scope: EnumRoleScope,
        key: string
    ): Promise<IRole | null> {
        return this.roleRepository.findOneByScopeAndKeyInTx(tx, scope, key);
    }

    assertScope(
        role: Pick<IRole, 'scope'>,
        expectedScope: EnumRoleScope
    ): void {
        if (role.scope !== expectedScope) {
            throw new RoleScopeMismatchException();
        }
    }

    async resolve(
        roleId: string,
        expectedScope: EnumRoleScope
    ): Promise<IRole> {
        const role = await this.roleRepository.findOneById(roleId);
        if (!role) {
            throw new RoleNotFoundException();
        }

        this.assertScope(role, expectedScope);

        return role;
    }

    async resolveInTx(
        tx: IDatabaseTransactionClient,
        roleId: string,
        expectedScope: EnumRoleScope
    ): Promise<IRole> {
        const role = await this.roleRepository.findOneByIdInTx(tx, roleId);
        if (!role) {
            throw new RoleNotFoundException();
        }

        this.assertScope(role, expectedScope);

        return role;
    }

    async getOne(id: string): Promise<IRoleWithPolicies> {
        const role = await this.roleRepository.findOneWithPoliciesById(id);
        if (!role) {
            throw new RoleNotFoundException();
        }

        return role;
    }

    async updateByAdmin(
        id: string,
        { name, description }: IRoleUpdate
    ): Promise<IRoleWithPolicies> {
        const role = await this.roleRepository.findOneById(id);
        if (!role) {
            throw new RoleNotFoundException();
        }

        const timestamp = this.helperDateService.create();
        const events = [
            this.prepareActivityLog(
                EnumActivityLogAction.adminRoleUpdate,
                { ...role, name },
                timestamp
            ),
        ];
        const updated = await this.roleRepository.update(id, {
            name,
            description,
        });

        this.activityLogDomain.stagePrepared(events);

        return updated;
    }
}
