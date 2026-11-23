import { WorkspaceMemberUpdateRoleRequestSchema } from '@modules/workspace/dtos/request/workspace.member-update-role.request.dto';

describe('WorkspaceMemberUpdateRoleRequestSchema', () => {
    const payload = { roleId: '01920000-0000-7000-8000-6cd799439012' };

    it('parses a payload into exactly the declared fields', () => {
        expect(WorkspaceMemberUpdateRoleRequestSchema.parse(payload)).toEqual(
            payload
        );
    });

    it('rejects a roleId that is not a uuid', () => {
        expect(() =>
            WorkspaceMemberUpdateRoleRequestSchema.parse({ roleId: 'admin' })
        ).toThrow();
    });

    it('rejects a missing roleId', () => {
        expect(() =>
            WorkspaceMemberUpdateRoleRequestSchema.parse({})
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
