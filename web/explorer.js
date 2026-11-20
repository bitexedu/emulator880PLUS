'use strict';

const PROBABILITY_FORMS = [
  {names: ['Nhân b.cố đ. lập','Mult. Indep Evts'], title:'P(A∩B)', keys:['a','b'], fields:['P(A)','P(B)']},
  {names: ['X.suất toàn phần','Total Prob.'], title:'P(B)', keys:['a','ba','bNotA'], fields:['P(A)','P(B|A)','P(B|Ā)']},
  {names: ['Công thức Bayes','Bayes Formula'], title:'P(A|B)', keys:['a','ba','bNotA'], fields:['P(A)','P(B|A)','P(B|Ā)']}
];

function probability880(form, values) {
  const [a, b, c] = values;
  const one = {num:1n, den:1n};
  const joint = fracMul(a, b);
  if (form === 0) return joint;
  const total = fracAdd(joint, fracMul(fracSub(one, a), c));
  if (form === 1) return total;
  if (total.num === 0n) throw new EngineError('Math ERROR');
  return fracDiv(joint, total);
}

const GROUPED_STATS = [
  ['Trung bình','Mean'], ['Phương sai','Variance'], ['Độ lệch chuẩn','Std. Deviation'],
  ['Q₁','Q₁'], ['Trung vị','Median'], ['Q₃','Q₃'], ['Khoảng tứ p.vị','IQR'], ['Mốt','Mode']
];

function groupedStats880(start, step, counts, exact = false) {
  const fraction = value => value && typeof value === 'object' && 'den' in value ? value : roundedNumberFraction(value);
  const weights = counts.map(fraction);
  const total = weights.reduce(fracAdd, ZERO_FRACTION);
  if (fracIsZero(total)) throw new EngineError('Math ERROR');
  const first = fraction(start);
  const width = fraction(step);
  const midpoint = index => fracAdd(first,fracMul(width,{num:BigInt(index * 2 + 1),den:2n}));
  const mean = fracDiv(weights.reduce((sum,n,index) => fracAdd(sum,fracMul(n,midpoint(index))),ZERO_FRACTION),total);
  const variance = fracDiv(weights.reduce((sum,n,index) => {
    const delta = fracSub(midpoint(index),mean);
    return fracAdd(sum,fracMul(n,fracMul(delta,delta)));
  },ZERO_FRACTION),total);
  const quantile = numerator => {
    const target = fracMul(total,{num:numerator,den:4n});
    let preceding = ZERO_FRACTION;
    for (const [index,count] of weights.entries()) {
      if (!fracIsZero(count) && fracSub(fracAdd(preceding,count),target).num >= 0n) {
        const position = fracAdd({num:BigInt(index),den:1n},fracDiv(fracSub(target,preceding),count));
        return fracAdd(first,fracMul(width,position));
      }
      preceding = fracAdd(preceding,count);
    }
    return fracAdd(first,fracMul(width,{num:BigInt(counts.length),den:1n}));
  };
  const maximum = weights.reduce((max,value) => fracSub(value,max).num > 0n ? value : max,ZERO_FRACTION);
  const modes = weights.flatMap((count,index) => {
    if (!fracIsZero(fracSub(count,maximum))) return [];
    const left = fracSub(count,weights[index - 1] || ZERO_FRACTION);
    const right = fracSub(count,weights[index + 1] || ZERO_FRACTION);
    const denominator = fracAdd(left,right);
    const position = fracAdd({num:BigInt(index),den:1n},fracIsZero(denominator) ? {num:1n,den:2n} : fracDiv(left,denominator));
    return [fracIsZero(denominator) ? null : fracAdd(first,fracMul(width,position))];
  });
  const q1 = quantile(1n);
  const q3 = quantile(3n);
  const values = [mean,variance,variance,q1,quantile(2n),q3,fracSub(q3,q1),modes];
  if (exact) return values;
  return values.map((value,index) => Array.isArray(value) ? value.map(mode => mode ? fracToNumber(mode) : NaN)
    : index === 2 ? Math.sqrt(fracToNumber(value)) : fracToNumber(value));
}

