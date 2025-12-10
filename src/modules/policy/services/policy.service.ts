import { IRequestApp } from '@common/request/interfaces/request.interface';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { ENUM_POLICY_STATUS_CODE_ERROR } from '@modules/policy/enums/policy.status-code.enum';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.factory';
import { IPolicyService } from '@modules/policy/interfaces/policy.service.interface';
import { RoleAbilityRequestDto } from '@modules/role/dtos/request/role.ability.request.dto';
import {
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common';
import { ENUM_ROLE_TYPE } from '@prisma/client';

@Injectable()
export class PolicyService implements IPolicyService {
    constructor(private readonly policyAbilityFactory: PolicyAbilityFactory) {}

    async validatePolicyGuard(
        request: IRequestApp,
        requiredAbilities: RoleAbilityRequestDto[]
    ): Promise<boolean> {
        const { __user, user, __abilities } = request;

        if (!__user || !user) {
            throw new ForbiddenException({
                statusCode: EnumAuthStatusCodeError.jwtAccessTokenInvalid,
                message: 'auth.error.accessTokenUnauthorized',
            });
        }

        const { role } = __user;

        if (role.type === ENUM_ROLE_TYPE.superAdmin) {
            return true;
        } else if (requiredAbilities.length === 0) {
            throw new InternalServerErrorException({
                statusCode: ENUM_POLICY_STATUS_CODE_ERROR.predefinedNotFound,
                message: 'policy.error.predefinedNotFound',
            });
        }

        const userAbilities =
            this.policyAbilityFactory.createForUser(__abilities);
        const policyHandler = this.policyAbilityFactory.handlerAbilities(
            userAbilities,
            requiredAbilities
        );
        if (!policyHandler) {
            throw new ForbiddenException({
                statusCode: ENUM_POLICY_STATUS_CODE_ERROR.forbidden,
                message: 'policy.error.forbidden',
            });
        }

        return true;
    }
}
