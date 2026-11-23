import { EnumPolicyAction } from '@generated/prisma-client/client';
import { PolicyUpdateRequestSchema } from '@modules/policy/dtos/request/policy.update.request.dto';

describe('PolicyUpdateRequestSchema', () => {
    const payload = {
        action: [EnumPolicyAction.read],
        inverted: false,
        conditions: { status: 'active' },
        reason: null,
    };

    it('parses a full replace into exactly the declared fields', () => {
        expect(PolicyUpdateRequestSchema.parse(payload)).toEqual(payload);
    });

    it('accepts null to clear conditions and reason', () => {
        const cleared = { ...payload, conditions: null, reason: null };

        expect(PolicyUpdateRequestSchema.parse(cleared)).toEqual(cleared);
    });

    it.each(['action', 'inverted', 'conditions', 'reason'])(
        'requires %s, an update is a full replace',
        key => {
            const { [key]: _omitted, ...rest } = payload as Record<
                string,
                unknown
            >;

            expect(() => PolicyUpdateRequestSchema.parse(rest)).toThrow();
        }
    );

    it('rejects subject as an undeclared key', () => {
        expect(() =>
            PolicyUpdateRequestSchema.parse({ ...payload, subject: 'User' })
        ).toThrow();
    });

    it('rejects an empty action list', () => {
        expect(() =>
            PolicyUpdateRequestSchema.parse({ ...payload, action: [] })
        ).toThrow();
    });
});
