import { IsNotEmpty, IsBoolean } from 'class-validator';

export class RoleActiveDto {
    @IsBoolean()
    @IsNotEmpty()
    isActive: boolean;
}
