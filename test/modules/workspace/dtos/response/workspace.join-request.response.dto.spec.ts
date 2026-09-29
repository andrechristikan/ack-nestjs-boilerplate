import {
    EnumWorkspaceJoinRejectReason,
    EnumWorkspaceJoinRequestStatus,
} from '@generated/prisma-client/client';
import { WorkspaceJoinRequestResponseSchema } from '@modules/workspace/dtos/response/workspace.join-request.response.dto';

describe('WorkspaceJoinRequestResponseSchema', () => {
    const row = {
        id: 'join-request-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: 'user-1',
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        updatedBy: 'user-1',
        workspaceId: 'workspace-1',
        userId: 'user-1',
        status: EnumWorkspaceJoinRequestStatus.pending,
        message: 'Please let me in',
        rejectReasonCode: null,
        reviewedByUserId: null,
        reviewedAt: null,
    };

    it('parses a row into exactly the declared fields', () => {
        const result = WorkspaceJoinRequestResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('allows a rejected outcome with reviewer fields set', () => {
        const rejected = {
            ...row,
            status: EnumWorkspaceJoinRequestStatus.rejected,
            rejectReasonCode: EnumWorkspaceJoinRejectReason.wrongWorkspace,
            reviewedByUserId: 'user-2',
            reviewedAt: new Date('2026-01-03T00:00:00.000Z'),
        };

        const result = WorkspaceJoinRequestResponseSchema.parse(rejected);

        expect(result).toEqual(rejected);
    });

    it('strips deletedAt, deletedBy, and an undeclared key', () => {
        const result = WorkspaceJoinRequestResponseSchema.parse({
            ...row,
            deletedAt: new Date('2026-03-01T00:00:00.000Z'),
            deletedBy: 'user-2',
            extra: true,
        });

        expect(result).toEqual(row);
    });
});
