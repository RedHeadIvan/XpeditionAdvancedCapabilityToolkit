var FIRST_TOLERANCE = 0.05;
var results2Data = [];
var results3Data = [];
var results2Original = [];
var results3Original = [];
var sortState2 = {};
var sortState3 = {};
var vin2Global, vout2Global, vin3Global, vout1Global, vout2Global;

function getStandardValues(series) {
    if (series === 24 || series === 'E24') return getEIAGrid(24);
    if (series === 48) return getEIAGrid(48);
    if (series === 96) return getEIAGrid(96);
    if (series === 12) return getEIAGrid(12);
    if (series === 6) return getEIAGrid(6);
    if (series === 192) return getEIAGrid(192);
    return getEIAGrid(96);
}

function selectNearestHigher(value, baseValues, unitDecade) {
    if (!baseValues || baseValues.length === 0) return NaN;
    var target = value / unitDecade;
    var decade = Math.floor(Math.log10(target));
    var mantissa = target / Math.pow(10, decade);
    
    var foundBase = null;
    for (var i = 0; i < baseValues.length; i++) {
        if (baseValues[i] >= mantissa - 1e-12) {
            foundBase = baseValues[i];
            break;
        }
    }
    if (foundBase === null) {
        decade++;
        foundBase = baseValues[0];
    }
    return foundBase * Math.pow(10, decade) * unitDecade;
}

function getEIAGrid(number) {
    if (number !== 49 && number !== 97 && number !== 193) {
        var result = [];
        var multiplier = Math.log(10);
        var roundPrecision = number < 48 ? 1 : 2;
        
        for (var i = 0; i < number; i++) {
            var val = Math.round(Math.exp(i / number * multiplier) * Math.pow(10, roundPrecision)) / Math.pow(10, roundPrecision);
            
            if (roundPrecision < 2) {
                if (val === 2.6) val = 2.7;
                else if (val === 2.9) val = 3.0;
                else if (val === 3.2) val = 3.3;
                else if (val === 3.5) val = 3.6;
                else if (val === 3.8) val = 3.9;
                else if (val === 4.2) val = 4.3;
                else if (val === 4.6) val = 4.7;
                else if (val === 8.3) val = 8.2;
            }
            result.push(val);
        }
        return result;
    }
    
    var grid24 = getEIAGrid(24);
    var grid48, grid96, grid192, combined, unique, j;
    
    if (number === 49) {
        grid48 = getEIAGrid(48);
        combined = grid24.concat(grid48);
        combined.sort(function(a, b) { return a - b; });
        unique = [];
        for (j = 0; j < combined.length; j++) {
            if (j === 0 || combined[j] !== combined[j-1]) unique.push(combined[j]);
        }
        return unique;
    }
    if (number === 97) {
        grid96 = getEIAGrid(96);
        combined = grid24.concat(grid96);
        combined.sort(function(a, b) { return a - b; });
        unique = [];
        for (j = 0; j < combined.length; j++) {
            if (j === 0 || combined[j] !== combined[j-1]) unique.push(combined[j]);
        }
        return unique;
    }
    if (number === 193) {
        grid192 = getEIAGrid(192);
        combined = grid24.concat(grid192);
        combined.sort(function(a, b) { return a - b; });
        unique = [];
        for (j = 0; j < combined.length; j++) {
            if (j === 0 || combined[j] !== combined[j-1]) unique.push(combined[j]);
        }
        return unique;
    }
    
    throw new Error('Invalid grid!');
}

function getTolerance(grid) {
    var tolerances = {
        3: 0.3, 6: 0.2, 12: 0.1, 24: 0.05,
        48: 0.02, 49: 0.02, 96: 0.01, 97: 0.01,
        192: 0.005, 193: 0.005
    };
    return tolerances[grid] || 0.05;
}

function getMin(rTop, rBot, tol, vin) {
    var rTopMax = rTop * (1 + tol);
    var rBotMin = rBot * (1 - tol);
    return Math.round(vin * (rBotMin / (rTopMax + rBotMin)) * 1000) / 1000;
}

function getMax(rTop, rBot, tol, vin) {
    var rTopMin = rTop * (1 - tol);
    var rBotMax = rBot * (1 + tol);
    return Math.round(vin * (rBotMax / (rTopMin + rBotMax)) * 1000) / 1000;
}

function runCalculation(btnSelector, calcFn) {
    var btn = document.querySelector(btnSelector);
    var origText = btn.textContent;
    btn.textContent = 'Calculating...';
    btn.disabled = true;
    
    setTimeout(function() {
        try {
            calcFn();
        } catch (e) {
            console.error('Error:', e);
            alert('Error: ' + e.message);
        }
        btn.textContent = origText;
        btn.disabled = false;
    }, 10);
}

function showError(msg, resultId) {
    var container = document.getElementById(resultId);
    container.innerHTML = '<div class="validation-error">' + msg + '</div>';
}

function parseSI(value) {
    if (typeof value === 'number') return value;
    value = value.toString().trim().replace(',', '.');
    var suffixes = {
        'T': 1e12, 'G': 1e9, 'M': 1e6, 'K': 1e3, 'k': 1e3,
        '': 1,
        'm': 1e-3, 'u': 1e-6, 'μ': 1e-6, 'n': 1e-9, 'p': 1e-12, 'f': 1e-15
    };
    var match = value.match(/^([0-9.]+)\s*([TGMKkμmunpf]?)$/);
    if (!match) return NaN;
    var num = parseFloat(match[1]);
    var suffix = match[2] || '';
    return num * (suffixes[suffix] || 1);
}

