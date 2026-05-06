/* eslint-disable @next/next/no-img-element */
import * as React from 'react';

type AdminNotificationEmailProps = {
  orgName: string;
  title: string;
  body: string;
  cta: { label: string; href: string };
  info?: { label: string; value: string }[];
  manageNotificationsHref?: string;
};

const baseUrl = process.env.SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_BASE_URL ?? '';

function resolveEmailHref(href: string): string {
  if (!href || /^mailto:/i.test(href)) return href;

  try {
    if (/^https?:\/\//i.test(href) || !baseUrl) {
      return new URL(href).toString();
    }

    return new URL(href, baseUrl).toString();
  } catch {
    return href;
  }
}

const styles = {
  body: {
    margin: 0,
    backgroundColor: '#f6f7f9',
    color: '#182026',
    fontFamily: 'Arial, Helvetica, sans-serif',
  },
  container: {
    width: '100%',
    maxWidth: '640px',
    margin: '0 auto',
    padding: '28px 16px',
  },
  panel: {
    backgroundColor: '#ffffff',
    border: '1px solid #d9dee5',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  header: {
    padding: '24px 28px 18px',
    borderBottom: '1px solid #e7ebf0',
  },
  logo: {
    display: 'block',
    maxWidth: '180px',
    height: 'auto',
    marginBottom: '14px',
  },
  org: {
    margin: 0,
    color: '#5c6873',
    fontSize: '14px',
    lineHeight: '20px',
  },
  content: {
    padding: '26px 28px 30px',
  },
  title: {
    margin: '0 0 16px',
    fontSize: '24px',
    lineHeight: '31px',
    color: '#102027',
  },
  paragraph: {
    margin: '0 0 14px',
    fontSize: '15px',
    lineHeight: '23px',
    color: '#26343d',
  },
  button: {
    display: 'inline-block',
    marginTop: '8px',
    padding: '12px 18px',
    borderRadius: '6px',
    backgroundColor: '#00768d',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: 700,
    textDecoration: 'none',
  },
  infoBox: {
    marginTop: '22px',
    padding: '14px 16px',
    backgroundColor: '#eef7f9',
    border: '1px solid #c8e3e8',
    borderRadius: '6px',
  },
  infoLabel: {
    margin: '0 0 4px',
    color: '#37505a',
    fontSize: '12px',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
  },
  infoValue: {
    margin: '0 0 12px',
    color: '#1b3139',
    fontSize: '14px',
    lineHeight: '20px',
  },
  footer: {
    padding: '18px 28px 24px',
    borderTop: '1px solid #e7ebf0',
    color: '#6b7780',
    fontSize: '12px',
    lineHeight: '18px',
  },
};

export function AdminNotificationEmail({
  orgName,
  title,
  body,
  cta,
  info,
  manageNotificationsHref,
}: AdminNotificationEmailProps) {
  const logoSrc = baseUrl ? `${baseUrl.replace(/\/$/, '')}/Brandmark-Text-Vert.svg` : null;
  const ctaHref = resolveEmailHref(cta.href);
  const manageHref = manageNotificationsHref ? resolveEmailHref(manageNotificationsHref) : null;
  const paragraphs = body.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);

  return (
    <html>
      <body style={styles.body}>
        <div style={styles.container}>
          <div style={styles.panel}>
            <div style={styles.header}>
              {logoSrc ? (
                <img src={logoSrc} alt="WildTrack360" style={styles.logo} />
              ) : (
                <strong>WildTrack360</strong>
              )}
              <p style={styles.org}>{orgName}</p>
            </div>

            <div style={styles.content}>
              <h1 style={styles.title}>{title}</h1>
              {paragraphs.map((paragraph) => (
                <p key={paragraph} style={styles.paragraph}>
                  {paragraph}
                </p>
              ))}
              <a href={ctaHref} style={styles.button}>
                {cta.label}
              </a>

              {info && info.length > 0 && (
                <div style={styles.infoBox}>
                  {info.map((item) => (
                    <div key={item.label}>
                      <p style={styles.infoLabel}>{item.label}</p>
                      <p style={styles.infoValue}>{item.value}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={styles.footer}>
              <div>Sent by WildTrack360 for {orgName}.</div>
              {manageHref && (
                <div>
                  <a href={manageHref}>Manage notification preferences</a>
                </div>
              )}
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
