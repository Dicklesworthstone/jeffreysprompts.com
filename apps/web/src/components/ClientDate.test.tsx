import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ClientDate } from "./ClientDate";

describe("ClientDate", () => {
  it("renders the fallback for invalid dates", () => {
    render(<ClientDate date="not-a-date" fallback="Unavailable" />);

    expect(screen.getByText("Unavailable")).toBeInTheDocument();
  });
});
