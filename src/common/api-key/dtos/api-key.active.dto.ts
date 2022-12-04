import { IsNotEmpty, IsBoolean } from 'class-validator';

export class ApiKeyActiveDto {
    @IsBoolean()
    @IsNotEmpty()
    isActive: boolean;
}
