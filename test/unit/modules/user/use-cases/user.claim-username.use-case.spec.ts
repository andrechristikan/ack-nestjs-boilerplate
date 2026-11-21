import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserUsernameNotAllowedException } from '@modules/user/exceptions/user.username-not-allowed.exception';
import type { IUserCheckUsername } from '@modules/user/interfaces/user.interface';
import { UserProfileService } from '@modules/user/services/user.profile.service';
import { UserService } from '@modules/user/services/user.service';
import type { UserClaimUsernameRequestDto } from '@modules/user/dtos/request/user.claim-username.request.dto';
import { UserClaimUsernameUseCase } from '@modules/user/use-cases/user.claim-username.use-case';
import {
    buildUser,
    buildRequestContext,
    buildApiKeyContext,
    buildUserContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';
import { buildPrismaKnownRequestError } from '@test/unit/helpers/test.unit.database.helper';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { TestUnitKitConfigValues } from '@test/unit/helpers/test.unit.kit.helper';

describe('UserClaimUsernameUseCase', () => {
    const userProfileService: MockProxy<UserProfileService> =
        mock<UserProfileService>();
    const userService: MockProxy<UserService> = mock<UserService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(
        buildUser('user-sable', 'user-sable@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);
    const tx = {} as IDatabaseTransactionClient;
    const dto: UserClaimUsernameRequestDto = {
        username: 'sableGrove' as Lowercase<string>,
    };
    const check: IUserCheckUsername = {
        pattern: false,
        badWord: false,
        exist: false,
    };

    let useCase: UserClaimUsernameUseCase;

    beforeEach(async () => {
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        userService.checkUsername.mockResolvedValue(check);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserClaimUsernameUseCase,
                { provide: UserProfileService, useValue: userProfileService },
                { provide: UserService, useValue: userService },
                { provide: DatabaseService, useValue: databaseService },
                DatabaseUtil,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
            ],
        }).compile();
        useCase = module.get(UserClaimUsernameUseCase);
    });

    describe('execute', () => {
        it('checks the username then opens one transaction over claimUsernameInTx', async () => {
            await expect(
                useCase.execute(requestContext, apiKeyContext, authContext, dto)
            ).resolves.toEqual({});

            expect(userService.checkUsername).toHaveBeenCalledWith(
                dto.username
            );
            expect(userService.assertUsernameAvailable).toHaveBeenCalledWith(
                check
            );
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(userProfileService.claimUsernameInTx).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                dto.username
            );
            expect(userService.assertUsernameAvailable).toHaveBeenCalledBefore(
                databaseService.withTransaction
            );
        });

        it('leaves withTransaction uncalled when the username is refused', async () => {
            userService.assertUsernameAvailable.mockImplementation(() => {
                throw new UserUsernameNotAllowedException();
            });

            await expect(
                useCase.execute(requestContext, apiKeyContext, authContext, dto)
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.usernameNotAllowed,
            });

            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('maps a username unique collision to UserUsernameExistException', async () => {
            userProfileService.claimUsernameInTx.mockRejectedValue(
                buildPrismaKnownRequestError('P2002', 'username')
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, authContext, dto)
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.usernameExist,
            });
        });

        it('rethrows an AppBaseException raised while claiming', async () => {
            const error = new UserUsernameNotAllowedException();
            userProfileService.claimUsernameInTx.mockRejectedValue(error);

            await expect(
                useCase.execute(requestContext, apiKeyContext, authContext, dto)
            ).rejects.toBe(error);
        });

        it('wraps an unknown error raised while claiming', async () => {
            const error = new Error('boom');
            userProfileService.claimUsernameInTx.mockRejectedValue(error);

            await expect(
                useCase.execute(requestContext, apiKeyContext, authContext, dto)
            ).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                rawError: error,
            });
        });
    });
});
