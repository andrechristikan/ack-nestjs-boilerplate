import { DeviceRequestDto } from '@modules/device/dtos/request/device.request.dto';
import { OmitType } from '@nestjs/swagger';

export class DeviceRefreshRequestDto extends OmitType(DeviceRequestDto, [
    'fingerprint',
] as const) {}
