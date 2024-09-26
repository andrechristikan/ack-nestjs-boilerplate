import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { CountryService } from 'src/modules/country/services/country.service';
import { CountryCreateRequestDto } from 'src/modules/country/dtos/request/country.create.request.dto';
import { AwsS3Service } from 'src/modules/aws/services/aws.s3.service';

@Injectable()
export class MigrationCountrySeed {
    constructor(
        private readonly countryService: CountryService,
        private readonly awsS3Service: AwsS3Service
    ) {}

    @Command({
        command: 'seed:country',
        describe: 'seeds countries',
    })
    async seeds(): Promise<void> {
        try {
            const bucket = this.awsS3Service.getBucket();
            const region = this.awsS3Service.getRegion();
            const assetPath = this.awsS3Service.getAssetPath();
            const countyFlagPath = this.countryService.getAssetPath();
            const data: CountryCreateRequestDto[] = [
                {
                    name: 'Indonesia',
                    alpha2Code: 'ID',
                    alpha3Code: 'IDN',
                    domain: 'id',
                    fipsCode: 'ID',
                    numericCode: '360',
                    phoneCode: ['62'],
                    continent: 'Asia',
                    timeZone: 'Asia/Jakarta',
                    currency: 'IDR',
                    image: {
                        bucket,
                        path: `${assetPath}${countyFlagPath}`,
                        pathWithFilename: `${assetPath}${countyFlagPath}/id.png`,
                        filename: 'id.png',
                        completedUrl: `https://${bucket}.s3.${region}.amazonaws.com/${assetPath}${countyFlagPath}/id.png`,
                        baseUrl: `https://${bucket}.s3.${region}.amazonaws.com`,
                        mime: 'png',
                        size: 13268,
                    },
                },
            ];

            await this.countryService.createMany(data);
        } catch (err: any) {
            throw new Error(err.message);
        }

        return;
    }

    @Command({
        command: 'remove:country',
        describe: 'remove countries',
    })
    async remove(): Promise<void> {
        try {
            await this.countryService.deleteMany({});
        } catch (err: any) {
            throw new Error(err.message);
        }

        return;
    }
}
