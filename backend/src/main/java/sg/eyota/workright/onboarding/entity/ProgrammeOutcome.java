package sg.eyota.workright.onboarding.entity;

public enum ProgrammeOutcome {
    PENDING,
    COMPLETED,
    NOT_APPLICABLE,
    /** SG-flow v2 medical result — treated as completed/fit for gates. */
    FIT,
    /** SG-flow v2 medical result — blocks WP issuance and Ready-to-Work. */
    UNFIT
}
