import { IntersectionType, PickType } from '@nestjs/swagger';
import { ActivityCreateResponse } from 'src/modules/activity/dtos/request/activity.create.response.dto';
import { PasswordHistoryCreateByAdminRequestDto } from 'src/modules/password-history/dtos/request/password-history.create-by-admin.request.dto';

export class ActivityCreateByAdminResponse extends IntersectionType(
    PickType(PasswordHistoryCreateByAdminRequestDto, ['by'] as const),
    ActivityCreateResponse
) {}
