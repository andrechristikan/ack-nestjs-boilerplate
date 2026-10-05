import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { EnumWorkspaceMemberRole } from '@generated/prisma-client/client';
import { WorkspaceMemberResponseSchema } from '@modules/workspace/dtos/response/workspace.member.response.dto';

describe('WorkspaceMemberResponseSchema', () => {
    const user = {
        id: 'user-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        name: 'Jane Doe',
        username: 'jane',
        photo: {
            bucket: 'BUCKET',
            key: 'photos/jane.jpg',
            cdnUrl: 'https://cdn.example.com/photos/jane.jpg',
            completedUrl: 'https://cdn.example.com/photos/jane.jpg',
            mime: 'image/jpeg',
            extension: 'jpg',
            access: EnumAwsS3Accessibility.public,
        },
    };

    const row = {
        id: 'member-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: 'user-1',
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        updatedBy: 'user-1',
        workspaceId: 'workspace-1',
        userId: 'user-1',
        user,
        role: EnumWorkspaceMemberRole.member,
        joinedAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    it('parses a row into exactly the declared fields', () => {
        const result = WorkspaceMemberResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('allows a null photo on the embedded user', () => {
        const result = WorkspaceMemberResponseSchema.parse({
            ...row,
            user: { ...user, photo: null },
        });

        expect(result.user.photo).toBeNull();
    });

    it('strips deletedAt, deletedBy, and an undeclared key', () => {
        const result = WorkspaceMemberResponseSchema.parse({
            ...row,
            deletedAt: new Date('2026-03-01T00:00:00.000Z'),
            deletedBy: 'user-2',
            extra: true,
        });

        expect(result).toEqual(row);
    });
});
