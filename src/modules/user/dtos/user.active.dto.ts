import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsNotEmpty } from 'class-validator';

export class UserActiveDto {
    @IsBoolean()
    @IsNotEmpty()
    isActive: boolean;

    @IsDate()
    @IsNotEmpty()
    @Type(() => Date)
    inactiveDate: Date;
}
