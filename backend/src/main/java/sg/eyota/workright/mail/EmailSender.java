package sg.eyota.workright.mail;

public interface EmailSender {

    /** Plain-text only (legacy). */
    void send(String to, String subject, String plainBody);

    /**
     * HTML + plain-text alternative. Provider "accepted" for relay is recorded by the caller;
     * this method throws if SMTP is enabled and the send call fails.
     */
    void sendHtml(String to, String subject, String plainBody, String htmlBody);
}
