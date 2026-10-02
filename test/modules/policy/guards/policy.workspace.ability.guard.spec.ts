import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { Workspace } from '@generated/prisma-client/client';
import { PolicyAbilityStoreKey } from '@modules/policy/constants/policy.constant';
import { PolicyAbilityDomain } from '@modules/policy/domains/policy.ability.domain';
import { PolicyDomain } from '@modules/policy/domains/policy.domain';
import { EnumPolicyAbilityScope } from '@modules/policy/enums/policy.enum';
import { WorkspacePolicyAbilityGuard } from '@modules/policy/guards/policy.workspace.ability.guard';
import type { PolicyAbility } from '@modules/policy/interfaces/policy.interface';
import { UserStoreKey } from '@modules/user/constants/user.constant';
import type { IUser } from '@modules/user/interfaces/user.interface';
import {
    WorkspaceMemberStoreKey,
    WorkspaceStoreKey,
} from '@modules/workspace/constants/workspace.constant';
import type { IWorkspaceMemberWithRole } from '@modules/workspace/interfaces/workspace.interface';

describe('WorkspacePolicyAbilityGuard', () => {
    const policyAbilityDomain: MockProxy<PolicyAbilityDomain> =
        mock<PolicyAbilityDomain>();
    const policyDomain: MockProxy<PolicyDomain> = mock<PolicyDomain>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const ability: MockProxy<PolicyAbility> = mock<PolicyAbility>();
    const user = mock<IUser>({ id: 'user-id', roleId: 'user-role' });
    const workspace = mock<Workspace>({ id: 'workspace-id' });
    const workspaceMember = mock<IWorkspaceMemberWithRole>({
        id: 'workspace-member-id',
        roleId: 'workspace-role',
    });
    let store: Record<string, unknown>;
    let guard: WorkspacePolicyAbilityGuard;

    beforeEach(async () => {
        vi.resetAllMocks();
        store = {
            [UserStoreKey]: user,
            [WorkspaceStoreKey]: workspace,
            [WorkspaceMemberStoreKey]: workspaceMember,
        };
        requestStoreService.get.mockImplementation(key => store[key] ?? null);
        policyDomain.requireStored.mockImplementation(key => {
            const value = store[key];
            if (value === undefined) {
                throw new RequestContextMissingException(key);
            }

            return value as never;
        });
        policyAbilityDomain.buildAbility.mockResolvedValue(ability);

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspacePolicyAbilityGuard,
                { provide: PolicyAbilityDomain, useValue: policyAbilityDomain },
                { provide: PolicyDomain, useValue: policyDomain },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();
        guard = moduleRef.get(WorkspacePolicyAbilityGuard);
    });

    describe('canActivate', () => {
        it('reuses the platform ability stored by an admin route and never replaces it with a workspace ability', async () => {
            store = { [PolicyAbilityStoreKey]: ability };

            await expect(guard.canActivate()).resolves.toBe(true);

            expect(requestStoreService.get).toHaveBeenCalledTimes(1);
            expect(requestStoreService.get).toHaveBeenCalledWith(
                PolicyAbilityStoreKey
            );
            expect(policyDomain.requireStored).not.toHaveBeenCalled();
            expect(policyAbilityDomain.buildAbility).not.toHaveBeenCalled();
            expect(requestStoreService.set).not.toHaveBeenCalled();
        });

        it.each([
            ['user', UserStoreKey],
            ['workspace', WorkspaceStoreKey],
            ['acting workspace member', WorkspaceMemberStoreKey],
        ])(
            'throws RequestContextMissingException when no ability is stored and the %s is missing',
            async (_name, missing) => {
                delete store[missing];

                await expect(guard.canActivate()).rejects.toThrow(
                    RequestContextMissingException
                );
                await expect(guard.canActivate()).rejects.toMatchObject({
                    rawError: expect.objectContaining({
                        message: expect.stringContaining(missing),
                    }),
                });
                expect(policyAbilityDomain.buildAbility).not.toHaveBeenCalled();
                expect(requestStoreService.set).not.toHaveBeenCalled();
            }
        );

        it('builds the workspace ability from the user, workspace and acting member, stores it and returns true', async () => {
            await expect(guard.canActivate()).resolves.toBe(true);

            expect(policyAbilityDomain.buildAbility).toHaveBeenCalledTimes(1);
            expect(policyAbilityDomain.buildAbility).toHaveBeenCalledWith({
                scope: EnumPolicyAbilityScope.workspace,
                user: { id: 'user-id', roleId: 'user-role' },
                workspace: {
                    id: 'workspace-id',
                    member: {
                        id: 'workspace-member-id',
                        roleId: 'workspace-role',
                    },
                },
            });
            expect(requestStoreService.set).toHaveBeenCalledTimes(1);
            expect(requestStoreService.set).toHaveBeenCalledWith(
                PolicyAbilityStoreKey,
                ability
            );
        });
    });
});
