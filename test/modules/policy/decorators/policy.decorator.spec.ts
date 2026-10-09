import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';

import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import { PolicyRequiredMetaKey } from '@modules/policy/constants/policy.constant';
import {
    PlatformPolicyProtected,
    PolicyAbilityProtected,
    PolicyProtected,
} from '@modules/policy/decorators/policy.decorator';
import { EnumPolicyPlatformSubject } from '@modules/policy/enums/policy.enum';
import { PolicyAbilityGuard } from '@modules/policy/guards/policy.ability.guard';
import { PolicyGuard } from '@modules/policy/guards/policy.guard';

const apply = (decorator: MethodDecorator): (() => void) => {
    const handler = vi.fn();
    decorator({}, 'handler', { value: handler });
    return handler;
};

describe('PolicyProtected', () => {
    it('stacks the ability guard before the policy guard and sets the requirements', () => {
        const requirement = {
            subject: EnumPolicySubject.Project,
            action: [EnumPolicyAction.read],
        };
        const handler = apply(PolicyProtected(requirement));

        expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([
            PolicyAbilityGuard,
            PolicyGuard,
        ]);
        expect(Reflect.getMetadata(PolicyRequiredMetaKey, handler)).toEqual([
            requirement,
        ]);
    });
});

describe('PolicyAbilityProtected', () => {
    it('stacks only the ability guard without requirements', () => {
        const handler = apply(PolicyAbilityProtected());

        expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([
            PolicyAbilityGuard,
        ]);
        expect(
            Reflect.getMetadata(PolicyRequiredMetaKey, handler)
        ).toBeUndefined();
    });
});

describe('PlatformPolicyProtected', () => {
    it('stacks the ability guard before the policy guard and sets the requirements', () => {
        const requirement = {
            subject: EnumPolicyPlatformSubject.User,
            action: [EnumPolicyAction.read],
        };
        const handler = apply(PlatformPolicyProtected(requirement));

        expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([
            PolicyAbilityGuard,
            PolicyGuard,
        ]);
        expect(Reflect.getMetadata(PolicyRequiredMetaKey, handler)).toEqual([
            requirement,
        ]);
    });
});
