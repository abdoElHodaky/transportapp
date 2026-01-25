import { Module } from '@nestjs/common';
import { I18nModule as NestI18nModule, AcceptLanguageResolver, QueryResolver, HeaderResolver } from 'nestjs-i18n';
import { join } from 'path';
import { I18nService } from './i18n.service';
import { LocalizationService } from './services/localization.service';
import { CurrencyService } from './services/currency.service';
import { DateTimeService } from './services/datetime.service';

@Module({
  imports: [
    NestI18nModule.forRoot({
      fallbackLanguage: process.env.DEFAULT_LANGUAGE || 'en',
      loaderOptions: {
        path: join(__dirname, '/locales/'),
        watch: true,
      },
      resolvers: [
        { use: QueryResolver, options: ['lang'] },
        { use: HeaderResolver, options: ['x-lang'] },
        AcceptLanguageResolver,
      ],
      typesOutputPath: join(__dirname, '../generated/i18n.generated.ts'),
    }),
  ],
  providers: [
    I18nService,
    LocalizationService,
    CurrencyService,
    DateTimeService,
  ],
  exports: [
    I18nService,
    LocalizationService,
    CurrencyService,
    DateTimeService,
  ],
})
export class I18nModule {}

