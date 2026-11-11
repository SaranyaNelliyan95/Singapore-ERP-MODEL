package sg.eyota.workright.onboarding.notify;

public interface NotificationSender {
    NotificationChannel channel();

    /** @return provider message id or mock id */
    String send(NotificationMessage message);
}