function formatSI(value, baseUnit) {
    if (value === 0) return '0';
    var prefixes = [
        { val: 1e12, label: 'T' },
        { val: 1e9, label: 'G' },
        { val: 1e6, label: 'M' },
        { val: 1e3, label: 'k' },
        { val: 1, label: '' },
        { val: 1e-3, label: 'm' },
        { val: 1e-6, label: 'u' },
        { val: 1e-9, label: 'n' },
        { val: 1e-12, label: 'p' }
    ];
    for (var i = 0; i < prefixes.length; i++) {
        if (Math.abs(value) >= prefixes[i].val || i === prefixes.length - 1) {
            var scaled = value / prefixes[i].val;
            return scaled.toFixed(scaled < 10 ? 2 : scaled < 100 ? 1 : 0) + prefixes[i].label;
        }
    }
    return value.toString();
}

function getAxisPrefix(maxVal, timeAxis) {
    if (timeAxis) {
        if (maxVal >= 1e9) return { val: 1e9, label: 'G', suffix: 's' };
        if (maxVal >= 1e6) return { val: 1e6, label: 'M', suffix: 's' };
        if (maxVal >= 1e3) return { val: 1e3, label: 'k', suffix: 's' };
        if (maxVal >= 1) return { val: 1, label: '', suffix: 's' };
        if (maxVal >= 1e-3) return { val: 1e-3, label: 'm', suffix: 's' };
        if (maxVal >= 1e-6) return { val: 1e-6, label: 'u', suffix: 's' };
        if (maxVal >= 1e-9) return { val: 1e-9, label: 'n', suffix: 's' };
        return { val: 1e-12, label: 'p', suffix: 's' };
    } else {
        if (maxVal >= 1) return { val: 1, label: '', suffix: 'V' };
        if (maxVal >= 1e-3) return { val: 1e-3, label: 'm', suffix: 'V' };
        if (maxVal >= 1e-6) return { val: 1e-6, label: 'u', suffix: 'V' };
        if (maxVal >= 1e-9) return { val: 1e-9, label: 'n', suffix: 'V' };
        return { val: 1e-12, label: 'p', suffix: 'V' };
    }
}

function validateDivider2(vin, vout) {
    if (vin <= 0) return 'Vin must be greater than 0';
    if (vout <= 0) return 'Vout must be greater than 0';
    if (vout >= vin) return 'Vout must be less than Vin';
    return null;
}

function validateDivider3(vin, vout1, vout2) {
    if (vin <= 0) return 'Vin must be greater than 0';
    if (vout1 <= 0) return 'Vout1 must be greater than 0';
    if (vout2 <= 0) return 'Vout2 must be greater than 0';
    if (vout1 >= vin) return 'Vout1 must be less than Vin';
    if (vout2 >= vout1) return 'Vout2 must be less than Vout1';
    return null;
}

function validateXTAL(esr, cl, cs, freq) {
    if (esr <= 0) return 'ESR must be greater than 0';
    if (cl <= 0) return 'Cl must be greater than 0';
    if (cs <= 0) return 'Cs must be greater than 0';
    if (cl <= cs) return 'Cl must be greater than Cs';
    if (freq <= 0) return 'Freq must be greater than 0';
    return null;
}

function calculateDivider2() {
    runCalculation('#div1 .btn', function() {
    var vin = parseSI(document.getElementById('vin2').value);
    var vout = parseSI(document.getElementById('vout2').value);
    var gridNum = parseInt(document.getElementById('grid2').value);
    
    var err = validateDivider2(vin, vout);
    if (err) { showError(err, 'results2'); return; }
    
    vin2Global = vin;
    vout2Global = vout;
    
    var mygrid = getEIAGrid(gridNum);
    var pairs = {};
    var tol = getTolerance(gridNum);

    for (var i = 0; i < mygrid.length; i++) {
        for (var j = 0; j < mygrid.length; j++) {
            var mul = 1;
            while (mul <= 1000) {
                var top = Math.round(mygrid[i] * mul * 1000) / 1000;
                var bottom = mygrid[j];
                var res = vin * (bottom / (top + bottom));
                var error = res - vout;

                if (Math.abs(error) < FIRST_TOLERANCE * vout) {
                    var key = top + '-' + bottom;
                    if (!pairs[key]) pairs[key] = { top: top, bottom: bottom, error: error };
                    break;
                }
                mul *= 10;
            }

            mul = 1;
            while (mul <= 1000) {
                top = mygrid[i];
                bottom = Math.round(mygrid[j] * mul * 1000) / 1000;
                res = vin * (bottom / (top + bottom));
                error = res - vout;

                if (Math.abs(error) < FIRST_TOLERANCE * vout) {
                    key = top + '-' + bottom;
                    if (!pairs[key]) pairs[key] = { top: top, bottom: bottom, error: error };
                    break;
                }
                mul *= 10;
            }
        }
    }

    var results = [];
    var k, p, item;
    for (k in pairs) {
        p = pairs[k];
        item = {
            top: p.top,
            bottom: p.bottom,
            error: p.error,
            relError: p.error / vout,
            min: getMin(p.top, p.bottom, tol, vin),
            max: getMax(p.top, p.bottom, tol, vin)
        };
        if (item.min < vout && item.max > vout) results.push(item);
    }

    results.sort(function(a, b) { return Math.abs(a.error) - Math.abs(b.error); });
    
    results2Data = results;
    results2Original = results.slice();
    sortState2 = {};
    
    displayResults2();
    });
}

