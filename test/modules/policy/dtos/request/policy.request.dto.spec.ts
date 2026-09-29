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
        expect(() =>
            PolicyRequestSchema.parse({ ...payload, id: 'policy-1' })
        ).toThrow();
    });

    it('rejects an empty action list', () => {
        expect(() =>
            PolicyRequestSchema.parse({ ...payload, action: [] })
        ).toThrow();
    });
});
