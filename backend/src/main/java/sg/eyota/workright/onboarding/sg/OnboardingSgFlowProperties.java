package sg.eyota.workright.onboarding.sg;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "eyota.onboarding")
public class OnboardingSgFlowProperties {

    /**
     * Singapore MOM-aligned checklist / gate rules (v2).
     * Default OFF so production behaviour stays unchanged until explicitly enabled.
     */
    private boolean sgFlowV2 = false;

    public boolean isSgFlowV2() {
        return sgFlowV2;
    }

    public void setSgFlowV2(boolean sgFlowV2) {
        this.sgFlowV2 = sgFlowV2;
    }
}
