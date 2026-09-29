import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import { PolicyListResponseSchema } from '@modules/policy/dtos/response/policy.list.response.dto';

describe('PolicyListResponseSchema', () => {
    const policy = {
        id: 'policy-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: 'user-1',
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        updatedBy: 'user-1',
        subject: EnumPolicySubject.user,
        action: [EnumPolicyAction.manage],
    };
    const row = { policies: [policy] };

    it('parses a row into exactly the declared fields', () => {
        const result = PolicyListResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('parses an empty policy list', () => {
        const result = PolicyListResponseSchema.parse({ policies: [] });

        expect(result).toEqual({ policies: [] });
    });

    it('strips an undeclared key', () => {
        const result = PolicyListResponseSchema.parse({
            ...row,
            total: 1,
        });

        expect(result).toEqual(row);
    });
});
