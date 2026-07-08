/*
 * Disclaimer: This software is provided "AS IS", without warranty of any kind,
 * express or implied, including but not limited to the warranties of merchantability,
 * fitness for a particular purpose and noninfringement. In no event shall the
 * authors or copyright holders be liable for any claim, damages or other liability,
 * whether in an action of contract, tort or otherwise, arising from, out of or in
 * connection with the software or the use or other dealings in the software.
 * 
 * Use at your own risk.
 */

if (typeof LinqLib === 'undefined') LinqLib = {};

/**
 * Creates a new Enumerable instance wrapping the source array.
 * @constructor
 * @param {Array} source - The source array (may be empty).
 * @returns {LinqLib.Enumerable} A new Enumerable object.
 * @example
 * var query = LinqLib.Enumerable([1,2,3,4,5]);
 */
LinqLib.Enumerable = function (source) {
    if (!(this instanceof LinqLib.Enumerable)) {
        return new LinqLib.Enumerable(source);
    }
    this._source = source || [];
};

/**
 * Filters the sequence based on a predicate.
 * @param {function(any, number): boolean} predicate - Function that takes an element and its index and returns true if the element should be included.
 * @returns {LinqLib.Enumerable} A new sequence containing only the elements that satisfy the condition.
 * @example
 * var evens = LinqLib.Enumerable([1,2,3,4]).where(function(x) { return x % 2 === 0; });
 * // result: [2,4]
 */
LinqLib.Enumerable.prototype.where = function (predicate) {
    var result = [];
    for (var i = 0; i < this._source.length; i++) {
        if (predicate(this._source[i], i)) {
            result.push(this._source[i]);
        }
    }
    return LinqLib.Enumerable(result);
};

/**
 * Projects each element of the sequence into a new form.
 * @param {function(any, number): any} selector - Transform function taking an element and its index.
 * @returns {LinqLib.Enumerable} A new sequence of transformed elements.
 * @example
 * var squares = LinqLib.Enumerable([1,2,3]).select(function(x) { return x * x; });
 * // result: [1,4,9]
 */
LinqLib.Enumerable.prototype.select = function (selector) {
    var result = [];
    for (var i = 0; i < this._source.length; i++) {
        result.push(selector(this._source[i], i));
    }
    return LinqLib.Enumerable(result);
};

/**
 * Flattens nested collections into a single flat sequence.
 * @param {function(any, number): Array} collectionSelector - Function that returns a collection for each element.
 * @returns {LinqLib.Enumerable} A flat sequence of elements from all nested collections.
 * @example
 * var nested = [[1,2],[3,4]];
 * var flat = LinqLib.Enumerable(nested).selectMany(function(x) { return x; });
 * // result: [1,2,3,4]
 */
LinqLib.Enumerable.prototype.selectMany = function (collectionSelector) {
    var result = [];
    for (var i = 0; i < this._source.length; i++) {
        var collection = collectionSelector(this._source[i], i);
        for (var j = 0; j < collection.length; j++) {
            result.push(collection[j]);
        }
    }
    return LinqLib.Enumerable(result);
};

/**
 * Sorts the elements in ascending order using a key.
 * @param {function(any): any} [keySelector] - Function to extract the key for comparison. If not provided, the element itself is used.
 * @returns {LinqLib.OrderedEnumerable} An ordered sequence (supports thenBy).
 * @example
 * var sorted = LinqLib.Enumerable([{name:'B',val:2},{name:'A',val:1}])
 *     .orderBy(function(x) { return x.val; });
 */
LinqLib.Enumerable.prototype.orderBy = function (keySelector) {
    keySelector = keySelector || function (x) { return x; };
    var copy = this._source.slice(0);
    copy.sort(function (a, b) {
        var ka = keySelector(a);
        var kb = keySelector(b);
        if (ka < kb) return -1;
        if (ka > kb) return 1;
        return 0;
    });
    return new LinqLib.OrderedEnumerable(copy, [{ descending: false, keySelector: keySelector }]);
};