function displayResults2() {
    var results = results2Data;
    var vin = vin2Global;
    var vout = vout2Global;
    var container = document.getElementById('results2');
    var tableContainer = document.getElementById('table2');
    
    container.innerHTML = 'Found ' + results.length + ' combinations';
    
    if (results.length === 0) {
        tableContainer.innerHTML = '<div class="no-results">No results</div>';
        return;
    }

    var arrow = { asc: ' \u25B2', desc: ' \u25BC' };
    var getArrow2 = function(col) {
        if (sortState2.col === col) return sortState2.dir === 'asc' ? arrow.asc : arrow.desc;
        return '';
    };

    var html = '<table><thead><tr>';
    html += '<th onclick="sortTable2(\'top\')">Rtop' + getArrow2('top') + '</th>';
    html += '<th onclick="sortTable2(\'bottom\')">Rbot' + getArrow2('bottom') + '</th>';
    html += '<th onclick="sortTable2(\'vout\')">Vout' + getArrow2('vout') + '</th>';
    html += '<th onclick="sortTable2(\'error\')">Error' + getArrow2('error') + '</th>';
    html += '<th onclick="sortTable2(\'min\')">Min' + getArrow2('min') + '</th>';
    html += '<th onclick="sortTable2(\'max\')">Max' + getArrow2('max') + '</th>';
    html += '<th onclick="sortTable2(\'ratio\')">Ratio' + getArrow2('ratio') + '</th>';
    html += '</tr></thead><tbody>';
    
    for (var i = 0; i < results.length; i++) {
        var r = results[i];
        var calcVout = vin * (r.bottom / (r.top + r.bottom));
        var inRange = r.min <= vout && r.max >= vout;
        html += '<tr>';
        html += '<td>' + formatSI(r.top, 'Ohm') + '</td>';
        html += '<td>' + formatSI(r.bottom, 'Ohm') + '</td>';
        html += '<td>' + formatSI(calcVout, 'V') + '</td>';
        html += '<td class="' + (inRange ? 'ok' : 'error-col') + '">' + (r.error * 100).toFixed(2) + '%</td>';
        html += '<td>' + formatSI(r.min, 'V') + '</td>';
        html += '<td>' + formatSI(r.max, 'V') + '</td>';
        html += '<td>' + (r.bottom / (r.top + r.bottom)).toFixed(4) + '</td>';
        html += '</tr>';
    }
    html += '</tbody></table>';
    tableContainer.innerHTML = html;
}

function sortTable2(col) {
    var calcVal = function(r) {
        if (col === 'vout') return vin2Global * (r.bottom / (r.top + r.bottom));
        if (col === 'ratio') return r.bottom / (r.top + r.bottom);
        if (col === 'error') return Math.abs(r.error);
        return r[col];
    };
    
    if (sortState2.col === col) {
        if (sortState2.dir === 'asc') {
            sortState2.dir = 'desc';
        } else if (sortState2.dir === 'desc') {
            results2Data = results2Original.slice();
            sortState2 = {};
            displayResults2();
            return;
        }
    } else {
        sortState2 = { col: col, dir: 'asc' };
    }
    
    results2Data.sort(function(a, b) {
        var va = calcVal(a);
        var vb = calcVal(b);
        if (sortState2.dir === 'asc') {
            return va - vb;
        } else {
            return vb - va;
        }
    });
    
    displayResults2();
}

function calculateDivider3() {
    runCalculation('#div2 .btn', function() {
    var vin = parseSI(document.getElementById('vin3').value);
    var vout1 = parseSI(document.getElementById('vout1_3').value);
    var vout2 = parseSI(document.getElementById('vout2_3').value);
    var gridNum = parseInt(document.getElementById('grid3').value);
    
    var err = validateDivider3(vin, vout1, vout2);
    if (err) { showError(err, 'results3'); return; }
    
    vin3Global = vin;
    vout1Global = vout1;
    vout2Global = vout2;
    
    var mygrid = getEIAGrid(gridNum);
    var pairs = {};
    var tol = getTolerance(gridNum);

    for (var i = 0; i < mygrid.length; i++) {
        for (var j = 0; j < mygrid.length; j++) {
            for (var k = 0; k < mygrid.length; k++) {
                var configs = [
                    [mygrid[i], mygrid[j], mygrid[k]],
                    [mygrid[i], mygrid[k], mygrid[j]],
                    [mygrid[j], mygrid[i], mygrid[k]]
                ];

                for (var c = 0; c < configs.length; c++) {
                    var topBase = configs[c][0];
                    var midBase = configs[c][1];
                    var botBase = configs[c][2];

                    for (var mul1 = 1; mul1 <= 1000; mul1 *= 10) {
                        for (var mul2 = 1; mul2 <= 1000; mul2 *= 10) {
                            var top = Math.round(topBase * mul1 * 1000) / 1000;
                            var mid = Math.round(midBase * mul2 * 1000) / 1000;
                            var bot = botBase;

                            var res1 = vin * ((mid + bot) / (top + mid + bot));
                            var res2 = vin * (bot / (top + mid + bot));
                            var error1 = res1 - vout1;
                            var error2 = res2 - vout2;

                            if (Math.abs(error1) < FIRST_TOLERANCE * vout1 && 
                                Math.abs(error2) < FIRST_TOLERANCE * vout2) {
                                var key = top + '-' + mid + '-' + bot;
                                if (!pairs[key]) {
                                    pairs[key] = { top: top, mid: mid, bot: bot, error1: error1, error2: error2 };
                                }
                                break;
                            }
                        }
                    }
                }
            }
        }
    }

    var results = [];
    var pk, p, item;
    for (pk in pairs) {
        p = pairs[pk];
        item = {
            top: p.top,
            mid: p.mid,
            bot: p.bot,
            error1: p.error1,
            error2: p.error2,
            relError1: p.error1 / vout1,
            relError2: p.error2 / vout2,
            min1: getMin(p.top, p.mid + p.bot, tol, vin),
            max1: getMax(p.top, p.mid + p.bot, tol, vin),
            min2: getMin(p.top + p.mid, p.bot, tol, vin),
            max2: getMax(p.top + p.mid, p.bot, tol, vin)
        };
        if (item.min1 < vout1 && item.max1 > vout1 && item.min2 < vout2 && item.max2 > vout2) {
            results.push(item);
        }
    }

    results.sort(function(a, b) { 
        return (Math.abs(a.error1) + Math.abs(a.error2)) - (Math.abs(b.error1) + Math.abs(b.error2)); 
    });
    
    results3Data = results;
    results3Original = results.slice();
    sortState3 = {};
    
    displayResults3();
    });
}

