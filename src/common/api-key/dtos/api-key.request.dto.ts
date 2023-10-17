import { IsNotEmpty, IsUUID } from 'class-validator';

export class ApiKeyRequestDto {
    @IsNotEmpty()
    @IsUUID('4')
    apiKey: string;
}
