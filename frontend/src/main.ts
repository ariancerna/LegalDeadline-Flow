import { registerLocaleData } from '@angular/common';
import localeEsPe from '@angular/common/locales/es-PE';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Formatos de número y fecha de Perú para los pipes de Angular (LOCALE_ID = 'es-PE').
registerLocaleData(localeEsPe);

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