/**
 * Sorts the elements in descending order using a key.
 * @param {function(any): any} [keySelector] - Function to extract the key.
 * @returns {LinqLib.OrderedEnumerable} An ordered sequence.
 */
LinqLib.Enumerable.prototype.orderByDescending = function (keySelector) {
    keySelector = keySelector || function (x) { return x; };
    var copy = this._source.slice(0);
    copy.sort(function (a, b) {
        var ka = keySelector(a);
        var kb = keySelector(b);
        if (ka > kb) return -1;
        if (ka < kb) return 1;
        return 0;
    });
    return new LinqLib.OrderedEnumerable(copy, [{ descending: true, keySelector: keySelector }]);
};

/**
 * Returns a specified number of contiguous elements from the start of the sequence.
 * @param {number} count - The number of elements to take.
 * @returns {LinqLib.Enumerable} A new sequence containing the first count elements.
 * @example
 * var first3 = LinqLib.Enumerable([1,2,3,4,5]).take(3); // [1,2,3]
 */
LinqLib.Enumerable.prototype.take = function (count) {
    if (count <= 0) return LinqLib.Enumerable([]);
    var result = [];
    for (var i = 0; i < Math.min(count, this._source.length); i++) {
        result.push(this._source[i]);
    }
    return LinqLib.Enumerable(result);
};

/**
 * Bypasses a specified number of elements and returns the remaining elements.
 * @param {number} count - The number of elements to skip.
 * @returns {LinqLib.Enumerable} A new sequence containing the elements after skipping.
 * @example
 * var after2 = LinqLib.Enumerable([1,2,3,4,5]).skip(2); // [3,4,5]
 */
LinqLib.Enumerable.prototype.skip = function (count) {
    if (count >= this._source.length) return LinqLib.Enumerable([]);
    var result = [];
    for (var i = count; i < this._source.length; i++) {
        result.push(this._source[i]);
    }
    return LinqLib.Enumerable(result);
};

/**
 * Concatenates two sequences.
 * @param {Array|LinqLib.Enumerable} other - The second sequence.
 * @returns {LinqLib.Enumerable} The concatenated sequence.
 * @example
 * var combined = LinqLib.Enumerable([1,2]).concat([3,4]); // [1,2,3,4]
 */
LinqLib.Enumerable.prototype.concat = function (other) {
    var otherArray = (other instanceof LinqLib.Enumerable) ? other._source : other;
    var result = this._source.slice(0);
    for (var i = 0; i < otherArray.length; i++) {
        result.push(otherArray[i]);
    }
    return LinqLib.Enumerable(result);
};

/**
 * Produces the set union of two sequences (no duplicates).
 * @param {Array|LinqLib.Enumerable} other - The second sequence.
 * @param {function(any): any} [keySelector] - Function to extract the key for comparing elements.
 * @returns {LinqLib.Enumerable} Unique elements from both sequences.
 * @example
 * var u = LinqLib.Enumerable([1,2,3]).union([2,3,4]); // [1,2,3,4]
 */
LinqLib.Enumerable.prototype.union = function (other, keySelector) {
    keySelector = keySelector || function (x) { return x; };
    var otherArray = (other instanceof LinqLib.Enumerable) ? other._source : other;
    var seen = {};
    var result = [];

    function addItem(item) {
        var key = keySelector(item);
        if (!seen.hasOwnProperty(key)) {
            seen[key] = true;
            result.push(item);
        }
    }

    for (var i = 0; i < this._source.length; i++) addItem(this._source[i]);
    for (var j = 0; j < otherArray.length; j++) addItem(otherArray[j]);

    return LinqLib.Enumerable(result);
};

