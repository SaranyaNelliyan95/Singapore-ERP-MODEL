package sg.eyota.workright.employee;

import java.math.BigDecimal;
import java.util.Locale;
import java.util.Set;

import org.springframework.http.HttpStatus;
import sg.eyota.workright.common.exception.ApiException;

/** Shared validation for HR new-hire / employee master create & update. */
public final class EmployeeHireRules {

    private static final Set<String> PAYMENT_MODES = Set.of("BANKING", "IN_HAND");
    private static final Set<String> SALARY_PERIODS =
            Set.of("HOURLY", "DAILY", "WEEKLY", "FORTNIGHTLY", "MONTHLY");
    private static final Set<String> GENDERS = Set.of("MALE", "FEMALE", "OTHER");

    private EmployeeHireRules() {}

    public static String normalizeEmail(String email) {
        if (email == null) {
            return null;
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }

    public static String requireName(String fullName) {
        if (fullName == null || fullName.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request", "Full legal name is required");
        }
        return fullName.trim();
    }

    public static void requireMobile(String mobile) {
        if (mobile == null || !isAllowedMobile(mobile)) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Bad Request",
                    "Mobile must be a Singapore number (8 digits, starts with 8/9, optional +65) "
                            + "or an Indian number (10 digits starting 6–9, optional +91) for WhatsApp testing");
        }
    }

    /**
     * Accepts SG local / +65… and IN local / +91… (spaces/dashes allowed).
     * Used so HR can draft candidates with Indian mobiles to exercise WhatsApp confirm links.
     */
    public static boolean isAllowedMobile(String mobile) {
        if (mobile == null || mobile.isBlank()) {
            return false;
        }
        String digits = mobile.trim().replaceAll("[\\s\\-()]", "");
        // Singapore: 8 digits starting 8/9, or +65 / 65 prefix
        if (digits.matches("^[89]\\d{7}$")) {
            return true;
        }
        if (digits.matches("^(\\+?65)[89]\\d{7}$")) {
            return true;
        }
        // India: 10 digits starting 6–9, or +91 / 91 prefix
        if (digits.matches("^[6-9]\\d{9}$")) {
            return true;
        }
        if (digits.matches("^(\\+?91)[6-9]\\d{9}$")) {
            return true;
        }
        return false;
    }

    /** Normalise to E.164-ish (+65… / +91…) for WhatsApp; keeps original if already prefixed. */
    public static String normalizeMobileE164(String mobile) {
        if (mobile == null || mobile.isBlank()) {
            return mobile;
        }
        String digits = mobile.trim().replaceAll("[\\s\\-()]", "");
        if (digits.startsWith("+")) {
            return digits;
        }
        if (digits.matches("^65[89]\\d{7}$")) {
            return "+" + digits;
        }
        if (digits.matches("^[89]\\d{7}$")) {
            return "+65" + digits;
        }
        if (digits.matches("^91[6-9]\\d{9}$")) {
            return "+" + digits;
        }
        if (digits.matches("^[6-9]\\d{9}$")) {
            return "+91" + digits;
        }
        return digits.startsWith("+") ? digits : "+" + digits;
    }

    public static String requireFin(String fin) {
        if (fin == null || fin.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request", "FIN number is required");
        }
        String normalized = fin.trim().toUpperCase(Locale.ROOT);
        if (!normalized.matches("^[FGMST]\\d{7}[A-Z]$")) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST, "Bad Request", "FIN / NRIC format looks invalid (e.g. S1234567A)");
        }
        return normalized;
    }

    public static String normalizeGender(String gender) {
        if (gender == null || gender.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request", "Gender is required");
        }
        String g = gender.trim().toUpperCase(Locale.ROOT);
        if (!GENDERS.contains(g)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request", "Gender must be Male, Female, or Other");
        }
        return g;
    }

    public static String normalizePaymentMode(String paymentMode) {
        String mode = paymentMode == null || paymentMode.isBlank() ? "BANKING" : paymentMode.trim().toUpperCase(Locale.ROOT);
        if (!PAYMENT_MODES.contains(mode)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request", "Payment mode must be Banking or In-hand");
        }
        return mode;
    }

    public static String normalizeSalaryPeriod(String salaryPeriod) {
        String period = salaryPeriod == null || salaryPeriod.isBlank()
                ? "MONTHLY"
                : salaryPeriod.trim().toUpperCase(Locale.ROOT);
        if (!SALARY_PERIODS.contains(period)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request", "Invalid salary period");
        }
        return period;
    }

    public static void validateBanking(String paymentMode, String bankName, String bankAccountNumber) {
        if ("BANKING".equals(paymentMode)) {
            if (bankName == null || bankName.isBlank()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request", "Bank name is required for Banking payment");
            }
            if (bankAccountNumber == null || bankAccountNumber.isBlank()) {
                throw new ApiException(
                        HttpStatus.BAD_REQUEST, "Bad Request", "Bank account number is required for Banking payment");
            }
        }
    }

    public static void requireBasicPay(BigDecimal basicPay) {
        if (basicPay == null || basicPay.compareTo(BigDecimal.ZERO) < 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request", "Basic pay is required and cannot be negative");
        }
    }

    public static void optionalNonNegative(String label, BigDecimal value) {
        if (value != null && value.compareTo(BigDecimal.ZERO) < 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request", label + " cannot be negative");
        }
    }
}
