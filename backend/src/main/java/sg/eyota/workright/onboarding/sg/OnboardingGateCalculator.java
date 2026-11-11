package sg.eyota.workright.onboarding.sg;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Single source of truth for Ready-to-Work label, progress %, and "Still required" list.
 * Used by HR + employee UIs so header never says READY while items are still pending.
 */
public final class OnboardingGateCalculator {

    public record GateItem(String code, String title, boolean applies, boolean completed) {}

    public record GateSnapshot(
            boolean ready,
            String label,
            int progressPercent,
            List<String> stillRequired,
            List<GateItem> applicableItems
    ) {}

    private OnboardingGateCalculator() {}

    /**
     * @param items all candidate items (applies=false are ignored for gate/progress)
     */
    public static GateSnapshot compute(List<GateItem> items) {
        List<GateItem> applicable = items.stream().filter(GateItem::applies).toList();
        List<String> still = new ArrayList<>();
        int done = 0;
        for (GateItem item : applicable) {
            if (item.completed()) {
                done++;
            } else {
                still.add(item.title() + " pending");
            }
        }
        still = dedupePreserveOrder(still);
        boolean ready = still.isEmpty() && !applicable.isEmpty();
        // Empty applicable (e.g. brand-new draft with no seeded tasks yet) = IN PROGRESS
        if (applicable.isEmpty()) {
            ready = false;
        }
        int pct = applicable.isEmpty() ? 0 : (int) Math.round((done * 100.0) / applicable.size());
        return new GateSnapshot(ready, ready ? "READY" : "IN PROGRESS", pct, still, applicable);
    }

    /** Merge duplicate PPE / required strings (case-insensitive). */
    public static List<String> dedupePreserveOrder(List<String> in) {
        Set<String> seen = new LinkedHashSet<>();
        List<String> out = new ArrayList<>();
        for (String raw : in) {
            if (raw == null || raw.isBlank()) {
                continue;
            }
            String key = normalizeRequiredKey(raw);
            if (seen.add(key)) {
                out.add(raw.trim());
            }
        }
        return out;
    }

    public static List<?> dedupePpeByItemCode(List<?> items, java.util.function.Function<Object, String> codeFn) {
        Map<String, Object> map = new LinkedHashMap<>();
        for (Object item : items) {
            String code = codeFn.apply(item);
            String key = code == null ? String.valueOf(item.hashCode()) : code.trim().toUpperCase(Locale.ROOT);
            map.putIfAbsent(key, item);
        }
        return new ArrayList<>(map.values());
    }

    private static String normalizeRequiredKey(String raw) {
        String s = raw.trim().toLowerCase(Locale.ROOT);
        s = s.replace("ppe issuance & employee confirmation pending", "ppe");
        s = s.replace("ppe issuance/confirmation pending", "ppe");
        s = s.replace("contract acknowledgement pending", "contract");
        s = s.replace("employment contract acknowledgement pending", "contract");
        return s;
    }
}