/**
 * Produces the set intersection of two sequences (elements present in both).
 * @param {Array|LinqLib.Enumerable} other - The second sequence.
 * @param {function(any): any} [keySelector] - Function to extract the key.
 * @returns {LinqLib.Enumerable} Elements common to both sequences.
 * @example
 * var intersec = LinqLib.Enumerable([1,2,3]).intersect([2,3,4]); // [2,3]
 */
LinqLib.Enumerable.prototype.intersect = function (other, keySelector) {
    keySelector = keySelector || function (x) { return x; };
    var otherArray = (other instanceof LinqLib.Enumerable) ? other._source : other;
    var otherKeys = {};
    for (var j = 0; j < otherArray.length; j++) {
        otherKeys[keySelector(otherArray[j])] = true;
    }
    var result = [];
    var seen = {};
    for (var i = 0; i < this._source.length; i++) {
        var item = this._source[i];
        var key = keySelector(item);
        if (otherKeys.hasOwnProperty(key) && !seen.hasOwnProperty(key)) {
            seen[key] = true;
            result.push(item);
        }
    }
    return LinqLib.Enumerable(result);
};

/**
 * Produces the set difference of two sequences (elements present only in the first).
 * @param {Array|LinqLib.Enumerable} other - The second sequence.
 * @param {function(any): any} [keySelector] - Function to extract the key.
 * @returns {LinqLib.Enumerable} Elements not present in the second sequence.
 * @example
 * var except = LinqLib.Enumerable([1,2,3]).except([2,3,4]); // [1]
 */
LinqLib.Enumerable.prototype.except = function (other, keySelector) {
    keySelector = keySelector || function (x) { return x; };
    var otherArray = (other instanceof LinqLib.Enumerable) ? other._source : other;
    var otherKeys = {};
    for (var j = 0; j < otherArray.length; j++) {
        otherKeys[keySelector(otherArray[j])] = true;
    }
    var result = [];
    for (var i = 0; i < this._source.length; i++) {
        var item = this._source[i];
        var key = keySelector(item);
        if (!otherKeys.hasOwnProperty(key)) {
            result.push(item);
        }
    }
    return LinqLib.Enumerable(result);
};

/**
 * Groups the elements of the sequence by a key.
 * @param {function(any): any} keySelector - Function to extract the group key.
 * @returns {LinqLib.Enumerable} A sequence of objects { key, items }.
 * @example
 * var grouped = LinqLib.Enumerable([
 *     {type:'A',val:1},
 *     {type:'B',val:2},
 *     {type:'A',val:3}
 * ]).groupBy(function(x) { return x.type; });
 * // result: [{key:'A', items:[{type:'A',val:1},{type:'A',val:3}]},
 * //            {key:'B', items:[{type:'B',val:2}]}]
 */
LinqLib.Enumerable.prototype.groupBy = function (keySelector) {
    var groups = {};
    for (var i = 0; i < this._source.length; i++) {
        var item = this._source[i];
        var key = keySelector(item);
        if (!groups.hasOwnProperty(key)) groups[key] = [];
        groups[key].push(item);
    }
    var result = [];
    for (var key in groups) {
        if (groups.hasOwnProperty(key)) {
            result.push({ key: key, items: groups[key] });
        }
    }
    return LinqLib.Enumerable(result);
};

/**
 * Returns a sequence of unique elements.
 * @param {function(any): any} [keySelector] - Function to extract the key for comparison. If not provided, the element itself is used.
 * @returns {LinqLib.Enumerable} A new sequence without duplicates.
 * @example
 * // Unique by value
 * var distinct = LinqLib.Enumerable([1,2,2,3]).distinct(); // [1,2,3]
 * // Unique by key
 * var items = [{id:1,val:'a'},{id:2,val:'b'},{id:1,val:'c'}];
 * var distinctById = LinqLib.Enumerable(items).distinct(function(x) { return x.id; });
 * // result: [{id:1,val:'a'}, {id:2,val:'b'}] (first occurrence of each id)
 */
