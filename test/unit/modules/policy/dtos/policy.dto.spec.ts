import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import { PolicySchema } from '@modules/policy/dtos/policy.dto';

describe('PolicySchema', () => {
    const row = {
        id: 'policy-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: 'user-1',
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        updatedBy: 'user-1',
        subject: EnumPolicySubject.user,
        action: [EnumPolicyAction.manage],
    };

    it('parses a row into exactly the declared fields', () => {
        const result = PolicySchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips deletedAt and deletedBy inherited from DatabaseResponseSchema', () => {
        const result = PolicySchema.parse({
            ...row,
            deletedAt: null,
            deletedBy: null,
        });

        expect(result).toEqual(row);
    });

    it('rejects an empty action list', () => {
        const result = PolicySchema.safeParse({ ...row, action: [] });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['action'], code: 'too_small' }),
        ]);
    });

    it('rejects a subject outside EnumPolicySubject', () => {
        const result = PolicySchema.safeParse({
            ...row,
            subject: 'unknownSubject',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['subject'],
                code: 'invalid_value',
            }),
        ]);
    });

    it('accepts one action per EnumPolicyAction and rejects more', () => {
        const actions = Object.values(EnumPolicyAction);

        expect(() =>
            PolicySchema.parse({ ...row, action: actions })
        ).not.toThrow();
        const result = PolicySchema.safeParse({
            ...row,
            action: [...actions, actions[0]],
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['action'], code: 'too_big' }),
        ]);
    });
});
