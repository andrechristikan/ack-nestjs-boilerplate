import { AuthJwtAccessTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-access-token-invalid.exception';
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
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { Injectable } from '@nestjs/common';
import {
    EnumActivityLogAction,
    EnumRoleType,
} from '@generated/prisma-client/client';
import type { Policy } from '@generated/prisma-client/client';
import type { IUser } from '@modules/user/interfaces/user.interface';

@Injectable()
export class PolicyDomain {
    constructor(
        private readonly policyAbilityFactory: PolicyAbilityFactory,
        private readonly policyRepository: PolicyRepository,
        private readonly roleDomain: RoleDomain,
        private readonly activityLogDomain: ActivityLogDomain
    ) {}

    private async validateRoleExists(roleId: string): Promise<void> {
        const roleExists = await this.roleDomain.existsById(roleId);
        if (!roleExists) {
            throw new RoleNotFoundException();
        }

        return;
    }

    validatePolicyGuard(
        user: IUser | null,
        policies: Policy[] | null,
        requiredPolicies: PolicyRequestDto[]
    ): boolean {
        if (!user) {
            throw new AuthJwtAccessTokenInvalidException();
        }

        const { role } = user;

        if (role.type === EnumRoleType.superAdmin) {
            return true;
        } else if (requiredPolicies.length === 0) {
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
        await this.validateRoleExists(roleId);

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
        await this.validateRoleExists(roleId);

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
        await this.validateRoleExists(roleId);

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
