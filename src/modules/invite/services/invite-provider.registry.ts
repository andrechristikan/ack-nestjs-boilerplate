import { InviteProvider } from '@modules/invite/interfaces/invite.interface';
import { Injectable } from '@nestjs/common';
import { EnumInviteType } from '@prisma/client';

@Injectable()
export class InviteProviderRegistry {
    private readonly providers = new Map<EnumInviteType, InviteProvider>();

    register(provider: InviteProvider): void {
        const existing = this.providers.get(provider.invitationType);
        if (existing) {
            throw new Error(
                `Duplicate invite provider registration for "${provider.invitationType}"`
            );
        }

        this.providers.set(provider.invitationType, provider);
    }

    getOrThrow(invitationType: EnumInviteType): InviteProvider {
        const provider = this.providers.get(invitationType);
        if (!provider) {
            throw new Error(
                `Invite provider not registered for "${invitationType}"`
            );
        }

        return provider;
    }
}
