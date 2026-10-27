import { EnumTermPolicyType } from '@generated/prisma-client';
import { TermPolicyAcceptRequestSchema } from '@modules/term-policy/dtos/request/term-policy.accept.request.dto';
describe('TermPolicyAcceptRequestSchema', () => {
    it('accepts a policy type', () =>
        expect(
            TermPolicyAcceptRequestSchema.safeParse({
                type: EnumTermPolicyType.privacy,
            }).success
        ).toBe(true));
    it.each([
        { type: 'invalid' },
        { type: EnumTermPolicyType.privacy, unknown: true },
    ])('rejects invalid or unknown input', input =>
        expect(TermPolicyAcceptRequestSchema.safeParse(input).success).toBe(
            false
        )
    );
});
