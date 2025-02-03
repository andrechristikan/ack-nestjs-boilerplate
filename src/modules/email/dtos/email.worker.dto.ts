import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsNotEmpty,
    IsNotEmptyObject,
    IsObject,
    IsOptional,
    ValidateNested,
} from 'class-validator';
import { EmailSendDto } from 'src/modules/email/dtos/email.send.dto';

export class EmailWorkerDto {
    @ApiProperty({
        required: true,
        type: EmailSendDto,
        oneOf: [{ $ref: getSchemaPath(EmailSendDto) }],
    })
    @IsObject()
    @IsNotEmpty()
    @IsNotEmptyObject()
    @ValidateNested()
    @Type(() => EmailSendDto)
    send: EmailSendDto;

    @ApiProperty({
        required: false,
    })
    @IsObject()
    @IsOptional()
    @IsNotEmptyObject()
    @ValidateNested()
    data?: Record<string, any>;
}
