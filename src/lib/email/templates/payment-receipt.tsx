import * as React from 'react';

export type PaymentReceiptEmailProps = {
  orgName: string;
  abn: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  donorName: string | null;
  // Org-customised thank-you line ({name} already resolved). Falls back to a
  // default message when null.
  thankYou?: string | null;
  receiptNumber: string | null;
  description: string;
  amountFormatted: string;
  currency: string;
  dateFormatted: string;
  taxNotice: string;
  receiptUrl?: string | null;
};

// WildTrack360 brand palette.
const GREEN = '#3e6f4f';
const GREEN_DARK = '#2d5a3d';
const CREAM = '#f5f5db';
const LOGO_URL = 'https://www.wildtrack360.com.au/Brandmark-Text-Vert.svg';

// Branded payment receipt email, styled to match the WildTrack360 brand emails
// (cream body, green gradient header, left-bordered cards, dark footer). The
// org's registered name + ABN head the receipt body as the issuer.
export function PaymentReceiptEmail({
  orgName,
  abn,
  contactEmail,
  contactPhone,
  donorName,
  thankYou,
  receiptNumber,
  description,
  amountFormatted,
  currency,
  dateFormatted,
  taxNotice,
  receiptUrl,
}: PaymentReceiptEmailProps) {
  const contactLine = [contactEmail, contactPhone].filter(Boolean).join(' · ');
  const message =
    thankYou ?? `Thank you${donorName ? `, ${donorName}` : ''}. Your payment has been received.`;

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
                          padding: '30px 20px',
                          textAlign: 'center',
                        }}
                      >
                        <img
                          src={LOGO_URL}
                          alt="WildTrack360"
                          style={{
                            height: '54px',
                            width: 'auto',
                            filter: 'brightness(0) invert(1)',
                            marginBottom: '12px',
                          }}
                        />
                        <div style={{ color: '#ffffff', fontSize: '16px', opacity: 0.9 }}>
                          {orgName}
                        </div>
                      </td>
                    </tr>

                    {/* Date pill */}
                    <tr>
                      <td style={{ padding: '26px 20px 0', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            backgroundColor: GREEN,
                            color: '#ffffff',
                            padding: '6px 16px',
                            borderRadius: '20px',
                            fontSize: '14px',
                            fontWeight: 'bold',
                          }}
                        >
                          {dateFormatted}
                        </span>
                      </td>
                    </tr>

                    {/* Title + thank-you message */}
                    <tr>
                      <td style={{ padding: '18px 28px 6px', textAlign: 'center' }}>
                        <h1
                          style={{
                            fontSize: '26px',
                            fontWeight: 'bold',
                            color: '#333333',
                            margin: '0 0 10px',
                            lineHeight: 1.2,
                          }}
                        >
                          Receipt
                        </h1>
                        <p style={{ fontSize: '16px', color: '#666666', margin: 0, lineHeight: 1.5 }}>
                          {message}
                        </p>
                      </td>
                    </tr>

                    {/* Amount card */}
                    <tr>
                      <td style={{ padding: '24px 20px 8px' }}>
                        <div
                          style={{
                            backgroundColor: '#f9f9f9',
                            padding: '20px',
                            borderRadius: '8px',
                            borderLeft: `4px solid ${GREEN}`,
                          }}
                        >
                          <div
                            style={{
                              fontSize: '12px',
                              fontWeight: 'bold',
                              color: GREEN,
                              textTransform: 'uppercase',
                              letterSpacing: '1px',
                              marginBottom: '6px',
                            }}
                          >
                            Amount paid
                          </div>
                          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#333333' }}>
                            {amountFormatted} {currency}
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* Details card */}
                    <tr>
                      <td style={{ padding: '8px 20px' }}>
                        <div
                          style={{
                            backgroundColor: '#f9f9f9',
                            padding: '8px 20px',
                            borderRadius: '8px',
                            borderLeft: `4px solid ${GREEN}`,
                          }}
                        >
                          <table
                            width="100%"
                            cellPadding={0}
                            cellSpacing={0}
                            style={{ fontSize: '14px', color: '#666666' }}
                          >
                            <tbody>
                              {[
                                { label: 'Receipt number', value: receiptNumber ?? '—' },
                                { label: 'Date', value: dateFormatted },
                                { label: 'Description', value: description },
                                { label: 'Issued to', value: donorName ?? '—' },
                              ].map((row) => (
                                <tr key={row.label}>
                                  <td
                                    style={{
                                      padding: '10px 0',
                                      borderBottom: '1px solid #e0e0e0',
                                      width: '42%',
                                    }}
                                  >
                                    {row.label}
                                  </td>
                                  <td
                                    style={{
                                      padding: '10px 0',
                                      borderBottom: '1px solid #e0e0e0',
                                      color: '#333333',
                                    }}
                                  >
                                    {row.value}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>

                    {/* Issuer + ABN */}
                    <tr>
                      <td style={{ padding: '16px 28px 0' }}>
                        <div style={{ fontSize: '14px', color: '#333333', fontWeight: 'bold' }}>
                          {orgName}
                        </div>
                        <div style={{ fontSize: '13px', color: '#666666', lineHeight: 1.5 }}>
                          {abn ? `ABN ${abn}` : 'ABN not on file'}
                          {contactLine ? <><br />{contactLine}</> : null}
                        </div>
                      </td>
                    </tr>

                    {/* Tax notice */}
                    <tr>
                      <td style={{ padding: '16px 28px 8px' }}>
                        <p style={{ fontSize: '13px', color: '#666666', lineHeight: 1.6, margin: 0 }}>
                          {taxNotice}
                        </p>
                      </td>
                    </tr>

                    {/* Optional CTA */}
                    {receiptUrl ? (
                      <tr>
                        <td style={{ padding: '16px 20px 8px', textAlign: 'center' }}>
                          <a
                            href={receiptUrl}
                            style={{
                              display: 'inline-block',
                              backgroundColor: GREEN,
                              color: '#ffffff',
                              padding: '14px 28px',
                              textDecoration: 'none',
                              borderRadius: '8px',
                              fontWeight: 'bold',
                              fontSize: '15px',
                            }}
                          >
                            View / print receipt
                          </a>
                        </td>
                      </tr>
                    ) : null}

                    {/* Footer */}
                    <tr>
                      <td
                        style={{
                          backgroundColor: '#333333',
                          color: '#ffffff',
                          padding: '26px 20px',
                          textAlign: 'center',
                          fontSize: '12px',
                          lineHeight: 1.6,
                          marginTop: '20px',
                        }}
                      >
                        <div style={{ marginBottom: '8px' }}>
                          Issued by {orgName}
                          {abn ? ` (ABN ${abn})` : ''}.
                        </div>
                        <div style={{ opacity: 0.8 }}>
                          This is an automatically generated receipt, valid without signature. Sent
                          via WildTrack360.
                        </div>
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
