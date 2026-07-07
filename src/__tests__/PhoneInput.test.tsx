import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { PhoneInput } from "../components/PhoneInput";

// A tiny controlled wrapper, since PhoneInput is a controlled component: it
// needs its `value` fed back to it to reflect what the user typed.
function Harness({
  onChange,
  onCountryChange,
  ...props
}: {
  onChange?: (v: string) => void;
  onCountryChange?: (v: string) => void;
  testID?: string;
  defaultCountry?: "US" | "FR";
}) {
  const [value, setValue] = useState("");
  return (
    <PhoneInput
      testID={props.testID ?? "phone"}
      locale="en-US"
      value={value}
      defaultCountry={props.defaultCountry ?? "US"}
      onChangeText={(next) => {
        setValue(next);
        onChange?.(next);
      }}
      onCountryChange={onCountryChange}
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
});
