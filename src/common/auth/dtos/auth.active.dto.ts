import { IsBoolean, IsNotEmpty } from 'class-validator';

export class AuthActiveDto {
    @IsBoolean()
    @IsNotEmpty()
    readonly isActive: boolean;
}
