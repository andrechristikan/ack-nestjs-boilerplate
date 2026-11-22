import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import { PolicyListResponseSchema } from '@modules/policy/dtos/response/policy.list.response.dto';

describe('PolicyListResponseSchema', () => {
    const policy = {
        id: 'policy-id',
        roleId: 'role-id',
        subject: EnumPolicySubject.User,
        action: [EnumPolicyAction.read],
        conditions: null,
        inverted: false,
        reason: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    };

    it('parses a policy list and strips undeclared fields', () => {
        expect(
            PolicyListResponseSchema.parse({
                policies: [{ ...policy, secret: 'hidden' }],
                extra: true,
            })
        ).toEqual({
            policies: [
                {
                    id: policy.id,
                    subject: policy.subject,
                    action: policy.action,
                    conditions: policy.conditions,
                    inverted: policy.inverted,
                    reason: policy.reason,
                    createdAt: policy.createdAt,
                    createdBy: policy.createdBy,
                    updatedAt: policy.updatedAt,
                    updatedBy: policy.updatedBy,
                },
            ],
        });
    });

    it('rejects a response whose policy list is not an array', () => {
        expect(
            PolicyListResponseSchema.safeParse({ policies: policy }).success
        ).toBe(false);
    });
});
