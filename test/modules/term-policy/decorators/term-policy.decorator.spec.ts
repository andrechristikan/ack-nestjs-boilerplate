import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';

import { EnumTermPolicyType } from '@generated/prisma-client';
import { TermPolicyRequiredGuardMetaKey } from '@modules/term-policy/constants/term-policy.constant';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';

vi.mock('@modules/term-policy/guards/term-policy.guard', () => ({
    TermPolicyGuard: vi.fn(),
}));

describe('TermPolicyAcceptanceProtected', () => {
    it.each([[[]], [[EnumTermPolicyType.privacy]]])(
        'registers the guard and required policy metadata',
        required => {
            const handler = vi.fn();
            TermPolicyAcceptanceProtected(...required)({}, 'handler', {
                value: handler,
            });
            expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toHaveLength(
                1
            );
            expect(
                Reflect.getMetadata(TermPolicyRequiredGuardMetaKey, handler)
            ).toEqual(required);
        }
    );
});
