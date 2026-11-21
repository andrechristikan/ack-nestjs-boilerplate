import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import {
    DatabaseUniqueConstraintCode,
    DatabaseWriteConflictCode,
} from '@common/database/constants/database.constant';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { EnumTermPolicyType, Prisma } from '@generated/prisma-client/client';
import { TermPolicyAlreadyAcceptedException } from '@modules/term-policy/exceptions/term-policy.already-accepted.exception';
import { EnumTermPolicyStatusCodeError } from '@modules/term-policy/enums/term-policy.status-code.enum';
import { TermPolicyNotFoundException } from '@modules/term-policy/exceptions/term-policy.not-found.exception';
import type { ITermPolicyRef } from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyAcceptanceService } from '@modules/term-policy/services/term-policy.acceptance.service';
import { TermPolicyUserAcceptUseCase } from '@modules/term-policy/use-cases/term-policy.user-accept.use-case';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import {
    buildApiKeyContext,
    buildAuthJwtAccessContext,
    buildRequestContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('TermPolicyUserAcceptUseCase', () => {
    const termPolicyAcceptanceService: MockProxy<TermPolicyAcceptanceService> =
        mock<TermPolicyAcceptanceService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const tx: MockProxy<IDatabaseTransactionClient> =
        mock<IDatabaseTransactionClient>();

    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const authContext = buildAuthJwtAccessContext('user-1');
    const latest: ITermPolicyRef = {
        id: 'term-policy-1',
        type: EnumTermPolicyType.privacy,
        version: 1,
    };
    const dto = { type: EnumTermPolicyType.privacy };

    let useCase: TermPolicyUserAcceptUseCase;

    beforeEach(async () => {
        termPolicyAcceptanceService.getLatestPublishedByType.mockResolvedValue(
            latest
        );
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyUserAcceptUseCase,
                {
                    provide: TermPolicyAcceptanceService,
                    useValue: termPolicyAcceptanceService,
                },
                { provide: DatabaseService, useValue: databaseService },
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
            ],
        }).compile();

        useCase = module.get(TermPolicyUserAcceptUseCase);
    });

    describe('execute', () => {
        it('throws TermPolicyNotFoundException from getLatestPublishedByType and opens no transaction', async () => {
            const failure = new TermPolicyNotFoundException();
            termPolicyAcceptanceService.getLatestPublishedByType.mockRejectedValue(
                failure
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, authContext, dto)
            ).rejects.toBe(failure);
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('accepts the latest published policy of the type on the transaction and returns an empty envelope', async () => {
            termPolicyAcceptanceService.userAcceptInTx.mockResolvedValue();

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                dto
            );

            expect(result).toEqual({});
            expect(
                termPolicyAcceptanceService.getLatestPublishedByType
            ).toHaveBeenCalledWith(EnumTermPolicyType.privacy);
            expect(
                termPolicyAcceptanceService.userAcceptInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                latest
            );
        });

        it('rethrows a typed exception of the write', async () => {
            const failure = new TermPolicyAlreadyAcceptedException();
            termPolicyAcceptanceService.userAcceptInTx.mockRejectedValue(
                failure
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, authContext, dto)
            ).rejects.toBe(failure);
        });

        it('maps a unique collision on termPolicyId to TermPolicyAlreadyAcceptedException', async () => {
            termPolicyAcceptanceService.userAcceptInTx.mockRejectedValue(
                new Prisma.PrismaClientKnownRequestError('unique', {
                    code: DatabaseUniqueConstraintCode,
                    clientVersion: 'test',
                    meta: { target: ['termPolicyId'] },
                })
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, authContext, dto)
            ).rejects.toMatchObject({
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.alreadyAccepted,
            });
        });

        it('maps a write conflict to TermPolicyAlreadyAcceptedException', async () => {
            termPolicyAcceptanceService.userAcceptInTx.mockRejectedValue(
                new Prisma.PrismaClientKnownRequestError('conflict', {
                    code: DatabaseWriteConflictCode,
                    clientVersion: 'test',
                })
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, authContext, dto)
            ).rejects.toMatchObject({
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.alreadyAccepted,
            });
        });

        it('wraps any other error in AppUnknownException', async () => {
            const cause = new Error('boom');
            termPolicyAcceptanceService.userAcceptInTx.mockRejectedValue(cause);

            await expect(
                useCase.execute(requestContext, apiKeyContext, authContext, dto)
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: cause,
            });
        });
    });
});
