# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in WildTrack360, please report it responsibly.

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, please email: **security@wildtrack360.com.au**

Include the following in your report:

- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact
- Suggested fix (if any)

## Response Timeline

- **Acknowledgment**: Within 48 hours of receiving your report
- **Initial assessment**: Within 5 business days
- **Resolution**: Depends on severity, but we aim to address critical issues promptly

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| Latest  | Yes                |
| Older   | No                 |

## Security Considerations

WildTrack360 handles wildlife conservation data. When deploying:

- Never commit `.env` files or credentials to version control
- Use strong, unique database passwords
- Restrict API keys (e.g., Google Maps) to your domains
- Keep dependencies up to date
- Enable HTTPS in production
- Review Clerk authentication configuration for your organization's needs
