import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import { PolicyRequestSchema } from '@modules/policy/dtos/request/policy.request.dto';

describe('PolicyRequestSchema', () => {
    const payload = {
        subject: EnumPolicySubject.user,
        action: [EnumPolicyAction.manage],
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = PolicyRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects an undeclared key', () => {
        const result = PolicyRequestSchema.safeParse({
            ...payload,
            id: 'policy-1',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('rejects an empty action list', () => {
        const result = PolicyRequestSchema.safeParse({
            ...payload,
            action: [],
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['action'], code: 'too_small' }),
        ]);
    });
});
