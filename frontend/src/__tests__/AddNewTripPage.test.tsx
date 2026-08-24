import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";

import AddNewTripPage from "../pages/AddNewTripPage";

describe("AddNewTripPage", () => {
  it("未保存の入力がある状態で戻ろうとすると確認モーダルを表示する", () => {
    const router = createMemoryRouter(
      [
        { path: "/trips/new", element: <AddNewTripPage /> },
        { path: "/trips", element: <p>旅行一覧</p> },
      ],
      { initialEntries: ["/trips/new"] }
    );

    render(<RouterProvider router={router} />);

    fireEvent.change(screen.getByLabelText(/旅行名/), { target: { value: "沖縄旅行" } });
    fireEvent.click(screen.getByRole("button", { name: "← 旅行一覧に戻る" }));

    expect(screen.getByRole("dialog")).toHaveTextContent("未保存の変更があります");
  });
});
