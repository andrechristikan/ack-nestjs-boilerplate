import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';

import { EnumPolicyAction, EnumPolicySubject } from '@generated/prisma-client';
import { PolicyRequiredMetaKey } from '@modules/policy/constants/policy.constant';
import { PolicyProtected } from '@modules/policy/decorators/policy.decorator';

vi.mock('@modules/policy/guards/policy.guard', () => ({
    PolicyGuard: vi.fn(),
}));

describe('policy decorators', () => {
    it('registers the policy guard and required policy metadata', () => {
        const handler = vi.fn();
        const required = {
            subject: EnumPolicySubject.user,
            action: [EnumPolicyAction.read],
        };
        PolicyProtected(required)({}, 'handler', { value: handler });
        expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toHaveLength(1);
        expect(Reflect.getMetadata(PolicyRequiredMetaKey, handler)).toEqual([
            required,
        ]);
    });
});
