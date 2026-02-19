import { IRequestApp } from '@common/request/interfaces/request.interface';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { EnumPolicyStatusCodeError } from '@modules/policy/enums/policy.status-code.enum';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.factory';
import {
    IPolicyAbilityInput,
    IPolicyRequirement,
    IPolicyRule,
    PolicySubjectResolver,
} from '@modules/policy/interfaces/policy.interface';
import { IPolicyService } from '@modules/policy/interfaces/policy.service.interface';
import { mapPrismaAbilityToPolicy } from '@modules/policy/mappers/policy-ability.mapper';
import {
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common';
import { EnumPolicyMatch } from '@modules/policy/enums/policy.enum';
import { RoleAbility } from '@prisma/client';

@Injectable()
export class PolicyService implements IPolicyService {
    constructor(
        private readonly policyAbilityFactory: PolicyAbilityFactory
    ) {}

    private resolveRequirementResource(
        requirement: IPolicyRequirement,
        request: IRequestApp
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

        return resolvedResource;
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

        const abilities: IPolicyAbilityInput[] =
            __abilities ??
            (__user.role.abilities ?? []).map((raw: unknown) =>
                mapPrismaAbilityToPolicy(raw as RoleAbility)
            );

        const userAbilities =
            request.__policyAbilities ??
            this.policyAbilityFactory.createForUser(abilities);
        request.__policyAbilities = userAbilities;

        const failedSubjects: string[] = [];

        const isAllowed = requirements.every(requirement => {
            const mode = requirement.match ?? EnumPolicyMatch.all;
            const resource = this.resolveRequirementResource(
                requirement,
                request
            );

            const evaluator = (rule: IPolicyRule): boolean =>
                this.policyAbilityFactory.evaluateRule(
                    userAbilities,
                    rule,
                    resource
                );

            const passed =
                mode === EnumPolicyMatch.any
                    ? requirement.rules.some(evaluator)
                    : requirement.rules.every(evaluator);

            if (!passed) {
                const subjects = [
                    ...new Set(requirement.rules.map(r => r.subject)),
                ];
                const actions = [
                    ...new Set(requirement.rules.flatMap(r => r.action)),
                ];
                failedSubjects.push(
                    `${subjects.join(',')}:[${actions.join(',')}]`
                );
            }

            return passed;
        });

        if (!isAllowed) {
            throw new ForbiddenException({
                statusCode: EnumPolicyStatusCodeError.forbidden,
                message: 'policy.error.forbidden',
                errors: failedSubjects.map(detail => ({
                    requirement: detail,
                })),
            });
        }

        return true;
    }
}
