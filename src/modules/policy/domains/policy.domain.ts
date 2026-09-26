import { RequestStoreService } from '@common/request/services/request.store.service';
import { AuthJwtAccessTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-access-token-invalid.exception';
import {
    PolicyStoreKey,
    ProjectMemberPolicyStoreKey,
    WorkspaceMemberPolicyStoreKey,
} from '@modules/policy/constants/policy.constant';
import { PolicyImmutableException } from '@modules/policy/exceptions/policy.immutable.exception';
import { PolicyExistException } from '@modules/policy/exceptions/policy.exist.exception';
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';
import { PolicyNotFoundException } from '@modules/policy/exceptions/policy.not-found.exception';
import { PolicyPredefinedNotFoundException } from '@modules/policy/exceptions/policy.predefined-not-found.exception';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.factory';
import type { PolicyRequestDto } from '@modules/policy/dtos/request/policy.request.dto';
import type { PolicyUpdateRequestDto } from '@modules/policy/dtos/request/policy.update.request.dto';
import { PolicyRepository } from '@modules/policy/repositories/policy.repository';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { EnumRolePlatformKey } from '@modules/role/enums/role.platform-key.enum';
import type { IRole } from '@modules/role/interfaces/role.interface';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { Injectable } from '@nestjs/common';
import {
    EnumActivityLogAction,
    EnumRoleScope,
} from '@generated/prisma-client/client';
import type {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import type { Policy } from '@generated/prisma-client/client';
import type { IUser } from '@modules/user/interfaces/user.interface';

@Injectable()
export class PolicyDomain {
    constructor(
        private readonly policyAbilityFactory: PolicyAbilityFactory,
        private readonly policyRepository: PolicyRepository,
        private readonly roleDomain: RoleDomain,
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly requestStoreService: RequestStoreService
    ) {}

    private async validateRoleExists(roleId: string): Promise<IRole> {
        const role = await this.roleDomain.getById(roleId);
        if (!role) {
            throw new RoleNotFoundException();
        }

        return role;
    }

    private async validateRoleWritable(roleId: string): Promise<void> {
        const role = await this.validateRoleExists(roleId);
        if (
            role.scope === EnumRoleScope.platform &&
            role.key === EnumRolePlatformKey.superAdmin
        ) {
            throw new PolicyImmutableException();
        }
    }

    /**
     * Composes the policies the current request is judged by: the workspace role policies when the
     * workspace member guard ran, the platform role policies otherwise, followed by the project
     * role policies when the project member guard ran. `null` when no guard stored any.
     */
    getEffectivePolicies(): Policy[] | null {
        const platform =
            this.requestStoreService.get<Policy[]>(PolicyStoreKey) ?? null;
        const workspace =
            this.requestStoreService.get<Policy[]>(
                WorkspaceMemberPolicyStoreKey
            ) ?? null;
        const project =
            this.requestStoreService.get<Policy[]>(
                ProjectMemberPolicyStoreKey
            ) ?? null;

        const base = workspace ?? platform;
        if (base === null && project === null) {
            return null;
        }

        return [...(base ?? []), ...(project ?? [])];
    }

    can(action: EnumPolicyAction, subject: EnumPolicySubject): boolean {
        const ability = this.policyAbilityFactory.createForUser(
            this.getEffectivePolicies() ?? []
        );

        return ability.can(action, subject);
    }

    validatePolicyGuard(
        user: IUser | null,
        policies: Policy[] | null,
        requiredPolicies: PolicyRequestDto[]
    ): boolean {
        if (!user) {
            throw new AuthJwtAccessTokenInvalidException();
        }

        if (requiredPolicies.length === 0) {
            throw new PolicyPredefinedNotFoundException();
        }

        const userPolicies = this.policyAbilityFactory.createForUser(
            policies ?? []
        );
        const policyHandler = this.policyAbilityFactory.handlerPolicies(
            userPolicies,
            requiredPolicies
        );
        if (!policyHandler) {
            throw new PolicyForbiddenException();
        }

        return true;
    }

    async findManyByRole(roleId: string): Promise<Policy[]> {
        await this.validateRoleExists(roleId);

        return this.policyRepository.findManyByRoleId(roleId);
    }

    async createByAdmin(
        roleId: string,
        data: PolicyRequestDto
    ): Promise<Policy> {
        await this.validateRoleWritable(roleId);

        const exist = await this.policyRepository.existsByRoleIdAndSubject(
            roleId,
            data.subject
        );
        if (exist) {
            throw new PolicyExistException();
        }

        const events = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.adminPolicyCreate,
            }),
        ];
        const created = await this.policyRepository.create(roleId, data);

        this.activityLogDomain.stagePrepared(events);

        return created;
    }

    async updateByAdmin(
        roleId: string,
        id: string,
        data: PolicyUpdateRequestDto
    ): Promise<Policy> {
        await this.validateRoleWritable(roleId);

        const policyExists = await this.policyRepository.existsByRoleIdAndId(
            roleId,
            id
        );
        if (!policyExists) {
            throw new PolicyNotFoundException();
        }

        const events = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.adminPolicyUpdate,
            }),
        ];
        const updated = await this.policyRepository.update(id, data);

        this.activityLogDomain.stagePrepared(events);

        return updated;
    }

    async deleteByAdmin(roleId: string, id: string): Promise<Policy> {
        await this.validateRoleWritable(roleId);

        const policyExists = await this.policyRepository.existsByRoleIdAndId(
            roleId,
            id
        );
        if (!policyExists) {
            throw new PolicyNotFoundException();
        }

        const events = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.adminPolicyDelete,
            }),
        ];
        const deleted = await this.policyRepository.delete(id);

        this.activityLogDomain.stagePrepared(events);

        return deleted;
    }
}
