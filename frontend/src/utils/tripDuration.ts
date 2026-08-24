export const getTripDuration = (startDate: string, endDate: string) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const diffTime = end.getTime() - start.getTime();

  const diffDays = diffTime / (1000 * 60 * 60 * 24);

  return diffDays + 1;
};
