import { IRequestApp } from '@common/request/interfaces/request.interface';
import { ForbiddenError } from '@casl/ability';
import { accessibleBy } from '@casl/prisma';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { EnumPolicyAction, EnumPolicyMatch } from '@modules/policy/enums/policy.enum';
import { EnumPolicyStatusCodeError } from '@modules/policy/enums/policy.status-code.enum';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.factory';
import {
    IPolicyAbilityInput,
    IPolicyAbilityRule,
    IPolicyRequirement,
    IPolicyRule,
    PolicySubject,
    PolicyWhereInput,
} from '@modules/policy/interfaces/policy.interface';
import { IPolicyService } from '@modules/policy/interfaces/policy.service.interface';
import {
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common';

@Injectable()
export class PolicyService implements IPolicyService {
    constructor(
        private readonly policyAbilityFactory: PolicyAbilityFactory
    ) {}

    private validateAuthenticatedContext(request: IRequestApp): void {
        const { __user, user } = request;
        if (!__user || !user) {
            throw new ForbiddenException({
                statusCode: EnumAuthStatusCodeError.jwtAccessTokenInvalid,
                message: 'auth.error.accessTokenUnauthorized',
            });
        }
    }

    private resolveRequestAbilities(
        request: IRequestApp
    ): IPolicyAbilityInput[] {
        const { __user, __abilities } = request;

        if (__abilities) {
            return __abilities;
        }

        return (__user?.role.abilities ?? []) as IPolicyAbilityInput[];
    }

    getOrCreateRequestAbility(request: IRequestApp): IPolicyAbilityRule {
        this.validateAuthenticatedContext(request);

        const existingAbility = request.__policyAbilities;
        if (existingAbility) {
            return existingAbility;
        }

        const abilities = this.resolveRequestAbilities(request);
        const userAbilities = this.policyAbilityFactory.createForUser(abilities, {
            userId: request.__user!.id,
        });
        request.__policyAbilities = userAbilities;

        return userAbilities;
    }

    async authorize(
        request: IRequestApp,
        requirements: IPolicyRequirement[]
    ): Promise<boolean> {
        this.validateAuthenticatedContext(request);

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

        const userAbilities = this.getOrCreateRequestAbility(request);

        const failedSubjects: string[] = [];

        const isAllowed = requirements.every(requirement => {
            const mode = requirement.match ?? EnumPolicyMatch.all;

            const evaluator = (rule: IPolicyRule): boolean =>
                this.policyAbilityFactory.evaluateRule(userAbilities, rule);

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
