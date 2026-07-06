import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { PhoneInput } from "../components/PhoneInput";

// A tiny controlled wrapper, since PhoneInput is a controlled component: it
// needs its `value` fed back to it to reflect what the user typed.
function Harness({ onChange, ...props }: { onChange?: (v: string) => void; testID?: string; defaultCountry?: "US" | "FR" }) {
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
});
