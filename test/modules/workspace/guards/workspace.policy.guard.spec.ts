import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { DatabaseUtil } from '@common/database/utils/database.util';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import type { Workspace } from '@generated/prisma-client/client';
import { PolicyAbilityStoreKey } from '@modules/policy/constants/policy.constant';
import { PolicyDomain } from '@modules/policy/domains/policy.domain';
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';
import { PolicyPredefinedNotFoundException } from '@modules/policy/exceptions/policy.predefined-not-found.exception';
import type { PolicyAbility } from '@modules/policy/interfaces/policy.interface';
import { PolicyUtil } from '@modules/policy/utils/policy.util';
import {
    WorkspacePolicyRequiredMetaKey,
    WorkspaceStoreKey,
    WorkspaceTargetStoreKey,
} from '@modules/workspace/constants/workspace.constant';
import { WorkspaceDomain } from '@modules/workspace/domains/workspace.domain';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import { WorkspacePolicyGuard } from '@modules/workspace/guards/workspace.policy.guard';

type THttpArgumentsHost = ReturnType<ExecutionContext['switchToHttp']>;
type TTaggedWorkspace = ReturnType<PolicyUtil['toSubject']>;

describe('WorkspacePolicyGuard', () => {
    const reflector: MockProxy<Reflector> = mock<Reflector>();
    const policyDomain: MockProxy<PolicyDomain> = mock<PolicyDomain>();
    const policyUtil: MockProxy<PolicyUtil> = mock<PolicyUtil>();
    const workspaceDomain: MockProxy<WorkspaceDomain> = mock<WorkspaceDomain>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const context: MockProxy<ExecutionContext> = mock<ExecutionContext>();
    const httpArgumentsHost: MockProxy<THttpArgumentsHost> =
        mock<THttpArgumentsHost>();
    const ability: MockProxy<PolicyAbility> = mock<PolicyAbility>();
    const storedWorkspace = mock<Workspace>({ id: 'stored-workspace-id' });
    const adminWorkspace = mock<Workspace>({ id: 'route-workspace-id' });
    const tagged = mock<TTaggedWorkspace>();
    const handler = () => undefined;
    let store: Record<string, unknown>;
    let guard: WorkspacePolicyGuard;

    const declare = (...actions: EnumPolicyAction[]): void => {
        reflector.get.mockReturnValue(actions);
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        store = {
            [PolicyAbilityStoreKey]: ability,
            [WorkspaceStoreKey]: storedWorkspace,
        };
        requestStoreService.get.mockImplementation(key => store[key] ?? null);
        policyDomain.requireStored.mockImplementation(key => {
            const value = store[key];
            if (value === undefined) {
                throw new RequestContextMissingException(key);
            }

            return value as never;
        });
        context.getHandler.mockReturnValue(handler);
        context.switchToHttp.mockReturnValue(httpArgumentsHost);
        httpArgumentsHost.getRequest.mockReturnValue({ params: {} });
        databaseUtil.checkIdIsValid.mockReturnValue(true);
        workspaceDomain.getByIdForAdmin.mockResolvedValue(adminWorkspace);
        policyUtil.toSubject.mockReturnValue(tagged);

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspacePolicyGuard,
                { provide: Reflector, useValue: reflector },
                { provide: PolicyDomain, useValue: policyDomain },
                { provide: PolicyUtil, useValue: policyUtil },
                { provide: WorkspaceDomain, useValue: workspaceDomain },
                { provide: DatabaseUtil, useValue: databaseUtil },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();
        guard = moduleRef.get(WorkspacePolicyGuard);
    });

    describe('canActivate', () => {
        it.each([
            ['empty', []],
            ['absent', undefined],
        ])(
            'throws PolicyPredefinedNotFoundException when the action metadata is %s',
            async (_name, metadata) => {
                reflector.get.mockReturnValue(metadata);

                await expect(guard.canActivate(context)).rejects.toThrow(
                    PolicyPredefinedNotFoundException
                );
                expect(reflector.get).toHaveBeenCalledWith(
                    WorkspacePolicyRequiredMetaKey,
                    handler
                );
                expect(policyDomain.assertCan).not.toHaveBeenCalled();
            }
        );

        it('throws RequestContextMissingException when no ability is stored', async () => {
            declare(EnumPolicyAction.read);
            delete store[PolicyAbilityStoreKey];

            await expect(guard.canActivate(context)).rejects.toThrow(
                RequestContextMissingException
            );
            expect(policyDomain.requireStored).toHaveBeenCalledWith(
                PolicyAbilityStoreKey
            );
            expect(policyDomain.assertCan).not.toHaveBeenCalled();
        });

        it('judges the stored workspace record, tagged as a Workspace, on a user route', async () => {
            declare(EnumPolicyAction.update);

            await expect(guard.canActivate(context)).resolves.toBe(true);

            expect(workspaceDomain.getByIdForAdmin).not.toHaveBeenCalled();
            expect(policyUtil.toSubject).toHaveBeenCalledWith(
                EnumPolicySubject.Workspace,
                storedWorkspace
            );
            expect(policyDomain.assertCan).toHaveBeenCalledTimes(1);
            expect(policyDomain.assertCan).toHaveBeenCalledWith(
                ability,
                EnumPolicyAction.update,
                tagged
            );
        });

        it('throws RequestContextMissingException when a user route stored no workspace', async () => {
            declare(EnumPolicyAction.read);
            delete store[WorkspaceStoreKey];

            await expect(guard.canActivate(context)).rejects.toThrow(
                RequestContextMissingException
            );
        });

        it('resolves the route workspaceId through the admin read and judges that record, never the stored one', async () => {
            declare(EnumPolicyAction.read);
            httpArgumentsHost.getRequest.mockReturnValue({
                params: { workspaceId: 'route-workspace-id' },
            });

            await expect(guard.canActivate(context)).resolves.toBe(true);

            expect(databaseUtil.checkIdIsValid).toHaveBeenCalledWith(
                'route-workspace-id'
            );
            expect(workspaceDomain.getByIdForAdmin).toHaveBeenCalledWith(
                'route-workspace-id'
            );
            expect(policyUtil.toSubject).toHaveBeenCalledWith(
                EnumPolicySubject.Workspace,
                adminWorkspace
            );
            expect(policyDomain.requireStored).not.toHaveBeenCalledWith(
                WorkspaceStoreKey
            );
        });

        it('stores the authorized admin workspace for the HTTP service so the route reads it once', async () => {
            declare(EnumPolicyAction.read);
            httpArgumentsHost.getRequest.mockReturnValue({
                params: { workspaceId: 'route-workspace-id' },
            });

            await guard.canActivate(context);

            expect(requestStoreService.set).toHaveBeenCalledTimes(1);
            expect(requestStoreService.set).toHaveBeenCalledWith(
                WorkspaceTargetStoreKey,
                adminWorkspace
            );
        });

        it('stores the authorized stored workspace on a user route', async () => {
            declare(EnumPolicyAction.update);

            await guard.canActivate(context);

            expect(requestStoreService.set).toHaveBeenCalledWith(
                WorkspaceTargetStoreKey,
                storedWorkspace
            );
        });

        it('stores nothing when an assertion denies', async () => {
            declare(EnumPolicyAction.update);
            policyDomain.assertCan.mockImplementation(() => {
                throw new PolicyForbiddenException('private workspace');
            });

            await expect(guard.canActivate(context)).rejects.toThrow(
                PolicyForbiddenException
            );
            expect(requestStoreService.set).not.toHaveBeenCalled();
        });

        it('throws WorkspaceNotFoundException for a route workspaceId that is not a valid id', async () => {
            declare(EnumPolicyAction.read);
            httpArgumentsHost.getRequest.mockReturnValue({
                params: { workspaceId: 'not-a-uuid' },
            });
            databaseUtil.checkIdIsValid.mockReturnValue(false);

            await expect(guard.canActivate(context)).rejects.toThrow(
                WorkspaceNotFoundException
            );
            expect(workspaceDomain.getByIdForAdmin).not.toHaveBeenCalled();
            expect(policyDomain.assertCan).not.toHaveBeenCalled();
        });

        it('propagates the admin read rejection for an unknown workspace', async () => {
            declare(EnumPolicyAction.read);
            httpArgumentsHost.getRequest.mockReturnValue({
                params: { workspaceId: 'route-workspace-id' },
            });
            workspaceDomain.getByIdForAdmin.mockRejectedValue(
                new WorkspaceNotFoundException()
            );

            await expect(guard.canActivate(context)).rejects.toThrow(
                WorkspaceNotFoundException
            );
        });

        it('asserts every declared action against the tagged record in order', async () => {
            declare(EnumPolicyAction.read, EnumPolicyAction.update);

            await guard.canActivate(context);

            expect(policyDomain.assertCan).toHaveBeenCalledTimes(2);
            expect(policyDomain.assertCan).toHaveBeenNthCalledWith(
                1,
                ability,
                EnumPolicyAction.read,
                tagged
            );
            expect(policyDomain.assertCan).toHaveBeenNthCalledWith(
                2,
                ability,
                EnumPolicyAction.update,
                tagged
            );
        });

        it('propagates a denying assertCan and never returns true', async () => {
            declare(EnumPolicyAction.update);
            policyDomain.assertCan.mockImplementation(() => {
                throw new PolicyForbiddenException('private workspace');
            });

            await expect(guard.canActivate(context)).rejects.toThrow(
                PolicyForbiddenException
            );
        });
    });

    describe('resolveWorkspace', () => {
        it('returns the stored workspace when no route id is given', async () => {
            await expect(guard['resolveWorkspace'](undefined)).resolves.toBe(
                storedWorkspace
            );
        });

        it('returns the admin-read workspace for a valid route id', async () => {
            await expect(
                guard['resolveWorkspace']('route-workspace-id')
            ).resolves.toBe(adminWorkspace);
        });

        it('throws WorkspaceNotFoundException for an invalid route id', async () => {
            databaseUtil.checkIdIsValid.mockReturnValue(false);

            await expect(guard['resolveWorkspace']('bad')).rejects.toThrow(
                WorkspaceNotFoundException
            );
        });
    });
});