function displayResults3() {
    var results = results3Data;
    var vin = vin3Global;
    var vout1 = vout1Global;
    var vout2 = vout2Global;
    var container = document.getElementById('results3');
    var tableContainer = document.getElementById('table3');
    
    container.innerHTML = 'Found ' + results.length + ' combinations';
    
    if (results.length === 0) {
        tableContainer.innerHTML = '<div class="no-results">No results</div>';
        return;
    }

    var arrow = { asc: ' \u25B2', desc: ' \u25BC' };
    var getArrow3 = function(col) {
        if (sortState3.col === col) return sortState3.dir === 'asc' ? arrow.asc : arrow.desc;
        return '';
    };

    var html = '<table><thead><tr>';
    html += '<th onclick="sortTable3(\'top\')">Rtop' + getArrow3('top') + '</th>';
    html += '<th onclick="sortTable3(\'mid\')">Rmid' + getArrow3('mid') + '</th>';
    html += '<th onclick="sortTable3(\'bot\')">Rbot' + getArrow3('bot') + '</th>';
    html += '<th onclick="sortTable3(\'vout1\')">V1' + getArrow3('vout1') + '</th>';
    html += '<th onclick="sortTable3(\'error1\')">E1' + getArrow3('error1') + '</th>';
    html += '<th onclick="sortTable3(\'min1\')">Min1' + getArrow3('min1') + '</th>';
    html += '<th onclick="sortTable3(\'max1\')">Max1' + getArrow3('max1') + '</th>';
    html += '<th onclick="sortTable3(\'vout2\')">V2' + getArrow3('vout2') + '</th>';
    html += '<th onclick="sortTable3(\'error2\')">E2' + getArrow3('error2') + '</th>';
    html += '<th onclick="sortTable3(\'min2\')">Min2' + getArrow3('min2') + '</th>';
    html += '<th onclick="sortTable3(\'max2\')">Max2' + getArrow3('max2') + '</th>';
    html += '</tr></thead><tbody>';
    
    for (var i = 0; i < results.length; i++) {
        var r = results[i];
        var calcVout1 = vin * ((r.mid + r.bot) / (r.top + r.mid + r.bot));
        var calcVout2 = vin * (r.bot / (r.top + r.mid + r.bot));
        var inRange1 = r.min1 <= vout1 && r.max1 >= vout1;
        var inRange2 = r.min2 <= vout2 && r.max2 >= vout2;
        html += '<tr>';
        html += '<td>' + formatSI(r.top, 'Ohm') + '</td>';
        html += '<td>' + formatSI(r.mid, 'Ohm') + '</td>';
        html += '<td>' + formatSI(r.bot, 'Ohm') + '</td>';
        html += '<td>' + formatSI(calcVout1, 'V') + '</td>';
        html += '<td class="' + (inRange1 ? 'ok' : 'error-col') + '">' + (r.error1 * 100).toFixed(2) + '%</td>';
        html += '<td>' + formatSI(r.min1, 'V') + '</td>';
        html += '<td>' + formatSI(r.max1, 'V') + '</td>';
        html += '<td>' + formatSI(calcVout2, 'V') + '</td>';
        html += '<td class="' + (inRange2 ? 'ok' : 'error-col') + '">' + (r.error2 * 100).toFixed(2) + '%</td>';
        html += '<td>' + formatSI(r.min2, 'V') + '</td>';
        html += '<td>' + formatSI(r.max2, 'V') + '</td>';
        html += '</tr>';
    }
    html += '</tbody></table>';
    tableContainer.innerHTML = html;
}

function sortTable3(col) {
    var calcVal = function(r) {
        if (col === 'vout1') return vin3Global * ((r.mid + r.bot) / (r.top + r.mid + r.bot));
        if (col === 'vout2') return vin3Global * (r.bot / (r.top + r.mid + r.bot));
        if (col === 'error1') return Math.abs(r.error1);
        if (col === 'error2') return Math.abs(r.error2);
        return r[col];
    };
    
    if (sortState3.col === col) {
        if (sortState3.dir === 'asc') {
            sortState3.dir = 'desc';
        } else if (sortState3.dir === 'desc') {
            results3Data = results3Original.slice();
            sortState3 = {};
            displayResults3();
            return;
        }
    } else {
        sortState3 = { col: col, dir: 'asc' };
    }
    
    results3Data.sort(function(a, b) {
        var va = calcVal(a);
        var vb = calcVal(b);
        if (sortState3.dir === 'asc') {
            return va - vb;
        } else {
            return vb - va;
        }
    });
    
    displayResults3();
}

function switchTab(num) {
    document.getElementById('tabBtn1').className = num === 1 ? 'tab active' : 'tab';
    document.getElementById('tabBtn2').className = num === 2 ? 'tab active' : 'tab';
    document.getElementById('div1').className = num === 1 ? 'tab-content active' : 'tab-content';
    document.getElementById('div2').className = num === 2 ? 'tab-content active' : 'tab-content';
}

document.addEventListener('DOMContentLoaded', function() {
    calculateDivider2();
});

