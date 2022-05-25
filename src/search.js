import data from './data.json';


function remove_final_s(str) {
  if (str[str.length-1] === 's') {
    return str.slice(0, -1);
  }
  return str;
}

/**
 * Takes a string and returns a list of token.
 * token are words, lowercased, without accent or punctuation, without final s.
 * @param {string} str 
 * @returns 
 */
function tokenize(str) {
  str = str.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  str = str.replace(/[^a-z\s]/g, "");
  let words = str.split(/\s+/);
  return words.map(word => remove_final_s(word));
}

/**
 * Take a list of strings and build an index to search those strings
 * @param {Array[string]} docs 
 */
function make_index(docs) {
  let index = {};
  docs.forEach((doc,i) => {
    for (let word of tokenize(doc)) {
      if (index[word]) {
        index[word].push(i);
      } else {
        index[word] = [i];
      }
    }
  });

  return index;
}

/**
 * Takes in a query and an index built with the make_index function, and returns a list of results.
 * @param {string} query 
 * @param {Object} index 
 */
function custom_search(query, index) {
  const query_tokens = tokenize(query);
  let matches = [];
  for (let token of query_tokens) {
    for (let index_token in index) {
      if (index_token.startsWith(token)) {
        matches.push(...index[index_token]);
      }
    }
  }

  let matches_dict = {};
  matches.forEach(match => {
    if (matches_dict[match]) {
      matches_dict[match]++;
    } else {
      matches_dict[match] = 1;
    }
  });

  let results = [];
  for (let match in matches_dict) {
    results.push({
      doc: match,
      score: matches_dict[match]
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}

function make_search_engine() {
  
  
  const search_items = Object.keys(data.products).map(coicop => ({
    coicop: coicop,
    name: data.products[coicop].name,
  }));
  
  const index = make_index(search_items.map(item => item.name));

  function search(query) {
    const results = custom_search(query, index);
    const products = results.map(r => Object.assign({score: r.score}, {coicop: search_items[r.doc].coicop}));
    products.sort((a, b) => a.coicop.length - b.coicop.length);
    return products;
  }

  return search;
}

const search = make_search_engine();

function get_children(coicop) {
  if (coicop === '0') {
    return Object.keys(data.products).filter(
      c => c.length === 2
    );
  } else {
    return Object.keys(data.products).filter(
      c => c.slice(0, -1) === coicop
    );
  }
}

export {search, get_children};