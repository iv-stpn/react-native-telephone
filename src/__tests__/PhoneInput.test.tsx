import { fireEvent, render, screen } from "@testing-library/react";
import { type ReactNode, useState } from "react";
import { Text } from "react-native";
import { describe, expect, it, vi } from "vitest";
import { PhoneInput } from "../components/PhoneInput";
import type { RenderContainerProps, RenderCountryPickerProps, RenderFlag } from "../components/types";
import type { CountryCode } from "../data/countries";

// A tiny controlled wrapper, since PhoneInput is a controlled component: it
// needs its `value` fed back to it to reflect what the user typed. Forwards the
// commonly exercised props; everything else stays at its default.
function Harness({
  onChange,
  onCountryChange,
  onValidationChange,
  ...props
}: {
  onChange?: (v: string) => void;
  onCountryChange?: (v: string) => void;
  onValidationChange?: (v: boolean) => void;
  testID?: string;
  defaultCountry?: CountryCode;
  validationMode?: "onType" | "onBlur" | "never";
  editable?: boolean;
  allowedCountries?: CountryCode[];
  label?: string;
  renderFlag?: RenderFlag;
  renderContainer?: (props: RenderContainerProps) => ReactNode;
  renderCountryPicker?: (props: RenderCountryPickerProps) => ReactNode;
}) {
  const [value, setValue] = useState("");
  return (
    <PhoneInput
      testID={props.testID ?? "phone"}
      locale="en-US"
      value={value}
      label={props.label}
      defaultCountry={props.defaultCountry ?? "US"}
      allowedCountries={props.allowedCountries}
      validationMode={props.validationMode}
      editable={props.editable}
      onChangeText={(next) => {
        setValue(next);
        onChange?.(next);
      }}
      onCountryChange={onCountryChange}
      onValidationChange={onValidationChange}
      renderFlag={props.renderFlag}
      renderContainer={props.renderContainer}
      renderCountryPicker={props.renderCountryPicker}
    />
  );
}

