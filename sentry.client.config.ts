import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  debug: false,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.05,
  integrations: [
    Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
  ],
  beforeSend(event) {
    // Strip PII: card content, user names, emails from breadcrumbs and extras
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map((b) => {
        if (b.data) {
          const { email, content, card_content, full_name, ...rest } =
            b.data as Record<string, unknown>;
          void email;
          void content;
          void card_content;
          void full_name;
          b.data = rest;
        }
        return b;
      });
    }
    return event;
  },
});
