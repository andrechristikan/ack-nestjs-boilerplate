import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import { WorkspacePermissionResponseSchema } from '@modules/workspace/dtos/response/workspace.permission.response.dto';

describe('WorkspacePermissionResponseSchema', () => {
    const row = {
        permissions: [
            {
                subject: EnumPolicySubject.Workspace,
                actions: [EnumPolicyAction.read, EnumPolicyAction.update],
            },
        ],
    };

    it('parses the permissions list', () => {
        expect(WorkspacePermissionResponseSchema.parse(row)).toEqual(row);
    });

    it('parses an empty list', () => {
        expect(
            WorkspacePermissionResponseSchema.parse({ permissions: [] })
        ).toEqual({ permissions: [] });
    });

    it('rejects a subject outside EnumPolicySubject', () => {
        expect(() =>
            WorkspacePermissionResponseSchema.parse({
                permissions: [{ subject: 'unknown', actions: [] }],
            })
        ).toThrow();
    });
});
