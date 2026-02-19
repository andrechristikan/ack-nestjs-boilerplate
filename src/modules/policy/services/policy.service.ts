import { IRequestApp } from '@common/request/interfaces/request.interface';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { EnumPolicyStatusCodeError } from '@modules/policy/enums/policy.status-code.enum';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.factory';
import {
    IPolicyRequirement,
    PolicySubjectResolver,
} from '@modules/policy/interfaces/policy.interface';
import { IPolicyService } from '@modules/policy/interfaces/policy.service.interface';
import { RoleAbilityRequestDto } from '@modules/role/dtos/request/role.ability.request.dto';
import {
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common';
import { EnumPolicyMatch } from '@modules/policy/enums/policy.enum';

@Injectable()
export class PolicyService implements IPolicyService {
    constructor(private readonly policyAbilityFactory: PolicyAbilityFactory) {}

    private resolveRequirementResource(
        requirement: IPolicyRequirement,
        request: IRequestApp,
        fallbackRule: RoleAbilityRequestDto
    ): Record<string, unknown> | undefined {
        const { resource } = requirement;
        if (!resource) {
            return undefined;
        }

        const resolvedResource =
            typeof resource === 'function'
                ? (resource as PolicySubjectResolver)(request)
                : resource;
        if (!resolvedResource) {
            return undefined;
        }

        return {
            ...resolvedResource,
            __caslSubjectType__: fallbackRule.subject,
        };
    }

    async authorize(
        request: IRequestApp,
        requirements: IPolicyRequirement[]
    ): Promise<boolean> {
        const { __user, user, __abilities } = request;

        if (!__user || !user) {
            throw new ForbiddenException({
                statusCode: EnumAuthStatusCodeError.jwtAccessTokenInvalid,
                message: 'auth.error.accessTokenUnauthorized',
            });
        }

        if (requirements.length === 0) {
            throw new InternalServerErrorException({
                statusCode: EnumPolicyStatusCodeError.predefinedNotFound,
                message: 'policy.error.predefinedNotFound',
            });
        }

        if (requirements.some(requirement => !requirement.rules?.length)) {
            throw new InternalServerErrorException({
                statusCode: EnumPolicyStatusCodeError.predefinedNotFound,
                message: 'policy.error.predefinedNotFound',
            });
        }

        const abilities =
            __abilities ??
            ((__user.role.abilities ?? []) as unknown as RoleAbilityRequestDto[]);
        const userAbilities =
            request.__policyAbilities ??
            this.policyAbilityFactory.createForUser(abilities);
        request.__policyAbilities = userAbilities;

        const isAllowed = requirements.every(requirement => {
            const mode = requirement.match ?? EnumPolicyMatch.all;
            const evaluator = (rule: RoleAbilityRequestDto): boolean =>
                this.policyAbilityFactory.handlerAbilities(
                    userAbilities,
                    [rule],
                    this.resolveRequirementResource(requirement, request, rule)
                );

            if (mode === EnumPolicyMatch.any) {
                return requirement.rules.some(evaluator);
            }

            return requirement.rules.every(evaluator);
        });

        if (!isAllowed) {
            throw new ForbiddenException({
                statusCode: EnumPolicyStatusCodeError.forbidden,
                message: 'policy.error.forbidden',
            });
        }

        return true;
    }
}
