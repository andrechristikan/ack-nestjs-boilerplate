import { ApiHideProperty, OmitType } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { AwsS3Dto } from 'src/common/aws/dtos/aws.s3.dto';
import { RoleListResponseDto } from 'src/modules/role/dtos/response/role.list.response.dto';
import { ENUM_USER_STATUS } from 'src/modules/user/constants/user.enum.constant';
import { UserListResponseDto } from 'src/modules/user/dtos/response/user.list.response.dto';

export class UserShortResponseDto extends OmitType(UserListResponseDto, [
    'role',
    'status',
    'blocked',
    'photo',
    'createdAt',
    'updatedAt',
]) {
    @ApiHideProperty()
    @Exclude()
    readonly role: RoleListResponseDto;

    @ApiHideProperty()
    @Exclude()
    readonly status: ENUM_USER_STATUS;

    @ApiHideProperty()
    @Exclude()
    readonly blocked: boolean;

    @ApiHideProperty()
    @Exclude()
    readonly photo?: AwsS3Dto;

    @ApiHideProperty()
    @Exclude()
    readonly createdAt: Date;

    @ApiHideProperty()
    @Exclude()
    readonly updatedAt: Date;
}
