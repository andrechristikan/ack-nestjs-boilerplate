import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import { WorkspacePermissionResponseSchema } from '@modules/workspace/dtos/response/workspace.permission.response.dto';

describe('WorkspacePermissionResponseSchema', () => {
    it('parses workspace permissions and strips undeclared fields', () => {
        expect(
            WorkspacePermissionResponseSchema.parse({
                permissions: [
                    {
                        subject: EnumPolicySubject.Workspace,
                        actions: [
                            EnumPolicyAction.read,
                            EnumPolicyAction.update,
                        ],
                        conditions: { id: 'workspace-id' },
                    },
                ],
                role: 'owner',
            })
        ).toEqual({
            permissions: [
                {
                    subject: EnumPolicySubject.Workspace,
                    actions: [EnumPolicyAction.read, EnumPolicyAction.update],
                },
            ],
        });
    });

    it('rejects a permission for another subject', () => {
        expect(
            WorkspacePermissionResponseSchema.safeParse({
                permissions: [
                    {
                        subject: EnumPolicySubject.Project,
                        actions: [EnumPolicyAction.read],
                    },
                ],
            }).success
        ).toBe(false);
    });
});
