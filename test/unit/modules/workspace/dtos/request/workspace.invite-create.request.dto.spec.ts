import {
    EnumProjectMemberRole,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import { WorkspaceInviteCreateRequestSchema } from '@modules/workspace/dtos/request/workspace.invite-create.request.dto';
import { EnumWorkspaceInviteExpiry } from '@modules/workspace/enums/workspace.enum';

describe('WorkspaceInviteCreateRequestSchema', () => {
    const payload = {
        email: 'invitee@example.com',
        workspaceRole: EnumWorkspaceMemberRole.member,
        projectId: '507f1f77bcf86cd799439011',
        projectRole: EnumProjectMemberRole.member,
        expiryDuration: EnumWorkspaceInviteExpiry.sevenDays,
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = WorkspaceInviteCreateRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('trims and lowercases the email', () => {
        const result = WorkspaceInviteCreateRequestSchema.parse({
            email: '  Invitee@Example.com  ',
            workspaceRole: EnumWorkspaceMemberRole.member,
        });

        expect(result.email).toBe('invitee@example.com');
    });

    it('parses with only the required fields', () => {
        const result = WorkspaceInviteCreateRequestSchema.parse({
            email: 'invitee@example.com',
            workspaceRole: EnumWorkspaceMemberRole.admin,
        });

        expect(result).toEqual({
            email: 'invitee@example.com',
            workspaceRole: EnumWorkspaceMemberRole.admin,
        });
    });

    it('rejects an invalid email with its message path', () => {
        const result = WorkspaceInviteCreateRequestSchema.safeParse({
            ...payload,
            email: 'not-an-email',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                code: 'custom',
                path: ['email'],
                message: 'request.error.email.invalid',
            }),
        ]);
    });

    it('accepts an email of 100 characters', () => {
        const email = `${'a'.repeat(64)}@${'b'.repeat(31)}.com`;

        const result = WorkspaceInviteCreateRequestSchema.safeParse({
            ...payload,
            email,
        });

        expect(email).toHaveLength(100);
        expect(result.success).toBe(true);
    });

    it('rejects an email of 101 characters with a too_big issue', () => {
        const email = `${'a'.repeat(64)}@${'b'.repeat(32)}.com`;

        const result = WorkspaceInviteCreateRequestSchema.safeParse({
            ...payload,
            email,
        });

        expect(email).toHaveLength(101);
        expect(result.error?.issues).toEqual([
            expect.objectContaining({ code: 'too_big', path: ['email'] }),
        ]);
    });

    it('rejects a workspaceRole of owner', () => {
        expect(() =>
            WorkspaceInviteCreateRequestSchema.parse({
                ...payload,
                workspaceRole: 'owner',
            })
        ).toThrow();
    });

    it('rejects a projectId that is not a MongoID', () => {
        expect(() =>
            WorkspaceInviteCreateRequestSchema.parse({
                ...payload,
                projectId: 'not-an-id',
            })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            WorkspaceInviteCreateRequestSchema.parse({
                ...payload,
                extra: true,
            })
        ).toThrow();
    });
});