function switchApp(num) {
    var btns = document.querySelectorAll('.sidebar-btn');
    btns.forEach(function(b, i) {
        b.className = (i + 1) === num ? 'sidebar-btn active' : 'sidebar-btn';
    });
    var apps = ['divider-app', 'xtal-app', 'rc-app', 'dcdc-app'];
    apps.forEach(function(id, i) {
        document.getElementById(id).style.display = (i + 1) === num ? 'block' : 'none';
    });
    
    if (num === 1) {
        calculateDivider2();
    } else if (num === 3 && !document.getElementById('rc-results').innerHTML) {
        calculateRC();
    }
}

function validateRC(r, c, rTol, cTol, vin) {
    if (r <= 0) return 'R must be greater than 0';
    if (c <= 0) return 'C must be greater than 0';
    if (rTol < 0 || rTol > 50) return 'R tolerance must be 0-50%';
    if (cTol < 0 || cTol > 50) return 'C tolerance must be 0-50%';
    if (vin <= 0) return 'Vin must be greater than 0';
    return null;
}

function validateDCDC(vinMax, vinMin, vout, fsw, iout, K, deltaVout, vref, r2) {
    if (isNaN(vinMax)) return 'Invalid Vin max';
    if (isNaN(vinMin)) return 'Invalid Vin min';
    if (isNaN(vout)) return 'Invalid Vout';
    if (isNaN(fsw)) return 'Invalid Fsw';
    if (isNaN(iout)) return 'Invalid Iout';
    if (isNaN(K)) return 'Invalid Ripple (K)';
    if (isNaN(deltaVout)) return 'Invalid ΔVout';
    if (isNaN(vref)) return 'Invalid Vref';
    if (isNaN(r2)) return 'Invalid R2';
    if (vinMax <= 0) return 'Vin max must be > 0';
    if (vinMin <= 0) return 'Vin min must be > 0';
    if (vinMin >= vinMax) return 'Vin min must be < Vin max';
    if (vout <= 0) return 'Vout must be > 0';
    if (vout >= vinMax) return 'Vout must be < Vin max';
    if (vout >= vinMin) return 'Vout must be < Vin min';
    if (fsw <= 0) return 'Fsw must be > 0';
    if (iout <= 0) return 'Iout must be > 0';
    if (K <= 0 || K >= 1) return 'K (ripple) must be 0.1-0.9';
    if (deltaVout <= 0) return 'ΔVout must be > 0';
    if (vref <= 0) return 'Vref must be > 0';
    if (r2 <= 0) return 'R2 must be > 0';
    return null;
}

function calculateRC() {
    runCalculation('#rc-app .btn', function() {
    var r = parseSI(document.getElementById('rc-r').value);
    var c = parseSI(document.getElementById('rc-c').value);
    var rTol = parseFloat(document.getElementById('rc-r-tol').value);
    var cTol = parseFloat(document.getElementById('rc-c-tol').value);
    var vin = parseSI(document.getElementById('rc-vin').value);
    
    var err = validateRC(r, c, rTol, cTol, vin);
    if (err) { showError(err, 'rc-results'); return; }
    
    var rMin = r * (1 - rTol / 100);
    var rMax = r * (1 + rTol / 100);
    var cMin = c * (1 - cTol / 100);
    var cMax = c * (1 + cTol / 100);
    var tauMin = rMin * cMin;
    var tauNom = r * c;
    var tauMax = rMax * cMax;
    
    var numPoints = 500;
    var timeMax = tauNom * 5;
    var dt = timeMax / numPoints;
    
    var chargeNom = [], chargeMin = [], chargeMax = [];
    var dischargeNom = [], dischargeMin = [], dischargeMax = [];
    
    for (var i = 0; i <= numPoints; i++) {
        var t = i * dt;
        chargeNom.push(vin * (1 - Math.exp(-t / tauNom)));
        chargeMin.push(vin * (1 - Math.exp(-t / tauMax)));
        chargeMax.push(vin * (1 - Math.exp(-t / tauMin)));
        dischargeNom.push(vin * Math.exp(-t / tauNom));
        dischargeMin.push(vin * Math.exp(-t / tauMax));
        dischargeMax.push(vin * Math.exp(-t / tauMin));
    }
    
    var html = '<div style="margin-bottom:8px;">' +
        '<strong>Time Constants:</strong> ' + formatSI(tauNom, 's') + ' s (nom), ' + formatSI(tauMin, 's') + '-' + formatSI(tauMax, 's') + ' s (min-max)<br>' +
        '<strong>Full cycle (5*RC):</strong> ' + formatSI(tauNom * 5, 's') + ' s</div>';
    document.getElementById('rc-results').innerHTML = html;
    
    drawRCCurve('rc-chart', timeMax, vin, chargeNom, chargeMin, chargeMax, dischargeNom, dischargeMin, dischargeMax, dt, tauNom, tauMin, tauMax);
    });
}

