import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumDevicePlatform } from '@generated/prisma-client/client';
import {
    buildUser,
    buildRequestContext,
    buildApiKeyContext,
    buildUserContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';
import { DeviceService } from '@modules/device/services/device.service';
import { DeviceNotFoundException } from '@modules/device/exceptions/device.not-found.exception';
import type { DeviceRefreshRequestDto } from '@modules/device/dtos/request/device.refresh.request.dto';
import { DeviceRefreshUseCase } from '@modules/device/use-cases/device.refresh.use-case';

describe('DeviceRefreshUseCase', () => {
    const deviceService: MockProxy<DeviceService> = mock<DeviceService>();
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
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DeviceRefreshUseCase,
                { provide: DeviceService, useValue: deviceService },
            ],
        }).compile();

        useCase = module.get(DeviceRefreshUseCase);
    });

    describe('execute', () => {
        it('forwards the refresh body and the request context to the domain and returns an empty response', async () => {
            deviceService.refresh.mockResolvedValue();

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                body
            );

            expect(result).toEqual({});
            expect(deviceService.refresh).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                authContext.deviceOwnershipId,
                body
            );
        });

        it('rethrows the domain refresh exception', async () => {
            const notFound = new DeviceNotFoundException();
            deviceService.refresh.mockRejectedValue(notFound);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    body
                )
            ).rejects.toBe(notFound);
        });
    });
});
