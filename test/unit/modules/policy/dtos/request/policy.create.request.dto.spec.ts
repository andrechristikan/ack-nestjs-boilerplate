import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import { PolicyConditionsMaxLength } from '@modules/policy/constants/policy.constant';
import { PolicyCreateRequestSchema } from '@modules/policy/dtos/request/policy.create.request.dto';

describe('PolicyCreateRequestSchema', () => {
    const payload = {
        subject: EnumPolicySubject.Project,
        action: [EnumPolicyAction.read],
    };

    it('parses the required fields alone', () => {
        expect(PolicyCreateRequestSchema.parse(payload)).toEqual(payload);
    });

    it('keeps nested conditions, the inversion flag, and the reason', () => {
        const full = {
            ...payload,
            inverted: true,
            conditions: {
                workspaceId: '${workspaceId}',
                members: { some: { userId: '${userId}' } },
            },
            reason: 'locked',
        };

        expect(PolicyCreateRequestSchema.parse(full)).toEqual(full);
    });

    it('rejects conditions whose serialized form exceeds the bound', () => {
        const oversized = {
            ...payload,
            conditions: { name: 'x'.repeat(PolicyConditionsMaxLength) },
        };

        expect(() => PolicyCreateRequestSchema.parse(oversized)).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            PolicyCreateRequestSchema.parse({ ...payload, roleId: 'role-1' })
        ).toThrow();
    });

    it('rejects an empty action list', () => {
        expect(() =>
            PolicyCreateRequestSchema.parse({ ...payload, action: [] })
        ).toThrow();
    });

    it('rejects conditions that are not an object', () => {
        expect(() =>
            PolicyCreateRequestSchema.parse({ ...payload, conditions: 'x' })
        ).toThrow();
    });
});
