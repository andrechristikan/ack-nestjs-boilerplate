import { EnumWorkspaceMemberRole } from '@generated/prisma-client/client';
import { WorkspaceMemberUpdateRoleRequestSchema } from '@modules/workspace/dtos/request/workspace.member-update-role.request.dto';

describe('WorkspaceMemberUpdateRoleRequestSchema', () => {
    const payload = { role: EnumWorkspaceMemberRole.admin };

    it('parses a payload into exactly the declared fields', () => {
        const result = WorkspaceMemberUpdateRoleRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects a role of owner', () => {
        const result = WorkspaceMemberUpdateRoleRequestSchema.safeParse({
            role: EnumWorkspaceMemberRole.owner,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['role'], code: 'invalid_value' }),
        ]);
    });

    it('rejects an undeclared key', () => {
        const result = WorkspaceMemberUpdateRoleRequestSchema.safeParse({
            ...payload,
            extra: true,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });
});
