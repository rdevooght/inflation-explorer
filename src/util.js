function shorten(str, len) {
  if (str.length > len) {
    return str.substring(0, len) + "...";
  }
  return str;
}

const percentFormatter = Intl.NumberFormat(undefined, {
  style: "percent",
  maximumFractionDigits: 1,
}).format;

const signedPercentFormatter = Intl.NumberFormat(undefined, {
  style: "percent",
  maximumFractionDigits: 1,
  signDisplay: "always",
}).format;

const numberFormatter = Intl.NumberFormat(undefined, {
  maximumFractionDigits: 1,
}).format;

const rawMonthYearFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  year: "numeric",
});

function monthYearFormatter(dateStr) {
  const date = new Date(dateStr);
  return rawMonthYearFormatter.format(date);
}

function validateAndSortDates(date1, date2) {
  let start = new Date(date1);
  let end = new Date(date2);

  // Validate dates
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error("Invalid date format");
  }

  // Ensure start date is before end date
  if (start > end) {
    let swap = start;
    start = end;
    end = swap;
  }

  return { start, end };
}

function getDateDuration(startDate, endDate) {
  // Parse the date strings
  const { start, end } = validateAndSortDates(startDate, endDate);

  // Calculate years and months
  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();

  // Adjust if the day of the month hasn't been reached yet
  if (end.getDate() < start.getDate()) {
    months--;
  }

  // Adjust years and months
  if (months < 0) {
    years--;
    months += 12;
  }

  // Format the result
  let result = "";

  if (years > 0) {
    result += `${years} an${years !== 1 ? "s" : ""}`;
  }

  if (months > 0) {
    if (years > 0) {
      result += " et ";
    }
    result += `${months} mois${months !== 1 ? "" : ""}`;
  }

  return result;
}

function averageYearlyInflation(startDate, endDate, startCPI, endCPI) {
  const { start, end } = validateAndSortDates(startDate, endDate);

  // Calculate years and months
  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();

  // Adjust if the day of the month hasn't been reached yet
  if (end.getDate() < start.getDate()) {
    months--;
  }

  // Adjust years and months
  if (months < 0) {
    years--;
    months += 12;
  }

  const fractionalYear = years + months / 12;

  const totalInflation = endCPI / startCPI;

  const averageInflation = Math.pow(totalInflation, 1 / fractionalYear) - 1;

  return averageInflation;
}

export {
  shorten,
  percentFormatter,
  signedPercentFormatter,
  numberFormatter,
  monthYearFormatter,
  getDateDuration,
  averageYearlyInflation,
};
