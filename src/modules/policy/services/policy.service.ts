import { AuthJwtAccessTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-access-token-invalid.exception';
import { PolicyExistException } from '@modules/policy/exceptions/policy.exist.exception';
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';
import { PolicyNotFoundException } from '@modules/policy/exceptions/policy.not-found.exception';
import { PolicyPredefinedNotFoundException } from '@modules/policy/exceptions/policy.predefined-not-found.exception';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.factory';
import { IPolicyService } from '@modules/policy/interfaces/policy.service.interface';
import { PolicyRequestDto } from '@modules/policy/dtos/request/policy.request.dto';
import { PolicyUpdateRequestDto } from '@modules/policy/dtos/request/policy.update.request.dto';
import { PolicyRepository } from '@modules/policy/repositories/policy.repository';
import { Injectable } from '@nestjs/common';
import { EnumRoleType, Policy } from '@generated/prisma-client';
import { IUser } from '@modules/user/interfaces/user.interface';

@Injectable()
export class PolicyService implements IPolicyService {
    constructor(
        private readonly policyAbilityFactory: PolicyAbilityFactory,
        private readonly policyRepository: PolicyRepository
    ) {}

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
        return this.policyRepository.findManyByRoleId(roleId);
    }

    async createByAdmin(
        roleId: string,
        data: PolicyRequestDto
    ): Promise<Policy> {
        const exist = await this.policyRepository.existByRoleIdAndSubject(
            roleId,
            data.subject
        );
        if (exist) {
            throw new PolicyExistException();
        }

        return this.policyRepository.create(roleId, data);
    }

    async updateByAdmin(
        roleId: string,
        id: string,
        data: PolicyUpdateRequestDto
    ): Promise<Policy> {
        const policy = await this.policyRepository.existByRoleIdAndId(
            roleId,
            id
        );
        if (!policy) {
            throw new PolicyNotFoundException();
        }

        return this.policyRepository.update(id, data);
    }

    async deleteByAdmin(roleId: string, id: string): Promise<Policy> {
        const policy = await this.policyRepository.existByRoleIdAndId(
            roleId,
            id
        );
        if (!policy) {
            throw new PolicyNotFoundException();
        }

        return this.policyRepository.delete(id);
    }
}
