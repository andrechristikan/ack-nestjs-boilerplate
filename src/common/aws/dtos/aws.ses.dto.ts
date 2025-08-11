import { IsCustomEmail } from '@common/request/validations/request.custom-email.validation';
import {
    ApiProperty,
    OmitType,
    PickType,
    getSchemaPath,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    ArrayNotEmpty,
    IsArray,
    IsNotEmpty,
    IsNotEmptyObject,
    IsObject,
    IsOptional,
    IsString,
} from 'class-validator';

export class AwsSESTemplateDto {
    @ApiProperty({
        required: true,
    })
    @IsNotEmpty()
    @IsString()
    name: string;

    @ApiProperty({
        required: false,
    })
    @IsOptional()
    @IsString()
    htmlBody?: string;

    @ApiProperty({
        required: true,
    })
    @IsNotEmpty()
    @IsString()
    subject: string;

    @ApiProperty({
        required: false,
    })
    @IsOptional()
    @IsString()
    plainTextBody?: string;
}

export class AwsSESGetTemplateDto extends PickType(AwsSESTemplateDto, [
    'name',
] as const) {}

export class AwsSESSendDto<T> {
    @ApiProperty({
        required: true,
    })
    @IsNotEmpty()
    @IsString()
    templateName: string;

    @ApiProperty({
        required: false,
    })
    @IsOptional()
    @IsObject()
    @IsNotEmptyObject()
    templateData?: T;

    @ApiProperty({
        required: true,
    })
    @IsCustomEmail()
    @IsString()
    @IsNotEmpty()
    sender: string;

    @ApiProperty({
        required: false,
    })
    @IsCustomEmail()
    @IsString()
    @IsOptional()
    replyTo?: string;

    @ApiProperty({
        required: true,
        isArray: true,
    })
    @IsNotEmpty()
    @IsCustomEmail({ each: true })
    @IsArray()
    @ArrayNotEmpty()
    recipients: string[];

    @ApiProperty({
        required: true,
        isArray: true,
    })
    @IsOptional()
    @IsCustomEmail({ each: true })
    @IsArray()
    cc?: string[];

    @ApiProperty({
        required: true,
        isArray: true,
    })
    @IsOptional()
    @IsCustomEmail({ each: true })
    @IsArray()
    bcc?: string[];
}

export class AwsSESSendBulkRecipientsDto extends PickType(AwsSESSendDto, [
    'templateData',
] as const) {
    @ApiProperty({
        required: true,
    })
    @IsCustomEmail()
    @IsString()
    @IsNotEmpty()
    recipient: string;
}

export class AwsSESSendBulkDto extends OmitType(AwsSESSendDto, [
    'recipients',
    'templateData',
]) {
    @ApiProperty({
        required: true,
        isArray: true,
        type: AwsSESSendBulkRecipientsDto,
        oneOf: [{ $ref: getSchemaPath(AwsSESSendBulkRecipientsDto) }],
    })
    @IsNotEmpty()
    @IsArray()
    @ArrayNotEmpty()
    @Type(() => AwsSESSendBulkRecipientsDto)
    recipients: AwsSESSendBulkRecipientsDto[];
}
