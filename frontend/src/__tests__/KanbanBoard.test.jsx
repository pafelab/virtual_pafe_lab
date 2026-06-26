import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { KanbanBoard } from "../components/KanbanBoard";
import { api } from "../api/client";

vi.mock("../api/client", () => ({
  api: {
    listTasks: vi.fn().mockResolvedValue([
      { id: 1, title: "Existing ticket", status: "backlog" },
    ]),
    createTask: vi.fn().mockResolvedValue({ id: 2, title: "New", status: "backlog" }),
    moveTask: vi.fn().mockResolvedValue({}),
    orchestrate: vi.fn().mockResolvedValue({}),
  },
}));

beforeEach(() => vi.clearAllMocks());

describe("KanbanBoard", () => {
  it("renders all four columns and existing tasks", async () => {
    render(<KanbanBoard />);
    ["Backlog", "In Progress", "Review", "Done"].forEach((c) =>
      expect(screen.getByText(c)).toBeInTheDocument()
    );
    expect(await screen.findByText("Existing ticket")).toBeInTheDocument();
  });

  it("creates a task from the input", async () => {
    render(<KanbanBoard />);
    fireEvent.change(screen.getByPlaceholderText(/new ticket title/i), {
      target: { value: "Build dashboard" },
    });
    fireEvent.click(screen.getByText("Add"));
    await waitFor(() =>
      expect(api.createTask).toHaveBeenCalledWith({ title: "Build dashboard" })
    );
  });
});