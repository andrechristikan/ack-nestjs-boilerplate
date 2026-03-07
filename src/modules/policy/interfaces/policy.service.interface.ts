import { IRequestApp } from '@common/request/interfaces/request.interface';
import { IPolicyAbilityRule } from '@modules/policy/interfaces/policy.interface';
import { RoleAbilityRequestDto } from '@modules/role/dtos/request/role.ability.request.dto';

export interface IPolicyService {
    createAbility(abilities: RoleAbilityRequestDto[]): IPolicyAbilityRule;
    hasAbilities(
        userAbilities: IPolicyAbilityRule,
        requiredAbilities: RoleAbilityRequestDto[]
    ): boolean;
    validatePolicyGuard(
        request: IRequestApp,
        requiredAbilities: RoleAbilityRequestDto[]
    ): Promise<boolean>;
}
