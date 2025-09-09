import { IRequestApp } from '@common/request/interfaces/request.interface';
import { RoleAbilityRequestDto } from '@modules/role/dtos/request/role.ability.request.dto';

export interface IPolicyService {
    validateAbility(
        request: IRequestApp,
        abilities: RoleAbilityRequestDto[]
    ): Promise<boolean>;
}
