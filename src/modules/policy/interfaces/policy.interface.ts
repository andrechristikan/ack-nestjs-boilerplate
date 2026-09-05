import { InferSubjects, MongoAbility } from '@casl/ability';
import { EnumPolicyAction, EnumPolicySubject } from '@generated/prisma-client';

export type IPolicyAbilitySubject = InferSubjects<EnumPolicySubject> | 'all';

export type IPolicyAbilityRule = MongoAbility<
    [EnumPolicyAction, IPolicyAbilitySubject]
>;