LinqLib.Enumerable.prototype.distinct = function (keySelector) {
    keySelector = keySelector || function (x) { return x; };
    var seen = {};
    var result = [];
    for (var i = 0; i < this._source.length; i++) {
        var item = this._source[i];
        var key = keySelector(item);
        if (!seen.hasOwnProperty(key)) {
            seen[key] = true;
            result.push(item);
        }
    }
    return LinqLib.Enumerable(result);
};

/**
 * Converts the sequence into a plain array (copy).
 * @returns {Array} The array of elements.
 */
LinqLib.Enumerable.prototype.toArray = function () {
    return this._source.slice(0);
};

/**
 * Converts the sequence into an object using a key and a value.
 * @param {function(any): string} keySelector - Function to extract the key.
 * @param {function(any): any} [valueSelector] - Function to extract the value (defaults to the element itself).
 * @returns {Object} An object with keys and corresponding values.
 * @throws {Error} If duplicate keys are encountered.
 * @example
 * var obj = LinqLib.Enumerable([
 *     {id:1, name:'A'},
 *     {id:2, name:'B'}
 * ]).toObject(
 *     function(x) { return 'key_' + x.id; },
 *     function(x) { return x.name; }
 * );
 * // result: { key_1: 'A', key_2: 'B' }
 */
LinqLib.Enumerable.prototype.toObject = function (keySelector, valueSelector) {
    valueSelector = valueSelector || function (x) { return x; };
    var obj = {};
    for (var i = 0; i < this._source.length; i++) {
        var item = this._source[i];
        var key = keySelector(item);
        if (obj.hasOwnProperty(key)) {
            throw new Error("Duplicate key: " + key);
        }
        obj[key] = valueSelector(item);
    }
    return obj;
};

/**
 * Returns the number of elements in the sequence, optionally satisfying a condition.
 * @param {function(any, number): boolean} [predicate] - The condition to count.
 * @returns {number} The number of elements.
 */
LinqLib.Enumerable.prototype.count = function (predicate) {
    if (!predicate) return this._source.length;
    var cnt = 0;
    for (var i = 0; i < this._source.length; i++) {
        if (predicate(this._source[i], i)) cnt++;
    }
    return cnt;
};

/**
 * Determines whether the sequence contains any elements that satisfy a condition.
 * @param {function(any, number): boolean} [predicate] - The condition. If not provided, checks if the sequence is non-empty.
 * @returns {boolean} true if the condition is satisfied or the sequence is not empty.
 */
LinqLib.Enumerable.prototype.any = function (predicate) {
    if (!predicate) return this._source.length > 0;
    for (var i = 0; i < this._source.length; i++) {
        if (predicate(this._source[i], i)) return true;
    }
    return false;
};

/**
 * Determines whether all elements satisfy a condition.
 * @param {function(any, number): boolean} predicate - The condition.
 * @returns {boolean} true if all elements satisfy the condition.
 */
LinqLib.Enumerable.prototype.all = function (predicate) {
    for (var i = 0; i < this._source.length; i++) {
        if (!predicate(this._source[i], i)) return false;
    }
    return true;
};

/**
 * Returns the first element of the sequence that satisfies a condition.
 * @param {function(any, number): boolean} [predicate] - The condition.
 * @returns {any|null} The first element or null if not found.
 */
LinqLib.Enumerable.prototype.first = function (predicate) {
    for (var i = 0; i < this._source.length; i++) {
        if (!predicate || predicate(this._source[i], i)) {
            return this._source[i];
        }
    }
    return null;
};

/**
 * Returns the last element of the sequence that satisfies a condition.
 * @param {function(any, number): boolean} [predicate] - The condition.
 * @returns {any|null} The last element or null if not found.
 */
LinqLib.Enumerable.prototype.last = function (predicate) {
    for (var i = this._source.length - 1; i >= 0; i--) {
        if (!predicate || predicate(this._source[i], i)) {
            return this._source[i];
        }
    }
    return null;
};

