import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import { PolicyEffectivePermissionResponseSchema } from '@modules/policy/dtos/response/policy.effective-permission.response.dto';

describe('PolicyEffectivePermissionResponseSchema', () => {
    const permission = {
        subject: EnumPolicySubject.Workspace,
        actions: [EnumPolicyAction.read, EnumPolicyAction.update],
    };

    it('parses a subject with its granted actions', () => {
        expect(
            PolicyEffectivePermissionResponseSchema.parse(permission)
        ).toEqual(permission);
    });

    it('rejects a subject outside EnumPolicySubject', () => {
        expect(() =>
            PolicyEffectivePermissionResponseSchema.parse({
                ...permission,
                subject: 'unknown',
            })
        ).toThrow();
    });
});
