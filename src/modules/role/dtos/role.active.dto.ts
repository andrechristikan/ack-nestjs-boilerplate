import { IsNotEmpty, IsBoolean } from 'class-validator';

export class RoleActiveDto {
    @IsBoolean()
    @IsNotEmpty()
    readonly isActive: boolean;
}
