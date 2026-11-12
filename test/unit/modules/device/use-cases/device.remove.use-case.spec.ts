import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import { DeviceNotFoundException } from '@modules/device/exceptions/device.not-found.exception';
import { SessionService } from '@modules/session/services/session.service';
import { DeviceRemoveUseCase } from '@modules/device/use-cases/device.remove.use-case';

describe('DeviceRemoveUseCase', () => {
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const context: IRequestContext = {
        actorUserId: 'user-1',
        workspaceId: null,
        requestLog: {
            userAgent: {
                ua: null,
                browser: null,
                cpu: null,
                device: null,
                engine: null,
                os: null,
            },
            ipAddress: '127.0.0.1',
            geoLocation: null,
        },
    };
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

            const result = await useCase.execute(
                'user-1',
                'device-ownership-1',
                context
            );

            expect(result).toEqual({});
            expect(sessionService.removeDeviceOwnership).toHaveBeenCalledWith(
                'user-1',
                'device-ownership-1',
                context
            );
        });

        it('rethrows the removal exception', async () => {
            const notFound = new DeviceNotFoundException();
            sessionService.removeDeviceOwnership.mockRejectedValue(notFound);

            await expect(
                useCase.execute('user-1', 'device-ownership-1', context)
            ).rejects.toBe(notFound);
        });
    });
});