describe("PhoneInput", () => {
  it("seeds the calling code from the default country", () => {
    render(<Harness defaultCountry="US" />);
    expect(screen.getByTestId("phone-calling-code")).toHaveValue("+1");
  });

  it("formats typed digits with the country mask and emits E.164", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} defaultCountry="US" />);

    fireEvent.change(screen.getByTestId("phone-national"), { target: { value: "2025550123" } });

    // Display is masked, stored value is E.164 (no separators, with calling code).
    expect(screen.getByTestId("phone-national")).toHaveValue("(202) 555-0123");
    expect(onChange).toHaveBeenLastCalledWith("+12025550123");
  });

  it("re-masks the existing number when the country changes", () => {
    render(<Harness defaultCountry="US" />);
    fireEvent.change(screen.getByTestId("phone-national"), { target: { value: "612345678" } });

    // Open the picker and pick France; the digits reflow under the FR mask.
    fireEvent.click(screen.getByLabelText("Choose country"));
    fireEvent.click(screen.getByTestId("rnt-country-option-FR"));

    expect(screen.getByTestId("phone-calling-code")).toHaveValue("+33");
    expect(screen.getByTestId("phone-national")).toHaveValue("6 12 34 56 78");
  });

  it("shows the unique area code beside the calling code in the picker", () => {
    render(<Harness defaultCountry="GB" />);
    fireEvent.click(screen.getByLabelText("Choose country"));
    // Guernsey shares +44 with GB but is pinned by the single area code 1481, so
    // the picker lists it as "+44 1481". The default (GB) shows no suffix.
    expect(screen.getByTestId("rnt-country-option-GG")).toHaveTextContent("+44 1481");
    const gb = screen.getByTestId("rnt-country-option-GB");
    expect(gb).toHaveTextContent("+44");
    expect(gb).not.toHaveTextContent("1481");
  });

  it("wraps a NANP area code in parentheses in the picker", () => {
    render(<Harness defaultCountry="US" />);
    fireEvent.click(screen.getByLabelText("Choose country"));
    // Bahamas shares +1 with the US; its single area code 242 is shown as
    // "(242)" beside the calling code, matching the NANP mask grouping.
    expect(screen.getByTestId("rnt-country-option-BS")).toHaveTextContent("+1 (242)");
  });

  it("seeds the national field with the area code when a one-area-code country is selected", () => {
    const onChange = vi.fn();
    const onCountryChange = vi.fn();
    render(<Harness onChange={onChange} onCountryChange={onCountryChange} defaultCountry="US" />);

    // Type a full US number, then switch to Guernsey (+44, single area 1481).
    fireEvent.change(screen.getByTestId("phone-national"), { target: { value: "2025550123" } });
    expect(screen.getByTestId("phone-national")).toHaveValue("(202) 555-0123");

    fireEvent.click(screen.getByLabelText("Choose country"));
    fireEvent.click(screen.getByTestId("rnt-country-option-GG"));

    // The typed number is reset to the area code, which is seeded into the
    // national field; E.164 carries the calling code + area code.
    expect(screen.getByTestId("phone-calling-code")).toHaveValue("+44");
    expect(screen.getByTestId("phone-national")).toHaveValue("1481");
    expect(onChange).toHaveBeenLastCalledWith("+441481");
    expect(onCountryChange).toHaveBeenCalledWith("GG");
  });

  it("seeds a NANP national field with the parenthesized area code", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} defaultCountry="US" />);

    // Pick the Bahamas (+1, single area 242): the national field is seeded with
    // "(242)" — parentheses included — and E.164 is "+1 242".
    fireEvent.click(screen.getByLabelText("Choose country"));
    fireEvent.click(screen.getByTestId("rnt-country-option-BS"));

    expect(screen.getByTestId("phone-calling-code")).toHaveValue("+1");
    expect(screen.getByTestId("phone-national")).toHaveValue("(242)");
    expect(onChange).toHaveBeenLastCalledWith("+1242");
  });

  it("keeps the typed digits when a multi-area-code shared country is selected", () => {
    // Canada shares +1 with the US but is pinned by many area codes, so picking
    // it must NOT reset the national field — the digits reflow unchanged.
    render(<Harness defaultCountry="US" />);
    fireEvent.change(screen.getByTestId("phone-national"), { target: { value: "2042342222" } });

    fireEvent.click(screen.getByLabelText("Choose country"));
    fireEvent.click(screen.getByTestId("rnt-country-option-CA"));

    expect(screen.getByTestId("phone-calling-code")).toHaveValue("+1");
    expect(screen.getByTestId("phone-national")).toHaveValue("(204) 234-2222");
  });

  it("resets the national field when a same-code country with a foreign area code is selected", () => {
    // From the US, pick American Samoa (+1, single area 684): the field seeds
    // "(684)". Switching to Canada (same +1 code, no singular area code) must
    // drop the 684 — it belongs to American Samoa, not Canada — leaving just +1.
    const onChange = vi.fn();
    const onCountryChange = vi.fn();
    render(<Harness onChange={onChange} onCountryChange={onCountryChange} defaultCountry="US" />);

    fireEvent.click(screen.getByLabelText("Choose country"));
    fireEvent.click(screen.getByTestId("rnt-country-option-AS"));
    expect(screen.getByTestId("phone-national")).toHaveValue("(684)");

    fireEvent.click(screen.getByLabelText("Choose country"));
    fireEvent.click(screen.getByTestId("rnt-country-option-CA"));

    expect(screen.getByTestId("phone-calling-code")).toHaveValue("+1");
    expect(screen.getByTestId("phone-national")).toHaveValue("");
    expect(onChange).toHaveBeenLastCalledWith("");
    expect(onCountryChange).toHaveBeenCalledWith("CA");
  });

  it("keeps the national digits when switching to a different calling code", () => {
    // From the same "+1 (684)" state, switching to Andorra (+376, unshared) is a
    // different calling code, so the 684 carries over as national digits.
    const onChange = vi.fn();
    render(<Harness onChange={onChange} defaultCountry="US" />);

    fireEvent.click(screen.getByLabelText("Choose country"));
    fireEvent.click(screen.getByTestId("rnt-country-option-AS"));
    expect(screen.getByTestId("phone-national")).toHaveValue("(684)");

    fireEvent.click(screen.getByLabelText("Choose country"));
    fireEvent.click(screen.getByTestId("rnt-country-option-AD"));

    expect(screen.getByTestId("phone-calling-code")).toHaveValue("+376");
    expect(screen.getByTestId("phone-national")).toHaveValue("684");
    expect(onChange).toHaveBeenLastCalledWith("+376684");
  });

  it("filters the picker list by search query", () => {
    render(<Harness />);
    fireEvent.click(screen.getByLabelText("Choose country"));

    fireEvent.change(screen.getByTestId("rnt-country-search"), { target: { value: "germany" } });

    expect(screen.getByTestId("rnt-country-option-DE")).toBeInTheDocument();
    expect(screen.queryByTestId("rnt-country-option-US")).not.toBeInTheDocument();
  });

  it("shows the validation error once an invalid number fills the mask", () => {
    render(<Harness defaultCountry="US" />);
    // 10 digits fills the US mask, but 000... fails the national regex.
    fireEvent.change(screen.getByTestId("phone-national"), { target: { value: "0000000000" } });
    expect(screen.getByTestId("phone-error")).toHaveTextContent("Invalid phone number");
  });

  it("restricts the catalog to allowedCountries", () => {
    render(<PhoneInput testID="phone" locale="en-US" value="" allowedCountries={["FR", "DE"]} onChangeText={() => {}} />);
    fireEvent.click(screen.getByLabelText("Choose country"));

    expect(screen.getByTestId("rnt-country-option-FR")).toBeInTheDocument();
    expect(screen.queryByTestId("rnt-country-option-US")).not.toBeInTheDocument();
  });

  it("hydrates from a controlled E.164 value", () => {
    render(<PhoneInput testID="phone" locale="en-US" value="+33612345678" onChangeText={() => {}} />);
    expect(screen.getByTestId("phone-calling-code")).toHaveValue("+33");
    expect(screen.getByTestId("phone-national")).toHaveValue("6 12 34 56 78");
  });

  it("parses a pasted international number and switches country by area code", () => {
    const onChange = vi.fn();
    const onCountryChange = vi.fn();
    render(<Harness onChange={onChange} onCountryChange={onCountryChange} defaultCountry="US" />);

    // Pasting "+1 (204) 234-2222" recognizes the +1 code and the 204 area code
    // (Canada), so the country switches to CA and the national number is
    // formatted without the leading "1" being treated as a national digit.
    fireEvent.change(screen.getByTestId("phone-national"), { target: { value: "+1 (204) 234-2222" } });

    expect(screen.getByTestId("phone-calling-code")).toHaveValue("+1");
    expect(screen.getByTestId("phone-national")).toHaveValue("(204) 234-2222");
    expect(onChange).toHaveBeenLastCalledWith("+12042342222");
    expect(onCountryChange).toHaveBeenCalledWith("CA");
  });

  it("does not treat a fitting national paste as international", () => {
    const onChange = vi.fn();
    const onCountryChange = vi.fn();
    render(<Harness onChange={onChange} onCountryChange={onCountryChange} defaultCountry="US" />);

    // A plain US-formatted number (no "+") stays on the US selection.
    fireEvent.change(screen.getByTestId("phone-national"), { target: { value: "(204) 234-2222" } });

    expect(screen.getByTestId("phone-calling-code")).toHaveValue("+1");
    expect(screen.getByTestId("phone-national")).toHaveValue("(204) 234-2222");
    expect(onChange).toHaveBeenLastCalledWith("+12042342222");
    expect(onCountryChange).not.toHaveBeenCalled();
  });

  it("reveals a typed separator before the next digit arrives", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} defaultCountry="US" />);

    // Typing up through ")" — the closing paren shows immediately instead of
    // being swallowed until the next digit "earns" it.
    fireEvent.change(screen.getByTestId("phone-national"), { target: { value: "(204)" } });
    expect(screen.getByTestId("phone-national")).toHaveValue("(204)");
    expect(onChange).toHaveBeenLastCalledWith("+1204");
  });

  it("keeps digits aligned when a separator is typed mid-group", () => {
    render(<Harness defaultCountry="US" />);
    // A "-" inside the area code is dropped; the "4" still completes it.
    fireEvent.change(screen.getByTestId("phone-national"), { target: { value: "20-4" } });
    expect(screen.getByTestId("phone-national")).toHaveValue("(204");
  });

  it("routes a full number pasted into the calling-code field to the national field", () => {
    const onChange = vi.fn();
    const onCountryChange = vi.fn();
    render(<Harness onChange={onChange} onCountryChange={onCountryChange} defaultCountry="US" />);

    // Pasting into the small "+1" field switches country to Canada (area 204),
    // fills the national field, and resets the calling-code field to "+1".
    fireEvent.change(screen.getByTestId("phone-calling-code"), { target: { value: "+1 (204) 234-2222" } });

    expect(screen.getByTestId("phone-calling-code")).toHaveValue("+1");
    expect(screen.getByTestId("phone-national")).toHaveValue("(204) 234-2222");
    expect(onChange).toHaveBeenLastCalledWith("+12042342222");
    expect(onCountryChange).toHaveBeenCalledWith("CA");
  });

  it("routes a +44 paste into the calling-code field and switches to GB", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} defaultCountry="US" />);

    fireEvent.change(screen.getByTestId("phone-calling-code"), { target: { value: "+44 7700 900123" } });

    expect(screen.getByTestId("phone-calling-code")).toHaveValue("+44");
    expect(screen.getByTestId("phone-national")).toHaveValue("7700 900123");
    expect(onChange).toHaveBeenLastCalledWith("+447700900123");
  });

  it("fires onValidationChange with validity on each edit and on blur", () => {
    const onValidationChange = vi.fn();
    render(<Harness onValidationChange={onValidationChange} defaultCountry="US" />);

    const national = screen.getByTestId("phone-national");
    fireEvent.change(national, { target: { value: "2025550123" } }); // valid
    expect(onValidationChange).toHaveBeenLastCalledWith(true);

    fireEvent.change(national, { target: { value: "0000000000" } }); // invalid (fills mask)
    expect(onValidationChange).toHaveBeenLastCalledWith(false);

    fireEvent.blur(national);
    expect(onValidationChange).toHaveBeenLastCalledWith(false);
  });

  it("does not show the built-in error before blur when validationMode is onBlur", () => {
    render(<Harness validationMode="onBlur" defaultCountry="US" />);
    fireEvent.change(screen.getByTestId("phone-national"), { target: { value: "0000000000" } });
    // Mask is full and invalid, but onBlur keeps the error hidden until blur.
    expect(screen.queryByTestId("phone-error")).not.toBeInTheDocument();
    fireEvent.blur(screen.getByTestId("phone-national"));
    expect(screen.getByTestId("phone-error")).toHaveTextContent("Invalid phone number");
  });

  it("never shows the built-in error when validationMode is never", () => {
    render(<Harness validationMode="never" defaultCountry="US" />);
    fireEvent.change(screen.getByTestId("phone-national"), { target: { value: "0000000000" } });
    fireEvent.blur(screen.getByTestId("phone-national"));
    expect(screen.queryByTestId("phone-error")).not.toBeInTheDocument();
  });

  it("steps back into the calling code on backspace in an empty national field", () => {
    render(<Harness defaultCountry="CA" />);
    // Canada's calling code is +1; backspace on an empty national field should
    // delete the last code digit rather than be a no-op.
    const national = screen.getByTestId("phone-national");
    fireEvent.keyDown(national, { key: "Backspace" });
    expect(screen.getByTestId("phone-calling-code")).toHaveValue("+");
  });

  it("selects the calling code on select-all in an empty national field", () => {
    render(<Harness defaultCountry="US" />);
    const national = screen.getByTestId("phone-national");
    national.focus();
    // Ctrl+A with nothing typed retargets the calling-code field so the user
    // can replace the code, instead of selecting an empty national field.
    fireEvent.keyDown(national, { key: "a", ctrlKey: true });
    expect(screen.getByTestId("phone-calling-code")).toHaveFocus();
  });

  it("keeps select-all on the national field when a number is typed", () => {
    render(<Harness defaultCountry="US" />);
    const national = screen.getByTestId("phone-national");
    fireEvent.change(national, { target: { value: "2025550123" } });
    national.focus();
    // With a number present, select-all selects the typed number — focus must
    // not jump to the calling-code field.
    fireEvent.keyDown(national, { key: "a", ctrlKey: true });
    expect(national).toHaveFocus();
  });

  it("renders a custom flag via renderFlag", () => {
    const renderFlag: RenderFlag = ({ code }) => <Text testID={`flag-${code}`}>{code}</Text>;
    render(<Harness renderFlag={renderFlag} defaultCountry="US" />);
    expect(screen.getByTestId("flag-US")).toHaveTextContent("US");
  });

  it("renders a custom container via renderContainer", () => {
    const renderContainer = (props: RenderContainerProps) => (
      <div data-testid="custom-container">
        <span>{props.label}</span>
        {props.children}
      </div>
    );
    render(<Harness label="My phone" renderContainer={renderContainer} defaultCountry="US" />);
    expect(screen.getByTestId("custom-container")).toBeInTheDocument();
    expect(screen.getByText("My phone")).toBeInTheDocument();
    // The field row is still rendered inside the custom container.
    expect(screen.getByTestId("phone-national")).toBeInTheDocument();
  });

  it("renders a custom picker via renderCountryPicker", () => {
    const renderCountryPicker = (props: RenderCountryPickerProps) => (
      <div data-testid="custom-picker">
        <button type="button" onClick={() => props.onSelect("FR")}>
          pick FR
        </button>
      </div>
    );
    const onCountryChange = vi.fn();
    render(<Harness renderCountryPicker={renderCountryPicker} onCountryChange={onCountryChange} defaultCountry="US" />);
    fireEvent.click(screen.getByLabelText("Choose country"));
    fireEvent.click(screen.getByText("pick FR"));
    expect(onCountryChange).toHaveBeenCalledWith("FR");
    expect(screen.getByTestId("phone-calling-code")).toHaveValue("+33");
  });

  it("disables the picker and inputs when editable is false", () => {
    render(<Harness editable={false} defaultCountry="US" />);
    expect(screen.getByLabelText("Choose country")).toBeDisabled();
    // react-native-web expresses editable={false} on a TextInput as `readonly`.
    expect(screen.getByTestId("phone-calling-code")).toHaveAttribute("readonly");
    expect(screen.getByTestId("phone-national")).toHaveAttribute("readonly");
  });

  it("restricts the picker to allowedCountries and preserves their order", () => {
    render(<Harness allowedCountries={["DE", "FR", "US"]} />);
    fireEvent.click(screen.getByLabelText("Choose country"));
    const options = screen.getAllByRole("option");
    // allowedCountries is authoritative order — the picker keeps it as given
    // (so a consumer can float likely countries to the top) rather than
    // alphabetizing.
    expect(options.map((o) => o.getAttribute("data-testid"))).toEqual([
      "rnt-country-option-DE",
      "rnt-country-option-FR",
      "rnt-country-option-US",
    ]);
  });

  it("falls back to the locale's country when defaultCountry is absent", () => {
    // No defaultCountry; locale fr-FR should seed France.
    function FrHarness() {
      const [value, setValue] = useState("");
      return <PhoneInput testID="phone" locale="fr-FR" value={value} onChangeText={setValue} />;
    }
    render(<FrHarness />);
    expect(screen.getByTestId("phone-calling-code")).toHaveValue("+33");
  });
});