function drawRCCurve(containerId, timeMax, vin, chargeNom, chargeMin, chargeMax, dischargeNom, dischargeMin, dischargeMax, dt, tauNom, tauMin, tauMax) {
    var container = document.getElementById(containerId);
    container.innerHTML = '';
    
    var tooltip = document.createElement('div');
    tooltip.style.cssText = 'position:absolute;display:none;background:#fff;border:1px solid #ccc;padding:6px 10px;border-radius:4px;font-size:12px;box-shadow:2px 2px 6px rgba(0,0,0,0.15);pointer-events:none;z-index:10;';
    container.appendChild(tooltip);
    
    var canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 400;
    container.appendChild(canvas);
    
    var ctx = canvas.getContext('2d');
    var w = 800;
    var h = 400;
    var pad = { top: 30, right: 30, bottom: 40, left: 50 };
    var plotW = w - pad.left - pad.right;
    var plotH = h - pad.top - pad.bottom;
    
    function drawLine(data, color, dash) {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.setLineDash(dash || []);
        for (var i = 0; i < data.length; i++) {
            var x = pad.left + (i / (data.length - 1)) * plotW;
            var y = pad.top + plotH - (data[i] / vin) * plotH;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
    
    function redrawBase() {
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, w, h);
        
        ctx.strokeStyle = '#ddd';
        ctx.beginPath();
        for (var i = 0; i <= 5; i++) {
            var y = pad.top + plotH * i / 5;
            ctx.moveTo(pad.left, y);
            ctx.lineTo(w - pad.right, y);
        }
        ctx.stroke();
        
        ctx.strokeStyle = '#ddd';
        ctx.beginPath();
        for (var i = 0; i <= 5; i++) {
            var x = pad.left + plotW * i / 5;
            ctx.moveTo(x, pad.top);
            ctx.lineTo(x, h - pad.bottom);
        }
        ctx.stroke();
        
        drawLine(chargeMax, '#4a90d9', []);
        drawLine(chargeNom, '#0066cc', [5, 3]);
        drawLine(chargeMin, '#4a90d9', []);
        
        drawLine(dischargeMax, '#e74c3c', []);
        drawLine(dischargeNom, '#c0392b', [5, 3]);
        drawLine(dischargeMin, '#e74c3c', []);
        
        ctx.setLineDash([]);
        var yPrefix = getAxisPrefix(vin, false);
        ctx.fillStyle = '#666';
        ctx.font = '12px Segoe UI';
        ctx.textAlign = 'right';
        for (var i = 0; i <= 5; i++) {
            var val = vin * (5 - i) / 5;
            var label;
            if (val === 0) {
                label = '0';
            } else {
                var scaled = val / yPrefix.val;
                label = (scaled < 1 ? scaled.toFixed(2) : scaled < 10 ? scaled.toFixed(1) : scaled.toFixed(0)) + yPrefix.label;
            }
            ctx.fillText(label, pad.left - 5, pad.top + plotH * i / 5 + 4);
        }
        
        var xPrefix = getAxisPrefix(timeMax, true);
        ctx.fillStyle = '#666';
        ctx.font = '12px Segoe UI';
        ctx.textAlign = 'center';
        for (var i = 0; i <= 5; i++) {
            var val = timeMax * i / 5;
            var label;
            if (val === 0) {
                label = '0';
            } else {
                var scaled = val / xPrefix.val;
                label = (scaled < 1 ? scaled.toFixed(2) : scaled < 10 ? scaled.toFixed(1) : scaled.toFixed(0)) + xPrefix.label;
            }
            ctx.fillText(label, pad.left + plotW * i / 5, h - pad.bottom + 20);
        }
        
        ctx.fillStyle = '#333';
        ctx.textAlign = 'center';
        ctx.font = '14px Segoe UI';
        ctx.fillText('Time (' + xPrefix.suffix + ')', w / 2, h - 5);
        ctx.save();
        ctx.translate(15, h / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Voltage (' + yPrefix.suffix + ')', 0, 0);
        ctx.restore();
        
var legendY = 20;
        ctx.font = '11px Segoe UI';
        ctx.fillStyle = '#0066cc';
        ctx.fillText('Charge', pad.left + 10, legendY);
        ctx.strokeStyle = '#4a90d9';
        ctx.beginPath();
        ctx.moveTo(pad.left + 70, legendY - 3);
        ctx.lineTo(pad.left + 110, legendY - 3);
        ctx.stroke();
        
        ctx.fillStyle = '#c0392b';
        ctx.fillText('Discharge', pad.left + 130, legendY);
    }
    
    redrawBase();
    
    canvas.onmousemove = function(e) {
        var rect = canvas.getBoundingClientRect();
        var mx = e.clientX - rect.left;
        var my = e.clientY - rect.top;
        
        if (mx < pad.left || mx > w - pad.right || my < pad.top || my > h - pad.bottom) {
            ctx.clearRect(0, 0, w, h);
            redrawBase();
            tooltip.style.display = 'none';
            return;
        }
        
        var t = ((mx - pad.left) / plotW) * timeMax;
        var idx = Math.round(t / dt);
        if (idx >= chargeNom.length) idx = chargeNom.length - 1;
        
        var chargeY = pad.top + plotH - (chargeNom[idx] / vin) * plotH;
        var dischargeY = pad.top + plotH - (dischargeNom[idx] / vin) * plotH;
        
        var distCharge = Math.abs(my - chargeY);
        var distDischarge = Math.abs(my - dischargeY);
        
        var isCharge = distCharge < distDischarge;
        var snapY = isCharge ? chargeY : dischargeY;
        var snapColor = isCharge ? '#0066cc' : '#c0392b';
        var snapVal = isCharge ? chargeNom[idx] : dischargeNom[idx];
        var snapMin = isCharge ? chargeMin[idx] : dischargeMin[idx];
        var snapMax = isCharge ? chargeMax[idx] : dischargeMax[idx];
        var snapLabel = isCharge ? 'Charge' : 'Discharge';
        
        var curT = idx * dt;
        var timeLabel = formatSI(curT, 's');
        
        var timeAtVinNom, timeAtVinMin, timeAtVinMax;
        if (isCharge) {
            timeAtVinNom = tauNom * Math.log(vin / (vin - snapVal));
            timeAtVinMin = tauMin * Math.log(vin / (vin - snapVal));
            timeAtVinMax = tauMax * Math.log(vin / (vin - snapVal));
        } else {
            timeAtVinNom = tauNom * Math.log(vin / snapVal);
            timeAtVinMin = tauMin * Math.log(vin / snapVal);
            timeAtVinMax = tauMax * Math.log(vin / snapVal);
        }
        
        tooltip.innerHTML = '<div style="color:' + snapColor + ';font-weight:bold;">Voltage: ' + formatSI(snapVal, 'V') + ' V</div>' +
            '<div style="color:#666;">Time: ' + timeLabel + ' s</div>' +
            '<div style="color:#666;">Voltage range: ' + formatSI(snapMin, 'V') + ' - ' + formatSI(snapMax, 'V') + ' V</div>' +
            '<div style="color:#666;">Time range: ' + formatSI(timeAtVinMin, 's') + ' - ' + formatSI(timeAtVinMax, 's') + ' s</div>';
        tooltip.style.display = 'block';
        tooltip.style.left = (mx + 15) + 'px';
        tooltip.style.top = (my - 30) + 'px';
        
        ctx.clearRect(0, 0, w, h);
        redrawBase();
        
        ctx.strokeStyle = snapColor;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(mx, pad.top);
        ctx.lineTo(mx, h - pad.bottom);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(pad.left, snapY);
        ctx.lineTo(w - pad.right, snapY);
        ctx.stroke();
        ctx.setLineDash([]);
    };
    
    canvas.onmouseout = function() {
        ctx.clearRect(0, 0, w, h);
        redrawBase();
        tooltip.style.display = 'none';
        ctx.setLineDash([]);
    };
}

function calculateXTAL() {
    runCalculation('#xtal-app .btn', function() {
    var esr = parseSI(document.getElementById('esr').value);
    var cl = parseSI(document.getElementById('cl').value);
    var cs = parseSI(document.getElementById('cs').value);
    var freq = parseSI(document.getElementById('freq').value);
    
    var err = validateXTAL(esr, cl, cs, freq);
    if (err) { showError(err, 'xtal-results'); return; }
    
    var C = (cl - cs) * 2;
    var gmcrit = 4 * esr * Math.pow(2 * Math.PI * freq, 2) * Math.pow(cs + cl, 2) * 1000;
    
    var container = document.getElementById('xtal-results');
    container.innerHTML = '<div style="display:flex;flex-wrap:wrap;gap:16px;padding:20px;background:#f5f5f5;border-radius:8px;justify-content:center;">' +
        '<div style="background:#fff;padding:12px;border-radius:6px;border:2px solid #0066cc;text-align:center;min-width:100px;">' +
            '<div style="font-size:11px;color:#666;">Load Cap</div>' +
            '<div style="font-size:18px;font-weight:bold;color:#0066cc;">' + formatSI(C, 'F') + 'F</div>' +
        '</div>' +
        '<div style="background:#fff;padding:12px;border-radius:6px;border:2px solid #e74c3c;text-align:center;min-width:100px;">' +
            '<div style="font-size:11px;color:#666;">gm crit</div>' +
            '<div style="font-size:18px;font-weight:bold;color:#e74c3c;">' + formatSI(gmcrit * 1e-3, 'A/V') + '/V</div>' +
        '</div>' +
    '</div>';
    });
}

function calculateBuck(
    Vin_max, Vin_min, Vout, Iout, fsw, deltaVout, Vref, R2,
    K, deltaIout, inductorSeries, deltaVout_ripple, deltaVin
) {
    var D = Vout / Vin_max;
    var deltaIL = K * Iout;

    var L_theory = (Vin_max - Vout) * Vout / (Vin_max * fsw * deltaIL);
    var baseVals = getStandardValues(inductorSeries);
    var L_selected = selectNearestHigher(L_theory, baseVals, 1e-6);
    var L_selected_uH = L_selected * 1e6;
    var I_L_peak = Iout + deltaIL / 2;
    var I_L_rms = Math.sqrt(Iout * Iout + deltaIL * deltaIL / 12);
    var I_sat_min = I_L_peak * 1.2;

    var Cout_min_uF = 0;
    var term1 = (1 - D) * (1 + K);
    var term2 = (K * K / 12) * (2 - D);
    var sumTerms = term1 + term2;
    var Cout_transient_F = (deltaIout / (fsw * deltaVout * K)) * sumTerms;
    Cout_min_uF = Math.max(Cout_min_uF, Cout_transient_F * 1e6);

    if (deltaVout_ripple !== null && deltaVout_ripple > 0) {
        var Cout_ripple_F = deltaIL / (8 * fsw * deltaVout_ripple);
        Cout_min_uF = Math.max(Cout_min_uF, Cout_ripple_F * 1e6);
    }

    var ESR_max = (deltaVout_ripple !== null && deltaVout_ripple > 0) ? deltaVout_ripple / deltaIL : deltaVout / deltaIL;

    var D_min = Vout / Vin_max;
    var D_max = Vout / Vin_min;
    var D_half = 0.5;
    var D_cin, Vin_cin;

    if (D_min <= D_half && D_max >= D_half) {
        D_cin = D_half;
        Vin_cin = Vout / D_cin;
    } else {
        var val_min = D_min * (1 - D_min);
        var val_max = D_max * (1 - D_max);
        if (val_min > val_max) {
            D_cin = D_min;
            Vin_cin = Vin_max;
        } else {
            D_cin = D_max;
            Vin_cin = Vin_min;
        }
    }

    var ICin_rms = Iout * Math.sqrt(D_cin * (1 - D_cin));
    var Cin_min_uF = null;
    if (deltaVin !== null && deltaVin > 0) {
        var Cin_min_F = Iout * D_cin * (1 - D_cin) / (fsw * deltaVin);
        Cin_min_uF = Cin_min_F * 1e6;
    }

    var R1 = R2 * (Vout / Vref - 1);

    return {
        D: D,
        D_min: D_min,
        D_max: D_max,
        deltaIL_A: deltaIL,
        L_theory_uH: L_theory * 1e6,
        L_selected_uH: L_selected_uH,
        L_series: inductorSeries,
        I_L_peak_A: I_L_peak,
        I_L_rms_A: I_L_rms,
        I_sat_min_A: I_sat_min,
        Cout_min_uF: Cout_min_uF,
        ESR_max_mOhm: ESR_max * 1000,
        Cin_rms_A: ICin_rms,
        Cin_min_uF: Cin_min_uF,
        R1_Ohm: R1,
        R2_Ohm: R2,
        worst_case_cin_D: D_cin,
        worst_case_cin_Vin: Vin_cin
    };
}

function calculateDCDC() {
    runCalculation('#dcdc-app .btn', function() {
    var vinMax = parseSI(document.getElementById('dcdc-vin-max').value);
    var vinMin = parseSI(document.getElementById('dcdc-vin-min').value);
    var vout = parseSI(document.getElementById('dcdc-vout').value);
    var fsw = parseSI(document.getElementById('dcdc-fsw').value);
    var iout = parseSI(document.getElementById('dcdc-iout').value);
    var K = parseFloat(document.getElementById('dcdc-k').value);
    var deltaVout = parseSI(document.getElementById('dcdc-dvout').value);
    var deltaIoutInput = document.getElementById('dcdc-diout').value;
    var deltaIout = deltaIoutInput ? parseSI(deltaIoutInput) : iout;
    var deltaVoutRippleInput = document.getElementById('dcdc-dvout-ripple').value;
    var deltaVout_ripple = deltaVoutRippleInput ? parseSI(deltaVoutRippleInput) : null;
    var deltaVin = parseSI(document.getElementById('dcdc-dvin').value);
    var vref = parseSI(document.getElementById('dcdc-vref').value);
    var r2 = parseSI(document.getElementById('dcdc-r2').value);
    var lSeries = parseInt(document.getElementById('dcdc-l-series').value);
    
    var err = validateDCDC(vinMax, vinMin, vout, fsw, iout, K, deltaVout, vref, r2);
    if (err) {
        document.getElementById('dcdc-results').innerHTML = '<div class="validation-error">' + err + '</div>';
        return;
    }
    
    var res = calculateBuck(
        vinMax, vinMin, vout, iout, fsw, deltaVout, vref, r2,
        K, deltaIout, lSeries, deltaVout_ripple, deltaVin
    );
    
    var results = document.getElementById('dcdc-results');
    results.innerHTML = '<div style="display:flex;flex-wrap:wrap;gap:16px;padding:20px;background:#f5f5f5;border-radius:8px;justify-content:center;">' +
        '<div style="background:#fff;padding:12px;border-radius:6px;border:2px solid #0066cc;text-align:center;min-width:100px;">' +
            '<div style="font-size:11px;color:#666;">L</div>' +
            '<div style="font-size:18px;font-weight:bold;color:#0066cc;">' + res.L_selected_uH.toFixed(2) + 'uH</div>' +
            '<div style="font-size:10px;color:#999;">E' + res.L_series + '</div>' +
            '<div style="font-size:10px;color:#999;">Isat: ' + formatSI(res.I_sat_min_A, 'A') + '</div>' +
            '<div style="font-size:10px;color:#999;">Irms: ' + formatSI(res.I_L_rms_A, 'A') + '</div>' +
        '</div>' +
        '<div style="background:#fff;padding:12px;border-radius:6px;border:2px solid #4a90d9;text-align:center;min-width:100px;">' +
            '<div style="font-size:11px;color:#666;">Cout</div>' +
            '<div style="font-size:18px;font-weight:bold;color:#4a90d9;">' + res.Cout_min_uF.toFixed(1) + 'uF</div>' +
            '<div style="font-size:10px;color:#999;">ESR: ' + res.ESR_max_mOhm.toFixed(0) + 'mΩ</div>' +
        '</div>' +
        '<div style="background:#fff;padding:12px;border-radius:6px;border:2px solid #e74c3c;text-align:center;min-width:100px;">' +
            '<div style="font-size:11px;color:#666;">Cin</div>' +
            '<div style="font-size:18px;font-weight:bold;color:#e74c3c;">' + (res.Cin_min_uF ? res.Cin_min_uF.toFixed(1) + 'uF' : '—') + '</div>' +
            '<div style="font-size:10px;color:#999;">I rms: ' + formatSI(res.Cin_rms_A, 'A') + '</div>' +
        '</div>' +
        '<div style="background:#fff;padding:12px;border-radius:6px;border:2px solid #f39c12;text-align:center;min-width:100px;">' +
            '<div style="font-size:11px;color:#666;">R1</div>' +
            '<div style="font-size:18px;font-weight:bold;color:#f39c12;">' + formatSI(res.R1_Ohm, 'Ohm') + '</div>' +
            '<div style="font-size:10px;color:#999;">R2: ' + formatSI(res.R2_Ohm, 'Ohm') + '</div>' +
        '</div>' +
        '<div style="background:#fff;padding:12px;border-radius:6px;border:2px solid #27ae60;text-align:center;min-width:100px;">' +
            '<div style="font-size:11px;color:#666;">D</div>' +
            '<div style="font-size:18px;font-weight:bold;color:#27ae60;">' + (res.D_min * 100).toFixed(1) + '-' + (res.D_max * 100).toFixed(1) + '%</div>' +
            '<div style="font-size:10px;color:#999;">ΔIL: ' + formatSI(res.deltaIL_A, 'A') + '</div>' +
        '</div>' +
    '</div>';
    });
}