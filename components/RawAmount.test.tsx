import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RawAmount } from "./RawAmount";

describe("RawAmount", () => {
  it("renders raw 18-decimal amounts without Number coercion", () => {
    render(<RawAmount value="1234567890123456789" precision={4} />);
    expect(screen.getByText("1.2345 USDC")).toBeTruthy();
  });
});
