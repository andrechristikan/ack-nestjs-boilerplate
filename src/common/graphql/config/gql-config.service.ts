import { ConfigService } from '@nestjs/config';
import { ApolloDriverConfig } from '@nestjs/apollo';
import { Injectable } from '@nestjs/common';
import { GqlOptionsFactory } from '@nestjs/graphql';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';

@Injectable()
export class GqlConfigService implements GqlOptionsFactory {
  constructor(private configService: ConfigService) {}
  createGqlOptions(): ApolloDriverConfig {
    return {
      // schema options
      autoSchemaFile: this.configService.get<string>('graphql.schemaDestination') || 'schema.graphql',
      sortSchema: this.configService.get<boolean>('graphql.sortSchema'),
      buildSchemaOptions: {
        numberScalarMode: 'integer',
      },
      // subscription
      installSubscriptionHandlers: true,
      includeStacktraceInErrorResponses: this.configService.get<boolean>('graphql.debug'),
      playground: false,
      context: ({ req, res }) => ({ req, res }),
      plugins:[
        ApolloServerPluginLandingPageLocalDefault()
      ],

    };
  }
}
