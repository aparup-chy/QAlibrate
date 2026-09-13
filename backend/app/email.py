import smtplib
from email.message import EmailMessage

from .config import settings


def send_password_reset_otp(recipient: str, otp: str) -> None:
    if not settings.smtp_username or not settings.smtp_password or not settings.smtp_from:
        raise RuntimeError("SMTP settings are not configured")

    message = EmailMessage()
    message["Subject"] = "Your QAlibrate password reset code"
    message["From"] = settings.smtp_from
    message["To"] = recipient
    message.set_content(
        f"Your QAlibrate password reset code is: {otp}\n\n"
        "This code expires in 5 minutes. If you did not request a password reset, "
        "you can ignore this email."
    )

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as smtp:
            if settings.smtp_use_tls:
                smtp.starttls()
            smtp.login(settings.smtp_username, settings.smtp_password)
            smtp.send_message(message)
    except smtplib.SMTPAuthenticationError as exc:
        if exc.smtp_code == 534:
            raise RuntimeError(
                "Gmail requires a browser sign-in for the SMTP account. "
                "Sign in to Gmail in a browser, complete any security check, "
                "then try the password reset again."
            ) from exc
        raise RuntimeError("Gmail rejected the SMTP credentials") from exc