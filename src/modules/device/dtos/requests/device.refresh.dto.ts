import { DeviceRequestDto } from '@modules/device/dtos/requests/device.request.dto';
import { OmitType } from '@nestjs/swagger';

export class DeviceRefreshRequestDto extends OmitType(DeviceRequestDto, [
    'fingerprint',
] as const) {}
