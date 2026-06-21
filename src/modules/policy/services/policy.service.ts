import { AuthJwtAccessTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-access-token-invalid.exception';
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';
import { PolicyPredefinedNotFoundException } from '@modules/policy/exceptions/policy.predefined-not-found.exception';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.factory';
import { IPolicyService } from '@modules/policy/interfaces/policy.service.interface';
import { RoleAbilityRequestDto } from '@modules/role/dtos/request/role.ability.request.dto';
import { RoleAbilityDto } from '@modules/role/dtos/role.ability.dto';
import { Injectable } from '@nestjs/common';
import { EnumRoleType } from '@generated/prisma-client';
import { IUser } from '@modules/user/interfaces/user.interface';

@Injectable()
export class PolicyService implements IPolicyService {
    constructor(private readonly policyAbilityFactory: PolicyAbilityFactory) {}

    validatePolicyGuard(
        user: IUser | null,
        abilities: RoleAbilityDto[] | null,
        requiredAbilities: RoleAbilityRequestDto[]
    ): boolean {
        if (!user) {
            throw new AuthJwtAccessTokenInvalidException();
        }

        const { role } = user;

        if (role.type === EnumRoleType.superAdmin) {
            return true;
        } else if (requiredAbilities.length === 0) {
            throw new PolicyPredefinedNotFoundException();
        }

        const userAbilities = this.policyAbilityFactory.createForUser(
            abilities ?? []
        );
        const policyHandler = this.policyAbilityFactory.handlerAbilities(
            userAbilities,
            requiredAbilities
        );
        if (!policyHandler) {
            throw new PolicyForbiddenException();
        }

        return true;
    }
}
