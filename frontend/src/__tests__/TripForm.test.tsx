import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { TripForm } from "../components/TripForm";

const initialValues = {
  title: "北海道旅行",
  startDate: "2026-08-10",
  endDate: "2026-08-12",
  description: "夏休み",
};

describe("TripForm", () => {
  it("開始日に応じて終了日の選択範囲を設定する", () => {
    render(<TripForm initialValues={initialValues} onSuccess={vi.fn()} />);

    const startDate = screen.getByLabelText(/開始日/) as HTMLInputElement;
    const endDate = screen.getByLabelText(/終了日/) as HTMLInputElement;

    expect(startDate).toHaveAttribute("max", "2026-08-12");
    expect(endDate).toHaveAttribute("min", "2026-08-10");
    expect(endDate).toHaveAttribute("max", "2026-08-23");
  });

  it("開始日を終了日より後に変更すると終了日をクリアする", () => {
    render(<TripForm initialValues={initialValues} onSuccess={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/開始日/), { target: { value: "2026-08-13" } });

    expect(screen.getByLabelText(/終了日/)).toHaveValue("");
    expect(
      screen.getByText("開始日より前の終了日をクリアしました。終了日を選択してください。")
    ).toBeInTheDocument();
  });

  it("入力内容が変わると未保存状態を通知する", async () => {
    const onDirtyChange = vi.fn();
    render(<TripForm onSuccess={vi.fn()} onDirtyChange={onDirtyChange} />);

    fireEvent.change(screen.getByLabelText(/旅行名/), { target: { value: "沖縄旅行" } });

    await waitFor(() => {
      expect(onDirtyChange).toHaveBeenLastCalledWith(true);
    });
  });
});
