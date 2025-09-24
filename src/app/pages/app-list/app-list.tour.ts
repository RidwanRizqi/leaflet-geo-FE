import Step from 'shepherd.js/src/types/step';
import { ShepherdService } from 'angular-shepherd';
import { TranslateService } from '@ngx-translate/core';
import { defaultBuiltInButtons, defaultStepOptions } from 'src/app/shared/utils/tour-utils';

export function buildAppListSteps(translate: TranslateService): Step.StepOptions[] {
  return [
    {
      buttons: [{ ...defaultBuiltInButtons.next, text: defaultBuiltInButtons.next.text(translate) }],
      arrow: false,
      title: translate.instant('APPPAGE.APPLIST.TOUR.STEP0.TITLE'),
      text: translate.instant('APPPAGE.APPLIST.TOUR.STEP0.TEXT'),
    },
    {
      attachTo: {
        element: '#sheperd-test',
        on: 'bottom'
      },
      buttons: [
        { ...defaultBuiltInButtons.back, text: defaultBuiltInButtons.back.text(translate) },
        { ...defaultBuiltInButtons.finish, text: defaultBuiltInButtons.finish.text(translate) }
      ],
      arrow: false,
      title: translate.instant('APPPAGE.APPLIST.TOUR.STEP1.TITLE'),
      text: translate.instant('APPPAGE.APPLIST.TOUR.STEP1.TEXT'),
    },
    // Tambahkan step lain sesuai kebutuhan, gunakan key translate yang konsisten
  ];
}

export function initializeTour(shepherdService: ShepherdService, steps: Step.StepOptions[], stepOptions = defaultStepOptions) {
  shepherdService.defaultStepOptions = stepOptions;
  shepherdService.modal = true;
  shepherdService.addSteps(steps);
  shepherdService.start();
}

export function buildTour(shepherdService: ShepherdService, translate: TranslateService, stepOptions = defaultStepOptions) {
  // Stop tour jika sedang aktif sebelum memulai ulang
  if (shepherdService.isActive) {
    shepherdService.cancel();
  }
  initializeTour(shepherdService, buildAppListSteps(translate), stepOptions);
}

// Jika ingin custom button/option untuk step tertentu, bisa override di sini:
// export const customStepOptions: Step.StepOptions = { ...defaultStepOptions, ...{ /* custom */ } };
