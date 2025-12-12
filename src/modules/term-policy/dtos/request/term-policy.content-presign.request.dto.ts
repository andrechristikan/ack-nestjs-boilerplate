import { AwsS3PresignRequestDto } from '@common/aws/dtos/request/aws.s3-presign.request.dto';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { TermPolicyAcceptRequestDto } from '@modules/term-policy/dtos/request/term-policy.accept.request.dto';
import { ApiProperty, IntersectionType, PickType } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class TermPolicyContentPresignRequestDto extends IntersectionType(
    TermPolicyAcceptRequestDto,
    PickType(AwsS3PresignRequestDto, ['size'])
) {
    @ApiProperty({
        required: true,
        description: 'Language of the term document',
        example: EnumMessageLanguage.en,
        enum: EnumMessageLanguage,
    })
    @IsString()
    @IsEnum(EnumMessageLanguage)
    @IsNotEmpty()
    readonly language: EnumMessageLanguage;

    @ApiProperty({
        description: 'Version of the terms policy',
        example: 1,
        required: true,
    })
    @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 0 })
    @IsNotEmpty()
    readonly version: number;
}
