import { RoleAbilityRequestDto } from '@modules/role/dtos/request/role.ability.request.dto';
import { RoleAbilityDto } from '@modules/role/dtos/role.ability.dto';
import { IUser } from '@modules/user/interfaces/user.interface';

export interface IPolicyService {
    validatePolicyGuard(
        user: IUser | null,
        abilities: RoleAbilityDto[] | null,
        requiredAbilities: RoleAbilityRequestDto[]
    ): boolean;
}
