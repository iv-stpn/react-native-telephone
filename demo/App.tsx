// Web demo for react-native-telephone, rendered via react-native-web.
// Shows the default field, per-slot styling, a custom (image) flag renderer,
// a restricted country list, and live E.164 + validity output.
import { useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { type CountryCode, PhoneInput } from "../src/index";

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f8fafc" },
  container: { maxWidth: 520, width: "100%", alignSelf: "center", padding: 24, gap: 20 },
  h1: { fontSize: 22, fontWeight: "700", color: "#0f172a" },
  sub: { fontSize: 13, color: "#64748b", marginTop: -12 },
  section: { gap: 8 },
  legend: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: "#64748b",
    textTransform: "uppercase",
  },
  readout: { backgroundColor: "#0f172a", borderRadius: 8, padding: 12, gap: 2 },
  readoutText: { fontFamily: "monospace", fontSize: 12, color: "#e2e8f0" },
  ok: { color: "#4ade80" },
  bad: { color: "#f87171" },
});

function Readout({ label, value, valid }: { label: string; value: string; valid: boolean }) {
  return (
    <View style={s.readout}>
      <Text style={s.readoutText}>
        {label}: <Text style={valid ? s.ok : s.bad}>{value || "(empty)"}</Text>
      </Text>
      <Text style={s.readoutText}>
        valid: <Text style={valid ? s.ok : s.bad}>{String(valid)}</Text>
      </Text>
    </View>
  );
}

export function App() {
  const [basic, setBasic] = useState("");
  const [basicValid, setBasicValid] = useState(false);
  const [styled, setStyled] = useState("");
  const [flagged, setFlagged] = useState("+33612345678");
  const [restricted, setRestricted] = useState("");
  const [country, setCountry] = useState<CountryCode>("US");

  return (
    <ScrollView style={s.page} contentContainerStyle={{ flexGrow: 1 }}>
      <View style={s.container}>
        <Text style={s.h1}>react-native-telephone</Text>
        <Text style={s.sub}>Zero-dependency international phone input.</Text>

        <View style={s.section}>
          <Text style={s.legend}>Default</Text>
          <PhoneInput
            label="Phone number"
            value={basic}
            onChangeText={setBasic}
            onValidationChange={setBasicValid}
            onCountryChange={setCountry}
            defaultCountry="US"
            hint="Type a number — the flag opens a searchable picker."
          />
          <Readout label={`E.164 (${country})`} value={basic} valid={basicValid} />
        </View>

        <View style={s.section}>
          <Text style={s.legend}>Per-slot styling + large size</Text>
          <PhoneInput
            label="Custom look"
            size="lg"
            value={styled}
            onChangeText={setStyled}
            styles={{
              field: { borderColor: "#111827", borderRadius: 14, borderWidth: 2 },
              label: { color: "#111827" },
              nationalInput: { fontFamily: "monospace" },
              optionSelected: { backgroundColor: "#fef3c7" },
            }}
          />
        </View>

        <View style={s.section}>
          <Text style={s.legend}>Custom flags (renderFlag → image)</Text>
          <PhoneInput
            label="Image flags"
            value={flagged}
            onChangeText={setFlagged}
            renderFlag={({ code }) => (
              <Image
                source={{ uri: `https://flagcdn.com/32x24/${code.toLowerCase()}.png` }}
                style={{ width: 26, height: 18, borderRadius: 2 }}
              />
            )}
          />
          <Text style={s.sub}>Use this on Android, where emoji flags don't render.</Text>
        </View>

        <View style={s.section}>
          <Text style={s.legend}>Restricted list</Text>
          <PhoneInput
            label="EU only"
            value={restricted}
            onChangeText={setRestricted}
            allowedCountries={["FR", "DE", "ES", "IT", "NL", "BE"]}
            defaultCountry="FR"
          />
        </View>
      </View>
    </ScrollView>
  );
}
