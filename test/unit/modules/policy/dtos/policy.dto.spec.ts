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
        subject: EnumPolicySubject.User,
        action: [EnumPolicyAction.manage],
        conditions: null,
        inverted: false,
        reason: null,
    };

    it('parses a row into exactly the declared fields', () => {
        expect(PolicySchema.parse(row)).toEqual(row);
    });

    it('strips deletedAt and deletedBy inherited from DatabaseResponseSchema', () => {
        const result = PolicySchema.parse({
            ...row,
            deletedAt: null,
            deletedBy: null,
        });

        expect(result).toEqual(row);
    });

    it('keeps an object of conditions, the inversion flag, and the reason', () => {
        const withRule = {
            ...row,
            conditions: { workspaceId: '${workspaceId}' },
            inverted: true,
            reason: 'Owners cannot be removed',
        };

        expect(PolicySchema.parse(withRule)).toEqual(withRule);
    });

    it('rejects conditions that are not an object', () => {
        expect(() =>
            PolicySchema.parse({ ...row, conditions: ['x'] })
        ).toThrow();
    });

    it('rejects an empty action list', () => {
        expect(() => PolicySchema.parse({ ...row, action: [] })).toThrow();
    });

    it('rejects a subject outside EnumPolicySubject', () => {
        expect(() =>
            PolicySchema.parse({ ...row, subject: 'unknownSubject' })
        ).toThrow();
    });
});
