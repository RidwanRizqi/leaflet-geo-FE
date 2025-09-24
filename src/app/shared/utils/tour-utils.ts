import Step from 'shepherd.js/src/types/step';
import { TranslateService } from '@ngx-translate/core';

export const defaultBuiltInButtons = {
  cancel: {
    classes: 'cancel-button',
    secondary: true,
    text: (translate: TranslateService) => translate.instant('TOUR.BUTTON.EXIT') || '',
    type: 'cancel'
  },
  next: {
    classes: 'btn btn-success',
    text: (translate: TranslateService) => translate.instant('TOUR.BUTTON.NEXT') || '',
    type: 'next'
  },
  back: {
    classes: 'back-button',
    secondary: true,
    text: (translate: TranslateService) => translate.instant('TOUR.BUTTON.BACK') || '',
    type: 'back'
  },
  finish: {
    classes: 'btn btn-primary',
    text: (translate: TranslateService) => translate.instant('TOUR.BUTTON.FINISH') || '',
    type: 'cancel'
  },
};

export const defaultStepOptions: Step.StepOptions = {
  classes: 'shepherd-theme-arrows custom-default-class',
  scrollTo: { behavior: 'smooth', block: 'center' },
  cancelIcon: {
    enabled: true
  },
  canClickTarget: false,
};
