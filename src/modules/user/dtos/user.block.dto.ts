import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsNotEmpty } from 'class-validator';

export class UserBlockedDto {
    @IsBoolean()
    @IsNotEmpty()
    blocked: boolean;

    @IsDate()
    @IsNotEmpty()
    @Type(() => Date)
    blockedDate: Date;
}
