export type NSWReminderKey =
  | 'eofy-30-day'
  | 'eofy-14-day'
  | 'submission-30-day'
  | 'submission-14-day';

export type NSWReminderBannerData = {
  kind: 'nsw-reminder';
  reminderKey: NSWReminderKey;
  year: number;
  title: string;
  message: string;
  obligation: string;
  ctaHref: string;
  ctaLabel: string;
  missingRequiredFieldCount: number;
  reportingPeriodLabel: string;
};
