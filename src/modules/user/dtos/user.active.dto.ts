import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UserActiveDto {
    @IsBoolean()
    @IsNotEmpty()
    isActive: boolean;
}
