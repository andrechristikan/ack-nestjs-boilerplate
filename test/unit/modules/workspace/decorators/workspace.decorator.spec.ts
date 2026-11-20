import { HttpStatus } from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { ExecutionContext, Type } from '@nestjs/common';
import { getParamDecoratorFactory } from '@test/unit/helpers/test.unit.decorator.helper';
import {
    WorkspaceContext,
    WorkspaceProtected,
} from '@modules/workspace/decorators/workspace.decorator';
import {
    WorkspaceContextStoreKey,
    WorkspaceRoleMetaKey,
} from '@modules/workspace/constants/workspace.constant';
import {
    buildWorkspace,
    buildWorkspaceContext,
    buildWorkspaceMember,
    expectRequestContextMissingWithKey,
} from '@test/unit/helpers/test.unit.request.helper';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { EnumWorkspaceMemberRole } from '@generated/prisma-client/client';
import { DocResponseEntryMetaKey } from '@common/doc/constants/doc.constant';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';
import { WorkspaceGuard } from '@modules/workspace/guards/workspace.guard';

describe('workspace.decorator', () => {
    describe('WorkspaceProtected', () => {
        const userGuardMissing = {
            httpStatus: HttpStatus.UNAUTHORIZED,
            statusCode: EnumUserStatusCodeError.guardMissing,
            messagePath: 'user.error.guardMissing',
        };
        const headerMissing = {
            httpStatus: HttpStatus.BAD_REQUEST,
            statusCode: EnumWorkspaceStatusCodeError.headerMissing,
            messagePath: 'workspace.error.headerMissing',
        };
        const notFound = {
            httpStatus: HttpStatus.NOT_FOUND,
            statusCode: EnumWorkspaceStatusCodeError.notFound,
            messagePath: 'workspace.error.notFound',
        };
        const memberForbidden = {
            httpStatus: HttpStatus.FORBIDDEN,
            statusCode: EnumWorkspaceStatusCodeError.memberForbidden,
            messagePath: 'workspace.error.memberForbidden',
        };
        const roleForbidden = {
            httpStatus: HttpStatus.FORBIDDEN,
            statusCode: EnumWorkspaceStatusCodeError.roleForbidden,
            messagePath: 'workspace.error.roleForbidden',
        };

        it('mounts the one WorkspaceGuard, sets empty roles, and carries the no-role error kit when no role is given', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: vi.fn() };

            WorkspaceProtected()(target, 'method', descriptor);

            expect(
                Reflect.getMetadata(GUARDS_METADATA, descriptor.value)
            ).toEqual([WorkspaceGuard]);
            expect(
                Reflect.getMetadata(WorkspaceRoleMetaKey, descriptor.value)
            ).toEqual([]);
            const stored = Reflect.getMetadata(
                DocResponseEntryMetaKey,
                descriptor.value
            ) as IDocResponseEntry[];
            expect(stored).toEqual([
                headerMissing,
                notFound,
                userGuardMissing,
                memberForbidden,
            ]);
        });

        it('mounts the one WorkspaceGuard, sets the roles, and carries the role error kit when roles are given', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: vi.fn() };

            WorkspaceProtected(EnumWorkspaceMemberRole.admin)(
                target,
                'method',
                descriptor
            );

            expect(
                Reflect.getMetadata(GUARDS_METADATA, descriptor.value)
            ).toEqual([WorkspaceGuard]);
            expect(
                Reflect.getMetadata(WorkspaceRoleMetaKey, descriptor.value)
            ).toEqual([EnumWorkspaceMemberRole.admin]);
            const stored = Reflect.getMetadata(
                DocResponseEntryMetaKey,
                descriptor.value
            ) as IDocResponseEntry[];
            expect(stored).toEqual([
                headerMissing,
                notFound,
                userGuardMissing,
                memberForbidden,
                roleForbidden,
            ]);
        });
    });

    describe('WorkspaceContext', () => {
        const workspace = buildWorkspace();
        const workspaceMember = buildWorkspaceMember('user-1');
        const workspaceContext = buildWorkspaceContext(
            workspace,
            workspaceMember
        );
        const clsService: MockProxy<
            ReturnType<typeof ClsServiceManager.getClsService>
        > = mock<ReturnType<typeof ClsServiceManager.getClsService>>();
        const executionContext: MockProxy<ExecutionContext> =
            mock<ExecutionContext>();
        const target = {} as Type<unknown>;
        WorkspaceContext()(target, 'workspaceContext', 0);
        const factory = getParamDecoratorFactory(target, 'workspaceContext');

        beforeEach(() => {
            vi.spyOn(ClsServiceManager, 'getClsService').mockReturnValue(
                clsService
            );
        });

        it('throws RequestContextMissingException naming the key when the store holds none', () => {
            clsService.get.mockReturnValue(undefined);

            let thrown: unknown;
            try {
                factory(undefined, executionContext);
            } catch (error) {
                thrown = error;
            }

            expectRequestContextMissingWithKey(
                thrown,
                WorkspaceContextStoreKey
            );
        });

        it.each([
            ['workspaceId', { workspace, workspaceMember }],
            ['workspace', { workspaceId: workspace.id, workspaceMember }],
            ['workspaceMember', { workspaceId: workspace.id, workspace }],
        ])(
            'throws RequestContextMissingException naming the key when the store lacks the %s',
            (_field, stored) => {
                clsService.get.mockReturnValue(stored);

                let thrown: unknown;
                try {
                    factory(undefined, executionContext);
                } catch (error) {
                    thrown = error;
                }

                expectRequestContextMissingWithKey(
                    thrown,
                    WorkspaceContextStoreKey
                );
            }
        );

        it('returns the stored workspace context', () => {
            clsService.get.mockReturnValue(workspaceContext);

            expect(factory(undefined, executionContext)).toEqual(
                workspaceContext
            );
            expect(clsService.get).toHaveBeenCalledWith(
                WorkspaceContextStoreKey
            );
        });
    });
});