/**
 * Returns the element at a specified index.
 * @param {number} index - The index (zero-based).
 * @returns {any|null} The element or null if the index is out of range.
 */
LinqLib.Enumerable.prototype.elementAt = function (index) {
    if (index < 0 || index >= this._source.length) return null;
    return this._source[index];
};

/**
 * Returns the minimum value computed using a selector.
 * @param {function(any): number|string|Date} [selector] - Function to extract the value for comparison.
 * @returns {any|null} The minimum value or null for an empty sequence.
 */
LinqLib.Enumerable.prototype.min = function (selector) {
    if (this._source.length === 0) return null;
    selector = selector || function (x) { return x; };
    var minVal = selector(this._source[0]);
    for (var i = 1; i < this._source.length; i++) {
        var val = selector(this._source[i]);
        if (val < minVal) minVal = val;
    }
    return minVal;
};

/**
 * Returns the maximum value.
 * @param {function(any): number|string|Date} [selector] - Function to extract the value.
 * @returns {any|null} The maximum value or null.
 */
LinqLib.Enumerable.prototype.max = function (selector) {
    if (this._source.length === 0) return null;
    selector = selector || function (x) { return x; };
    var maxVal = selector(this._source[0]);
    for (var i = 1; i < this._source.length; i++) {
        var val = selector(this._source[i]);
        if (val > maxVal) maxVal = val;
    }
    return maxVal;
};

/**
 * Computes the sum of numeric values.
 * @param {function(any): number} [selector] - Function to extract the number.
 * @returns {number} The sum (0 for an empty sequence).
 */
LinqLib.Enumerable.prototype.sum = function (selector) {
    selector = selector || function (x) { return x; };
    var total = 0;
    for (var i = 0; i < this._source.length; i++) {
        total += selector(this._source[i]);
    }
    return total;
};

/**
 * Computes the arithmetic average of numeric values.
 * @param {function(any): number} [selector] - Function to extract the number.
 * @returns {number|null} The average or null for an empty sequence.
 */
LinqLib.Enumerable.prototype.average = function (selector) {
    if (this._source.length === 0) return null;
    return this.sum(selector) / this._source.length;
};

/**
 * An ordered sequence that supports additional sorting (thenBy / thenByDescending).
 * @constructor
 * @extends LinqLib.Enumerable
 * @param {Array} source - The source array.
 * @param {Array} sorters - An array of objects { descending, keySelector } for sequential application.
 */
LinqLib.OrderedEnumerable = function (source, sorters) {
    this._source = source;
    this._sorters = sorters;
};
LinqLib.OrderedEnumerable.prototype = new LinqLib.Enumerable([]);

LinqLib.OrderedEnumerable.prototype._createSortedCopy = function () {
    var copy = this._source.slice(0);
    var sorters = this._sorters;
    copy.sort(function (a, b) {
        for (var i = 0; i < sorters.length; i++) {
            var s = sorters[i];
            var ka = s.keySelector(a);
            var kb = s.keySelector(b);
            if (ka < kb) return s.descending ? 1 : -1;
            if (ka > kb) return s.descending ? -1 : 1;
        }
        return 0;
    });
    return copy;
};

LinqLib.OrderedEnumerable.prototype.thenBy = function (keySelector) {
    var newSorters = this._sorters.concat([{ descending: false, keySelector: keySelector }]);
    var sortedCopy = this._createSortedCopy();
    return new LinqLib.OrderedEnumerable(sortedCopy, newSorters);
};

LinqLib.OrderedEnumerable.prototype.thenByDescending = function (keySelector) {
    var newSorters = this._sorters.concat([{ descending: true, keySelector: keySelector }]);
    var sortedCopy = this._createSortedCopy();
    return new LinqLib.OrderedEnumerable(sortedCopy, newSorters);
};