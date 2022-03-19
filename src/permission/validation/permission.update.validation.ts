import { IsString, IsNotEmpty, IsOptional, ValidateIf } from 'class-validator';

export default class PermissionUpdateValidation {
    @IsString()
    @IsNotEmpty()
    readonly name: string;

    @IsString()
    @IsOptional()
    @ValidateIf((e) => e.description !== '')
    readonly description?: string;
}
