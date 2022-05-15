import data from './data.json';


/**
 * Get the index value for a given coicop at a certain date.
 * If the index is not known for that date, return the index at the closest date.
 * @param {String} coicop 
 * @param {String} date string in the format YYYY-MM-DD, YYYY-MM, or YYYY. 
 * YYYY will be extended to YYYY-01-01 and YYYY-MM-DD will be replaced by YYYY-MM-01
 */
function get_closest_index(coicop, date) {
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
  
  return data.products[coicop].CPI[index];

}

export {get_closest_index};