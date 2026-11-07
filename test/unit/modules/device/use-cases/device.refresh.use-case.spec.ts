import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumDevicePlatform,
} from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { DeviceService } from '@modules/device/services/device.service';
import { DeviceNotFoundException } from '@modules/device/exceptions/device.not-found.exception';
import type { DeviceRefreshRequestDto } from '@modules/device/dtos/request/device.refresh.request.dto';
import { DeviceRefreshUseCase } from '@modules/device/use-cases/device.refresh.use-case';

describe('DeviceRefreshUseCase', () => {
    const deviceService: MockProxy<DeviceService> = mock<DeviceService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    let useCase: DeviceRefreshUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DeviceRefreshUseCase,
                { provide: DeviceService, useValue: deviceService },
                { provide: ActivityLogService, useValue: activityLogService },
            ],
        }).compile();

        useCase = module.get(DeviceRefreshUseCase);
    });

    describe('execute', () => {
        const refreshActivityLog: IActivityLogStaged = {
            action: EnumActivityLogAction.userDeviceRefresh,
            metadata: {},
            userId: null,
            createdBy: null,
            workspaceId: null,
        };

        it('forwards the refresh body to the domain, stages the refresh activity after it, and returns an empty response', async () => {
            const body: DeviceRefreshRequestDto = {
                name: 'iPhone 13',
                platform: EnumDevicePlatform.ios,
                notificationToken: null,
            };
            const calls: string[] = [];
            activityLogService.prepare.mockReturnValue(refreshActivityLog);
            deviceService.refresh.mockImplementation(async () => {
                calls.push('refresh');
            });
            activityLogService.stagePrepared.mockImplementation(() => {
                calls.push('stage');
            });

            const result = await useCase.execute(
                'user-1',
                'device-ownership-1',
                body
            );

            expect(result).toEqual({});
            expect(deviceService.refresh).toHaveBeenCalledWith(
                'user-1',
                'device-ownership-1',
                body
            );
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userDeviceRefresh,
            });
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                refreshActivityLog,
            ]);
            expect(calls).toEqual(['refresh', 'stage']);
        });

        it('stages nothing when the domain refresh throws', async () => {
            const notFound = new DeviceNotFoundException();
            activityLogService.prepare.mockReturnValue(refreshActivityLog);
            deviceService.refresh.mockRejectedValue(notFound);

            await expect(
                useCase.execute('user-1', 'device-ownership-1', {
                    name: null,
                    platform: EnumDevicePlatform.ios,
                    notificationToken: null,
                })
            ).rejects.toBe(notFound);
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });
    });
});
