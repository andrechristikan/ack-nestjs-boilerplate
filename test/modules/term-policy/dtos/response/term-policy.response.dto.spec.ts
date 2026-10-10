import {
    EnumTermPolicyStatus,
    EnumTermPolicyType,
} from '@generated/prisma-client';
import { TermPolicyResponseSchema } from '@modules/term-policy/dtos/response/term-policy.response.dto';
describe('TermPolicyResponseSchema', () => {
    it('preserves nullable publication and strips contents', () => {
        const now = new Date();
        const result = TermPolicyResponseSchema.parse({
            id: 'id',
            createdAt: now,
            createdBy: null,
            updatedAt: now,
            updatedBy: null,
            type: EnumTermPolicyType.privacy,
            status: EnumTermPolicyStatus.draft,
            version: 1,
            publishedAt: null,
            contents: [{ key: 'secret' }],
        });
        expect(result.publishedAt).toBeNull();
        expect(result).not.toHaveProperty('contents');
    });
});
