import { IsNotEmpty, IsUUID } from 'class-validator';

export class SettingRequestDto {
    @IsNotEmpty()
    @IsUUID('4')
    setting: string;
}
