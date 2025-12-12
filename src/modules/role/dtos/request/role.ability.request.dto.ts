import { ApiProperty } from '@nestjs/swagger';
import {
    ArrayNotEmpty,
    IsArray,
    IsEnum,
    IsNotEmpty,
    IsString,
} from 'class-validator';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from '@modules/policy/enums/policy.enum';

export class RoleAbilityRequestDto {
    @ApiProperty({
        required: true,
        description: 'Ability subject',
        enum: ENUM_POLICY_SUBJECT,
    })
    @IsNotEmpty()
    @IsString()
    @IsEnum(ENUM_POLICY_SUBJECT)
    subject: ENUM_POLICY_SUBJECT;

    @ApiProperty({
        required: true,
        description: 'Ability action base on subject',
        isArray: true,
        default: [ENUM_POLICY_ACTION.MANAGE],
        enum: ENUM_POLICY_ACTION,
    })
    @IsString({ each: true })
    @IsEnum(ENUM_POLICY_ACTION, { each: true })
    @IsArray()
    @IsNotEmpty()
    @ArrayNotEmpty()
    action: ENUM_POLICY_ACTION[];
}
