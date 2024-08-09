import { ApiProperty, OmitType, PickType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    ArrayNotEmpty,
    IsArray,
    IsEmail,
    IsNotEmpty,
    IsNotEmptyObject,
    IsObject,
    IsOptional,
    IsString,
} from 'class-validator';

export class AwsSESCreateTemplateDto {
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

export class AwsSESUpdateTemplateDto extends AwsSESCreateTemplateDto {}

export class AwsSESGetTemplateDto {
    @ApiProperty({
        required: true,
    })
    @IsNotEmpty()
    @IsString()
    name: string;
}

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
    @IsEmail()
    @IsString()
    @IsNotEmpty()
    sender: string;

    @ApiProperty({
        required: false,
    })
    @IsEmail()
    @IsString()
    @IsOptional()
    replyTo?: string;

    @ApiProperty({
        required: true,
        isArray: true,
    })
    @IsNotEmpty()
    @IsEmail(null, { each: true })
    @IsArray()
    @ArrayNotEmpty()
    recipients: string[];

    @ApiProperty({
        required: true,
        isArray: true,
    })
    @IsOptional()
    @IsEmail(null, { each: true })
    @IsArray()
    cc?: string[];

    @ApiProperty({
        required: true,
        isArray: true,
    })
    @IsOptional()
    @IsEmail(null, { each: true })
    @IsArray()
    bcc?: string[];
}

export class AwsSESSendBulkRecipientsDto extends PickType(AwsSESSendDto, [
    'templateData',
] as const) {
    @ApiProperty({
        required: true,
    })
    @IsEmail()
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
    })
    @IsNotEmpty()
    @IsArray()
    @ArrayNotEmpty()
    @Type(() => AwsSESSendBulkRecipientsDto)
    recipients: AwsSESSendBulkRecipientsDto[];
}
