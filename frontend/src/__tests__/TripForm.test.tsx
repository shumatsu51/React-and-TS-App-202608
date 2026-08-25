import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { TripForm } from "../components/TripForm";

const initialValues = {
  title: "北海道旅行",
  startDate: "2026-08-10",
  endDate: "2026-08-12",
  description: "夏休み",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

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

  it("編集時は変更がない間、保存ボタンを無効化して更新リクエストを送らない", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<TripForm initialValues={initialValues} mode="edit" tripId={1} onSuccess={vi.fn()} />);

    const saveButton = screen.getByRole("button", { name: "変更なし" });
    expect(saveButton).toBeDisabled();
    fireEvent.click(saveButton);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("入力エラーを対象の入力欄に関連付ける", () => {
    render(<TripForm onSuccess={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "旅行を作成" }));

    const title = screen.getByLabelText(/旅行名/);
    expect(title).toHaveAttribute("aria-invalid", "true");
    expect(title).toHaveAttribute("aria-describedby", "title-error");
    expect(screen.getByText("旅行名を入力してください")).toHaveAttribute("role", "alert");
  });

  it("旅行期間外の旅程があるため更新できない場合、APIメッセージを表示する", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          message: "旅行期間外になる旅程があります。先に旅程の日付を変更または削除してください",
        }),
      })
    );
    render(<TripForm initialValues={initialValues} mode="edit" tripId={1} onSuccess={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/旅行名/), { target: { value: "北海道周遊旅行" } });
    fireEvent.click(screen.getByRole("button", { name: "変更を保存" }));

    await waitFor(() => {
      expect(
        screen.getByText(
          "旅行期間外になる旅程があります。先に旅程の日付を変更または削除してください"
        )
      ).toBeInTheDocument();
    });
  });
});
