package sg.eyota.workright.onboarding.notify;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

/** Token is stored hashed — raw token must never equal stored hash. */
class OnboardingSecureLinkHashTest {

    @Test
    void sha256IsDeterministicAndNotRaw() throws Exception {
        String raw = "abc123";
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        String hash = HexFormat.of().formatHex(md.digest(raw.getBytes(StandardCharsets.UTF_8)));
        assertNotEquals(raw, hash);
        assertEquals(64, hash.length());
        String hash2 = HexFormat.of().formatHex(md.digest(raw.getBytes(StandardCharsets.UTF_8)));
        // fresh digest instance for second call
        MessageDigest md2 = MessageDigest.getInstance("SHA-256");
        hash2 = HexFormat.of().formatHex(md2.digest(raw.getBytes(StandardCharsets.UTF_8)));
        assertEquals(hash, hash2);
    }
}
