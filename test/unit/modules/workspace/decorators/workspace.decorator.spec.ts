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
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';
import { WorkspaceRoleMetaKey } from '@modules/workspace/constants/workspace.constant';
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

describe('workspace.decorator', () => {
    describe('WorkspaceProtected', () => {
        it('mounts WorkspaceGuard and the workspace error kit on the handler', () => {
            const descriptor: PropertyDescriptor = { value: vi.fn() };

            WorkspaceProtected()({} as Type<unknown>, 'method', descriptor);

            expect(
                Reflect.getMetadata(GUARDS_METADATA, descriptor.value)
            ).toEqual([WorkspaceGuard]);
            const stored = Reflect.getMetadata(
                DocResponseEntryMetaKey,
                descriptor.value
            ) as IDocResponseEntry[];
            expect(stored).toEqual([
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
            const descriptor: PropertyDescriptor = { value: vi.fn() };

            WorkspaceMemberProtected()(
                {} as Type<unknown>,
                'method',
                descriptor
            );

            expect(
                Reflect.getMetadata(GUARDS_METADATA, descriptor.value)
            ).toEqual([WorkspaceMemberGuard]);
            expect(
                Reflect.getMetadata(WorkspaceRoleMetaKey, descriptor.value)
            ).toBeUndefined();
        });

        it('mounts WorkspaceMemberGuard, WorkspaceRoleGuard, the roles, and the role error kit', () => {
            const descriptor: PropertyDescriptor = { value: vi.fn() };

            WorkspaceMemberProtected(EnumWorkspaceMemberRole.admin)(
                {} as Type<unknown>,
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

        it('throws RequestContextMissingException when the workspace store is undefined', () => {
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
                module: 'request',
                statusCode: EnumRequestStatusCodeError.contextMissing,
                statusCodeKey:
                    EnumRequestStatusCodeError[
                        EnumRequestStatusCodeError.contextMissing
                    ],
                messagePath: 'request.error.contextMissing',
                rawError: expect.objectContaining({
                    message:
                        'RequestContextMissingException: no value for "WorkspaceStoreKey"',
                }),
            });
        });

        it('throws RequestContextMissingException when the workspace store is null', () => {
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
                module: 'request',
                statusCode: EnumRequestStatusCodeError.contextMissing,
                statusCodeKey:
                    EnumRequestStatusCodeError[
                        EnumRequestStatusCodeError.contextMissing
                    ],
                messagePath: 'request.error.contextMissing',
                rawError: expect.objectContaining({
                    message:
                        'RequestContextMissingException: no value for "WorkspaceStoreKey"',
                }),
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

            expect(thrown).toMatchObject({
                module: 'request',
                statusCode: EnumRequestStatusCodeError.contextMissing,
                statusCodeKey:
                    EnumRequestStatusCodeError[
                        EnumRequestStatusCodeError.contextMissing
                    ],
                messagePath: 'request.error.contextMissing',
                rawError: expect.objectContaining({
                    message:
                        'RequestContextMissingException: no value for "WorkspaceStoreKey.description"',
                }),
            });
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

        it('throws RequestContextMissingException when the member store is undefined', () => {
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
                module: 'request',
                statusCode: EnumRequestStatusCodeError.contextMissing,
                statusCodeKey:
                    EnumRequestStatusCodeError[
                        EnumRequestStatusCodeError.contextMissing
                    ],
                messagePath: 'request.error.contextMissing',
                rawError: expect.objectContaining({
                    message:
                        'RequestContextMissingException: no value for "WorkspaceMemberStoreKey"',
                }),
            });
        });

        it('throws RequestContextMissingException when the member store is null', () => {
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
                module: 'request',
                statusCode: EnumRequestStatusCodeError.contextMissing,
                statusCodeKey:
                    EnumRequestStatusCodeError[
                        EnumRequestStatusCodeError.contextMissing
                    ],
                messagePath: 'request.error.contextMissing',
                rawError: expect.objectContaining({
                    message:
                        'RequestContextMissingException: no value for "WorkspaceMemberStoreKey"',
                }),
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

            expect(thrown).toMatchObject({
                module: 'request',
                statusCode: EnumRequestStatusCodeError.contextMissing,
                statusCodeKey:
                    EnumRequestStatusCodeError[
                        EnumRequestStatusCodeError.contextMissing
                    ],
                messagePath: 'request.error.contextMissing',
                rawError: expect.objectContaining({
                    message:
                        'RequestContextMissingException: no value for "WorkspaceMemberStoreKey.createdBy"',
                }),
            });
        });
    });
});
