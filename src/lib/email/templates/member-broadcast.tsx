import * as React from 'react';

// WildTrack360 brand palette (matches payment-receipt.tsx).
const GREEN = '#3e6f4f';
const GREEN_DARK = '#2d5a3d';
const CREAM = '#f5f5db';

export type MemberBroadcastEmailProps = {
  orgName: string;
  // Big heading inside the white card (news title or message subject).
  heading: string;
  // Optional small label above the heading (e.g. "News" / "A message for you").
  eyebrow?: string | null;
  // Greeting line, e.g. "Hi Jane,". Omitted when null.
  greeting?: string | null;
  // Plain-text body; newlines are preserved as paragraph breaks.
  body: string;
  // Optional call-to-action button.
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  // Optional footer note (e.g. why the member is receiving this).
  footerNote?: string | null;
};

// Shared branded email used for member news posts and admin → member messages.
// Renders the plain-text body with paragraph breaks so admins don't need HTML.
export function MemberBroadcastEmail({
  orgName,
  heading,
  eyebrow,
  greeting,
  body,
  ctaLabel,
  ctaUrl,
  contactEmail,
  contactPhone,
  footerNote,
}: MemberBroadcastEmailProps) {
  const contactLine = [contactEmail, contactPhone].filter(Boolean).join(' · ');
  const paragraphs = body.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          fontFamily: 'Arial, sans-serif',
          backgroundColor: CREAM,
          colorScheme: 'light dark',
        }}
      >
        <table width="100%" cellPadding={0} cellSpacing={0} style={{ backgroundColor: CREAM }}>
          <tbody>
            <tr>
              <td align="center" style={{ padding: '20px 0' }}>
                <table
                  width={600}
                  cellPadding={0}
                  cellSpacing={0}
                  style={{ backgroundColor: '#ffffff', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                >
                  <tbody>
                    {/* Header */}
                    <tr>
                      <td
                        style={{
                          backgroundColor: GREEN_DARK,
                          backgroundImage: `linear-gradient(135deg, ${GREEN} 0%, ${GREEN_DARK} 100%)`,
                          padding: '28px 24px',
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ color: '#ffffff', fontSize: '20px', fontWeight: 'bold' }}>
                          {orgName}
                        </div>
                      </td>
                    </tr>

                    {/* Body */}
                    <tr>
                      <td style={{ padding: '28px 28px 8px 28px' }}>
                        {eyebrow ? (
                          <div
                            style={{
                              color: GREEN,
                              fontSize: '12px',
                              fontWeight: 'bold',
                              letterSpacing: '0.06em',
                              textTransform: 'uppercase',
                              marginBottom: '6px',
                            }}
                          >
                            {eyebrow}
                          </div>
                        ) : null}
                        <h1 style={{ margin: '0 0 16px 0', fontSize: '22px', color: '#1a1a1a' }}>
                          {heading}
                        </h1>
                        {greeting ? (
                          <p style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#333' }}>
                            {greeting}
                          </p>
                        ) : null}
                        {paragraphs.map((para, i) => (
                          <p
                            key={i}
                            style={{
                              margin: '0 0 12px 0',
                              fontSize: '15px',
                              lineHeight: '1.6',
                              color: '#333',
                              whiteSpace: 'pre-wrap',
                            }}
                          >
                            {para}
                          </p>
                        ))}

                        {ctaLabel && ctaUrl ? (
                          <table cellPadding={0} cellSpacing={0} style={{ margin: '20px 0 8px 0' }}>
                            <tbody>
                              <tr>
                                <td
                                  style={{
                                    backgroundColor: GREEN,
                                    borderRadius: '6px',
                                  }}
                                >
                                  <a
                                    href={ctaUrl}
                                    style={{
                                      display: 'inline-block',
                                      padding: '12px 22px',
                                      color: '#ffffff',
                                      fontSize: '15px',
                                      fontWeight: 'bold',
                                      textDecoration: 'none',
                                    }}
                                  >
                                    {ctaLabel}
                                  </a>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        ) : null}
                      </td>
                    </tr>

                    {/* Footer */}
                    <tr>
                      <td
                        style={{
                          backgroundColor: GREEN_DARK,
                          padding: '20px 24px',
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ color: '#dfe9e0', fontSize: '13px', marginBottom: '4px' }}>
                          {orgName}
                        </div>
                        {contactLine ? (
                          <div style={{ color: '#aebfb1', fontSize: '12px' }}>{contactLine}</div>
                        ) : null}
                        {footerNote ? (
                          <div style={{ color: '#aebfb1', fontSize: '11px', marginTop: '8px' }}>
                            {footerNote}
                          </div>
                        ) : null}
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
