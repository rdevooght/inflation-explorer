function shorten(str, len) {
  if (str.length > len) {
    return str.substring(0, len) + "...";
  }
  return str;
}

const percentFormater = Intl.NumberFormat(undefined, {
  style: "percent",
  maximumFractionDigits: 1,
}).format;

const numberFormater = Intl.NumberFormat(undefined, {
  maximumFractionDigits: 1,
}).format;

export { shorten, percentFormater, numberFormater };
