import { HttpStatus } from '@nestjs/common';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import type { ExecutionContext, Type } from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumWorkspaceMemberRole } from '@generated/prisma-client/client';
import type {
    Workspace,
    WorkspaceMember,
} from '@generated/prisma-client/client';
import { DocResponseEntryMetaKey } from '@common/doc/constants/doc.constant';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';
import {
    WorkspaceMemberStoreKey,
    WorkspaceRoleMetaKey,
    WorkspaceStoreKey,
} from '@modules/workspace/constants/workspace.constant';
import {
    WorkspaceCurrent,
    WorkspaceMemberCurrent,
    WorkspaceMemberProtected,
    WorkspaceProtected,
} from '@modules/workspace/decorators/workspace.decorator';
import { WorkspaceGuard } from '@modules/workspace/guards/workspace.guard';
import { WorkspaceMemberGuard } from '@modules/workspace/guards/workspace.member.guard';
import { WorkspaceRoleGuard } from '@modules/workspace/guards/workspace.role.guard';
import { getParamDecoratorFactory } from '@test/unit/helpers/test.unit.decorator.helper';
import { expectRequestContextMissingWithKey } from '@test/unit/helpers/test.unit.request.helper';

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
                expect.objectContaining({
                    httpStatus: 400,
                    messagePath: 'workspace.error.headerMissing',
                }),
                expect.objectContaining({
                    messagePath: 'workspace.error.notFound',
                }),
                expect.objectContaining({
                    messagePath: 'workspace.error.memberForbidden',
                }),
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
                expect.objectContaining({
                    httpStatus: HttpStatus.UNAUTHORIZED,
                    messagePath: 'user.error.guardMissing',
                }),
                expect.objectContaining({
                    httpStatus: HttpStatus.FORBIDDEN,
                    messagePath: 'workspace.error.guardMissing',
                }),
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
                expect.objectContaining({
                    httpStatus: HttpStatus.UNAUTHORIZED,
                    messagePath: 'user.error.guardMissing',
                }),
                expect.objectContaining({
                    httpStatus: HttpStatus.FORBIDDEN,
                    messagePath: 'workspace.error.guardMissing',
                }),
                expect.objectContaining({
                    httpStatus: HttpStatus.FORBIDDEN,
                    messagePath: 'workspace.error.memberGuardMissing',
                }),
                expect.objectContaining({
                    messagePath: 'workspace.error.memberForbidden',
                }),
                expect.objectContaining({
                    messagePath: 'workspace.error.roleForbidden',
                }),
            ]);
        });
    });

    describe('WorkspaceCurrent', () => {
        const clsService: MockProxy<
            ReturnType<typeof ClsServiceManager.getClsService>
        > = mock<ReturnType<typeof ClsServiceManager.getClsService>>();
        const executionContext: MockProxy<ExecutionContext> =
            mock<ExecutionContext>();

        const workspace: Workspace = {
            id: 'workspace-1',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            deletedAt: null,
            deletedBy: null,
            name: 'Acme',
            slug: 'acme-team',
            description: null,
            isPublic: false,
        };

        beforeEach(() => {
            vi.resetAllMocks();
            vi.spyOn(ClsServiceManager, 'getClsService').mockReturnValue(
                clsService
            );
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('returns the stored workspace when no field is requested', () => {
            clsService.get.mockReturnValue(workspace);
            const target = {} as Type<unknown>;
            WorkspaceCurrent()(target, 'workspace', 0);
            const factory = getParamDecoratorFactory(target, 'workspace');

            expect(factory(undefined, executionContext)).toBe(workspace);
        });

        it('returns one field of the stored workspace', () => {
            clsService.get.mockReturnValue(workspace);
            const target = {} as Type<unknown>;
            WorkspaceCurrent()(target, 'workspace', 0);
            const factory = getParamDecoratorFactory(target, 'workspace');

            expect(factory('slug', executionContext)).toBe('acme-team');
        });

        it('throws WorkspaceGuardMissingException when the workspace store is undefined', () => {
            clsService.get.mockReturnValue(undefined);
            const target = {} as Type<unknown>;
            WorkspaceCurrent()(target, 'workspace', 0);
            const factory = getParamDecoratorFactory(target, 'workspace');

            let thrown: unknown;
            try {
                factory(undefined, executionContext);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.guardMissing,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.guardMissing
                    ],
                messagePath: 'workspace.error.guardMissing',
                httpStatus: HttpStatus.FORBIDDEN,
            });
        });

        it('throws WorkspaceGuardMissingException when the workspace store is null', () => {
            clsService.get.mockReturnValue(null);
            const target = {} as Type<unknown>;
            WorkspaceCurrent()(target, 'workspace', 0);
            const factory = getParamDecoratorFactory(target, 'workspace');

            let thrown: unknown;
            try {
                factory(undefined, executionContext);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.guardMissing,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.guardMissing
                    ],
                messagePath: 'workspace.error.guardMissing',
                httpStatus: HttpStatus.FORBIDDEN,
            });
        });

        it('throws RequestContextMissingException when the requested field is absent', () => {
            clsService.get.mockReturnValue({ ...workspace, description: null });
            const target = {} as Type<unknown>;
            WorkspaceCurrent()(target, 'workspace', 0);
            const factory = getParamDecoratorFactory(target, 'workspace');

            let thrown: unknown;
            try {
                factory('description', executionContext);
            } catch (error) {
                thrown = error;
            }

            expectRequestContextMissingWithKey(
                thrown,
                `${WorkspaceStoreKey}.description`
            );
        });
    });

    describe('WorkspaceMemberCurrent', () => {
        const clsService: MockProxy<
            ReturnType<typeof ClsServiceManager.getClsService>
        > = mock<ReturnType<typeof ClsServiceManager.getClsService>>();
        const executionContext: MockProxy<ExecutionContext> =
            mock<ExecutionContext>();

        const member: WorkspaceMember = {
            id: 'member-1',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            workspaceId: 'workspace-1',
            userId: 'user-1',
            role: EnumWorkspaceMemberRole.member,
            joinedAt: new Date('2026-01-01T00:00:00.000Z'),
        };

        beforeEach(() => {
            vi.resetAllMocks();
            vi.spyOn(ClsServiceManager, 'getClsService').mockReturnValue(
                clsService
            );
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('returns the stored member when no field is requested', () => {
            clsService.get.mockReturnValue(member);
            const target = {} as Type<unknown>;
            WorkspaceMemberCurrent()(target, 'member', 0);
            const factory = getParamDecoratorFactory(target, 'member');

            expect(factory(undefined, executionContext)).toBe(member);
        });

        it('returns one field of the stored member', () => {
            clsService.get.mockReturnValue(member);
            const target = {} as Type<unknown>;
            WorkspaceMemberCurrent()(target, 'member', 0);
            const factory = getParamDecoratorFactory(target, 'member');

            expect(factory('role', executionContext)).toBe(
                EnumWorkspaceMemberRole.member
            );
        });

        it('throws WorkspaceMemberGuardMissingException when the member store is undefined', () => {
            clsService.get.mockReturnValue(undefined);
            const target = {} as Type<unknown>;
            WorkspaceMemberCurrent()(target, 'member', 0);
            const factory = getParamDecoratorFactory(target, 'member');

            let thrown: unknown;
            try {
                factory(undefined, executionContext);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberGuardMissing,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.memberGuardMissing
                    ],
                messagePath: 'workspace.error.memberGuardMissing',
                httpStatus: HttpStatus.FORBIDDEN,
            });
        });

        it('throws WorkspaceMemberGuardMissingException when the member store is null', () => {
            clsService.get.mockReturnValue(null);
            const target = {} as Type<unknown>;
            WorkspaceMemberCurrent()(target, 'member', 0);
            const factory = getParamDecoratorFactory(target, 'member');

            let thrown: unknown;
            try {
                factory(undefined, executionContext);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberGuardMissing,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.memberGuardMissing
                    ],
                messagePath: 'workspace.error.memberGuardMissing',
                httpStatus: HttpStatus.FORBIDDEN,
            });
        });

        it('throws RequestContextMissingException when the requested field is absent', () => {
            clsService.get.mockReturnValue({ ...member, createdBy: null });
            const target = {} as Type<unknown>;
            WorkspaceMemberCurrent()(target, 'member', 0);
            const factory = getParamDecoratorFactory(target, 'member');

            let thrown: unknown;
            try {
                factory('createdBy', executionContext);
            } catch (error) {
                thrown = error;
            }

            expectRequestContextMissingWithKey(
                thrown,
                `${WorkspaceMemberStoreKey}.createdBy`
            );
        });
    });
});
