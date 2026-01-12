import { Pipe, PipeTransform } from "@angular/core";
import { LangChangeEvent, TranslateService } from "@ngx-translate/core";

@Pipe({
    name: "timeAgo",
    pure: false, // Make the pipe impure to recalculate the time dynamically
})
export class TimeAgoPipe implements PipeTransform {
    LANG: any | undefined;

    constructor(public translate: TranslateService) {
        // Subscribe to language changes
        this.translate.get(["COMMON"]).subscribe((lang: any) => {
            let obj = {
                COMMON: lang.COMMON,
            };

            // Initialize component data based on language
            this.LANG = obj;
        });

        // Handle language changes
        this.translate.onLangChange.subscribe((event: LangChangeEvent) => {
            let obj = {
                COMMON: event.translations.COMMON,
            };

            // Update component data on language change
            this.LANG = obj;
        });
    }

    transform(timestamps: string): string {
        if (timestamps) {
            const now = new Date();
            const diffInMs =
                now.getTime() -
                new Date(timestamps.replace(" ", "T")).getTime();

            const diffInSeconds = Math.floor(diffInMs / 1000);
            const diffInMinutes = Math.floor(diffInSeconds / 60);
            const diffInHours = Math.floor(diffInMinutes / 60);
            const diffInDays = Math.floor(diffInHours / 24);

            if (diffInSeconds < 60) {
                return `${diffInSeconds} ${this.LANG?.COMMON?.LABEL?.SECONDSAGO}`;
            } else if (diffInMinutes < 60) {
                return `${diffInMinutes} ${this.LANG?.COMMON?.LABEL?.MINUTESAGO}`;
            } else if (diffInHours < 24) {
                return `${diffInHours} ${this.LANG?.COMMON?.LABEL?.HOURSAGO}`;
            } else {
                return `${diffInDays} ${this.LANG?.COMMON?.LABEL?.DAYSAGO}`;
            }
        } else {
            return "";
        }
    }
}
