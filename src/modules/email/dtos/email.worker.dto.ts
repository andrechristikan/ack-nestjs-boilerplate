import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsNotEmpty,
    IsNotEmptyObject,
    IsObject,
    IsOptional,
    ValidateNested,
} from 'class-validator';
import { EmailSendDto } from '@modules/email/dtos/email.send.dto';

export class EmailWorkerDto<T> {
    @ApiProperty({
        required: true,
        type: EmailSendDto,
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
    data?: T;
}
