import { Injectable } from '@nestjs/common';
import { I18nService as NestI18nService, I18nContext } from 'nestjs-i18n';

@Injectable()
export class I18nService {
  constructor(private readonly i18n: NestI18nService) {}

  /**
   * 🌍 Translate a key with optional arguments
   */
  translate(key: string, options?: any): string {
    const lang = I18nContext.current()?.lang || 'en';
    return this.i18n.translate(key, { lang, ...options });
  }

  /**
   * 🌍 Translate with specific language
   */
  translateWithLang(key: string, lang: string, options?: any): string {
    return this.i18n.translate(key, { lang, ...options });
  }

  /**
   * 🌍 Get current language
   */
  getCurrentLanguage(): string {
    return I18nContext.current()?.lang || 'en';
  }

  /**
   * 🌍 Check if language is supported
   */
  isSupportedLanguage(lang: string): boolean {
    const supportedLanguages = (process.env.SUPPORTED_LANGUAGES || 'en,ar').split(',');
    return supportedLanguages.includes(lang);
  }

  /**
   * 🌍 Get supported languages
   */
  getSupportedLanguages(): string[] {
    return (process.env.SUPPORTED_LANGUAGES || 'en,ar').split(',');
  }

  /**
   * 🌍 Get language direction (LTR/RTL)
   */
  getLanguageDirection(lang?: string): 'ltr' | 'rtl' {
    const language = lang || this.getCurrentLanguage();
    const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
    return rtlLanguages.includes(language) ? 'rtl' : 'ltr';
  }

  /**
   * 🌍 Format error messages
   */
  formatError(errorKey: string, options?: any): string {
    return this.translate(`errors.${errorKey}`, options);
  }

  /**
   * 🌍 Format success messages
   */
  formatSuccess(successKey: string, options?: any): string {
    return this.translate(`success.${successKey}`, options);
  }

  /**
   * 🌍 Format validation messages
   */
  formatValidation(validationKey: string, options?: any): string {
    return this.translate(`validation.${validationKey}`, options);
  }

  /**
   * 🌍 Format notification messages
   */
  formatNotification(notificationKey: string, options?: any): string {
    return this.translate(`notifications.${notificationKey}`, options);
  }

  /**
   * 🌍 Get localized enum values
   */
  getLocalizedEnum(enumKey: string, enumValue: string): string {
    return this.translate(`enums.${enumKey}.${enumValue}`);
  }

  /**
   * 🌍 Get localized trip status
   */
  getTripStatus(status: string): string {
    return this.getLocalizedEnum('tripStatus', status);
  }

  /**
   * 🌍 Get localized payment method
   */
  getPaymentMethod(method: string): string {
    return this.getLocalizedEnum('paymentMethod', method);
  }

  /**
   * 🌍 Get localized user role
   */
  getUserRole(role: string): string {
    return this.getLocalizedEnum('userRole', role);
  }
}

