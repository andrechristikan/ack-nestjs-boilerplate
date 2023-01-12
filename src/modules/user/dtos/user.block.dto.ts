import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UserBlockedDto {
    @IsBoolean()
    @IsNotEmpty()
    blocked: boolean;
}
