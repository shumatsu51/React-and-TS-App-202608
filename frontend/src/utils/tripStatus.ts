export const getTripStatus = (startDate: string, endDate: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  if (today < start) {
    return {
      label: "準備中",
      className: "bg-red-100 text-red-700",
    };
  }

  if (today <= end) {
    return {
      label: "旅行中",
      className: "bg-yellow-100 text-yellow-800",
    };
  }

  return {
    label: "終了",
    className: "bg-green-100 text-green-700",
  };
};
