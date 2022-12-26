import { IsNotEmpty, IsBoolean } from 'class-validator';

export class PermissionActiveDto {
    @IsBoolean()
    @IsNotEmpty()
    isActive: boolean;
}
