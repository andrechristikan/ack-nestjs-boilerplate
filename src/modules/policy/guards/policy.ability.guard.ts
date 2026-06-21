import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PolicyRequiredAbilityMetaKey } from '@modules/policy/constants/policy.constant';
import { RoleAbilityRequestDto } from '@modules/role/dtos/request/role.ability.request.dto';
import { PolicyService } from '@modules/policy/services/policy.service';
import { UserStoreKey } from '@modules/user/constants/user.constant';
import { IUser } from '@modules/user/interfaces/user.interface';
import { RoleAbilityDto } from '@modules/role/dtos/role.ability.dto';
import { RoleAbilityStoreKey } from '@modules/role/constants/role.constant';
import { RequestStoreService } from '@common/request/services/request.store.service';

/**
 * Enforces the abilities declared by `@PolicyAbilityProtected` against the request user.
 */
@Injectable()
export class PolicyAbilityGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly policyService: PolicyService,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredAbilities =
            this.reflector.get<RoleAbilityRequestDto[]>(
                PolicyRequiredAbilityMetaKey,
                context.getHandler()
            ) ?? [];

        const user = this.requestStoreService.get<IUser>(UserStoreKey);
        const abilities =
            this.requestStoreService.get<RoleAbilityDto[]>(RoleAbilityStoreKey);
        return this.policyService.validatePolicyGuard(
            user,
            abilities,
            requiredAbilities
        );
    }
}
