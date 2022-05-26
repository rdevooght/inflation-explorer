import { distance as levenshtein_distance } from 'fastest-levenshtein';

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
  str = str.trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  str = str.replace(/[^a-z\s]/g, "");
  let words = str.split(/\s+/);
  return [...new Set(words.map(word => remove_final_s(word)).filter(word => word.length > 1))];
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

function levenshtein_similarity(str1, str2) {
  return 1 - levenshtein_distance(str1, str2) / Math.max(str1.length, str2.length);
}

function fuzzy_match(query_tokens, index, threshold=0.7) {
  let matches = [];
  for (let token of query_tokens) {
    for (let index_token in index) {
      if (levenshtein_similarity(index_token, token) >= threshold) {
        matches.push(...index[index_token]);
      }
    }
  }
  return matches;
}

function start_match(query_tokens, index, min_length=2) {
  let matches = [];
  for (let token of query_tokens) {
    for (let index_token in index) {
      if (index_token.startsWith(token) && index_token.length >= min_length && token.length >= min_length) {
        matches.push(...index[index_token]);
      }
    }
  }
  return matches;
}

/**
 * Takes in a query and an index built with the make_index function, and returns a list of results.
 * @param {string} query 
 * @param {Object} index 
 */
function custom_search(query, index) {
  const query_tokens = tokenize(query);
  let matches = start_match(query_tokens, index);
  if (matches.length === 0) {
    matches = fuzzy_match(query_tokens, index);
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
    products.sort((a, b) => b.score - a.score);
    return products;
  }

  return search;
}

const search = make_search_engine();

// Returns the coicop of the product whose name matches the query exactly.
function exact_match(query) {
  for (let coicop in data.products) {
    if (data.products[coicop].name === query) {
      return coicop;
    }
  }
  return null;
}

export {search, exact_match};