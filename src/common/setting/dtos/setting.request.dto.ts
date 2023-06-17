import { Type } from 'class-transformer';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class SettingRequestDto {
    @IsNotEmpty()
    @IsUUID('4')
    @Type(() => String)
    setting: string;
}
