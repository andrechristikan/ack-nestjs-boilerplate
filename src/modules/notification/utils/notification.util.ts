import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { EnumNotificationChannel } from '@generated/prisma-client/client';
import { NotificationPayloadEncryptionPurpose } from '@modules/notification/constants/notification.constant';
import { NotificationKindContract } from '@modules/notification/contracts/notification.kind.contract';
import { NotificationSettingContract } from '@modules/notification/contracts/notification.setting.contract';
import type {
    INotificationSealedRecord,
    INotificationUserSettingPreference,
} from '@modules/notification/interfaces/notification.interface';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NotificationUtil {
    private readonly encryptionSecret: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly helperEncryptionService: HelperEncryptionService,
        private readonly helperDateService: HelperDateService
    ) {
        this.encryptionSecret = this.configService.get<string>(
            'app.encryptionSecret'
        )!;
    }

    private pickFields(
        fields: string[],
        context: INotificationSealedRecord,
        username: string
    ): Record<string, string> {
        const picked: Record<string, string> = { username };
        for (const field of fields) {
            picked[field] = String(context[field]);
        }

        return picked;
    }

    resolveChannels(
        kind: EnumNotificationKind,
        settings: INotificationUserSettingPreference[]
    ): EnumNotificationChannel[] {
        const { type, isMandatory, pendingChannels, deliveredChannels } =
            NotificationKindContract[kind];
        const channels = [...pendingChannels, ...deliveredChannels];
        const configurable = NotificationSettingContract.find(
            contract => contract.type === type
        );
        if (isMandatory || !configurable) {
            return channels;
        }

        const disabled = new Set(
            settings
                .filter(
                    setting =>
                        setting.type === type &&
                        !setting.isActive &&
                        configurable.channels.includes(setting.channel)
                )
                .map(setting => setting.channel)
        );

        const surviving = channels.filter(channel => !disabled.has(channel));
        const hasUserFacingChannel = surviving.some(
            channel => channel !== EnumNotificationChannel.silent
        );

        return hasUserFacingChannel ? surviving : [];
    }

    toSealedField(field: string): string {
        const head = field.charAt(0).toUpperCase();

        return `encrypted${head}${field.slice(1)}`;
    }

    /** Returns the context with each secret field of the kind decrypted from its `encrypted<Field>` value. */
    openContext(
        kind: EnumNotificationKind,
        sealed: INotificationSealedRecord,
        encryptionContext: string
    ): INotificationSealedRecord {
        const { secrets } = NotificationKindContract[kind];
        const opened: INotificationSealedRecord = {};
        const sealedFields = secrets.map(field => this.toSealedField(field));
        for (const [field, value] of Object.entries(sealed)) {
            const index = sealedFields.indexOf(field);
            if (index === -1) {
                opened[field] = value;

                continue;
            }

            opened[secrets[index]!] = this.decryptPayload(
                String(value),
                encryptionContext
            );
        }

        return opened;
    }

    /** The context values the kind's `metadataFields` name, plus `username`. */
    toMetadata(
        kind: EnumNotificationKind,
        context: INotificationSealedRecord,
        username: string
    ): Record<string, string> {
        const { metadataFields } = NotificationKindContract[kind];

        return this.pickFields(metadataFields, context, username);
    }

    /** The context values the kind's `templateFields` name, plus `username`, with each `dateFields` value in RFC 2822. */
    toTemplateData(
        kind: EnumNotificationKind,
        context: INotificationSealedRecord,
        username: string
    ): Record<string, string> {
        const { templateFields } = NotificationKindContract[kind];
        const picked = this.pickFields(templateFields, context, username);

        return this.toDisplayProperties(kind, picked);
    }

    /** The properties with each of the kind's `dateFields` value formatted from ISO to RFC 2822, for text a person reads. */
    toDisplayProperties<T extends string | number | boolean | Date>(
        kind: EnumNotificationKind,
        properties: Record<string, T>
    ): Record<string, T | string> {
        const { dateFields } = NotificationKindContract[kind];
        const displayed: Record<string, T | string> = { ...properties };
        for (const field of dateFields) {
            const value = properties[field];
            if (typeof value === 'string') {
                const date = this.helperDateService.createFromIso(value);
                displayed[field] = this.helperDateService.formatToRFC2822(date);
            }
        }

        return displayed;
    }

    decryptPayload(encrypted: string, context: string): string {
        return this.helperEncryptionService.aes256Decrypt(
            encrypted,
            this.encryptionSecret,
            NotificationPayloadEncryptionPurpose,
            context
        );
    }
}
