import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { PolicyRequiredAbilityMetaKey } from '@modules/policy/constants/policy.constant';
import {} from '@modules/policy/enums/policy.enum';
import { RoleAbilityRequestDto } from '@modules/role/dtos/request/role.ability.request.dto';
import { PolicyService } from '@modules/policy/services/policy.service';

/**
 * Guard that validates user access based on policy abilities and permissions
 */
@Injectable()
export class PolicyAbilityGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly policyService: PolicyService
    ) {}

    /**
     * Validates if the current user has the required abilities to access the resource
     * @param {ExecutionContext} context - NestJS execution context containing request information
     * @returns {Promise<boolean>} Promise that resolves to true if user has required abilities
     */
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredAbilities =
            this.reflector.get<RoleAbilityRequestDto[]>(
                PolicyRequiredAbilityMetaKey,
                context.getHandler()
            ) ?? [];

        const request = context.switchToHttp().getRequest<IRequestApp>();
        return this.policyService.validatePolicyGuard(
            request,
            requiredAbilities
        );
    }
}
