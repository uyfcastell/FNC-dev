import logging
import smtplib
from email.message import EmailMessage

from ..core.config import get_settings

logger = logging.getLogger(__name__)


def _dedupe_emails(values: list[str] | None) -> list[str]:
    if not values:
        return []
    seen: set[str] = set()
    deduped: list[str] = []
    for value in values:
        email = value.strip()
        if not email:
            continue
        key = email.lower()
        if key in seen:
            continue
        seen.add(key)
        deduped.append(email)
    return deduped


def send_email(to: list[str], subject: str, html_body: str, cc: list[str] | None = None) -> bool:
    settings = get_settings()
    if not settings.email_enabled:
        logger.info("email_disabled", extra={"subject": subject})
        return False

    to_list = _dedupe_emails(to)
    cc_list = _dedupe_emails(cc)
    recipients = _dedupe_emails([*to_list, *cc_list])
    if not recipients:
        logger.info("email_not_sent_no_recipients", extra={"subject": subject})
        return False

    message = EmailMessage()
    message["From"] = settings.email_from
    message["To"] = ", ".join(to_list)
    if cc_list:
        message["Cc"] = ", ".join(cc_list)
    message["Subject"] = subject
    message.set_content(html_body, subtype="html")

    timeout_seconds = max(settings.email_timeout_ms / 1000, 1)
    try:
        with smtplib.SMTP(settings.email_smtp_host, settings.email_smtp_port, timeout=timeout_seconds) as server:
            server.ehlo()
            if settings.email_use_tls:
                server.starttls()
                server.ehlo()
            if settings.email_username:
                server.login(settings.email_username, settings.email_password)
            server.send_message(message, from_addr=settings.email_from, to_addrs=recipients)
        return True
    except Exception:
        logger.exception("email_send_failed", extra={"subject": subject, "to": to_list, "cc": cc_list})
        return False
