package sg.eyota.workright.mail;

public interface EmailSender {

    void send(String to, String subject, String plainBody);
}
