import { EnumWorkspaceMemberRole } from '@generated/prisma-client/client';
import { WorkspaceMemberUpdateRoleRequestSchema } from '@modules/workspace/dtos/request/workspace.member-update-role.request.dto';

describe('WorkspaceMemberUpdateRoleRequestSchema', () => {
    const payload = { role: EnumWorkspaceMemberRole.admin };

    it('parses a payload into exactly the declared fields', () => {
        const result = WorkspaceMemberUpdateRoleRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects a role of owner', () => {
        expect(() =>
            WorkspaceMemberUpdateRoleRequestSchema.parse({
                role: EnumWorkspaceMemberRole.owner,
            })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            WorkspaceMemberUpdateRoleRequestSchema.parse({
                ...payload,
                extra: true,
            })
        ).toThrow();
    });
});
