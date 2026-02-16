import { IRequestLog } from '@common/request/interfaces/request.interface';
import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { DeviceDto } from '@modules/device/dtos/device.dto';

export interface IDeviceService {
    refresh(
        userId: string,
        { fingerprint, name, notificationToken, platform }: DeviceDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>>;
}
