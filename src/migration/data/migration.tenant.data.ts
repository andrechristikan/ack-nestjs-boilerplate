import { EnumAppEnvironment } from '@app/enums/app.enum';
import { TenantCreateRequestDto } from '@modules/tenant/dtos/request/tenant.create.request.dto';

const tenantData: TenantCreateRequestDto[] = [
    {
        name: 'Default Organization',
    },
];

export const migrationTenantData: Record<
    EnumAppEnvironment,
    TenantCreateRequestDto[]
> = {
    [EnumAppEnvironment.local]: tenantData,
    [EnumAppEnvironment.development]: tenantData,
    [EnumAppEnvironment.staging]: tenantData,
    [EnumAppEnvironment.production]: [],
};
