import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import { EffectivePermissionSchema } from '@modules/policy/dtos/response/policy.effective-permission.response.dto';

describe('EffectivePermissionSchema', () => {
    it('parses a subject with its concrete actions', () => {
        expect(
            EffectivePermissionSchema.parse({
                subject: EnumPolicySubject.Workspace,
                actions: [EnumPolicyAction.read, EnumPolicyAction.update],
            })
        ).toEqual({
            subject: EnumPolicySubject.Workspace,
            actions: [EnumPolicyAction.read, EnumPolicyAction.update],
        });
    });

    it.each([
        { subject: 'Unknown', actions: [EnumPolicyAction.read] },
        { subject: EnumPolicySubject.User, actions: ['unknown'] },
    ])('rejects an invalid permission row %o', value => {
        expect(EffectivePermissionSchema.safeParse(value).success).toBe(false);
    });
});
