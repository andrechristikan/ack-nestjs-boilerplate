import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    buildRequestContextUser,
    buildUser,
} from '@test/unit/helpers/test.unit.request.helper';
import { DeviceNotFoundException } from '@modules/device/exceptions/device.not-found.exception';
import { SessionService } from '@modules/session/services/session.service';
import { DeviceRemoveUseCase } from '@modules/device/use-cases/device.remove.use-case';

describe('DeviceRemoveUseCase', () => {
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const context = buildRequestContextUser(
        buildUser('user-1', 'actor@example.com')
    );
    let useCase: DeviceRemoveUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DeviceRemoveUseCase,
                { provide: SessionService, useValue: sessionService },
            ],
        }).compile();

        useCase = module.get(DeviceRemoveUseCase);
    });

    describe('execute', () => {
        it('removes the ownership as the owner passing the request context and returns an empty envelope', async () => {
            sessionService.removeDeviceOwnership.mockResolvedValue();

            const result = await useCase.execute(context, 'device-ownership-1');

            expect(result).toEqual({});
            expect(sessionService.removeDeviceOwnership).toHaveBeenCalledWith(
                context.snapshot,
                'device-ownership-1'
            );
        });

        it('rethrows the removal exception', async () => {
            const notFound = new DeviceNotFoundException();
            sessionService.removeDeviceOwnership.mockRejectedValue(notFound);

            await expect(
                useCase.execute(context, 'device-ownership-1')
            ).rejects.toBe(notFound);
        });
    });
});
