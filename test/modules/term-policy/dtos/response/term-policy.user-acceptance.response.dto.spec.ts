import {
    EnumTermPolicyStatus,
    EnumTermPolicyType,
} from '@generated/prisma-client/client';
import { TermPolicyUserAcceptanceResponseSchema } from '@modules/term-policy/dtos/response/term-policy.user-acceptance.response.dto';

describe('TermPolicyUserAcceptanceResponseSchema', () => {
    it('selects acceptance data and excludes omitted audit and unknown fields', () => {
        const now = new Date();
        const result = TermPolicyUserAcceptanceResponseSchema.parse({
            id: 'acceptance-id',
            createdAt: now,
            createdBy: null,
            updatedAt: now,
            updatedBy: null,
            deletedAt: now,
            deletedBy: 'actor-id',
            userId: 'user-id',
            user: {
                id: 'user-id',
                createdAt: now,
                createdBy: null,
                updatedAt: now,
                updatedBy: null,
                deletedAt: null,
                deletedBy: null,
                name: null,
                username: 'user',
                photo: null,
                password: 'hidden',
            },
            termPolicyId: 'policy-id',
            termPolicy: {
                id: 'policy-id',
                createdAt: now,
                createdBy: null,
                updatedAt: now,
                updatedBy: null,
                type: EnumTermPolicyType.privacy,
                status: EnumTermPolicyStatus.published,
                version: 1,
                publishedAt: now,
                contents: ['hidden'],
            },
            acceptedAt: now,
            unknown: true,
        });

        expect(result.createdBy).toBeNull();
        expect(result.user.photo).toBeNull();
        expect(result.user).not.toHaveProperty('password');
        expect(result.termPolicy).not.toHaveProperty('contents');
        expect(result).not.toHaveProperty('updatedAt');
        expect(result).not.toHaveProperty('deletedAt');
        expect(result).not.toHaveProperty('unknown');
    });
});
