import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { EnumDevicePlatform } from '@generated/prisma-client/client';
import {
    buildUser,
    buildRequestContext,
    buildApiKeyContext,
    buildUserContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { TestUnitKitConfigValues } from '@test/unit/helpers/test.unit.kit.helper';
import { DeviceService } from '@modules/device/services/device.service';
import { DeviceNotFoundException } from '@modules/device/exceptions/device.not-found.exception';
import type { DeviceRefreshRequestDto } from '@modules/device/dtos/request/device.refresh.request.dto';
import { DeviceRefreshUseCase } from '@modules/device/use-cases/device.refresh.use-case';

describe('DeviceRefreshUseCase', () => {
    const deviceService: MockProxy<DeviceService> = mock<DeviceService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const tx = {} as IDatabaseTransactionClient;
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(
        buildUser('user-1', 'actor@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);
    const body: DeviceRefreshRequestDto = {
        name: 'iPhone 13',
        platform: EnumDevicePlatform.ios,
        notificationToken: null,
    };
    let useCase: DeviceRefreshUseCase;

    beforeEach(async () => {
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DeviceRefreshUseCase,
                { provide: DeviceService, useValue: deviceService },
                { provide: DatabaseService, useValue: databaseService },
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
            ],
        }).compile();

        useCase = module.get(DeviceRefreshUseCase);
    });

    describe('execute', () => {
        it('refreshes the device on the one transaction it opened and returns an empty response', async () => {
            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                body
            );

            expect(result).toEqual({});
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(deviceService.refreshInTx).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                authContext.deviceOwnershipId,
                body
            );
        });

        it('rethrows the refresh exception', async () => {
            const notFound = new DeviceNotFoundException();
            deviceService.refreshInTx.mockRejectedValue(notFound);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    body
                )
            ).rejects.toBe(notFound);
        });

        it('rethrows any other failure of the transaction untouched', async () => {
            const failure = new Error('database exploded');
            databaseService.withTransaction.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    body
                )
            ).rejects.toBe(failure);
        });
    });
});
