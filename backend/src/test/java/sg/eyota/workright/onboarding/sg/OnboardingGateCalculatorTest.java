package sg.eyota.workright.onboarding.sg;

import java.util.List;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class OnboardingGateCalculatorTest {

    @Test
    void readyOnlyWhenAllApplicableCompleted() {
        var snap = OnboardingGateCalculator.compute(List.of(
                new OnboardingGateCalculator.GateItem("A", "Alpha", true, true),
                new OnboardingGateCalculator.GateItem("B", "Beta", true, false),
                new OnboardingGateCalculator.GateItem("C", "Hidden", false, false)
        ));
        assertFalse(snap.ready());
        assertEquals("IN PROGRESS", snap.label());
        assertEquals(50, snap.progressPercent());
        assertEquals(List.of("Beta pending"), snap.stillRequired());
    }

    @Test
    void dedupesRequiredAndIgnoresNonApplicable() {
        var snap = OnboardingGateCalculator.compute(List.of(
                new OnboardingGateCalculator.GateItem("PPE", "PPE issuance & employee confirmation", true, false),
                new OnboardingGateCalculator.GateItem("X", "PPE issuance/confirmation pending", true, false)
        ));
        // titles differ slightly — normalize merges ppe-ish keys only on full strings from readiness
        assertEquals(2, snap.stillRequired().size());
        assertEquals(1, OnboardingGateCalculator.dedupePreserveOrder(List.of(
                "PPE issuance & employee confirmation pending",
                "PPE issuance/confirmation pending"
        )).size());
    }

    @Test
    void allDoneIsReadyAt100() {
        var snap = OnboardingGateCalculator.compute(List.of(
                new OnboardingGateCalculator.GateItem("A", "Alpha", true, true),
                new OnboardingGateCalculator.GateItem("B", "Beta", true, true)
        ));
        assertTrue(snap.ready());
        assertEquals("READY", snap.label());
        assertEquals(100, snap.progressPercent());
    }
}
