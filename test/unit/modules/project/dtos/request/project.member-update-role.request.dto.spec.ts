import { ProjectMemberUpdateRoleRequestSchema } from '@modules/project/dtos/request/project.member-update-role.request.dto';

describe('ProjectMemberUpdateRoleRequestSchema', () => {
    const payload = { roleId: '01920000-0000-7000-8000-6cd799439012' };

    it('parses roleId', () => {
        expect(ProjectMemberUpdateRoleRequestSchema.parse(payload)).toEqual(
            payload
        );
    });

    it('rejects a roleId that is not a uuid', () => {
        expect(() =>
            ProjectMemberUpdateRoleRequestSchema.parse({ roleId: 'owner' })
        ).toThrow();
    });

    it('rejects a missing roleId', () => {
        expect(() => ProjectMemberUpdateRoleRequestSchema.parse({})).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            ProjectMemberUpdateRoleRequestSchema.parse({
                ...payload,
                extra: true,
            })
        ).toThrow();
    });
});
