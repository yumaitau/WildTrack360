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

const baseUrl =
  process.env.SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_BASE_URL ?? '';
const GREEN = '#3e6f4f';
const GREEN_DARK = '#2d5a3d';
const CREAM = '#f5f5db';
const LOGO_URL = 'https://www.wildtrack360.com.au/Brandmark-Text-Vert.svg';

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
    padding: 0,
    backgroundColor: CREAM,
    color: '#26343d',
    fontFamily: 'Arial, Helvetica, sans-serif',
  },
  panel: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  },
  header: {
    padding: '30px 24px',
    backgroundColor: GREEN_DARK,
    backgroundImage: `linear-gradient(135deg, ${GREEN} 0%, ${GREEN_DARK} 100%)`,
    textAlign: 'center',
  },
  logo: {
    display: 'block',
    width: 'auto',
    height: '54px',
    margin: '0 auto 12px',
    filter: 'brightness(0) invert(1)',
  },
  org: {
    margin: 0,
    color: '#ffffff',
    fontSize: '16px',
    lineHeight: '22px',
    opacity: 0.92,
  },
  content: {
    padding: '28px 28px 32px',
  },
  badge: {
    display: 'inline-block',
    marginBottom: '12px',
    padding: '6px 14px',
    borderRadius: '999px',
    backgroundColor: '#eef7f0',
    color: GREEN_DARK,
    fontSize: '12px',
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  title: {
    margin: '0 0 16px',
    fontSize: '26px',
    lineHeight: '32px',
    color: '#26343d',
    textAlign: 'center',
  },
  paragraph: {
    margin: '0 0 14px',
    fontSize: '15px',
    lineHeight: '23px',
    color: '#4d5b63',
  },
  buttonWrap: {
    paddingTop: '8px',
    textAlign: 'center',
  },
  button: {
    display: 'inline-block',
    padding: '12px 20px',
    borderRadius: '6px',
    backgroundColor: GREEN,
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: 700,
    textDecoration: 'none',
  },
  infoBox: {
    marginTop: '24px',
    padding: '8px 20px',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
    borderLeft: `4px solid ${GREEN}`,
  },
  infoLabel: {
    padding: '10px 0',
    borderBottom: '1px solid #e0e0e0',
    width: '38%',
    color: '#607078',
    fontSize: '13px',
    lineHeight: '18px',
  },
  infoValue: {
    padding: '10px 0',
    borderBottom: '1px solid #e0e0e0',
    color: '#26343d',
    fontSize: '14px',
    lineHeight: '20px',
    fontWeight: 700,
  },
  footer: {
    padding: '20px 28px 24px',
    backgroundColor: '#26343d',
    color: '#d7e0df',
    fontSize: '12px',
    lineHeight: '18px',
    textAlign: 'center',
  },
  footerLink: {
    color: '#ffffff',
  },
} satisfies Record<string, React.CSSProperties>;

const emailShellStyle: React.CSSProperties = { backgroundColor: CREAM };
const emailInnerStyle: React.CSSProperties = { width: '100%', maxWidth: '600px' };
const noBorderStyle: React.CSSProperties = { borderBottom: '0' };

export function AdminNotificationEmail({
  orgName,
  title,
  body,
  cta,
  info,
  manageNotificationsHref,
}: AdminNotificationEmailProps) {
  const logoSrc = baseUrl ? `${baseUrl.replace(/\/$/, '')}/Brandmark-Text-Vert.svg` : LOGO_URL;
  const ctaHref = resolveEmailHref(cta.href);
  const manageHref = manageNotificationsHref ? resolveEmailHref(manageNotificationsHref) : null;
  const paragraphs = body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <html lang="en">
      <body style={styles.body}>
        <table width="100%" cellPadding={0} cellSpacing={0} style={emailShellStyle}>
          <tbody>
            <tr>
              <td align="center" style={{ padding: '20px 12px' }}>
                <table cellPadding={0} cellSpacing={0} style={emailInnerStyle}>
                  <tbody>
                    <tr>
                      <td style={styles.panel}>
                        <table width="100%" cellPadding={0} cellSpacing={0}>
                          <tbody>
                            <tr>
                              <td style={styles.header}>
                                <img src={logoSrc} alt="WildTrack360" style={styles.logo} />
                                <p style={styles.org}>{orgName}</p>
                              </td>
                            </tr>
                            <tr>
                              <td style={styles.content}>
                                <div style={{ textAlign: 'center' }}>
                                  <span style={styles.badge}>WildTrack360 admin alert</span>
                                </div>
                                <h1 style={styles.title}>{title}</h1>
                                {paragraphs.map((paragraph) => (
                                  <p key={paragraph} style={styles.paragraph}>
                                    {paragraph}
                                  </p>
                                ))}
                                <div style={styles.buttonWrap}>
                                  <a href={ctaHref} style={styles.button}>
                                    {cta.label}
                                  </a>
                                </div>

                                {info && info.length > 0 && (
                                  <div style={styles.infoBox}>
                                    <table width="100%" cellPadding={0} cellSpacing={0}>
                                      <tbody>
                                        {info.map((item, index) => {
                                          const isLast = index === info.length - 1;
                                          const labelStyle = isLast
                                            ? { ...styles.infoLabel, ...noBorderStyle }
                                            : styles.infoLabel;
                                          const valueStyle = isLast
                                            ? { ...styles.infoValue, ...noBorderStyle }
                                            : styles.infoValue;

                                          return (
                                            <tr key={item.label}>
                                              <td style={labelStyle}>{item.label}</td>
                                              <td style={valueStyle}>{item.value}</td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </td>
                            </tr>
                            <tr>
                              <td style={styles.footer}>
                                <div>Sent by WildTrack360 for {orgName}.</div>
                                {manageHref && (
                                  <div>
                                    <a href={manageHref} style={styles.footerLink}>
                                      Manage notification preferences
                                    </a>
                                  </div>
                                )}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}
