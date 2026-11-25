import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { EnumWorkspaceMemberRole } from '@generated/prisma-client/client';
import type { WorkspaceMember } from '@generated/prisma-client/client';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { WorkspaceMemberNotFoundException } from '@modules/workspace/exceptions/workspace.member-not-found.exception';
import { WorkspaceMemberPeerForbiddenException } from '@modules/workspace/exceptions/workspace.member-peer-forbidden.exception';
import type { WorkspaceMemberUpdateRoleRequestDto } from '@modules/workspace/dtos/request/workspace.member-update-role.request.dto';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { WorkspaceUpdateMemberRoleUseCase } from '@modules/workspace/use-cases/workspace.update-member-role.use-case';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import {
    buildApiKeyContext,
    buildAuthJwtAccessContext,
    buildRequestContext,
    buildUser,
    buildUserContext,
    buildWorkspace,
    buildWorkspaceContext,
    buildWorkspaceMember,
} from '@test/unit/helpers/test.unit.request.helper';

describe('WorkspaceUpdateMemberRoleUseCase', () => {
    const workspaceMemberService: MockProxy<WorkspaceMemberService> =
        mock<WorkspaceMemberService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const tx = {} as IDatabaseTransactionClient;
    const member: WorkspaceMember = buildWorkspaceMember('user-1');
    const targetMember = {
        ...buildWorkspaceMember('user-2'),
        id: 'member-2',
        user: {
            id: 'user-2',
            email: 'user-2@example.com',
            username: 'user-2',
            name: null,
        },
    };
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(
        buildUser('user-1', 'jane@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);
    const workspaceContext = buildWorkspaceContext(buildWorkspace(), member);
    const body: WorkspaceMemberUpdateRoleRequestDto = {
        role: EnumWorkspaceMemberRole.admin,
    };

    let useCase: WorkspaceUpdateMemberRoleUseCase;

    beforeEach(async () => {
        databaseService.withTransaction.mockImplementation(fn => fn(tx));
        workspaceMemberService.getPeerTarget.mockResolvedValue(targetMember);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceUpdateMemberRoleUseCase,
                {
                    provide: WorkspaceMemberService,
                    useValue: workspaceMemberService,
                },
                { provide: DatabaseService, useValue: databaseService },
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
            ],
        }).compile();

        useCase = module.get(WorkspaceUpdateMemberRoleUseCase);
    });

    describe('execute', () => {
        it('reads the updatable member, then updates the role in one transaction', async () => {
            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext,
                'member-2',
                body
            );

            expect(result).toEqual({});
            expect(workspaceMemberService.getPeerTarget).toHaveBeenCalledWith(
                authContext,
                'workspace-1',
                member,
                'member-2'
            );
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                workspaceMemberService.updateMemberRoleInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                'workspace-1',
                targetMember,
                EnumWorkspaceMemberRole.admin
            );
        });

        it('throws the member refusal and opens no transaction', async () => {
            workspaceMemberService.getPeerTarget.mockRejectedValue(
                new WorkspaceMemberNotFoundException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext,
                    'member-2',
                    body
                )
            ).rejects.toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.memberNotFound,
            });
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('lets WorkspaceMemberPeerForbiddenException of the guarded write reach the caller untouched', async () => {
            const typed = new WorkspaceMemberPeerForbiddenException();
            workspaceMemberService.updateMemberRoleInTx.mockRejectedValue(
                typed
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext,
                    'member-2',
                    body
                )
            ).rejects.toBe(typed);
        });

        it('lets any other transaction error reach the caller untouched', async () => {
            const otherError = new Error('boom');
            workspaceMemberService.updateMemberRoleInTx.mockRejectedValue(
                otherError
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext,
                    'member-2',
                    body
                )
            ).rejects.toBe(otherError);
        });
    });
});
