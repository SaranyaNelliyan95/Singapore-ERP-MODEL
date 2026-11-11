package sg.eyota.workright.onboarding.sg;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.Test;
import sg.eyota.workright.onboarding.sg.OnboardingSgFlowRules.SgStep;
import sg.eyota.workright.onboarding.sg.OnboardingSgFlowRules.StepState;
import sg.eyota.workright.onboarding.sg.OnboardingSgFlowRules.WorkerContext;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertEquals;

class OnboardingSgFlowRulesTest {

    private static WorkerContext worker(
            String nationality,
            String gender,
            String sector,
            String category,
            Integer dorm,
            LocalDate appDate,
            LocalDate arrival
    ) {
        return new WorkerContext(
                true,
                nationality,
                null,
                gender,
                sector,
                category,
                dorm != null && dorm >= 7 ? "DORM" : "OTHER",
                dorm,
                appDate,
                arrival
        );
    }

    private static StepState state(boolean sipDone, boolean medicalFit, boolean medicalUnfit, boolean wpIssued) {
        return new StepState(
                true, true, true, true, true, false,
                true, sipDone, medicalFit, medicalUnfit, false,
                true, false, wpIssued,
                true, true, true, true, true, true, false
        );
    }

    @Test
    void maleNonMalaysianConstruction_showsOnboardSafetyBondPcp_hidesSip() {
        WorkerContext ctx = worker("Bangladesh", "Male", "Construction", "WP", 8,
                LocalDate.of(2026, 12, 1), LocalDate.of(2026, 12, 5));
        Set<SgStep> steps = OnboardingSgFlowRules.applicableSteps(ctx);
        assertTrue(steps.contains(SgStep.ONBOARD_CENTRE));
        assertTrue(steps.contains(SgStep.CONSTRUCTION_SAFETY));
        assertTrue(steps.contains(SgStep.SECURITY_BOND));
        assertTrue(steps.contains(SgStep.PCP_INSURANCE));
        assertTrue(OnboardingSgFlowRules.pcpRequired(ctx));
        assertFalse(steps.contains(SgStep.SIP));
        assertTrue(steps.contains(SgStep.TEMPORARY_PERMIT));
        assertTrue(steps.contains(SgStep.PPE_PHOTO_VERIFIED));
    }

    @Test
    void femaleCmp_showsSip_hidesOnboard() {
        WorkerContext ctx = worker("India", "Female", "CMP", "Process", null,
                LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 10));
        assertTrue(OnboardingSgFlowRules.applies(SgStep.SIP, ctx));
        assertFalse(OnboardingSgFlowRules.applies(SgStep.ONBOARD_CENTRE, ctx));
    }

    @Test
    void manufacturingNonMalaysian_showsSip() {
        WorkerContext ctx = worker("China", "Male", "Manufacturing", null, null,
                LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 10));
        assertTrue(OnboardingSgFlowRules.applies(SgStep.SIP, ctx));
    }

    @Test
    void malaysian_hidesBondAndOnboard() {
        WorkerContext ctx = worker("Malaysia", "Male", "Construction", "CMP", 10,
                LocalDate.of(2026, 12, 1), LocalDate.of(2026, 12, 5));
        assertFalse(OnboardingSgFlowRules.applies(SgStep.SECURITY_BOND, ctx));
        assertFalse(OnboardingSgFlowRules.applies(SgStep.ONBOARD_CENTRE, ctx));
    }

    @Test
    void medicalUnfit_blocksIssuanceAndGate() {
        WorkerContext ctx = worker("India", "Male", "Construction", null, null,
                LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 10));
        StepState unfit = state(true, false, true, false);
        List<String> wp = OnboardingSgFlowRules.wpIssuanceBlockers(ctx, unfit);
        assertTrue(wp.stream().anyMatch(s -> s.contains("revoked") || s.contains("cannot be issued")));
        assertFalse(OnboardingSgFlowRules.isReadyToWork(ctx, unfit));
    }

    @Test
    void tpStep_hiddenBeforeEffectiveDate_shownOnOrAfter() {
        WorkerContext before = worker("India", "Male", "Construction", null, null,
                LocalDate.of(2026, 11, 28), LocalDate.of(2026, 12, 1));
        WorkerContext on = worker("India", "Male", "Construction", null, null,
                LocalDate.of(2026, 11, 29), LocalDate.of(2026, 12, 1));
        assertFalse(OnboardingSgFlowRules.applies(SgStep.TEMPORARY_PERMIT, before));
        assertTrue(OnboardingSgFlowRules.applies(SgStep.TEMPORARY_PERMIT, on));
    }

    @Test
    void gateReady_onlyWhenAllApplicableDone() {
        WorkerContext ctx = worker("India", "Male", "Manufacturing", null, null,
                LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 10));
        assertFalse(OnboardingSgFlowRules.isReadyToWork(ctx, state(false, true, false, true)));
        assertTrue(OnboardingSgFlowRules.isReadyToWork(ctx, state(true, true, false, true)));
    }

    @Test
    void headerNeverReadyWhileGatePending() {
        WorkerContext ctx = worker("India", "Male", "Manufacturing", null, null,
                LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 10));
        // Pass steps done but contract/PPE/induction missing
        StepState partial = new StepState(
                true, true, true, true, true, false,
                true, true, true, false, false, true, false, true,
                true, false, false, false, false, true, false);
        OnboardingGateCalculator.GateSnapshot gate =
                OnboardingGateCalculator.compute(OnboardingSgFlowRules.fullGateItems(ctx, partial));
        assertFalse(gate.ready());
        assertEquals("IN PROGRESS", gate.label());
        assertTrue(gate.stillRequired().stream().anyMatch(s -> s.toLowerCase().contains("contract")
                || s.toLowerCase().contains("ppe")
                || s.toLowerCase().contains("induction")));
    }

    @Test
    void ipaReminders_at30_14_7() {
        WorkerContext ctx = worker("India", "Male", "Construction", null, null,
                LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 10));
        LocalDate today = LocalDate.of(2026, 11, 1);
        List<String> w30 = OnboardingSgFlowRules.deadlineWarnings(
                ctx, today, today.plusDays(30), true, true, true);
        assertEquals(1, w30.size());
        List<String> w14 = OnboardingSgFlowRules.deadlineWarnings(
                ctx, today, today.plusDays(14), true, true, true);
        assertTrue(w14.getFirst().contains("14"));
    }

    @Test
    void nonMalaysianTp_onlyFromSecondDayAfterArrival() {
        WorkerContext ctx = worker("India", "Male", "Construction", null, null,
                LocalDate.of(2026, 11, 29), LocalDate.of(2026, 12, 1));
        assertFalse(OnboardingSgFlowRules.temporaryPermitAllowedToday(ctx, LocalDate.of(2026, 12, 1)));
        assertTrue(OnboardingSgFlowRules.temporaryPermitAllowedToday(ctx, LocalDate.of(2026, 12, 2)));
    }

    @Test
    void wpBlockedWithoutArrivalDate() {
        WorkerContext ctx = worker("India", "Male", "Construction", null, null,
                LocalDate.of(2026, 10, 1), null);
        List<String> blockers = OnboardingSgFlowRules.wpIssuanceBlockers(ctx, state(true, true, false, false));
        assertTrue(blockers.stream().anyMatch(s -> s.toLowerCase().contains("arrival")));
    }
}