const GEOMETRY_FORMS_880 = {
  'triangle-side': {group:'triangle', vi:'Cạnh BC', en:'Side BC', title:'Tam giác ABC',
    fields:['Cạnh AB','Cạnh AC','Góc A'], keys:['ab','ac','angleA'], stores:'bc'},
  'triangle-height': {group:'triangle', vi:'Ch.cao AH', en:'Height AH', title:'Tam giác ABC',
    fields:['Cạnh AB','Góc B'], keys:['ab','angleB'], stores:'ah'},
  'triangle-angle-height': {group:'triangle', vi:'Góc B(AB,AH)', en:'Angle B(AB,AH)', title:'Tam giác ABC',
    fields:['Cạnh AB','Ch.cao AH'], keys:['ab','ah'], result:'Góc B', stores:'angleB'},
  'triangle-angle-sides': {group:'triangle', vi:'Góc (AB,BC,AC)', en:'Angles(AB,BC,AC)', title:'Tam giác ABC',
    fields:['Cạnh AB','Cạnh BC','Cạnh AC'], keys:['ab','bc','ac'], result:'Góc A', stores:'angleA'},
  'triangle-area-sas': {group:'triangle', vi:'Dtích(AB,AC,∠A)', en:'Area(AB,AC,∠A)', title:'Tam giác ABC',
    fields:['Cạnh AB','Cạnh AC','Góc A'], keys:['ab','ac','angleA'], result:'Dtích'},
  'triangle-area-asa': {group:'triangle', vi:'Dtích(AB,∠A,∠B)', en:'Area(AB,∠A,∠B)', title:'Tam giác ABC',
    fields:['Cạnh AB','Góc A','Góc B'], keys:['ab','angleA','angleB'], result:'Dtích'},
  heron: {group:'heron', vi:'Công thức Heron', en:'Heron’s Formula', title:'Tam giác ABC',
    fields:['Cạnh AB','Cạnh BC','Cạnh AC'], keys:['ab','bc','ac'], result:'Dtích'},
  'equilateral-height': {group:'equilateral', vi:'Ch.cao AH', en:'Height AH', title:'Tam giác ABC',
    fields:['Cạnh AB'], keys:['ab'], stores:'ah'},
  'equilateral-perimeter': {group:'equilateral', vi:'Chu vi', en:'Perimeter', title:'Tam giác ABC',
    fields:['Cạnh AB'], keys:['ab']},
  'equilateral-area': {group:'equilateral', vi:'Dtích', en:'Area', title:'Tam giác ABC',
    fields:['Cạnh AB'], keys:['ab']},
  'sector-chord': {group:'sector', vi:'Dây cung', en:'Chord', title:'Hình quạt',
    fields:['Bán kính r','θ'], keys:['radius','theta']},
  'sector-arc': {group:'sector', vi:'Cung', en:'Arc', title:'Hình quạt',
    fields:['Bán kính r','θ'], keys:['radius','theta']},
  'sector-area': {group:'sector', vi:'Dtích', en:'Area', title:'Hình quạt',
    fields:['Bán kính r','θ'], keys:['radius','theta']},
  'distance-points': {group:'distance', vi:'Từ điểm đến điểm', en:'Point to Point', title:'Khoảng cách',
    fields:['Điểm','Điểm'], result:'Khoảng cách', memories:['point','point']},
  'distance-line': {group:'distance', vi:'Điểm đến đ.thẳng', en:'Point to Line', title:'Khoảng cách',
    fields:['Điểm','Đường thẳng'], result:'Khoảng cách', memories:['point','line']},
  plane: {group:'plane', vi:'P.trình m.phẳng', en:'Plane Equation', title:'P:ax+by+cz+d=0',
    fields:['Điểm','Điểm','Điểm'], memories:['point','point','point']}
};

function geometryExpression880(id, values, settings, literal = fractionToEvalLiteral) {
  const [a,b,c] = values.map(value => '(' + literal(value) + ')');
  const square = value => '(' + value + ')²';
  switch (id) {
    case 'triangle-side': return '√(' + square(a) + '+' + square(b) + '-2×' + a + '×' + b + '×cos(' + c + '))';
    case 'triangle-height': return a + '×sin(' + b + ')';
    case 'triangle-angle-height': return 'sin⁻¹(' + b + '÷' + a + ')';
    case 'triangle-angle-sides': return 'cos⁻¹((' + square(a) + '+' + square(c) + '-' + square(b) + ')÷(2×' + a + '×' + c + '))';
    case 'triangle-area-sas': return a + '×' + b + '×sin(' + c + ')÷2';
    case 'triangle-area-asa': return square(a) + '×sin(' + b + ')×sin(' + c + ')÷(2×sin(' + b + '+' + c + '))';
    case 'heron': {
      if (values.some(value => /[√π]/.test(literal(value)))) {
        const half = '((' + a + '+' + b + '+' + c + ')÷2)';
        return '√(' + half + '×(' + half + '-' + a + ')×(' + half + '-' + b + ')×(' + half + '-' + c + '))';
      }
      const [ab,bc,ac] = values;
      const s = fracDiv(fracAdd(fracAdd(ab,bc),ac), {num:2n,den:1n});
      const areaSquare = [ab,bc,ac].reduce((product, side) => fracMul(product, fracSub(s,side)), s);
      if (areaSquare.num < 0n) throw new EngineError('Math ERROR');
      return '√(' + fractionToEvalLiteral(areaSquare) + ')';
    }
    case 'equilateral-height': return a + '×√(3)÷2';
    case 'equilateral-perimeter': return '3×' + a;
    case 'equilateral-area': return square(a) + '×√(3)÷4';
    case 'sector-chord': {
      const degrees = convertAngleValue(fracToNumber(values[1]), settings.angle, 'deg');
      const normalized = ((degrees % 360) + 360) % 360;
      if ([30,150,210,330].some(angle => Math.abs(normalized - angle) < 1e-10)) {
        return a + '×(√(6)' + (normalized === 30 || normalized === 330 ? '-' : '+') + '√(2))÷2';
      }
      return '2×' + a + '×sin(' + b + '÷2)';
    }
    case 'sector-arc': return a + '×' + b + (settings.angle === 'deg' ? '×π÷180' : settings.angle === 'grad' ? '×π÷200' : '');
    case 'sector-area': return square(a) + '×' + b + (settings.angle === 'deg' ? '×π÷360' : settings.angle === 'grad' ? '×π÷400' : '÷2');
  }
  throw new EngineError('Argument ERROR');
}

function geometryVectorDifference880(a,b) {
  return a.map((value,index) => fracSub(value,b[index]));
}

function geometryCross880(a,b) {
  return [0,1,2].map(index => fracSub(fracMul(a[(index+1)%3],b[(index+2)%3]), fracMul(a[(index+2)%3],b[(index+1)%3])));
}

function geometrySquaredLength880(a) {
  return a.reduce((sum,value) => fracAdd(sum,fracMul(value,value)), ZERO_FRACTION);
}
