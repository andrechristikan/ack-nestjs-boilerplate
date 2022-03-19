import { IsString, IsNotEmpty, IsOptional, ValidateIf } from 'class-validator';

export class PermissionUpdateValidation {
    @IsString()
    @IsNotEmpty()
    readonly name: string;

    @IsString()
    @IsOptional()
    @ValidateIf((e) => e.description !== '')
    readonly description?: string;
}
