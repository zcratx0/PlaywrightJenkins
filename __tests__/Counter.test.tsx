import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Counter from "@/components/Counter";

describe("Counter", () => {
  it("renders with initial count of 0", () => {
    render(<Counter />);
    const count = screen.getByTestId("count");
    expect(count).toHaveTextContent("0");
  });

  it("renders increment, decrement, and reset buttons", () => {
    render(<Counter />);
    expect(screen.getByTestId("increment")).toBeInTheDocument();
    expect(screen.getByTestId("decrement")).toBeInTheDocument();
    expect(screen.getByTestId("reset")).toBeInTheDocument();
  });

  it("increments count when +1 button is clicked", async () => {
    const user = userEvent.setup();
    render(<Counter />);

    await user.click(screen.getByTestId("increment"));

    expect(screen.getByTestId("count")).toHaveTextContent("1");
  });

  it("decrements count when -1 button is clicked", async () => {
    const user = userEvent.setup();
    render(<Counter />);

    await user.click(screen.getByTestId("decrement"));

    expect(screen.getByTestId("count")).toHaveTextContent("-1");
  });

  it("resets count to 0 when reset button is clicked", async () => {
    const user = userEvent.setup();
    render(<Counter />);

    await user.click(screen.getByTestId("increment"));
    await user.click(screen.getByTestId("increment"));
    await user.click(screen.getByTestId("increment"));
    expect(screen.getByTestId("count")).toHaveTextContent("3");

    await user.click(screen.getByTestId("reset"));
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });

  it("handles multiple increments correctly", async () => {
    const user = userEvent.setup();
    render(<Counter />);

    await user.click(screen.getByTestId("increment"));
    await user.click(screen.getByTestId("increment"));
    await user.click(screen.getByTestId("increment"));

    expect(screen.getByTestId("count")).toHaveTextContent("3");
  });

  it("handles mixed operations correctly", async () => {
    const user = userEvent.setup();
    render(<Counter />);

    await user.click(screen.getByTestId("increment"));
    await user.click(screen.getByTestId("increment"));
    await user.click(screen.getByTestId("decrement"));

    expect(screen.getByTestId("count")).toHaveTextContent("1");
  });
});
