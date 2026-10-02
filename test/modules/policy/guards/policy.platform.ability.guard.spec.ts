import type { ExecutionContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { DatabaseUtil } from '@common/database/utils/database.util';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { PolicyAbilityStoreKey } from '@modules/policy/constants/policy.constant';
import { PolicyAbilityDomain } from '@modules/policy/domains/policy.ability.domain';
import { PolicyDomain } from '@modules/policy/domains/policy.domain';
import { EnumPolicyAbilityScope } from '@modules/policy/enums/policy.enum';
import { PlatformPolicyAbilityGuard } from '@modules/policy/guards/policy.platform.ability.guard';
import type { PolicyAbility } from '@modules/policy/interfaces/policy.interface';
import { UserStoreKey } from '@modules/user/constants/user.constant';
import type { IUser } from '@modules/user/interfaces/user.interface';

type THttpArgumentsHost = ReturnType<ExecutionContext['switchToHttp']>;

describe('PlatformPolicyAbilityGuard', () => {
    const policyAbilityDomain: MockProxy<PolicyAbilityDomain> =
        mock<PolicyAbilityDomain>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const policyDomain: MockProxy<PolicyDomain> = mock<PolicyDomain>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const context: MockProxy<ExecutionContext> = mock<ExecutionContext>();
    const httpArgumentsHost: MockProxy<THttpArgumentsHost> =
        mock<THttpArgumentsHost>();
    const ability: MockProxy<PolicyAbility> = mock<PolicyAbility>();
    const user = mock<IUser>({ id: 'user-id', roleId: 'user-role' });
    let store: Record<string, unknown>;
    let guard: PlatformPolicyAbilityGuard;

    beforeEach(async () => {
        vi.resetAllMocks();
        store = { [UserStoreKey]: user };
        requestStoreService.get.mockImplementation(key => store[key] ?? null);
        policyDomain.requireStored.mockImplementation(key => {
            const value = store[key];
            if (value === undefined) {
                throw new RequestContextMissingException(key);
            }

            return value as never;
        });
        context.switchToHttp.mockReturnValue(httpArgumentsHost);
        httpArgumentsHost.getRequest.mockReturnValue({ params: {} });
        databaseUtil.checkIdIsValid.mockReturnValue(true);
        policyAbilityDomain.buildAbility.mockResolvedValue(ability);

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                PlatformPolicyAbilityGuard,
                { provide: PolicyAbilityDomain, useValue: policyAbilityDomain },
                { provide: PolicyDomain, useValue: policyDomain },
                { provide: DatabaseUtil, useValue: databaseUtil },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();
        guard = moduleRef.get(PlatformPolicyAbilityGuard);
    });

    describe('canActivate', () => {
        it('reuses a stored ability without reading the user, the domain or the request', async () => {
            store[PolicyAbilityStoreKey] = ability;

            await expect(guard.canActivate(context)).resolves.toBe(true);

            expect(requestStoreService.get).toHaveBeenCalledWith(
                PolicyAbilityStoreKey
            );
            expect(policyDomain.requireStored).not.toHaveBeenCalled();
            expect(policyAbilityDomain.buildAbility).not.toHaveBeenCalled();
            expect(context.switchToHttp).not.toHaveBeenCalled();
            expect(requestStoreService.set).not.toHaveBeenCalled();
        });

        it('throws RequestContextMissingException for the user key when no ability and no user are stored', async () => {
            delete store[UserStoreKey];

            await expect(guard.canActivate(context)).rejects.toMatchObject({
                rawError: expect.objectContaining({
                    message: expect.stringContaining(UserStoreKey),
                }),
            });
            await expect(guard.canActivate(context)).rejects.toThrow(
                RequestContextMissingException
            );
            expect(policyAbilityDomain.buildAbility).not.toHaveBeenCalled();
            expect(requestStoreService.set).not.toHaveBeenCalled();
        });

        it('builds the platform ability from the user alone, stores it and returns true', async () => {
            await expect(guard.canActivate(context)).resolves.toBe(true);

            expect(policyAbilityDomain.buildAbility).toHaveBeenCalledTimes(1);
            expect(policyAbilityDomain.buildAbility).toHaveBeenCalledWith({
                scope: EnumPolicyAbilityScope.platform,
                user: { id: 'user-id', roleId: 'user-role' },
                routeWorkspaceId: null,
                routeProjectId: null,
            });
            expect(requestStoreService.set).toHaveBeenCalledTimes(1);
            expect(requestStoreService.set).toHaveBeenCalledWith(
                PolicyAbilityStoreKey,
                ability
            );
        });

        it('reads exactly the user from the request context when it builds', async () => {
            await guard.canActivate(context);

            expect(requestStoreService.get).toHaveBeenCalledTimes(1);
            expect(requestStoreService.get).toHaveBeenCalledWith(
                PolicyAbilityStoreKey
            );
            expect(policyDomain.requireStored).toHaveBeenCalledTimes(1);
            expect(policyDomain.requireStored).toHaveBeenCalledWith(
                UserStoreKey
            );
        });

        it('forwards a valid workspaceId and projectId route param to the ability', async () => {
            httpArgumentsHost.getRequest.mockReturnValue({
                params: {
                    workspaceId: 'route-workspace-id',
                    projectId: 'route-project-id',
                },
            });

            await guard.canActivate(context);

            expect(databaseUtil.checkIdIsValid).toHaveBeenCalledWith(
                'route-workspace-id'
            );
            expect(databaseUtil.checkIdIsValid).toHaveBeenCalledWith(
                'route-project-id'
            );
            expect(policyAbilityDomain.buildAbility).toHaveBeenCalledWith({
                scope: EnumPolicyAbilityScope.platform,
                user: { id: 'user-id', roleId: 'user-role' },
                routeWorkspaceId: 'route-workspace-id',
                routeProjectId: 'route-project-id',
            });
        });

        it('leaves a route param that is not a valid id unresolved', async () => {
            httpArgumentsHost.getRequest.mockReturnValue({
                params: { workspaceId: 'not-a-uuid', projectId: 'also-bad' },
            });
            databaseUtil.checkIdIsValid.mockReturnValue(false);

            await guard.canActivate(context);

            expect(policyAbilityDomain.buildAbility).toHaveBeenCalledWith({
                scope: EnumPolicyAbilityScope.platform,
                user: { id: 'user-id', roleId: 'user-role' },
                routeWorkspaceId: null,
                routeProjectId: null,
            });
        });
    });

    describe('readRouteId', () => {
        const requestWith = (params: Record<string, string>): IRequestApp =>
            ({ params }) as unknown as IRequestApp;

        it('returns null when the param is absent', () => {
            expect(guard['readRouteId'](requestWith({}), 'workspaceId')).toBe(
                null
            );
            expect(databaseUtil.checkIdIsValid).not.toHaveBeenCalled();
        });

        it('returns null when the param is not a valid id', () => {
            databaseUtil.checkIdIsValid.mockReturnValue(false);

            expect(
                guard['readRouteId'](
                    requestWith({ projectId: 'bad' }),
                    'projectId'
                )
            ).toBe(null);
        });

        it('returns the param when it is a valid id', () => {
            expect(
                guard['readRouteId'](
                    requestWith({ projectId: 'project-id' }),
                    'projectId'
                )
            ).toBe('project-id');
        });
    });
});
