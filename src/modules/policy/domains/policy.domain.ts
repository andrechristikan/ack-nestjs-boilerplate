import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { PolicyExistException } from '@modules/policy/exceptions/policy.exist.exception';
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';
import { PolicyNotFoundException } from '@modules/policy/exceptions/policy.not-found.exception';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.factory';
import type { PolicyRequestDto } from '@modules/policy/dtos/request/policy.request.dto';
import type { PolicyUpdateRequestDto } from '@modules/policy/dtos/request/policy.update.request.dto';
import { PolicyRepository } from '@modules/policy/repositories/policy.repository';
import { Injectable } from '@nestjs/common';
import { EnumRoleType } from '@generated/prisma-client/client';
import type { Policy } from '@generated/prisma-client/client';
import type { IUser } from '@modules/user/interfaces/user.interface';

@Injectable()
export class PolicyDomain {
    constructor(
        private readonly policyAbilityFactory: PolicyAbilityFactory,
        private readonly policyRepository: PolicyRepository,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    validatePolicyGuard(
        user: IUser,
        policies: Policy[],
        requiredPolicies: PolicyRequestDto[]
    ): boolean {
        const { role } = user;

        if (role.type === EnumRoleType.superAdmin) {
            return true;
        }

        const userPolicies = this.policyAbilityFactory.createByUser(policies);
        const policyHandler = this.policyAbilityFactory.handlerPolicies(
            userPolicies,
            requiredPolicies
        );
        if (!policyHandler) {
            throw new PolicyForbiddenException();
        }

        return true;
    }

    async getManyByRole(roleId: string): Promise<Policy[]> {
        return this.policyRepository.findManyByRoleId(roleId);
    }

    async createByAdmin(
        roleId: string,
        data: PolicyRequestDto
    ): Promise<Policy> {
        try {
            return await this.policyRepository.create(roleId, data);
        } catch (err: unknown) {
            const isSubjectCollision = this.databaseUtil.isUniqueCollision(
                err,
                'subject'
            );
            if (isSubjectCollision) {
                throw new PolicyExistException();
            }

            throw new AppUnknownException(err);
        }
    }

    async updateByAdmin(
        roleId: string,
        id: string,
        data: PolicyUpdateRequestDto
    ): Promise<Policy> {
        const policyExists = await this.policyRepository.existsByRoleIdAndId(
            roleId,
            id
        );
        if (!policyExists) {
            throw new PolicyNotFoundException();
        }

        return this.policyRepository.update(id, data);
    }

    async deleteByAdmin(roleId: string, id: string): Promise<Policy> {
        const policyExists = await this.policyRepository.existsByRoleIdAndId(
            roleId,
            id
        );
        if (!policyExists) {
            throw new PolicyNotFoundException();
        }

        return this.policyRepository.delete(id);
    }
}
