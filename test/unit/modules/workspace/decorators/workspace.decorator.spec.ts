import { HttpStatus } from '@nestjs/common';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import type { Type } from '@nestjs/common';
import { EnumWorkspaceMemberRole } from '@generated/prisma-client/client';
import { DocResponseEntryMetaKey } from '@common/doc/constants/doc.constant';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';
import { WorkspaceRoleMetaKey } from '@modules/workspace/constants/workspace.constant';
import {
    WorkspaceMemberProtected,
    WorkspaceProtected,
} from '@modules/workspace/decorators/workspace.decorator';
import { WorkspaceGuard } from '@modules/workspace/guards/workspace.guard';
import { WorkspaceMemberGuard } from '@modules/workspace/guards/workspace.member.guard';
import { WorkspaceRoleGuard } from '@modules/workspace/guards/workspace.role.guard';

describe('workspace.decorator', () => {
    describe('WorkspaceProtected', () => {
        it('mounts WorkspaceGuard and the workspace error kit on the handler', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: vi.fn() };

            WorkspaceProtected()(target, 'method', descriptor);

            expect(
                Reflect.getMetadata(GUARDS_METADATA, descriptor.value)
            ).toEqual([WorkspaceGuard]);
            const stored = Reflect.getMetadata(
                DocResponseEntryMetaKey,
                descriptor.value
            ) as IDocResponseEntry[];
            expect(stored).toEqual([
                {
                    httpStatus: HttpStatus.BAD_REQUEST,
                    statusCode: EnumWorkspaceStatusCodeError.headerMissing,
                    messagePath: 'workspace.error.headerMissing',
                },
                {
                    httpStatus: HttpStatus.NOT_FOUND,
                    statusCode: EnumWorkspaceStatusCodeError.notFound,
                    messagePath: 'workspace.error.notFound',
                },
            ]);
        });
    });

    describe('WorkspaceMemberProtected', () => {
        it('mounts only WorkspaceMemberGuard when no role is given', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: vi.fn() };

            WorkspaceMemberProtected()(target, 'method', descriptor);

            expect(
                Reflect.getMetadata(GUARDS_METADATA, descriptor.value)
            ).toEqual([WorkspaceMemberGuard]);
            expect(
                Reflect.getMetadata(WorkspaceRoleMetaKey, descriptor.value)
            ).toBeUndefined();
            const stored = Reflect.getMetadata(
                DocResponseEntryMetaKey,
                descriptor.value
            ) as IDocResponseEntry[];
            expect(stored).toEqual([
                {
                    httpStatus: HttpStatus.UNAUTHORIZED,
                    statusCode: EnumUserStatusCodeError.guardMissing,
                    messagePath: 'user.error.guardMissing',
                },
                {
                    httpStatus: HttpStatus.FORBIDDEN,
                    statusCode: EnumWorkspaceStatusCodeError.guardMissing,
                    messagePath: 'workspace.error.guardMissing',
                },
                {
                    httpStatus: HttpStatus.FORBIDDEN,
                    statusCode: EnumWorkspaceStatusCodeError.memberForbidden,
                    messagePath: 'workspace.error.memberForbidden',
                },
            ]);
        });

        it('mounts WorkspaceMemberGuard, WorkspaceRoleGuard, the roles, and the role error kit', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: vi.fn() };

            WorkspaceMemberProtected(EnumWorkspaceMemberRole.admin)(
                target,
                'method',
                descriptor
            );

            expect(
                Reflect.getMetadata(GUARDS_METADATA, descriptor.value)
            ).toEqual([WorkspaceMemberGuard, WorkspaceRoleGuard]);
            expect(
                Reflect.getMetadata(WorkspaceRoleMetaKey, descriptor.value)
            ).toEqual([EnumWorkspaceMemberRole.admin]);
            const stored = Reflect.getMetadata(
                DocResponseEntryMetaKey,
                descriptor.value
            ) as IDocResponseEntry[];
            expect(stored).toEqual([
                {
                    httpStatus: HttpStatus.UNAUTHORIZED,
                    statusCode: EnumUserStatusCodeError.guardMissing,
                    messagePath: 'user.error.guardMissing',
                },
                {
                    httpStatus: HttpStatus.FORBIDDEN,
                    statusCode: EnumWorkspaceStatusCodeError.guardMissing,
                    messagePath: 'workspace.error.guardMissing',
                },
                {
                    httpStatus: HttpStatus.FORBIDDEN,
                    statusCode: EnumWorkspaceStatusCodeError.memberGuardMissing,
                    messagePath: 'workspace.error.memberGuardMissing',
                },
                {
                    httpStatus: HttpStatus.FORBIDDEN,
                    statusCode: EnumWorkspaceStatusCodeError.memberForbidden,
                    messagePath: 'workspace.error.memberForbidden',
                },
                {
                    httpStatus: HttpStatus.FORBIDDEN,
                    statusCode: EnumWorkspaceStatusCodeError.roleForbidden,
                    messagePath: 'workspace.error.roleForbidden',
                },
            ]);
        });
    });
});
