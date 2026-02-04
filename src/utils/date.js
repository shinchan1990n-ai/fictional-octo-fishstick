export function getDateId(date = new Date(), timeZone = "Asia/Kolkata") {
  return date
    .toLocaleDateString("en-CA", { timeZone })
    .split("/")
    .reverse()
    .join("-");
}
