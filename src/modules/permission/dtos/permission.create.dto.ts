import { IsString, IsNotEmpty, ValidateIf, IsBoolean } from 'class-validator';

export class PermissionCreateDto {
    @IsString()
    @IsNotEmpty()
    readonly name: string;

    @IsString()
    @IsNotEmpty()
    readonly code: string;

    @IsString()
    @IsNotEmpty()
    readonly description: string;

    @IsBoolean()
    @IsNotEmpty()
    @ValidateIf((e) => e.isActive !== '')
    readonly isActive?: boolean;
}
