import data from './data.json';


/**
 * Get the index value for a given coicop at a certain date.
 * If the index is not known for that date, return the index at the closest date.
 * @param {String} coicop 
 * @param {String} date string in the format YYYY-MM-DD, YYYY-MM, or YYYY. 
 * YYYY will be extended to YYYY-01-01 and YYYY-MM-DD will be replaced by YYYY-MM-01
 */
function get_closest_index(coicop, date, return_date=false) {
  if (data.products[coicop] === undefined) {
    throw new Error(`Unknown COICOP code: ${coicop}`);
  }

  if (!date.match(/^\d{4}(-\d{2})?(-\d{2})?$/)) {
    throw new Error(`Invalid date: ${date}`);
  }

  if (date.length === 4) {
    date = `${date}-01-01`;
  } else if (date.length === 7) {
    date = `${date}-01`;
  } else {
    date = `${date.slice(0,7)}-01`;
  }

  const dates = data.timescales[data.products[coicop].timescale];

  let index = 0;
  if (dates.includes(date)) {
    index = dates.indexOf(date);
  } else if (date < dates[0]) {
    index = 0;
  } else if (date > dates[dates.length - 1]) {
    index = dates.length - 1;
  } else {
    throw new Error(`Cannot handle date: ${date}`);
  }
  
  if (return_date) {
    return [data.products[coicop].CPI[index], dates[index]];
  } else {
    return data.products[coicop].CPI[index];
  }

}

function get_spendings(coicop, year, region, grouping, group) {
  for (let s of data.spendings) {
    if (s.year === year && s.region === region && s.grouping === grouping && s.group === group) {
      return s['spendings'][coicop];
    }
  }

  return undefined;
}

// Identify existing grouping options
let groupings_options = {};
for (let s of data.spendings) {
  if (groupings_options[s.grouping] === undefined) {
    groupings_options[s.grouping] = [s.group];
  } else if (!groupings_options[s.grouping].includes(s.group)) {
    groupings_options[s.grouping].push(s.group);
  }
}

// Compute base rate of inflation
let base_rate = {};
for (let i = 1; i < data.products['0'].CPI.length; i++) {
  base_rate[data.timescales[data.products['0'].timescale][i]] = data.products['0'].CPI[i] / data.products['0'].CPI[i-1] - 1;
}

function get_deviation_from_base_rate(coicop) {
  let timescale = data.timescales[data.products[coicop].timescale];
  let deviation = [0];
  for (let i = 1; i < data.products[coicop].CPI.length; i++) {
    deviation.push((data.products[coicop].CPI[i] / data.products[coicop].CPI[i-1] - 1) - base_rate[timescale[i]]);
  }
  return deviation;
}

export {get_closest_index, get_spendings, groupings_options, get_deviation_from_base_rate};