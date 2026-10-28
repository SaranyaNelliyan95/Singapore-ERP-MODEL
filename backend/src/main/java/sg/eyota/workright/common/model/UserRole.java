package sg.eyota.workright.common.model;

public enum UserRole {
    ADMIN,
    HR,
    EMPLOYEE;

    public String authority() {
        return "ROLE_" + name();
    }
}
