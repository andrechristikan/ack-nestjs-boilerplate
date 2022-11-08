import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UserActiveDto {
    @IsBoolean()
    @IsNotEmpty()
    readonly isActive: boolean;
}
