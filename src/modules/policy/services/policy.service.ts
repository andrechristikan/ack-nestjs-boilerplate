import { IRequestApp } from '@common/request/interfaces/request.interface';
import { EnumPolicyMatch } from '@modules/policy/enums/policy.enum';
import { EnumPolicyStatusCodeError } from '@modules/policy/enums/policy.status-code.enum';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.factory';
import {
    IPolicyRequirement,
    PolicyAbility,
} from '@modules/policy/interfaces/policy.interface';
import { IPolicyService } from '@modules/policy/interfaces/policy.service.interface';
import {
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';

@Injectable()
export class PolicyService implements IPolicyService {
    constructor(
        private readonly policyAbilityFactory: PolicyAbilityFactory
    ) {}

    /**
     * Compiles a CASL ability for the request user from their stored role abilities.
     *
     * @throws {ForbiddenException} When the request is not authenticated.
     */
    buildAbility(request: IRequestApp): PolicyAbility {
        const { __user, user } = request;
        if (!__user || !user) {
            throw new ForbiddenException({
                statusCode: EnumAuthStatusCodeError.jwtAccessTokenInvalid,
                message: 'auth.error.accessTokenUnauthorized',
            });
        }

        const abilities = this.policyAbilityFactory.parseAbilities(__user.role.abilities);
        return this.policyAbilityFactory.createForUser(abilities, { userId: __user.id });
    }

    /**
     * Validates that the authenticated user satisfies all policy requirements for the route.
     *
     * @returns The compiled `PolicyAbility` for the request user.
     * @throws {InternalServerErrorException} When `requirements` is empty or any requirement has no rules.
     * @throws {ForbiddenException} When the user's ability does not satisfy one or more requirements.
     */
    validatePolicyGuard(
        request: IRequestApp,
        requirements: IPolicyRequirement[]
    ): PolicyAbility {
        if (
            requirements.length === 0 ||
            requirements.some(r => r.rules == null || r.rules.length === 0)
        ) {
            throw new InternalServerErrorException({
                statusCode: EnumPolicyStatusCodeError.predefinedNotFound,
                message: 'policy.error.predefinedNotFound',
            });
        }

        const userAbilities = this.buildAbility(request);

        const failedRequirements = requirements.filter(requirement => {
            const check = (requirement.match ?? EnumPolicyMatch.all) === EnumPolicyMatch.any ? 'some' : 'every';
            return !requirement.rules[check](r => this.policyAbilityFactory.evaluateRule(userAbilities, r));
        });

        if (failedRequirements.length > 0) {
            throw new ForbiddenException({
                statusCode: EnumPolicyStatusCodeError.forbidden,
                message: 'policy.error.forbidden',
                _error: failedRequirements.map(req => {
                    const subjects = [...new Set(req.rules.map(r => r.subject))];
                    const actions = [...new Set(req.rules.flatMap(r => r.action))];
                    return { requirement: `${subjects.join(',')}:[${actions.join(',')}]` };
                }),
            });
        }

        return userAbilities;
    }
}
