// Engine Tầng 0-5: quản lý biểu thức đang gõ và tính toán khi bấm "=".
// Từ Tầng 5, biểu thức đang gõ được lưu dưới dạng CÂY node (xem phần "mô
// hình tài liệu có cấu trúc" gần cuối file) thay cho chuỗi phẳng, để hiển
// thị và sửa được theo cách trình bày sách giáo khoa.
// Không đụng tới DOM, không đụng tới CSS, không xử lý sự kiện chuột/chạm.
// Dùng chung được cho mọi nền tảng (web, Windows, iOS, Android) sau này.

// CONST — [ĐÃ XÁC NHẬN 2026-10-05] 47 mục trên CASIO ClassPad.
// BUG-044, 07/11/2026: cập nhật CODATA2022 theo yêu cầu ưu tiên số liệu đúng.
// Giữ47 ký hiệu/thứ tự CASIO. Giá trị cũ, độ bất định và nguồn NIST được giữ ở
// docs/qa/2026-11-07-constants044/oracle.json. Định nghĩa dẫn xuất làm tròn15
// chữ số; giá trị đo giữ mọi chữ số được NIST công bố, không coi là chính xác tuyệt đối.
const SCIENTIFIC_CONSTANT_GROUPS = [
  { en:'Universal', vi:'Hằng số chung', items:[
    ['h','h','6.62607015e-34'],['hbar','ħ','1.05457181764616e-34'],['c0','c₀','299792458'],
    ['eps0','ε₀','8.8541878188e-12'],['mu0','μ₀','1.25663706127e-6'],['Z0','Z₀','376.730313412'],
    ['G','G','6.67430e-11'],['lP','lP','1.616255e-35'],['tP','tP','5.391247e-44']] },
  { en:'Electromagnetic', vi:'Hằng số điện từ', items:[
    ['muN','μN','5.0507837393e-27'],['muB','μB','9.2740100657e-24'],['qe','e','1.602176634e-19'],
    ['phi0','Φ₀','2.06783384846193e-15'],['G0','G₀','0.0000774809172986365'],['KJ','KJ','483597848416984'],['RK','RK','25812.8074593045']] },
  { en:'Atomic&Nuclear', vi:'Hsố ntử & hnhân', items:[
    ['mp','mₚ','1.67262192595e-27'],['mn','mₙ','1.67492750056e-27'],['me','mₑ','9.1093837139e-31'],
    ['mmu','mμ','1.883531627e-28'],['a0','a₀','5.29177210544e-11'],['alpha','α','7.2973525643e-3'],
    ['re','rₑ','2.8179403205e-15'],['lambdaC','λc','2.42631023538e-12'],['gammaP','γₚ','2.6752218708e8'],
    ['lambdaCp','λcp','1.32140985360e-15'],['lambdaCn','λcn','1.31959090382e-15'],['Rinf','R∞','10973731.568157'],
    ['mup','μₚ','1.41060679545e-26'],['mue','μₑ','-9.2847646917e-24'],['mun','μₙ','-9.6623653e-27'],
    ['mumu','μμ','-4.49044830e-26'],['mtau','mτ','3.16754e-27']] },
  { en:'Physico-Chem', vi:'Hsố vlý-hhọc', items:[
    ['u','u','1.66053906892e-27'],['F','F','96485.3321233100'],['NA','NA','6.02214076e23'],
    ['k','k','1.380649e-23'],['Vm','Vₘ','0.0227109546414856'],['R','R','8.31446261815324'],
    ['c1','c₁','3.74177185219276e-16'],['c2','c₂','0.0143877687750393'],['sigma','σ','5.67037441918443e-8']] },
  { en:'Adopted Values', vi:'Gtrị thông qua', items:[
    ['g','g','9.80665'],['atm','atm','101325'],['RK90','RK-90','25812.807'],['KJ90','KJ-90','483597.9e9']] },
  { en:'Other', vi:'Khác', items:[['t','t','273.15']] }
];
const SCIENTIFIC_CONSTANTS = Object.fromEntries(SCIENTIFIC_CONSTANT_GROUPS.flatMap(group=>
  group.items.map(([id,symbol,value])=>[id,{symbol,value}])));
const PLUS_SCIENTIFIC_CONSTANT_SYMBOLS = {c0:'c',u:'mᵤ',g:'gₙ'};
// PLUS stores these four derived constants at the published ten-digit values.
// Scaling and subtracting each nominal value returned zero on ClassPad.
const PLUS_SCIENTIFIC_CONSTANT_VALUES = {
  hbar:'1.054571817e-34',G0:'0.00007748091729',RK:'25812.80745',c2:'0.01438776877'
};

// Dịch thành số THẬP PHÂN đầy đủ để cả parser số thực, Complex và các
// nhánh Fraction/Surd/Pi dùng chung giá trị mà không coi e/F là biến.
function scientificConstantLiteral(id, value) {
  const entry=SCIENTIFIC_CONSTANTS[id];
  if(!entry) throw new EngineError('Syntax ERROR');
  const [mantissa,exponent='0']=(value ?? entry.value).toLowerCase().split('e');
  const negative=mantissa.startsWith('-');
  const unsigned=negative?mantissa.slice(1):mantissa;
  const parts=unsigned.split('.');const digits=parts.join('');
  const point=parts[0].length+Number(exponent);
  const decimal=point<=0?'0.'+'0'.repeat(-point)+digits:
    point>=digits.length?digits+'0'.repeat(point-digits.length):digits.slice(0,point)+'.'+digits.slice(point);
  return '('+(negative?'-':'')+decimal+')';
}
function hasScientificConstant(nodes) {
  return nodes.some(node=>node.constant || templateSlots(node).some(hasScientificConstant));
}

// CONV — [ĐÃ XÁC NHẬN 2026-10-05] 40 phép đổi, 9 nhóm.
// Hệ số thuận theo bảng manual tr.88–91; chiều ngược giữ phép chia đầy đủ.
const UNIT_CONVERSION_MARK = '\uE001';
const UNIT_CONVERSION_GROUPS = [
  {en:'Length',vi:'Độ dài',pairs:[['in','cm','2.54'],['ft','m','0.3048'],['yd','m','0.9144'],['mile','km','1.609344'],['n mile','m','1852'],['pc','km','30856780000000']]},
  {en:'Area',vi:'Diện tích',pairs:[['acre','m²','4046.856',false]]},
  {en:'Volume',vi:'Thể tích',pairs:[['gal(US)','L','3.785412'],['gal(UK)','L','4.54609']]},
  {en:'Mass',vi:'Khối lượng',pairs:[['oz','g','28.34952'],['lb','kg','0.4535924']]},
  {en:'Velocity',vi:'Vận tốc',pairs:[['km/h','m/s','5/18']]},
  {en:'Pressure',vi:'Áp suất',pairs:[['atm','Pa','101325'],['mmHg','Pa','133.3224',false],['kgf/cm²','Pa','98066.5'],['lbf/in²','kPa','6.894757']]},
  {en:'Energy',vi:'Năng lượng',pairs:[['kgf·m','J','9.80665'],['J','cal','5000/20929']]},
  {en:'Power',vi:'Công suất',pairs:[['hp','kW','0.7457',true,false]]},
  {en:'Temperature',vi:'Nhiệt độ',pairs:[['°F','°C','5/9']]}
].map(group=>({...group,items:group.pairs.flatMap(([from,to,factor,forwardExact=true,reverseExact=true])=>[
  {id:from+'-'+to,label:from+'▸'+to,factor,inverse:false,exact:forwardExact,temperature:from==='°F'},
  {id:to+'-'+from,label:to+'▸'+from,factor,inverse:true,exact:reverseExact,temperature:from==='°F'}
])}));
const UNIT_CONVERSIONS = Object.fromEntries(UNIT_CONVERSION_GROUPS.flatMap(group=>group.items.map(item=>[item.id,item])));
// Model-specific conversion records keep the PLUS nominal factors with each input token.
for (const [baseId,factor] of [['acre-m²','4046.873'],['m²-acre','4046.873'],
  ['hp-kW','0.7456999'],['kW-hp','0.7456999']]) {
  const id = '880:'+baseId;
  UNIT_CONVERSIONS[id] = {...UNIT_CONVERSIONS[baseId],id,baseId,factor};
}
function readUnitConversionToken(source,start) {
  const end=source.indexOf(UNIT_CONVERSION_MARK,start+1);
  const id=source.slice(start+1,end);
  if(end<0 || !UNIT_CONVERSIONS[id]) throw new EngineError('Syntax ERROR');
  return {type:'CONVERSION',id,end:end+1};
}
function unitConversionFactor(entry) {
  const parts=entry.factor.split('/');
  return fracDiv(fractionFromDecimalString(parts[0]),fractionFromDecimalString(parts[1]||'1'));
}
function unitConversionFraction(value,id) {
  const entry=UNIT_CONVERSIONS[id];
  if(!entry.exact) throw new EngineError('Math ERROR');
  const factor=unitConversionFactor(entry);
  if(entry.temperature) return entry.inverse
    ? fracAdd(fracDiv(value,factor),{num:32n,den:1n})
    : fracMul(fracSub(value,{num:32n,den:1n}),factor);
  return entry.inverse?fracDiv(value,factor):fracMul(value,factor);
}
function normalizeUnitConversionNumber(value) {
  if(!Number.isFinite(value)||Math.abs(value)>9.999999999e99) throw new EngineError('Math ERROR');
  return Math.abs(value)<1e-99?0:value;
}
function unitConversionNumber(value,id) {
  const entry=UNIT_CONVERSIONS[id];const factor=fracToNumber(unitConversionFactor(entry));
  const result=entry.temperature?(entry.inverse?value/factor+32:(value-32)*factor):
    (entry.inverse?value/factor:value*factor);
  return normalizeUnitConversionNumber(result);
}
function hasUnitConversion(nodes) {
  return nodes.some(node=>node.conversion || templateSlots(node).some(hasUnitConversion));
}

function hasDmsInput(nodes) {
  return nodes.some(node=>(!node.conversion && node.type==='char' && /[°′″]/.test(node.ch)) || templateSlots(node).some(hasDmsInput));
}

// CONV áp dụng SAU dấu âm nhưng trước ×/÷; các hậu tố viết tiếp sau CONV
// áp dụng từ trái sang phải. Một chỗ giữ luật cho mọi parser, không DOM.
function parseUnitConversionSuffix(value,peek,take,power,implicit,ops) {
  let applied=false;
  while(true) {
    const type=String(peek()).toUpperCase();
    if(type==='CONVERSION') {
      value=ops.convert(value,take().id);applied=true;
      if(String(peek()).toUpperCase()==='NUMBER') throw new EngineError('Syntax ERROR');
    } else if(applied && ['SQUARE','CUBE','RECIPROCAL','INVERSE','PERCENT','FACTORIAL','CARET'].includes(type)) {
      take();
      if(type==='SQUARE'||type==='CUBE') value=ops.power(value,type==='SQUARE'?2:3);
      else if(type==='RECIPROCAL'||type==='INVERSE') value=ops.reciprocal(value);
      else if(type==='PERCENT') value=ops.percent(value);
      else if(type==='FACTORIAL') value=ops.factorial(value);
      else value=ops.exponent(value,power());
    } else if(applied && implicit()) value=ops.multiply(value,power());
    else break;
  }
  return value;
}
function computeFactorial(value) {
    if (!Number.isInteger(value) || value < 0) {
      throw new EngineError('Math ERROR');
    }
    let result = 1;
    for (let i = 2; i <= value; i++) {
      result *= i;
      if (result > 9.999999999e99) {
        throw new EngineError('Math ERROR');
      }
    }
    return result;
  }

function unitConversionArithmetic(kind) {
  if(kind==='number') return {
    convert:unitConversionNumber,multiply:(a,b)=>normalizeUnitConversionNumber(a*b),
    power:(a,b)=>normalizeUnitConversionNumber(Math.pow(a,b)),exponent:(a,b)=>normalizeUnitConversionNumber(Math.pow(a,b)),
    reciprocal:a=>normalizeUnitConversionNumber(1/a),percent:a=>a/100,factorial:computeFactorial
  };
  if(kind==='fraction') return {
    convert:unitConversionFraction,multiply:fracMul,power:fracPowInt,
    exponent:(a,b)=>{if(b.den!==1n)throw new EngineError('Math ERROR');return fracPowInt(a,Number(b.num));},
    reciprocal:a=>fracDiv({num:1n,den:1n},a),percent:a=>fracDiv(a,{num:100n,den:1n}),
    factorial:a=>{if(a.den!==1n)throw new EngineError('Math ERROR');return {num:BigInt(computeFactorial(Number(a.num))),den:1n};}
  };
  if(kind==='surd') return {
    convert:(a,id)=>{if(a.radicand!==1n)throw new EngineError('Math ERROR');return surdFromFraction(unitConversionFraction(a.rational,id));},
    multiply:surdMul,power:surdPowInt,exponent:(a,b)=>{if(b.radicand!==1n||b.rational.den!==1n)throw new EngineError('Math ERROR');return surdPowInt(a,Number(b.rational.num));},
    reciprocal:surdReciprocal,percent:a=>surdMul(a,surdFromFraction({num:1n,den:100n})),factorial:()=>{throw new EngineError('Math ERROR');}
  };
  if(kind==='pi') {
    const scale=(a,id)=>{
      const entry=UNIT_CONVERSIONS[id];if(!entry.exact)throw new EngineError('Math ERROR');
      const factor=unitConversionFactor(entry);const scalar=piValFromFraction(factor);
      const offset=piValFromFraction({num:32n,den:1n});
      if(entry.temperature) return entry.inverse?piValAdd(piValDiv(a,scalar),offset):piValMul(piValSub(a,offset),scalar);
      return entry.inverse?piValDiv(a,scalar):piValMul(a,scalar);
    };
    const power=(a,n)=>{if(!Number.isInteger(n)||Math.abs(n)>1000)throw new EngineError('Math ERROR');let value=piValFromFraction({num:1n,den:1n});const base=n<0?piValDiv(value,a):a;for(let i=0;i<Math.abs(n);i++)value=piValMul(value,base);return value;};
    return {convert:scale,multiply:piValMul,power,exponent:(a,b)=>{if(b.degree!==0||b.rational.den!==1n)throw new EngineError('Math ERROR');return power(a,Number(b.rational.num));},
      reciprocal:a=>piValDiv(piValFromFraction({num:1n,den:1n}),a),percent:a=>piValMul(a,piValFromFraction({num:1n,den:100n})),factorial:()=>{throw new EngineError('Math ERROR');}};
  }
  if(kind==='complex') {
    const real=a=>{if(a.im!==0)throw new EngineError('Math ERROR');return a.re;};
    return {convert:(a,id)=>complexNumber(unitConversionNumber(real(a),id),0),multiply:complexMul,power:complexPowInteger,
      exponent:(a,b)=>complexPowInteger(a,real(b)),reciprocal:a=>complexDiv(complexNumber(1,0),a),percent:a=>complexDiv(a,complexNumber(100,0)),factorial:()=>{throw new EngineError('Math ERROR');}};
  }
  const isCollection=kind==='matrix'?isMatrixValue:isVectorValue;
  const real=a=>{if(isCollection(a))throw new EngineError('Math ERROR');return a;};
  return {convert:(a,id)=>unitConversionNumber(real(a),id),multiply:kind==='matrix'?matrixMultiply:vectorMultiply,
    power:(a,n)=>Math.pow(real(a),n),exponent:(a,b)=>Math.pow(real(a),real(b)),reciprocal:a=>1/real(a),percent:a=>real(a)/100,factorial:a=>computeFactorial(real(a))};
}

// ÷R — CASIO 2026-10-05: số dư hữu hạn tới ba chữ số thập phân;
// số âm, 0 hoặc toán hạng từ 10^10 chuyển sang chia thường.
function divisionRemainderNumber(dividend,divisor) {
  if(divisor===0)throw new EngineError('Math ERROR');
  const division=dividend/divisor;
  if(!Number.isFinite(division)||Math.abs(division)>9.999999999e99)throw new EngineError('Math ERROR');
  const fallback={value:division,remainder:null};
  if(dividend<=0 || divisor<=0 || dividend>=1e10 || divisor>=1e10)return fallback;
  const left=roundedNumberFraction(Number(dividend.toPrecision(14)));
  const right=roundedNumberFraction(Number(divisor.toPrecision(14)));
  const ratio=fracDiv(left,right);
  const quotient=Number(ratio.num/ratio.den);
  if(quotient>=1e10)return fallback;
  const residual=fracSub(left,fracMul({num:BigInt(quotient),den:1n},right));
  if(residual.num<0n || 1000n%residual.den!==0n)return fallback;
  const remainder=fracToNumber(residual);
  return {value:quotient,remainder};
}
function createRemainderContext(source,onPair) {
  if(!source.includes('÷R'))return null;
  // Chỉ hiện số dư nếu phép toán ngoài cùng cuối cùng là ÷R.
  // Ví dụ 2×5÷R3 hiện, nhưng 0+5÷R2 và (5÷R2) chỉ hiện thương.
  let depth=0,lowest=Infinity,visibleStart=-1;
  for(let i=0;i<source.length;i++){
    const ch=source[i];
    if(ch===UNIT_CONVERSION_MARK){i=source.indexOf(UNIT_CONVERSION_MARK,i+1);continue;}
    if(ch==='('){depth++;continue;}if(ch===')'){depth--;continue;}
    if(depth!==0)continue;
    const isR=source.startsWith('÷R',i);
    let priority=/[+−-]/.test(ch)?1:/[×*÷/]/.test(ch)?2:Infinity;
    if(/[+−-]/.test(ch) && (i===0 || /[+−×*÷/(-]/.test(source[i-1]) || source.slice(i-2,i)==='÷R'))priority=Infinity;
    if(priority!==Infinity && priority<=lowest){lowest=priority;visibleStart=isR?i:-1;}
    if(isR)i++;
  }
  let displayed=null;
  return {accept(pair,start){if(pair.remainder!==null){onPair?.(pair);if(start===visibleStart)displayed=pair;}},result:()=>displayed};
}

const SUPERSCRIPT_DIGITS = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻'
};

function toSuperscript(n) {
  return String(n).split('').map((ch) => SUPERSCRIPT_DIGITS[ch] || ch).join('');
}

function trimTrailingZeros(str) {
  if (str.indexOf('.') === -1) return str;
  return str.replace(/0+$/, '').replace(/\.$/, '');
}

function roundToSignificantDigits(value, digits) {
  if (value === 0) return 0;
  const magnitude = Math.ceil(Math.log10(Math.abs(value)));
  const factor = Math.pow(10, digits - magnitude);
  return Math.round(value * factor) / factor;
}

// ===== Number Format (mục 3 của SETUP) =====
// ĐÃ XÁC NHẬN 2026-08-21 trên bản giả lập chính hãng. Toàn bộ số liệu dưới
// đây bấm SAU "Initialize All" nên là trạng thái gốc của máy, không phải
// trạng thái phiên web (bẫy đã ghi trong CLAUDE.md).
//
//   Mặc định là NORM 1: 1÷191 ra "5.235602094×10⁻³".
//   Norm 1 — dạng mũ khi |x| < 10⁻² hoặc |x| ≥ 10¹⁰:
//     1÷100 → "0.01", 1÷1000 → "1×10⁻³", 10⁹ → "1000000000", 10¹⁰ → "1×10¹⁰".
//   Norm 2 — chỉ khác biên DƯỚI, biên trên vẫn 10¹⁰:
//     10⁻⁹ → "0.000000001", 10⁻¹⁰ → "1×10⁻¹⁰", 10¹⁰ → "1×10¹⁰".
//   Fix n — n chữ số sau dấu phẩy, LÀM TRÒN chứ không cắt:
//     2÷3 ở Fix 3 → "0.667" (nếu cắt thì đã ra "0.666").
//     Fix ĐÈ biên dưới: 1÷10000 ở Fix 3 → "0.000", không đổi sang dạng mũ.
//     Fix 0 giữ lại dấu chấm cuối: 2÷3 → "1.";  0 ở Fix 3 → "0.000".
//     Nhưng Fix KHÔNG áp vào phần định trị khi vượt biên TRÊN — lúc đó máy
//     nhả về đúng dạng mũ 10 chữ số của Norm: 10¹¹÷3 ở Fix 3 →
//     "3.333333333×10¹⁰", KHÔNG phải "3.333×10¹⁰".
//   Sci n — n CHỮ SỐ CÓ NGHĨA, luôn ở dạng mũ kể cả số mũ 0:
//     1÷3 ở Sci 5 → "3.3333×10⁻¹", 1.3 ở Sci 5 → "1.3000×10⁰",
//     0 ở Sci 5 → "0.0000×10⁰". Sci 0 nghĩa là 10 chữ số:
//     1÷3 ở Sci 0 → "3.333333333×10⁻¹".
//
// Fix/Sci chỉ là chuyện HIỂN THỊ, không đụng tới giá trị tính toán: ở Fix 0,
// 2÷3 hiện "1." nhưng "Ans×3" ra "2." chứ không phải 3. Vì hàm này chỉ định
// dạng chứ không sửa giá trị nên tính chất đó có sẵn, không phải làm gì thêm.
// Fix/Sci cũng KHÔNG đè dạng chính xác: ở MathI/MathO với Fix bật, 1÷3 vẫn
// hiện phân số 1/3 và √2 vẫn hiện √2 — chúng đi đường exactFraction/exactSurd
// chứ không qua hàm này, nên cũng tự đúng.
const DEFAULT_NUMBER_FORMAT = { kind: 'norm', digits: 1 };

// Biên TRÊN dùng chung cho cả ba kiểu (đã bấm ở Norm 1, Norm 2 và Fix 3).
const EXPONENT_UPPER = 10;

// Tách một số thành phần định trị + số mũ với đúng số chữ số có nghĩa.
// Làm tròn có thể đẩy phần định trị lên 10 (vd 9.99 lấy 2 chữ số → "10"),
// khi đó phải tăng số mũ rồi tính lại để phần định trị luôn nằm trong [1,10).
function scientificParts(value, significantDigits) {
  let exponent = Math.floor(Math.log10(Math.abs(value)));
  let mantissaStr = (value / Math.pow(10, exponent)).toFixed(significantDigits - 1);
  if (Math.abs(parseFloat(mantissaStr)) >= 10) {
    exponent += 1;
    mantissaStr = (value / Math.pow(10, exponent)).toFixed(significantDigits - 1);
  }
  return { mantissaStr, exponent };
}

function formatNumber(value, format) {
  const fmt = format || DEFAULT_NUMBER_FORMAT;

  // Sci đứng riêng: luôn ra dạng mũ, kể cả số 0 và kể cả số mũ bằng 0, nên
  // không dùng chung nhánh nào với Fix/Norm.
  if (fmt.kind === 'sci') {
    const digits = fmt.digits === 0 ? 10 : fmt.digits;
    if (value === 0) return (0).toFixed(digits - 1) + '×10' + toSuperscript(0);
    const { mantissaStr, exponent } = scientificParts(value, digits);
    return mantissaStr + '×10' + toSuperscript(exponent);
  }

  if (fmt.kind === 'fix') {
    // Chỉ vượt biên TRÊN mới rơi xuống dạng mũ; biên dưới bị Fix đè nên số
    // rất nhỏ hiện thành "0.000" chứ không thành dạng mũ.
    const abs = Math.abs(value);
    if (abs !== 0 && Math.floor(Math.log10(abs)) >= EXPONENT_UPPER) {
      return formatNumber(value, DEFAULT_NUMBER_FORMAT);
    }
    const fixed = value.toFixed(fmt.digits);
    // toFixed(0) bỏ mất dấu chấm, mà máy vẫn hiện "1." — thêm lại.
    return fmt.digits === 0 ? fixed + '.' : fixed;
  }

  // Norm 1 / Norm 2.
  if (value === 0) return '0';

  // CASIO 2026-10-06: chọn dạng Norm theo số mũ SAU làm tròn.
  // 9.99999999999×10^9 hiện 1×10^10; ở bậc −3 hiện 0.01.
  // scientificParts tăng số mũ khi định trị làm tròn thành ±10;
  // chỉ đổi chuỗi hiển thị, không chốt giá trị trong kho biến.
  const { mantissaStr, exponent } = scientificParts(value, 10);
  const lowerBound = fmt.digits === 2 ? -9 : -2;

  if (exponent < lowerBound || exponent >= EXPONENT_UPPER) {
    return trimTrailingZeros(mantissaStr) + '×10' + toSuperscript(exponent);
  }

  // KHÔNG dùng Number.toString() ở đây: JavaScript tự đổi sang ký hiệu mũ
  // khi số nhỏ hơn 10⁻⁷, nên Norm 2 sẽ cho ra "1e-9" — vừa sai dạng vừa lọt
  // cú pháp JavaScript lên màn hình. Norm 1 không bao giờ chạm vùng đó (biên
  // dưới của nó là 10⁻²) nên lỗi này nằm im cho tới khi có Norm 2.
  // toFixed với đúng (9 − số mũ) chữ số thập phân cho ra 10 chữ số có nghĩa,
  // rồi cắt số 0 thừa ở đuôi.
  const rounded = roundToSignificantDigits(value, 10);
  return trimTrailingZeros(rounded.toFixed(Math.max(0, 9 - exponent)));
}

// CASIO 2026-10-06: nghiệm và L−R bỏ qua Fix/Sci/Norm2, dùng Norm1.
// Cắt dòng thập phân ở 12 ký tự, định trị khoa học ở 8 ký tự (tính cả
// dấu âm/dấu chấm), không làm tròn phần bị cắt. Ô nhập x có thêm một
// ký tự định trị (Fix3/Norm2 đã đo); định dạng không đổi kho biến.
function formatSolveResult(value, scientificWidth = 8) {
  const text = formatNumber(value, DEFAULT_NUMBER_FORMAT);
  if (text.includes('×')) {
    const [coefficient, power] = text.split('×');
    // PLUS hiển thị thêm một ký tự ở định trị khi số mũ chỉ có một chữ số.
    const width = scientificWidth ?? (power.replace('⁻', '').length === 3 ? 9 : 8);
    return trimTrailingZeros(coefficient.slice(0, width)) + '×' + power;
  }
  return text.length > 12 ? text.slice(0, 12).replace(/\.$/, '') : text;
}

// Rnd thay đổi giá trị dùng tiếp, khác với định dạng hiển thị Fix/Sci.
// CASIO 2026-10-05: Norm 10 chữ số có nghĩa; Fix vẫn áp số lẻ với số lớn.
// Dịch dấu thập phân bằng chuỗi để 1.005 ở Fix2 không rơi thành 1.00 do float.
function roundForCalculation(value, format = DEFAULT_NUMBER_FORMAT) {
  if (!Number.isFinite(value)) throw new EngineError('Math ERROR');
  if (value === 0) return 0;
  const digits = format.kind === 'sci' ? (format.digits || 10) : 10;
  const places = format.kind === 'fix' ? format.digits
    : digits - 1 - Math.floor(Math.log10(Math.abs(value)));
  const shift = (number, power) => {
    const [coefficient, exponent = '0'] = String(number).split('e');
    return Number(coefficient + 'e' + (Number(exponent) + power));
  };
  return Math.sign(value) * shift(Math.round(shift(Math.abs(value), places)), -places);
}

// Pol/Rec trả hai giá trị; khi nằm trong biểu thức chỉ dùng giá trị đầu.
// CASIO 2026-10-05: r âm, gốc Pol và góc Rec ngoài miền đều Math ERROR.
function coordinateConversion(kind, a, b, unit) {
  const limit = 9.999999999e99;
  if (typeof a !== 'number' || typeof b !== 'number' || !Number.isFinite(a) ||
      !Number.isFinite(b) || Math.abs(a) > limit || Math.abs(b) > limit) throw new EngineError('Math ERROR');
  const normalize = value => Math.abs(value) < 1e-99 ? 0 : value;
  a = normalize(a); b = normalize(b);
  let first, second;
  if (kind === 'Pol') {
    if (a === 0 && b === 0) throw new EngineError('Math ERROR');
    first = Math.hypot(a, b);
    second = fromRadians(Math.atan2(b, a), unit);
  } else {
    if (a < 0) throw new EngineError('Math ERROR');
    checkTrigAngleRange(b, unit);
    const angle = unit === 'rad' ? b % (2 * Math.PI)
      : toRadians(b % (unit === 'grad' ? 400 : 360), unit);
    const quarter = angle / (Math.PI / 2);
    const axis = Math.round(quarter);
    const onAxis = angle === axis * (Math.PI / 2);
    first = a * (onAxis ? [1,0,-1,0][((axis % 4) + 4) % 4] : Math.cos(angle));
    second = a * (onAxis ? [0,1,0,-1][((axis % 4) + 4) % 4] : Math.sin(angle));
  }
  if (!Number.isFinite(first) || Math.abs(first) > limit) throw new EngineError('Math ERROR');
  return { kind, first:normalize(first), second:normalize(second) };
}

// Giữ vị trí nguồn để Engine chốt dạng chính xác mà không tính lại hàm hoặc
// đọc lại x/y đã bị thay đổi bởi một hàm xuất hiện trước đó trong biểu thức.
function coordinateCallRange(source, start) {
  let depth = 1, comma = -1, end = start + 4;
  for (; end < source.length && depth; end++) {
    if (source[end] === '(') depth++;
    else if (source[end] === ')') depth--;
    else if (source[end] === ',' && depth === 1) comma = end;
  }
  return { start, end, arguments:[{start:start+4,end:comma},{start:comma+1,end:end-1}] };
}

// CASIO 2026-10-05: Int cắt về 0; Intg lấy sàn. Trước khi cắt,
// giá trị cách số nguyên khác 0 dưới 10^(bậc độ lớn−13) được chốt
// về số nguyên đó. So sánh thập phân bằng phân số để ngưỡng bằng nhau
// không bị float kéo vào: Int(9.9999999999999)=9 nhưng
// Int(29.9999999999999)=30. Giá trị dưới 10^-99 đã underflow thành 0.
function integerPartForCalculation(value, floor = false) {
  if (!Number.isFinite(value) || Math.abs(value) > 9.999999999e99) {
    throw new EngineError('Math ERROR');
  }
  if (Math.abs(value) < 1e-99) return 0;
  const nearest = Math.round(value);
  if (nearest !== 0 && !Number.isInteger(value)) {
    const exponent = Number(Math.abs(value).toExponential().split('e')[1]);
    const difference = fracSub(roundedNumberFraction(value), roundedNumberFraction(nearest));
    const tolerance = roundedNumberFraction(Number('1e' + (exponent - 13)));
    const numerator = difference.num < 0n ? -difference.num : difference.num;
    if (numerator * tolerance.den < tolerance.num * difference.den) value = nearest;
  }
  const result = floor ? Math.floor(value) : Math.trunc(value);
  return result === 0 ? 0 : result;
}

function roundedNumberFraction(value) {
  const [coefficient, exponent = '0'] = String(value).split('e');
  const fraction = fractionFromDecimalString(coefficient);
  const power = Number(exponent);
  return power >= 0
    ? fracMul(fraction, { num: 10n ** BigInt(power), den: 1n })
    : fracDiv(fraction, { num: 10n ** BigInt(-power), den: 1n });
}

// Chốt Rnd/Int/Intg thành literal hữu tỉ cho các bộ tính chính xác,
// giữ nguyên cây hiển thị. Đối số lồng nhau dùng cùng evaluator số thực.
function expandDiscreteFunctions(expression, ansValue, variables, angleUnit, format) {
  let output = '';
  let cursor = 0;
  const functions = /Rnd\(|Intg\(|Int\(/g;
  let match;
  while ((match = functions.exec(expression))) {
    const start = match.index;
    const begin = functions.lastIndex;
    let end = begin;
    let depth = 1;
    while (end < expression.length && depth > 0) {
      if (expression[end] === '(') depth++;
      if (expression[end] === ')') depth--;
      end++;
    }
    if (depth !== 0) throw new EngineError('Syntax ERROR');
    const argument = expression.slice(begin, end - 1) || 'Ans';
    const value = evaluateExpression(argument, ansValue, variables, angleUnit, 0, format);
    const result = match[0] === 'Rnd(' ? roundForCalculation(value, format)
      : integerPartForCalculation(value, match[0] === 'Intg(');
    output += expression.slice(cursor, start) + '(' + fractionToEvalLiteral(roundedNumberFraction(result)) + ')';
    cursor = end;
    functions.lastIndex = end;
  }
  return output + expression.slice(cursor);
}

// CASIO 2026-10-05: Ran# sinh phần nghìn 0..999; RanInt# nhận hai
// số nguyên a<b, |a|/|b| và b-a đều <10^10, lấy cả hai đầu.
// Chốt mỗi mẫu thành literal trước các evaluator chính xác để không bốc
// lại số khi tính phân số/căn/π. Cây hiển thị vẫn giữ tên hàm.
function materializeRandomExpression(expression, evaluateArgument) {
  let output = '';
  let cursor = 0;
  const names = /RanInt#|Ran#/g;
  let match;
  while ((match = names.exec(expression))) {
    const start = match.index;
    let end = names.lastIndex;
    let literal;
    if (match[0] === 'Ran#') {
      literal = fractionToEvalLiteral({ num: BigInt(Math.floor(Math.random() * 1000)), den: 1000n });
    } else {
      if (expression[end] !== '(') throw new EngineError('Syntax ERROR');
      const begin = ++end;
      let depth = 1;
      let comma = -1;
      for (; end < expression.length && depth > 0; end++) {
        const ch = expression[end];
        if (ch === '(') depth++;
        else if (ch === ')') depth--;
        else if (ch === ',' && depth === 1) {
          if (comma >= 0) throw new EngineError('Syntax ERROR');
          comma = end;
        }
      }
      if (depth !== 0 || comma < 0 || comma === begin || comma === end - 2) {
        throw new EngineError('Syntax ERROR');
      }
      const a = evaluateArgument(expression.slice(begin, comma));
      const b = evaluateArgument(expression.slice(comma + 1, end - 1));
      if (typeof a !== 'number' || typeof b !== 'number') throw new EngineError('Math ERROR');
      if (!Number.isInteger(a) || !Number.isInteger(b) || a >= b ||
          Math.abs(a) >= 1e10 || Math.abs(b) >= 1e10 || b - a >= 1e10) {
        throw new EngineError('Argument ERROR');
      }
      literal = String(a + Math.floor(Math.random() * (b - a + 1)));
    }
    output += expression.slice(cursor, start) + '(' + literal + ')';
    cursor = end;
    names.lastIndex = end;
  }
  return output + expression.slice(cursor);
}

// CASIO 2026-10-05: Rnd/Int/Intg trống bổ sung Ans khi tính, không khi nhập.
function completeAnsFunctionArguments(nodes) {
  const result = cloneNodes(nodes);
  for (const node of result) {
    for (const field of TEMPLATE_SLOT_FIELDS[node.type] || []) {
      node[field] = completeAnsFunctionArguments(node[field]);
    }
  }
  for (let i = 0; i < result.length; i++) {
    if (['Rnd(', 'Int(', 'Intg('].some(name => i + 1 >= name.length &&
        result.slice(i + 1 - name.length, i + 1).map(node => node.ch || '').join('') === name) &&
        (i + 1 === result.length || result[i + 1].ch === ')')) {
      result.splice(i + 1, 0, ...charNodes('Ans'));
      i += 3;
    }
  }
  return result;
}

// ===== Ký pháp kỹ thuật (phím ENG) và Ký hiệu kỹ thuật (SETUP mục 4) =====
// ĐÃ XÁC NHẬN 2026-08-23 trên bản giả lập chính hãng.
//
// **Phím ENG chỉ có tác dụng ở màn hình KẾT QUẢ.** Gõ dở "1234" rồi bấm ENG
// thì màn hình đứng yên, con trỏ vẫn nhấp nháy.
//
// **Lần bấm ĐẦU đưa về dạng chuẩn, các lần sau mới bước đều.** Với 1234567:
//   Off:  ENG → 1.234567×10⁶ → 1234.567×10³ → 1234567×10⁰ → 1234567000×10⁻³
//   On:   ENG → 1234.567k    → 1234567 (không ký hiệu)
// Tức lần đầu nhảy tới mức chuẩn kỹ thuật (định trị ∈ [1,1000)), rồi mỗi lần
// bấm tiếp GIẢM số mũ đi 3. SHIFT+ENG (nhãn ←) tăng lại 3.
//
// **Bật ký hiệu thì mức chuẩn TỤT ĐI MỘT NẤC.** Ba ca đều khớp:
//   1234567    mức chuẩn 10⁶ → On cho 10³ (k)
//   1234567890 mức chuẩn 10⁹ → On cho 10⁶ (M)
//   12345      mức chuẩn 10³ → On cho 10⁰ (hiện trần, không ký hiệu)
//
// **Phần định trị tối đa 10 CHỮ SỐ và bị CẮT, không làm tròn.** Ca phân biệt:
// 9999999 ở số mũ 10¹² ra "0.000009999×10¹²" — làm tròn sẽ cho "0.000010000".
// Đếm chữ số tính cả số 0 dẫn đầu: "0.000009999" là 10 chữ số.
//
// **Bật ký hiệu còn đổi luôn cách hiện kết quả THƯỜNG, chưa cần bấm ENG:**
//   - Tắt dạng chính xác: 3÷2 ra "1.5" chứ không phải phân số 3/2 (tắt ký
//     hiệu thì vẫn ra 3/2 xếp tầng — đã bấm đối chứng).
//   - Kết quả LUÔN đưa về mức chuẩn kỹ thuật: 1÷2 → "500m",
//     1÷3 → "333.3333333m", 1234569 → "1.234569M", 999k+25k → "1.024M".
//     Mức chuẩn của 1.5 vốn là 10⁰ nên nó vẫn hiện "1.5" — chính ca đó từng
//     làm ta kết luận nhầm "≥ 1 thì hiện trần" (SỬA 2026-08-24).
//
// **Chỉ báo (E)** hiện trên thanh trạng thái khi bật (manual trang 27 cũng
// ghi vậy, và đã thấy trên màn hình).
//
// Ba mép từng để nợ, ĐÃ BẤM XONG 2026-08-24:
//   - Số mũ ngoài bảng ký hiệu: vẫn ở dạng kỹ thuật, chỉ thay ký hiệu bằng
//     ×10ⁿ — 5E×10000 ra "50×10²¹" chứ không phải "5×10²²".
//   - ENG trên kết quả bằng 0 ra "0×10⁰".
//   - Cuộn lịch sử đi rồi về thì ENG mất tác dụng, giống chu trình S⇔D.
//
// 11 ký hiệu, lấy từ manual trang 41 ("Máy tính của bạn hỗ trợ 11 ký hiệu kỹ
// thuật (m, μ, n, p, f, k, M, G, T, P, E)") — đây đúng loại câu hỏi mà
// CLAUDE.md cho phép tra tài liệu: một BẢNG liệt kê, tra nhanh hơn bấm.
const ENGINEER_SYMBOLS = {
  '-15': 'f', '-12': 'p', '-9': 'n', '-6': 'μ', '-3': 'm',
  '3': 'k', '6': 'M', '9': 'G', '12': 'T', '15': 'P', '18': 'E'
};

// Số chữ số hiện được của phần định trị, đếm cả số 0 dẫn đầu.
const ENGINEER_MANTISSA_DIGITS = 10;

// ===== Ô của bảng dữ liệu mode Statistics =====
// Ô bảng HẸP hơn dòng kết quả nhiều nên máy viết tắt riêng, không dùng dạng
// Norm thường. ĐÃ XÁC NHẬN 2026-08-25 bằng bốn giá trị:
//   123456       → "123456"     (vừa đúng 6 ô)
//   12345.6      → "12345"      (cắt còn 6 ô rồi bỏ dấu chấm thừa)
//   1234567      → "1.2×10⁶"    (phần NGUYÊN 7 chữ số, không nhét được)
//   123456000000 → "1×10¹¹"     (số mũ 2 chữ số nên định trị chỉ còn 1)
// Suy ra: ô rộng 6 Ô KÝ TỰ, cụm "×10" chiếm 2 ô, mỗi chữ số mũ chiếm 1 ô,
// định trị lấy phần còn lại và bị CẮT (không làm tròn — cùng luật với phần
// định trị của phím ENG).
// Phần NGUYÊN không bao giờ được cắt: cắt nó là sai hẳn độ lớn, nên khi phần
// nguyên dài quá 6 chữ số thì chuyển sang dạng mũ.
//
// Dòng dưới cùng của bảng hiện giá trị ĐẦY ĐỦ của ô đang chọn theo dạng
// thường (ĐÃ XÁC NHẬN: ô hiện "1×10¹¹" mà dòng dưới hiện "1.23456×10¹¹"),
// nên chỗ viết tắt này chỉ dùng cho ô.
//
// CHƯA ĐỐI CHIẾU: số âm (dấu trừ có chiếm một ô không) và số mũ âm.
const STAT_CELL_CELLS = 6;

function statCellText(value, format) {
  const plain = formatNumber(value, format);
  if (!plain.includes('×10')) {
    if (plain.length <= STAT_CELL_CELLS) return plain;
    const intLength = plain.split('.')[0].length;
    if (intLength <= STAT_CELL_CELLS) {
      const cut = plain.slice(0, STAT_CELL_CELLS);
      return cut.endsWith('.') ? cut.slice(0, -1) : cut;
    }
  }
  if (value === 0 || !Number.isFinite(value)) return plain;
  const { digits, exponent } = significandParts(value);
  const power = exponent - 1;
  const superscript = toSuperscript(power);
  // "×10" chiếm 2 ô; superscript chiếm đúng số ký tự của nó (kể cả dấu ⁻).
  const room = STAT_CELL_CELLS - 2 - superscript.length;
  const sign = value < 0 ? '−' : '';
  let mantissa = digits.length > 1 ? digits[0] + '.' + digits.slice(1) : digits;
  mantissa = mantissa.slice(0, Math.max(1, room - sign.length));
  if (mantissa.endsWith('.')) mantissa = mantissa.slice(0, -1);
  return sign + mantissa + '×10' + superscript;
}

// ===== Phía NHẬP: gõ giá trị KÈM ký hiệu (500k) =====
// ĐÃ XÁC NHẬN 2026-08-24 trên bản giả lập chính hãng.
//
// **Chuỗi phím**: OPTN → `3:Engineer Symbol` → chọn trong lưới 3 cột
//   1:m  2:μ  3:n / 4:p  5:f  6:k / 7:M  8:G  9:T / A:P  B:E
// (menu OPTN của mode Calculate có đúng 3 mục: 1:Hyperbolic Func,
// 2:Angle Unit, 3:Engineer Symbol.)
//
// **Ký hiệu là HẬU TỐ bám chặt vào atom đứng ngay trước nó** — chặt hơn mọi
// thứ khác. Bốn ca phân biệt:
//   2+3k = 3002        (không phải (2+3)k = 5000 → bám số 3, không bám cả tổng)
//   1÷2k = 1/2000      (không phải 1÷2×1000 = 500 → chặt hơn dấu ÷; và để ý
//                       máy vẫn ra PHÂN SỐ, tức gõ ký hiệu KHÔNG tắt dạng
//                       chính xác — khác hẳn việc BẬT thiết lập Engineer Symbol)
//   2k² = 4000000      (= (2k)², không phải 2×(k²) → chặt hơn cả hậu tố x²)
//   (2+3)k = 5000      (đứng sau ")" thì bám cả cụm ngoặc)
//
// **Hai ký hiệu liền nhau thì nhân với nhau**: 5km = 5 (10³ × 10⁻³).
// **Sau ký hiệu KHÔNG được gõ tiếp chữ số**: 5k3 → Syntax ERROR. Nhưng nhân
// ẩn vẫn chạy: 5kπ = 5000π (giữ nguyên dạng π).
// **Ký hiệu đứng một mình** (chưa có giá trị): k → Syntax ERROR.
// 5P = 5×10¹⁵.

// Bảng ngược ký hiệu → số mũ, dùng cho phía nhập.
const ENGINEER_SYMBOL_EXPONENTS = {};
Object.keys(ENGINEER_SYMBOLS).forEach((exponent) => {
  ENGINEER_SYMBOL_EXPONENTS[ENGINEER_SYMBOLS[exponent]] = Number(exponent);
});

// Thứ tự và phím tắt của bảng chọn, đúng như lưới máy hiện (ui.js đọc).
const ENGINEER_SYMBOL_MENU = [
  { key: '1', symbol: 'm' }, { key: '2', symbol: 'μ' }, { key: '3', symbol: 'n' },
  { key: '4', symbol: 'p' }, { key: '5', symbol: 'f' }, { key: '6', symbol: 'k' },
  { key: '7', symbol: 'M' }, { key: '8', symbol: 'G' }, { key: '9', symbol: 'T' },
  { key: 'A', symbol: 'P' }, { key: 'B', symbol: 'E' }
];

// Ký tự vô hình đặt NGAY TRƯỚC ký hiệu trong chuỗi đem đi tính. Cần vì hai
// ký hiệu "M" và "E" trùng mặt chữ với hai biến nhớ M và E: nếu để trần thì
// "5M" (5 mega) và "5M" (5 nhân biến M) không phân biệt được. Chuỗi này chỉ
// tồn tại giữa serializeForEval() và tokenize(), không bao giờ lên màn hình.
const ENGSYM_MARK = '\u2063';

// Mốc vô hình cho node hậu tố đơn vị góc. Ký tự kế tiếp là d/r/g; node
// được serialize thành một lời gọi hàm nội bộ để hậu tố luôn ôm trọn giá
// trị đứng trước (đặc biệt là phân số π/2), không bị parser gắn nhầm vào
// riêng mẫu số.
const ANGLE_UNIT_MARK = '\u2065';
const ANGLE_UNIT_CODES = { d: 'deg', r: 'rad', g: 'grad' };
const ANGLE_UNIT_KEYS = { deg: 'd', rad: 'r', grad: 'g' };
const ANGLE_UNIT_SYMBOLS = { deg: '°', rad: 'r', grad: 'g' };

// Ký tự mốc bao QUANH tên một biến thống kê trong chuỗi đem đi tính. Cần vì
// tên biến trùng mặt chữ với biến nhớ và với hàm: "Med" chứa "M", "min(x)"
// chứa "n" và "x". Bao hai đầu (khác ENGSYM_MARK chỉ cần một đầu) vì tên biến
// dài ngắn khác nhau. Chuỗi này chỉ tồn tại giữa serializeForEval() và
// tokenize(), không bao giờ lên màn hình.
const STAT_MARK = '\u2064';
// P/C trùng chữ biến C và ký hiệu kĩ thuật P: mốc này chỉ đi vào tokenizer.
const COMBINATORIC_MARK = '\uE000';

// Hệ số nhân 10^n dưới dạng phân số chính xác, cho ba bộ tính song song.
function engineerFactorFraction(exponent) {
  const power = 10n ** BigInt(Math.abs(exponent));
  return exponent >= 0 ? { num: power, den: 1n } : { num: 1n, den: power };
}

// Tách một số thành chuỗi chữ số có nghĩa S và số mũ E sao cho
// giá trị = 0.S × 10^E. Đã cắt số 0 thừa ở đuôi.
function significandParts(value) {
  const abs = Math.abs(value);
  const scientific = abs.toExponential(9); // 10 chữ số có nghĩa, như mọi chỗ khác
  const [mantissa, exponentText] = scientific.split('e');
  const digits = mantissa.replace('.', '').replace(/0+$/, '') || '0';
  return { digits, exponent: Number(exponentText) + 1 };
}

// Mức số mũ chuẩn của ký pháp kỹ thuật: bội của 3 lớn nhất sao cho phần định
// trị vẫn ≥ 1, tức định trị nằm trong [1, 1000).
function canonicalEngineerExponent(value) {
  if (value === 0 || !Number.isFinite(value)) return 0;
  const { exponent } = significandParts(value);
  return Math.floor((exponent - 1) / 3) * 3;
}

// Phần định trị khi hiện giá trị ở một số mũ cho trước. Dịch dấu phẩy trên
// CHUỖI chứ không chia số thực, nên không sinh sai số kiểu 0.1+0.2.
function engineerMantissaText(value, exponent) {
  if (value === 0) return '0';
  const sign = value < 0 ? '−' : '';
  const { digits, exponent: valueExponent } = significandParts(value);
  // Số chữ số đứng TRƯỚC dấu phẩy của phần định trị.
  const whole = valueExponent - exponent;
  let text;
  if (whole <= 0) {
    text = '0.' + '0'.repeat(-whole) + digits;
  } else if (whole >= digits.length) {
    text = digits + '0'.repeat(whole - digits.length);
  } else {
    text = digits.slice(0, whole) + '.' + digits.slice(whole);
  }
  // Cắt còn tối đa 10 chữ số — CẮT chứ không làm tròn.
  let seen = 0;
  let cut = '';
  for (const ch of text) {
    if (ch >= '0' && ch <= '9') {
      if (seen === ENGINEER_MANTISSA_DIGITS) break;
      seen++;
    }
    cut += ch;
  }
  if (cut.endsWith('.')) cut = cut.slice(0, -1);
  return sign + cut;
}

// Chuỗi đầy đủ hiện trên màn hình.
function engineerText(value, exponent, useSymbol) {
  const mantissa = engineerMantissaText(value, exponent);
  if (!useSymbol) return mantissa + '×10' + toSuperscript(exponent);
  if (exponent === 0) return mantissa;
  const symbol = ENGINEER_SYMBOLS[String(exponent)];
  // Ngoài bảng ký hiệu thì viết ×10ⁿ nhưng VẪN giữ số mũ bội của 3 — ĐÃ XÁC
  // NHẬN 2026-08-24 bằng ca 5E×10000 = 50×10²¹.
  return symbol ? mantissa + symbol : mantissa + '×10' + toSuperscript(exponent);
}

class EngineError extends Error {}

// ===== Phân số chính xác (BigInt) — dùng cho kết quả dạng "1/4" thay vì
// "0.25" (phím S⇔D, Tầng 5). Đây là một bộ tính SONG SONG với bộ thập phân
// bên dưới, không thay thế nó — xem chú thích ở evaluateExpressionExact.
const ZERO_FRACTION = { num: 0n, den: 1n };

function bigAbs(n) {
  return n < 0n ? -n : n;
}

function bigGcd(a, b) {
  a = bigAbs(a);
  b = bigAbs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a === 0n ? 1n : a;
}

// Rút gọn, luôn giữ mẫu số dương (dấu nằm ở tử số).
function fracReduce(f) {
  let { num, den } = f;
  if (den < 0n) { num = -num; den = -den; }
  if (num === 0n) return { num: 0n, den: 1n };
  const g = bigGcd(num, den);
  return { num: num / g, den: den / g };
}

function fracIsZero(f) {
  return f.num === 0n;
}

function fracAdd(a, b) {
  return fracReduce({ num: a.num * b.den + b.num * a.den, den: a.den * b.den });
}

function fracSub(a, b) {
  return fracReduce({ num: a.num * b.den - b.num * a.den, den: a.den * b.den });
}

function fracMul(a, b) {
  return fracReduce({ num: a.num * b.num, den: a.den * b.den });
}

function fracDiv(a, b) {
  if (b.num === 0n) throw new EngineError('Math ERROR');
  return fracReduce({ num: a.num * b.den, den: a.den * b.num });
}

function fracNeg(a) {
  return { num: -a.num, den: a.den };
}

// Số mũ nguyên (có thể âm). Giới hạn độ lớn để tránh BigInt phình quá to —
// biểu thức lớp phổ thông không cần vượt mức này, vượt thì bail về thập
// phân (bộ thập phân đã tính đúng bằng Math.pow rồi, không mất gì).
function fracPowInt(base, exponent, maxDigits = 60) {
  if (Math.abs(exponent) > 1000) throw new EngineError('Math ERROR');
  let result = { num: 1n, den: 1n };
  let b = exponent < 0 ? fracDiv({ num: 1n, den: 1n }, base) : base;
  const limit = 10n ** BigInt(maxDigits);
  for (let i = 0; i < Math.abs(exponent); i++) {
    result = fracMul(result, b);
    if (bigAbs(result.num) > limit || result.den > limit) {
      throw new EngineError('Math ERROR');
    }
  }
  return result;
}

// Căn bậc hai/ba NGUYÊN ĐÚNG của một BigInt không âm — trả null nếu n không
// phải số chính phương/lập phương (không làm tròn, không xấp xỉ).
function bigIntIsqrt(n) {
  if (n < 0n) return null;
  if (n < 2n) return n;
  let x = n, y = (x + 1n) / 2n;
  while (y < x) { x = y; y = (x + n / x) / 2n; }
  return x * x === n ? x : null;
}

function bigIntIcbrt(n) {
  const neg = n < 0n;
  const a = bigAbs(n);
  if (a < 2n) return n;
  let x = a, y = (2n * x + a / (x * x)) / 3n;
  while (y < x) { x = y; y = (2n * x + a / (x * x)) / 3n; }
  const root = x * x * x === a ? x : null;
  if (root === null) return null;
  return neg ? -root : root;
}

function bigIntExactRoot(n, degree) {
  if (degree < 1n || (n < 0n && degree % 2n === 0n)) return null;
  const negative = n < 0n, value = bigAbs(n);
  if (value < 2n || degree === 1n) return n;
  const bits = value.toString(2).length;
  if (degree > BigInt(bits) || degree > 1000n) return null;
  let low = 1n, high = 1n << BigInt(Math.ceil(bits / Number(degree)));
  while (low <= high) {
    const middle = (low + high) >> 1n;
    const power = middle ** degree;
    if (power === value) return negative ? -middle : middle;
    if (power < value) low = middle + 1n;
    else high = middle - 1n;
  }
  return null;
}

function fracToNumber(f) {
  return Number(f.num) / Number(f.den);
}

// So sánh gần đúng với giá trị thập phân đã tính — chốt chặn an toàn trước
// khi chấp nhận một phân số để hiển thị/lan truyền (CLAUDE.md: không so
// sánh bằng trực tiếp giữa hai số thực).
function fracRoughlyEqualsFloat(f, value) {
  const asFloat = fracToNumber(f);
  if (!Number.isFinite(asFloat)) return false;
  if (value === 0) return asFloat === 0;
  return Math.abs(asFloat - value) <= Math.abs(value) * 1e-9;
}

// CASIO 2026-10-07: gọi x/Ans có thể hiện 98/99 hoặc 1/3 dù
// kho số còn giữ thập phân. Chỉ tìm dạng hiển thị, không dùng làm bộ nhớ
// chính xác. Dùng phần dư p−q*x theo bậc độ lớn của p, giữ 14 chữ số;
// các ca 98/99 và 1/3 sát biên đã đối chiếu. Vẫn giới hạn 10 chữ số.
function approximateDisplayFraction(value) {
  if (!Number.isFinite(value) || value === 0) return null;
  const source = roundedNumberFraction(Math.abs(value));
  let numerator = source.num, denominator = source.den;
  let previousNum = 0n, currentNum = 1n, previousDen = 1n, currentDen = 0n;
  while (denominator !== 0n) {
    const quotient = numerator / denominator;
    const nextNum = quotient * currentNum + previousNum;
    const nextDen = quotient * currentDen + previousDen;
    const candidate = { num: nextNum, den: nextDen };
    if (fracDigitCount(candidate) > 10) return null;
    const residual = bigAbs(nextDen * source.num - nextNum * source.den);
    const scale = 10n ** BigInt(14 - nextNum.toString().length);
    if (residual * scale <= source.den) {
      if (nextDen === 1n) return null;
      return { num: value < 0 ? -nextNum : nextNum, den: nextDen };
    }
    [numerator, denominator] = [denominator, numerator % denominator];
    [previousNum, currentNum] = [currentNum, nextNum];
    [previousDen, currentDen] = [currentDen, nextDen];
  }
  return null;
}

// Tổng chữ số của tử+mẫu (không tính dấu) — giới hạn 10 chữ số.
// ĐÃ ĐỐI CHIẾU 2026-08-20, dạng d/c cũng theo ngưỡng 10: `12345/67890`
// (10 chữ số) ra phân số 823/4526, còn `123456/67890` (11 chữ số) rơi về
// thập phân 1.818471056.
// Ngưỡng này áp cho CẢ HAI phía: kết quả đã rút gọn (hàm ngay dưới) và phân
// số NGƯỜI DÙNG GÕ VÀO (typedFractionTooLong). Phải có cả hai vì ca
// `123456/67890` rút gọn lại còn 20576/11315 — đúng 10 chữ số, lọt qua vòng
// kiểm kết quả — mà máy vẫn trả thập phân. Chính ca đó chứng minh máy đếm
// theo biểu thức NHẬP chứ không theo kết quả.
function fracDigitCount(f) {
  return bigAbs(f.num).toString().length + f.den.toString().length;
}

// PLUS counts the mixed form, including separators, even in d/c output.
// 1+1/123456 fits ten cells; 12501/5000 needs eleven as 2 2501/5000.
function fractionFitsDisplay880(value) {
  const fraction = fracReduce(value);
  const numerator = bigAbs(fraction.num), denominator = fraction.den;
  if (denominator === 1n) return true;
  const integer = numerator / denominator;
  const budget = integer === 0n ? numerator.toString().length + denominator.toString().length + 1
    : integer.toString().length + (numerator % denominator).toString().length + denominator.toString().length + 2;
  return budget <= 10;
}

// Có node phân số nào NGƯỜI DÙNG GÕ vượt quá 10 chữ số (tử + mẫu) không.
// ĐÃ XÁC NHẬN 2026-08-20: `12345/67890` (10 chữ số) ra phân số 823/4526,
// `123456/67890` (11 chữ số) ra thập phân 1.818471056.
// Tiêu chí toán học06/11: biểu thức dùng ký hiệu phân số giữ số hữu tỉ
// chính xác tới cuối, ở cả MathI và LineI, gồm cả giá trị Ans/STO.
function hasExplicitFraction(nodes) {
  return nodes.some(node => node.type==='frac' || node.type==='mixed' ||
    (node.type==='char' && node.ch==='┘') ||
    (TEMPLATE_SLOT_FIELDS[node.type] || []).some(field => hasExplicitFraction(node[field])));
}

function typedFractionTooLong(nodes) {
  for (const node of nodes) {
    const fields = TEMPLATE_SLOT_FIELDS[node.type];
    if (!fields) continue;
    if (node.type === 'frac' || node.type === 'mixed') {
      let digits = 0;
      for (const field of fields) {
        for (const inner of node[field]) {
          if (inner.type === 'char' && /[0-9]/.test(inner.ch)) digits++;
        }
      }
      if (digits > 10) return true;
    }
    for (const field of fields) {
      if (typedFractionTooLong(node[field])) return true;
    }
  }
  return false;
}

// Giới hạn số chữ số dò chu kỳ thập phân tuần hoàn — quá dài thì bỏ, không
// cố hiện.
// ĐÃ ĐỐI CHIẾU 2026-08-20: máy hiện được chu kỳ dài hơn nhiều so với 30.
// Trên bản giả lập: chu kỳ 16 (1/17), 44 (1/89), 60 (1/61), 75 (1/151),
// 81 (1/163) đều hiện tuần hoàn; chu kỳ 95 (1/191) và 96 (1/97) thì ra thập
// phân thường. Trên MÁY VẬT LÝ (đội BITEX bấm 2026-08-20): chu kỳ 82 (1/913),
// 84 (1/203), 88 (1/617), 90 (1/589), 92 (1/1289) đều hiện tuần hoàn.
// Luật theo ĐỘ DÀI CHU KỲ chứ không theo mẫu số — 1/101 mẫu lớn mà chu kỳ 4
// vẫn hiện tuần hoàn.
// Ngưỡng thật vì thế là 92, 93 hoặc 94. Không thu hẹp nốt hai giá trị cuối:
// phải dùng mẫu số bốn chữ số mới chạm tới, không bao giờ gặp trong chương
// trình phổ thông.
// Lấy 92 — giá trị lớn nhất đã CHỨNG MINH máy làm được (1/1289, bấm trên máy
// vật lý). Không lấy 93 hay 94 vì đó là đoán; lấy 92 thì ta hiện tuần hoàn
// đúng ở mọi chỗ đã chứng minh máy hiện, và chỉ có thể thiếu chứ không thừa.
const RECURRING_DIGIT_CAP = 92;

// Dựng chuỗi thập phân tuần hoàn kiểu máy thật (vd 1/3 → "0.(3)", 1/6 →
// "0.1(6)", 1/7 → "0.(142857)") — đã xác nhận đúng cách trình bày qua ảnh
// chụp máy thật (2026-08-13). Trả về null khi phân số kết thúc hữu hạn
// (không có gì để hiện tuần hoàn) hoặc chu kỳ quá dài (vượt CAP) — cả hai
// trường hợp, S⇔D chỉ còn hai trạng thái (phân số ⇄ thập phân thường).
function fracRecurringDecimalString(f) {
  const negative = f.num < 0n;
  const num = bigAbs(f.num);
  const den = f.den;
  const intPart = num / den;
  let remainder = num % den;
  if (remainder === 0n) return null;

  const seenAt = new Map();
  const digits = [];
  while (remainder !== 0n && !seenAt.has(remainder) && digits.length < RECURRING_DIGIT_CAP) {
    seenAt.set(remainder, digits.length);
    remainder *= 10n;
    digits.push((remainder / den).toString());
    remainder = remainder % den;
  }
  if (remainder === 0n) return null; // hữu hạn, không tuần hoàn
  const cycleStart = seenAt.get(remainder);
  if (cycleStart === undefined) return null; // vượt CAP mà chưa thấy lặp

  const prefix = digits.slice(0, cycleStart).join('');
  const cycle = digits.slice(cycleStart).join('');
  // Dấu bao chu kỳ là hai ngoặc nhọn nhỏ ‹ ›, KHÔNG phải ngoặc tròn — ĐÃ XÁC
  // NHẬN 2026-08-17 trên bản giả lập chính hãng: 1÷3 rồi S⇔D hiện 0.‹3›, 1÷7
  // hiện 0.‹142857›. Bản trước dùng "(...)" vì đọc theo phần CHỮ của manual
  // tiếng Việt ("0,(142857)") — đó là cách viết trong văn bản, không phải ký
  // hiệu trên màn hình.
  return (negative ? '−' : '') + intPart.toString() + '.' + prefix + '‹' + cycle + '›';
}

// CASIO 2026-10-20: prefix thập phân + chu kỳ ‹digits› là một số duy nhất.
// Dùng hiệu hai số nguyên để giữ chính xác cả phần hữu hạn (1.2‹34›=611/495).
function recurringInputFraction(prefix, digits) {
  if (!/^\d*\.\d*$/.test(prefix) || !/^\d+$/.test(digits)) throw new EngineError('Syntax ERROR');
  const finite = prefix.replace('.', '') || '0';
  const places = prefix.length - prefix.indexOf('.') - 1;
  return fracReduce({
    num: BigInt(finite + digits) - BigInt(finite),
    den: (10n ** BigInt(places)) * (10n ** BigInt(digits.length) - 1n)
  });
}

// Dựng Fraction chính xác từ chuỗi số đã gõ (token.raw), không qua float —
// "0.25" → 25/100 → rút gọn 1/4.
function fractionFromDecimalString(raw) {
  const dotIndex = raw.indexOf('.');
  if (dotIndex === -1) {
    return fracReduce({ num: BigInt(raw), den: 1n });
  }
  const intPart = raw.slice(0, dotIndex);
  const fracPart = raw.slice(dotIndex + 1);
  return fracReduce({ num: BigInt(intPart + fracPart), den: 10n ** BigInt(fracPart.length) });
}

const VARIABLE_NAMES = ['A', 'B', 'C', 'D', 'E', 'F', 'M', 'x', 'y', 'z'];

// x là biến nhớ và cũng là biến chạy cục bộ của các mẫu Calculus.
// reduceCalcNodes luôn truyền bảng biến mới cho biến chạy, giữ bộ nhớ x.
const CALC_BOUND_VARIABLE = 'x';

// Sắp theo độ dài giảm dần: "sin⁻¹" phải khớp trước "sin" một mình.
const FUNCTION_KEYWORDS = [
  ['sinh⁻¹', 'ASINH'], ['cosh⁻¹', 'ACOSH'], ['tanh⁻¹', 'ATANH'],
  ['sin⁻¹', 'ASIN'], ['cos⁻¹', 'ACOS'], ['tan⁻¹', 'ATAN'],
  ['sinh', 'SINH'], ['cosh', 'COSH'], ['tanh', 'TANH'],
  ['sin', 'SIN'], ['cos', 'COS'], ['tan', 'TAN'],
  ['logbase', 'LOGBASE'], ['log', 'LOG'], ['ln', 'LN'], ['e^', 'EXP'], ['Abs', 'ABS'],
  ['GCD', 'GCD'], ['LCM', 'LCM'], ['Rnd', 'ROUND'],
  ['Intg', 'INTG'], ['Int', 'INT'], ['Pol', 'POL'], ['Rec', 'REC'],
  // Hàm phân phối chuẩn của menu Norm Dist (mode Statistics một biến) — mở
  // ngoặc như sin/log. Ký tự đơn P/Q/R không trùng biến nào (A-F, x, y, z, M).
  ['P', 'NORMP'], ['Q', 'NORMQ'], ['R', 'NORMR']
];

// Các cụm mở hàm mà DEL gỡ NGUYÊN CỤM trong một lần, giống 10^/e^ — ĐÃ XÁC
// NHẬN 2026-08-20: bấm sin rồi DEL thì màn hình trống hẳn, không còn "sin".
// Chúng nằm trong cây node dưới dạng từng ký tự rời (khác 10^/e^ vốn là một
// node mẫu), nên phải nhận diện bằng cách so chuỗi ký tự ngay trước con trỏ.
// Xếp DÀI TRƯỚC để "sin⁻¹(" không bị "sin(" cắt nhầm.
// Cụm chữ mà DEL gỡ NGUYÊN CỤM một lần (thay vì từng ký tự). Gồm hàm mở ngoặc
// và — cho mode Base-N — các keyword logic infix and/or/xor/xnor và hàm
// Neg(/Not(. ĐÃ XÁC NHẬN 2026-08-31 trên bản giả lập: "5and" + DEL → "5";
// "Neg(" + DEL → rỗng. (Các keyword này chỉ nhập được ở Base-N nên không đụng
// hành vi DEL của mode Calculate — ở đó chữ thường không có phím nào tạo ra.)
const FUNCTION_OPEN_TEXTS = [
  'd/dx(', '∫(', 'Σ(', 'Π(', // PLUS LineI calculus uses ordinary comma-separated input.
  '√(', // LineI: phím căn nhập nguyên cụm ký tự, không phải mẫu hai chiều.
  'sinh⁻¹(', 'cosh⁻¹(', 'tanh⁻¹(', 'sinh(', 'cosh(', 'tanh(',
  'sin⁻¹(', 'cos⁻¹(', 'tan⁻¹(', 'sin(', 'cos(', 'tan(', 'log(', 'ln(',
  'P(', 'Q(', 'R(', 'GCD(', 'LCM(',
  'Conjg(', 'Arg(', 'Abs(', 'ReP(', 'ImP(',
  'Identity(', 'Angle(', 'UnitV(', 'Det(', 'Trn(',
  'Pol(', 'Rec(', 'Neg(', 'Not(', 'Rnd(', 'Intg(', 'Int(', 'Ran#', 'RanInt#(', 'PreAns', 'xnor', 'xor', 'and', 'or'
].sort((a, b) => b.length - a.length);

// Quy đổi độ⇄radian cho lượng giác. Mặc định Deg: ĐÃ XÁC NHẬN 2026-08-20 —
// xem chú thích ở chỗ khai báo angleUnit (RESET "Initialize All" rồi đọc lại).
function toRadians(x, angleUnit) {
  if (angleUnit === 'deg') return (x * Math.PI) / 180;
  if (angleUnit === 'grad') return (x * Math.PI) / 200;
  return x;
}

// fx-580VN X manual, Function Calculation Input Ranges (also used by Rec).
function checkTrigAngleRange(value, unit) {
  const limit = unit === 'rad' ? 157079632.7 : unit === 'grad' ? 1e10 : 9e9;
  if (Math.abs(value) >= limit) throw new EngineError('Math ERROR');
}

function fromRadians(x, angleUnit) {
  if (angleUnit === 'deg') return (x * 180) / Math.PI;
  if (angleUnit === 'grad') return (x * 200) / Math.PI;
  return x;
}

function convertAngleValue(value, fromUnit, toUnit) {
  return fromRadians(toRadians(value, fromUnit), toUnit);
}

// CASIO 2026-10-12: sin/tan của góc nhỏ vẫn khác zero ở cả ba đơn vị.
// Chỉ khử nhiễu zero tại góc phần tư chính xác; không dùng ngưỡng theo
// độ lớn kết quả vì nó làm mất giá trị thật trong Calculate/CALC/SOLVE.
function normalizeTrigValue(value, argument, angleUnit, func) {
  const quarterTurn = angleUnit === 'deg' ? 90 : angleUnit === 'grad' ? 100 : Math.PI / 2;
  const quarter = argument / quarterTurn;
  if (Number.isInteger(quarter) && ((func === 'cos' && Math.abs(quarter % 2) === 1) ||
      (func !== 'cos' && quarter % 2 === 0))) return 0;
  if (Math.abs(value - 1) < 1e-15) return 1;
  if (Math.abs(value + 1) < 1e-15) return -1;
  // CASIO 2026-10-13: cos ở x lưu sau SOLVE Radian trả đúng 1/2;
  // cos(x)-1/2 là 0, thêm -10^-49 vẫn giữ chính số hạng đó. Chỉ chốt
  // giá trị hữu tỉ không nguyên của góc đặc biệt theo mô hình precision
  // hẹp; góc nhập sát mép còn pending, không coi kernel cos đã hoàn tất;
  // không chốt zero hoặc ±1 bằng ngưỡng rộng hơn quy tắc hiện có.
  if (func === 'cos') {
    const exact = lookupSpecialAngleDeg(func, fromRadians(toRadians(argument, angleUnit), 'deg'));
    if (exact && exact.radicand === 1n && exact.rational.den > 1n) {
      const candidate = surdToNumber(exact);
      if (Math.abs(value - candidate) <= Math.abs(value) * 1e-14) return candidate;
    }
  }
  return value;
}

// Hệ số hữu tỉ cho những phép đổi không cần π. null nghĩa là phải để bộ
// PiValue xử lý (Degree/Grad ↔ Radian).
function angleRationalScale(fromUnit, toUnit) {
  if (fromUnit === toUnit) return { num: 1n, den: 1n };
  if (fromUnit === 'deg' && toUnit === 'grad') return { num: 10n, den: 9n };
  if (fromUnit === 'grad' && toUnit === 'deg') return { num: 9n, den: 10n };
  return null;
}

// Dạng độ-phút-giây dùng ba ký hiệu hiển thị làm một literal. Đổi literal
// sang biểu thức số trước tokenizer để cả bốn bộ tính (float, Fraction,
// Surd, π) cùng hiểu một nghĩa, tránh một nhánh số học DMS riêng bị lệch.
// Giây được phép bỏ trống: CASIO chính thức 2026-09-30 xác nhận `2°30′ =`
// tự hoàn thiện thành `2°30′0″`.
function expandDmsLiterals(expr, allowDegrees = false) {
  const number = '(?:\\d+(?:\\.\\d*)?|\\.\\d+|Ans|[ABCDEFxyz])';
  const minutes = '(' + number + ')′(?:(' + number + ')″)?';
  const pattern = new RegExp('(' + number + ')°' + (allowDegrees ? '(?:'+minutes+')?' : minutes), 'g');
  return expr.replace(pattern, (_match, degrees, minutes, seconds) =>
    '((' + degrees + ')+(' + (minutes ?? '0') + ')÷60+(' + (seconds ?? '0') + ')÷3600)');
}

// CASIO ClassPad 2026-10-09: editor giữ cả chữ số thứ 16, nhưng
// literal đưa vào phép tính chỉ dùng 15 chữ số có nghĩa, cắt về phía zero.
function calculationNumberLiteral(text) {
  const point = text.includes('.') ? text.indexOf('.') : text.length;
  let significant = 0;
  return [...text].map((ch, index) => {
    if (ch === '.' || (significant === 0 && ch === '0')) return ch;
    significant++;
    return significant <= 15 ? ch : index < point ? '0' : '';
  }).join('');
}

const REGISTERED_FUNCTION_880 = Symbol('registeredFunction');

// Tách chuỗi biểu thức thô thành danh sách token.
function tokenize(expr) {
  expr = expandDmsLiterals(expr);
  const tokens = [];
  let i = 0;

  while (i < expr.length) {
    const ch = expr[i];
    if(expr.startsWith('÷R',i)){tokens.push({type:'REMDIV',start:i});i+=2;continue;}
    if ((ch === 'f' || ch === 'g') && expr[i + 1] === '(') {
      tokens.push({type:'USER_FUNCTION', name:ch, start:i});
      i++;
      continue;
    }

    if (/[0-9.]/.test(ch)) {
      let j = i;
      while (j < expr.length && /[0-9.]/.test(expr[j])) j++;
      const numStr = expr.slice(i, j);
      if (!/^\d*\.?\d*$/.test(numStr)) {
        throw new EngineError('Syntax ERROR');
      }
      const calculationLiteral = calculationNumberLiteral(numStr);
      const value = parseFloat(calculationLiteral);
      if (Number.isNaN(value)) {
        throw new EngineError('Syntax ERROR');
      }
      // raw/value giữ literal15 chữ số cho mô hình CASIO/SOLVE cũ.
      // sourceRaw giữ đủ chữ số cho đường hữu tỉ toán học06/11;
      // không ép literal qua float trước khi dựng Fraction.
      tokens.push({ type: 'NUMBER', value, raw: calculationLiteral, sourceRaw: numStr });
      i = j;
      continue;
    }

    if(ch===UNIT_CONVERSION_MARK) { const token=readUnitConversionToken(expr,i);tokens.push(token);i=token.end;continue; }

    // Biến/hàm thống kê (x̄, Σx, Med, x̂, ŷ...): nằm giữa hai ký tự mốc vô hình.
    // x̂/ŷ là HÀM HẬU TỐ ăn số đứng trước; còn lại là biến hằng.
    if (ch === STAT_MARK) {
      const end = expr.indexOf(STAT_MARK, i + 1);
      const token = end < 0 ? null : expr.slice(i + 1, end);
      if (token !== null && STAT_FUNC_TOKENS[token] !== undefined) {
        tokens.push({ type: 'STATFUNC', func: STAT_FUNC_TOKENS[token] });
        i = end + 1;
        continue;
      }
      const field = token === null ? undefined : STAT_TOKEN_FIELDS[token];
      if (field === undefined) {
        throw new EngineError('Syntax ERROR');
      }
      tokens.push({ type: 'STATVAR', field });
      i = end + 1;
      continue;
    }

    if (ch === COMBINATORIC_MARK) {
      const operation = expr[i + 1];
      if (operation !== 'P' && operation !== 'C') throw new EngineError('Syntax ERROR');
      tokens.push({ type: operation === 'P' ? 'PERM' : 'COMB' });
      i += 2;
      continue;
    }

    // Ký hiệu kỹ thuật: luôn đi kèm ký tự mốc vô hình ngay trước (xem chú
    // thích ở chỗ khai báo ENGSYM_MARK).
    if (ch === ENGSYM_MARK) {
      const exponent = ENGINEER_SYMBOL_EXPONENTS[expr[i + 1]];
      if (exponent === undefined) {
        throw new EngineError('Syntax ERROR');
      }
      tokens.push({ type: 'ENGSYM', exponent });
      i += 2;
      continue;
    }

    if (ch === ANGLE_UNIT_MARK) {
      const unit = ANGLE_UNIT_CODES[expr[i + 1]];
      if (!unit) throw new EngineError('Syntax ERROR');
      tokens.push({ type: 'ANGLEUNIT', unit });
      i += 2;
      continue;
    }

    if (expr.slice(i, i + 6) === 'PreAns') {
      tokens.push({ type: 'PREANS' });
      i += 6;
      continue;
    }

    if (expr.slice(i, i + 3) === 'Ans') {
      tokens.push({ type: 'ANS', start:i });
      i += 3;
      continue;
    }

    // Hàm lượng giác/log — khớp "sin⁻¹" (5 ký tự) TRƯỚC "sin" (3 ký tự) để
    // không lẫn với hậu tố "⁻¹" (nghịch đảo) đứng sau một số bình thường.
    let matchedKeyword = false;
    for (const [keyword, type] of FUNCTION_KEYWORDS) {
      if (expr.slice(i, i + keyword.length) === keyword) {
        tokens.push({ type, start:i });
        i += keyword.length;
        matchedKeyword = true;
        break;
      }
    }
    if (matchedKeyword) continue;

    if (expr.slice(i, i + 2) === '⁻¹') { tokens.push({ type: 'RECIPROCAL' }); i += 2; continue; }

    if (VARIABLE_NAMES.includes(ch) || ch === CALC_BOUND_VARIABLE) {
      tokens.push({ type: 'VARIABLE', name: ch, start:i });
      i++;
      continue;
    }

    if (ch === ',') { tokens.push({ type: 'COMMA' }); i++; continue; }
    if (ch === '+') { tokens.push({ type: 'PLUS', start:i }); i++; continue; }
    if (ch === '-') { tokens.push({ type: 'MINUS', start:i }); i++; continue; }
    if (ch === '×') { tokens.push({ type: 'MUL', start:i }); i++; continue; }
    if (ch === '÷') { tokens.push({ type: 'DIV', start:i }); i++; continue; }
    if (ch === '┘') { tokens.push({ type: 'LINEFRAC' }); i++; continue; }
    if (ch === '(') { tokens.push({ type: 'LPAREN' }); i++; continue; }
    if (ch === ')') { tokens.push({ type: 'RPAREN' }); i++; continue; }
    if (ch === '√') { tokens.push({ type: 'SQRT' }); i++; continue; }
    if (ch === '∛') { tokens.push({ type: 'CBRT' }); i++; continue; }
    if (ch === '²') { tokens.push({ type: 'SQUARE' }); i++; continue; }
    if (ch === '³') { tokens.push({ type: 'CUBE' }); i++; continue; }
    if (ch === '!') { tokens.push({ type: 'FACTORIAL', start:i }); i++; continue; }
    if (ch === '%') { tokens.push({ type: 'PERCENT' }); i++; continue; }
    if (ch === '^') { tokens.push({ type: 'CARET' }); i++; continue; }
    if (ch === 'π') { tokens.push({ type: 'PI' }); i++; continue; }

    throw new EngineError('Syntax ERROR');
  }

  return tokens;
}


// Đếm số dấu ")" còn thiếu — máy thật tự thêm đủ khi bấm "=".
function countUnclosedParens(expr) {
  let openCount = 0;
  for (const ch of expr) {
    if (ch === '(') openCount++;
    else if (ch === ')') openCount = Math.max(0, openCount - 1);
  }
  return openCount;
}

// Tự động thêm đủ dấu ")" còn thiếu vào cuối, đúng hành vi máy thật khi bấm "=".
function autoCloseParens(expr) {
  return expr + ')'.repeat(countUnclosedParens(expr));
}

// CASIO 2026-10-03: nPr/nCr chỉ nhận số nguyên 0≤r≤n; kết quả vượt
// phạm vi số thực của máy báo Math ERROR. Dùng BigInt ở bộ exact để giữ
// phân số/π khi phép tổ hợp là một hạng trong biểu thức.
const COMBINATORIC_LIMIT = 9999999999n * (10n ** 90n);
function combinatoricBigInt(n, r, kind) {
  if (n < 0n || r < 0n || r > n) throw new EngineError('Math ERROR');
  const count = kind === 'C' && n - r < r ? n - r : r;
  let value = 1n;
  for (let i = 1n; i <= count; i++) {
    value = kind === 'P' ? value * (n - i + 1n)
      : value * (n - count + i) / i;
    if (value > COMBINATORIC_LIMIT) throw new EngineError('Math ERROR');
  }
  return value;
}
function combinatoricNumber(n, r, kind, plusModel = false) {
  if (!Number.isInteger(n) || !Number.isInteger(r) || n < 0 || r < 0 || r > n ||
      plusModel && n >= 1e10) {
    throw new EngineError('Math ERROR');
  }
  const count = kind === 'C' ? Math.min(r, n - r) : r;
  let value = 1;
  let fallingProduct = 1;
  for (let i = 1; i <= count; i++) {
    if (plusModel) {
      fallingProduct *= n - i + 1;
      if (!Number.isFinite(fallingProduct) || fallingProduct >= 1e100) throw new EngineError('Math ERROR');
    }
    value = kind === 'P' ? value * (n - i + 1)
      : value * (n - count + i) / i;
    if (!Number.isFinite(value) || (plusModel ? value >= 1e100 : value > 9.999999999e99)) {
      throw new EngineError('Math ERROR');
    }
  }
  return value;
}

// GCD nhận cả số âm, LCM chỉ nhận số không âm — CASIO 2026-10-03.
// Đối số không nguyên báo Argument ERROR. Các bộ số học exact dùng cùng
// helper BigInt để biểu thức như GCD(12,18)÷5 vẫn hiện phân số 6/5.
function gcdBigInt(a, b) {
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
}
function integerPairBigInt(kind, a, b) {
  if (kind === 'LCM' && (a < 0n || b < 0n)) {
    throw new EngineError('Argument ERROR');
  }
  const value = kind === 'GCD' ? gcdBigInt(a, b)
    : a === 0n || b === 0n ? 0n : a / gcdBigInt(a, b) * b;
  if (value > COMBINATORIC_LIMIT) throw new EngineError('Math ERROR');
  return value;
}
function integerPairNumber(kind, a, b, plusModel = false) {
  if (!Number.isInteger(a) || !Number.isInteger(b) ||
      plusModel && (Math.abs(a) >= 1e10 || Math.abs(b) >= 1e10)) {
    throw new EngineError('Argument ERROR');
  }
  return Number(integerPairBigInt(kind, BigInt(a), BigInt(b)));
}
function parseIntegerPairArguments(peek, advance, parseExpression, pendingValue = evaluate => evaluate()) {
  if (peek() !== 'LPAREN') throw new EngineError('Syntax ERROR');
  advance();
  const first = parseExpression();
  if (peek() !== 'COMMA') throw new EngineError('Syntax ERROR');
  advance();
  const second = pendingValue(parseExpression);
  if (peek() !== 'RPAREN') throw new EngineError('Syntax ERROR');
  advance();
  return [first, second];
}

// Đối chứng CASIO 2026-10-27: chuẩn hóa toán hạng trong biểu thức log.
// Khi giá trị đã sát số làm tròn 10 chữ số dưới mức 10^(bậc−13),
// dùng số đó; ngoài vùng này giữ 15 chữ số. Áp dụng theo phép toán,
// không theo công thức/seed; không mở sang kernel ln/căn chưa đối chiếu.
function normalizeLogarithmOperand(value) {
  if (value === 0) return value;
  const fraction = roundedNumberFraction(value);
  const rounded = solveProbeRoundFraction(fraction, 10, true);
  const difference = Math.abs(fracToNumber(fracSub(fraction, rounded)));
  return difference < 10 ** (calculationFractionExponent(fraction) - 13)
    ? fracToNumber(rounded) : fracToNumber(truncateFractionDigits(fraction, 15));
}

// CASIO 2026-10-27: log10 giảm thang thập phân, làm tròn log của
// mantissa 15 chữ số rồi cộng bậc. Ca 99999917777804.7 phân biệt với
// log10 toàn số làm tròn 16 rồi cắt 15; đối chứng 9999996.9 phân biệt
// làm tròn mantissa với cắt đơn thuần. Không chốt theo đối số cụ thể.
function calculationReducedLog10(argument) {
  const fraction = roundedNumberFraction(argument);
  const order = calculationFractionExponent(fraction);
  const exponent = order < 0 ? order + 1 : order;
  const scale = { num: 10n ** BigInt(Math.abs(exponent)), den: 1n };
  const mantissa = fracToNumber(exponent >= 0
    ? fracDiv(fraction, scale) : fracMul(fraction, scale));
  return truncateFractionDigits(fracAdd(decimalLog10Fraction(mantissa, 15),
    { num: BigInt(exponent), den: 1n }), 15);
}

// log/ln chốt đối số tính được về 15 chữ số. Log cơ số bất kỳ
// chốt riêng hai log10 trước phép chia; thương cắt 15 chữ số.
function calculationLogarithm(argument, base = null, plusModel = false) {
  argument = fracToNumber(truncateFractionDigits(roundedNumberFraction(argument), 15));
  if (argument <= 0) throw new EngineError('Math ERROR');
  if (base === null) {
    if (plusModel && argument > 0.5 && argument < 1.5) {
      const delta = fracToNumber(fracSub(roundedNumberFraction(argument), { num: 1n, den: 1n }));
      return Number(Math.log1p(delta).toPrecision(15));
    }
    // CASIO 2026-10-27: ln(1000), ln(6000), ln(0.006) phân biệt
    // giảm thang thập phân với Math.log chốt một lần. Hai đối chứng
    // 0.06/60000 được bấm sau khi chọn mô hình. Mantissa giữ về phía
    // 1: [1,10) với số lớn, [0.1,1) với số nhỏ; không gán số theo ca.
    const fraction = roundedNumberFraction(argument);
    const order = calculationFractionExponent(fraction);
    const exponent = order < 0 ? order + 1 : order;
    const scale = { num: 10n ** BigInt(Math.abs(exponent)), den: 1n };
    const mantissa = fracToNumber(exponent >= 0 ? fracDiv(fraction, scale) : fracMul(fraction, scale));
    const reduced = roundedNumberFraction(Number(Math.log(mantissa).toPrecision(15)));
    const decade = roundedNumberFraction(Number(Math.log(10).toPrecision(15)));
    return fracToNumber(solveProbeRoundFraction(fracAdd(reduced,
      fracMul(decade, { num: BigInt(exponent), den: 1n })), 15, true));
  }
  base = fracToNumber(truncateFractionDigits(roundedNumberFraction(base), 15));
  if (base <= 0 || base === 1) throw new EngineError('Math ERROR');
  return fracToNumber(truncateFractionDigits(fracDiv(
    calculationReducedLog10(argument),
    calculationReducedLog10(base)), 15));
}

// CASIO 2026-10-09: mô hình thập phân dùng riêng cho kiểm tra bước zero
// của SOLVE. Các ca cổng 99 từ ±1/1.5/2 và cổng 33 từ 2 phân biệt được
// Math.pow, lũy thừa Fraction chính xác và mô hình log10/Padé này.
function solveProbeRoundFraction(value, digits, roundEven = false) {
  if (!roundEven) return truncateFractionDigits(value, digits);
  if (value.num === 0n) return value;
  const numerator = bigAbs(value.num);
  let exponent = numerator.toString().length - value.den.toString().length;
  if (exponent >= 0
      ? numerator < value.den * 10n ** BigInt(exponent)
      : numerator * 10n ** BigInt(-exponent) < value.den) exponent--;
  const places = digits - 1 - exponent;
  const scale = 10n ** BigInt(Math.abs(places));
  const num = places >= 0 ? numerator * scale : numerator;
  const den = places >= 0 ? value.den : value.den * scale;
  let coefficient = num / den;
  const remainder = num % den;
  if (2n * remainder > den || (2n * remainder === den && coefficient % 2n !== 0n)) coefficient++;
  if (value.num < 0n) coefficient = -coefficient;
  return fracReduce(places >= 0
    ? { num: coefficient, den: scale }
    : { num: coefficient * scale, den: 1n });
}
const SOLVE_PROBE_SCALE = 10n ** 40n;
const SOLVE_PROBE_LN10 = 23025850929940456840179914546843642076011n;
const SOLVE_PROBE_LN2 = 6931471805599453094172321214581765680755n;
// Log10 hữu tỉ: caller chọn precision; mặc định probe mũ vẫn giữ 15.
function decimalLog10Fraction(base, digits=15) {
  let value = roundedNumberFraction(base), decimalExponent = 0, binaryExponent = 0;
  while (value.num >= 10n * value.den) { value.den *= 10n; decimalExponent++; }
  while (value.num < value.den) { value.num *= 10n; decimalExponent--; }
  while (value.num > 2n * value.den) { value.den *= 2n; binaryExponent++; }
  // ln(y)=2(t+t³/3+...), với t=(y−1)/(y+1) và 1≤y≤2.
  const t = (value.num - value.den) * SOLVE_PROBE_SCALE / (value.num + value.den);
  const square = t * t / SOLVE_PROBE_SCALE;
  let power = t, total = t;
  for (let k = 3n; k < 501n; k += 2n) {
    power = power * square / SOLVE_PROBE_SCALE;
    if (power === 0n) break;
    total += power / k;
  }
  const ln = 2n * total + BigInt(binaryExponent) * SOLVE_PROBE_LN2 + BigInt(decimalExponent) * SOLVE_PROBE_LN10;
  return solveProbeRoundFraction({ num: ln, den: SOLVE_PROBE_LN10 }, digits, true);
}
// Hệ số Padé [8/8]: (16−k)!8! / (16!k!(8−k)!).
const SOLVE_PROBE_PADE = Array.from({ length: 9 }, (_, k) => solveProbeRoundFraction(fracReduce({
  num: BigInt(computeFactorial(16 - k)) * BigInt(computeFactorial(8)),
  den: BigInt(computeFactorial(16)) * BigInt(computeFactorial(k)) * BigInt(computeFactorial(8 - k))
}), 15));
function solveProbeExp10(argument) {
  const exponent = Math.round(fracToNumber(argument));
  if (Math.abs(exponent) > 100) return Math.pow(10, fracToNumber(argument));
  // CASIO 2026-10-12: mẫu bước hai bậc 33 phân biệt việc chốt
  // phần còn lại 15 chữ số trước Padé; chỉ dùng trong probe zero.
  const fraction = truncateFractionDigits(fracSub(argument, { num: BigInt(exponent), den: 1n }), 15);
  const ln10 = solveProbeRoundFraction({ num: SOLVE_PROBE_LN10, den: SOLVE_PROBE_SCALE }, 15, true);
  const z = solveProbeRoundFraction(fracMul(fraction, ln10), 16);
  const negativeZ = fracNeg(z);
  let numerator = { num: 0n, den: 1n }, denominator = numerator;
  // CASIO cổng 33 tại 1.93939393913: tích Horner làm tròn gần nhất
  // ở 16 chữ số; phép cộng/chia vẫn cắt. Không đổi kernel Calculate.
  for (let k = 8; k >= 0; k--) {
    numerator = solveProbeRoundFraction(fracAdd(solveProbeRoundFraction(fracMul(numerator, z), 16, true), SOLVE_PROBE_PADE[k]), 16);
    denominator = solveProbeRoundFraction(fracAdd(solveProbeRoundFraction(fracMul(denominator, negativeZ), 16, true), SOLVE_PROBE_PADE[k]), 16);
  }
  let value = solveProbeRoundFraction(solveProbeRoundFraction(fracDiv(numerator, denominator), 16), 15, true);
  const scale = { num: 10n ** BigInt(Math.abs(exponent)), den: 1n };
  value = exponent >= 0 ? fracMul(value, scale) : fracDiv(value, scale);
  return fracToNumber(value);
}
// Mô hình cổng zero SOLVE đã giữ được các ca nguồn064 (20/27.10).
// Đo lại28.10: cả19999999²−399999960000000 và dạng nhân đều0;
// đối chứng cũ "nhân cho1" không còn đủ căn cứ suy ra kernel bình phương.
// Giữ hành vi đã kiểm tra, chưa thay mô hình khi hai hệ số3/4 còn lệch.
// Không áp14 chữ số này cho toàn bộ số học Calculate.
function solveProbeSquare(value) {
  const exact=roundedNumberFraction(value);
  return fracToNumber(solveProbeRoundFraction(fracMul(exact,exact),14,true));
}

// Cộng/trừ trong phép dò zero, không thay số học thường. CASIO
// 2026-10-20/21: cubic khai triển tại −0.99992 cho 0, tại −0.9999
// vẫn còn 10^-12. Chốt tổng có dấu bằng Fraction để tránh nhiễu binary.
function solveProbeSum(a,b) {
  return fracToNumber(solveProbeRoundFraction(fracAdd(
    solveProbeRoundFraction(roundedNumberFraction(a),13,true),
    solveProbeRoundFraction(roundedNumberFraction(b),13,true)),13,true));
}

function solveProbeIntegerPower(base, exponent) {
  const ordinary = Math.pow(base, exponent);
  // Giữ đường căn/lũy thừa nhỏ và miền lỗi/underflow đã đối chiếu.
  if (!Number.isInteger(exponent) || Math.abs(exponent) <= 3 || !Number.isFinite(ordinary) || ordinary === 0) return ordinary;
  if (base < 0) return (Math.abs(exponent) % 2 ? -1 : 1) * solveProbeIntegerPower(-base, exponent);
  if (!(base > 0) || (Number.isInteger(base) && Number.isSafeInteger(ordinary))) return ordinary;
  const product = solveProbeRoundFraction(fracMul(decimalLog10Fraction(base), roundedNumberFraction(exponent)), 17, true);
  return solveProbeExp10(product);
}

// Dùng chung trong Calculate và Complex khi cơ số âm, số mũ không nguyên.
// Chỉ nhận phân số chính xác có mẫu lẻ sau rút gọn.
function negativeBaseRationalPower(base, exponentTokens, angleUnit) {
  let exponent;
  try {
    exponent = evaluateExpressionExact(exponentTokens, null, {}, angleUnit);
  } catch (error) {
    if (!(error instanceof EngineError)) throw error;
    throw new EngineError('Math ERROR');
  }
  if (exponent.den % 2n === 0n) throw new EngineError('Math ERROR');
  const magnitude = Math.pow(-base, fracToNumber(exponent));
  return exponent.num % 2n === 0n ? magnitude : -magnitude;
}

// Dấu + tiền tố không dùng một phép đổi dấu; mỗi dấu − phải chờ toán
// hạng phía sau. Giữ chung cách đọc cho số thực, phân số, căn và pi.
function readPrefixSigns(peek, advance) {
  let negativeCount = 0;
  while (peek() === 'PLUS' || peek() === 'MINUS') {
    if (advance().type === 'MINUS') negativeCount++;
  }
  return negativeCount;
}

// [ĐÃ XÁC NHẬN 2026-11-06] LineI: a┘b=a/b, a┘b┘c=a+b/c.
// Lũy thừa đứng trước phân số; phân số đứng trước nhân ẩn:
// 2┘3²=2/9, 1┘2(3)=3/2. Dùng cùng cú pháp ở mọi bộ số học.
// Dấu âm ngoài hỗn số áp lên cả cụm. Với phần tử có dấu bên trong,
// giữ phép cộng/chia đại số theo tiêu chí toán học được duyệt06/11.
function parseLineFraction(peek, advance, parsePower, arithmetic) {
  const first = parsePower();
  if (peek() !== 'LINEFRAC') return first;
  const signedPower = () => {
    const signs = readPrefixSigns(peek, advance);
    const evaluate = () => {
      const value = parsePower();
      return signs % 2 ? arithmetic.negate(value) : value;
    };
    return arithmetic.pending ? arithmetic.pending(signs, evaluate) : evaluate();
  };
  advance();
  const second = signedPower();
  if (peek() !== 'LINEFRAC') return arithmetic.divide(first, second);
  advance();
  const third = signedPower();
  if (peek() === 'LINEFRAC') throw new EngineError('Syntax ERROR');
  return arithmetic.add(first, arithmetic.divide(second, third));
}

// Phân giải + tính giá trị biểu thức theo đúng thứ tự ưu tiên đã xác nhận:
// ngoặc > nhân ẩn > × ÷ > dấu đổi dấu áp dụng ngay trên một số/ngoặc > + −.
function evaluateExpression(expr, ansValue, variables, angleUnit, minimumMagnitude = 0,
                            numberFormat = DEFAULT_NUMBER_FORMAT, coordinateContext = null, remainderContext = null, domainContext = null) {
  expr = expandDmsLiterals(expr);
  if (/Pol\(|Rec\(/.test(expr)) variables = { ...variables };
  expr = materializeRandomExpression(expr, part =>
    evaluateExpression(part, ansValue, variables, angleUnit, minimumMagnitude, numberFormat, null, null, domainContext));
  const tokens = tokenize(expr);
  let pos = 0;
  let logarithmDepth = 0;
  // [ĐÃ XÁC NHẬN 2026-11-04] 24 dấu trừ chưa có toán hạng: Syntax;
  // dấu thứ25: Stack. Toán tử nhị phân đang đợi vế phải chiếm thêm1 ô.
  // Đếm phép đang chờ, không đếm tổng phím của một biểu thức dài đã rút gọn.
  let pendingOperators = 0;
  let pendingValues = 0;
  const withPendingValue = evaluate => {
    if (!domainContext?.plusModel) return evaluate();
    // PLUS has ten saved numeric values, in addition to the current value.
    // Eleven nested operands succeed; the twelfth raises Stack ERROR.
    if (pendingValues >= 10) {
      const error = new EngineError('Stack ERROR');
      error.stackOperator = tokens[pos - 1]?.start;
      throw error;
    }
    pendingValues++;
    try { return evaluate(); }
    finally { pendingValues--; }
  };
  const withPendingOperators = (count, evaluate) => {
    if (pendingOperators + count > 24) {
      const error = new EngineError('Stack ERROR');
      // Prefix signs are scanned as a batch. Point at the first sign
      // beyond the remaining capacity, even if more signs follow it.
      error.stackOperator = tokens[pos - count + Math.max(0,24-pendingOperators)]?.start;
      throw error;
    }
    pendingOperators += count;
    try { return evaluate(); }
    finally { pendingOperators -= count; }
  };
  // CASIO 2026-09-18/21: kiểm tra miền sau từng phép tính, trước khi
  // kết quả được dùng tiếp. Solve x^99×10^99 từ 0.01 cần underflow ở x^99;
  // Calculate 100^99÷10^99 phải báo Math ERROR tại 100^99. Caller Solve
  // truyền ngưỡng dưới 10^-99; các caller khác giữ ngưỡng dưới mặc định 0.
  const scalarFunctionError = name => {
    const error = new EngineError('Math ERROR');
    if (domainContext?.plusModel) error.argumentPairFunction = name;
    return error;
  };
  const checkTrigFunctionRange = (value, name) => {
    try { checkTrigAngleRange(value, angleUnit); }
    catch (error) {
      if (domainContext?.plusModel) error.argumentPairFunction = name;
      throw error;
    }
  };
  const reduceDecimalAngle = (value, turn) => {
    const fraction = roundedNumberFraction(value);
    return { num: fraction.num % (BigInt(turn) * fraction.den), den: fraction.den };
  };
  const normalize = value => {
    const outsideRange = domainContext?.plusModel ? Math.abs(value) >= 1e100 : Math.abs(value) > 9.999999999e99;
    if (!Number.isFinite(value) || outsideRange) {
      throw new EngineError('Math ERROR');
    }
    if (Math.abs(value) < minimumMagnitude) {
      if (domainContext && value !== 0) domainContext.underflow = true;
      return 0;
    }
    return logarithmDepth > 0 ? normalizeLogarithmOperand(value) : value;
  };
  // SOLVE log: nhân hệ số bằng Fraction rồi cắt15, tránh nhiễu binary
  // trước phép cân bằng hai vế. CASIO27.10: 3log₂(A)=6log₂(B) phân biệt
  // với nhân JS rồi cắt; đối số log giữ đường số học đã đối chiếu riêng.
  const multiply = (a, b) => domainContext?.solveDecimalLogProduct && logarithmDepth === 0
    ? fracToNumber(truncateFractionDigits(fracMul(roundedNumberFraction(a), roundedNumberFraction(b)), 15))
    : a * b;
  const logarithmArguments = parse => {
    logarithmDepth++;
    try { return parse(); }
    finally { logarithmDepth--; }
  };

  function peek() {
    return pos < tokens.length ? tokens[pos].type : null;
  }

  function advance() {
    return tokens[pos++];
  }

  function isImplicitMultTrigger() {
    const t = peek();
    return t === 'NUMBER' || t === 'ANS' || t === 'PREANS' || t === 'LPAREN' || t === 'SQRT' || t === 'CBRT' || t === 'VARIABLE' ||
      t === 'SIN' || t === 'COS' || t === 'TAN' || t === 'ASIN' || t === 'ACOS' || t === 'ATAN' ||
      t === 'SINH' || t === 'COSH' || t === 'TANH' || t === 'ASINH' || t === 'ACOSH' || t === 'ATANH' ||
      t === 'LOGBASE' || t === 'LOG' || t === 'LN' || t === 'EXP' || t === 'ABS' || t === 'PI' ||
      t === 'NORMP' || t === 'NORMQ' || t === 'NORMR' || t === 'GCD' || t === 'LCM' || t === 'ROUND' ||
      t === 'INT' || t === 'INTG' || t === 'POL' || t === 'REC' || t === 'USER_FUNCTION';
  }

  // √ và ∛ mở một biểu thức con trong ngoặc, giống hàm số — ĐÃ XÁC NHẬN
  // 2026-08-20: bấm `√ 9 + 7 =` trên bản giả lập, máy hiện √(9+7) và cho 4,
  // tức dấu + gõ sau vẫn nằm TRONG dấu căn chứ không thoát ra ngoài.
  function parseFunctionArgument() {
    const evaluate = () => {
      if (peek() !== 'LPAREN') {
        throw new EngineError('Syntax ERROR');
      }
      advance();
      const value = parseExpression();
      if (peek() !== 'RPAREN') {
        throw new EngineError('Syntax ERROR');
      }
      advance();
      return value;
    };
    // PLUS keeps the function pending while its argument is evaluated:
    // one function plus23 unary signs fits; the24th sign overflows.
    return domainContext?.plusModel ? withPendingOperators(1, evaluate) : evaluate();
  }

  function parseAtom() {
    return normalize(parseAtomValue());
  }

  function parseAtomValue() {
    const type = peek();
    if (type === 'NUMBER') {
      return advance().value;
    }
    if (type === 'ANS') {
      advance();
      return ansValue === null ? 0 : ansValue;
    }
    if (type === 'PREANS') { advance(); return variables.PreAns; }
    if (type === 'PI') {
      advance();
      return Math.PI;
    }
    // Biến thống kê đọc từ chính bảng biến truyền vào (engine trộn giá trị
    // thống kê vào đó khi đang ở mode Statistics). Chỉ bộ tính SỐ THỰC biết
    // chúng: giá trị thống kê vốn là số thập phân, ba bộ tính chính xác
    // (phân số / căn thức / π) cứ để throw như mọi atom lạ khác, kết quả là
    // dòng kết quả không kèm dạng chính xác.
    // null nghĩa là "có tên nhưng không có giá trị" — sx khi chỉ có một số
    // liệu. ĐÃ XÁC NHẬN 2026-08-25: màn hình danh sách bỏ trống, còn dùng
    // trong biểu thức thì Math ERROR.
    if (type === 'STATVAR') {
      const value = variables[advance().field];
      if (value === undefined || value === null || !Number.isFinite(value)) {
        throw new EngineError('Math ERROR');
      }
      return value;
    }
    if (type === 'VARIABLE') {
      const token = advance();
      if (coordinateContext) coordinateContext.variable(token.name, token.start);
      return variables[token.name];
    }
    if (type === 'USER_FUNCTION') {
      const {name} = advance();
      const invoke = variables[REGISTERED_FUNCTION_880];
      if (!invoke) throw new EngineError('Syntax ERROR');
      return invoke(name, parseFunctionArgument(), variables, minimumMagnitude);
    }
    if (type === 'LPAREN') {
      advance();
      const value = parseExpression();
      if (peek() !== 'RPAREN') {
        throw new EngineError('Syntax ERROR');
      }
      advance();
      return value;
    }
    if (type === 'SQRT') {
      advance();
      const value = parseFunctionArgument();
      if (value < 0) {
        const error = new EngineError('Math ERROR');
        if (domainContext?.plusModel) error.negativeRadical = true;
        throw error;
      }
      // CASIO 2026-10-21: các cân bằng căn lớn +199/+201 và chiều âm
      // phân biệt kết quả căn 15 chữ số với Math.sqrt chưa chốt. Chỉ đường
      // SOLVE sơ cấp dùng chốt này; tích phân và phép dò zero giữ precision
      // riêng đã đối chiếu. Không đổi Calculate hoặc suy nghiệm từ công thức.
      const result = Math.sqrt(value);
      return domainContext?.solveFiniteZeroProbe
        ? roundToSignificantDigits(result,14)
        : domainContext?.solveDecimalFunction
          ? fracToNumber(truncateFractionDigits(roundedNumberFraction(result),15)) : result;
    }
    if (type === 'CBRT') {
      advance();
      return Math.cbrt(parseFunctionArgument());
    }
    if (type === 'ABS') {
      advance();
      return Math.abs(parseFunctionArgument());
    }
    if (type === 'POL' || type === 'REC') {
      const token = advance();
      const name = type === 'POL' ? 'Pol' : 'Rec';
      try {
        const [a,b] = parseIntegerPairArguments(peek, advance, parseExpression);
        const pair = coordinateConversion(name, a, b, angleUnit);
        if (coordinateContext) coordinateContext.accept({ ...coordinateCallRange(expr,token.start), ...pair, a, b });
        variables.x = pair.first; variables.y = pair.second;
        return pair.first;
      } catch (error) {
        if (domainContext?.plusModel) error.argumentPairFunction = name;
        throw error;
      }
    }
    if (type === 'INT' || type === 'INTG') {
      advance();
      return integerPartForCalculation(parseFunctionArgument(), type === 'INTG');
    }
    if (type === 'ROUND') {
      advance();
      return roundForCalculation(parseFunctionArgument(), numberFormat);
    }
    if (type === 'GCD' || type === 'LCM') {
      advance();
      try {
        const [a, b] = parseIntegerPairArguments(peek, advance, parseExpression);
        return integerPairNumber(type, a, b, domainContext?.plusModel);
      } catch (error) {
        if (domainContext?.plusModel) error.argumentPairFunction = type;
        throw error;
      }
    }
    if (type === 'ANGLEUNIT') {
      const unit = advance().unit;
      return convertAngleValue(parseFunctionArgument(), unit, angleUnit);
    }
    if (type === 'SIN') {
      advance();
      const argument = parseFunctionArgument();
      checkTrigFunctionRange(argument, type === 'SIN' ? 'sin' : 'cos');
      const turn = angleUnit === 'deg' ? 360 : angleUnit === 'grad' ? 400 : null;
      const reduced = domainContext?.plusModel && turn !== null ? fracToNumber(reduceDecimalAngle(argument, turn)) : argument;
      return normalizeTrigValue(Math.sin(toRadians(reduced, angleUnit)), argument, angleUnit, 'sin');
    }
    if (type === 'COS') {
      advance();
      const argument = parseFunctionArgument();
      checkTrigFunctionRange(argument, type === 'SIN' ? 'sin' : 'cos');
      // Rút chu kỳ trước khi đổi sang radian để không mang nhiễu của
      // góc rất lớn vào cos: SOLVE Degree từ 0 chọn 10000020/L-R=0.
      // Góc nhỏ giữ nguyên, không cộng chu kỳ rồi trừ gây mất chữ số.
      const turn = angleUnit === 'deg' ? 360 : angleUnit === 'grad' ? 400 : null;
      const reduced = domainContext?.plusModel && turn !== null ? fracToNumber(reduceDecimalAngle(argument, turn))
        : turn !== null && Math.abs(argument) >= turn ? argument % turn : argument;
      return normalizeTrigValue(Math.cos(toRadians(reduced, angleUnit)), argument, angleUnit, 'cos');
    }
    if (type === 'TAN') {
      advance();
      const argumentStart = pos;
      const degrees = parseFunctionArgument();
      checkTrigFunctionRange(degrees, 'tan');
      if (domainContext?.plusModel && angleUnit !== 'rad') {
        const turn = angleUnit === 'deg' ? 180 : 200;
        const reduced = reduceDecimalAngle(degrees, turn);
        const halfTurn = BigInt(turn / 2) * reduced.den;
        const delta = {num: reduced.num + (reduced.num < 0n ? halfTurn : -halfTurn), den: reduced.den};
        if (delta.num === 0n) throw scalarFunctionError('tan');
        const offset = fracToNumber(delta);
        const result = Math.abs(offset) < turn / 4
          ? -1 / Math.tan(toRadians(offset, angleUnit))
          : Math.tan(toRadians(fracToNumber(reduced), angleUnit));
        return normalizeTrigValue(result, degrees, angleUnit, 'tan');
      }
      if (domainContext?.plusModel && angleUnit === 'rad' &&
          !tokens.slice(argumentStart,pos).some(token => ['PI','VARIABLE','ANS','PREANS','USER_FUNCTION'].includes(token.type))) {
        // Reduce a decimal argument against an odd half-turn before converting
        // the small difference to binary; Math.tan(value) loses visible digits
        // close to a pole. Symbolic/memory paths retain their existing model.
        const pi = fractionFromDecimalString('3.1415926535897932384626433832795028841971');
        const multiple = 2 * Math.round(degrees / Math.PI - 0.5) + 1;
        const pole = fracMul(pi, {num:BigInt(multiple),den:2n});
        const offset = fracToNumber(fracSub(roundedNumberFraction(degrees),pole));
        if (Math.abs(offset) < Math.PI / 4) return -1 / Math.tan(offset);
      }
      // tan không xác định tại 90°+n×180° — dùng dung sai nhỏ vì đây là so
      // sánh số thực, không so bằng tuyệt đối (CLAUDE.md, mục "Về số học").
      if (angleUnit === 'deg' || angleUnit === 'grad') {
        const turn = angleUnit === 'deg' ? 180 : 200;
        const singular = turn / 2;
        const mod = ((degrees % turn) + turn) % turn;
        if (Math.abs(mod - singular) < 1e-9) {
          throw scalarFunctionError('tan');
        }
      } else {
        // Radian cũng đặc cách — ĐÃ XÁC NHẬN 2026-08-20: `tan(π÷2)` ra Math
        // ERROR. Nhưng dung sai phải RẤT CHẶT: `tan(1.5707963)`, cách π/2 chừng
        // 2,7×10⁻⁸, vẫn ra 37320534.88 bình thường — máy nhận diện π/2 theo KÝ
        // HIỆU chứ không phải "gần đúng π/2 thì báo lỗi".
        //
        // Kho π chính xác của ta (evaluateExpressionExactPi) chỉ làm lượng giác
        // NGƯỢC, chưa làm thuận, nên chưa hỏi nó được. Ở đây xấp xỉ bằng dung
        // sai RẤT chặt trên BỘI SỐ của π/2.
        //
        // Ngưỡng 10⁻¹³ chọn từ số đo thật, không phải đoán. Bấm 2026-08-20:
        //   • Mọi cách gõ KÝ HIỆU (π÷2, 3π÷2, π÷2+π, 5π÷2, −π÷2, π×3÷2,
        //     π×1.5...) rơi ĐÚNG vào bội lẻ, lệch 0; cách lệch nhiều nhất tìm
        //     được là π×99÷2, lệch 1,4×10⁻¹⁴.
        //   • Số GÕ TAY gần π/2 nhất mà máy vẫn tính bình thường là
        //     1.5707963268 → −1.960784314×10¹¹, lệch 3,2×10⁻¹².
        // 10⁻¹³ nằm giữa hai mốc đó, cách mỗi bên cả chục lần.
        //
        // Bản trước để 10⁻⁹ và SAI: nó bắt luôn 1.5707963268 thành Math ERROR
        // trong khi máy vẫn cho ra số. Chính ca đó đã có sẵn trong bộ test
        // (dòng "sin(1.5707963268 rad)=1") nên không phải góc lý thuyết.
        const halfPiMultiple = degrees / (Math.PI / 2);
        const nearest = Math.round(halfPiMultiple);
        if (Math.abs(nearest) % 2 === 1 && Math.abs(halfPiMultiple - nearest) < 1e-13) {
          throw scalarFunctionError('tan');
        }
      }
      return normalizeTrigValue(Math.tan(toRadians(degrees, angleUnit)), degrees, angleUnit, 'tan');
    }
    if (type === 'ASIN') {
      advance();
      const value = parseFunctionArgument();
      if (value < -1 || value > 1) {
        throw scalarFunctionError('sin⁻¹');
      }
      return fromRadians(Math.asin(value), angleUnit);
    }
    if (type === 'ACOS') {
      advance();
      const value = parseFunctionArgument();
      if (value < -1 || value > 1) {
        throw scalarFunctionError('cos⁻¹');
      }
      return fromRadians(Math.acos(value), angleUnit);
    }
    if (type === 'ATAN') {
      advance();
      return fromRadians(Math.atan(parseFunctionArgument()), angleUnit);
    }
    // Hyperbolic không phụ thuộc Angle Unit. Miền nhập bám bảng manual
    // chính thức tr.186 thay vì để Math.* âm thầm nhận giá trị mà fx-580VN X
    // phải báo Math ERROR.
    if (type === 'SINH' || type === 'COSH') {
      advance();
      const value = parseFunctionArgument();
      if (Math.abs(value) > 230.2585092) {
        throw scalarFunctionError(type === 'SINH' ? 'sinh' : 'cosh');
      }
      return type === 'SINH' ? Math.sinh(value) : Math.cosh(value);
    }
    if (type === 'TANH') {
      advance();
      const value = parseFunctionArgument();
      if (Math.abs(value) > 9.999999999e99) {
        throw scalarFunctionError('tanh');
      }
      return Math.tanh(value);
    }
    if (type === 'ASINH') {
      advance();
      const value = parseFunctionArgument();
      if (Math.abs(value) > 4.999999999e99) {
        throw scalarFunctionError('sinh⁻¹');
      }
      return Math.asinh(value);
    }
    if (type === 'ACOSH') {
      advance();
      const value = parseFunctionArgument();
      if (value < 1 || value > 4.999999999e99) {
        throw scalarFunctionError('cosh⁻¹');
      }
      if (domainContext?.plusModel && value < 2) {
        const delta = fracToNumber(fracSub(roundedNumberFraction(value), { num: 1n, den: 1n }));
        return Math.log1p(delta + Math.sqrt(delta * (value + 1)));
      }
      return Math.acosh(value);
    }
    if (type === 'ATANH') {
      advance();
      const value = parseFunctionArgument();
      if ((domainContext?.plusModel ? Math.abs(value) >= 1 : Math.abs(value) > 0.9999999999)) {
        throw scalarFunctionError('tanh⁻¹');
      }
      if (domainContext?.plusModel) {
        // Subtract in decimal rational space near ±1: binary 1-value loses
        // visible digits for inputs such as 0.99999999999 on the PLUS.
        const fraction = roundedNumberFraction(Math.abs(value));
        return Math.sign(value) * Math.log1p(2 * Number(fraction.num) /
          Number(fraction.den - fraction.num)) / 2;
      }
      return Math.atanh(value);
    }
    if (type === 'LOGBASE') {
      advance();
      const [base, argument] = logarithmArguments(() =>
        parseIntegerPairArguments(peek, advance, parseExpression, withPendingValue));
      return calculationLogarithm(argument, base);
    }
    if (type === 'LOG' || type === 'LN') {
      advance();
      let base = type === 'LOG' ? 10 : null;
      const parseLogArgument = () => {
        if (!domainContext?.plusModel || type !== 'LOG') return parseFunctionArgument();
        if (peek() !== 'LPAREN') throw new EngineError('Syntax ERROR');
        advance();
        const first = parseExpression();
        let argument = first;
        if (peek() === 'COMMA') { advance(); base = first; argument = parseExpression(); }
        if (peek() !== 'RPAREN') throw new EngineError('Syntax ERROR');
        advance();
        return argument;
      };
      const argument = type === 'LOG'
        ? logarithmArguments(parseLogArgument) : parseLogArgument();
      try { return calculationLogarithm(argument, base, domainContext?.plusModel); }
      catch (error) {
        if (domainContext?.plusModel) error.argumentPairFunction = type === 'LOG' ? 'log' : 'ln';
        throw error;
      }
    }
    if (type === 'EXP') {
      advance();
      return Math.exp(parseFunctionArgument());
    }
    // Hàm phân phối chuẩn (menu Norm Dist). Nhận z ĐÃ chuẩn hoá trực tiếp; kết
    // quả làm tròn 5 chữ số thập phân — xem statNormP/Q/R trong statistics.js.
    if (type === 'NORMP') { advance(); return statNormP(parseFunctionArgument()); }
    if (type === 'NORMQ') { advance(); return statNormQ(parseFunctionArgument()); }
    if (type === 'NORMR') { advance(); return statNormR(parseFunctionArgument()); }
    throw new EngineError('Syntax ERROR');
  }

  // Giai thừa chỉ nhận số nguyên không âm. Ngưỡng tràn ĐÃ XÁC NHẬN
  // 2026-08-20 trên bản giả lập: 69! ra 1.711224524×10⁹⁸ (chạy được), 70! ra
  // Math ERROR. Khớp đúng cách chặn ở đây — vượt phạm vi hiển thị số thực
  // (~9,999999999×10⁹⁹) của máy thì báo lỗi.

  // Một atom, cộng thêm mọi hậu tố (x² x³ x! x⁻¹) áp dụng ngay lên nó.
  // ĐÃ XÁC NHẬN 2026-08-20: `(−) 3 x² =` trên bản giả lập ra −9, nghĩa là hậu
  // tố bám CHẶT hơn dấu âm đứng trước — đúng như chỗ này đang làm. (Ca này
  // phân biệt được hai cách hiểu: cách kia sẽ cho +9.)
  // Ký hiệu kỹ thuật là hậu tố bám CHẶT NHẤT — chặt hơn cả x²/x³/x!/x⁻¹, nên
  // nằm giữa parseAtom và parsePowerBase. Xem đặc tả ở chỗ khai báo
  // ENGINEER_SYMBOL_EXPONENTS (ĐÃ XÁC NHẬN 2026-08-24).
  function parseEngSuffix() {
    let value = parseAtom();
    let applied = false;
    while (peek() === 'ENGSYM') {
      const exponent = advance().exponent;
      // Chia cho 10^|n| thay vì nhân 10^(-n) khi số mũ âm: bớt một bước làm
      // tròn nhị phân (10^-3 không biểu diễn chính xác được, 10^3 thì có).
      value = normalize(exponent >= 0 ? value * Math.pow(10, exponent) : value / Math.pow(10, -exponent));
      applied = true;
    }
    // 5k3 → Syntax ERROR (nhưng 5kπ vẫn là nhân ẩn hợp lệ).
    if (applied && peek() === 'NUMBER') {
      throw new EngineError('Syntax ERROR');
    }
    return value;
  }

  function parsePowerBase(negativeStatArgument, initialValue) {
    let value = initialValue === undefined ? parseEngSuffix() : initialValue;
    if (negativeStatArgument) value = -value;
    while (true) {
      const t = peek();
      if (t === 'SQUARE') { advance(); value = normalize(domainContext?.solveFiniteZeroProbe ? solveProbeSquare(value) : value*value); }
      // CASIO 2026-09-23: x³ và x^3 cho cùng phép tính trung gian; nhân ba
      // lần bằng JS lệch một bit ở x=1.23456789012345 và làm Solve lệch x.
      else if (t === 'CUBE') { advance(); value = normalize(Math.pow(value, 3)); }
      else if (t === 'FACTORIAL') {
        const token = advance();
        try { value = computeFactorial(value); }
        catch (error) {
          if (domainContext?.plusModel) error.factorialStart = token.start;
          throw error;
        }
      }
      else if (t === 'PERCENT') { advance(); value = normalize(value / 100); }
      else if (t === 'RECIPROCAL') {
        advance();
        if (value === 0) {
          throw new EngineError('Math ERROR');
        }
        value = normalize(1 / value);
      } else if (t === 'STATFUNC') {
        // Hàm ước lượng hồi quy x̂/ŷ ăn số đứng trước (`3ŷ`) — cùng bậc với các
        // hậu tố khác. Chỉ bộ tính SỐ THỰC biết, ba bộ chính xác để token thừa
        // rồi throw (kết quả không kèm dạng chính xác — đúng, hồi quy là số lẻ).
        value = normalize(statEstimate(advance().func, value, variables));
      } else {
        break;
      }
    }
    return value;
  }

  // Lũy thừa ^ kết hợp phải (2^3^2 = 2^(3^2)) — ĐÃ XÁC NHẬN 2026-08-20:
  // `2 x^ 3 x^ 2 =` trên bản giả lập hiện tháp 2³² và cho 512, không phải 64.
  function parsePower(negativeStatArgument = false) {
    let base = parsePowerBase(negativeStatArgument);
    while (peek() === 'CARET') {
      advance();
      const exponentStart = pos;
      // PLUS: separately closed powers associate left. A nested exponent
      // still recurses through its parenthesized expression (2^(3^(2))).
      const exponent = withPendingValue(domainContext?.plusModel ? parseEngSuffix : parsePower);
      if (base === 0 && (exponent < 0 || domainContext?.plusModel && exponent === 0)) throw scalarFunctionError('^');
      const result = domainContext?.solveFiniteZeroProbe && exponent===2 ? solveProbeSquare(base)
        : domainContext?.solveZeroProbe ? solveProbeIntegerPower(base, exponent) : Math.pow(base, exponent);
      if (Number.isNaN(result)) {
        if (base >= 0) throw new EngineError('Math ERROR');
        base = normalize(negativeBaseRationalPower(base, tokens.slice(exponentStart, pos), angleUnit));
      } else base = normalize(result);
      if (!domainContext?.plusModel) break;
      base = parsePowerBase(false,base);
    }
    return base;
  }

  // Một biểu thức lũy thừa, cộng thêm mọi lần nhân ẩn liền sau nó (ưu tiên
  // cao hơn × ÷).
  function parseImplicitFactor(negativeStatArgument = false) {
    const start = pos;
    const signedPower = () => parsePower(negativeStatArgument && pos === start);
    const factor = () => parseLineFraction(peek, advance, signedPower, {
      add: (a,b) => normalize(a+b), negate: a => -a,
      divide: (a,b) => { if (b===0) throw new EngineError('Math ERROR'); return normalize(a/b); },
      pending: withPendingOperators
    });
    let value = factor();
    while (isImplicitMultTrigger()) {
      // PLUS accepts 9x and x(9), but a numeric right operand needs ×.
      if (domainContext?.plusModel && peek() === 'NUMBER') {
        const error = new EngineError('Syntax ERROR');
        error.implicitNumeric = true;
        throw error;
      }
      value = normalize(multiply(value, withPendingValue(factor)));
    }
    return value;
  }

  function parseBeforeConversion() {
    const signs = readPrefixSigns(peek, advance);
    return withPendingOperators(signs, () => {
      // In a regression estimate, a signed literal is the observation:
      // −3x̂ estimates at y=−3, while −(3x̂) negates the estimate at y=3.
      const suffix = tokens[pos + 1];
      const negativeObservation = signs % 2 === 1 && peek() === 'NUMBER' &&
        suffix?.type === 'STATFUNC' && suffix.func !== 'tconv';
      const value = parseImplicitFactor(negativeObservation);
      return signs % 2 && !negativeObservation ? -value : value;
    });
  }

  // CASIO 2026-10-03: 6÷3P2=1, 2³P2=56 — nPr/nCr nằm giữa
  // lũy thừa và ×/÷; các phép P/C liên tiếp lấy từ trái sang phải.
  function parseUnary() {
    const value=parseBeforeConversion();
    return peek()==='CONVERSION'?parseUnitConversionSuffix(value,peek,advance,parsePower,isImplicitMultTrigger,unitConversionArithmetic('number')):value;
  }

  function parseCombinatoric() {
    let value = parseUnary();
    while (peek() === 'PERM' || peek() === 'COMB') {
      const kind = advance().type === 'PERM' ? 'P' : 'C';
      value = combinatoricNumber(value, withPendingValue(parseUnary), kind, domainContext?.plusModel);
    }
    return value;
  }

  function parseTerm() {
    let value = parseCombinatoric();
    while (true) {
      if (peek() === 'MUL') {
        advance();
        value = normalize(multiply(value, withPendingValue(() => withPendingOperators(1, parseCombinatoric))));
      } else if (peek() === 'REMDIV') {
        const token=advance();const pair=divisionRemainderNumber(value,parseCombinatoric());
        value=normalize(pair.value);
        if(remainderContext){remainderContext.accept(pair,token.start);if(pair.remainder!==null){variables.E=pair.value;variables.F=pair.remainder;}}
      } else if (peek() === 'DIV') {
        advance();
        const rhs = withPendingValue(() => withPendingOperators(1, parseCombinatoric));
        if (rhs === 0) {
          throw new EngineError('Math ERROR');
        }
        value = normalize(value / rhs);
      } else {
        break;
      }
    }
    return value;
  }

  function parseExpression() {
    let value = parseTerm();
    while (true) {
      if (peek() === 'PLUS') {
        advance();
        const rhs = withPendingValue(() => withPendingOperators(1, parseTerm));
        value = normalize(domainContext?.sumForResidual ? domainContext.sumForResidual(value, rhs)
          : domainContext?.solveFiniteZeroProbe ? solveProbeSum(value,rhs) : value + rhs);
      } else if (peek() === 'MINUS') {
        advance();
        const rhs = withPendingValue(() => withPendingOperators(1, parseTerm));
        value = normalize(domainContext?.sumForResidual ? domainContext.sumForResidual(value, -rhs)
          : domainContext?.solveFiniteZeroProbe ? solveProbeSum(value,-rhs) : value - rhs);
      } else {
        break;
      }
    }
    return value;
  }

  if (tokens.length === 0) {
    throw new EngineError('Syntax ERROR');
  }

  const result = parseExpression();

  if (pos !== tokens.length) {
    throw new EngineError('Syntax ERROR');
  }
  if (!Number.isFinite(result)) {
    throw new EngineError('Math ERROR');
  }

  return result;
}

// ===== Số vô tỉ dạng căn thức (SurdValue) — Tầng 5, "dạng số vô tỉ" =====
// Biểu diễn giá trị "hữu tỉ + hệ_số×√căn_số" (căn_số đã rút gọn, không
// chia hết cho bình phương nào > 1). Quy ước: radicand === 1n nghĩa là
// "không có phần căn" (coeff luôn là ZERO_FRACTION khi đó) — MỌI phép toán
// dưới đây phải trả kết quả về đúng quy ước này khi phần căn triệt tiêu.
//
// Đây là bộ thứ BA, song song với Fraction (evaluateExpressionExact) và
// thập phân (evaluateExpression) — KHÔNG thay thế Fraction. Chỉ được thử
// khi Fraction đã throw (biểu thức không thuần hữu tỉ), xem
// evaluateCurrentValue. CASIO 2026-10-20: thêm dạng hai căn thuần
// a√b+c√d; vẫn rơi về thập phân nếu có thêm hạng hữu tỉ hoặc căn thứ ba.
const ZERO_SURD = { rational: ZERO_FRACTION, coeff: ZERO_FRACTION, radicand: 1n };

function surdFromFraction(f) {
  return { rational: f, coeff: ZERO_FRACTION, radicand: 1n };
}

// Chuẩn hoá: nếu coeff đã triệt tiêu (=0) thì ép radicand về 1n, để mọi nơi
// khác chỉ cần kiểm tra `radicand !== 1n` là biết "có phần căn hay không".
function surdNormalize(s) {
  if (s.coeff.num === 0n) return { rational: s.rational, coeff: ZERO_FRACTION, radicand: 1n };
  return s;
}

// Ngưỡng dò nhân tử chính phương — đủ cho số liệu chương trình phổ thông,
// cùng tinh thần với ngưỡng 1000 của fracPowInt. Vượt ngưỡng thì coi như
// không rút gọn được (an toàn: chỉ khiến biểu thức rơi về thập phân, không
// làm sai kết quả).
const SQUARE_FREE_SEARCH_LIMIT = 1000000n;

// n (BigInt dương) → { factor, radicand } sao cho n = factor² × radicand,
// radicand không chia hết cho bình phương nào > 1. Trả null nếu n vượt
// ngưỡng dò (SQUARE_FREE_SEARCH_LIMIT) trước khi dò xong.
function squareFreeFactor(n) {
  if (n === 0n) return { factor: 0n, radicand: 1n };
  let factor = 1n;
  let radicand = n;
  let k = 2n;
  while (k * k <= radicand) {
    if (k > SQUARE_FREE_SEARCH_LIMIT) return null;
    while (radicand % (k * k) === 0n) {
      radicand /= k * k;
      factor *= k;
    }
    k += 1n;
  }
  return { factor, radicand };
}

// √n với n hữu tỉ không âm → SurdValue. PLUS hữu tỉ hóa mẫu không
// chính phương bằng √(a/b)=√(ab)/b. Giữ nhánh 580 đã đối chiếu khi
// rationalize=false; việc dò nhân tử vẫn có SQUARE_FREE_SEARCH_LIMIT.
function surdSqrtFraction(f, rationalize = false) {
  if (f.num < 0n) throw new EngineError('Math ERROR');
  const rootDen = bigIntIsqrt(f.den);
  if (rootDen === null) {
    if (!rationalize) throw new EngineError('Math ERROR');
    const root = surdSqrtFraction({num:f.num*f.den,den:1n});
    return surdDiv(root,surdFromFraction({num:f.den,den:1n}));
  }
  const sf = squareFreeFactor(f.num);
  if (sf === null) throw new EngineError('Math ERROR');
  if (sf.radicand === 1n) {
    return surdFromFraction(fracReduce({ num: sf.factor, den: rootDen }));
  }
  return surdNormalize({
    rational: ZERO_FRACTION,
    coeff: fracReduce({ num: sf.factor, den: rootDen }),
    radicand: sf.radicand
  });
}

// ===== Đổi giá trị chính xác sang khuôn chuỗi cho UI =====
// Engine không để lọt BigInt ra ngoài. getState() của mode Calculate dựng
// đúng hai khuôn này bằng code viết thẳng tại chỗ (từ Tầng 5, đã đối chiếu
// máy thật) — CỐ Ý không sửa lại chỗ đó để dùng chung hai hàm dưới đây, vì
// không muốn động vào đường đã kiểm chứng chỉ để gộp code.
function fractionForDisplay(f) {
  return {
    negative: f.num < 0n,
    num: bigAbs(f.num).toString(),
    den: f.den.toString()
  };
}

function surdForDisplay(s) {
  return {
    rationalNegative: s.rational.num < 0n,
    rationalNum: bigAbs(s.rational.num).toString(),
    rationalDen: s.rational.den.toString(),
    coeffNegative: s.coeff.num < 0n,
    coeffNum: bigAbs(s.coeff.num).toString(),
    coeffDen: s.coeff.den.toString(),
    radicand: s.radicand.toString(),
    ...(s.extra ? {extra:{negative:s.extra.coeff.num<0n,num:bigAbs(s.extra.coeff.num).toString(),
      den:s.extra.coeff.den.toString(),radicand:s.extra.radicand.toString()}} : {})
  };
}

// BUG-014, CASIO 2026-10-20: thêm dạng a√b+c√d (không có hạng hữu tỉ).
// Một căn giữ nguyên schema cũ. Chỉ gắn extra khi thật sự có căn thứ hai.
function surdTerms(value) {
  const terms=[[1n,value.rational]];
  if(value.radicand!==1n) terms.push([value.radicand,value.coeff]);
  if(value.extra) terms.push([value.extra.radicand,value.extra.coeff]);
  return terms;
}

function surdFitsPlusRange(value) {
  return surdTerms(value).every(([radicand,coefficient]) =>
    radicand < 1000n && bigAbs(coefficient.num) < 100n && coefficient.den < 100n);
}

function surdFromTerms(terms) {
  const merged=new Map();
  for(const [d,c] of terms) merged.set(d,fracAdd(merged.get(d)||ZERO_FRACTION,c));
  const rational=merged.get(1n)||ZERO_FRACTION;
  const roots=[...merged].filter(([d,c])=>d!==1n && c.num!==0n)
    .sort(([a],[b])=>a>b?-1:1);
  // CASIO: √2+√3+1 rơi về thập phân; không mở rộng thành hệ đại số tùy ý.
  if(roots.length>2 || (roots.length===2 && rational.num!==0n)) throw new EngineError('Math ERROR');
  if(!roots.length) return surdFromFraction(rational);
  const result={rational,coeff:roots[0][1],radicand:roots[0][0]};
  if(roots.length===2) result.extra={coeff:roots[1][1],radicand:roots[1][0]};
  return result;
}

function surdNeg(a) {
  return surdFromTerms(surdTerms(a).map(([d,c])=>[d,fracNeg(c)]));
}

function surdSign(a) {
  const terms = surdTerms(a).filter(([,coefficient]) => coefficient.num !== 0n);
  if (!terms.length) return 0;
  const sign = terms[0][1].num < 0n ? -1 : 1;
  if (terms.length === 1 || terms.every(([,coefficient]) => (coefficient.num < 0n ? -1 : 1) === sign)) return sign;
  if (terms.length !== 2) throw new EngineError('Math ERROR');
  const squared = ([radicand,coefficient]) => fracMul(fracMul(coefficient,coefficient),{num:radicand,den:1n});
  const difference = fracSub(squared(terms[0]),squared(terms[1])).num;
  return difference === 0n ? 0 : sign * (difference < 0n ? -1 : 1);
}

function surdAdd(a,b) {
  return surdFromTerms([...surdTerms(a),...surdTerms(b)]);
}

function surdSub(a, b) {
  return surdAdd(a, surdNeg(b));
}

function surdMul(a,b) {
  const terms=[];
  for(const [da,ca] of surdTerms(a)) for(const [db,cb] of surdTerms(b)) {
    if(ca.num===0n || cb.num===0n) continue;
    const sf=squareFreeFactor(da*db);
    if(!sf) throw new EngineError('Math ERROR');
    terms.push([sf.radicand,fracMul(fracMul(ca,cb),{num:sf.factor,den:1n})]);
  }
  return surdFromTerms(terms);
}

function surdDiv(a,b) {
  if(b.radicand===1n) {
    if(b.rational.num===0n) throw new EngineError('Math ERROR');
    return surdFromTerms(surdTerms(a).map(([d,c])=>[d,fracDiv(c,b.rational)]));
  }
  // Liên hợp của một nhị thức a+b√d hoặc a√b+c√d có tích hữu tỉ.
  const conjugate=b.extra
    ? {...b,extra:{...b.extra,coeff:fracNeg(b.extra.coeff)}}
    : {...b,coeff:fracNeg(b.coeff)};
  const numerator=surdMul(a,conjugate);
  const square=(c,d)=>fracMul(fracMul(c,c),{num:d,den:1n});
  const denominator=b.extra
    ? fracSub(square(b.coeff,b.radicand),square(b.extra.coeff,b.extra.radicand))
    : fracSub(fracMul(b.rational,b.rational),square(b.coeff,b.radicand));
  return surdDiv(numerator,surdFromFraction(denominator));
}

function surdReciprocal(a) {
  return surdDiv(surdFromFraction({ num: 1n, den: 1n }), a);
}

function surdSquare(a) {
  return surdMul(a, a);
}

function surdCube(a) {
  return surdMul(surdMul(a, a), a);
}

// Số mũ nguyên (có thể âm) — bình phương liên tiếp qua surdMul, cùng
// ngưỡng chặn phình BigInt như fracPowInt.
function surdPowInt(base, exponent) {
  if (Math.abs(exponent) > 1000) throw new EngineError('Math ERROR');
  let result = surdFromFraction({ num: 1n, den: 1n });
  let b = exponent < 0 ? surdReciprocal(base) : base;
  for (let i = 0; i < Math.abs(exponent); i++) {
    result = surdMul(result, b);
    if (bigAbs(result.rational.num) > 10n ** 60n || result.rational.den > 10n ** 60n ||
        bigAbs(result.coeff.num) > 10n ** 60n || result.coeff.den > 10n ** 60n) {
      throw new EngineError('Math ERROR');
    }
  }
  return result;
}

function surdToNumber(s) {
  return fracToNumber(s.rational) + fracToNumber(s.coeff) * Math.sqrt(Number(s.radicand)) +
    (s.extra ? fracToNumber(s.extra.coeff)*Math.sqrt(Number(s.extra.radicand)) : 0);
}

// So sánh gần đúng với giá trị thập phân đã tính — chốt chặn an toàn trước
// khi chấp nhận một SurdValue để hiển thị/lan truyền, cùng khuôn với
// fracRoughlyEqualsFloat (CLAUDE.md: không so sánh bằng trực tiếp hai số thực).
function surdRoughlyEqualsFloat(s, value) {
  const asFloat = surdToNumber(s);
  if (!Number.isFinite(asFloat)) return false;
  if (value === 0) return asFloat === 0;
  return Math.abs(asFloat - value) <= Math.abs(value) * 1e-9;
}

// CASIO 2026-10-09: toán hạng thập phân của phép cộng/trừ dùng
// 15 chữ số có nghĩa, cắt về zero. Giữ phép nhân/chia và kho Ans riêng:
// phép đổi thang không chứng minh các chữ số dùng khi trừ một mốc gần.
// Dùng số nguyên để cắt Fraction, tránh binary float vượt ranh giới chữ số.
function truncateFractionDigits(value, digits) {
  if (value.num === 0n) return value;
  const numerator = bigAbs(value.num);
  let exponent = numerator.toString().length - value.den.toString().length;
  if (exponent >= 0
      ? numerator < value.den * 10n ** BigInt(exponent)
      : numerator * 10n ** BigInt(-exponent) < value.den) exponent--;
  const places = digits - 1 - exponent;
  const scale = 10n ** BigInt(Math.abs(places));
  const coefficient = places >= 0
    ? numerator * scale / value.den
    : numerator / (value.den * scale);
  const signed = value.num < 0n ? -coefficient : coefficient;
  return fracReduce(places >= 0
    ? { num: signed, den: scale }
    : { num: signed * scale, den: 1n });
}

// Mô hình Calculate/CALC đối chiếu CASIO 2026-10-26 (không phải firmware).
// Chốt toán hạng theo chuẩn hóa đã đo; giữ một guard digit trong kết quả.
// Khi hai toán hạng khác dấu triệt tiêu, phần dư nhỏ hơn 10^(bậc−12)
// trở thành zero. Ca 10^13+9−10^13 và +10 phân biệt ranh giới này;
// 12345678901234+10−12345678901234 phân biệt bậc với độ lớn tuyệt đối.
function calculationFractionExponent(value) {
  const num = bigAbs(value.num);
  if (num === 0n) return -Infinity;
  let exponent = num.toString().length - value.den.toString().length;
  if (exponent >= 0 ? num < value.den * 10n ** BigInt(exponent)
    : num * 10n ** BigInt(-exponent) < value.den) exponent--;
  return exponent;
}
// CASIO 2026-11-03: mở quy tắc đã đo ở log sang toán hạng +/−/×/÷/lũy thừa.
// Gần số làm tròn 10 chữ số dưới 10^(bậc−13) thì dùng số đó; ngoài vùng
// này giữ 15 chữ số. So sánh Fraction chính xác, bất đẳng thức nghiêm.
// 10000003.0000009/10000003.0000011 và bình phương 10000003/4/5 phân
// biệt hai phía; không cắt mọi phép toán về một precision thấp hơn.
// Chỉ là mô hình Calculate/CALC; không chứng minh cách lấy mẫu SOLVE.
function normalizeCalculationFractionOperand(value) {
  if (value.num === 0n) return value;
  const rounded = solveProbeRoundFraction(value, 10, true);
  const difference = fracSub(value, rounded);
  const exponent = calculationFractionExponent(value) - 13;
  const numerator = bigAbs(difference.num);
  const small = exponent >= 0
    ? numerator < difference.den * 10n ** BigInt(exponent)
    : numerator * 10n ** BigInt(-exponent) < difference.den;
  return small ? rounded : truncateFractionDigits(value, 15);
}
// CASIO 2026-11-03: phân số ký hiệu chỉ được lưu/hiển thị khi còn khớp
// số học hữu hạn trong một đơn vị ở15 chữ số. Nếu không, Ans/STO sẽ
// thay phần dư thật bằng đáp số đại số (mẫu âm quanh0 mất−9×10^-14).
// Giữ dung sai một đơn vị cho thương lặp như1/6; không đổi nhánh vô tỉ.
function calculationFractionConsistent(symbolic, finite) {
  if (finite === null) return true;
  const difference = fracSub(symbolic, finite);
  if (difference.num === 0n) return true;
  const order = Math.max(calculationFractionExponent(symbolic),calculationFractionExponent(finite)) - 14;
  const numerator = bigAbs(difference.num);
  return order >= 0 ? numerator <= difference.den * 10n ** BigInt(order)
    : numerator * 10n ** BigInt(-order) <= difference.den;
}
function calculationFractionBinary(a, b, operation) {
  a = normalizeCalculationFractionOperand(a);
  b = normalizeCalculationFractionOperand(b);
  if (operation === 'subtract') b = fracNeg(b);
  let result;
  if (operation === 'add' || operation === 'subtract') {
    result = fracAdd(a, b);
    if ((a.num < 0n && b.num > 0n) || (a.num > 0n && b.num < 0n)) {
      const cutoff = Math.max(calculationFractionExponent(a), calculationFractionExponent(b)) - 12;
      if (calculationFractionExponent(result) < cutoff) return { num: 0n, den: 1n };
    }
  } else result = operation === 'multiply' ? fracMul(a, b) : fracDiv(a, b);
  // CASIO 2026-11-03: thương chốt 15 chữ số; ba phép đọc đuôi Ans
  // phân biệt với round16. Các phép toán còn lại giữ guard đã đối chiếu.
  return operation === 'divide' ? truncateFractionDigits(result,15)
    : solveProbeRoundFraction(result, 16, true);
}
// exp10 với phần lẻ giảm về [-0.5,0.5], chuỗi Taylor 40 chữ số.
// Tách khỏi Padé của phép dò zero SOLVE: hai đường có bằng chứng riêng.
function calculationExp10Fraction(argument) {
  const exponent = Math.round(fracToNumber(argument));
  if (!Number.isFinite(exponent) || Math.abs(exponent) > 100) throw new EngineError('Math ERROR');
  const remainder = fracSub(argument, { num: BigInt(exponent), den: 1n });
  const z = remainder.num * SOLVE_PROBE_LN10 / remainder.den;
  let term = SOLVE_PROBE_SCALE, total = term;
  for (let k = 1n; k <= 200n; k++) {
    term = term * z / (SOLVE_PROBE_SCALE * k);
    if (term === 0n) break;
    total += term;
  }
  const power = 10n ** BigInt(Math.abs(exponent));
  return solveProbeRoundFraction(fracReduce(exponent >= 0
    ? { num: total * power, den: SOLVE_PROBE_SCALE }
    : { num: total, den: SOLVE_PROBE_SCALE * power }), 15, true);
}
function calculationFractionPower(base, exponent) {
  base = normalizeCalculationFractionOperand(base);
  const exact = fracPowInt(base, exponent);
  // Lũy thừa nguyên vượt 15 chữ số đi qua log10 làm tròn 16 rồi exp10.
  // Cùng quy tắc khớp 1999/2015/2016/12345; 2023/1024 là đối chứng sau
  // khi chọn mô hình. Bình phương/lập phương có đường nhân riêng.
  if (base.den === 1n && exponent > 3 && calculationFractionExponent(exact) >= 15) {
    const logarithm = decimalLog10Fraction(fracToNumber({ num: bigAbs(base.num), den: 1n }), 16);
    const result = calculationExp10Fraction(fracMul(logarithm, { num: BigInt(exponent), den: 1n }));
    return base.num < 0n && exponent % 2 ? fracNeg(result) : result;
  }
  return solveProbeRoundFraction(exact, 16, true);
}

function plusSolveRegisterAdd(a, b) {
  const sum = fracAdd(a, b);
  if ((a.num < 0n && b.num > 0n) || (a.num > 0n && b.num < 0n)) {
    // Đối chiếu thanh ghi và Calculate PLUS: phần dư quanh 1 và 10^9
    // phân biệt hai phía ngưỡng tương đối 10^-18.
    const cutoff = Math.max(calculationFractionExponent(a), calculationFractionExponent(b)) - 18;
    if (calculationFractionExponent(sum) < cutoff) return ZERO_FRACTION;
  }
  return sum;
}

// Bộ phân tích Fraction chạy SAU bộ số thực đã kiểm tra cú pháp/miền.
// Mặc định giữ chính xác để hiển thị phân số; nếu không biểu diễn được
// (hàm vô tỉ, căn không nguyên...), caller dùng nhánh số thực/surd/π.
// sumDigits='casio' chọn số học hữu hạn Calculate, cập nhật kết quả số.
// sumDigits nguyên dương giữ đường probe cũ chỉ cắt toán hạng cộng/trừ.
// A candidate rational logarithm is accepted only after an exact power
// identity. Squaring both positive operands also covers pure square roots.
function exactLogarithmFraction880(baseSquared, argumentSquared) {
  if (baseSquared.num<=0n || argumentSquared.num<=0n ||
      baseSquared.num===baseSquared.den || fracDigitCount(baseSquared)>256 ||
      fracDigitCount(argumentSquared)>256) throw new EngineError('Math ERROR');
  const ratio=Math.log(fracToNumber(argumentSquared))/Math.log(fracToNumber(baseSquared));
  if (!Number.isFinite(ratio)) throw new EngineError('Math ERROR');
  const candidates=[{num:BigInt(Math.round(ratio)),den:1n},approximateDisplayFraction(ratio)];
  for (const candidate of candidates) {
    if (!candidate || bigAbs(candidate.num)>1000n || candidate.den>1000n) continue;
    const left=fracPowInt(baseSquared,Number(candidate.num),4096);
    const right=fracPowInt(argumentSquared,Number(candidate.den),4096);
    if (left.num*right.den===right.num*left.den) return candidate;
  }
  throw new EngineError('Math ERROR');
}

// Positive products/quotients of nested radicals are rational powers of a
// rational base. Keep this proof separate from the finite numeric evaluator.
function positiveRadicalPower880(expression, ansExact, variablesExact, angleUnit) {
  const tokens=tokenize(expression);
  let pos=0;
  const peek=()=>tokens[pos]?.type;
  const unsupported=()=>{throw new EngineError('Math ERROR');};
  const bounded=value=>{
    if (value.base.num<=0n || fracDigitCount(value.base)>256 ||
        bigAbs(value.power.num)>1000n || value.power.den>1000n) unsupported();
    return value;
  };
  const rational=value=>{
    if (!value) unsupported();
    return bounded({base:value,power:{num:1n,den:1n},depth:0});
  };
  const raise=(value,power)=>bounded({...value,power:fracMul(value.power,power)});
  const merge=(a,b,divide)=>{
    const denominator=a.power.den/bigGcd(a.power.den,b.power.den)*b.power.den;
    if (denominator>1000n) unsupported();
    const ap=a.power.num*(denominator/a.power.den),bp=b.power.num*(denominator/b.power.den);
    if (bigAbs(ap)>1000n || bigAbs(bp)>1000n) unsupported();
    const left=fracPowInt(a.base,Number(ap),4096),right=fracPowInt(b.base,Number(bp),4096);
    return bounded({base:divide ? fracDiv(left,right) : fracMul(left,right),
      power:{num:1n,den:denominator},depth:Math.max(a.depth,b.depth)});
  };
  function group() {
    if (peek()!=='LPAREN') unsupported();
    pos++;
    const value=term();
    if (peek()!=='RPAREN') unsupported();
    pos++;
    return value;
  }
  function atom() {
    const type=peek();
    if (type==='LPAREN') return group();
    if (type==='SQRT' || type==='CBRT') {
      pos++;
      const value=group();
      return {...raise(value,{num:1n,den:type==='SQRT' ? 2n : 3n}),depth:value.depth+1};
    }
    const token=tokens[pos++];
    if (type==='NUMBER') return rational(fractionFromDecimalString(token.sourceRaw||token.raw));
    if (type==='ANS') return rational(ansExact);
    if (type==='PREANS') return rational(variablesExact.PreAns);
    if (type==='VARIABLE') return rational(variablesExact[token.name]);
    unsupported();
  }
  function postfix(value) {
    while (['SQUARE','CUBE','RECIPROCAL'].includes(peek())) {
      const type=tokens[pos++].type;
      value=raise(value,{num:type==='SQUARE' ? 2n : type==='CUBE' ? 3n : -1n,den:1n});
    }
    return value;
  }
  function power() {
    let value=postfix(atom());
    while (peek()==='CARET') {
      pos++;
      const start=pos;
      if (peek()==='LPAREN') {
        let depth=0;
        do {
          if (pos>=tokens.length) unsupported();
          const type=tokens[pos++].type;
          if (type==='LPAREN') depth++;
          if (type==='RPAREN') depth--;
        } while (depth);
      } else if (['NUMBER','ANS','PREANS','VARIABLE'].includes(peek())) pos++;
      else unsupported();
      value=postfix(raise(value,evaluateExpressionExact(tokens.slice(start,pos),ansExact,variablesExact,angleUnit,'plus-number')));
    }
    return value;
  }
  function implicit() {
    let value=power();
    while (['NUMBER','ANS','PREANS','VARIABLE','LPAREN','SQRT','CBRT'].includes(peek())) value=merge(value,power(),false);
    return value;
  }
  function term() {
    let value=implicit();
    while (peek()==='MUL' || peek()==='DIV') {
      const divide=tokens[pos++].type==='DIV';
      value=merge(value,implicit(),divide);
    }
    return value;
  }
  const value=term();
  if (pos!==tokens.length) unsupported();
  return value;
}

function radicalPowerEquality880(a,b) {
  if (!a || !b || Math.max(a.depth,b.depth)<2) return false;
  try {
    const denominator=a.power.den/bigGcd(a.power.den,b.power.den)*b.power.den;
    const ap=a.power.num*(denominator/a.power.den),bp=b.power.num*(denominator/b.power.den);
    if (denominator>1000n || bigAbs(ap)>1000n || bigAbs(bp)>1000n) return false;
    const left=fracPowInt(a.base,Number(ap),4096),right=fracPowInt(b.base,Number(bp),4096);
    return left.num*right.den===right.num*left.den;
  } catch (_) {return false;}
}

function evaluateExpressionExact(expr, ansExact, variablesExact, angleUnit, sumDigits = 0) {
  const calculate = sumDigits === 'casio';
  const plusPowers = typeof sumDigits === 'string' && sumDigits.startsWith('plus-');
  const plusRegister = sumDigits === 'plus-solve-register';
  const plusNumber = sumDigits === 'plus-number';
  const plusUnderflow = sumDigits === 'plus-underflow' || plusNumber;
  const finiteAdd = plusRegister || plusUnderflow;
  const normalizeUnderflow = value => plusUnderflow && value.num !== 0n &&
    bigAbs(value.num) * 10n ** 99n < value.den ? ZERO_FRACTION : value;
  const binary = operation => (a,b) => normalizeUnderflow(operation(a,b));
  const add = calculate ? (a,b) => calculationFractionBinary(a,b,'add') : finiteAdd ? binary(plusSolveRegisterAdd) : binary(fracAdd);
  const subtract = calculate ? (a,b) => calculationFractionBinary(a,b,'subtract')
    : finiteAdd ? (a,b) => normalizeUnderflow(plusSolveRegisterAdd(a, fracNeg(b))) : binary(fracSub);
  const multiply = calculate ? (a,b) => calculationFractionBinary(a,b,'multiply') : binary(fracMul);
  const divide = calculate ? (a,b) => calculationFractionBinary(a,b,'divide') : binary(fracDiv);
  const power = calculate ? calculationFractionPower : sumDigits === 'plus-coefficient'
    ? (base,exponent) => fracPowInt(base,exponent,400) : plusUnderflow
    ? (base,exponent) => normalizeUnderflow(fracPowInt(base,exponent,400)) : fracPowInt;
  const tokens = Array.isArray(expr) ? expr : tokenize(expr);
  let pos = 0;

  function peek() {
    return pos < tokens.length ? tokens[pos].type : null;
  }

  function advance() {
    return tokens[pos++];
  }

  function isImplicitMultTrigger() {
    const t = peek();
    return t === 'NUMBER' || t === 'ANS' || t === 'PREANS' || t === 'LPAREN' || t === 'SQRT' || t === 'CBRT' || t === 'VARIABLE' ||
      t === 'GCD' || t === 'LCM';
  }

  function parseFunctionArgument() {
    if (peek() !== 'LPAREN') throw new EngineError('Syntax ERROR');
    advance();
    const value = parseExpression();
    if (peek() !== 'RPAREN') throw new EngineError('Syntax ERROR');
    advance();
    return value;
  }

  function parseAtom() {
    const type = peek();
    if (type === 'NUMBER') {
      const token = advance();
      return normalizeUnderflow(fractionFromDecimalString(calculate ? token.raw : (token.sourceRaw || token.raw)));
    }
    if (type === 'ANS') {
      advance();
      if (ansExact === null) throw new EngineError('Math ERROR');
      return ansExact;
    }
    if (type === 'PREANS') {
      advance();
      const value = variablesExact.PreAns;
      if (value == null) throw new EngineError('Math ERROR');
      return value;
    }
    if (type === 'VARIABLE') {
      const value = variablesExact[advance().name];
      if (value == null) throw new EngineError('Math ERROR');
      return value;
    }
    if (type === 'LPAREN') {
      advance();
      const value = parseExpression();
      if (peek() !== 'RPAREN') throw new EngineError('Syntax ERROR');
      advance();
      return value;
    }
    // Căn NGUYÊN ĐÚNG của cả tử và mẫu — chỉ giữ chính xác khi cả hai đều là
    // số chính phương/lập phương, ngược lại throw (căn vô tỉ, ngoài phạm vi
    // v1 — xem project_fraction_display_deferred).
    if (type === 'SQRT') {
      advance();
      const value = parseFunctionArgument();
      if (value.num < 0n) throw new EngineError('Math ERROR');
      const rootNum = bigIntIsqrt(value.num);
      const rootDen = bigIntIsqrt(value.den);
      if (rootNum === null || rootDen === null) throw new EngineError('Math ERROR');
      return fracReduce({ num: rootNum, den: rootDen });
    }
    if (type === 'CBRT') {
      advance();
      const value = parseFunctionArgument();
      const rootNum = bigIntIcbrt(value.num);
      const rootDen = bigIntIcbrt(value.den);
      if (rootNum === null || rootDen === null) throw new EngineError('Math ERROR');
      return fracReduce({ num: rootNum, den: rootDen });
    }
    if ((plusNumber || sumDigits==='plus-associative') && (type==='LOGBASE' || type==='LOG')) {
      advance();
      if (peek()!=='LPAREN') throw new EngineError('Syntax ERROR');
      advance();
      const arguments_=[];
      let start=pos,depth=0,closed=false;
      while (pos<tokens.length) {
        const next=peek();
        if (next==='RPAREN' && depth===0) {
          arguments_.push(tokens.slice(start,pos));advance();closed=true;break;
        }
        if (next==='COMMA' && depth===0) {
          arguments_.push(tokens.slice(start,pos));advance();start=pos;continue;
        }
        if (next==='LPAREN') depth++;
        if (next==='RPAREN') depth--;
        advance();
      }
      if (!closed || arguments_.some(part=>!part.length) ||
          (type==='LOGBASE' ? arguments_.length!==2 : ![1,2].includes(arguments_.length)))
        throw new EngineError('Syntax ERROR');
      const squaredOperand=part=>{
        try {
          const value=evaluateExpressionExact(part,ansExact,variablesExact,angleUnit,sumDigits);
          if (value.num<=0n) throw new EngineError('Math ERROR');
          return fracMul(value,value);
        } catch (_) {
          const registers=Object.fromEntries(Object.entries(variablesExact).map(([name,value])=>
            [name,value ? surdFromFraction(value) : null]));
          const value=evaluateExpressionExactSurd(part,ansExact ? surdFromFraction(ansExact) : null,registers,angleUnit);
          if (surdSign(value)<=0) throw new EngineError('Math ERROR');
          const squared=surdSquare(value);
          if (surdTerms(squared).some(([radicand,c])=>radicand!==1n && c.num!==0n)) throw new EngineError('Math ERROR');
          return squared.rational;
        }
      };
      const base=arguments_.length===2 ? squaredOperand(arguments_[0]) : {num:100n,den:1n};
      return exactLogarithmFraction880(base,squaredOperand(arguments_.at(-1)));
    }
    if (type === 'ANGLEUNIT') {
      const unit = advance().unit;
      const value = parseFunctionArgument();
      const scale = angleRationalScale(unit, angleUnit);
      if (scale === null) throw new EngineError('Math ERROR');
      return multiply(value, scale);
    }
    if (type === 'ABS') {
      advance();
      const value = parseFunctionArgument();
      return {num:bigAbs(value.num),den:value.den};
    }
    // sin/cos/tan/log/ln/e^... luôn vô tỉ hoặc ngoài phạm vi v1 — rơi vào
    // đây, throw ngay, không cần liệt kê riêng từng loại.
    if (type === 'GCD' || type === 'LCM') {
      advance();
      const [a, b] = parseIntegerPairArguments(peek, advance, parseExpression);
      if (a.den !== 1n || b.den !== 1n) throw new EngineError('Argument ERROR');
      return { num: integerPairBigInt(type, a.num, b.num), den: 1n };
    }
    throw new EngineError('Math ERROR');
  }

  // Xem chú thích parseEngSuffix ở bộ tính số thực.
  function parseEngSuffix() {
    let value = parseAtom();
    let applied = false;
    while (peek() === 'ENGSYM') {
      value = multiply(value, engineerFactorFraction(advance().exponent));
      applied = true;
    }
    if (applied && peek() === 'NUMBER') {
      throw new EngineError('Syntax ERROR');
    }
    return value;
  }

  function parsePowerBase(initialValue) {
    let value = initialValue === undefined ? parseEngSuffix() : initialValue;
    while (true) {
      const t = peek();
      if (t === 'SQUARE') { advance(); value = multiply(value, value); }
      else if (t === 'CUBE') { advance(); value = multiply(multiply(value, value), value); }
      else if (t === 'FACTORIAL') {
        advance();
        if (value.den !== 1n || value.num < 0n) throw new EngineError('Math ERROR');
        let result = 1n;
        for (let i = 2n; i <= value.num; i++) result *= i;
        value = { num: result, den: 1n };
      } else if (t === 'PERCENT') {
        advance();
        value = divide(value, { num: 100n, den: 1n });
      } else if (t === 'RECIPROCAL') {
        advance();
        value = divide({ num: 1n, den: 1n }, value);
      } else {
        break;
      }
    }
    return value;
  }

  function parsePower() {
    let base = parsePowerBase();
    while (peek() === 'CARET') {
      advance();
      const exponent = plusPowers ? parseEngSuffix() : parsePower();
      if (exponent.den !== 1n) {
        if (!plusNumber && sumDigits !== 'plus-associative') throw new EngineError('Math ERROR');
        // PLUS retains exact rational roots for both n-th-root templates
        // and equivalent fractional powers. Irrational roots still fall back.
        const num = bigIntExactRoot(base.num,exponent.den);
        const den = bigIntExactRoot(base.den,exponent.den);
        if (num === null || den === null) throw new EngineError('Math ERROR');
        base = fracReduce({num,den});
      }
      base = power(base, Number(exponent.num));
      if (!plusPowers) break;
      base = parsePowerBase(base);
    }
    return base;
  }

  function parseImplicitFactor() {
    const factor = () => parseLineFraction(peek, advance, parsePower, {add:add,divide:divide,negate:fracNeg});
    let value = factor();
    while (isImplicitMultTrigger()) value = multiply(value, factor());
    return value;
  }

  function parseBeforeConversion() {
    const signs = readPrefixSigns(peek, advance);
    const value = parseImplicitFactor();
    return signs % 2 ? fracNeg(value) : value;
  }

  function parseUnary() {
    const value=parseBeforeConversion();
    return peek()==='CONVERSION'?parseUnitConversionSuffix(value,peek,advance,parsePower,isImplicitMultTrigger,unitConversionArithmetic('fraction')):value;
  }

  function parseCombinatoric() {
    let value = parseUnary();
    while (peek() === 'PERM' || peek() === 'COMB') {
      const kind = advance().type === 'PERM' ? 'P' : 'C';
      const rhs = parseUnary();
      if (value.den !== 1n || rhs.den !== 1n) throw new EngineError('Math ERROR');
      value = { num: combinatoricBigInt(value.num, rhs.num, kind), den: 1n };
    }
    return value;
  }

  function parseTerm() {
    let value = parseCombinatoric();
    while (true) {
      if (peek() === 'MUL') { advance(); value = multiply(value, parseCombinatoric()); }
      else if (peek() === 'REMDIV') {
        advance();const rhs=parseCombinatoric();const pair=divisionRemainderNumber(fracToNumber(value),fracToNumber(rhs));
        value=pair.remainder===null?divide(value,rhs):{num:BigInt(pair.value),den:1n};
      }
      else if (peek() === 'DIV') { advance(); value = divide(value, parseCombinatoric()); }
      else break;
    }
    return value;
  }

  function parseExpression() {
    let value = parseTerm();
    while (true) {
      if (peek() === 'PLUS' || peek() === 'MINUS') {
        const isSubtract = advance().type === 'MINUS';
        let rhs = parseTerm();
        if (typeof sumDigits === 'number' && sumDigits > 0) {
          value = truncateFractionDigits(value, sumDigits);
          rhs = truncateFractionDigits(rhs, sumDigits);
        }
        value = isSubtract ? subtract(value, rhs) : add(value, rhs);
      }
      else break;
    }
    return value;
  }

  if (tokens.length === 0) throw new EngineError('Syntax ERROR');
  const result = parseExpression();
  if (pos !== tokens.length) throw new EngineError('Syntax ERROR');
  return result;
}

// Bộ tính TOÁN SONG SONG thứ BA — làm việc trên SurdValue (rational +
// coeff×√radicand) thay vì Fraction, để hiển thị "3√2" thay vì thập phân.
// CHỈ được gọi khi evaluateExpressionExact (Fraction) đã throw (biểu thức
// không thuần hữu tỉ) — xem evaluateCurrentValue. Sao chép nguyên khung cú
// pháp của evaluateExpressionExact (không sửa hàm đó — đã xác nhận máy
// thật, không muốn động vào), chỉ đổi Fraction→SurdValue và nới lỏng case
// SQRT. Phạm vi v1: chỉ căn bậc hai (CBRT và các hàm vô tỉ khác vẫn throw
// ngay, giữ nguyên hành vi hiện có — xem kế hoạch bước 1).
function evaluateExpressionExactSurd(expr, ansExactSurd, variablesExactSurd, angleUnit, plusRange = false) {
  const tokens = Array.isArray(expr) ? expr : tokenize(expr);
  let pos = 0;

  // PLUS drops the radical form when an arithmetic result exceeds its
  // range. A later inverse operation cannot restore it (100√2÷100).
  // Root atoms stay available until combined, allowing √1001−√1001+√2.
  const bounded = value => {
    if (plusRange && value.radicand !== 1n && !surdFitsPlusRange(value)) {
      throw new EngineError('Math ERROR');
    }
    return value;
  };
  const multiply = (...args) => bounded(surdMul(...args));
  const divide = (...args) => bounded(surdDiv(...args));
  const add = (...args) => bounded(surdAdd(...args));
  const subtract = (...args) => bounded(surdSub(...args));
  const negate = (...args) => bounded(surdNeg(...args));
  const square = (...args) => bounded(surdSquare(...args));
  const cube = (...args) => bounded(surdCube(...args));
  const power = (...args) => bounded(surdPowInt(...args));
  const reciprocal = (...args) => bounded(surdReciprocal(...args));

  function peek() {
    return pos < tokens.length ? tokens[pos].type : null;
  }

  function advance() {
    return tokens[pos++];
  }

  function isImplicitMultTrigger() {
    const t = peek();
    return t === 'NUMBER' || t === 'ANS' || t === 'PREANS' || t === 'LPAREN' || t === 'SQRT' || t === 'CBRT' || t === 'VARIABLE' ||
      // SIN/COS/TAN phải kích hoạt nhân ẩn, nếu không "2sin(60)" bị đọc thành
      // hai vế rời và không ra được √3 — ĐÃ XÁC NHẬN máy thật 2026-08-17.
      t === 'SIN' || t === 'COS' || t === 'TAN' || t === 'GCD' || t === 'LCM' || plusRange && t === 'ABS';
  }

  function parseFunctionArgument() {
    if (peek() !== 'LPAREN') throw new EngineError('Syntax ERROR');
    advance();
    const value = parseExpression();
    if (peek() !== 'RPAREN') throw new EngineError('Syntax ERROR');
    advance();
    return value;
  }

  function parseAtom() {
    const type = peek();
    if (type === 'NUMBER') {
      return surdFromFraction(fractionFromDecimalString(advance().raw));
    }
    if (type === 'ANS') {
      advance();
      if (ansExactSurd === null) throw new EngineError('Math ERROR');
      return ansExactSurd;
    }
    if (type === 'PREANS') {
      advance();
      const value = variablesExactSurd.PreAns;
      if (value === null) throw new EngineError('Math ERROR');
      return value;
    }
    if (type === 'VARIABLE') {
      const value = variablesExactSurd[advance().name];
      if (value === null) throw new EngineError('Math ERROR');
      return value;
    }
    if (type === 'LPAREN') {
      advance();
      const value = parseExpression();
      if (peek() !== 'RPAREN') throw new EngineError('Syntax ERROR');
      advance();
      return value;
    }
    // Nới lỏng so với bộ Fraction: tử số không cần chính phương tuyệt đối,
    // chỉ cần rút gọn nhân tử chính phương được (squareFreeFactor).
    // PLUS còn hữu tỉ hóa mẫu — xem surdSqrtFraction.
    if (type === 'SQRT') {
      advance();
      const value = parseFunctionArgument();
      if (value.radicand !== 1n) throw new EngineError('Math ERROR'); // √ lồng √ — ngoài phạm vi v1
      return surdSqrtFraction(value.rational,plusRange);
    }
    if (type === 'ABS' && plusRange) {
      advance();
      const value = bounded(parseFunctionArgument());
      return surdSign(value) < 0 ? negate(value) : value;
    }
    if (type === 'ANGLEUNIT') {
      const unit = advance().unit;
      const value = parseFunctionArgument();
      const scale = angleRationalScale(unit, angleUnit);
      if (scale === null) throw new EngineError('Math ERROR');
      return multiply(value, surdFromFraction(scale));
    }
    // sin/cos/tan tại góc đặc biệt → SurdValue, tham gia phép tính như một
    // giá trị bình thường. ĐÃ XÁC NHẬN máy thật 2026-08-17: "2sin(60)=√3" và
    // "sin(30)+1=3/2" — tức máy KHÔNG giới hạn ở "một lệnh lượng giác trần"
    // như ranh giới v1 của bước 3 từng tự đặt (ranh giới đó là quyết định
    // chủ động lúc đầu, nay đã bị máy thật bác bỏ; hai lần thử trước đều
    // chọn nhầm ví dụ suy biến "2sin(30)=1" nên không lộ ra).
    //
    // Góc bên trong tính qua surdToNumber → số thực, vì lookupSpecialAngleDeg
    // vốn nhận số độ. Biểu thức nào bộ Surd không đọc nổi (vd chứa π:
    // "sin(π÷6)") thì throw ở đây và rơi xuống tryExactForwardTrig — fallback
    // đó dùng bộ thập phân nên hiểu π, xem chỗ gọi trong evaluateCurrentValue.
    if (type === 'SIN' || type === 'COS' || type === 'TAN') {
      const func = type === 'SIN' ? 'sin' : (type === 'COS' ? 'cos' : 'tan');
      advance();
      // PLUS retains exact special-angle values inside compound expressions
      // containing rational multiples of pi (native triangle controls,
      // 2026-11-20). Require exact integer degrees rather than float proximity.
      if (plusRange && angleUnit === 'rad' && peek() === 'LPAREN') {
        let end = pos + 1, depth = 1;
        while (end < tokens.length && depth > 0) {
          if (tokens[end].type === 'LPAREN') depth++;
          else if (tokens[end].type === 'RPAREN') depth--;
          if (depth > 0) end++;
        }
        const argument = tokens.slice(pos + 1, end);
        if (depth === 0 && argument.some(token => token.type === 'PI')) {
          try {
            const pi = evaluateExpressionExactPi(argument, null, {}, angleUnit, true);
            const degrees = piValConvertAngle(pi, 'rad', 'deg');
            if (degrees.degree === 0 && degrees.rational.den === 1n) {
              const turn = ((degrees.rational.num % 360n) + 360n) % 360n;
              const exact = lookupSpecialAngleDeg(func, Number(turn));
              if (exact != null) { pos = end + 1; return exact; }
            }
          } catch (_) { /* Mixed or non-special arguments keep the existing path. */ }
        }
      }
      const argValue = parseFunctionArgument();
      const angleValue = surdToNumber(argValue);
      const angleDeg = convertAngleValue(angleValue, angleUnit, 'deg');
      const looked = lookupSpecialAngleDeg(func, angleDeg);
      // null = góc không đặc biệt (vd sin(37)); undefined = không xác định
      // (tan 90°). Cả hai đều throw để rơi về thập phân — KHÔNG phải lỗi
      // hiển thị lên màn hình, vì nhánh exact này chạy sau khi bộ thập phân
      // đã tính xong và mọi throw ở đây đều bị nuốt.
      if (looked === null || looked === undefined) throw new EngineError('Math ERROR');
      return looked;
    }
    // ∛ và mọi hàm vô tỉ khác (log/ln/lượng giác ngược...) giữ nguyên throw —
    // ngoài phạm vi (chỉ căn bậc hai + lượng giác thuận góc đặc biệt).
    if (type === 'GCD' || type === 'LCM') {
      advance();
      const [a, b] = parseIntegerPairArguments(peek, advance, parseExpression);
      if (a.radicand !== 1n || b.radicand !== 1n ||
          a.rational.den !== 1n || b.rational.den !== 1n) {
        throw new EngineError('Argument ERROR');
      }
      return surdFromFraction({
        num: integerPairBigInt(type, a.rational.num, b.rational.num), den: 1n
      });
    }
    throw new EngineError('Math ERROR');
  }

  // Xem chú thích parseEngSuffix ở bộ tính số thực.
  function parseEngSuffix() {
    let value = parseAtom();
    let applied = false;
    while (peek() === 'ENGSYM') {
      value = multiply(value, surdFromFraction(engineerFactorFraction(advance().exponent)));
      applied = true;
    }
    if (applied && peek() === 'NUMBER') {
      throw new EngineError('Syntax ERROR');
    }
    return value;
  }

  function parsePowerBase(initialValue) {
    let value = initialValue === undefined ? parseEngSuffix() : initialValue;
    while (true) {
      const t = peek();
      if (t === 'SQUARE') { advance(); value = square(value); }
      else if (t === 'CUBE') { advance(); value = cube(value); }
      else if (t === 'FACTORIAL') {
        advance();
        if (value.radicand !== 1n || value.rational.den !== 1n || value.rational.num < 0n) throw new EngineError('Math ERROR');
        let result = 1n;
        for (let i = 2n; i <= value.rational.num; i++) result *= i;
        value = surdFromFraction({ num: result, den: 1n });
      } else if (t === 'PERCENT') {
        advance();
        value = multiply(value, surdFromFraction({ num: 1n, den: 100n }));
      } else if (t === 'RECIPROCAL') {
        advance();
        value = reciprocal(value);
      } else {
        break;
      }
    }
    return value;
  }

  function parsePower() {
    let base = parsePowerBase();
    while (peek() === 'CARET') {
      advance();
      const exponent = plusRange ? parseEngSuffix() : parsePower();
      if (exponent.radicand !== 1n || exponent.rational.den !== 1n) throw new EngineError('Math ERROR');
      base = power(base, Number(exponent.rational.num));
      if (!plusRange) break;
      base = parsePowerBase(base);
    }
    return base;
  }

  function parseImplicitFactor() {
    const factor = () => parseLineFraction(peek, advance, parsePower, {add,divide,negate});
    let value = factor();
    while (isImplicitMultTrigger()) value = multiply(value, factor());
    return value;
  }

  function parseBeforeConversion() {
    const signs = readPrefixSigns(peek, advance);
    const value = parseImplicitFactor();
    return signs % 2 ? negate(value) : value;
  }

  function parseUnary() {
    const value=parseBeforeConversion();
    return peek()==='CONVERSION'?parseUnitConversionSuffix(value,peek,advance,parsePower,isImplicitMultTrigger,unitConversionArithmetic('surd')):value;
  }

  function parseCombinatoric() {
    let value = parseUnary();
    while (peek() === 'PERM' || peek() === 'COMB') {
      const kind = advance().type === 'PERM' ? 'P' : 'C';
      const rhs = parseUnary();
      if (value.radicand !== 1n || rhs.radicand !== 1n ||
          value.rational.den !== 1n || rhs.rational.den !== 1n) {
        throw new EngineError('Math ERROR');
      }
      value = surdFromFraction({
        num: combinatoricBigInt(value.rational.num, rhs.rational.num, kind), den: 1n
      });
    }
    return value;
  }

  function parseTerm() {
    let value = parseCombinatoric();
    while (true) {
      if (peek() === 'MUL') { advance(); value = multiply(value, parseCombinatoric()); }
      else if (peek() === 'DIV') { advance(); value = divide(value, parseCombinatoric()); }
      else break;
    }
    return value;
  }

  function parseExpression() {
    let value = parseTerm();
    while (true) {
      if (peek() === 'PLUS') { advance(); value = add(value, parseTerm()); }
      else if (peek() === 'MINUS') { advance(); value = subtract(value, parseTerm()); }
      else break;
    }
    return value;
  }

  if (tokens.length === 0) throw new EngineError('Syntax ERROR');
  const result = parseExpression();
  if (pos !== tokens.length) throw new EngineError('Syntax ERROR');
  return result;
}

// ===== Bảng tra lượng giác góc đặc biệt — Tầng 5, "dạng số vô tỉ" bước 3
// (xem memory project_fraction_display_deferred) =====
// KHÔNG phải một bộ tính symbolic tổng quát: chỉ nhận diện khi biểu thức đã
// gõ là ĐÚNG MỘT lệnh lượng giác trần (sin(...)/cos(...)/tan(...)/
// sin⁻¹(...)/cos⁻¹(...)/tan⁻¹(...)), tra theo góc tham chiếu {0°,30°,45°,
// 60°,90°} — 15°, 75°... (cần cộng hai căn_số khác nhau) ngoài phạm vi,
// giống ranh giới "hai căn_số khác nhau" đã có ở bước 1.

// Bảng magnitude 5 góc tham chiếu (góc phần tư I). tan tại 90° là
// `undefined` (không xác định) — quy ước JS, không phải NaN/Infinity.
function specialAngleTableDeg(refDeg) {
  switch (refDeg) {
    case 0: return { sin: surdFromFraction(ZERO_FRACTION), cos: surdFromFraction({ num: 1n, den: 1n }), tan: surdFromFraction(ZERO_FRACTION) };
    case 30: return {
      sin: surdFromFraction({ num: 1n, den: 2n }),
      cos: surdNormalize({ rational: ZERO_FRACTION, coeff: { num: 1n, den: 2n }, radicand: 3n }),
      tan: surdNormalize({ rational: ZERO_FRACTION, coeff: { num: 1n, den: 3n }, radicand: 3n })
    };
    case 45: return {
      sin: surdNormalize({ rational: ZERO_FRACTION, coeff: { num: 1n, den: 2n }, radicand: 2n }),
      cos: surdNormalize({ rational: ZERO_FRACTION, coeff: { num: 1n, den: 2n }, radicand: 2n }),
      tan: surdFromFraction({ num: 1n, den: 1n })
    };
    case 60: return {
      sin: surdNormalize({ rational: ZERO_FRACTION, coeff: { num: 1n, den: 2n }, radicand: 3n }),
      cos: surdFromFraction({ num: 1n, den: 2n }),
      tan: surdNormalize({ rational: ZERO_FRACTION, coeff: { num: 1n, den: 1n }, radicand: 3n })
    };
    case 90: return { sin: surdFromFraction({ num: 1n, den: 1n }), cos: surdFromFraction(ZERO_FRACTION), tan: undefined };
    default: return null;
  }
}

// Tra sin/cos/tan chính xác tại một góc bất kỳ (độ), qua rút gọn về góc
// tham chiếu {0,30,45,60,90} và áp dấu theo góc phần tư (quy tắc "Nhất-Sin-
// Tan-Cos" chuẩn, không phải hành vi máy thật riêng). Trả null khi góc
// không đặc biệt (không phải lỗi — rơi về thập phân bình thường).
const ANGLE_EPS_DEG = 1e-7;
function lookupSpecialAngleDeg(func, angleDeg) {
  const A = ((angleDeg % 360) + 360) % 360;
  const near = (target) => Math.abs(A - target) < ANGLE_EPS_DEG;

  if (near(0) || near(360)) return specialAngleTableDeg(0)[func];
  if (near(90)) return specialAngleTableDeg(90)[func];
  if (near(180)) {
    const base = specialAngleTableDeg(0)[func];
    return func === 'cos' ? surdNeg(base) : base; // sin180=0,cos180=−1,tan180=0
  }
  if (near(270)) {
    const base = specialAngleTableDeg(90)[func];
    if (base === undefined) return undefined;
    return func === 'cos' ? base : surdNeg(base); // sin270=−1,cos270=0,tan270 kđ
  }

  let quadrant;
  let ref;
  if (A < 90) { quadrant = 1; ref = A; }
  else if (A < 180) { quadrant = 2; ref = 180 - A; }
  else if (A < 270) { quadrant = 3; ref = A - 180; }
  else { quadrant = 4; ref = 360 - A; }

  let refDeg = null;
  for (const cand of [30, 45, 60]) {
    if (Math.abs(ref - cand) < ANGLE_EPS_DEG) { refDeg = cand; break; }
  }
  if (refDeg === null) return null;

  const base = specialAngleTableDeg(refDeg)[func];
  if (base === undefined) return undefined;
  // Dấu theo góc phần tư (ASTC): I mọi hàm dương; II chỉ sin dương; III chỉ
  // tan dương; IV chỉ cos dương.
  const positive =
    quadrant === 1 ||
    (quadrant === 2 && func === 'sin') ||
    (quadrant === 3 && func === 'tan') ||
    (quadrant === 4 && func === 'cos');
  return positive ? base : surdNeg(base);
}

// Kiểm "closed" có đúng dạng MỘT lệnh hàm trần bao trọn toàn chuỗi hay
// không (vd "sin(30+5)" đúng, "sin(30)+cos(60)" KHÔNG — dấu "(" đầu không
// đóng ở cuối chuỗi). Trả về nội dung bên trong ngoặc, hoặc null nếu không
// khớp cấu trúc này.
function extractBareFunctionArg(closed, keyword) {
  const prefix = keyword + '(';
  if (!closed.startsWith(prefix) || !closed.endsWith(')')) return null;
  let depth = 0;
  for (let i = prefix.length - 1; i < closed.length; i++) {
    if (closed[i] === '(') depth++;
    else if (closed[i] === ')') {
      depth--;
      if (depth === 0) {
        return i === closed.length - 1 ? closed.slice(prefix.length, i) : null;
      }
    }
  }
  return null;
}

// sin/cos/tan trần → SurdValue chính xác hoặc null (không có dạng chính
// xác — rơi về thập phân, không phải lỗi). Dùng thẳng evaluateExpression
// (bộ thập phân) để tính góc bên trong ngoặc, nên vế trong ngoặc được là
// bất kỳ biểu thức nào (Ans/biến/π/phép tính) mà không cần bộ Surd hiểu π.
function tryExactForwardTrig(closed, ansValue, variables, angleUnit) {
  for (const [keyword, func] of [['sin', 'sin'], ['cos', 'cos'], ['tan', 'tan']]) {
    const inner = extractBareFunctionArg(closed, keyword);
    if (inner === null) continue;
    const angleValue = evaluateExpression(inner, ansValue, variables, angleUnit);
    const angleDeg = convertAngleValue(angleValue, angleUnit, 'deg');
    const looked = lookupSpecialAngleDeg(func, angleDeg);
    return looked === undefined ? null : looked;
  }
  return null;
}

// sin⁻¹/cos⁻¹/tan⁻¹ trần, CHỈ khi angleUnit==='rad' → bội số π (PiFraction:
// {negative, num: bigint, den: bigint} nghĩa là ±(num/den)×π), hoặc null.
// Ở Deg, kết quả nguyên độ đã sạch sẵn (vd "30") — không đụng vào.
const ASIN_ATAN_CANDIDATES_DEG = [-90, -60, -45, -30, 0, 30, 45, 60, 90];
const ACOS_CANDIDATES_DEG = [0, 30, 45, 60, 90, 120, 135, 150, 180];

// Bảng "tỉ số → góc (độ)" cho ba hàm lượng giác ngược. Tách riêng để dùng
// CHUNG cho hai đường: tryExactInverseTrigPi (lệnh trần, tính đối số bằng bộ
// thập phân) và atom ASIN/ACOS/ATAN trong evaluateExpressionExactPi (lệnh
// nằm trong biểu thức).
const INVERSE_TRIG_SPECS = [
  ['sin⁻¹', 'ASIN', (d) => Math.sin((d * Math.PI) / 180), ASIN_ATAN_CANDIDATES_DEG],
  ['cos⁻¹', 'ACOS', (d) => Math.cos((d * Math.PI) / 180), ACOS_CANDIDATES_DEG],
  ['tan⁻¹', 'ATAN', (d) => Math.tan((d * Math.PI) / 180), ASIN_ATAN_CANDIDATES_DEG.filter((d) => d !== -90 && d !== 90)]
];

// Tỉ số → số đo góc (độ) trong bảng góc đặc biệt, hoặc null nếu không khớp.
function lookupInverseTrigDeg(fn, candidates, ratio) {
  for (const cand of candidates) {
    if (Math.abs(fn(cand) - ratio) < 1e-9) return cand;
  }
  return null;
}

function tryExactInverseTrigPi(closed, ansValue, variables, angleUnit) {
  if (angleUnit !== 'rad') return null;
  for (const [keyword, , fn, candidates] of INVERSE_TRIG_SPECS) {
    const inner = extractBareFunctionArg(closed, keyword);
    if (inner === null) continue;
    const ratio = evaluateExpression(inner, ansValue, variables, angleUnit);
    const matchDeg = lookupInverseTrigDeg(fn, candidates, ratio);
    if (matchDeg === null || matchDeg === 0) return null;
    const negative = matchDeg < 0;
    const reduced = fracReduce({ num: BigInt(Math.abs(matchDeg)), den: 180n });
    return { negative, num: reduced.num, den: reduced.den };
  }
  return null;
}

// ===== Bội số π từ phép tính (PiValue) — bộ tính song song THỨ TƯ =====
// Đây là bộ thứ tư, song song với Fraction (evaluateExpressionExact), Surd
// (evaluateExpressionExactSurd) và bộ thập phân. Chép khung cú pháp của bộ
// Surd, KHÔNG sửa ba bộ kia (đều đã xác nhận máy thật).
//
// ĐÃ XÁC NHẬN máy thật 2026-08-17 — kết quả giữ dạng ký hiệu π KHI VÀ CHỈ KHI
// nó đúng bằng (một số hữu tỉ)×π. Năm ca đo được:
//   π=      → π            2π=     → 2π          π÷2=    → 1/2π
//   2π+π=   → 3π           π+1=    → 4.141592654 (thập phân)
//   π x²=   → 9.869604401 (thập phân)   √2×π=   → 4.442882938 (thập phân)
// Tức: trộn π với số hạng hữu tỉ, với chính nó, hay với căn thức đều rơi về
// thập phân. Quy tắc này khớp đúng kiểu PiFraction đã có sẵn từ bước 3 nên
// KHÔNG cần kiểu dữ liệu mới cho kết quả.
//
// PiValue = { rational: Fraction, degree: 0|1 } nghĩa là rational × π^degree.
// "degree" chính là thứ cưỡng chế quy tắc trên: cộng hai vế khác degree thì
// throw, nhân ra degree>1 thì throw — throw ở đây chỉ có nghĩa "không có dạng
// π", rơi về thập phân, KHÔNG phải lỗi hiện lên màn hình.
const PI_DEGREE_MAX = 1;

function piValFromFraction(f) {
  return { rational: f, degree: 0 };
}

function piValAdd(a, b) {
  // Một vế bằng 0 thì nhận degree của vế kia — nếu không "0+π" sẽ tự hỏng
  // (0 mang degree 0, π mang degree 1) dù toán học vẫn đúng bằng π.
  if (a.rational.num === 0n) return { rational: b.rational, degree: b.degree };
  if (b.rational.num === 0n) return { rational: a.rational, degree: a.degree };
  if (a.degree !== b.degree) throw new EngineError('Math ERROR');
  return { rational: fracAdd(a.rational, b.rational), degree: a.degree };
}

function piValSub(a, b) {
  return piValAdd(a, { rational: fracNeg(b.rational), degree: b.degree });
}

function piValMul(a, b) {
  const degree = a.degree + b.degree;
  if (degree > PI_DEGREE_MAX) throw new EngineError('Math ERROR');
  return { rational: fracMul(a.rational, b.rational), degree };
}

function piValDiv(a, b) {
  if (b.rational.num === 0n) throw new EngineError('Math ERROR');
  const degree = a.degree - b.degree;
  // degree âm nghĩa là π nằm dưới mẫu (vd 1÷π) — ngoài dạng (hữu tỉ)×π.
  if (degree < 0) throw new EngineError('Math ERROR');
  return { rational: fracDiv(a.rational, b.rational), degree };
}

function piValConvertAngle(value, fromUnit, toUnit) {
  let rational = value.rational;
  let degree = value.degree;
  if (fromUnit === 'deg') { rational = fracDiv(rational, { num: 180n, den: 1n }); degree++; }
  else if (fromUnit === 'grad') { rational = fracDiv(rational, { num: 200n, den: 1n }); degree++; }
  if (toUnit === 'deg') { rational = fracMul(rational, { num: 180n, den: 1n }); degree--; }
  else if (toUnit === 'grad') { rational = fracMul(rational, { num: 200n, den: 1n }); degree--; }
  if (degree < 0 || degree > PI_DEGREE_MAX) throw new EngineError('Math ERROR');
  return { rational: fracReduce(rational), degree };
}

// Biểu thức → PiValue. Ném EngineError khi biểu thức không nằm trong dạng
// (hữu tỉ)×π^(0|1) — chỗ gọi nuốt lỗi và rơi về thập phân.
function evaluateExpressionExactPi(expr, ansExactPi, variablesExactPi, angleUnit, plusModel = false) {
  const tokens = Array.isArray(expr) ? expr : tokenize(expr);
  let pos = 0;

  function peek() {
    return pos < tokens.length ? tokens[pos].type : null;
  }

  function advance() {
    return tokens[pos++];
  }

  function isImplicitMultTrigger() {
    const t = peek();
    return t === 'NUMBER' || t === 'LPAREN' || t === 'PI' || t === 'PREANS' ||
      t === 'ASIN' || t === 'ACOS' || t === 'ATAN' || t === 'GCD' || t === 'LCM';
  }

  function parseFunctionArgument() {
    if (peek() !== 'LPAREN') throw new EngineError('Syntax ERROR');
    advance();
    const value = parseExpression();
    if (peek() !== 'RPAREN') throw new EngineError('Syntax ERROR');
    advance();
    return value;
  }

  function parseAtom() {
    const type = peek();
    if (type === 'NUMBER') {
      return piValFromFraction(fractionFromDecimalString(advance().raw));
    }
    if (type === 'PI') {
      advance();
      return { rational: { num: 1n, den: 1n }, degree: 1 };
    }
    // Ans giữ được dạng π — ĐÃ XÁC NHẬN máy thật 2026-08-17: "π=" rồi "×2="
    // cho ra 2π chứ không phải 6.283185307.
    if (type === 'ANS') {
      advance();
      if (!ansExactPi) throw new EngineError('Math ERROR');
      return { rational: piFractionToFraction(ansExactPi), degree: 1 };
    }
    if (type === 'PREANS') {
      advance();
      const value = variablesExactPi.PreAns;
      if (!value) throw new EngineError('Math ERROR');
      return { rational: piFractionToFraction(value), degree: 1 };
    }
    // Biến A-F/M giữ được dạng π — ĐÃ XÁC NHẬN máy thật 2026-08-17:
    // "π STO A" rồi "A×2=" cho ra 2π.
    if (type === 'VARIABLE') {
      const value = variablesExactPi[advance().name];
      if (!value) throw new EngineError('Math ERROR');
      return { rational: piFractionToFraction(value), degree: 1 };
    }
    if (type === 'LPAREN') {
      advance();
      const value = parseExpression();
      if (peek() !== 'RPAREN') throw new EngineError('Syntax ERROR');
      advance();
      return value;
    }
    if (type === 'ANGLEUNIT') {
      const unit = advance().unit;
      return piValConvertAngle(parseFunctionArgument(), unit, angleUnit);
    }
    // Lượng giác NGƯỢC ở Rad → bội số π, tham gia phép tính như một giá trị
    // bình thường. ĐÃ XÁC NHẬN máy thật 2026-08-17: "2sin⁻¹(0,5)=1/3π" — tức
    // lan truyền qua phép tính giống hệt lượng giác THUẬN (2sin(60)=√3).
    // Ở Deg thì kết quả nguyên độ đã sạch sẵn (vd 30), không đụng tới.
    if (type === 'ASIN' || type === 'ACOS' || type === 'ATAN') {
      if (angleUnit !== 'rad' && !(plusModel && angleUnit === 'grad')) throw new EngineError('Math ERROR');
      const spec = INVERSE_TRIG_SPECS.find(([, tok]) => tok === type);
      advance();
      const argValue = parseFunctionArgument();
      // Tỉ số đầu vào phải là số thuần (không chứa π) mới tra bảng được.
      if (argValue.degree !== 0) throw new EngineError('Math ERROR');
      const matchDeg = lookupInverseTrigDeg(spec[2], spec[3], fracToNumber(argValue.rational));
      if (matchDeg === null) throw new EngineError('Math ERROR');
      // matchDeg=0 vẫn trả về hợp lệ (0×π=0); piValToPiFraction lọc bỏ ở
      // cuối để "sin⁻¹(0)=0" hiện số 0 trần, không bọc π.
      if (angleUnit === 'grad') return piValFromFraction(fracReduce({ num: BigInt(matchDeg) * 10n, den: 9n }));
      const reduced = fracReduce({ num: BigInt(matchDeg), den: 180n });
      return { rational: reduced, degree: 1 };
    }
    // √, lượng giác thuận, log... đều throw — CỐ Ý: "√2×π" đã xác nhận máy
    // thật cho ra thập phân.
    if (type === 'GCD' || type === 'LCM') {
      advance();
      const [a, b] = parseIntegerPairArguments(peek, advance, parseExpression);
      if (a.degree !== 0 || b.degree !== 0 ||
          a.rational.den !== 1n || b.rational.den !== 1n) {
        throw new EngineError('Argument ERROR');
      }
      return piValFromFraction({
        num: integerPairBigInt(type, a.rational.num, b.rational.num), den: 1n
      });
    }
    throw new EngineError('Math ERROR');
  }

  // Xem chú thích parseEngSuffix ở bộ tính số thực.
  function parseEngSuffix() {
    let value = parseAtom();
    let applied = false;
    while (peek() === 'ENGSYM') {
      value = piValMul(value, piValFromFraction(engineerFactorFraction(advance().exponent)));
      applied = true;
    }
    if (applied && peek() === 'NUMBER') {
      throw new EngineError('Syntax ERROR');
    }
    return value;
  }

  function parsePowerBase(initialValue) {
    let value = initialValue === undefined ? parseEngSuffix() : initialValue;
    while (true) {
      const t = peek();
      // x² / x³ trên một giá trị có π luôn đẩy degree vượt ngưỡng → throw →
      // thập phân, đúng ca "π x² = 9.869604401" đã xác nhận máy thật.
      if (t === 'SQUARE') { advance(); value = piValMul(value, value); }
      else if (t === 'CUBE') { advance(); value = piValMul(piValMul(value, value), value); }
      else if (t === 'PERCENT') {
        advance();
        value = piValMul(value, piValFromFraction({ num: 1n, den: 100n }));
      } else if (t === 'RECIPROCAL') {
        advance();
        value = piValDiv(piValFromFraction({ num: 1n, den: 1n }), value);
      } else if (t === 'FACTORIAL') {
        // Giai thừa chỉ có nghĩa trên số nguyên không âm — mọi giá trị có π
        // đều throw, và ca thuần hữu tỉ vốn là việc của bộ Fraction.
        throw new EngineError('Math ERROR');
      } else {
        break;
      }
    }
    return value;
  }

  function parsePower() {
    let base = parsePowerBase();
    while (peek() === 'CARET') {
      advance();
      const exponent = plusModel ? parseEngSuffix() : parsePower();
      if (exponent.degree !== 0 || exponent.rational.den !== 1n) throw new EngineError('Math ERROR');
      const n = Number(exponent.rational.num);
      if (!Number.isInteger(n) || Math.abs(n) > 1000) throw new EngineError('Math ERROR');
      let result = piValFromFraction({ num: 1n, den: 1n });
      const b = n < 0 ? piValDiv(piValFromFraction({ num: 1n, den: 1n }), base) : base;
      for (let i = 0; i < Math.abs(n); i++) result = piValMul(result, b);
      base = result;
      if (!plusModel) break;
      base = parsePowerBase(base);
    }
    return base;
  }

  function parseImplicitFactor() {
    const factor = () => parseLineFraction(peek, advance, parsePower, {add:piValAdd,divide:piValDiv,negate:value => ({rational:fracNeg(value.rational),degree:value.degree})});
    let value = factor();
    while (isImplicitMultTrigger()) value = piValMul(value, factor());
    return value;
  }

  function parseBeforeConversion() {
    const signs = readPrefixSigns(peek, advance);
    const value = parseImplicitFactor();
    return signs % 2 ? { rational: fracNeg(value.rational), degree: value.degree } : value;
  }

  function parseUnary() {
    const value=parseBeforeConversion();
    return peek()==='CONVERSION'?parseUnitConversionSuffix(value,peek,advance,parsePower,isImplicitMultTrigger,unitConversionArithmetic('pi')):value;
  }

  function parseCombinatoric() {
    let value = parseUnary();
    while (peek() === 'PERM' || peek() === 'COMB') {
      const kind = advance().type === 'PERM' ? 'P' : 'C';
      const rhs = parseUnary();
      if (value.degree !== 0 || rhs.degree !== 0 ||
          value.rational.den !== 1n || rhs.rational.den !== 1n) {
        throw new EngineError('Math ERROR');
      }
      value = piValFromFraction({
        num: combinatoricBigInt(value.rational.num, rhs.rational.num, kind), den: 1n
      });
    }
    return value;
  }

  function parseTerm() {
    let value = parseCombinatoric();
    while (true) {
      if (peek() === 'MUL') { advance(); value = piValMul(value, parseCombinatoric()); }
      else if (peek() === 'DIV') { advance(); value = piValDiv(value, parseCombinatoric()); }
      else break;
    }
    return value;
  }

  function parseExpression() {
    let value = parseTerm();
    while (true) {
      if (peek() === 'PLUS') { advance(); value = piValAdd(value, parseTerm()); }
      else if (peek() === 'MINUS') { advance(); value = piValSub(value, parseTerm()); }
      else break;
    }
    return value;
  }

  const result = parseExpression();
  if (pos !== tokens.length) throw new EngineError('Syntax ERROR');
  return result;
}

// PiValue → PiFraction ({negative,num,den}) để đưa vào slot exactPi sẵn có,
// hoặc null khi kết quả không thật sự chứa π (degree 0 — đó là việc của bộ
// Fraction) hoặc bằng 0 (0×π=0, thập phân "0" đã sạch, giống cách bước 3 đã
// xử lý sin⁻¹(0)).
function piValToPiFraction(value) {
  if (value.degree !== 1) return null;
  return piFractionFromFraction(value.rational);
}

// Fraction (hệ số của π, có dấu) → PiFraction ({negative,num,den}, num≥0).
// Trả null khi hệ số bằng 0 — "0×π" chỉ là 0, thập phân đã sạch.
function piFractionFromFraction(f) {
  const reduced = fracReduce(f);
  if (reduced.num === 0n) return null;
  return { negative: reduced.num < 0n, num: bigAbs(reduced.num), den: reduced.den };
}

// PiFraction → Fraction có dấu, để đem đi cộng/trừ như số hữu tỉ thường.
function piFractionToFraction(pf) {
  return { num: pf.negative ? -pf.num : pf.num, den: pf.den };
}

function piMultipleToNumber(pi) {
  const value = (Number(pi.num) / Number(pi.den)) * Math.PI;
  return pi.negative ? -value : value;
}

function piRoughlyEqualsFloat(pi, value) {
  const asFloat = piMultipleToNumber(pi);
  if (value === 0) return asFloat === 0;
  return Math.abs(asFloat - value) <= Math.abs(value) * 1e-9;
}

// CASIO 2026-10-12: kết quả tính từ Ans có thể trở lại dạng bội π dù
// nguồn chỉ còn số thập phân. Giữ giới hạn mẫu 360 như bộ nhận dạng tích
// phân, hệ số vừa màn hình và kiểm tra thêm sai số binary bên cạnh 15 chữ
// số: một số thập phân gần π không đủ để biến thành dạng ký hiệu.
function recognizeCalculatedPiResult(value) {
  if (!Number.isFinite(value) || value === 0) return null;
  const magnitude = Math.abs(value);
  const ratio = magnitude / Math.PI;
  for (let den = 1; den <= 360; den++) {
    const num = Math.round(ratio * den);
    if (num === 0 || !Number.isSafeInteger(num)) continue;
    const coefficient = fracReduce({ num: BigInt(num), den: BigInt(den) });
    if (fracDigitCount(coefficient) > 10) continue;
    const candidate = (num / den) * Math.PI;
    if (candidate.toPrecision(15) === magnitude.toPrecision(15) &&
        Math.abs(candidate - magnitude) <= Number.EPSILON * magnitude) {
      return piFractionFromFraction(value < 0 ? fracNeg(coefficient) : coefficient);
    }
  }
  return null;
}

// ===== Tầng 5: mô hình tài liệu có cấu trúc (document tree) =====
// Biểu thức đang gõ KHÔNG còn là một chuỗi phẳng nữa, mà là một cây node,
// để diễn tả được những vùng nhập lồng nhau (tử số / mẫu số của phân số) và
// đặt con trỏ vào giữa chúng — đây là điều kiện bắt buộc để hiển thị và SỬA
// trực tiếp theo cách trình bày sách giáo khoa.
//
// Mỗi node là một trong hai loại:
//   { type: 'char', ch: '5' }                — một ký tự thường
//   node MẪU (template) — có một hoặc nhiều VÙNG NHẬP lồng bên trong:
//     { type: 'frac', num: [...], den: [...] }   phân số, hai vùng nhập
//     { type: 'sqrt', arg: [...] }               căn bậc hai, vạch ngang trùm arg
//     { type: 'cbrt', arg: [...] }               căn bậc ba
//     { type: 'sup',  exp: [...] }               ô mũ trên cao, đứng SAU cơ số
//     { type: 'pow10', exp: [...] }              10^, gọi bằng SHIFT+log — tiền tố "10"
//                                                 CỐ ĐỊNH nằm trong mẫu (không phải char
//                                                 rời như sup), vì máy thật gỡ nguyên cụm
//                                                 "10^" trong một lần DEL khi ô mũ rỗng.
//     { type: 'times10', exp: [...] }            ×10^, phím nhập ký pháp khoa học;
//                                                 cả "×10" là tiền tố cố định.
//     { type: 'epow', exp: [...] }               e^, gọi bằng SHIFT+ln — giống pow10,
//                                                 tiền tố "e" cố định.
//
// Bộ tính toán (tokenize/evaluateExpression) KHÔNG đọc cây này. Trước khi
// tính, cây được dịch ngược thành đúng cú pháp chuỗi phẳng cũ, nên toàn bộ
// thứ tự ưu tiên và xử lý lỗi đã kiểm chứng ở Tầng 0-4 vẫn nguyên vẹn.

// Bảng khai báo vùng nhập của từng loại mẫu, theo thứ tự đọc trái→phải. Mọi
// hàm duyệt cây bên dưới (nhân bản, dịch chuỗi, tìm chủ sở hữu, di chuyển
// con trỏ, DEL) đều đọc từ bảng này — thêm mẫu mới (Σ, ∫ ở Tầng 7) chỉ cần
// thêm một dòng ở đây thay vì sửa sáu chỗ.
const TEMPLATE_SLOT_FIELDS = {
  recurring: ['digits'],
  frac: ['num', 'den'],
  sqrt: ['arg'],
  cbrt: ['arg'],
  abs: ['arg'],
  sup: ['exp'],
  pow10: ['exp'],
  times10: ['exp'],
  scientific: ['mantissa', 'exp'],
  epow: ['exp'],
  nthroot: ['idx', 'arg'],
  // log cơ số bất kỳ: ô cơ số (chỉ số dưới) rồi ô đối trong ngoặc. Con trỏ
  // vào cơ số trước — ĐÃ XÁC NHẬN 2026-08-28.
  logn: ['base', 'arg'],
  mixed: ['int', 'num', 'den'],
  // ĐÃ XÁC NHẬN với máy thật (ảnh chụp màn hình 2026-08-14): thứ tự vùng
  // nhập là THÂN BIỂU THỨC trước, rồi cận dưới, rồi cận trên — khác thứ tự
  // ban đầu suy đoán theo quy ước ⁿ√ (cận trước, biểu thức sau). Suy ra từ
  // Σ(1,x=5,x+1) khi gõ "1 ▶ 5 ▶ x+1" — 3 giá trị rơi đúng vào 3 vùng theo
  // thứ tự body→lower→upper. Chỉ ảnh hưởng thứ tự Tab (◀/▶) và ô con trỏ
  // vào đầu tiên; reduceCalcNodes đọc node.lower/upper/body theo TÊN nên
  // không phụ thuộc thứ tự mảng này.
  sum: ['body', 'lower', 'upper'],
  // ĐÃ XÁC NHẬN trên giả lập chính thức 2026-09-15: ALPHA+x mở Π và thứ tự
  // vùng nhập cũng là thân biểu thức → cận dưới → cận trên, giống Σ.
  product: ['body', 'lower', 'upper'],
  integral: ['body', 'lower', 'upper'],
  derivative: ['body', 'point'],
  angle: ['arg']
};

// Các vùng nhập của một node. Node 'char' không có vùng nào → mảng rỗng.
function templateSlots(node) {
  const fields = TEMPLATE_SLOT_FIELDS[node.type];
  if (!fields) return [];
  return fields.map((field) => node[field]);
}

// CASIO 07/11: vertical movement across a fraction keeps the horizontal
// column after centering numerator/denominator. It does not copy the index
// of a nested list. These are logical character columns, independent of DOM.
// Only the measured single-line/√ layout is used here; other templates keep
// the established navigation until their geometry is independently checked.
function fractionCursorLayout(list) {
  const text=list.map(node=>node.type==='char'?node.ch:'\0').join('');
  if(FUNCTION_OPEN_TEXTS.some(name=>text.includes(name)))return null;
  let width=0;const entries=[];
  for(let index=0;index<list.length;index++) {
    const node=list[index];let child=null,size=1;
    if(node.type==='sqrt') {
      child=fractionCursorLayout(node.arg);if(!child)return null;
      size=1+child.width;
    } else if(node.type==='sup' && node.exp.length===1 && node.exp[0].type==='char') {
      // A one-character script occupies one navigation column. Vertical
      // fraction movement lands before it; RIGHT enters its exponent.
      size=1;
    } else if(node.type!=='char')return null;
    entries.push({index,left:width,width:size,child});width+=size;
  }
  return {list,width:Math.max(1,width),entries};
}

function fractionCursorColumn(layout,list,index) {
  if(layout.list===list)return index===layout.entries.length
    ? layout.entries.reduce((sum,item)=>sum+item.width,0) : layout.entries[index].left;
  for(const item of layout.entries)if(item.child) {
    const column=fractionCursorColumn(item.child,list,index);
    if(column!==null)return item.left+1+column;
  }
  return null;
}

function fractionCursorAtColumn(layout,column) {
  column=Math.max(0,Math.min(column,layout.width));
  for(const item of layout.entries) {
    // Landing on a radical enters its argument, including the argument's
    // right edge; a fraction's vertical key must not strand the caret on √.
    if(item.child && column>=item.left && column<=item.left+item.width)
      return fractionCursorAtColumn(item.child,column-item.left-1);
    if(column<item.left+item.width)return {list:layout.list,index:item.index};
  }
  return {list:layout.list,index:layout.list.length};
}

// Preserve an editable location for syntax diagnostics inside any template.
function expressionNodePosition(nodes, target) {
  for(let index=0;index<nodes.length;index++) {
    if(nodes[index]===target)return {list:nodes,index};
    for(const slot of templateSlots(nodes[index])) {
      const found=expressionNodePosition(slot,target);if(found)return found;
    }
  }
  return null;
}

// Translate a parser offset back to an editable MathI slot. Only templates
// whose emitted spelling is accounted for below participate; generated
// literals and reduced calculus keep their existing diagnostic mapping.
function stackSourcePosition880(nodes, sourceIndex) {
  const supported = list => list.every(node => node.type === 'char'
    ? serializeForEval([node]).length === 1 && !node.constant && !node.eng
    : ['frac','sqrt','abs','logn','sup'].includes(node.type) && templateSlots(node).every(supported));
  if (!supported(nodes)) return null;
  const locate = (list, position) => {
    let start = 0;
    for (let index = 0; index < list.length; index++) {
      const node = list[index], text = serializeForEval([node]);
      if (position >= start && position < start + text.length) {
        const local = position - start;
        if (node.type === 'char') return /^[+−×÷-]$/.test(node.ch) ? {list,index} : null;
        const children = node.type === 'frac'
          ? [[node.num,2],[node.den,5 + serializeForEval(node.num).length]]
          : node.type === 'logn'
            ? [[node.base,8],[node.arg,9 + serializeForEval(node.base).length]]
            : node.type === 'sup'
              ? [[node.exp,2]]
              : [[node.arg,node.type === 'abs' ? 4 : 2]];
        for (const [child, offset] of children) {
          if (local >= offset && local < offset + serializeForEval(child).length)
            return locate(child, local - offset);
        }
        return null;
      }
      start += text.length;
    }
    return null;
  };
  return locate(nodes, sourceIndex);
}

// Locate the right operand in the original editable tree, including MathI
// templates. Called only after the PLUS parser diagnoses numeric adjacency.
function implicitNumericPosition880(nodes) {
  for (let index=0;index<nodes.length;index++) {
    const node=nodes[index], previous=nodes[index-1];
    if (node.type==='char' && /^[0-9.]$/.test(node.ch) && previous) {
      const afterAns=nodes.slice(Math.max(0,index-3),index).map(n=>n.ch||'').join('')==='Ans';
      if (previous.type!=='char' || previous.constant || previous.stat || previous.eng ||
          /^[)πei!%²³⁻¹A-FMxyz]$/.test(previous.ch) || afterAns) return {list:nodes,index};
    }
    for (const slot of templateSlots(node)) {
      const found=implicitNumericPosition880(slot);
      if (found) return found;
    }
  }
  return null;
}

function registeredCallClose(nodes, name) {
  const opening = [];
  for (const [index, node] of nodes.entries()) {
    if (node.type === 'char' && node.ch === '(') {
      opening.push(nodes.slice(Math.max(0,index-name.length),index).map(part => part.ch || '').join(''));
    }
    if (node.type === 'char' && node.ch === ')' && opening.pop() === name) return {list:nodes, index};
    for (const slot of templateSlots(node)) {
      const found = registeredCallClose(slot, name);
      if (found) return found;
    }
  }
  return null;
}

function charNodes(text) {
  return Array.from(text).map((ch) => ({ type: 'char', ch }));
}

function cloneNodes(nodes) {
  return nodes.map((node) => {
    const fields = TEMPLATE_SLOT_FIELDS[node.type];
    // Sao chép NGUYÊN node cho loại không có vùng nhập: node ký hiệu kỹ
    // thuật cũng là char nhưng mang thêm cờ `eng`, chép tay từng trường sẽ
    // đánh rơi cờ đó và biến "5k" thành "5×biến k".
    if (!fields) return { ...node };
    const copy = { ...node };
    fields.forEach((field) => { copy[field] = cloneNodes(node[field]); });
    return copy;
  });
}

// PLUS makes a denominator's implicit product explicit after evaluation,
// including in the expression recalled for editing: 6÷2(1+2) → 6÷(2(1+2)).
// Work on the stored snapshot, preserving the draft and its cursor.
function clarifyImplicitDivisors880(input, baseMode = false) {
  const nodes = [];
  const closeAt = (list, start) => {
    let depth = 0;
    for (let i = start; i < list.length; i++) {
      if (list[i].ch === '(') depth++;
      if (list[i].ch === ')' && --depth === 0) return i;
    }
    return -1;
  };
  for (let i = 0; i < input.length; i++) {
    const item = input[i];
    if (item.ch === '(') {
      const end = closeAt(input, i);
      if (end >= 0) {
        nodes.push({...item}, ...clarifyImplicitDivisors880(input.slice(i + 1, end), baseMode), {...input[end]});
        i = end;
        continue;
      }
    }
    const copy = {...item};
    // PLUS displays an evaluated scientific literal as an explicit group;
    // the live number editor omits these parentheses. Replay retains them.
    if (item.type === 'scientific' && item.mantissa.length) copy.parenthesized = true;
    for (const field of TEMPLATE_SLOT_FIELDS[item.type] || []) copy[field] = clarifyImplicitDivisors880(item[field], baseMode);
    nodes.push(copy);
  }
  const primaryEnd = start => {
    const item = nodes[start];
    if (!item) return start;
    if (item.type !== 'char') return item.type === 'sup' || item.type === 'times10' ? start : start + 1;
    const run = nodes.slice(start).map(n => n.type === 'char' ? n.ch : '\0').join('');
    if (baseMode) {
      const literal = /^(?:[dhbo])?[0-9A-F]+/.exec(run);
      if (literal) return start + literal[0].length;
    }
    const prefix = [...FUNCTION_OPEN_TEXTS, 'Ans'].find(name => run.startsWith(name));
    if (prefix) {
      if (!prefix.endsWith('(')) return start + prefix.length;
      const end = closeAt(nodes, start + prefix.length - 1);
      return end < 0 ? nodes.length : end + 1;
    }
    if (item.ch === '(') {
      const end = closeAt(nodes, start);
      return end < 0 ? nodes.length : end + 1;
    }
    if (/^[0-9.]$/.test(item.ch)) {
      let end = start + 1;
      while (/^[0-9.]$/.test(nodes[end]?.ch || '')) end++;
      return end;
    }
    return item.constant || item.stat || /^[πeA-FMxyzi]$/.test(item.ch) ? start + 1 : start;
  };
  const powerEnd = start => {
    let end = primaryEnd(start);
    if (end === start) return start;
    while (end < nodes.length) {
      const item = nodes[end];
      if (item.type === 'sup' || item.type === 'times10' || item.eng || /^[²³!%°′″]$/.test(item.ch || '')) end++;
      else if (item.ch === '^') {
        const exponentEnd = primaryEnd(end + 1);
        if (exponentEnd === end + 1) break;
        end = exponentEnd;
      } else break;
    }
    return end;
  };
  // PLUS stores explicit parentheses for an implicit fractional factor.
  // The parentheses remain editable on replay (native MathI, 2026-11-20).
  for (let i = 1; i < nodes.length; i++) {
    if (nodes[i].type !== 'frac') continue;
    const previous = nodes[i - 1];
    const afterAns = nodes.slice(Math.max(0,i-3),i).map(node => node.ch || '').join('') === 'Ans';
    const factor = previous.type !== 'char' || previous.constant || previous.stat || previous.eng ||
      /^[0-9.)πei!%²³⁻¹A-FMxyz]$/.test(previous.ch) || afterAns;
    if (!factor) continue;
    const end = i + 1;
    nodes.splice(end, 0, ...charNodes(')'));
    nodes.splice(i, 0, ...charNodes('('));
    i = end + 1;
  }
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].ch !== '÷') continue;
    const start = i + 1;
    let end = powerEnd(start), count = Number(end > start);
    while (end > start) {
      const next = powerEnd(end);
      if (next === end) break;
      count++;
      end = next;
    }
    if (count > 1) {
      const unclosed = nodes.slice(start,end).reduce((depth,node) => depth + (node.ch === '(' ? 1 : node.ch === ')' ? -1 : 0),0);
      if (!unclosed) nodes.splice(end, 0, ...charNodes(')'));
      nodes.splice(start, 0, ...charNodes('('));
      i = end + 1;
    }
  }
  return nodes;
}

// Dịch cây thành chuỗi để TÍNH. Mọi mẫu đều bọc vùng nhập trong dấu ngoặc và
// dùng lại đúng ký hiệu bộ tính toán đã hiểu sẵn (÷, √, ∛, ^), nên thứ tự ưu
// tiên tự khắc đúng mà không phải sửa bộ tính toán.
// Vùng nhập còn rỗng dịch ra "√()" hoặc "^()" — bộ tính toán sẵn có tự báo
// Syntax ERROR, không lọt NaN lên màn hình.
function serializeForEval(nodes) {
  // Phím ×10ˣ gắn với phần số liền trước thành MỘT số khoa học.
  // CASIO 2026-10-05: 1÷2×10³ = 1/2000; không phải (1÷2)×10³.
  // Chỉ gom tại lúc dịch cây, không đổi node/con trỏ/cách vẽ biểu thức.
  const grouped=[];
  for(const node of nodes) {
    if (node.type === 'recurring') {
      const prefix = [];
      while (grouped.length) {
        const previous = grouped[grouped.length - 1];
        if (previous.type !== 'char' || previous.constant || !/^[0-9.]$/.test(previous.ch)) break;
        prefix.unshift(grouped.pop());
      }
      grouped.push({ type: 'recurring-number', prefix: prefix.map(n => n.ch).join(''), digits: node.digits });
      continue;
    }
    if(node.type==='times10' && !node.literalMultiply) {
      // CASIO: chu kỳ không được làm mantissa của phím ×10ˣ.
      if (grouped[grouped.length - 1]?.type === 'recurring-number') throw new EngineError('Syntax ERROR');
      const mantissa=[];
      while(grouped.length) {
        const previous=grouped[grouped.length-1];
        if(previous.type!=='char' || previous.constant || !/^[0-9.]$/.test(previous.ch)) break;
        mantissa.unshift(grouped.pop());
      }
      if(mantissa.length) {grouped.push({type:'scientific',mantissa,exp:node.exp});continue;}
    }
    grouped.push(node);
  }
  return grouped.map((node, index) => {
    // Phím (-) là dấu âm một ngôi, không phải phím trừ. Giữ cờ trong cây
    // để chỉ báo Syntax ERROR lúc tính, kể cả sau khi sửa/lưu biểu thức.
    // CASIO 2026-10-20: 3(-)5 lỗi; 3−5=-2 và 3×(-)5=-15.
    if (node.negative && index > 0) {
      const previous = grouped[index - 1];
      const afterAns = grouped.slice(Math.max(0, index - 3), index).map(n => n.ch || '').join('') === 'Ans';
      if (previous.type !== 'char' || previous.constant || previous.stat || previous.eng ||
          /^[0-9.)πei!%²³°′″A-FMxyz]$/.test(previous.ch) || afterAns) {
        const error = new EngineError('Syntax ERROR');
        error.expressionNode = node;
        throw error;
      }
    }
    switch (node.type) {
      case 'recurring-number': {
        const digits = node.digits.map(n => n.type === 'char' ? n.ch : '?').join('');
        return '(' + fractionToEvalLiteral(recurringInputFraction(node.prefix, digits)) + ')';
      }
      // Phân số hai chiều là MỘT toán hạng: nhân ẩn, lũy thừa hoặc
      // phép chia bên ngoài phải áp lên cả tử/mẫu (CASIO 2026-10-20).
      case 'frac': return '((' + serializeForEval(node.num) + ')÷(' + serializeForEval(node.den) + '))';
      case 'sqrt': return '√(' + serializeForEval(node.arg) + ')';
      case 'cbrt': return '∛(' + serializeForEval(node.arg) + ')';
      case 'abs': return 'Abs(' + serializeForEval(node.arg) + ')';
      case 'sup': return '^(' + serializeForEval(node.exp) + ')';
      // "(10)" chứ không phải "10" trần: nếu node đứng ngay sau một chữ số
      // khác (vd "5" rồi 10^2), ghép trực tiếp sẽ dính vào số đó thành
      // "510^(...)" — bộ tách token gộp mọi chữ số liền nhau thành MỘT số.
      // Dấu ngoặc chặn việc dính này mà không đổi giá trị tính ra.
      case 'pow10': return '(10)^(' + serializeForEval(node.exp) + ')';
      case 'scientific': {
        // The PLUS notation field accepts typing a third digit but reports
        // Syntax ERROR on EXE, including099. Power expressions and580 keep
        // their numeric overflow rules.
        const exponentDigits = node.exp.filter(n => /^\d$/.test(n.ch || ''));
        if (node.notation && exponentDigits.length > 2) {
          const error = new EngineError('Syntax ERROR');
          error.expressionNode = exponentDigits[2];
          throw error;
        }
        return node.mantissa.length
          ? '('+serializeForEval(node.mantissa)+'×(10)^('+serializeForEval(node.exp)+'))'
          : '×(10)^('+serializeForEval(node.exp)+')';
      }
      case 'times10': return '×(10)^(' + serializeForEval(node.exp) + ')';
      case 'epow': return 'e^(' + serializeForEval(node.exp) + ')';
      // ˣ√y = y^(1/x). Viết dạng luỹ thừa để tái dùng bộ tính toán sẵn có
      // (giống mọi mẫu khác) thay vì thêm phép toán "căn bậc n" mới; bọc cả
      // hai vùng trong ngoặc để tránh dính số ký tự, cùng bẫy đã gặp ở pow10.
      case 'nthroot': return '(' + serializeForEval(node.arg) + ')^(1÷(' + serializeForEval(node.idx) + '))';
      // Giữ log cơ số bất kỳ là một phép tính để calculationLogarithm
      // áp chính sách chốt log10/thương, không đi qua hai hàm ln.
      // calculationLogarithm kiểm tra miền; parser giữ lỗi ô rỗng.
      case 'logn': return 'logbase(' + serializeForEval(node.base) + ',' + serializeForEval(node.arg) + ')';
      // Hỗn số = phần nguyên + phân số. Bọc NGOÀI CÙNG cả tổng trong ngoặc
      // — với hỗn số, "-(int)+num/den" KHÁC "-(int+num/den)" nếu không bọc,
      // nên phải bọc để một dấu trừ đứng trước cả cụm (nếu có, CHƯA XÁC
      // NHẬN máy thật có cho gõ) áp đúng lên toàn bộ giá trị.
      case 'mixed': return '(' + serializeForEval(node.int) + '+(' + serializeForEval(node.num) + ')÷(' + serializeForEval(node.den) + '))';
      // Các phép Calculus KHÔNG được dịch trực tiếp ở đây: chúng cần đánh
      // giá thân biểu thức nhiều lần với các giá trị x khác nhau.
      // reduceCalcNodes() luôn thay chúng bằng kết quả số trước khi cây tới
      // đây; throw để bắt sớm nếu một đường gọi lỡ quên bước rút gọn.
      case 'sum':
      case 'product':
      case 'integral':
      case 'derivative':
        throw new EngineError('Syntax ERROR');
      case 'angle': return ANGLE_UNIT_MARK + ANGLE_UNIT_KEYS[node.unit] + '(' + serializeForEval(node.arg) + ')';
      // Ký hiệu kỹ thuật đi kèm ký tự mốc vô hình để bộ tách token phân biệt
      // được với biến M/E cùng mặt chữ (xem chú thích ở ENGSYM_MARK).
      default:
        // Hai hậu tố Complex chỉ chọn cách VẼ kết quả, không tham gia phép
        // tính. evaluateCurrentComplexValue đọc cờ này trước khi serialize;
        // bỏ ở đây thêm một lớp an toàn nếu node nằm ngoài vị trí cuối.
        if (node.complexOutput) return '';
        if (node.conversion) return UNIT_CONVERSION_MARK+node.conversion+UNIT_CONVERSION_MARK;
        if (node.constant) return scientificConstantLiteral(node.constant,node.constantValue);
        if (node.euler) return 'e^(1)';
        if (node.stat) return STAT_MARK + node.ch + STAT_MARK;
        if (node.combinatoric) return COMBINATORIC_MARK + node.ch;
        return node.eng ? ENGSYM_MARK + node.ch : node.ch;
    }
  }).join('');
}

// ===== Cổng trao đổi dữ liệu (bridge.js, docs/CONG-TRAO-DOI-DU-LIEU.md) =====
// Chuyển từ emulator580 (commit 4060792) để trang chứa dùng chung một giao thức cho hai model.
// Chuỗi trao đổi ASCII: + - * / ^ ( ) , x e pi sqrt cbrt root abs ln log10 logb sin… asinh…; không dịch được thì null.
// Gom ×10ˣ với phần số liền trước thành một số khoa học, như serializeForEval
// (1÷2×10³ = 1/2000). Số thập phân tuần hoàn chưa có cú pháp trao đổi: báo không xuất được.
function groupExchangeNodes(nodes) {
  const grouped = [];
  for (const node of nodes) {
    if (node.type === 'recurring') throw new EngineError('exchange');
    if (node.type === 'times10' && !node.literalMultiply) {
      const mantissa = [];
      while (grouped.length) {
        const previous = grouped[grouped.length - 1];
        if (previous.type !== 'char' || previous.constant || !/^[0-9.]$/.test(previous.ch)) break;
        mantissa.unshift(grouped.pop());
      }
      if (mantissa.length) { grouped.push({ type: 'scientific', mantissa, exp: node.exp }); continue; }
    }
    grouped.push(node);
  }
  return grouped;
}

const EXCHANGE_FUNCS = [
  ['sinh⁻¹(', 'asinh('], ['cosh⁻¹(', 'acosh('], ['tanh⁻¹(', 'atanh('],
  ['sin⁻¹(', 'asin('], ['cos⁻¹(', 'acos('], ['tan⁻¹(', 'atan('],
  ['sinh(', 'sinh('], ['cosh(', 'cosh('], ['tanh(', 'tanh('],
  ['sin(', 'sin('], ['cos(', 'cos('], ['tan(', 'tan('],
  ['log(', 'log10('], ['ln(', 'ln('], ['Abs(', 'abs('], ['√(', 'sqrt(']
];
const EXCHANGE_CHARS = { '×': '*', '÷': '/', '−': '-', 'π': 'pi' };
function exchangeSource(nodes) {
  if (!nodes.length) throw new EngineError('exchange');
  let text = '';
  for (const node of groupExchangeNodes(nodes)) {
    switch (node.type) {
      case 'frac': text += '((' + exchangeSource(node.num) + ')/(' + exchangeSource(node.den) + '))'; break;
      case 'sqrt': text += 'sqrt(' + exchangeSource(node.arg) + ')'; break;
      case 'cbrt': text += 'cbrt(' + exchangeSource(node.arg) + ')'; break;
      case 'abs': text += 'abs(' + exchangeSource(node.arg) + ')'; break;
      case 'sup': text += '^(' + exchangeSource(node.exp) + ')'; break;
      case 'pow10': text += '(10)^(' + exchangeSource(node.exp) + ')'; break;
      case 'scientific': text += '(' + exchangeSource(node.mantissa) + '*10^(' + exchangeSource(node.exp) + '))'; break;
      case 'times10': text += '*10^(' + exchangeSource(node.exp) + ')'; break;
      case 'epow': text += 'e^(' + exchangeSource(node.exp) + ')'; break;
      case 'nthroot': text += 'root(' + exchangeSource(node.arg) + ',' + exchangeSource(node.idx) + ')'; break;
      case 'logn': text += 'logb(' + exchangeSource(node.base) + ',' + exchangeSource(node.arg) + ')'; break;
      case 'mixed': text += '(' + exchangeSource(node.int) + '+(' + exchangeSource(node.num) + ')/(' + exchangeSource(node.den) + '))'; break;
      case 'char':
        if (node.constant || node.stat || node.eng || node.conversion || node.combinatoric || node.complexOutput) {
          throw new EngineError('exchange');
        }
        text += EXCHANGE_CHARS[node.ch] || node.ch;
        break;
      default: throw new EngineError('exchange');
    }
  }
  return text;
}

// Chỉ chuẩn hóa tập cú pháp đã công bố. Nhân ẩn chặt hơn ×/÷ trên máy,
// nên ghi rõ dấu nhân và ngoặc: 1÷2π xuất thành 1/(2*pi).
function normalizeExchangeExpression(text) {
  const lexeme = /(?:\d+(?:\.\d*)?|\.\d+|log10|logb|sqrt|cbrt|root|abs|ln|a?(?:sin|cos|tan)h?|pi|x|e|⁻¹|[²³+*/^(),-])/gy;
  const tokens = [];
  for (let offset = 0; offset < text.length;) {
    const match = lexeme.exec(text);
    if (!match) throw new EngineError('exchange');
    tokens.push(match[0]);
    offset = lexeme.lastIndex;
  }
  let i = 0;
  const take = token => {
    if (tokens[i] !== token) return false;
    i++;
    return true;
  };
  const expect = token => {
    if (!take(token)) throw new EngineError('exchange');
  };
  const startsAtom = () => /^(?:[a-z]|[0-9.]|\()/.test(tokens[i] || '');
  const suffixes = { '²': '2', '³': '3', '⁻¹': '(-1)' };
  function atom() {
    if (take('(')) {
      const value = sum();
      expect(')');
      return '(' + value + ')';
    }
    if (!startsAtom()) throw new EngineError('exchange');
    const token = tokens[i++];
    if (!/^[a-z]/.test(token) || ['x', 'e', 'pi'].includes(token)) return token;
    expect('(');
    const first = sum();
    let args = first;
    if (token === 'logb' || token === 'root') {
      expect(',');
      args += ',' + sum();
    }
    expect(')');
    return token + '(' + args + ')';
  }
  function power() {
    let value = atom();
    while (Object.hasOwn(suffixes, tokens[i])) {
      const exponent = suffixes[tokens[i++]];
      value = '(' + value + '^' + exponent + ')';
    }
    return take('^') ? value + '^' + power() : value;
  }
  function signedFactor() {
    let sign = '';
    while (tokens[i] === '+' || tokens[i] === '-') sign += tokens[i++];
    const factors = [power()];
    while (startsAtom()) factors.push(power());
    return sign + (factors.length === 1 ? factors[0] : '(' + factors.join('*') + ')');
  }
  function product() {
    let value = signedFactor();
    while (tokens[i] === '*' || tokens[i] === '/') {
      const operator = tokens[i++];
      value += operator + signedFactor();
    }
    return value;
  }
  function sum() {
    let value = product();
    while (tokens[i] === '+' || tokens[i] === '-') {
      const operator = tokens[i++];
      value += operator + product();
    }
    return value;
  }
  const expression = sum();
  if (i !== tokens.length) throw new EngineError('exchange');
  return expression;
}

// Cổng xuất dữ liệu: cây biểu thức gọn cho trang chứa (bridge.js). Ký tự là
// { c, neg?, k? (hằng), s? (biến thống kê), e? (ký hiệu kỹ thuật) }; mẫu nhập
// là { t: loại, <ô>: [...] } theo TEMPLATE_SLOT_FIELDS.
function exportExpressionTree(nodes) {
  return (nodes || []).map((node) => {
    const fields = TEMPLATE_SLOT_FIELDS[node.type];
    const out = node.type === 'char' ? { c: node.ch } : { t: node.type };
    if (node.type === 'char') {
      if (node.negative) out.neg = 1;
      if (node.constant) out.k = 1;
      if (node.stat) out.s = 1;
      if (node.eng) out.e = 1;
    }
    if (fields) fields.forEach((field) => { out[field] = exportExpressionTree(node[field]); });
    return out;
  });
}

// Đường dẫn tới node trong cây: [chỉ số, tên ô, chỉ số, …]; null nếu không thấy.
function expressionNodePath(nodes, target) {
  for (let index = 0; index < nodes.length; index++) {
    if (nodes[index] === target) return [index];
    for (const field of TEMPLATE_SLOT_FIELDS[nodes[index].type] || []) {
      const found = expressionNodePath(nodes[index][field] || [], target);
      if (found) return [index, field, ...found];
    }
  }
  return null;
}

function serializeForExchange(nodes) {
  try {
    let text = exchangeSource(nodes);
    for (const [from, to] of EXCHANGE_FUNCS) text = text.split(from).join(to);
    // Giữ kiểm tra dấu âm một ngôi giống máy, cả khi bản nháp chưa được tính.
    serializeForEval(nodes);
    return normalizeExchangeExpression(autoCloseParens(text));
  } catch (error) {
    if (error instanceof EngineError) return null;
    throw error;
  }
}

// Dịch cây thành chuỗi một dòng để HIỂN THỊ dạng văn bản (getDisplay và
// getState().buffer) — giữ cho phần đã có từ Tầng 0-4 hoạt động y như cũ.
function serializeForDisplay(nodes) {
  return nodes.map((node) => {
    switch (node.type) {
      case 'recurring': return '‹' + serializeForDisplay(node.digits) + '›';
      case 'frac': return serializeForDisplay(node.num) + '/' + serializeForDisplay(node.den);
      case 'sqrt': return '√(' + serializeForDisplay(node.arg) + ')';
      case 'cbrt': return '∛(' + serializeForDisplay(node.arg) + ')';
      case 'abs': return 'Abs(' + serializeForDisplay(node.arg) + ')';
      case 'sup': return '^(' + serializeForDisplay(node.exp) + ')';
      case 'pow10': return '10^(' + serializeForDisplay(node.exp) + ')';
      case 'times10': return '×10^(' + serializeForDisplay(node.exp) + ')';
      case 'scientific': return (node.mantissa.length ? '(' + serializeForDisplay(node.mantissa) : '') +
        '×10^(' + serializeForDisplay(node.exp) + ')' + (node.mantissa.length ? ')' : '');
      case 'epow': return 'e^(' + serializeForDisplay(node.exp) + ')';
      case 'nthroot': return serializeForDisplay(node.idx) + '√(' + serializeForDisplay(node.arg) + ')';
      case 'logn': return 'log' + serializeForDisplay(node.base) + '(' + serializeForDisplay(node.arg) + ')';
      case 'mixed': return serializeForDisplay(node.int) + ' ' + serializeForDisplay(node.num) + '/' + serializeForDisplay(node.den);
      // Chuỗi phẳng 1 dòng dùng cho getDisplay()/buffer — KHÔNG phải màn
      // hình 2 chiều thật (xem renderCalcOp trong ui.js cho phần đó).
      case 'sum': return 'Σ(' + serializeForDisplay(node.body) + ',x=' + serializeForDisplay(node.lower) + ',' + serializeForDisplay(node.upper) + ')';
      case 'product': return 'Π(' + serializeForDisplay(node.body) + ',x=' + serializeForDisplay(node.lower) + ',' + serializeForDisplay(node.upper) + ')';
      case 'integral': return '∫(' + serializeForDisplay(node.body) + ',' + serializeForDisplay(node.lower) + ',' + serializeForDisplay(node.upper) + ')dx';
      case 'derivative': return 'd/dx(' + serializeForDisplay(node.body) + ')|x=' + serializeForDisplay(node.point);
      case 'angle': return serializeForDisplay(node.arg) + ANGLE_UNIT_SYMBOLS[node.unit];
      default: return node.ch;
    }
  }).join('');
}

// ===== Σ / Π / d/dx / ∫ (đều tính được) =====
// Theo manual chính hãng: không được lồng ∫/d-dx/Σ/Π bên trong f(x), điểm
// lấy đạo hàm hoặc cận của một phép Calculus khác. Đệ quy generic qua
// TEMPLATE_SLOT_FIELDS nên bắt được cả trường hợp lồng gián tiếp (vd Σ
// nằm trong phân số nằm trong body của một Σ khác).
function containsCalcNode(nodes) {
  return nodes.some((node) => {
    // CASIO 2026-10-05: ÷R nhập được trong mẫu calculus, nhưng = báo Syntax ERROR.
    if(node.type==='char' && node.ch==='÷R')return true;
    if (node.type === 'sum' || node.type === 'product' ||
        node.type === 'integral' || node.type === 'derivative') return true;
    const fields = TEMPLATE_SLOT_FIELDS[node.type];
    if (!fields) return false;
    return fields.some((field) => containsCalcNode(node[field]));
  });
}

// Bộ tách token (tokenize) chỉ đọc được số thập phân thường (chữ số + dấu
// chấm), không đọc được ký hiệu mũ kiểu "1e-7" — ép mọi kết quả Σ về dạng
// thường trước khi ghép lại thành char node. Cận Σ hợp lý cho lớp học
// không bao giờ chạm ngưỡng này, đây chỉ là phòng hờ.
function numberToEvalLiteral(n) {
  if (!Number.isFinite(n)) {
    throw new EngineError('Math ERROR');
  }
  const s = n.toString();
  if (!s.includes('e') && !s.includes('E')) return s;
  // Expand scientific notation without truncating legitimate values below
  // 1e-20. The parser accepts decimal literals; toFixed(20) erased them.
  const [mantissa, exponentText] = s.toLowerCase().split('e');
  const negative = mantissa.startsWith('-');
  const parts = (negative ? mantissa.slice(1) : mantissa).split('.');
  const digits = parts.join('');
  const point = parts[0].length + Number(exponentText);
  const literal = point <= 0 ? '0.' + '0'.repeat(-point) + digits
    : point >= digits.length ? digits + '0'.repeat(point - digits.length)
      : digits.slice(0, point) + '.' + digits.slice(point);
  return (negative ? '-' : '') + literal;
}

// Khi Π tính được Fraction chính xác, trả lại cú pháp mà cả evaluator thập
// phân và evaluator Fraction đều đọc được. Pipeline kết quả chung nhờ đó
// tự hiện 1/6 thay vì làm rơi về 0.1666...
function fractionToEvalLiteral(f) {
  const reduced = fracReduce(f);
  if (reduced.den === 1n) return reduced.num.toString();
  return '(' + reduced.num.toString() + ')÷(' + reduced.den.toString() + ')';
}

// Chặn vòng lặp Σ/Π chạy quá lâu (vd gõ nhầm cận hàng triệu) — đây là giới
// hạn của BẢN MÔ PHỎNG để không treo tab trình duyệt, KHÔNG phải hành vi
// máy thật đã biết (tài liệu không nói máy thật giới hạn bao nhiêu vòng).
const CALC_ITERATION_LIMIT = 10000;

// Bộ Gauss-Kronrod 7/15 dùng đúng họ thuật toán được manual tr.61 nêu. Các
// nút chỉ lưu nửa dương; mỗi vòng lấy cặp đối xứng quanh trung điểm để giảm
// số lần đánh giá và giữ sai số làm tròn cân bằng.
const GK15_ABSCISSAE = [
  0.9914553711208126, 0.9491079123427585, 0.8648644233597691,
  0.7415311855993945, 0.5860872354676911, 0.4058451513773972,
  0.2077849550078985, 0
];
const GK15_WEIGHTS = [
  0.02293532201052922, 0.06309209262997855, 0.1047900103222502,
  0.1406532597155259, 0.1690047266392679, 0.1903505780647854,
  0.2044329400752989, 0.2094821410847278
];
const G7_WEIGHTS = [
  0.1294849661688697, 0.2797053914892766,
  0.3818300505051189, 0.4179591836734694
];
const INTEGRAL_EVALUATION_LIMIT = 100000;
// BUG-050: điểm gấp khúc của |x²−3x| còn cần chia nhỏ sau mức 20.
// Giới hạn số lần đánh giá vẫn chặn tổng công việc của toàn tích phân.
const INTEGRAL_MAX_DEPTH = 30;

function gaussKronrod15(fn, lower, upper) {
  const center = (lower + upper) / 2;
  const half = (upper - lower) / 2;
  const centerValue = fn(center);
  let kronrod = GK15_WEIGHTS[7] * centerValue;
  let gauss = G7_WEIGHTS[3] * centerValue;
  let gaussIndex = 0;

  for (let i = 0; i < 7; i++) {
    const offset = half * GK15_ABSCISSAE[i];
    const pair = fn(center - offset) + fn(center + offset);
    kronrod += GK15_WEIGHTS[i] * pair;
    // Bảy điểm Gauss là các nút Kronrod ở chỉ số lẻ 1,3,5 cộng trung điểm.
    if (i % 2 === 1) gauss += G7_WEIGHTS[gaussIndex++] * pair;
  }

  const value = kronrod * half;
  return { value, error: Math.abs((kronrod - gauss) * half) };
}

// Điểm gấp của Abs(P(x)), P bậc ≤ 2, lấy từ hệ số đại số chứ không dò
// bằng lưới. Hai nút Gauss/Kronrod có thể cùng bỏ lỡ một vùng đổi dấu hẹp.
// Chia đúng tại nghiệm P bảo đảm vùng đó có khoảng tích phân riêng, kể cả
// khi tịnh tiến, nhân hệ số hoặc trừ đi phần đa thức trơn bên ngoài Abs.
function integralAbsBreakpoints(expression, variables, ans, lower, upper) {
  if (!expression.includes('Abs')) return [];
  const points=[];
  try {
    const tree=solveAlgebraTree(expression,CALC_BOUND_VARIABLE,variables,ans,true);
    function visit(node) {
      if (!node) return;
      if (node.op==='abs') {
        try {
          const p=solveTreePolynomial(node.argument);
          if (p.length===2) points.push(fracToNumber(fracNeg(fracDiv(p[0],p[1]))));
          if (p.length===3) {
            const [c,b,a]=p;
            const discriminant=fracSub(fracMul(b,b),fracMul({num:4n,den:1n},fracMul(a,c)));
            if (discriminant.num===0n) {
              points.push(fracToNumber(fracNeg(fracDiv(b,fracMul({num:2n,den:1n},a)))));
            } else if (discriminant.num>0n) {
              // Công thức q tránh trừ hai số gần bằng nhau.
              // Chuẩn hóa bằng a để không làm tràn bình phương hệ số.
              const B=fracToNumber(fracDiv(b,a)),C=fracToNumber(fracDiv(c,a));
              const D=fracToNumber(fracDiv(discriminant,fracMul(a,a)));
              const q=-0.5*(B+(B<0?-1:1)*Math.sqrt(D));
              if (Number.isFinite(q) && q!==0) points.push(q,C/q);
            }
          }
        } catch(e) { /* Abs chưa có đa thức bậc thấp: dùng bộ tích phân số. */ }
      }
      visit(node.left);visit(node.right);visit(node.argument);visit(node.base);
    }
    visit(tree);
  } catch(e) { /* Ngoài tập đại số hỗ trợ; không đoán nghiệm hoặc đổi miền. */ }
  return [...new Set(points.filter(x=>Number.isFinite(x)&&x>Math.min(lower,upper)&&x<Math.max(lower,upper)))].sort((a,b)=>a-b);
}

// Stable primitive for c*sqrt(a ± a*cos(b*x+d)), a>=0. The half-angle
// identity removes cancellation and cusps from quadrature (BUG-025).
// This is an algebraic family, independent of SOLVE seeds or requested roots.
function integralCosineRoot(expression, variables, ans, lower, upper, angleUnit) {
  try {
    const tree=solveAlgebraTree(expression,CALC_BOUND_VARIABLE,variables,ans,false,true);
    const one={num:1n,den:1n},zero=ZERO_FRACTION;
    const scalar=node=>{const p=solveTreePolynomial(node);if(p.length!==1)throw Error('not scalar');return p[0];};
    function scaledRoot(node) {
      if(node.op==='sqrt')return {factor:one,argument:node.argument};
      if(node.op==='multiply') {
        for(const [root,scale]of [[node.left,node.right],[node.right,node.left]])try {
          const term=scaledRoot(root);return {...term,factor:fracMul(term.factor,scalar(scale))};
        }catch(error) { /* Try the other multiplication order. */ }
      }
      if(node.op==='divide') {const term=scaledRoot(node.left);return {...term,factor:fracDiv(term.factor,scalar(node.right))};}
      throw Error('not a scaled root');
    }
    // Collect constant + coefficient*cos(affine angle), using exact rational
    // coefficients so a near-match never changes the mathematical function.
    function cosineLinear(node) {
      if(node.op==='cos') {
        const p=solveTreePolynomial(node.argument);if(p.length>2)throw Error('nonlinear angle');
        return {constant:zero,coefficient:one,angle:[p[0],p[1]||zero]};
      }
      try {return {constant:scalar(node),coefficient:zero,angle:null};}catch(error) { /* Contains cos. */ }
      if(node.op==='add'||node.op==='subtract') {
        const a=cosineLinear(node.left),b=cosineLinear(node.right),op=node.op==='add'?fracAdd:fracSub;
        if(a.angle&&b.angle&&a.angle.some((v,i)=>!fracIsZero(fracSub(v,b.angle[i]))))throw Error('different angles');
        return {constant:op(a.constant,b.constant),coefficient:op(a.coefficient,b.coefficient),angle:a.angle||b.angle};
      }
      if(node.op==='multiply'||node.op==='divide') {
        const choices=node.op==='divide'?[[node.left,node.right]]:[[node.left,node.right],[node.right,node.left]];
        for(const [term,scale]of choices)try {
          const a=cosineLinear(term),b=scalar(scale),op=node.op==='divide'?fracDiv:fracMul;
          return {...a,constant:op(a.constant,b),coefficient:op(a.coefficient,b)};
        }catch(error) { /* Unsupported scale or denominator. */ }
      }
      throw Error('not linear cosine');
    }
    const root=scaledRoot(tree),term=cosineLinear(root.argument);
    if(!term.angle || term.constant.num<=0n || !fracIsZero(fracSub(term.constant,(term.coefficient.num<0n?fracNeg(term.coefficient):term.coefficient))))return null;
    const unit=angleUnit==='deg'?Math.PI/180:angleUnit==='grad'?Math.PI/200:1;
    const frequency=fracToNumber(term.angle[1])*unit/2;
    const phase=fracToNumber(term.angle[0])*unit/2+(term.coefficient.num>0n?Math.PI/2:0);
    const scale=fracToNumber(root.factor)*Math.sqrt(2*fracToNumber(term.constant));
    if(frequency===0)return scale*Math.abs(Math.sin(phase))*(upper-lower);
    let a=frequency*lower+phase,b=frequency*upper+phase,orientation=1;
    if(a>b){[a,b]=[b,a];orientation=-1;}
    const na=Math.floor(a/Math.PI),nb=Math.floor(b/Math.PI);
    if(!Number.isSafeInteger(na)||!Number.isSafeInteger(nb))return null;
    const ra=a-na*Math.PI,rb=b-nb*Math.PI;
    // Sum positive partial periods across a cusp; subtracting complete
    // primitives would cancel a tiny area crossing zero (e.g. ±1e-12).
    const area=na===nb ? 2*Math.sin((ra+rb)/2)*Math.sin((b-a)/2)
      : 2*Math.sin(((na+1)*Math.PI-a)/2)**2 + 2*(nb-na-1) + 2*Math.sin(rb/2)**2;
    const value=orientation*scale*area/frequency;
    return Number.isFinite(value)?value:null;
  } catch(error) { return null; }
}

function numericalIntegral(fn, lower, upper, tolerance = 1e-5, breakpoints = []) {
  if (!Number.isFinite(lower) || !Number.isFinite(upper)) {
    throw new EngineError('Math ERROR');
  }
  if (lower === upper) return 0;

  let sign = 1;
  if (lower > upper) {
    [lower, upper] = [upper, lower];
    sign = -1;
  }
  let evaluations = 0;
  const checkedFn = (x) => {
    evaluations++;
    if (evaluations > INTEGRAL_EVALUATION_LIMIT) throw new EngineError('Time Out');
    const value = fn(x);
    if (!Number.isFinite(value)) throw new EngineError('Math ERROR');
    return value;
  };

  function integrateRange(a, b, tol, depth) {
    const estimate = gaussKronrod15(checkedFn, a, b);
    const threshold = tol * Math.max(1, Math.abs(estimate.value));
    // BUG-049/051/052: các nút ban đầu có thể cùng bỏ lỡ đoạn đổi dấu,
    // khiến Gauss và Kronrod trùng nhau nhưng tổng vẫn sai. Luôn kiểm tra
    // hai nửa khoảng trước khi nhận hội tụ; không dò theo tên biểu thức.
    if (depth > 0 && estimate.error <= threshold) return estimate.value;
    if (depth >= INTEGRAL_MAX_DEPTH) throw new EngineError('Time Out');
    const midpoint = (a + b) / 2;
    return integrateRange(a, midpoint, tol / 2, depth + 1) +
      integrateRange(midpoint, b, tol / 2, depth + 1);
  }

  const cuts=[lower,...breakpoints.filter(x=>x>lower&&x<upper),upper];
  let sum=0,correction=0;
  for (let i=1;i<cuts.length;i++) {
    const part=integrateRange(cuts[i-1],cuts[i],tolerance/(cuts.length-1),0);
    // Kahan: không đánh mất phần diện tích nhỏ khi cộng các khoảng lớn.
    const adjusted=part-correction,next=sum+adjusted;
    correction=(next-sum)-adjusted;sum=next;
  }
  const result = sign * sum;
  if (!Number.isFinite(result)) throw new EngineError('Math ERROR');
  return result;
}

// MathI/MathO khôi phục các kết quả tích phân đơn giản về phân số hoặc bội
// số π. CASIO đã xác nhận trực tiếp 1/2 và π ngày 2026-09-15. Chỉ nhận khi
// sai lệch nhỏ hơn nửa đơn vị ở chữ số hiển thị thứ 10 để không biến một số
// gần đúng tùy ý thành kết quả "chính xác".
function recognizeIntegralResult(value) {
  const tolerance = 5e-11 * Math.max(1, Math.abs(value));
  for (let den = 1; den <= 1000; den++) {
    const num = Math.round(value * den);
    if (num === 0 && value !== 0) continue; // A small nonzero area is not the rational number 0.
    if (Math.abs(num / den - value) <= tolerance) {
      const fraction = fracReduce({ num: BigInt(num), den: BigInt(den) });
      if (fracDigitCount(fraction) <= 10) {
        if (fraction.den === 1n) return fraction.num.toString();
        return '(' + fraction.num.toString() + '÷' + fraction.den.toString() + ')';
      }
    }
  }

  const ratio = Math.abs(value) / Math.PI;
  for (let den = 1; den <= 360; den++) {
    const num = Math.round(ratio * den);
    if (num === 0) continue;
    const candidate = (num / den) * Math.PI;
    if (Math.abs(candidate - Math.abs(value)) <= tolerance) {
      const coefficient = fracReduce({ num: BigInt(num), den: BigInt(den) });
      const numerator = coefficient.num === 1n ? 'π' : coefficient.num.toString() + 'π';
      const magnitude = coefficient.den === 1n
        ? numerator
        : '(' + numerator + '÷' + coefficient.den.toString() + ')';
      return value < 0 ? '-' + magnitude : magnitude;
    }
  }
  return numberToEvalLiteral(value);
}

// Manual tr.64: fx-580VN X lấy đạo hàm số bằng xấp xỉ sai số trung tâm.
// Richardson trên hai bước sai phân trung tâm liên tiếp khử hạng sai số h²;
// bắt đầu với h tương đối 10⁻³ rồi thu nhỏ dần để vừa tránh triệt tiêu số
// khi h quá bé, vừa đủ chính xác cho màn hình 10 chữ số có nghĩa.
function numericalDerivative(fn, point, tolerance = 1e-10) {
  if (!Number.isFinite(point)) throw new EngineError('Math ERROR');
  const scale = Math.max(1, Math.abs(point));
  const baseValue = fn(point);
  if (!Number.isFinite(baseValue)) throw new EngineError('Math ERROR');
  const finalize = (derivative) => {
    const baseMagnitude = Math.abs(baseValue);
    if (baseMagnitude > 0) {
      const relativeInfluence = Math.abs(derivative) * scale / baseMagnitude;
      // CASIO 2026-09-23: gần cực trị của x³−2x+3.5, độ dốc tại
      // 0.81649658 bị làm tròn về 0; điểm 0.8164965 lớn hơn một bậc nhưng
      // vẫn quá kém điều kiện để hội tụ và báo Time Out. So sánh ảnh hưởng
      // của đạo hàm trên thang x với chính giá trị hàm giữ được d/dx(x²)
      // tại 4×10⁻⁹ = 8×10⁻⁹ thay vì dùng ngưỡng tuyệt đối.
      if (relativeInfluence < 1e-8) return 0;
      if (relativeInfluence < 1e-6) throw new EngineError('Time Out');
    }
    return derivative;
  };
  let h = scale * 1e-3;
  let previousRow = [];
  let nearBoundary = false;
  const precisionEstimates = [];
  let finitePrecisionCandidate = null;
  const stable = (estimate, previous) => previous !== undefined &&
    Math.abs(estimate - previous) <= tolerance * Math.max(1, Math.abs(estimate));

  for (let i = 0; i < 50 && point + h !== point && point - h !== point; i++, h /= 2) {
    let central;
    try {
      central = (fn(point + h) - fn(point - h)) / (2 * h);
      if (!Number.isFinite(central)) throw new EngineError('Math ERROR');
    } catch (error) {
      if (!(error instanceof EngineError) || error.message !== 'Math ERROR') throw error;
      nearBoundary = true;
      previousRow = [];
      continue;
    }
    const row = [central];
    const levels = Math.min(previousRow.length, 4);
    for (let level = 0; level < levels; level++) {
      row.push(row[level] + (row[level] - previousRow[level]) / (4 ** (level + 1) - 1));
    }
    // A requested tolerance can be below JS Number precision. Retain a
    // display-accurate estimate only after three independent refinements
    // agree; a cusp such as Abs(x^2-3x+2) never meets this condition.
    if (tolerance < 1e-12 && !nearBoundary && Number.isFinite(row[1])) {
      precisionEstimates.push(row[1]);
      if (precisionEstimates.length > 3) precisionEstimates.shift();
      if (precisionEstimates.length === 3 && finitePrecisionCandidate === null) {
        const ordered = [...precisionEstimates].sort((a,b)=>a-b);
        if (ordered[2]-ordered[0] <= 1e-11*Math.max(1,Math.abs(ordered[1]))) finitePrecisionCandidate = ordered[1];
      }
    }
    // Preserve the ordinary two-step estimate. Near the domain boundary (or
    // at the ordinary limit), use the higher-order estimate if it converged.
    if (!nearBoundary && stable(row[1], previousRow[1])) return finalize(row[1]);
    if ((nearBoundary || i === 9) && levels > 1 && stable(row[levels], previousRow[levels])) {
      return finalize(row[levels]);
    }
    previousRow = row;
    if (!nearBoundary && i === 9) break;
  }

  // Hết ngân sách mà các ước lượng chưa ổn định không phải là một đạo hàm.
  // CASIO 2026-11-04: |x²−3x+2| tại1 báo Time Out; trả best trước đây
  // đã biến một điểm gãy thành số gần0. Giữ phép thử hội tụ phía trên.
  if (finitePrecisionCandidate !== null) return finalize(finitePrecisionCandidate);
  throw new EngineError(previousRow.length === 0 ? 'Math ERROR' : 'Time Out');
}

// Duyệt cây, thay mọi node Σ/Π/d-dx/∫ bằng char node của kết quả đã tính.
// Nhờ vậy serializeForEval/evaluateExpression phía sau không phải biết
// Calculus.
// Đệ quy generic qua
// TEMPLATE_SLOT_FIELDS (giống cloneNodes) nên Σ lồng trong phân số/căn...
// vẫn rút gọn đúng trước.
function linearCalculusNodes880(nodes) {
  const prefixes = [['d/dx(', 'derivative', 2], ['∫(', 'integral', 3],
    ['Σ(', 'sum', 3], ['Π(', 'product', 3]];
  const output = [];
  for (let i = 0; i < nodes.length;) {
    const match = prefixes.find(([text]) => [...text].every((ch, offset) =>
      nodes[i + offset]?.type === 'char' && nodes[i + offset].ch === ch));
    if (!match) { output.push(nodes[i++]); continue; }
    const [prefix, type, arity] = match;
    const args = [[]];
    let depth = 1, end = i + prefix.length;
    for (; end < nodes.length; end++) {
      const part = nodes[end];
      const ch = part.type === 'char' ? part.ch : null;
      if (ch === '(') depth++;
      if (ch === ')' && --depth === 0) break;
      if (ch === ',' && depth === 1) args.push([]);
      else args.at(-1).push(part);
    }
    const optionalTolerance = ['derivative','integral'].includes(type) && args.length === arity + 1;
    if ((!optionalTolerance && args.length !== arity) || args.some(arg => !arg.length)) throw new EngineError('Syntax ERROR');
    const parsed = args.map(linearCalculusNodes880);
    const [body, lower, upper] = parsed;
    const node = type === 'derivative' ? {type, body, point:lower} : {type, body, lower, upper};
    if (type === 'sum' || type === 'product') {
      node.discreteEnd = {list:nodes,index:Math.min(end,nodes.length)};
    }
    if (optionalTolerance) {
      node.tolerance = parsed[arity];
      node.toleranceEnd = {list:nodes,index:Math.min(end,nodes.length)};
    }
    output.push(node);
    i = Math.min(nodes.length, end + 1);
  }
  return output;
}

function correspondingCalculusList880(original, evaluated, target) {
  if (evaluated === target) return original;
  // Completing Rnd()/Int() may insert character nodes before a template.
  // Match templates in order rather than assuming identical character indices.
  const originals = original.filter(node => TEMPLATE_SLOT_FIELDS[node.type]);
  const templates = evaluated.filter(node => TEMPLATE_SLOT_FIELDS[node.type]);
  for (let index = 0; index < templates.length; index++) {
    if (originals[index]?.type !== templates[index].type) continue;
    for (const field of TEMPLATE_SLOT_FIELDS[templates[index].type]) {
      const found = correspondingCalculusList880(originals[index][field], templates[index][field], target);
      if (found) return found;
    }
  }
  return null;
}

function reduceCalcNodes(nodes, ansValue, vars, angleUnit,
                         ansExactValue = null, varsExactValues = {}, numberFormat = DEFAULT_NUMBER_FORMAT, plusModel = false) {
  if (plusModel) nodes = linearCalculusNodes880(nodes);
  const readTolerance = node => {
    if (!node.tolerance) return null;
    if (containsCalcNode(node.tolerance)) throw new EngineError('Syntax ERROR');
    const expression = autoCloseParens(serializeForEval(node.tolerance));
    const value = evaluateExpression(expression, ansValue, vars, angleUnit, 0, numberFormat, null, null, {plusModel});
    if (value <= 0) {
      const error = new EngineError('Argument ERROR');
      error.calculusInputEnd = node.toleranceEnd;
      throw error;
    }
    return value;
  };
  const out = [];
  // Calculus is one operand: 2Σ(x,1,3) is 2×6, never the digit string 26.
  const literal = text => charNodes(plusModel ? '(' + text + ')' : text);
  for (const node of nodes) {
    try {
      if (node.type === 'sum') {
        if (containsCalcNode(node.lower) || containsCalcNode(node.upper) || containsCalcNode(node.body)) {
          throw new EngineError('Syntax ERROR');
        }
        const lowerExpr = autoCloseParens(serializeForEval(reduceCalcNodes(
          node.lower, ansValue, vars, angleUnit, ansExactValue, varsExactValues, numberFormat, plusModel
        )));
        const upperExpr = autoCloseParens(serializeForEval(reduceCalcNodes(
          node.upper, ansValue, vars, angleUnit, ansExactValue, varsExactValues, numberFormat, plusModel
        )));
        const lowerVal = evaluateExpression(lowerExpr, ansValue, vars, angleUnit, 0, numberFormat, null, null, {plusModel});
        const upperVal = evaluateExpression(upperExpr, ansValue, vars, angleUnit, 0, numberFormat, null, null, {plusModel});
        // ĐÃ XÁC NHẬN máy thật 2026-08-17: cận Σ không hợp lệ báo "Argument
        // ERROR", KHÔNG phải "Math ERROR" như bản đầu đoán. Đúng cho CẢ HAI ca
        // đã thử trên máy (cận dưới > cận trên; cận không nguyên). Đây là một
        // mã lỗi riêng của máy thật, cùng họ với Syntax/Math ERROR — xem
        // docs/manual.txt dòng 5589 ("Argument ERROR — Có vấn đề với đối số
        // của phép tính bạn đang thực hiện").
        if (!Number.isInteger(lowerVal) || !Number.isInteger(upperVal) || lowerVal > upperVal ||
            plusModel && (Math.abs(lowerVal) >= 1e10 || Math.abs(upperVal) >= 1e10)) {
          const error = new EngineError('Argument ERROR');
          if (plusModel && lowerVal > upperVal) error.calculusUpper = node.upper;
          throw error;
        }
        if (upperVal - lowerVal > CALC_ITERATION_LIMIT) {
          throw new EngineError('Vùng tính quá lớn (giới hạn bản mô phỏng)');
        }
        const bodyExpr = autoCloseParens(serializeForEval(reduceCalcNodes(
          node.body, ansValue, vars, angleUnit, ansExactValue, varsExactValues, numberFormat, plusModel
        )));
        let total = 0;
        let exactTotal = ZERO_FRACTION;
        let hasExactTotal = plusModel;
        for (let x = lowerVal; x <= upperVal; x++) {
          const termContext = {plusModel};
          total += evaluateExpression(bodyExpr, ansValue, { ...vars, [CALC_BOUND_VARIABLE]: x },
            angleUnit, plusModel ? 1e-99 : 0, numberFormat, null, null, termContext);
          if (termContext.underflow) hasExactTotal = false;
          if (plusModel) {
            if (!Number.isFinite(total) || Math.abs(total) > 9.999999999e99) throw new EngineError('Math ERROR');
            if (total !== 0 && Math.abs(total) < 1e-99) {total = 0; hasExactTotal = false;}
          }
          if (hasExactTotal) {
            try {
              const term = evaluateExpressionExact(bodyExpr, ansExactValue,
                { ...varsExactValues, [CALC_BOUND_VARIABLE]: {num:BigInt(x),den:1n} }, angleUnit);
              exactTotal = fracAdd(exactTotal, term);
              // Keep the rational branch bounded; a long sum still uses the
              // ordinary numerical evaluator when its exact terms grow too far.
              if (fracDigitCount(exactTotal) > 100) hasExactTotal = false;
            } catch (error) {
              hasExactTotal = false;
            }
          }
        }
        if (!Number.isFinite(total)) {
          throw new EngineError('Math ERROR');
        }
        // PLUS, 2026-11-18: Σ(1/x,x=1,3) returns 11/6. Preserve a small
        // exact rational result, including for Ans and expressions around Σ.
        const exactUsable = hasExactTotal && fracDigitCount(exactTotal) <= 10 &&
          fracRoughlyEqualsFloat(exactTotal, total);
        out.push(...literal(exactUsable ? fractionToEvalLiteral(exactTotal) : numberToEvalLiteral(total)));
      } else if (node.type === 'product') {
        if (containsCalcNode(node.lower) || containsCalcNode(node.upper) || containsCalcNode(node.body)) {
          throw new EngineError('Syntax ERROR');
        }
        const lowerExpr = autoCloseParens(serializeForEval(reduceCalcNodes(
          node.lower, ansValue, vars, angleUnit, ansExactValue, varsExactValues, numberFormat, plusModel
        )));
        const upperExpr = autoCloseParens(serializeForEval(reduceCalcNodes(
          node.upper, ansValue, vars, angleUnit, ansExactValue, varsExactValues, numberFormat, plusModel
        )));
        const lowerVal = evaluateExpression(lowerExpr, ansValue, vars, angleUnit, 0, numberFormat, null, null, {plusModel});
        const upperVal = evaluateExpression(upperExpr, ansValue, vars, angleUnit, 0, numberFormat, null, null, {plusModel});
        // Manual tr.66: a và b là số nguyên, a≤b và đều nhỏ hơn 10^10.
        // Hai nhánh đầu đã bấm trực tiếp trên CASIO ngày 2026-09-15 và cùng
        // trả Argument ERROR.
        if (!Number.isInteger(lowerVal) || !Number.isInteger(upperVal) ||
            lowerVal > upperVal || lowerVal >= 1e10 || upperVal >= 1e10 ||
            plusModel && (lowerVal <= -1e10 || upperVal <= -1e10)) {
          throw new EngineError('Argument ERROR');
        }
        if (upperVal - lowerVal > CALC_ITERATION_LIMIT) {
          throw new EngineError('Vùng tính quá lớn (giới hạn bản mô phỏng)');
        }
        const bodyExpr = autoCloseParens(serializeForEval(reduceCalcNodes(
          node.body, ansValue, vars, angleUnit, ansExactValue, varsExactValues, numberFormat, plusModel
        )));
        let product = 1;
        let exactProduct = { num: 1n, den: 1n };
        let hasExactProduct = true;
        for (let x = lowerVal; x <= upperVal; x++) {
          const termContext = {plusModel};
          product *= evaluateExpression(
            bodyExpr,
            ansValue,
            { ...vars, [CALC_BOUND_VARIABLE]: x },
            angleUnit, plusModel ? 1e-99 : 0, numberFormat, null, null, termContext
          );
          if (termContext.underflow) hasExactProduct = false;
          // fx-580VN X chỉ giữ số thực tới 9.999999999×10^99. Bấm trực tiếp
          // Π(100,x=1,200) ngày 2026-09-15 trả Math ERROR.
          if (!Number.isFinite(product) || Math.abs(product) > 9.999999999e99) {
            throw new EngineError('Math ERROR');
          }
          if (plusModel && product !== 0 && Math.abs(product) < 1e-99) {
            product = 0;
            hasExactProduct = false;
          }
          if (hasExactProduct) {
            try {
              const exactTerm = evaluateExpressionExact(
                bodyExpr,
                ansExactValue,
                { ...varsExactValues, [CALC_BOUND_VARIABLE]: { num: BigInt(x), den: 1n } },
                angleUnit
              );
              exactProduct = fracMul(exactProduct, exactTerm);
            } catch (e) {
              hasExactProduct = false;
            }
          }
        }
        const exactUsable = hasExactProduct && fracDigitCount(exactProduct) <= 10 &&
          fracRoughlyEqualsFloat(exactProduct, product);
        out.push(...literal(exactUsable
          ? fractionToEvalLiteral(exactProduct)
          : numberToEvalLiteral(product)));
      } else if (node.type === 'derivative') {
        const tolerance = readTolerance(node);
        if (containsCalcNode(node.point) || containsCalcNode(node.body)) {
          throw new EngineError('Syntax ERROR');
        }
        const pointExpr = autoCloseParens(serializeForEval(
          reduceCalcNodes(node.point, ansValue, vars, angleUnit, ansExactValue, varsExactValues, numberFormat, plusModel)
        ));
        const point = evaluateExpression(pointExpr, ansValue, vars, angleUnit, 0, numberFormat, null, null, {plusModel});
        const bodyExpr = autoCloseParens(serializeForEval(
          reduceCalcNodes(node.body, ansValue, vars, angleUnit, ansExactValue, varsExactValues, numberFormat, plusModel)
        ));
        const polynomial = tolerance === null ? null : calculusPolynomial880(
          bodyExpr, {...vars,...varsExactValues}, ansExactValue || ansValue, point);
        // Preserve the evaluator's intermediate-domain checks even when a
        // polynomial permits an exact derivative for a very small tolerance.
        if (polynomial !== null) evaluateExpression(bodyExpr, ansValue,
          {...vars,[CALC_BOUND_VARIABLE]:point}, angleUnit, 0, numberFormat, null, null, {plusModel});
        const value = polynomial !== null ? polynomial : numericalDerivative(
          (x) => evaluateExpression(
            bodyExpr,
            ansValue,
            { ...vars, [CALC_BOUND_VARIABLE]: x },
            angleUnit, 0, numberFormat, null, null, {plusModel}
          ),
          point,
          tolerance === null ? 1e-10 : tolerance
        );
        out.push(...literal(plusModel ? recognizeIntegralResult(value) : numberToEvalLiteral(value)));
      } else if (node.type === 'integral') {
        const tolerance = readTolerance(node);
        if (containsCalcNode(node.lower) || containsCalcNode(node.upper) || containsCalcNode(node.body)) {
          throw new EngineError('Syntax ERROR');
        }
        const lowerExpr = autoCloseParens(serializeForEval(
          reduceCalcNodes(node.lower, ansValue, vars, angleUnit, ansExactValue, varsExactValues, numberFormat, plusModel)
        ));
        const upperExpr = autoCloseParens(serializeForEval(
          reduceCalcNodes(node.upper, ansValue, vars, angleUnit, ansExactValue, varsExactValues, numberFormat, plusModel)
        ));
        const lower = evaluateExpression(lowerExpr, ansValue, vars, angleUnit, 0, numberFormat, null, null, {plusModel});
        const upper = evaluateExpression(upperExpr, ansValue, vars, angleUnit, 0, numberFormat, null, null, {plusModel});
        const bodyExpr = autoCloseParens(serializeForEval(
          reduceCalcNodes(node.body, ansValue, vars, angleUnit, ansExactValue, varsExactValues, numberFormat, plusModel)
        ));
        if (plusModel && lower !== upper) {
          try {
            for (const point of [lower,upper]) evaluateExpression(bodyExpr, ansValue,
              {...vars,[CALC_BOUND_VARIABLE]:point},angleUnit,0,numberFormat);
          } catch (error) {
            error.calculusEndpoint = node.body;
            throw error;
          }
        }
        const polynomial = tolerance === null ? null : calculusPolynomial880(
          bodyExpr, {...vars,...varsExactValues}, ansExactValue || ansValue, lower, upper);
        const closedForm = polynomial !== null ? polynomial : integralCosineRoot(bodyExpr, { ...vars, ...varsExactValues },
          ansExactValue || ansValue, lower, upper, angleUnit);
        const value = closedForm === null ? numericalIntegral(
          (x) => evaluateExpression(
            bodyExpr,
            ansValue,
            { ...vars, [CALC_BOUND_VARIABLE]: x },
            angleUnit, 0, numberFormat, null, null, {plusModel}
          ),
          lower,
          upper,
          tolerance === null ? 1e-5 : tolerance,
          integralAbsBreakpoints(bodyExpr, { ...vars, ...varsExactValues }, ansExactValue || ansValue, lower, upper)
        ) : closedForm;
        out.push(...literal(recognizeIntegralResult(value)));
      } else {
        const fields = TEMPLATE_SLOT_FIELDS[node.type];
        if (!fields) {
          out.push(node);
        } else {
          const copy = { ...node };
          fields.forEach((field) => {
            copy[field] = reduceCalcNodes(
              node[field], ansValue, vars, angleUnit, ansExactValue, varsExactValues, numberFormat, plusModel
            );
          });
          out.push(copy);
        }
      }
    } catch (error) {
      if (plusModel && node.discreteEnd) error.calculusInputEnd = node.discreteEnd;
      else if (plusModel && (node.type === 'sum' || node.type === 'product')) {
        error.calculusUpper = error.message === 'Argument ERROR' ? node.upper : node.body;
      }
      throw error;
    }
  }
  return out;
}

// Tìm node mẫu đang chứa một vùng nhập, để con trỏ biết cách bước ra ngoài
// hoặc nhảy sang vùng kế tiếp. Trả về cả danh sách vùng nhập của node đó và
// chỉ số của vùng đang chứa con trỏ.
function findListOwner(nodes, targetList) {
  for (let i = 0; i < nodes.length; i++) {
    const slots = templateSlots(nodes[i]);
    for (let s = 0; s < slots.length; s++) {
      if (slots[s] === targetList) {
        return { node: nodes[i], slots, slotIndex: s, parentList: nodes, index: i };
      }
    }
    for (const slot of slots) {
      const found = findListOwner(slot, targetList);
      if (found) return found;
    }
  }
  return null;
}

// BITEX 2026-10-24: chứng nhận đại số trước Newton để tránh zero giả ở
// nghiệm bội. Chỉ nhận tập con có thể chứng minh; biểu thức khác giữ bộ giải
// số cũ. Hệ số Fraction, bậc tối đa 8; không lấy mẫu rồi đoán đa thức.
function solveAlgebraTree(expression, variable, variables, ans, allowAbs = false, allowCos = false) {
  const tokens=tokenize(expression); let index=0;
  const one={num:1n,den:1n};
  const constant=value=>({op:'constant',value});
  const binary=(op,left,right)=>({op,left,right});
  const exactConstant=value=>value && typeof value.num==='bigint' && typeof value.den==='bigint'
    ? value : roundedNumberFraction(value ?? 0);
  const take=type=>tokens[index]?.type===type ? (index++,true) : false;
  const requireToken=type=>{if(!take(type))throw new Error('unsupported algebra');};
  function atom() {
    const token=tokens[index++]; if(!token)throw new Error('missing atom');
    if(token.type==='NUMBER')return constant(fractionFromDecimalString(token.sourceRaw || token.raw));
    if(token.type==='VARIABLE')return token.name===variable ? {op:'variable'}
      : constant(exactConstant(variables[token.name]));
    if(token.type==='ANS')return constant(exactConstant(ans));
    if(token.type==='LPAREN'){const node=sum();requireToken('RPAREN');return node;}
    if(allowCos && token.type==='PI')return constant(roundedNumberFraction(Math.PI));
    if(allowCos && token.type==='COS'){requireToken('LPAREN');const argument=sum();requireToken('RPAREN');return {op:'cos',argument};}
    if(allowAbs && token.type==='ABS'){requireToken('LPAREN');const argument=sum();requireToken('RPAREN');return {op:'abs',argument};}
    if(token.type==='SQRT'){requireToken('LPAREN');const argument=sum();requireToken('RPAREN');return {op:'sqrt',argument};}
    if(token.type==='LOGBASE') {
      requireToken('LPAREN');const base=sum();requireToken('COMMA');
      const argument=sum();requireToken('RPAREN');return {op:'log',base,argument};
    }
    if(token.type==='LOG'||token.type==='LN') {
      requireToken('LPAREN');const argument=sum();requireToken('RPAREN');
      // Cơ số e giữ dưới dạng ký hiệu, không thay bằng xấp xỉ thập phân.
      const base=token.type==='LN'?{op:'naturalBase'}:constant({num:10n,den:1n});
      return {op:'log',base,argument};
    }
    throw new Error('unsupported atom');
  }
  function power() {
    let node=atom();
    while(tokens[index]?.type==='SQUARE'||tokens[index]?.type==='CUBE') {
      const n=tokens[index++].type==='SQUARE'?2n:3n;
      node=binary('power',node,constant({num:n,den:1n}));
    }
    if(take('CARET'))node=binary('power',node,power());
    return node;
  }
  function unary() {
    if(take('MINUS'))return binary('multiply',constant(fracNeg(one)),implicit());
    return implicit();
  }
  function implicit() {
    let node=power();
    while(['NUMBER','VARIABLE','ANS','LPAREN','LOGBASE','LOG','LN','SQRT',...(allowAbs?['ABS']:[]),...(allowCos?['COS','PI']:[])].includes(tokens[index]?.type))node=binary('multiply',node,power());
    return node;
  }
  function product() {
    let node=unary();
    while(['MUL','DIV'].includes(tokens[index]?.type)) {
      const op=tokens[index++].type==='MUL'?'multiply':'divide';node=binary(op,node,unary());
    }
    return node;
  }
  function sum() {
    let node=product();
    while(['PLUS','MINUS'].includes(tokens[index]?.type)) {
      const op=tokens[index++].type==='PLUS'?'add':'subtract';node=binary(op,node,product());
    }
    return node;
  }
  if(tokens.length>500)throw new Error('algebra budget');
  const tree=sum();if(index!==tokens.length)throw new Error('unsupported trailing token');
  return tree;
}

// Coefficients ascending: constant, x, x², ... (independent of Equation UI).
function solvePolyTrim(p) {
  while(p.length>1 && fracIsZero(p[p.length-1]))p.pop();return p;
}
function solvePolyAdd(a,b,subtract=false) {
  return solvePolyTrim(Array.from({length:Math.max(a.length,b.length)},(_,i)=>
    (subtract?fracSub:fracAdd)(a[i]||ZERO_FRACTION,b[i]||ZERO_FRACTION)));
}
function solvePolyMultiply(a,b) {
  if(a.length+b.length>10)throw new Error('algebra degree budget');
  const out=Array(a.length+b.length-1).fill(ZERO_FRACTION);
  a.forEach((v,i)=>b.forEach((w,j)=>{out[i+j]=fracAdd(out[i+j],fracMul(v,w));}));
  return solvePolyTrim(out);
}
function solveTreePolynomial(tree, strictDomain = false) {
  const one={num:1n,den:1n};
  if(tree.op==='constant')return [tree.value];
  if(tree.op==='variable')return [ZERO_FRACTION,one];
  const a=solveTreePolynomial(tree.left,strictDomain),b=solveTreePolynomial(tree.right,strictDomain);
  if(tree.op==='add'||tree.op==='subtract')return solvePolyAdd(a,b,tree.op==='subtract');
  if(tree.op==='multiply')return solvePolyMultiply(a,b);
  if(tree.op==='divide'&&b.length===1&&!fracIsZero(b[0]))return a.map(v=>fracDiv(v,b[0]));
  if(tree.op==='power'&&b.length===1&&b[0].den===1n&&b[0].num>=0n&&b[0].num<=8n) {
    if(strictDomain&&b[0].num===0n)throw new Error('zero exponent can erase an excluded point');
    let out=[one];for(let n=0n;n<b[0].num;n++)out=solvePolyMultiply(out,a);return out;
  }
  throw new Error('not a bounded polynomial');
}

// Explicit calculus tolerances can be below binary floating-point noise.
// Rational polynomials have exact primitives/derivatives; unsupported bodies
// continue through the numerical algorithms with the requested tolerance.
function calculusPolynomial880(expression, variables, ans, lower, upper) {
  try {
    const coefficients = solveTreePolynomial(solveAlgebraTree(expression, CALC_BOUND_VARIABLE, variables, ans), true);
    const evaluate = (terms, point) => terms.reduceRight((sum, coefficient) =>
      fracAdd(fracMul(sum, roundedNumberFraction(point)), coefficient), ZERO_FRACTION);
    const terms = upper === undefined ? coefficients.slice(1).map((c,index) =>
      fracMul(c,{num:BigInt(index+1),den:1n})) : [ZERO_FRACTION,...coefficients.map((c,index) =>
      fracDiv(c,{num:BigInt(index+1),den:1n}))];
    const result = upper === undefined ? evaluate(terms,lower)
      : fracSub(evaluate(terms,upper),evaluate(terms,lower));
    const value = fracToNumber(result);
    return Number.isFinite(value) ? value : null;
  } catch (_) { return null; }
}

function solveCubicRecoveryPolynomial(left, right, variable, variables, ans) {
  try {
    const polynomial = expression => solveTreePolynomial(solveAlgebraTree(expression, variable, variables, ans), true);
    const coefficients = solvePolyAdd(polynomial(left), polynomial(right), true);
    return coefficients.length === 4 ? coefficients : null;
  } catch (error) {
    return null;
  }
}

function solveCubicRecoverySlope(coefficients) {
  if (!coefficients) return null;
  const [c, b, a] = coefficients.slice(1).map(fracToNumber);
  if (!Number.isFinite(3 * a) || !Number.isFinite(2 * b) || !Number.isFinite(c) || a === 0) return null;
  return point => (3 * a * point + 2 * b) * point + c;
}

// Mẫu thanh ghi đo sau đợt 40 bước bắt đầu tại −10^7 trên fx-880BTG PLUS.
// Khóa là hệ số chính xác từ hằng số tới x³. Nhân hai vế có thể đổi đuôi x.
// Nguồn: test/fixtures/classpad-880-solve-cubic-memory-lcd.json.
const PLUS_CUBIC_REGISTER_SAMPLES = Object.freeze({
  '39/10,-2/1,0/1,1/1': {value:'-1.9955482827856508590048', direct:true},
  '39/5,-4/1,0/1,2/1': {value:'-1.9955482827851373726765'},
  '4/1,-2/1,0/1,1/1': {value:'-2.0053146304690078907055'},
  '9/2,-2/1,0/1,1/1': {value:'-2.0526555644273391277704'},
  '389/100,-2/1,0/1,1/1': {value:'-1.9945659085951051794583'}
});

function solveCubicDecimalPass(coefficients, point, iterations) {
  // Giữ hiệu chỉnh Newton trong 23 chữ số thập phân. Chỉ áp dụng cho
  // một đợt đủ bước mà |L−R| giảm đều và L−R giữ nguyên dấu.
  const round = value => solveProbeRoundFraction(value, 23, true);
  const evaluate = (terms, x) => terms.reduceRight((sum, coefficient) =>
    round(fracAdd(round(fracMul(sum, x)), coefficient)), ZERO_FRACTION);
  const values = coefficients.map(round);
  const slope = values.slice(1).map((value, index) => round(fracMul(value, {num:BigInt(index + 1), den:1n})));
  point = round(point);
  let difference = evaluate(values, point);
  for (let i = 0; i < iterations; i++) {
    const exponent = calculationFractionExponent(difference);
    const gradient = evaluate(slope, point);
    if (exponent < -99 || exponent >= 100 || fracIsZero(gradient)) return null;
    const candidate = round(fracSub(point, round(fracDiv(difference, gradient))));
    if (calculationFractionExponent(candidate) >= 100) return null;
    const next = evaluate(values, candidate);
    if (next.num * difference.num <= 0n ||
        bigAbs(next.num) * difference.den >= bigAbs(difference.num) * next.den) return null;
    point = candidate;
    difference = next;
  }
  const residual = fracToNumber(difference);
  return Number.isFinite(residual) && Math.abs(residual) >= 1e-99 ? {memoryExact:point, residual} : null;
}

function solvePlusCubicRegister(solution, coefficients, initialValue, initialExact, iterations) {
  if (!coefficients || solution.converged || solution.stalled) return null;
  const key = coefficients.map(({num, den}) => `${num}/${den}`).join(',');
  const reference = PLUS_CUBIC_REGISTER_SAMPLES[key];
  // Ca gốc được đo cả khi nhập trực tiếp −10^7 và khi Newton phục hồi.
  const measuredStart = solution.recoveryStart === -1e7 ||
    (initialValue === -1e7 && !solution.recovery && reference?.direct);
  let reading;
  if (reference && measuredStart) {
    const memoryExact = fractionFromDecimalString(reference.value);
    const residual = coefficients.reduceRight((sum, coefficient) =>
      fracAdd(fracMul(sum, memoryExact), coefficient), ZERO_FRACTION);
    reading = {memoryExact, residual:fracToNumber(residual)};
  } else {
    const start = solution.recoveryStart === undefined
      ? initialExact || roundedNumberFraction(initialValue) : roundedNumberFraction(solution.recoveryStart);
    reading = solveCubicDecimalPass(coefficients, start, iterations);
  }
  if (!reading) return null;
  const {memoryExact, residual} = reading;
  const value = fracToNumber(memoryExact);
  if (!Number.isFinite(value) || Math.abs(value - solution.value) > 1e-8) return null;
  return {...solution, value, residual, memoryExact};
}
// Chứng nhận đa thức không bao giờ bằng 0: dịch biến để bỏ hệ số bậc
// n−1, rồi yêu cầu chỉ có các lũy thừa chẵn cùng dấu và hằng khác 0.
// Ví dụ BUG-060 cho 3t^4+7t²+4>0 với t=x+2. Nếu không chứng minh
// được bằng tiêu chí đủ này, trả false (không có nghĩa là có nghiệm).
function solvePolyHasStrictSign(p) {
  const degree=p.length-1;
  if(degree===0)return !fracIsZero(p[0]);
  if(degree%2)return false;
  const shift=fracNeg(fracDiv(p[degree-1],fracMul(p[degree],{num:BigInt(degree),den:1n})));
  let transformed=[ZERO_FRACTION],power=[{num:1n,den:1n}];
  for(let i=0;i<=degree;i++) {
    transformed=solvePolyAdd(transformed,power.map(v=>fracMul(v,p[i])));
    if(i<degree)power=solvePolyMultiply(power,[shift,{num:1n,den:1n}]);
  }
  if(fracIsZero(transformed[0]))return false;
  const positive=transformed[0].num>0n;
  return transformed.every((v,i)=>fracIsZero(v)||(!(i%2)&&(v.num>0n)===positive));
}
function solveRadicalTerm(tree) {
  if(tree.op==='sqrt')return {factor:[{num:1n,den:1n}],radicand:solveTreePolynomial(tree.argument)};
  if(tree.op==='multiply') {
    for(const [radical,factor] of [[tree.left,tree.right],[tree.right,tree.left]]) {
      const term=solveRadicalTerm(radical);
      if(term)return {factor:solvePolyMultiply(term.factor,solveTreePolynomial(factor)),radicand:term.radicand};
    }
  }
  return null;
}
// Một chứng nhận vô nghiệm là đẳng thức đại số bất khả thi, không phải
// kiểm tra |L−R| với epsilon. Log cùng cơ số: log(A)=n log(B) => A=B^n
// trên miền A,B>0. Nếu A−B^n là hằng khác 0, không có nghiệm trên miền đó.
function solveCertifiedNoRealRoot(left,right,variable,variables,ans) {
  try {
    let lhs=solveAlgebraTree(left,variable,variables,ans);
    let rhs=solveAlgebraTree(right,variable,variables,ans);
    if(lhs.op==='subtract' && rhs.op==='constant' && fracIsZero(rhs.value)) {
      rhs=lhs.right;lhs=lhs.left;
    }
    // Hai đa thức luôn lệch một hằng khác 0 cũng không thể có nghiệm,
    // kể cả khi giá trị rất lớn làm phép trừ số thực bị làm tròn về 0.
    try {
      const difference=solvePolyAdd(solveTreePolynomial(lhs),solveTreePolynomial(rhs),true);
      if(difference.length===1&&!fracIsZero(difference[0]))return true;
    } catch(e) { /* Không phải cặp đa thức; xét log/căn bên dưới. */ }
    // P√Q=R kéo theo P²Q−R²=0 trên miền thực. Nếu hiệu bình phương
    // luôn khác 0 thì không có nghiệm; không suy ngược để nhận nghiệm
    // ngoại lai do bình phương hai vế.
    for(const [first,second] of [[lhs,rhs],[rhs,lhs]]) {
      const radical=solveRadicalTerm(first);if(!radical)continue;
      const other=solveTreePolynomial(second);
      const squared=solvePolyAdd(solvePolyMultiply(solvePolyMultiply(radical.factor,radical.factor),radical.radicand),
        solvePolyMultiply(other,other),true);
      if(solvePolyHasStrictSign(squared))return true;
    }
    const one={num:1n,den:1n};
    const logTerm=tree=>{
      if(tree.op==='log')return {log:tree,scale:one};
      if(tree.op==='multiply') {
        for(const [factor,term] of [[tree.left,tree.right],[tree.right,tree.left]]) {
          if(term.op!=='log')continue;
          const scale=solveTreePolynomial(factor);
          if(scale.length===1&&!fracIsZero(scale[0]))return {log:term,scale:scale[0]};
        }
      }
      return null;
    };
    const a=logTerm(lhs),b=logTerm(rhs);if(!a||!b)return false;
    if(a.log.base.op==='naturalBase'||b.log.base.op==='naturalBase') {
      if(a.log.base.op!==b.log.base.op)return false;
    } else {
      const baseA=solveTreePolynomial(a.log.base),baseB=solveTreePolynomial(b.log.base);
      if(baseA.length!==1||baseB.length!==1||!fracIsZero(fracSub(baseA[0],baseB[0]))||
         baseA[0].num<=0n||fracIsZero(fracSub(baseA[0],one)))return false;
    }
    for(const [first,second] of [[a,b],[b,a]]) {
      const exponent=fracDiv(second.scale,first.scale);
      if(exponent.den!==1n||exponent.num<1n||exponent.num>8n)continue;
      const p=solveTreePolynomial(first.log.argument),q=solveTreePolynomial(second.log.argument);
      let qPower=[one];for(let n=0n;n<exponent.num;n++)qPower=solvePolyMultiply(qPower,q);
      const difference=solvePolyAdd(p,qPower,true);
      if(difference.length===1&&!fracIsZero(difference[0]))return true;
    }
    return false;
  } catch(e) { return false; }
}
// Nhận diện hai đa thức có hiệu hằng khác0 để thử hành vi zero hữu hạn.
// Đây là phân loại đại số; không gán số CASIO theo hệ số hoặc seed.
function solveIsConstantPolynomialBalance(left, right, variable, variables, ans) {
  try {
    const difference = solvePolyAdd(
      solveTreePolynomial(solveAlgebraTree(left, variable, variables, ans)),
      solveTreePolynomial(solveAlgebraTree(right, variable, variables, ans)), true);
    return difference.length === 1 && !fracIsZero(difference[0]);
  } catch (error) { return false; }
}

function solveCertifiedRepeatedRoot(left,right,variable,variables,ans) {
  try {
    const p=solvePolyAdd(solveTreePolynomial(solveAlgebraTree(left,variable,variables,ans)),
      solveTreePolynomial(solveAlgebraTree(right,variable,variables,ans)),true);
    const degree=p.length-1;if(degree<2)return null;
    const root=fracNeg(fracDiv(p[degree-1],fracMul(p[degree],{num:BigInt(degree),den:1n})));
    let expanded=[p[degree]];
    for(let i=0;i<degree;i++)expanded=solvePolyMultiply(expanded,[fracNeg(root),{num:1n,den:1n}]);
    if(!p.every((v,i)=>fracIsZero(fracSub(v,expanded[i]))))return null;
    const value=fracToNumber(root);
    if(!Number.isFinite(value)||Math.abs(value)>9.999999999e99||(value!==0&&Math.abs(value)<1e-99))return null;
    return {value,residual:0,converged:true,multiplicity:degree,memoryExact:root};
  } catch(e) { return null; }
}

// Phương trình hữu tỉ quy về bậcnhất có nghiệm duy nhất. Nhân chéo chỉ
// sinh ứng viên; phải thế lại cả hai cây gốc để giữ mọi điểm loại ở mẫu.
function solveCertifiedRationalLinear(left,right,variable,variables,ans) {
  try {
    const lhs=solveAlgebraTree(left,variable,variables,ans),rhs=solveAlgebraTree(right,variable,variables,ans);
    const one={num:1n,den:1n};let variableDivisor=false;
    const depends=node=>node.op==='variable'||Boolean(node.left&&depends(node.left))||Boolean(node.right&&depends(node.right));
    const pair=(num,den)=>{
      if([...num,...den].some(v=>bigAbs(v.num).toString().length>600||v.den.toString().length>600))throw new Error('rational budget');
      return {num,den};
    };
    function rational(node) {
      if(node.op==='constant')return pair([node.value],[one]);
      if(node.op==='variable')return pair([ZERO_FRACTION,one],[one]);
      if(!['add','subtract','multiply','divide','power'].includes(node.op))throw new Error('not rational');
      const a=rational(node.left),b=rational(node.right);
      if(node.op==='add'||node.op==='subtract')return pair(solvePolyAdd(solvePolyMultiply(a.num,b.den),solvePolyMultiply(b.num,a.den),node.op==='subtract'),solvePolyMultiply(a.den,b.den));
      if(node.op==='multiply')return pair(solvePolyMultiply(a.num,b.num),solvePolyMultiply(a.den,b.den));
      if(node.op==='divide') {
        if(depends(node.right))variableDivisor=true;
        return pair(solvePolyMultiply(a.num,b.den),solvePolyMultiply(a.den,b.num));
      }
      if(b.num.length!==1||b.den.length!==1)throw new Error('variable exponent');
      const exponent=fracDiv(b.num[0],b.den[0]);
      if(exponent.den!==1n||exponent.num<0n||exponent.num>8n)throw new Error('power budget');
      let result=pair([one],[one]);
      for(let i=0n;i<exponent.num;i++)result=pair(solvePolyMultiply(result.num,a.num),solvePolyMultiply(result.den,a.den));
      return result;
    }
    const a=rational(lhs),b=rational(rhs);
    if(!variableDivisor)return null; // không đổi đường đa thức/linear cũ
    const difference=solvePolyAdd(solvePolyMultiply(a.num,b.den),solvePolyMultiply(b.num,a.den),true);
    if(difference.length!==2||fracIsZero(difference[1]))return null;
    const root=fracNeg(fracDiv(difference[0],difference[1]));
    function original(node) {
      if(node.op==='constant')return node.value;
      if(node.op==='variable')return root;
      const a=original(node.left),b=original(node.right);
      if(node.op==='add')return fracAdd(a,b);
      if(node.op==='subtract')return fracSub(a,b);
      if(node.op==='multiply')return fracMul(a,b);
      if(node.op==='divide')return fracDiv(a,b); // gồm mẫu đã bị khử khi nhân chéo
      if(fracIsZero(a)&&fracIsZero(b))throw new Error('undefined zero power');
      return fracPowInt(a,Number(b.num));
    }
    if(!fracIsZero(fracSub(original(lhs),original(rhs))))return null;
    const value=fracToNumber(root);
    if(!Number.isFinite(value)||Math.abs(value)>9.999999999e99||(value!==0&&Math.abs(value)<1e-99))return null;
    return {value,residual:0,converged:true,memoryExact:root};
  } catch(error) { return null; }
}

// SOLVE: nếu Newton kẹt ở nhánh không chứa nghiệm của đa thức bậc ba,
// chứng minh nghiệm duy nhất bằng biệt thức rồi kẹp nghiệm bằng dấu hữu tỉ.
// Không chọn nhánh thay người dùng khi có nhiều nghiệm, hoặc bỏ qua miền
// của căn, log, hàm gián đoạn hay mẫu có thể bằng 0.
function solveBracketedUniqueCubic(left,right,variable,variables,ans,trial,checkOriginal) {
  try {
    const polynomial=expression=>solveTreePolynomial(solveAlgebraTree(expression,variable,variables,ans),true);
    const p=solvePolyAdd(polynomial(left),polynomial(right),true);
    if(p.length!==4||!Number.isFinite(trial))return null;
    if(p.some(f=>bigAbs(f.num).toString().length>600||f.den.toString().length>600))return null;
    const [d,c,b,a]=p;
    const times=(n,f)=>fracMul({num:BigInt(n),den:1n},f);
    // Số mũ cố định; không dùng ngưỡng hiển thị phân số của fracPowInt
    // để chặn hệ số rất nhỏ/lớn trong phép chứng minh dấu.
    const square=f=>fracMul(f,f),cube=f=>fracMul(square(f),f);
    const u=fracSub(square(b),times(3,fracMul(a,c)));
    if(u.num<=0n)return null; // không có hai điểm đổi chiều; giữ Newton
    const v=fracAdd(fracSub(times(2,cube(b)),times(9,fracMul(fracMul(a,b),c))),
      times(27,fracMul(square(a),d)));
    if(fracSub(square(v),times(4,cube(u))).num<=0n)return null;
    // Dấu trên tương đương discriminant < 0: có đúng một nghiệm thực.
    // Điểm thử trên nhánh ngoài có nghiệm vẫn có thể Continue hữu ích.
    const x=roundedNumberFraction(trial);
    const side=fracAdd(fracMul(times(3,a),x),b);
    const slope=fracAdd(fracMul(fracAdd(fracMul(times(3,a),x),times(2,b)),x),c);
    if(side.num*v.num<0n&&slope.num*a.num>0n)return null;

    const evaluate=z=>p.reduceRight((acc,coef)=>fracAdd(fracMul(acc,z),coef),ZERO_FRACTION);
    const limit=9.999999999e99;
    const finish=stored=>{
      const value=fracToNumber(stored);
      if(!Number.isFinite(value)||Math.abs(value)>limit||(value!==0&&Math.abs(value)<1e-99)||
         !Number.isFinite(checkOriginal(value)))return null;
      // L−R lấy từ chính số lưu, không làm tròn về zero để nhận nghiệm.
      const residual=fracToNumber(solveProbeRoundFraction(evaluate(stored),15,true));
      if(!Number.isFinite(residual)||Math.abs(residual)>limit)return null;
      return {value,residual,converged:true,memoryExact:stored};
    };
    if(fracIsZero(d))return finish(ZERO_FRACTION);
    const direction=d.num*a.num>0n?-1:1;
    const sameSide=f=>f.num*d.num>0n;
    let loExp=-99,hiExp=100;
    let inner=roundedNumberFraction(direction*1e-99),outer=roundedNumberFraction(direction*limit);
    const innerValue=evaluate(inner),outerValue=evaluate(outer);
    if(fracIsZero(innerValue))return finish(inner);
    if(fracIsZero(outerValue))return finish(outer);
    if(!sameSide(innerValue)||sameSide(outerValue))return null;
    // Chọn một thập kỷ chứa nghiệm để có đủ độ phân giải cả ở số rất nhỏ.
    while(hiExp-loExp>1) {
      const exponent=Math.floor((loExp+hiExp)/2);
      const point=roundedNumberFraction(direction*Number('1e'+exponent));
      const value=evaluate(point);
      if(fracIsZero(value))return finish(point);
      if(sameSide(value)){inner=point;loExp=exponent;}else{outer=point;hiExp=exponent;}
    }
    for(let i=0;i<80;i++) {
      const lower=solveProbeRoundFraction(inner,15,true),upper=solveProbeRoundFraction(outer,15,true);
      if(fracIsZero(fracSub(lower,upper)))return finish(lower);
      const middle=fracDiv(fracAdd(inner,outer),{num:2n,den:1n}),value=evaluate(middle);
      if(fracIsZero(value))return finish(middle);
      if(sameSide(value))inner=middle;else outer=middle;
    }
    return null;
  } catch(error) { return null; }
}

// Fallback toán học06/11: chỉ chia đôi trên miền hữu hạn đã chứng minh
// liên tục. Căn có đối số affine; không đi qua cực, log hay hàm gián đoạn.
// Dấu của f được bao bằng khoảng hữu tỉ, nên không nhận zero do triệt tiêu
// hai số float. Không tìm thấy đoạn đổi dấu KHÔNG chứng minh vô nghiệm.
function solveBracketedAffineRadicals(left,right,variable,variables,ans) {
  try {
    const compare=(a,b)=>{const d=a.num*b.den-b.num*a.den;return d<0n?-1:d>0n?1:0;};
    const one={num:1n,den:1n},two={num:2n,den:1n};
    let lower=null,upper=null,radicals=0;
    function prepare(tree) {
      if(tree.op==='constant'||tree.op==='variable')return tree;
      if(tree.op==='sqrt') {
        const p=solveTreePolynomial(tree.argument);
        if(p.length>2)throw new Error('non-affine radical');
        if(p.length===1) {if(p[0].num<0n)throw new Error('empty domain');}
        else {
          const bound=fracNeg(fracDiv(p[0],p[1]));
          if(p[1].num>0n) {if(lower===null||compare(bound,lower)>0)lower=bound;}
          else if(upper===null||compare(bound,upper)<0)upper=bound;
        }
        radicals++;return {op:'sqrt',polynomial:p};
      }
      if(tree.op==='divide'||tree.op==='power') {
        const p=solveTreePolynomial(tree.right);
        if(p.length!==1)throw new Error('nonconstant divisor/exponent');
        if(tree.op==='divide') {
          if(fracIsZero(p[0]))throw new Error('zero divisor');
          return {op:'multiply',left:prepare(tree.left),right:{op:'constant',value:fracDiv(one,p[0])}};
        }
        if(p[0].den!==1n||p[0].num<0n||p[0].num>8n)throw new Error('power budget');
        return {op:'power',left:prepare(tree.left),exponent:Number(p[0].num)};
      }
      if(!['add','subtract','multiply'].includes(tree.op))throw new Error('unsupported continuity');
      return {op:tree.op,left:prepare(tree.left),right:prepare(tree.right)};
    }
    const tree=prepare({op:'subtract',left:solveAlgebraTree(left,variable,variables,ans),
      right:solveAlgebraTree(right,variable,variables,ans)});
    const cost=node=>node.op==='power'?cost(node.left)*Math.max(1,node.exponent)
      :node.left?cost(node.left)+cost(node.right):1;
    if(cost(tree)>32||!radicals||lower===null||upper===null||compare(lower,upper)>0)return null;
    if([lower,upper].some(v=>!Number.isFinite(fracToNumber(v))||Math.abs(fracToNumber(v))>9.999999999e99))return null;
    const exact=v=>[v,v];
    const sorted=values=>values.sort(compare);
    const multiply=(a,b)=>{const v=sorted([fracMul(a[0],b[0]),fracMul(a[0],b[1]),fracMul(a[1],b[0]),fracMul(a[1],b[1])]);return [v[0],v[3]];};
    function sqrtInterval(v) {
      if(v.num<0n)throw new Error('outside domain');
      const numerator=bigIntIsqrt(v.num),denominator=bigIntIsqrt(v.den);
      if(numerator!==null&&denominator!==null)return exact(fracReduce({num:numerator,den:denominator}));
      const places=35-Math.floor(calculationFractionExponent(v)/2);
      const scale=10n**BigInt(Math.abs(places));
      const quotient=places>=0?v.num*scale*scale/v.den:v.num/(v.den*scale*scale);
      let root=1n<<BigInt(Math.ceil(quotient.toString(2).length/2));
      for(;;){const next=(root+quotient/root)/2n;if(next>=root)break;root=next;}
      const convert=n=>places>=0?fracReduce({num:n,den:scale}):{num:n*scale,den:1n};
      return [convert(root),convert(root+1n)];
    }
    function evaluate(node,x) {
      if(node.op==='constant')return exact(node.value);
      if(node.op==='variable')return exact(x);
      if(node.op==='sqrt')return sqrtInterval(fracAdd(node.polynomial[0],fracMul(node.polynomial[1]||ZERO_FRACTION,x)));
      const a=evaluate(node.left,x);
      if(node.op==='power'){let result=exact(one);for(let n=0;n<node.exponent;n++)result=multiply(result,a);return result;}
      const b=evaluate(node.right,x);
      if(node.op==='add')return [fracAdd(a[0],b[0]),fracAdd(a[1],b[1])];
      if(node.op==='subtract')return [fracSub(a[0],b[1]),fracSub(a[1],b[0])];
      return multiply(a,b);
    }
    const sign=v=>v[0].num>0n?1:v[1].num<0n?-1:fracIsZero(v[0])&&fracIsZero(v[1])?0:null;
    const solution=(x,residual,memoryExact=null)=>{
      const value=fracToNumber(x);
      if(!Number.isFinite(value)||!Number.isFinite(residual)||Math.abs(value)>9.999999999e99||
         (value!==0&&Math.abs(value)<1e-99))throw new Error('solution outside range');
      return {value,residual,converged:true,memoryExact,bracketed:true};
    };
    let a=lower,b=upper,fa=sign(evaluate(tree,a)),fb=sign(evaluate(tree,b));
    if(fa===0)return solution(a,0,a);
    if(fb===0)return solution(b,0,b);
    if(fa===null||fb===null||fa===fb)return null;
    // Mỗi bước giữ hai đầu trái dấu trên miền liên tục. Dừng theo độ rộng
    // đoạn nghiệm, không chỉ vì L−R nhỏ. Tối đa180 bước, không dò vô hạn.
    for(let i=0;i<180;i++) {
      const middle=fracDiv(fracAdd(a,b),two),fm=evaluate(tree,middle),sm=sign(fm);
      if(sm===0)return solution(middle,0,middle);
      const value=fracToNumber(middle),width=Math.abs(fracToNumber(fracSub(b,a)));
      if(width<=1e-13*Math.max(1e-99,Math.abs(value))) {
        // Chỉ giữ số tròn hiển thị làm giá trị chính xác khi thay vào
        // biểu thức gốc chứng minh bằng0 (ví dụ nghiệm5 của058/059).
        const displayed=roundedNumberFraction(Number(value.toPrecision(10)));
        if(compare(displayed,a)>=0&&compare(displayed,b)<=0&&sign(evaluate(tree,displayed))===0)return solution(displayed,0,displayed);
        return solution(middle,fracToNumber(fracDiv(fracAdd(fm[0],fm[1]),two)));
      }
      if(sm===null) {
        // Điểm giữa có thể là nghiệm chứa căn vô tỉ triệt tiêu nhau.
        // Không gọi khoảng chứa0 là nghiệm: thu hẹp bằng hai điểm bên cạnh
        // có dấu đã chứng minh, tiếp tục giữ đoạn kẹp nghiệm.
        const l=fracDiv(fracAdd(a,middle),two),r=fracDiv(fracAdd(middle,b),two);
        const sl=sign(evaluate(tree,l)),sr=sign(evaluate(tree,r));
        if(sl===0)return solution(l,0,l);
        if(sr===0)return solution(r,0,r);
        if(sl===fa&&sr===fb){a=l;b=r;continue;}
        return null;
      }
      if(sm===fa){a=middle;fa=sm;}else{b=middle;fb=sm;}
    }
    return null;
  } catch(error) { return null; }
}

// CASIO 27.10: mô hình số học hữu hạn cho cặp P√Q=R đã được chứng
// nhận vô nghiệm đại số. Không thay Calculate, log, tích phân hoặc bộ
// giải nghiệm thật. Các đối chứng đổi hệ số còn mở được giữ trong test.
// Số gần mốc10 chữ số dùng mốc đó; còn lại giữ15. So sánh thập phân
// chính xác bằng Fraction, không dùng epsilon binary để đổi phía biên.
function solveRadicalNormalize(value, inclusive = true) {
  if (value.num === 0n) return value;
  const exponent = calculationFractionExponent(value);
  if (exponent > 99 || bigAbs(value.num) > 9999999999n * 10n ** 90n * value.den) throw new EngineError('Math ERROR');
  if (exponent < -99) return ZERO_FRACTION;
  const rounded = solveProbeRoundFraction(value, 10, true);
  const difference = fracSub(value, rounded);
  const power = exponent - 13;
  const scale = 10n ** BigInt(Math.abs(power));
  const comparison = power >= 0
    ? bigAbs(difference.num) - difference.den * scale
    : bigAbs(difference.num) * scale - difference.den;
  return (inclusive ? comparison <= 0n : comparison < 0n)
    ? rounded : truncateFractionDigits(value, 15);
}
// Căn chỉnh toán hạng vào cùng15 vị trí trước phép cộng; giữ carry
// trước chuẩn hóa. Phân biệt bằng CALC tại9999998.86666628 và mẫu dưới
// 9999999.09999999: cộng chính xác rồi cắt kết quả không tương đương.
function solveRadicalAdd(a, b) {
  if (a.num === 0n) return solveRadicalNormalize(b, false);
  if (b.num === 0n) return solveRadicalNormalize(a, false);
  const places = 14 - Math.max(calculationFractionExponent(a), calculationFractionExponent(b));
  const scale = 10n ** BigInt(Math.abs(places));
  const align = value => places >= 0
    ? { num: value.num * scale / value.den, den: scale }
    : { num: value.num / (value.den * scale) * scale, den: 1n };
  return solveRadicalNormalize(fracAdd(align(a), align(b)), false);
}
// Căn nguyên của phân số đã tăng thang: cắt15 chữ số thập phân mà
// không đi qua Math.sqrt/binary và vô tình làm tăng chữ số cuối.
function solveRadicalSqrt(value) {
  if (value.num < 0n) throw new EngineError('Math ERROR');
  if (value.num === 0n) return value;
  const places = 14 - Math.floor(calculationFractionExponent(value) / 2);
  const scale = 10n ** BigInt(Math.abs(places));
  const quotient = places >= 0
    ? value.num * scale * scale / value.den
    : value.num / (value.den * scale * scale);
  let root = 1n << BigInt(Math.ceil(quotient.toString(2).length / 2));
  for (;;) {
    const next = (root + quotient / root) / 2n;
    if (next >= root) break;
    root = next;
  }
  return solveRadicalNormalize(places >= 0
    ? { num: root, den: scale } : { num: root * scale, den: 1n });
}
function solveRadicalTreeValue(tree, point) {
  if (tree.op === 'constant') return solveRadicalNormalize(tree.value);
  if (tree.op === 'variable') return solveRadicalNormalize(roundedNumberFraction(point));
  if (tree.op === 'sqrt') return solveRadicalSqrt(solveRadicalTreeValue(tree.argument, point));
  const a = solveRadicalTreeValue(tree.left, point);
  const b = solveRadicalTreeValue(tree.right, point);
  if (tree.op === 'add' || tree.op === 'subtract')
    return solveRadicalAdd(a, tree.op === 'subtract' ? fracNeg(b) : b);
  if (tree.op === 'multiply') return solveRadicalNormalize(fracMul(a, b));
  if (tree.op === 'divide') {
    if (b.num === 0n) throw new EngineError('Math ERROR');
    return solveRadicalNormalize(fracDiv(a, b));
  }
  if (tree.op === 'power' && b.den === 1n && b.num >= 0n && b.num <= 8n) {
    let result = { num: 1n, den: 1n };
    for (let n = 0n; n < b.num; n++) result = solveRadicalNormalize(fracMul(result, a));
    return result;
  }
  throw new EngineError('Math ERROR');
}

function createSolveRadicalBalance(left, right, variable, variables, ans) {
  try {
    const lhs = solveAlgebraTree(left, variable, variables, ans);
    const rhs = solveAlgebraTree(right, variable, variables, ans);
    // P√Q−R trong cùng biểu thức chịu quy tắc triệt tiêu của phép trừ,
    // khác P√Q=R. Chỉ tách để nhận diện; không đổi cây được tính toán.
    const explicitDifference = lhs.op === 'subtract' && rhs.op === 'constant' && fracIsZero(rhs.value);
    const a = explicitDifference ? lhs.left : lhs;
    const b = explicitDifference ? lhs.right : rhs;
    const supported = [[a, b], [b, a]].some(([first, second]) => {
      try { return Boolean(solveRadicalTerm(first) && solveTreePolynomial(second)); }
      catch (error) { return false; }
    });
    if (!supported) return null;
    return {
      explicitDifference,
      evaluate: point => fracToNumber(fracSub(solveRadicalTreeValue(lhs, point),
        solveRadicalTreeValue(rhs, point)))
    };
  } catch (error) { return null; }
}

// SOLVE parameters are per engine instance. Empty configuration preserves the
// existing hybrid arithmetic/probes and all recovery policies.
const SOLVE_DEFAULT_PARAMETERS = Object.freeze({
  derivative: 'central', relativeStep: 1e-8, originStep: 1e-7, probeStep: 1e-7,
  maxIterations: 40, maxBacktracks: 40, stepTolerance: 1e-12,
  residualTolerance: 1e-14, stopping: 'legacy', arithmetic: 'legacy'
});
function normalizeSolveParameters(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new TypeError('SOLVE parameters must be an object');
  for (const key of Object.keys(input)) {
    if (!Object.prototype.hasOwnProperty.call(SOLVE_DEFAULT_PARAMETERS, key))
      throw new TypeError('Unknown SOLVE parameter: ' + key);
  }
  const p = { ...SOLVE_DEFAULT_PARAMETERS, ...input };
  for (const key of ['relativeStep','originStep','probeStep','stepTolerance','residualTolerance']) {
    if (!['number','string'].includes(typeof p[key]) || String(p[key]).trim() === '')
      throw new TypeError('Invalid SOLVE parameter: ' + key);
    p[key] = Number(p[key]);
    if (!Number.isFinite(p[key]) || p[key] < 0 ||
        (['relativeStep','originStep','probeStep'].includes(key) && (p[key] === 0 || p[key] > 1)))
      throw new TypeError('Invalid SOLVE parameter: ' + key);
  }
  for (const key of ['maxIterations','maxBacktracks']) {
    if (!Number.isInteger(p[key]) || p[key] < 1 || p[key] > 1000)
      throw new TypeError('Invalid SOLVE parameter: ' + key);
  }
  if (!['central','forward','secant'].includes(p.derivative) ||
      !['legacy','exact-zero','step-and-residual','residual'].includes(p.stopping) ||
      !['legacy','decimal15'].includes(p.arithmetic))
    throw new TypeError('Unsupported SOLVE parameter');
  return Object.freeze(p);
}
function traceSolve(parameters, event) {
  if (parameters.trace) parameters.trace(Object.freeze({ ...event,
    derivative: parameters.derivative, arithmetic: parameters.arithmetic,
    maxIterations: parameters.maxIterations }));
}
function solveStepConverged(correction, scale, residual, p) {
  if (p.stopping === 'exact-zero') return residual === 0;
  if (p.stopping === 'residual') return Math.abs(residual) <= p.residualTolerance;
  return Math.abs(correction) <= p.stepTolerance * scale &&
    (p.stopping === 'legacy' || Math.abs(residual) <= p.residualTolerance);
}
function solveArithmetic(p) {
  const native = { add:(a,b)=>a+b, sub:(a,b)=>a-b, mul:(a,b)=>a*b, div:(a,b)=>a/b };
  if (p.arithmetic === 'legacy') return native;
  const operation = (a,b,name) => {
    if (!Number.isFinite(a) || !Number.isFinite(b) || (name === 'div' && b === 0))
      return native[name](a,b); // keep invalid trial points for existing guards
    const f = {add:fracAdd,sub:fracSub,mul:fracMul,div:fracDiv}[name](
      roundedNumberFraction(a),roundedNumberFraction(b));
    const result = fracToNumber(solveProbeRoundFraction(f,15,true));
    return Math.abs(result) < 1e-99 ? 0 : result;
  };
  return Object.fromEntries(Object.keys(native).map(name=>[name,(a,b)=>operation(a,b,name)]));
}
function solveFractionArithmetic(p) {
  const q=f=>p.arithmetic === 'legacy' ? f : solveProbeRoundFraction(f,15,true);
  return {add:(a,b)=>q(fracAdd(a,b)),sub:(a,b)=>q(fracSub(a,b)),
    mul:(a,b)=>q(fracMul(a,b)),div:(a,b)=>q(fracDiv(a,b))};
}
function solvePointFraction(fraction, p) {
  return fracToNumber(p.arithmetic === 'legacy'
    ? truncateFractionDigits(fraction,15) : solveProbeRoundFraction(fraction,15,true));
}
function solveCorrectionFraction(fraction, p) {
  return solveProbeRoundFraction(fraction,p.arithmetic === 'legacy' ? 14 : 15,true);
}
function solveProbeStencil(origin,value,upper,lower,h,previous,p) {
  const fractionArithmetic=solveFractionArithmetic(p);
  if (p.derivative === 'central')
    return {difference:fractionArithmetic.sub(upper,lower),span:fractionArithmetic.mul(h,{num:2n,den:1n})};
  if (p.derivative === 'secant' && previous &&
      fracToNumber(origin) !== previous.point)
    return {difference:fractionArithmetic.sub(value,roundedNumberFraction(previous.value)),
      span:fractionArithmetic.sub(origin,roundedNumberFraction(previous.point))};
  return {difference:fractionArithmetic.sub(upper,value),span:h};
}
// A controlled arithmetic hypothesis for polynomial SOLVE expressions only.
// No expression/seed result lookup. Normal legacy evaluation remains untouched.
function createSolveDecimalBalance(left,right,variable,variables,ans) {
  const lhs=solveAlgebraTree(left,variable,variables,ans);
  const rhs=solveAlgebraTree(right,variable,variables,ans);
  const validate=tree=>{
    if (['constant','variable'].includes(tree.op)) return;
    if (!['add','subtract','multiply','divide','power'].includes(tree.op))
      throw new EngineError('Argument ERROR');
    validate(tree.left);validate(tree.right);
    if (tree.op==='power' && (tree.right.op!=='constant' || tree.right.value.den!==1n ||
        tree.right.value.num<0n || tree.right.value.num>8n)) throw new EngineError('Argument ERROR');
  };
  validate(lhs);validate(rhs);
  const q=f=>{
    const result=solveProbeRoundFraction(f,15,true);
    const n=fracToNumber(result);
    if (!Number.isFinite(n)||Math.abs(n)>9.999999999e99) throw new EngineError('Math ERROR');
    return Math.abs(n)<1e-99 ? ZERO_FRACTION : result;
  };
  const evaluate=(tree,point)=>{
    if (tree.op==='constant')return q(tree.value);
    if (tree.op==='variable')return q(roundedNumberFraction(point));
    const a=evaluate(tree.left,point),b=evaluate(tree.right,point);
    if (tree.op==='divide' && b.num===0n)throw new EngineError('Math ERROR');
    return q(tree.op==='add'?fracAdd(a,b):tree.op==='subtract'?fracSub(a,b):
      tree.op==='multiply'?fracMul(a,b):tree.op==='divide'?fracDiv(a,b):fracPowInt(a,Number(b.num)));
  };
  return point=>fracToNumber(q(fracSub(evaluate(lhs,point),evaluate(rhs,point))));
}


// Mô hình đối chiếu CASIO 2026-10-27: cân bằng log cơ số ở precision hữu hạn;
// thử Newton thập phân và giảm hiệu chỉnh theo ba phần nếu |L−R| không
// giảm. Chỉ nhận hai vế bằng nhau, không nhận chỉ vì phần dư nhỏ.
// Đây là đường kiểm tra zero hữu hạn; chứng nhận đại số vẫn giữ riêng.
function solveFinitePrecisionZero(evaluate, initialValue, iterations = 40, protectDescent = false, parameters = SOLVE_DEFAULT_PARAMETERS) {
  const fractionArithmetic=solveFractionArithmetic(parameters);
  const sample = point => {
    if (!Number.isFinite(point) || Math.abs(point) > 9.999999999e99) return null;
    try {
      const value = evaluate(point);
      return Number.isFinite(value) ? value : null;
    } catch (error) {
      if (error instanceof EngineError && error.message === 'Math ERROR') return null;
      throw error;
    }
  };
  // Cùng quy tắc chốt5/10 chữ số của solveNewton. Chỉ rút gọn khi
  // phép tính tại điểm mới thật sự bằng0; không dùng dung sai để ép dư lượng.
  // CASIO27.10: biến thể căn từ10000005.966667/10000001 và log nhân3.
  const finishZero = point => {
    for (const digits of [5, 10]) {
      const limit = digits === 5 ? 9.9999e99 : 9.999999999e99;
      const rounded = Math.sign(point) * Math.min(roundToSignificantDigits(Math.abs(point), digits), limit);
      if (sample(rounded) === 0) return { value: rounded, residual: 0, converged: true };
    }
    return { value: point, residual: 0, converged: true };
  };
  const decimalPoint = fraction => solvePointFraction(fraction, parameters);
  // Cùng điểm phục hồi ±10^7 của solver hiện hành; không gắn với công thức,
  // hệ số, cơ số hoặc seed của phiếu lỗi.
  for (const start of new Set([initialValue, 1e7, -1e7])) {
    let point = start;
    let value = sample(point);
    if (value === null) continue;
    let previous = null;
    for (let iteration = 0; iteration < iterations; iteration++) {
      traceSolve(parameters,{phase:"finite-zero",iteration,point,value});
      if (value === 0) return finishZero(point);
      const origin = roundedNumberFraction(point);
      const h = fractionArithmetic.mul(roundedNumberFraction(Math.abs(point) || 1),
        roundedNumberFraction(parameters.probeStep));
      const lower = sample(decimalPoint(fractionArithmetic.sub(origin, h)));
      const upper = sample(decimalPoint(fractionArithmetic.add(origin, h)));
      if (lower === null || upper === null) break;
      const stencil = solveProbeStencil(origin,roundedNumberFraction(value),
        roundedNumberFraction(upper),roundedNumberFraction(lower),h,previous,parameters);
      traceSolve(parameters,{phase:'probe-stencil',point,h:fracToNumber(h),
        difference:fracToNumber(stencil.difference),span:fracToNumber(stencil.span)});
      const difference = stencil.difference;
      previous = {point,value};
      if (difference.num === 0n) break;
      // Mô hình đối chiếu CASIO 27.10: phục hồi x từ mẫu xa giữ16 chữ số,
      // rồi làm tròn 15 trước khi trừ bước Newton. Nếu luôn giữ origin
      // chính xác, đuôi062 lệch một đơn vị; phía âm cũng phải lấy mẫu xa
      // khỏi0. Mô hình qua ca nguồn, điểm sát bên và phương trình đổi dấu;
      // điểm đầu đã có dư0 được nhận ở trên, không sửa đuôi của nó.
      const probeStep = point < 0 ? fracNeg(h) : h;
      const farProbe = truncateFractionDigits(fractionArithmetic.add(origin, probeStep), 16);
      const restoredOrigin = solveProbeRoundFraction(fractionArithmetic.sub(farProbe, probeStep), 15, true);
      let correction = solveCorrectionFraction(fractionArithmetic.div(
        fractionArithmetic.mul(roundedNumberFraction(value), stencil.span), difference), parameters);
      let accepted = false;
      for (let backtrack = 0; backtrack < parameters.maxBacktracks; backtrack++) {
        const candidate = decimalPoint(fractionArithmetic.sub(restoredOrigin, correction));
        if (candidate === point) break;
        const candidateValue = sample(candidate);
        if (candidateValue !== null && Math.abs(candidateValue) < Math.abs(value)) {
          // Nhóm căn: nếu bước giảm dư lượng đi vào đoạn phẳng khác0,
          // thử nửa bước trước khi nhận, tránh mắc ở đạo hàm bằng0.
          // Giữ đường log đã đối chiếu; không ép một dư lượng nhỏ thành0.
          if (protectDescent && candidateValue !== 0) {
            const nextOrigin = roundedNumberFraction(candidate);
            const nextH = fractionArithmetic.mul(roundedNumberFraction(Math.abs(candidate) || 1),
              roundedNumberFraction(parameters.probeStep));
            const nextLower = sample(decimalPoint(fractionArithmetic.sub(nextOrigin, nextH)));
            const nextUpper = sample(decimalPoint(fractionArithmetic.add(nextOrigin, nextH)));
            // Không vượt vùng đổi dấu độ dốc khi phần dư chưa đổi dấu:
            // CASIO27.10 tại hai seed lân cận của060 phục hồi về đợt xa.
            // Nếu phần dư đã đổi dấu, vẫn cho qua (đối chứng10000000.1).
            // break bỏ bước hiện tại để vòng start thử điểm phục hồi;
            // không thay candidate bằng một đáp số được định trước.
            if (nextLower !== null && nextUpper !== null && nextLower !== nextUpper &&
                Math.sign(nextUpper - nextLower) !== (difference.num > 0n ? 1 : -1) &&
                Math.sign(candidateValue) === Math.sign(value)) break;
            if (nextLower !== null && nextLower === nextUpper) {
              correction = fractionArithmetic.div(correction, { num: 2n, den: 1n });
              continue;
            }
          }
          point = candidate;
          value = candidateValue;
          accepted = true;
          break;
        }
        correction = fractionArithmetic.div(correction, { num: 3n, den: 1n });
      }
      if (!accepted) break;
    }
    if (value === 0) return finishZero(point);
  }
  return null;
}

// CASIO28.10: đường phục hồi cho hiệu đa thức hằng khác0 khi Newton
// thường bị kẹt. Chuẩn hóa toán hạng trước phép toán, giữ guard16 trong
// kết quả; không dùng square14 để lấy gradient. Nếu hai mẫu bằng nhau,
// thử nửa điểm hiện hành. Đã phân biệt bằng hệ số4 từ1/2 và hệ số3
// từ100/200, gồm x lưu. Chưa tái tạo hai ca từ0, không thay kết quả
// Newton đã hội tụ bằng một zero khác của mô hình này.
function solvePolynomialFlatRecovery(left, right, variable, variables, ans, initialValue, parameters = SOLVE_DEFAULT_PARAMETERS) {
  const fractionArithmetic=solveFractionArithmetic(parameters);
  try {
    const lhs = solveAlgebraTree(left, variable, variables, ans);
    const rhs = solveAlgebraTree(right, variable, variables, ans);
    const decimalPoint = fraction => solvePointFraction(fraction, parameters);
    const evaluateTree = (tree, point) => {
      if (tree.op === 'constant') return tree.value;
      if (tree.op === 'variable') return roundedNumberFraction(point);
      const a = solveRadicalNormalize(evaluateTree(tree.left, point), false);
      const b = solveRadicalNormalize(evaluateTree(tree.right, point), false);
      if (['add', 'subtract', 'multiply', 'divide'].includes(tree.op))
        return calculationFractionBinary(a, b, tree.op);
      if (tree.op === 'power' && b.den === 1n && b.num >= 0n && b.num <= 8n)
        return calculationFractionPower(a, Number(b.num));
      throw new EngineError('Math ERROR');
    };
    const legacySample = point => {
      if (!Number.isFinite(point) || Math.abs(point) > 9.999999999e99)
        throw new EngineError('Math ERROR');
      const a = solveRadicalNormalize(evaluateTree(lhs, point), false);
      const b = solveRadicalNormalize(evaluateTree(rhs, point), false);
      return fracToNumber(fractionArithmetic.sub(a, b));
    };
    const sample = parameters.arithmetic === "legacy" ? legacySample
      : createSolveDecimalBalance(left,right,variable,variables,ans);
    let point = initialValue;
    let previous = null;
    for (let iteration = 0; iteration < parameters.maxIterations; iteration++) {
      const value = sample(point);
      traceSolve(parameters,{phase:"polynomial-flat",iteration,point,value});
      if (value === 0) {
        for (const digits of [5, 10]) {
          const rounded = roundToSignificantDigits(point, digits);
          if (sample(rounded) === 0) return { value: rounded, residual: 0, converged: true };
        }
        return { value: point, residual: 0, converged: true };
      }
      const origin = roundedNumberFraction(point);
      const h = fractionArithmetic.mul(roundedNumberFraction(Math.abs(point) || 1), roundedNumberFraction(parameters.probeStep));
      const upper = sample(decimalPoint(fractionArithmetic.add(origin, h)));
      const lower = sample(decimalPoint(fractionArithmetic.sub(origin, h)));
      const stencil = solveProbeStencil(origin,roundedNumberFraction(value),
        solveProbeRoundFraction(roundedNumberFraction(upper),16,true),
        solveProbeRoundFraction(roundedNumberFraction(lower),16,true),h,previous,parameters);
      traceSolve(parameters,{phase:'probe-stencil',point,h:fracToNumber(h),
        difference:fracToNumber(stencil.difference),span:fracToNumber(stencil.span)});
      const difference = stencil.difference;
      previous = {point,value};
      if (difference.num === 0n) {
        const half = decimalPoint(fractionArithmetic.div(origin, { num: 2n, den: 1n }));
        if (half === point) return null;
        point = half;
        continue;
      }
      const correction = solveCorrectionFraction(fractionArithmetic.div(
        fractionArithmetic.mul(roundedNumberFraction(value), stencil.span), difference), parameters);
      const candidate = decimalPoint(fractionArithmetic.sub(origin, correction));
      if (candidate === point) return null;
      point = candidate;
    }
    return null;
  } catch (error) {
    if (error instanceof EngineError && ['Math ERROR', 'Cannot Solve'].includes(error.message)) return null;
    throw error;
  }
}

// Mô hình cubic bội theo CASIO27.10: vùng zero hữu hạn của biểu thức
// khai triển khác nghiệm đại số. Dò ở lưới5 chữ số, rút gọn khi vẫn có0,
// rồi lấy mép vùng zero phía điểm đầu. Các seed mới2/−0.5, dạng đổi hệ số
// và điểm đầu đã có0 phân biệt mô hình này với gán đáp số của phiếu.
// Chứng nhận đại số vẫn là đường phục hồi khi mô hình không hội tụ.
function solveRepeatedCubic(evaluate, initialValue, certificate, parameters = SOLVE_DEFAULT_PARAMETERS) {
  if (certificate?.multiplicity !== 3 || certificate.value === 0) return certificate;
  try {
    // Không thay điểm đầu đã cho zero hữu hạn bằng nghiệm chính xác.
    if (evaluate(initialValue) === 0 || evaluate(initialValue, false, false, true) === 0) {
      return solveNewton(evaluate, initialValue, parameters.maxIterations, false, false, parameters);
    }
    const probe = (point, residual = false, zero = false, finiteZero = false) =>
      evaluate(finiteZero ? roundToSignificantDigits(point, 5) : point,
        residual, zero, finiteZero);
    const trial = solveNewton(probe, initialValue, parameters.maxIterations, false, false, parameters);
    if (!trial.converged) return certificate;
    for (const digits of [4, 5, 10]) {
      const point = roundToSignificantDigits(trial.value, digits);
      if (evaluate(point, false, false, true) === 0) {
        trial.value = point;
        trial.residual = 0;
        break;
      }
    }
    if (trial.value === certificate.value || trial.value === 0) return trial;
    const direction = Math.sign(initialValue - trial.value);
    const exponent = calculationFractionExponent(roundedNumberFraction(trial.value));
    const step = roundedNumberFraction(direction * 10 ** (exponent - 4));
    for (let attempt = 0; attempt < parameters.maxIterations; attempt++) {
      const point = fracToNumber(fracAdd(roundedNumberFraction(trial.value), step));
      if (point === trial.value || Math.sign(initialValue - point) !== direction ||
          evaluate(point, false, false, true) !== 0) break;
      trial.value = point;
      trial.residual = 0;
    }
    return trial;
  } catch (error) {
    if (error instanceof EngineError &&
        (error.message === 'Math ERROR' || error.message === 'Cannot Solve')) return certificate;
    throw error;
  }
}

// Newton số cho Solve: chỉ trả nghiệm khi bước hiệu chỉnh đã nhỏ ở mức
// chính xác màn hình. Backtracking và đạo hàm một phía tránh bước thử đi
// qua miền không xác định; nghiệm khởi tạo tại điểm kỳ dị vẫn có thể tìm
// được như 1÷x−2 với x=0 trên CASIO ngày 2026-09-17.
function solveNewton(evaluate, initialValue, iterations = 40, recoveryOnly = false, recoverDecimalFlat = false,
  parameters = SOLVE_DEFAULT_PARAMETERS, cubicRecoverySlope = null) {
  const limit = 9.999999999e99;
  const precision = parameters.stepTolerance;
  const arithmetic = solveArithmetic(parameters);
  let previousMain = null, lastMain = null;
  if (!Number.isFinite(initialValue) || Math.abs(initialValue) > limit) {
    throw new EngineError('Cannot Solve');
  }

  const sample = (point, forResidual = false, forZeroProbe = false, allowFiniteZero = true) => {
    if (!Number.isFinite(point) || Math.abs(point) > limit) return null;
    try {
      const value = evaluate(point, forResidual, forZeroProbe);
      // Chỉ bổ sung bằng chứng f=0 của phép dò hữu hạn. Giữ giá trị
      // khác zero/gradient thường; không làm tròn mọi bước Newton.
      if(allowFiniteZero && !forResidual && !forZeroProbe && value!==0) {
        try { if(evaluate(point,false,false,true)===0) return 0; }
        catch(error) {
          if(!(error instanceof EngineError) || error.message!=='Math ERROR') throw error;
          // Một phép thử precision lỗi không hủy mẫu thường vẫn hợp lệ.
        }
      }
      if (!Number.isFinite(value)) return null;
      // CASIO 2026-09-17: x^99 tại x=0.01 kết thúc ngay với L−R=0.
      // Giữ miền underflow của máy, không dùng miền subnormal của JS.
      return Math.abs(value) < 1e-99 ? 0 : value;
    } catch (error) {
      // Các lỗi cú pháp không phụ thuộc điểm thử, phải giữ nguyên mã lỗi.
      if (!(error instanceof EngineError) || error.message !== 'Math ERROR') {
        throw error;
      }
      return null;
    }
  };

  const slopeBetween = (upper, lower, upperPoint, lowerPoint) => {
    const difference = arithmetic.sub(upper, lower);
    const underflow = difference !== 0 && Math.abs(difference) < 1e-99;
    return { value: underflow ? 0 : arithmetic.div(difference, arithmetic.sub(upperPoint, lowerPoint)), underflow };
  };
  // CASIO 2026-10-07: phép thử hội tụ tại gốc dùng h=10^-7,
  // được phân biệt bằng √x−10^-49 và ∛x−10^-49 từ zero.
  const estimateSlope = (point, originProbe = false, sampleDigits = null,
                         relativeStep = parameters.relativeStep, pointDigits = null, forZeroProbe = false, previous = null) => {
    const scale = Math.abs(point);
    let h = originProbe ? arithmetic.add(0, parameters.originStep) : arithmetic.mul(relativeStep, (scale || 1));
    let upperPoint = arithmetic.add(point, h);
    let lowerPoint = arithmetic.sub(point, h);
    if (pointDigits !== null) {
      upperPoint = fracToNumber(truncateFractionDigits(roundedNumberFraction(upperPoint), pointDigits));
      lowerPoint = fracToNumber(truncateFractionDigits(roundedNumberFraction(lowerPoint), pointDigits));
    }
    const report = (result,methodUsed) => {
      traceSolve(parameters,{phase:'derivative-result',point,h,gradient:result.value,methodUsed,precisionProbe:forZeroProbe});
      return result;
    };
    const value = sample(point);
    let upper = sample(upperPoint, false, forZeroProbe);
    let lower = sample(lowerPoint, false, forZeroProbe);
    // CASIO 2026-10-06: x^99 từ 0.1 trả 0.09999998; x^11 từ 10^-9
    // lưu x−10^-9=−2×10^-16. Khi một phía mất do underflow, mở rộng
    // bước một bậc; ca (x÷2)^99 từ 0.2 xác nhận vẫn tỷ lệ theo x.
    if (!forZeroProbe && value !== null && value !== 0 && (upper === 0 || lower === 0)) {
      h = arithmetic.mul(h, 10);
      upperPoint = arithmetic.add(point, h);
      lowerPoint = arithmetic.sub(point, h);
      upper = sample(upperPoint, false, forZeroProbe);
      lower = sample(lowerPoint, false, forZeroProbe);
    }
    traceSolve(parameters,{phase:"derivative",point,h,precisionProbe:forZeroProbe});
    if (parameters.derivative !== 'central' && value !== null && upper !== null) {
      const center=sample(point,false,forZeroProbe);
      if(center === null)return report({value:NaN,underflow:false},parameters.derivative);
      let a=upper,b=center,span=h,methodUsed="forward";
      if (parameters.derivative === 'secant' && previous && previous.point !== point) {
        const previousValue=sample(previous.point,false,forZeroProbe);
        if (previousValue !== null) {a=center;b=previousValue;span=arithmetic.sub(point,previous.point);methodUsed="secant";}
      }
      const difference=sampleDigits !== null && a !== 0 && b !== 0
        ?fracToNumber(fracSub(roundedNumberFraction(Number(a.toPrecision(sampleDigits))),
          roundedNumberFraction(Number(b.toPrecision(sampleDigits))))) : arithmetic.sub(a,b);
      const underflow=difference!==0 && Math.abs(difference)<1e-99;
      return report({value:underflow?0:arithmetic.div(difference,span),underflow,interior:true},methodUsed);
    }
    if (upper !== null && lower !== null) {
      if (sampleDigits !== null && upper !== 0 && lower !== 0) {
        // Probe riêng cho nghiệm đã có f=0: trừ các mẫu thập phân bằng
        // Fraction để không đưa lại nhiễu binary vào sai phân đã chốt.
        const difference = fracToNumber(fracSub(
          roundedNumberFraction(Number(upper.toPrecision(sampleDigits))),
          roundedNumberFraction(Number(lower.toPrecision(sampleDigits)))
        ));
        const underflow = difference !== 0 && Math.abs(difference) < 1e-99;
        return report({ value: underflow ? 0 : arithmetic.div(difference, arithmetic.mul(2, h)), underflow, interior: true },"central");
      }
      return report(slopeBetween(upper, lower, upperPoint, lowerPoint),"central");
    }
    if (upper !== null && value !== null) return report(slopeBetween(upper, value, upperPoint, point),"forward");
    if (lower !== null && value !== null) return report(slopeBetween(value, lower, point, lowerPoint),"backward");
    return report({ value: NaN, underflow: false },parameters.derivative);
  };

  // Khi phục hồi từ seed ngoài miền về điểm nửa, giữ các bước nhận
  // trong đoạn từ zero tới seed. CASIO 2026-10-13: tan(x)-10 từ
  // 270/450 và phân thức sát cực không nhảy ra các nhánh xa hơn.
  let recoveryBounds = null;
  const inRecoveryBounds = point => recoveryBounds === null ||
    (point >= recoveryBounds[0] && point <= recoveryBounds[1]);
  let x = initialValue;
  let value = sample(x);
  let acceptedWorseningFullStep = false;
  if (value === null) {
    const scale = Math.max(1, Math.abs(x));
    // CASIO 2026-10-12: phục hồi tan tại 90/270/450 về phía điểm nửa.
    // Nhận điểm nửa nếu đã là nghiệm, hoặc bước Newton đầu còn trong
    // đoạn từ zero tới seed. Nếu bước đó rời đoạn, thử phía kia ở 1.5x
    // trước khi mở rộng; ca 1/(x-1)-3 từ 1 phân biệt hai phía này.
    // Đây là mô hình theo đối chứng, không giả định toàn bộ solver CASIO.
    const half = arithmetic.div(x, 2);
    const halfValue = sample(half);
    const halfSlope = halfValue !== null && halfValue !== 0
      ? estimateSlope(half).value : NaN;
    const firstTrial = arithmetic.sub(half, arithmetic.div(halfValue, halfSlope));
    let halfTrialInRange = Number.isFinite(halfSlope) && halfSlope !== 0 &&
      Number.isFinite(firstTrial) && firstTrial >= Math.min(0, x) && firstTrial <= Math.max(0, x);
    // Bước hướng về seed có thể vượt qua cực. Thử giảm bước trong đoạn
    // half..seed trước khi bỏ phía nửa: 1/(x-1)+100 từ 1 cho 0.99.
    // Bước hướng ra xa seed vẫn dùng phía kia, giữ ca 1/(x-1)-3.
    if (!halfTrialInRange && Number.isFinite(halfSlope) && halfSlope !== 0 &&
        Number.isFinite(firstTrial) && Math.sign(firstTrial - half) === Math.sign(x - half)) {
      let step = arithmetic.div(halfValue, halfSlope);
      for (let attempt = 0; attempt < parameters.maxBacktracks; attempt++, step = arithmetic.div(step, 2)) {
        const trial = arithmetic.sub(half, step);
        if (trial <= Math.min(half, x) || trial >= Math.max(half, x)) continue;
        const trialValue = sample(trial);
        if (trialValue !== null && Math.abs(trialValue) < Math.abs(halfValue)) {
          halfTrialInRange = true;
          break;
        }
      }
    }
    if (halfValue === 0 || (halfValue !== null && halfTrialInRange)) {
      recoveryBounds = [Math.min(0, x), Math.max(0, x)];
      x = half;
      value = halfValue;
    } else {
      const other = arithmetic.add(x, half);
      const otherValue = sample(other);
      if (otherValue !== null) { x = other; value = otherValue; }
    }
    for (const shift of [scale, -scale, scale / 2, -scale / 2]) {
      if (value !== null) break;
      const candidate = arithmetic.add(x, shift);
      const candidateValue = sample(candidate);
      if (candidateValue !== null) {
        x = candidate;
        value = candidateValue;
        break;
      }
    }
    // CASIO 2026-09-18 phục hồi cả ln(x−10) từ 0 và ln(−x) từ 1.
    // Nếu các điểm gần đều ngoài miền, mở rộng tìm kiếm ở cả hai phía;
    // giữ giới hạn số lần thử cho biểu thức không có miền thực.
    for (let distance = 2 * scale, attempt = 0;
         value === null && attempt < iterations; attempt++, distance *= 2) {
      for (const shift of [distance, -distance]) {
        const candidate = arithmetic.add(x, shift);
        const candidateValue = sample(candidate);
        if (candidateValue !== null) {
          x = candidate;
          value = candidateValue;
          break;
        }
      }
    }
    if (value === null) throw new EngineError('Cannot Solve');
  }

  // CASIO 2026-10-07: thử bước nhỏ tại zero cả khi điểm đầu khác zero;
  // √x−10^-49 từ 2×10^-99 đến 1 và ∛x−10^-49 từ 1 nhận cùng điểm thử.
  // Giữ điểm đầu nếu f(x)=0. Nếu f(0)=0, để nhánh Newton/underflow xử lý:
  // x^11 từ 10^-9 giữ nghiệm sát điểm đầu, không chuyển thẳng về zero.
  // Nhận bước nhỏ có |L−R|≤10^-14, giữ dư lượng thật; hai phía 3.1622 /
  // 3.1623×10^-25 phân biệt ranh giới này. Điểm dưới miền số về zero.
  if (value !== 0) {
    const originValue = sample(0);
    if (originValue !== null && originValue !== 0) {
      const originSlope = estimateSlope(0, true).value;
      const rawStep = arithmetic.div(-originValue, originSlope);
      const firstStep = Math.abs(rawStep) < 1e-99 ? 0 : rawStep;
      if (Number.isFinite(originSlope) && Number.isFinite(firstStep) && Math.abs(firstStep) <= precision) {
        const firstValue = sample(firstStep);
        if (firstValue !== null && (parameters.stopping === "exact-zero" ? firstValue === 0 : Math.abs(firstValue) <= parameters.residualTolerance)) {
          // Cùng đường đọc dư lượng với nhánh hội tụ bên dưới. CASIO
          // sin(x)=10^-14 từ zero có L−R=0, không hiện nhiễu binary.
          return { value: firstStep, residual: sample(firstStep, true) ?? firstValue, converged: true };
        }
      }
    }
  }
  // CASIO 2026-10-13: khi đường giảm dư lượng mắc, thử một đợt từ
  // +10^7 rồi -10^7. Hai cổng Int của cubic +2/+3.9 chốt ±10^7
  // trên LCD; dãy +3.5..+3.89 hỗ trợ việc bỏ phía dương
  // khi bước đầy đủ tăng |L−R|. Chỉ phục hồi đường đã mắc, không đổi
  // Newton thường, underflow hay đoạn bảo vệ seed ngoài miền.
  const runRecovery = (start, bootstrap = false) => {
    let point = start;
    let current = sample(point);
    let previousRecovery = null;
    if (current === null) return null;
    for (let attempt = 0; attempt < iterations; attempt++) {
      if (current === 0) return { value: point, residual: 0, converged: true, recovery: true };
      traceSolve(parameters,{phase:"newton-recovery",iteration:attempt,point,value:current});
      const precedingRecovery = previousRecovery;
      // Đạo hàm đa thức tránh mất chữ số khi trừ hai mẫu gần nhau.
      // Dùng trong lượt phục hồi bậc ba PLUS đã đối chiếu trên ClassPad.
      const cubicGradient = !bootstrap && cubicRecoverySlope ? cubicRecoverySlope(point) : NaN;
      const gradient = Number.isFinite(cubicGradient) ? cubicGradient
        : estimateSlope(point,false,null,parameters.relativeStep,null,false,precedingRecovery).value;
      previousRecovery = {point,value:current};
      if (!Number.isFinite(gradient) || gradient === 0) {
        if (!bootstrap) return null;
        // CASIO 2026-10-13: từ zero, điểm xa có đạo hàm zero được
        // chia đôi. Cổng Int Gradian chốt 625000 rồi 312500; ca
        // cos(x)−0.5/0.25 xác nhận tiếp tục Newton thường tại điểm
        // có độ dốc. Không dùng luật này cho đợt Continue đã mắc.
        for (let probe = 0; probe < iterations; probe++) {
          point = arithmetic.div(point, 2);
          current = sample(point);
          if (current === null) return null;
          if (current === 0) return { value: point, residual: 0, converged: true };
          const slope = estimateSlope(point).value;
          if (Number.isFinite(slope) && slope !== 0) {
            return { value: point, residual: current, resume: true };
          }
        }
        return null;
      }
      const correction = arithmetic.div(current, gradient);
      let next = arithmetic.sub(point, correction);
      let nextValue = sample(next);
      // CASIO 2026-10-13: cổng cubic hẹp từ zero phải chốt cùng
      // điểm với seed 10^7 trực tiếp. Nhánh phục hồi cũng thử ứng viên
      // decimal như Newton thường; chỉ nhận khi f thực sự bằng zero.
      // Không đổi gradient/đường lặp Continue khi cả hai điểm khác zero.
      const estimate = estimateSlope(point, false, 15, parameters.probeStep, 15, true, precedingRecovery);
      if (estimate.interior && !estimate.underflow &&
          Number.isFinite(estimate.value) && estimate.value !== 0) {
        const decimalCorrection = solveCorrectionFraction(fracDiv(
          roundedNumberFraction(current), roundedNumberFraction(estimate.value)), parameters);
        const precisePoint = solvePointFraction(fracSub(
          roundedNumberFraction(point), decimalCorrection), parameters);
        const preciseValue = sample(precisePoint);
        if (preciseValue === 0) { next = precisePoint; nextValue = preciseValue; }
      }
      // CASIO cos từ zero: chấp nhận hội tụ theo độ dài hiệu chỉnh,
      // không nhân với điểm xa; nếu chưa tiến triển thì thử điểm sau.
      if (solveStepConverged(correction, 1, current, parameters)) {
        if (nextValue !== null && Math.abs(nextValue) < Math.abs(current)) {
          point = next;
          current = nextValue;
        }
        return { value: point, residual: sample(point, true) ?? current, converged: true, recovery: true };
      }
      if (nextValue === null || Math.abs(nextValue) >= Math.abs(current)) return null;
      point = next;
      current = nextValue;
    }
    return { value: point, residual: current, converged: current === 0, recovery: true, recoveryStart:start };
  };
  const recoverStalled = (extraStarts = [], bootstrap = false) => {
    if (recoveryBounds !== null) return null;
    for (const start of [1e7, -1e7, ...extraStarts]) {
      const recovered = runRecovery(start, bootstrap);
      if (recovered !== null) return recovered;
    }
    return null;
  };
  // Continue từ đợt phục hồi tiếp tục cùng luật giảm dư lượng. Không
  // suy trạng thái từ dấu điểm đầu; +3.9 đi tiếp tới nghiệm, +2/+3.88
  // tăng dư lượng trong đợt kế thì Cannot Solve.
  if (recoveryOnly) {
    const continued = runRecovery(initialValue);
    if (continued === null) throw new EngineError('Cannot Solve');
    return continued;
  }

  // Sau hiệu chỉnh cuối, vẫn chốt nghiệm đã có f=0 bằng cùng quy tắc
  // như các vòng trước. Vòng chốt này không thêm hiệu chỉnh Newton;
  // Chrome có thể chạm underflow đúng bước 40 của tan(x) từ ±90.
  for (let i = 0; i < iterations || value === 0; i++) {
    if (lastMain && lastMain.point !== x) previousMain=lastMain;
    lastMain={point:x,value};
    traceSolve(parameters,{phase:'newton',iteration:i,point:x,value});
    if (parameters.stopping === 'residual' && value !== 0 && Math.abs(value) <= parameters.residualTolerance)
      return {value:x,residual:sample(x,true) ?? value,converged:true};
    if (value === 0) {
      // CASIO 2026-10-07: √x từ 10^-99 / 2×10^-99 và √(-x)
      // từ -10^-99 chốt zero khi Newton đi dưới miền số của máy.
      // Nhánh này xét riêng miền x dưới 10^-99 và kiểm tra f(0) trước khi nhận.
      const originIsZero = sample(0) === 0;
      if (Math.abs(x) < 1e-99 && originIsZero) {
        return { value: 0, residual: 0, converged: true };
      }
      // sin/tan gần zero mất f trước khi x dưới 10^-99 do hệ số đổi
      // đơn vị. Sau Newton, chốt gốc nếu x đã dưới miền số theo độ dốc
      // tại gốc. Không áp dụng ở điểm đầu đã f=0, hoặc khi độ dốc gốc
      // không đo được: giữ các ca x^99 và sai phân underflow đã xác nhận.
      if (i > 0 && originIsZero) {
        const originSlope = estimateSlope(0, true).value;
        if (Number.isFinite(originSlope) && originSlope !== 0 &&
            Math.abs(x) < 1e-99 / Math.abs(originSlope)) {
          return { value: 0, residual: 0, converged: true };
        }
      }
      // CASIO 2026-10-06: thử chốt 5 rồi 10 chữ số khi điểm chốt vẫn có f=0,
      // cả ở điểm đầu và sau Newton. x−x / vùng zero của Int được chốt;
      // nghiệm duy nhất/vùng cực hẹp giữ đủ x; vùng Int trung gian chốt 10.
      // Tại biên ±9.999999999×10^99, giới hạn chốt tránh overflow.
      for (const digits of [5, 10]) {
        const limit = digits === 5 ? 9.9999e99 : 9.999999999e99;
        const rounded = Math.sign(x) * Math.min(roundToSignificantDigits(Math.abs(x), digits), limit);
        if (sample(rounded) === 0) return { value: rounded, residual: 0, converged: true };
      }
      // CASIO 2026-10-09: cổng hẹp bậc 33 loại điểm chốt 5/10 chữ
      // số; x lưu trừ 0.9696969 cho 6.969697×10^-8. Chốt 15 chữ số
      // chỉ khi điểm mới vẫn có f=0, giữ điểm gốc nếu vùng zero quá hẹp.
      const decimalPoint = Number(x.toPrecision(15));
      if (sample(decimalPoint) === 0) return { value: decimalPoint, residual: 0, converged: true };
      return { value: x, residual: 0, converged: true };
    }
    const scale = Math.abs(x);
    // Bước tương đối 10^-8; estimateSlope mở rộng tại mép underflow
    // theo các ca đã đọc lại ngày 2026-10-06.
    // Không ngoại suy Richardson qua điểm gián đoạn do underflow.
    let slopeEstimate = estimateSlope(x,false,null,parameters.relativeStep,null,false,previousMain);
    // CASIO27.10: cân bằng đa thức hằng từ1 vẫn tìm được zero hữu hạn.
    // BITEX mất sai phân binary tại đây. Thử stencil decimal hiện có trước
    // khi phục hồi; không đổi độ dốc còn khác0 hoặc sai phân underflow.
    // Caller chỉ mở cho lớp hiệu đa thức hằng đã được chứng nhận.
    if (recoverDecimalFlat && slopeEstimate.value === 0 && !slopeEstimate.underflow) {
      const decimalSlope = estimateSlope(x, false, 15, parameters.probeStep, 15, true, previousMain);
      if (decimalSlope.interior && !decimalSlope.underflow &&
          Number.isFinite(decimalSlope.value) && decimalSlope.value !== 0) {
        slopeEstimate = decimalSlope;
      }
    }
    const slope = slopeEstimate.value;

    if (!Number.isFinite(slope) || slope === 0) {
      // CASIO 2026-10-13: bootstrap tại zero dùng đợt xa trước bước
      // lân cận. Radian cos có cổng chốt 100 sau ±10^7. Continue từ
      // bootstrap trở về Newton thường (x³+1 đi tiếp tới -1); khác
      // Continue của đường đã mắc dùng luật recovery giảm dư lượng.
      // Chỉ áp dụng điểm đầu zero, giữ phục hồi cực trị khác và underflow.
      if (i === 0 && x === 0 && !slopeEstimate.underflow) {
        const recovered = recoverStalled([100, -100], true);
        if (recovered?.resume) {
          x = recovered.value;
          value = recovered.residual;
          continue;
        }
        if (recovered !== null) return { ...recovered, recovery: false };
      }
      // CASIO 2026-10-21 BUG-061: mất độ dốc do triệt tiêu ở điểm
      // không phải cực trị thực. Thử đợt xa đã có, CHỈ nhận nếu hội tụ;
      // đường chưa hội tụ không thay Continue/cubic hoặc bước lân cận.
      if (i>0 && x!==0 && !slopeEstimate.underflow) {
        const recovered=recoverStalled();
        if (recovered?.converged) return recovered;
      }
      if (slopeEstimate.underflow) {
        // CASIO 2026-10-05: x×10^-98 từ ±1 chia đôi tới ±0.0625;
        // (x−0.2)×10^-98 từ 1 dừng tại 0.25. Không nhận mức giảm
        // nhỏ hơn độ phân giải 10^-99 làm bằng chứng tiến triển.
        const half = arithmetic.div(x, 2);
        const halfValue = sample(half);
        if (halfValue === 0 || (halfValue !== null &&
            Math.abs(value) - Math.abs(halfValue) >= 1e-99)) {
          x = half;
          value = halfValue;
          continue;
        }
        // Lấy sai phân đủ lớn để thử một bước phục hồi. Chỉ nhận khi
        // L−R đã bằng 0; lặp secant sẽ giả tạo nghiệm cho (x−2)²/³×10^-98
        // dù CASIO báo Cannot Solve. Đây là phục hồi đã đối chiếu, chưa
        // khẳng định tái tạo toàn bộ thuật toán nội bộ của CASIO.
        const recoveryScale = Math.max(1, scale);
        let recovered = false;
        for (const point of [half, x + recoveryScale, x - recoveryScale]) {
          const trial = sample(point);
          if (trial === null || point === x || Math.abs(trial - value) < 1e-99) continue;
          const recoverySlope = arithmetic.div(arithmetic.sub(trial,value),arithmetic.sub(point,x));
          const candidate = arithmetic.sub(x,arithmetic.div(value,recoverySlope));
          if (sample(candidate) !== 0) throw new EngineError('Cannot Solve');
          x = candidate;
          value = 0;
          recovered = true;
          break;
        }
        if (!recovered) throw new EngineError('Cannot Solve');
        continue;
      }

      // CASIO 2026-10-05: (x−1)²−0.01 từ 1 tìm 0.9; (x+1)²−0.01
      // từ −1 tìm −0.9. Thử về phía gốc trước, cho phép điểm đổi dấu L−R
      // dù |L−R| tăng. Không cho qua cực trị cùng dấu (ví dụ x²+1).
      let improved = false;
      const recoveryScale = Math.max(1, scale);
      // Nếu điểm nửa không tiến triển, thử zero trước các bước mở rộng.
      // CASIO 2026-10-13: 1/(x-1)+1 từ cực 1 chốt 0, không bị nhiễu
      // sai phân gần gốc đẩy ngược tới cực. Nhánh underflow ở trên giữ nguyên.
      for (const shift of [-x / 2, -x, recoveryScale, -recoveryScale, recoveryScale / 2, -recoveryScale / 2]) {
        const candidate = arithmetic.add(x, shift);
        const candidateValue = inRecoveryBounds(candidate) ? sample(candidate) : null;
        if (candidateValue !== null && (Math.abs(candidateValue) < Math.abs(value) ||
            Math.sign(candidateValue) !== Math.sign(value))) {
          x = candidate;
          value = candidateValue;
          improved = true;
          break;
        }
      }
      if (!improved) throw new EngineError('Cannot Solve');
      continue;
    }

    const correction = arithmetic.div(value, slope);
    if (solveStepConverged(correction, scale, value, parameters)) {
      // Một hiệu chỉnh cuối giữ giá trị nguyên thực sự trong bộ nhớ, thay
      // vì chỉ làm tròn nó trên màn hình (ví dụ phương trình 4−A=0).
      const refined = arithmetic.sub(x, correction);
      const refinedValue = sample(refined);
      if (refinedValue !== null && Math.abs(refinedValue) < Math.abs(value)) {
        x = refined;
        value = refinedValue;
      }
      // Đọc lại L−R ở precision máy sau hội tụ, giữ dư lượng thật khi
      // bước Newton không đổi được x. Nếu đọc lại lỗi, giữ giá trị đã có.
      // Giữ các bước hiệu chỉnh nhỏ còn giảm dư lượng trong ngân sách
      // lặp. CASIO ln(x)−1 và ln(−x)−1 kết thúc L−R=0; không ép phần dư
      // về zero khi đã hết tiến triển (ví dụ x−1−10^-49).
      for (let refinement = i + 1; refinement < iterations && value !== 0; refinement++) {
        const nextSlope = estimateSlope(x).value;
        if (!Number.isFinite(nextSlope) || nextSlope === 0) break;
        const nextCorrection = arithmetic.div(value, nextSlope);
        if (Math.abs(nextCorrection) > precision * Math.abs(x)) break;
        const nextPoint = arithmetic.sub(x, nextCorrection);
        if (nextPoint === x) break;
        const nextValue = sample(nextPoint);
        if (nextValue === null || Math.abs(nextValue) >= Math.abs(value)) break;
        x = nextPoint;
        value = nextValue;
      }
      const residual = sample(x, true) ?? value;
      return { value: x, residual, converged: true };
    }
    if (!Number.isFinite(correction)) throw new EngineError('Cannot Solve');

    let accepted = false;
    let step = correction;
    // Từ zero, bước nhỏ cần đủ lần chia đôi để tới miền 10^-99;
    // 40 lần chưa đủ cho √x−10^-24 (nghiệm 10^-48) trên CASIO.
    const backtrackLimit = scale === 0 && Math.abs(step) <= precision
      ? Math.max(parameters.maxBacktracks, Math.ceil(Math.log2(Math.abs(step)) - Math.log2(1e-99))) : parameters.maxBacktracks;
    for (let backtrack = 0; backtrack < backtrackLimit; backtrack++) {
      traceSolve(parameters,{phase:"backtrack",iteration:i,backtrack,point:x,step});
      let candidate = arithmetic.sub(x, step);
      let candidateValue = inRecoveryBounds(candidate) ? sample(candidate) : null;
      let precisionCandidateChosen = false;
      if (backtrack === 0) {
        // CASIO 2026-10-09: mẫu decimal 15 chữ số, h=10^-7.
        // Chỉ thay bước khi ít nhất một ứng viên có f=0: nhận zero hẹp
        // bậc 99 và ngăn nhận zero sai ở cổng 33 từ 2. Hai ứng viên đều
        // khác zero giữ đường Continue cũ. Không mở rộng qua underflow.
        const precisionEstimate = estimateSlope(x, false, 15, parameters.probeStep, 15, true, previousMain);
        const gradient = precisionEstimate.value;
        if (precisionEstimate.interior && !precisionEstimate.underflow &&
            Number.isFinite(gradient) && gradient !== 0) {
          // Cổng bước hai bậc 33: làm tròn hiệu chỉnh 14 chữ số,
          // không cắt; x lưu trừ 0.9403122 phải cho 1.28854×10^-8.
          const decimalCorrection = solveCorrectionFraction(fracDiv(
            roundedNumberFraction(value), roundedNumberFraction(gradient)), parameters);
          const point = solvePointFraction(fracSub(
            roundedNumberFraction(x), decimalCorrection), parameters);
          const pointValue = inRecoveryBounds(point) ? sample(point) : null;
          if (pointValue !== null && (candidateValue === 0 || pointValue === 0)) {
            candidate = point;
            candidateValue = pointValue;
            precisionCandidateChosen = true;
          }
        }
      }
      // x³−2x+2 đổi nhánh đúng tại khoảng −0.816/−0.817 trên CASIO.
      // Chốt nhánh là một xấp xỉ cho trường hợp gần điểm đạo hàm bằng 0;
      // x³−2x+4 từ 0 cho thấy nó không thể áp dụng cho mọi bước. Một bước
      // Newton vừa phải hoặc giảm dư lượng ít nhất sáu bậc được phép đi
      // qua nhánh khác. Quy tắc nội bộ của CASIO vẫn chưa xác định.
      const branchPoints = [candidate, arithmetic.sub(x,arithmetic.div(step,4)), arithmetic.sub(x,arithmetic.div(step,2)), arithmetic.sub(x,arithmetic.div(arithmetic.mul(3,step),4))];
      const keepsSlopeBranch = branchPoints.every(point => {
        const pointSlope = estimateSlope(point).value;
        // 0 tự nó chưa phải đổi dấu: có thể là đúng điểm cực trị hoặc
        // underflow của đạo hàm ở các ca x^99 sát 10^-99.
        return Number.isFinite(pointSlope) &&
          (pointSlope === 0 || Math.sign(pointSlope) === Math.sign(slope));
      });
      const correctionCrossesBranch = Math.abs(correction) <=
        2.25 * Math.max(1, scale) * (1 + 1e-8);
      // CASIO cho phép bước Newton đầy đủ tạm tăng |L−R| khi bước đó vẫn
      // nằm trong 2.4 lần độ lớn x hiện tại. Quy tắc theo |x| (không ép
      // thang tối thiểu 1) giữ đúng các ca dịch 0.25/0.5 ở nhánh Continue,
      // nhưng cho cả hai ca dịch 1 đi qua cực trị tới nghiệm. Dung sai nhỏ
      // bao phủ biên 2.4 quan sát được mà vẫn chặn ca x³−2x+2 từ x=2.
      const correctionFitsCurrentX = Math.abs(correction) <=
        2.4 * scale * (1 + 1e-6);
      const stronglyImproved = candidateValue !== null &&
        Math.abs(candidateValue) <= 1e-6 * Math.abs(value);
      const canCrossBranch = stronglyImproved || correctionCrossesBranch;
      const improvesResidual = candidateValue !== null &&
        Math.abs(candidateValue) < Math.abs(value);
      // Các mẫu đều cùng dấu đạo hàm mà độ dốc nối hai đầu trái dấu
      // là dấu hiệu bước đã vượt chỗ gián đoạn. Khi phục hồi từ seed
      // ngoài miền, không nhận bước tăng dư lượng đó chỉ vì vừa độ lớn.
      // Ca tan(x)-10 từ 450 phân biệt với chỉ giữ đoạn zero..seed.
      const secantDirection = candidateValue === null ? NaN :
        arithmetic.div(arithmetic.sub(candidateValue,value),arithmetic.sub(candidate,x));
      const crossesJump = recoveryBounds !== null && keepsSlopeBranch &&
        Number.isFinite(secantDirection) && secantDirection !== 0 &&
        Math.sign(secantDirection) !== Math.sign(slope);
      // CASIO28.10: từ0, bỏ bước Newton đầu làm tăng |L−R| và
      // chuyển sang phục hồi. Hai cubic đổi dấu và một ca co biến gấp2
      // phân biệt với backtracking hoặc giới hạn độ dài bước. Luồng có
      // Continue trước nghiệm cuối; không gán điểm Continue theo công thức.
      // Giữ nhánh đã đo13.10 cho điểm đầu khác0 và bước qua cực trị.
      const originWorsening = x === 0 && candidateValue !== null &&
        Math.abs(candidateValue) > Math.abs(value);
      if (i === 0 && backtrack === 0 &&
          (originWorsening || (!keepsSlopeBranch && candidateValue !== null &&
            !improvesResidual && Math.abs(correction) <= 1.15 * scale))) {
        const recovered = recoverStalled();
        if (recovered !== null) {
          if (!recovered.converged &&
              Math.abs(recovered.value - initialValue) <= precision * scale) {
            throw new EngineError('Cannot Solve');
          }
          return recovered;
        }
      }
      const acceptsModerateFullStep = backtrack === 0 && correctionFitsCurrentX && !crossesJump;
      // Khi CASIO đã nhận một bước đầy đủ qua nhánh với tỷ lệ hiệu chỉnh
      // trên 1.15|x|, các bước Newton sau tiếp tục trên nhánh mới thay vì
      // quay lại đường giảm |L−R|. Biên này phân biệt +3.9 và +4 từ x=2.
      const followsWorseningFullStep = backtrack === 0 && acceptedWorseningFullStep && !crossesJump;
      if (candidateValue !== null &&
          (((keepsSlopeBranch || canCrossBranch) && improvesResidual) ||
           acceptsModerateFullStep || followsWorseningFullStep)) {
        if (acceptsModerateFullStep && !improvesResidual &&
            Math.abs(correction) > 1.15 * scale) {
          acceptedWorseningFullStep = true;
        }
        let acceptedCandidate = candidate;
        if (backtrack === 0 && candidateValue === 0 && !precisionCandidateChosen &&
            sample(candidate, false, false, false) === 0) {
          // CASIO 2026-10-20/21 BUG-056: zero chỉ từ probe hữu hạn phải
          // giữ điểm tìm được; gradient thường có thể đẩy sang một zero
          // khác (−0.99993 thay vì −0.99992). Chỉ refine zero của đường
          // thường; giữ underflow/catch qua sample, không gọi evaluate thô.
          // CASIO 2026-10-09: vùng zero bậc hai từ ±1.23456789123
          // chốt ±0.6172839241, khớp probe 10^-7 với điểm cắt 15 chữ số.
          // Chỉ tinh chỉnh khi đã tìm được f=0; các mẫu qua zero/miền
          // underflow giữ probe cũ để không mở rộng bước thêm một bậc.
          const probeH = arithmetic.mul(parameters.probeStep, (scale || 1));
          const upperPoint = fracToNumber(truncateFractionDigits(roundedNumberFraction(x + probeH), 15));
          const lowerPoint = fracToNumber(truncateFractionDigits(roundedNumberFraction(x - probeH), 15));
          const upperProbe = sample(upperPoint);
          const lowerProbe = sample(lowerPoint);
          const precisionSlope = upperProbe !== null && lowerProbe !== null && upperProbe !== 0 && lowerProbe !== 0
            ? estimateSlope(x, false, 15, parameters.probeStep, 15).value
            : estimateSlope(x, false, 15).value;
          const refined = arithmetic.sub(x, arithmetic.div(value, precisionSlope));
          if (Number.isFinite(refined) && sample(refined) === 0) acceptedCandidate = refined;
        }
        x = acceptedCandidate;
        value = candidateValue;
        accepted = true;
        break;
      }
      step = arithmetic.div(step, 2);
    }
    if (!accepted) {
      // Khi đã tiến được tới một cực trị nhưng không còn bước giảm |L−R|
      // trong cùng nhánh, CASIO cho một màn Continue trước. Bấm = từ màn
      // mắc này mới báo Cannot Solve; runSolve giữ cờ stalled để phân biệt
      // với Continue bình thường của x^99.
      if (i > 0) {
        const recovered = recoverStalled();
        if (recovered !== null) return recovered;
        // CASIO 2026-10-20: nếu Newton đã mắc và cả hai điểm xa
        // đều ngoài miền (hai căn của BUG-058/059, √(1−x²)+1),
        // đợt kế không có điểm hợp lệ để tiếp tục: Cannot Solve ngay.
        // Không suy vô nghiệm từ miền hữu hạn: ca cùng hai căn từ 4
        // vẫn chốt 5 trước khi tới đây; đường cubic vẫn giữ Continue.
        if (sample(1e7) === null && sample(-1e7) === null) {
          throw new EngineError('Cannot Solve');
        }
        return { value: x, residual: value, converged: false, stalled: true };
      }
      throw new EngineError('Cannot Solve');
    }
  }
  // Hết một đợt Newton không đồng nghĩa vô nghiệm: Continue? giữ nguyên
  // điểm và dư lượng để đợt kế tiếp tiếp tục, không làm mất L−R rất nhỏ.
  return { value: x, residual: value, converged: value === 0 };
}

// FACT của fx-580VN X: chỉ tách hoàn toàn khi không có thừa số >= 1018081
// và không có từ hai thừa số > 999. Phần còn lại được giữ trong ngoặc.
// ĐÃ XÁC NHẬN 2026-10-03: 360 → 2³×3²×5; 4104676 → 2²×(1026169).
function primeFactorizationText(value) {
  const factors = [];
  let rest = value;
  for (let divisor = 2; divisor * divisor <= rest; divisor += divisor === 2 ? 1 : 2) {
    if (rest % divisor !== 0) continue;
    let exponent = 0;
    do { rest /= divisor; exponent++; } while (rest % divisor === 0);
    factors.push({ base: divisor, exponent });
  }
  if (rest > 1) factors.push({ base: rest, exponent: 1 });
  const small = factors.filter((factor) => factor.base <= 999);
  const large = factors.filter((factor) => factor.base > 999);
  const largeCount = large.reduce((sum, factor) => sum + factor.exponent, 0);
  const parts = small.map(({ base, exponent }) => String(base) +
    (exponent > 1 ? String(exponent).replace(/[0-9]/g, (digit) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(digit)]) : ''));
  if (largeCount === 1 && large[0].base < 1018081) {
    parts.push(String(large[0].base));
  } else if (largeCount > 0) {
    parts.push('(' + large.reduce((product, factor) =>
      product * factor.base ** factor.exponent, 1) + ')');
  }
  return parts.join('×');
}

function createEngine(options = {}) {
  const plusModel = options.model === 'fx-880BTG PLUS';
  const fractionFitsCurrentDisplay = fraction => plusModel && !hasUnitConversion(root)
    ? fractionFitsDisplay880(fraction) : fracDigitCount(fraction) <= (hasUnitConversion(root) ? 9 : 10);
  const plusSolveRegisterValues = new WeakSet();
  const plusRecallFractions = new WeakSet();
  const solveParameters = normalizeSolveParameters(options.solveParameters);
  if (options.onSolveTrace != null && typeof options.onSolveTrace !== 'function')
    throw new TypeError('onSolveTrace must be a function');
  const solveOptions = Object.freeze({...solveParameters,trace:options.onSolveTrace || null});
  // Tham số thí nghiệm khác mặc định vẫn đo Newton riêng.
  const useCubicRecovery=Object.keys(SOLVE_DEFAULT_PARAMETERS)
    .every(key=>solveParameters[key]===SOLVE_DEFAULT_PARAMETERS[key]);
  let root = [];
  let cursorList = root;
  let cursorIndex = 0;
  let mode = 'input'; // 'input' | 'result' | 'error'
  let overwriteInput = false;
  let editUndo = null;
  let inputLimit = 199;
  // Phương thức tính toán đang chọn trên menu MENU (Tầng 7) — KHÁC hẳn biến
  // `mode` ngay trên: `mode` là trạng thái màn hình (đang gõ / đang hiện kết
  // quả / đang báo lỗi), còn `calcMode` là một trong 12 phương thức của máy
  // thật. Hiện mới có 'calculate' và 'verify'; các mode còn lại của Tầng 7
  // thêm dần vào đây.
  let calcMode = 'calculate';
  let arrayResultExpression = null;
  // Kho giữ dữ liệu khi mở lại handler cùng mode; rời mode xóa kho tương ứng.
  const matrixMemory = typeof createMatrixMemory === 'function'
    ? createMatrixMemory()
    : { MatA: null, MatB: null, MatC: null, MatD: null, MatAns: null };
  const vectorMemory = typeof createVectorMemory === 'function'
    ? createVectorMemory()
    : { VctA: null, VctB: null, VctC: null, VctD: null, VctAns: null };
  let frozenExpression = '';
  let frozenNodes = [];
  let errorMessage = '';
  let ans = null;
  let preAns = 0;
  // Ans của Complex giữ cả hai thành phần trong khi còn ở mode Complex.
  // Khi rời mode, phần ảo bị xóa và `ans` tiếp tục giữ phần thực (manual tr.47).
  let ansComplex = null;
  let ansComplexAlgebraic = null;
  // SETUP → Complex. Mặc định a+bi; r∠θ đổi cách vẽ kết quả nhưng không đổi
  // giá trị Ans. ĐÃ XÁC NHẬN 2026-09-11 trên giả lập CASIO chính thức.
  let complexFormat = 'rect'; // 'rect' | 'polar'
  let complexVerify = false;
  let variables = Object.fromEntries(VARIABLE_NAMES.map(name => [name, 0]));
  // Phần ảo của STO chỉ tồn tại trong Complex; kho số thực tiếp tục dùng chung.
  let variablesImaginary = Object.fromEntries(VARIABLE_NAMES.map(name => [name, 0]));
  let variablesComplexAlgebraic = Object.fromEntries(VARIABLE_NAMES.map(name => [name, null]));
  // Dạng phân số chính xác song song với ans/variables — null nghĩa là giá
  // trị đó đã mất chính xác (từng qua một phép tính vô tỉ), lan truyền qua
  // Ans/STO/M+ y như bản thập phân bên cạnh nó.
  // Chỗ này từng mang nhãn chưa-đối-chiếu; nhãn đó LỖI THỜI, gỡ 2026-08-20.
  // Việc Ans/STO/M+ giữ được dạng chính xác xuyên suốt ĐÃ XÁC NHẬN với máy
  // thật 2026-08-13 và có test canh (`1/3 STO A` rồi `A×3` ra ĐÚNG 1). Chú
  // thích cũ mâu thuẫn với chính nhãn của test ngay dưới — đúng loại lỗi đã
  // phải dọn một lần rồi.
  let ansExact = ZERO_FRACTION;
  let variablesExact = Object.fromEntries(VARIABLE_NAMES.map(name => [name, ZERO_FRACTION]));
  variablesExact.PreAns = ZERO_FRACTION;
  // Dạng căn thức chính xác (SurdValue) — song song thêm với ansExact/
  // variablesExact ở trên, chỉ có giá trị "có phần căn thật" (radicand≠1n)
  // khi biểu thức không thuần hữu tỉ (ansExact đã null trong trường hợp
  // đó) — xem evaluateCurrentValue. Lan truyền qua Ans/STO/M+ y hệt cách
  // ansExact đang làm.
  let ansExactSurd = ZERO_SURD;
  let variablesExactSurd = Object.fromEntries(VARIABLE_NAMES.map(name => [name, ZERO_SURD]));
  variablesExactSurd.PreAns = ZERO_SURD;
  // Dạng bội số π — lan truyền qua Ans/STO/M+ y như hai dạng trên. ĐÃ XÁC
  // NHẬN máy thật 2026-08-17: "π=" rồi "×2=" ra 2π (qua Ans), và "π STO A"
  // rồi "A×2=" ra 2π (qua biến).
  //
  // Khác hai kho trên ở giá trị KHỞI TẠO: null chứ không phải số 0. Một biến
  // chưa gán thì không có dạng π nào cả — mà "0×π" cũng chỉ là 0, không đáng
  // biểu diễn (piFractionFromFraction tự lọc hệ số 0 về null). Để null nên
  // nhánh π tự throw và rơi về thập phân, đúng như mong muốn.
  let ansExactPi = null;
  let variablesExactPi = Object.fromEntries(VARIABLE_NAMES.map(name => [name, null]));
  variablesExactPi.PreAns = null;
  // CALC giữ biểu thức gốc; cây nhập chung nhận giá trị từng biến.
  // [ĐÃ XÁC NHẬN 2026-09-17] thứ tự xuất hiện, nhập rồi nhấn thêm =.
  let calcSession = null;
  // 'exact' | 'decimal' — chỉ có ý nghĩa khi mode==='result' và ansExact
  // khác null. Phím "=" luôn đặt lại 'exact' (đã xác nhận máy thật);
  // SHIFT+= (≈) và S⇔D thay đổi giá trị này.
  // Mục `Input/Output` của SETUP (mục 1 trang 1). ĐÃ XÁC NHẬN 2026-08-24:
  // menu có bốn lựa chọn `1:MathI/MathO` `2:MathI/DecimalO` `3:LineI/LineO`
  // `4:LineI/DecimalO`, mặc định là MathI/MathO.
  //
  // Khác biệt của `DecimalO` GỌN hơn tưởng:
  // chu trình S⇔D KHÔNG đổi thứ tự, chỉ BẮT ĐẦU ở bước thập phân thay vì bước
  // chính xác. Đã bấm cả hai chiều:
  //   1÷3 ở DecimalO: 0.3333333333 → 1/3 → 0.‹3› → 0.3333333333
  //   √2  ở DecimalO: 1.414213562 → √2 → 1.414213562
  // và nó áp cho CẢ màn hình nghiệm của Ratio lẫn Equation, không riêng
  // Calculate.
  //
  // `LineI` đổi cách vẽ của Tầng 5: phím phân số in dấu ngăn "┘" ngay trên
  // dòng, "1┘3 =" ở LineO vẫn hiện "1┘3", và chỉ báo MathI tắt. LineO chỉ
  // giữ dạng chính xác của phân số; căn thức như √2 xuất thập phân và S⇔D
  // không đổi sang căn. ĐÃ XÁC NHẬN 2026-09-29 trên CASIO chính thức.
  let inputOutput = 'mathio';

  // SETUP → Recurring Dec (trang 3, mục 2). Mặc định On theo manual tr.16.
  // Khi Off, phân số tuần hoàn vẫn giữ dạng chính xác nhưng S⇔D bỏ qua bước
  // `0.‹...›` và chuyển thẳng giữa phân số với thập phân thường.
  let recurringDecimalEnabled = true;

  // SETUP → Fraction Result (trang 2, mục 1). Mặc định d/c; ab/c chỉ đổi
  // cách vẽ phân số không đúng thành hỗn số, không đổi giá trị chính xác.
  let fractionResultFormat = 'improper'; // 'improper' | 'mixed'
  // SHIFT+S⇔D chỉ đổi lần hiển thị hiện tại, không sửa SETUP hay lịch sử.
  let fractionDisplayOverride = null;

  // SETUP → Equation/Func (trang 2, mục 4). Menu máy thật hỏi
  // `Complex Result?`; mặc định On. Khi Off, đa thức chỉ liệt kê nghiệm
  // thực. Nếu không còn nghiệm nào, máy hiện đúng chữ `No Real Roots`.
  let equationComplexResults = true;

  function fractionResultForDisplay(fraction) {
    const display = fractionForDisplay(fraction);
    const absolute = bigAbs(fraction.num);
    if ((fractionDisplayOverride || fractionResultFormat) !== 'mixed' || absolute <= fraction.den) {
      return groupDisplayFields(display, ['int', 'num', 'den']);
    }
    const integer = absolute / fraction.den;
    const remainder = absolute % fraction.den;
    if (remainder === 0n) return groupDisplayFields(display, ['int', 'num', 'den']);
    return groupDisplayFields({
      negative: fraction.num < 0n,
      int: integer.toString(),
      num: remainder.toString(),
      den: fraction.den.toString()
    }, ['int', 'num', 'den']);
  }

  // Bước đầu của chu trình S⇔D cho một kết quả mới.
  function initialResultDisplayMode(nodes = null) {
    fractionDisplayOverride = null;
    if (plusModel && (inputOutput.startsWith('line') || ['matrix','vector','statistics'].includes(calcMode)) &&
        (!nodes || !hasExplicitFraction(nodes) || hasUnitConversion(nodes) || /(?:d\/dx|[∫ΣΠ])\(/.test(serializeForDisplay(nodes)))) return 'decimal';
    return inputOutput.endsWith('do') ? 'decimal' : 'exact';
  }

  let linearInputOverride = false;
  function usesLineInput() {
    return (plusModel && linearInputOverride) || inputOutput === 'lineio' || inputOutput === 'lineido' ||
      (plusModel && calcSession?.operation === 'calc' && calcSession.phase === 'form') ||
      (plusModel && (['matrix','vector','distribution','statistics'].includes(calcMode) ||
        handlerOwnsInput() && handlerIsEditing() &&
        !(typeof modeHandler.capturesExpression === 'function' && modeHandler.capturesExpression())));
  }

  let resultDisplayMode = initialResultDisplayMode();

  // Giá trị thống kê hiện hành, để biểu thức đọc được các biến x̄, Med, Σx...
  // null khi không ở mode Statistics hoặc bảng dữ liệu chưa đủ để tính.
  let statisticsValues = null;
  let plusStatisticsHandler = null;
  let emptyCellDraft = false;
  const registeredFunctions = {f:[], g:[]};
  let registeredEditor = null;
  let variableEditor = null;
  const distributionValues = new Map();
  const distributionRows = [];

  // Bảng biến dùng khi TÍNH: biến nhớ A-F/M, cộng thêm biến thống kê nếu có.
  // Không trộn thẳng vào `variables` vì getVariables() (màn hình RECALL) đọc
  // nguyên bảng đó.
  function evalVariables() {
    const scope = {...variables, ...(statisticsValues || {}), PreAns:preAns};
    if (plusModel) scope[REGISTERED_FUNCTION_880] = evaluateRegisteredFunction;
    return scope;
  }

  function storeRegisteredFunction(name, nodes) {
    const definition = registeredFunctions[name];
    definition.splice(0, definition.length, ...cloneNodes(nodes));
  }

  function checkBoundScalarMemory880(nodes) {
    if (!plusModel) return;
    const imaginaryMemory=VARIABLE_NAMES.some(name => variablesImaginary[name] !== 0);
    if (ansComplex?.im && /\bAns\b/.test(serializeForDisplay(nodes)) || imaginaryMemory &&
        calcVariableNames(nodes).some(name => name !== 'x' && variablesImaginary[name] !== 0))
      throw new EngineError('Math ERROR');
  }

  function evaluateRegisteredFunction(name, argument, vars, minimumMagnitude, active = []) {
    if (active.includes(name)) throw new EngineError('Circular ERROR');
    const nodes = registeredFunctions[name];
    if (!nodes.length) {
      const error = new EngineError('Not Defined');
      error.unregisteredFunction = name;
      throw error;
    }
    const scoped = {...vars, x:argument, [REGISTERED_FUNCTION_880]:(callee, value, variablesForCall, minimum) =>
      evaluateRegisteredFunction(callee, value, variablesForCall, minimum, [...active, name])};
    try {
      checkBoundScalarMemory880(nodes);
      const body = reduceCalcNodes(nodes, ans, scoped, angleUnit, null, {}, numberFormat, plusModel);
      return evaluateExpression(autoCloseParens(serializeForEval(body)), ans, scoped, angleUnit, minimumMagnitude, numberFormat, null, null, {plusModel});
    } catch (error) {
      error.registeredFunction = name;
      throw error;
    }
  }

  function expandRegisteredFunctionsForExact(expression, active = []) {
    expression = expandDmsLiterals(expression);
    const tokens = tokenize(expression);
    let expanded = '';
    let position = 0;
    for (const token of tokens) {
      if (token.type !== 'USER_FUNCTION' || token.start < position) continue;
      if (active.includes(token.name)) throw new EngineError('Circular ERROR');
      let depth = 0;
      let close = token.start+1;
      for (; close < expression.length; close++) {
        if (expression[close] === '(') depth++;
        if (expression[close] === ')' && --depth === 0) break;
      }
      if (close === expression.length) throw new EngineError('Syntax ERROR');
      const argument = expression.slice(token.start+2,close);
      const exactArgument = expandRegisteredFunctionsForExact(argument,active);
      const nodes = registeredFunctions[token.name];
      if (!nodes.length) throw new EngineError('Not Defined');
      if (/Ran(?:Int)?#/.test(serializeForDisplay(nodes))) throw new RangeError('Random functions use numeric evaluation');
      let exactNodes = nodes;
      if (containsCalcNode(nodes)) {
        const vars = evalVariables();
        const argumentValue = evaluateExpression(exactArgument,ans,vars,angleUnit,0,numberFormat);
        let argumentFraction = null;
        try { argumentFraction = evaluateExpressionExact(exactArgument,ansExact,variablesExact,angleUnit); } catch (_) {}
        exactNodes = reduceCalcNodes(nodes,ans,{...vars,x:argumentValue},angleUnit,ansExact,
          {...variablesExact,x:argumentFraction},numberFormat,true);
      }
      let body = expandDmsLiterals(autoCloseParens(serializeForEval(exactNodes)));
      if (/Ran(?:Int)?#/.test(body)) throw new RangeError('Random functions use numeric evaluation');
      for (const part of tokenize(body).reverse()) {
        if (part.type === 'VARIABLE' && part.name === 'x') {
          body = body.slice(0,part.start)+'('+exactArgument+')'+body.slice(part.start+1);
        }
      }
      body = expandRegisteredFunctionsForExact(body,[...active,token.name]);
      expanded += expression.slice(position,token.start)+'('+body+')';
      if (expanded.length > 32768) throw new RangeError('Exact function expansion limit');
      position = close+1;
    }
    return expanded+expression.slice(position);
  }
  // Mục "Engineer Symbol" của SETUP (mục 4 trang 1). Mặc định Off.
  let engineerSymbol = false;
  // Mục "Statistics" của SETUP (mục 3 trang 2) — cột Freq của bảng dữ liệu.
  // Mặc định Off: sau "Initialize All" rồi vào mode Statistics, bảng chỉ có
  // cột x. ĐÃ XÁC NHẬN 2026-08-26.
  let statisticsFrequency = false;
  // Mục `Table` của SETUP: dùng một hàm f(x), hoặc cả f(x),g(x).
  // Máy mặc định ở `f(x),g(x)`; lựa chọn này đồng thời quyết định trần dòng
  // (45 hoặc 30), kể cả khi người dùng để biểu thức g(x) trống.
  // Manual tr.14 và tr.161-163.
  let tableFunctions = 'fg';
  // Cơ số hiện hành của mode Base-N ('dec'|'hex'|'bin'|'oct'). Mặc định 'dec'
  // mỗi lần vào mode — ĐÃ XÁC NHẬN 2026-08-28 (manual tr.94).
  let baseNRadix = 'dec';
  // Số mũ đang hiện của ký pháp kỹ thuật; null = chưa bấm ENG lần nào cho
  // kết quả này. Cùng họ với resultDisplayMode nên reset ở đúng những chỗ đó.
  let engExponent = null;
  let engineeringEditing = false;
  // ===== Lịch sử phép tính =====
  // ĐÃ XÁC NHẬN 2026-08-20 trên bản giả lập (đặc tả đầy đủ trong
  // .claude/HANDOFF.md). Mỗi mục là TOÀN BỘ một màn hình kết quả đóng gói
  // lại, nên vẽ lại mục cũ dùng đúng đường vẽ của kết quả mới, không rẽ
  // nhánh riêng.
  //   { nodes, expression, value, exact, exactSurd, exactPi,
  //     verifyResult, storedVariable, memoryOp }
  // Cũ nhất đứng trước.
  const HISTORY_LIMIT = 30;
  let history = [];
  // Đang xem mục nào. null = không ở màn hình kết quả (đang gõ hoặc đang lỗi).
  // Đây cũng là chỗ duy nhất giữ các chú thích "→A" / "M+" / True-False:
  // trước đây chúng là ba biến rời phải nhớ xoá ở chín chỗ, nay theo mục nên
  // không xoá sót được nữa.
  let viewIndex = null;
  // Solve cập nhật Ans nhưng không thêm vào lịch sử (CASIO 2026-09-18).
  let standaloneResult = null;
  // Mục đang hiện trên màn hình kết quả, hoặc null.
  function viewEntry() {
    return viewIndex === null ? (mode === 'result' ? standaloneResult : null) : history[viewIndex];
  }

  // Thêm một mục và chuyển sang xem chính nó (máy luôn hiện kết quả vừa tính).
  //
  // MỨC TRẦN là chỗ ta CHỦ ĐỘNG khác máy thật. Máy giới hạn theo DUNG LƯỢNG
  // BYTE chứ không theo số phép tính, và manual (tr.44) chỉ nói "bộ nhớ có
  // giới hạn, mục cũ nhất tự bị xoá khi đầy" mà không cho con số. Đo chính
  // xác ngưỡng byte tốn rất nhiều lượt bấm mà giá trị thấp, nên lấy một con
  // số rộng rãi: đã thử 20 phép tính ngắn trên bản giả lập thì cả 20 còn
  // nguyên (2026-08-20), 30 là thừa cho việc tập huấn.
  function pushHistory(entry) {
    standaloneResult = null;
    history.push(entry);
    if (history.length > HISTORY_LIMIT) {
      history.shift();
    }
    viewIndex = history.length - 1;
    return entry;
  }
  // Mode có MÀN HÌNH NHẬP RIÊNG (Ratio, và sau này Equation/Matrix/Vector/
  // Table/Statistics) đặt một handler ở đây. Khác Verify: Verify dùng chung
  // bộ soạn thảo biểu thức Tầng 5 nên không cần handler, còn các mode này
  // nhập qua lưới ô nên phải chặn phím TRƯỚC khi nó chạy vào cây node.
  // null nghĩa là đang ở mode dùng bộ soạn thảo biểu thức (Calculate/Verify).
  let modeHandler = null;
  // Theo dõi đã bấm STO hoặc ALPHA, đang chờ phím biến (A-F, M) kế tiếp để
  // hoàn tất thao tác. Theo tài liệu máy thật (docs/fx-580VNX_VI.pdf, mục
  // "Các biến (A,B,C,D,E,F,x,y,z)"): STO lưu giá trị vào biến (gõ biểu thức
  // rồi bấm STO rồi bấm phím biến — không cần bấm "=" trước); ALPHA chèn
  // một biến vào bên trong biểu thức đang gõ ("nhấn ALPHA, sau đó nhấn phím
  // tương ứng với tên biến"). RCL (RECALL) là một chức năng KHÁC — mở màn
  // hình liệt kê toàn bộ giá trị các biến để xem, không chèn vào biểu thức
  // — chưa làm ở Tầng 3 này.
  let pendingRegister = null; // null | 'sto' | 'alpha'
  // Hai chú thích của dòng biểu thức — "→A" sau STO và "M+"/"M−" sau khi
  // cộng/trừ bộ nhớ — nằm trong mục lịch sử (`storedVariable`, `memoryOp`),
  // xem khai báo `history` ở trên. ĐÃ XÁC NHẬN 2026-08-20 rằng cả STO lẫn M+
  // đều TẠO một mục lịch sử và mục đó giữ nguyên chú thích khi cuộn lại:
  // `5 STO A` → "5→A"/"5", `5 M+` → "5M+"/"5".
  // Chế độ góc cho lượng giác — ĐÃ XÁC NHẬN 2026-08-20: sau khi RESET
  // "Initialize All" trên bản giả lập chính hãng, chỉ báo là "D" và
  // `sin(30 =` cho 1/2, nên mặc định GỐC là Degree. (Bản giả lập tự khởi
  // động ở Radian chỉ là trạng thái phiên web, không phải mặc định máy —
  // đúng ngoại lệ đã ghi trong CLAUDE.md.)
  let angleUnit = 'deg'; // 'deg' | 'rad' | 'grad'

  // Mục "Number Format" của SETUP — xem đặc tả đã bấm ở chỗ khai báo
  // DEFAULT_NUMBER_FORMAT đầu file. Mặc định Norm 1, ĐÃ XÁC NHẬN
  // 2026-08-21 sau "Initialize All" bằng ca 1÷191 → 5.235602094×10⁻³
  // (Norm 2 sẽ cho 0.005235602094 nên ca này phân biệt được hai bên).
  let numberFormat = { kind: 'norm', digits: 1 };

  // SETUP → Decimal Mark (trang 3, mục 3). Dấu chấm luôn dùng khi nhập;
  // thiết lập này chỉ đổi dấu thập phân trong KẾT QUẢ đã định dạng.
  let decimalMark = 'dot'; // 'dot' | 'comma'

  // SETUP → Digit Separator (trang 3, mục 4). Mặc định Off; On chèn khoảng
  // trắng sau mỗi nhóm ba chữ số ở phần nguyên của kết quả.
  let digitSeparatorEnabled = false;

  function applyDigitSeparator(text) {
    if (!digitSeparatorEnabled || typeof text !== 'string') return text;
    return text.replace(/(^|[^\d.,])(\d{4,})(?=([.,]\d+)?(?:[^\d]|$))/g,
      (_match, prefix, digits) => prefix + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' '));
  }

  function groupDisplayFields(display, fields) {
    const grouped = { ...display };
    for (const field of fields) {
      if (grouped[field] !== undefined) grouped[field] = applyDigitSeparator(grouped[field]);
    }
    return grouped;
  }

  function surdResultForDisplay(surd) {
    return groupDisplayFields(surdForDisplay(surd),
      ['rationalNum', 'rationalDen', 'coeffNum', 'coeffDen', 'radicand']);
  }

  // CASIO 2026-10-20, BUG-006: một mẫu chung cho a+b√d trong Calculate.
  // Engine tạo cây trình bày; UI không tự quy đồng hay đổi giá trị phép tính.
  function commonSurdNodes(surd, negative) {
    if(surd.extra) {
      const terms=[[surd.radicand,surd.coeff],[surd.extra.radicand,surd.extra.coeff]];
      const den=terms.reduce((d,[,c])=>d/bigGcd(d,c.den)*c.den,1n);
      const nodes=[];
      for(const [d,c] of terms) {
        const n=c.num*(den/c.den);
        if(n<0n || nodes.length) nodes.push(...charNodes(n<0n?'−':'+'));
        if(bigAbs(n)!==1n) nodes.push(...charNodes(applyDigitSeparator(bigAbs(n).toString())));
        nodes.push({type:'sqrt',arg:charNodes(applyDigitSeparator(d.toString()))});
      }
      return den===1n?nodes:[{type:'frac',num:nodes,den:charNodes(applyDigitSeparator(den.toString()))}];
    }
    if(surd.rational.num===0n) return null;
    const den=surd.rational.den/bigGcd(surd.rational.den,surd.coeff.den)*surd.coeff.den;
    if(den===1n) return null;
    const sign=negative?-1n:1n;
    const rational=surd.rational.num*(den/surd.rational.den)*sign;
    const coefficient=surd.coeff.num*(den/surd.coeff.den)*sign;
    const digits=n=>charNodes(applyDigitSeparator(bigAbs(n).toString()));
    const num=[];
    if(rational<0n) num.push(...charNodes('−'));
    num.push(...digits(rational),...charNodes(coefficient<0n?'−':'+'));
    if(bigAbs(coefficient)!==1n) num.push(...digits(coefficient));
    num.push({type:'sqrt',arg:digits(surd.radicand)});
    const fraction={type:'frac',num,den:digits(den)};
    return negative?[...charNodes('−'),fraction]:[fraction];
  }

  function applyDecimalMark(text) {
    return decimalMark === 'comma' && typeof text === 'string'
      ? text.replace(/\./g, ',')
      : text;
  }

  function formatResultText(text) {
    return applyDecimalMark(applyDigitSeparator(text));
  }

  function decoratePlusCoefficientCells(state, values) {
    state.cells.forEach((cell,index) => {
      cell.value = values[index];
      cell.text = applyDecimalMark(cell.text.replace(/^[−-]0(?=\.0+$|$)/,'0'));
      cell.absText = applyDecimalMark(cell.absText);
      cell.compactText = applyDecimalMark(statCellText(Math.abs(values[index]),numberFormat));
    });
  }

  function displayNumber(value, format) {
    let selectedFormat = format || numberFormat;
    let rounded = plusModel && Number.isFinite(value) ? roundForCalculation(value,selectedFormat) : value;
    // PLUS saturates the displayed mantissa when rounding a valid value
    // would carry its exponent to 100. The stored value remains unchanged.
    if (plusModel && Math.abs(value) < 1e100 && Math.abs(rounded) >= 1e100) {
      const digits = selectedFormat.kind === 'sci' ? selectedFormat.digits || 10 : 10;
      const mantissa = Number('9' + (digits > 1 ? '.' + '9'.repeat(digits - 1) : ''));
      rounded = Math.sign(value) * mantissa * 1e99;
    }
    if (plusModel && selectedFormat.kind === 'fix' && Number.isFinite(rounded)) {
      const initialDigits = Math.max(1,Math.floor(Math.log10(Math.abs(rounded)))+1);
      const places = Math.min(selectedFormat.digits,Math.max(0,10-initialDigits));
      const carried = roundForCalculation(rounded,{...selectedFormat,digits:places});
      const integerDigits = Math.max(1,Math.floor(Math.log10(Math.abs(carried)))+1);
      selectedFormat = {...selectedFormat,digits:Math.min(selectedFormat.digits,Math.max(0,10-integerDigits))};
    }
    return formatResultText(formatNumber(rounded, selectedFormat));
  }

  // Đổi một giá trị thập phân sang độ-phút-giây. Làm tròn phần giây ở 10
  // chữ số có nghĩa để triệt sai số nhị phân như 29.999999999998, rồi mới
  // xử lý nhớ sang phút/độ. CASIO chính thức 2026-09-30: 2.255 → 2°15′18″.
  function dmsResultText(value) {
    const negative = value < 0;
    let totalSeconds = Math.abs(value) * 3600;
    totalSeconds = Number(totalSeconds.toPrecision(12));
    if (plusModel) {
      const fraction = roundedNumberFraction(totalSeconds);
      totalSeconds = Number((fraction.num * 100n + fraction.den / 2n) / fraction.den) / 100;
    }
    let degrees = Math.floor(totalSeconds / 3600);
    let remainder = totalSeconds - degrees * 3600;
    let minutes = Math.floor(remainder / 60);
    let seconds = Number((remainder - minutes * 60).toPrecision(10));
    if (seconds >= 60) {
      seconds = 0;
      minutes++;
    }
    if (minutes >= 60) {
      minutes = 0;
      degrees++;
    }
    const secondsText = applyDecimalMark(String(seconds));
    return (negative ? '−' : '') + applyDigitSeparator(String(degrees)) + '°' +
      String(minutes) + '′' + secondsText + '″';
  }

  // Xoá sạch biểu thức đang gõ, đưa con trỏ về đầu.
  // Mode Tầng 7 đang ở màn hình NHẬP (chưa hiện nghiệm) thì mọi phím biểu
  // thức chạy vào cây node dùng chung; đang hiện nghiệm thì không nhận.
  function handlerIsEditing() {
    return !(modeHandler && typeof modeHandler.showingResult === 'function' && modeHandler.showingResult());
  }

  // Handler có nhận "=", AC và việc vẽ màn hình hay không. Mode Statistics ở
  // màn hình TÍNH mượn nguyên màn hình biểu thức của Calculate, nên lúc đó
  // trả false để mọi thứ chạy đúng đường cũ.
  function handlerOwnsInput() {
    return !!modeHandler &&
      !(typeof modeHandler.expressionScreen === 'function' && modeHandler.expressionScreen());
  }

  // Có đang gõ dở một biểu thức vào ô hệ số hay không. Phân biệt hai nghĩa
  // của "=", "AC" và ◀▶ trong Bộ soạn thảo hệ số — ĐÃ XÁC NHẬN 2026-08-17.
  function hasDraft() {
    return root.length > 0;
  }

  // Xoá sạch màn hình VÀ lịch sử. Chỉ HAI việc gọi tới đây: đổi phương thức
  // tính toán (MENU) và đổi mục `Input/Output` của SETUP — ĐÃ XÁC NHẬN
  // 2026-08-24 rằng đổi Input/Output cũng xoá: sau khi đổi thì màn hình trắng
  // và bấm ▲ không cuộn được về đâu. Ca ĐỐI CHỨNG cùng phiên: đổi Angle Unit
  // thì "5+5 / 10" vẫn nguyên trên màn hình, nên đây KHÔNG phải "mọi thay đổi
  // SETUP đều xoá". AC cũng không xoá lịch sử.
  function wipeScreenAndHistory() {
    editUndo = null;
    calcSession = null;
    resetDocument();
    mode = 'input';
    frozenExpression = '';
    frozenNodes = [];
    errorMessage = '';
    history = [];
    viewIndex = null;
    resultDisplayMode = initialResultDisplayMode();
    engExponent = null;
    engineeringEditing = false;
  }

  // UNDO giữ một trạng thái trước/sau cùng cây nhập và đường tới con trỏ.
  // Không lưu Ans, biến hoặc dữ liệu hệ số: CASIO chỉ hủy việc soạn thảo.
  function linearEditorInput() {
    return calcMode === 'base-n' || usesLineInput() || !!calcSession || !!modeHandler &&
      !(typeof modeHandler.capturesExpression === 'function' && modeHandler.capturesExpression());
  }

  function undoEditorAvailable() {
    return mode === 'input' && !linearEditorInput();
  }

  function captureEdit() {
    const path = [];
    let list = cursorList;
    while (list !== root) {
      const owner = findListOwner(root, list);
      if (!owner) break;
      path.unshift([owner.index, owner.slotIndex]);
      list = owner.parentList;
    }
    return { nodes: cloneNodes(root), path, index: cursorIndex };
  }

  function restoreEdit(snapshot) {
    root = cloneNodes(snapshot.nodes);
    cursorList = root;
    for (const [index, slot] of snapshot.path) cursorList = templateSlots(cursorList[index])[slot];
    cursorIndex = snapshot.index;
  }

  function resetDocument() {
    emptyCellDraft = false;
    root = [];
    cursorList = root;
    cursorIndex = 0;
  }

  // BUG-048, CASIO 2026-10-20: 199 byte; sin( là một token,
  // căn có ba byte cấu trúc, phân số có bảy; mỗi ô rỗng giữ một byte.
  function inputByteCount(nodes) {
    let count=0;
    for(let i=0;i<nodes.length;i++) {
      const node=nodes[i],slots=templateSlots(node);
      if(slots.length) {
        count+=4*slots.length-1;
        for(const slot of slots) count+=Math.max(1,inputByteCount(slot));
      } else {
        const run=nodes.slice(i).map(n=>n.type==='char'?n.ch:'\0').join('');
        const atom=[...FUNCTION_OPEN_TEXTS,'Ans'].find(text=>run.startsWith(text));
        count++;
        if(atom) i+=atom.length-1;
      }
    }
    return count;
  }

  // Chèn các node tại đúng vị trí con trỏ (không còn "nối vào cuối" như khi
  // buffer còn là chuỗi phẳng), rồi đẩy con trỏ ra sau phần vừa chèn.
  function insertNodes(nodes) {
    // Trước đây chỗ này CHẶN mọi phím khi đang ở mode có màn hình nhập riêng
    // (Ratio, Equation), vì ô hệ số chỉ nhận chữ số. ĐÃ XÁC NHẬN 2026-08-17
    // trên bản giả lập chính hãng rằng ô hệ số nhận BIỂU THỨC đầy đủ (gõ
    // "2+3" rồi "=" ghi 5 vào ô), nên chỗ chặn đó là bản vá cho một thiết kế
    // sai và đã được gỡ. Bộ soạn thảo hệ số nay dùng CHUNG cây node của Tầng
    // 5 làm vùng gõ dở, nên phân số, căn, sin... đều gõ được vào ô.
    // Ràng buộc duy nhất còn lại: đang hiện nghiệm thì không nhận phím (xem
    // handlerIsEditing bên dưới).
    if (modeHandler && !handlerIsEditing()) return;
    // PLUS Scientific Notation has a digit/sign exponent editor, rather
    // than the expression slot used by ×10ˣ (Power). Observed 2026-11-23.
    const owner = plusModel && findListOwner(root, cursorList);
    if (owner && owner.node.type === 'scientific' && cursorList === owner.node.exp &&
        !nodes.every(n => n.type === 'char' && (/^\d$/.test(n.ch) || n.negative && cursorIndex === 0))) return false;
    let replaced = 0;
    if (overwriteInput && linearEditorInput() && cursorIndex < cursorList.length) {
      replaced = 1;
      const atom = [...FUNCTION_OPEN_TEXTS, 'PreAns', 'Ans'].find(text =>
        text === cursorList.slice(cursorIndex, cursorIndex + text.length).map(node => node.ch || '').join(''));
      if (atom) replaced = atom.length;
    }
    cursorList.splice(cursorIndex, replaced, ...nodes);
    cursorIndex += nodes.length;
  }

  function insertText(text) {
    insertNodes(charNodes(text));
  }

  // Nuốt dãy chữ số/dấu chấm liền ngay TRƯỚC con trỏ ra khỏi vị trí hiện
  // tại — dùng chung cho phím phân số (nuốt vào tử số) và ˣ√ (nuốt vào bậc
  // căn), hai phím có cùng hành vi "số gõ dở nhảy vào vùng đầu của mẫu".
  // Vị trí bắt đầu của cụm ngoặc đóng ngay trước con trỏ, kể cả tên hàm đứng
  // trước dấu "(" — trả về -1 nếu ký tự trước con trỏ không phải ")" hoặc
  // ngoặc không cân. Ví dụ với "sin(30)" thì trả về vị trí của chữ "s".
  function groupStartBefore(list, index) {
    const last = list[index - 1];
    if (!last || last.type !== 'char' || last.ch !== ')') return -1;
    let depth = 0;
    for (let i = index - 1; i >= 0; i--) {
      const node = list[i];
      if (node.type !== 'char') continue;
      if (node.ch === ')') depth++;
      else if (node.ch === '(') {
        depth--;
        if (depth === 0) {
          // Có tên hàm đứng ngay trước dấu "(" thì nuốt cả tên hàm.
          const run = matchFunctionOpenBefore(list, i + 1);
          return run > 0 ? i + 1 - run : i;
        }
      }
    }
    return -1;
  }

  // Phím phân số nuốt phần đứng ngay trước con trỏ lên tử số.
  // ĐÃ XÁC NHẬN 2026-08-20: nuốt cả CỤM TRONG NGOẶC và cả LỜI GỌI HÀM, không
  // chỉ dãy chữ số — "(2+3)" rồi phím phân số ra "(2+3)" nằm trên vạch, và
  // "sin(30)" cũng vậy. Bản trước chỉ nuốt dãy chữ số nên cụm bị bỏ lại ngoài
  // và phân số sinh ra rỗng. CASIO 2026-10-20: π và hệ số liền trước π
  // cũng cùng vào tử (BUG-009), không bị bỏ ngoài mẫu mới.
  function absorbTrailingNumber() {
    let start = groupStartBefore(cursorList, cursorIndex);
    if (start < 0 && cursorList[cursorIndex - 1]?.type === 'recurring') start = cursorIndex - 1;
    if (start >= 0 && cursorList[start]?.type === 'recurring') {
      while (start > 0 && cursorList[start - 1].type === 'char' && /^[0-9.]$/.test(cursorList[start - 1].ch)) start--;
    }
    if (start < 0) {
      start = cursorIndex;
      while (start > 0) {
        const node = cursorList[start - 1];
        if (node.type !== 'char' || !/^[0-9.π]$/.test(node.ch)) break;
        start--;
      }
    }
    const absorbed = cursorList.splice(start, cursorIndex - start);
    cursorIndex = start;
    return absorbed;
  }

  // PLUS fraction entry wraps the whole adjacent implicit product, with
  // each factor's postfix intact. Explicit binary operators delimit it.
  function absorbFractionOperand880() {
    const atomStart = end => {
      let position = end;
      while (position > 0) {
        const node = cursorList[position - 1];
        if (node.type === 'sup' || node.type === 'char' && ['²','³','⁻¹','!','%'].includes(node.ch)) position--;
        else if (node.ch === '¹' && cursorList[position - 2]?.ch === '⁻') position -= 2;
        else break;
      }
      if (position === 0) return -1;
      const group = groupStartBefore(cursorList, position);
      if (group >= 0) return group;
      for (const token of ['PreAns','Ans']) {
        const start = position - token.length;
        if (start >= 0 && cursorList.slice(start, position).map(node => node.ch || '').join('') === token) return start;
      }
      const node = cursorList[position - 1];
      if (node.type === 'char') {
        return /^[0-9.πA-FMxyz]$/.test(node.ch) || node.constant || node.euler || node.imaginary || node.stat || node.eng
          ? position - 1 : -1;
      }
      return TEMPLATE_SLOT_FIELDS[node.type] ? position - 1 : -1;
    };
    let start = cursorIndex;
    while (start > 0) {
      const previous = atomStart(start);
      if (previous < 0) break;
      start = previous;
    }
    const operand = cursorList.splice(start, cursorIndex - start);
    cursorIndex = start;
    // Captured x² becomes an editable exponent on PLUS. This also preserves
    // its native fraction height; RIGHT can enter and edit the small2.
    return operand.map(node => node.type === 'char' && node.ch === '²'
      ? {type:'sup',exp:charNodes('2')} : node);
  }

  // Hậu tố Angle Unit phải ôm trọn giá trị ngay trước nó. Quét tới toán tử
  // nhị phân gần nhất; nếu kết thúc bằng dấu ")" thì groupStartBefore() giữ
  // nguyên cả ngoặc/lời gọi hàm. Nhờ vậy node phân số π/2 được bọc làm một
  // đơn vị thay vì gắn "r" nhầm vào riêng mẫu số 2.
  function absorbTrailingValue() {
    let start = groupStartBefore(cursorList, cursorIndex);
    if (start < 0) {
      start = cursorIndex;
      while (start > 0) {
        const node = cursorList[start - 1];
        if (node.type === 'char' && ['+', '-', '×', '÷', '('].includes(node.ch)) break;
        start--;
      }
    }
    const absorbed = cursorList.splice(start, cursorIndex - start);
    cursorIndex = start;
    return absorbed;
  }

  // Chèn một node mẫu rồi đưa con trỏ vào VÙNG NHẬP ĐẦU TIÊN của nó, để gõ
  // tiếp là gõ vào bên trong mẫu (dưới vạch căn, trong ô mũ...).
  function insertTemplate(node) {
    if (insertNodes([node]) === false) return serializeForDisplay(root);
    const slots = templateSlots(node);
    cursorList = slots[0];
    cursorIndex = 0;
    return serializeForDisplay(root);
  }

  // PLUS MathI SHIFT–DEL then √ incorporates the next operand, including
  // its exponent, but stops before a following binary operator. Observed
  // independently on fx-880BTG PLUS, 2026-11-20 (template-right-operand).
  function absorbFollowingOperand() {
    const start = cursorIndex;
    const first = cursorList[start];
    if (!first) return [];
    let end = start + 1;
    const functionLength = matchFunctionOpenAt(cursorList, start);
    if (functionLength || first.type === 'char' && first.ch === '(') {
      let depth = 1;
      end = start + (functionLength || 1);
      while (end < cursorList.length && depth > 0) {
        const node = cursorList[end++];
        if (node.type !== 'char') continue;
        if (node.ch === '(') depth++;
        else if (node.ch === ')') depth--;
      }
    } else if (first.type === 'char' && /^[0-9.]$/.test(first.ch)) {
      while (cursorList[end]?.type === 'char' && /^[0-9.]$/.test(cursorList[end].ch)) end++;
    } else {
      end = start + (matchMemoryTokenAt(cursorList, start) || 1);
    }
    while (cursorList[end]?.type === 'sup') end++;
    return cursorList.splice(start, end - start);
  }

  // Bấm số/dấu chấm/ngoặc/đổi dấu/DEL khi đang ở trạng thái kết quả hoặc lỗi
  // sẽ bắt đầu một phép tính mới (không nối vào Ans).
  function ensureFreshInputIfNeeded() {
    if (mode === 'result' || mode === 'error') {
      engineeringEditing = false;
      calcSession = null;
      resetDocument();
      mode = 'input';
      frozenExpression = '';
      frozenNodes = [];
      errorMessage = '';
      viewIndex = null;
    }
    if (plusModel && calcSession?.operation === 'calc' && calcSession.phase === 'form' && !calcSession.runSelected)
      calcSession.editingField = true;
  }

  function createCoordinateContext(source) {
    if (!/Pol\(|Rec\(/.test(source)) return null;
    const replacements = [];
    const staged = {};
    const register = name => staged[name] || {
      value:variables[name], exact:variablesExact[name], exactSurd:variablesExactSurd[name], exactPi:variablesExactPi[name]
    };
    const literal = item => {
      if (item.exact !== null) return '(' + fractionToEvalLiteral(item.exact) + ')';
      if (item.exactPi !== null) return '(' + fractionToEvalLiteral(piFractionToFraction(item.exactPi)) + ')×π';
      if (item.exactSurd !== null) {
        const surd = item.exactSurd;
        return '((' + fractionToEvalLiteral(surd.rational) + ')+(' +
          fractionToEvalLiteral(surd.coeff) + ')×√(' + surd.radicand + '))';
      }
      return '(' + fractionToEvalLiteral(roundedNumberFraction(item.value)) + ')';
    };
    const rewrite = (start=0,end=source.length) => {
      let text = '', cursor = start;
      for (const replacement of replacements.filter(r=>r.start>=start && r.end<=end)
          .sort((a,b)=>a.start-b.start || b.end-a.end)) {
        if (replacement.start < cursor) continue;
        text += source.slice(cursor,replacement.start) + replacement.text;
        cursor = replacement.end;
      }
      return text + source.slice(cursor,end);
    };
    const capture = (expression,value) => {
      let exact=null, exactSurd=null, exactPi=null;
      try {
        const fraction = evaluateExpressionExact(expression,ansExact,variablesExact,angleUnit);
        if (fracRoughlyEqualsFloat(fraction,value) && fracDigitCount(fraction)<=10) exact=fracReduce(fraction);
      } catch (_) {}
      if (exact === null) {
        try {
          const surd = surdNormalize(evaluateExpressionExactSurd(expression,ansExactSurd,variablesExactSurd,angleUnit));
          if (surdRoughlyEqualsFloat(surd,value)) {
            if (surd.radicand === 1n && fracDigitCount(surd.rational)<=10) exact=fracReduce(surd.rational);
            else exactSurd=surd;
          }
        } catch (_) {
          try { const surd=tryExactForwardTrig(expression,ans,evalVariables(),angleUnit);
            if (surd && surdRoughlyEqualsFloat(surd,value)) exactSurd=surd; } catch (_) {}
        }
      }
      if (exact === null && exactSurd === null) {
        try {
          const pi=tryExactInverseTrigPi(expression,ans,evalVariables(),angleUnit) ||
            piValToPiFraction(evaluateExpressionExactPi(expression,ansExactPi,variablesExactPi,angleUnit,plusModel));
          if (pi && piRoughlyEqualsFloat(pi,value)) exactPi=pi;
        } catch (_) {}
      }
      if (exact === null && exactSurd === null && exactPi === null && Number.isInteger(value)) exact=roundedNumberFraction(value);
      if (exact !== null) exactSurd=surdFromFraction(exact);
      return { value,exact,exactSurd,exactPi };
    };
    let barePair = null;
    return {
      rewrite,
      setSource(text) { source=text; },
      variable(name,start) {
        if (name === 'x' || name === 'y') replacements.push({start,end:start+1,text:literal(register(name))});
      },
      accept(pair) {
        const [a,b]=pair.arguments.map(range=>'('+rewrite(range.start,range.end)+')');
        const firstExpression=pair.kind==='Pol' ? '√('+a+'²+'+b+'²)' : a+'×cos('+b+')';
        const first=capture(firstExpression,pair.first);
        let second;
        if (pair.kind==='Rec') second=capture(a+'×sin('+b+')',pair.second);
        else {
          second=capture('tan⁻¹('+b+'÷'+a+')',pair.second);
          if (angleUnit==='rad') {
            let coefficient=null;
            if (pair.a===0) coefficient={num:pair.b<0?-1n:1n,den:2n};
            else if (pair.b===0) coefficient={num:pair.a<0?1n:0n,den:1n};
            else {
              try {
                const pi=tryExactInverseTrigPi('tan⁻¹('+b+'÷'+a+')',ans,evalVariables(),'rad');
                if (pi) coefficient=piFractionToFraction(pi);
              } catch (_) {}
              if (coefficient && pair.a<0) coefficient=fracAdd(coefficient,{num:pair.b<0?-1n:1n,den:1n});
            }
            if (coefficient && coefficient.num!==0n) second={value:pair.second,exact:null,exactSurd:null,exactPi:piFractionFromFraction(coefficient)};
          }
        }
        staged.x=first; staged.y=second;
        // CASIO 2026-10-05: hàm đã tính vẫn ghi x/y kể cả khi một phép
        // toán sau đó gây Math ERROR hoặc Syntax ERROR.
        setRegisterValue('x',first); setRegisterValue('y',second);
        replacements.push({start:pair.start,end:pair.end,text:literal(first)});
        if (pair.start===0 && pair.end===source.length) barePair=pair;
      },
      result() { return barePair; }
    };
  }

  // Tính giá trị hiện tại để dùng chung cho "=", STO, và M+: nếu đang ở
  // 'result' thì dùng lại Ans, nếu đang gõ dở thì tính biểu thức đang gõ như
  // bấm "=". Trả về { ok: false } khi không có gì để tính (chưa gõ gì) hoặc
  // biểu thức lỗi (mode đã chuyển sang 'error').
  function remainderContextFor(source) {
    return createRemainderContext(source,pair=>{
      for(const [name,value] of [['E',pair.value],['F',pair.remainder]]) {
        const exact=fractionFromDecimalString(String(value));
        setRegisterValue(name,{value,exact,exactSurd:surdFromFraction(exact),exactPi:null});
      }
    });
  }

  function checkStructuredPowers880() {
    if (!plusModel || usesLineInput()) return;
    const invalidPowerTail = list => {
      for (let i = 0; i < list.length; i++) {
        if (list[i].type === 'sup' && /^[0-9.]$/.test(list[i + 1]?.ch || '')) return {list, index:i + 1};
        for (const slot of templateSlots(list[i])) {
          const invalid = invalidPowerTail(slot);
          if (invalid) return invalid;
        }
      }
      return null;
    };
    const invalid = invalidPowerTail(root);
    if (invalid) {
      cursorList = invalid.list; cursorIndex = invalid.index;
      throw new EngineError('Syntax ERROR');
    }
  }

  function evaluateCurrentValue() {
    if (mode === 'result') {
      // CASIO 2026-09-18: M±/STO từ nghiệm Solve sử dụng Ans rồi thoát
      // phiên Solve; biểu thức phương trình không trở thành phép tính bộ nhớ.
      const fromSolve = calcSession && calcSession.operation === 'solve' && calcSession.phase === 'result';
      if (fromSolve) calcSession = null;
      return { ok: true, value: ans, exact: ansExact && fractionFitsCurrentDisplay(ansExact) ? ansExact : null, memoryExact: ansExact, exactSurd: ansExactSurd, exactPi: ansExactPi,
        closedExpr: fromSolve ? 'Ans' : frozenExpression, nodes: fromSolve ? charNodes('Ans') : frozenNodes };
    }
    if (mode !== 'input' || root.length === 0) {
      return { ok: false };
    }
    // Σ/Π/∫ không dịch được thành một biểu thức tĩnh (xem reduceCalcNodes ở
    // trên) nên phải rút gọn cây TRƯỚC khi dịch xuống chuỗi phẳng — mọi lỗi
    // từ đó (Σ lồng nhau, cận không hợp lệ, ∫ chưa hỗ trợ...) đi qua cùng
    // một chỗ bắt EngineError với mọi lỗi khác, không cần nhánh riêng.
    const inputNodes = completeAnsFunctionArguments(root);
    let missingParens;
    let closed;
    let result;
    let symbolicValue;
    let finiteRational = null;
    let sampledExpression;
    let coordinateContext;
    let coordinateResult;
    let remainderResult;
    // PLUS Calculate 2026-11-19 và ô SOLVE 580: áp ngưỡng 10^-99 sau
    // từng phép tính. Ghi nhận underflow để nhánh Fraction không phục hồi
    // một số đã trở thành zero ở giữa biểu thức (kể cả dùng Ans/x).
    const minimumMagnitude = plusModel || calcSession?.operation === 'solve' && calcSession.phase === 'form' ? 1e-99 : 0;
    const domainContext = { underflow: false, plusModel };
    let exactVariables = variablesExact;
    let exactAns = ansExact;
    try {
      checkStructuredPowers880();
      if (plusModel && calcMode !== 'complex' &&
          (ansComplex?.im || VARIABLE_NAMES.some(name => variablesImaginary[name] !== 0))) {
        let position=null;
        calcVariableNames(inputNodes,(name,list,index) => {
          const nonReal=name === 'Ans' ? !!ansComplex?.im : (variablesImaginary[name] || 0) !== 0;
          if (!position && nonReal) {
            const original=correspondingCalculusList880(root,inputNodes,list);
            if (original) position={list:original,index};
          }
        });
        if (position) {
          const error=new EngineError('Math ERROR');
          error.scalarReference=position;
          throw error;
        }
      }
      const reduced = reduceCalcNodes(
        inputNodes, ans, evalVariables(), angleUnit, ansExact, variablesExact, numberFormat, plusModel
      );
      missingParens = countUnclosedParens(serializeForEval(reduced));
      closed = autoCloseParens(serializeForEval(reduced));
      sampledExpression = materializeRandomExpression(closed, part =>
        evaluateExpression(part, ans, evalVariables(), angleUnit, minimumMagnitude, numberFormat, null, null, domainContext));
      sampledExpression = expandDmsLiterals(sampledExpression,plusModel);
      coordinateContext = createCoordinateContext(sampledExpression);
      const remainderContext=remainderContextFor(sampledExpression);
      result = evaluateExpression(sampledExpression, ans, evalVariables(), angleUnit, minimumMagnitude, numberFormat, coordinateContext, remainderContext, domainContext);
      symbolicValue = result;
      remainderResult=remainderContext && remainderContext.result();
      coordinateResult = coordinateContext && coordinateContext.result();
      // CASIO 2026-10-06: x/Ans gọi lại nghiệm 0.9899 hiện 9899/10000;
      // x chốt 0.9898989899 nhân 10^9 rồi trừ mốc cho 9/10.
      // Biến thập phân không có căn/π được tính bằng Fraction sẵn có,
      // tránh nhiễu nhị phân khi các hạng gần nhau bị triệt tiêu.
      const tokens = tokenize(sampledExpression);
      for (const token of tokens) {
        if (token.type === 'VARIABLE' && variablesExact[token.name] === null &&
            variablesExactSurd[token.name] === null && variablesExactPi[token.name] === null) {
          if (exactVariables === variablesExact) exactVariables = { ...variablesExact };
          exactVariables[token.name] = roundedNumberFraction(variables[token.name]);
        } else if (token.type === 'ANS' && ansExact === null && ansExactSurd === null && ansExactPi === null) {
          exactAns = roundedNumberFraction(ans);
        }
      }
      // Tiêu chí toán học06/11: biểu thức hữu tỉ giữ chính xác các bước
      // trung gian, chỉ làm tròn khi hiển thị. Giữ bộ 'casio' để đối chiếu
      // lịch sử; không dùng phần dư hữu hạn của nó làm đáp số toán học.
      // Nhánh số thực vẫn kiểm cú pháp/miền/overflow, không phục hồi underflow.
      if((!domainContext.underflow || plusModel) && !sampledExpression.includes('÷R') && !/(?:Pol|Rec)\(/.test(sampledExpression)) {
        try {
          const hasConversion = hasUnitConversion(inputNodes);
          const usesPlusRegister = !hasConversion && tokens.some(token =>
            (token.type === 'VARIABLE' && plusSolveRegisterValues.has(exactVariables[token.name])) ||
            (token.type === 'ANS' && plusSolveRegisterValues.has(exactAns)));
          const profile = domainContext.underflow ? 'plus-underflow'
            : hasConversion && !hasExplicitFraction(inputNodes) ? 'casio'
            : usesPlusRegister ? 'plus-solve-register'
            : plusModel && ['equation','inequality','ratio'].includes(calcMode) ? 'plus-coefficient'
            : plusModel && calcMode === 'calculate' ? 'plus-number'
            : plusModel ? 'plus-associative' : 0;
          const exactValue = evaluateExpressionExact(tokens, exactAns, exactVariables, angleUnit, profile);
          const precise=fracToNumber(exactValue);
          if(Number.isFinite(precise) && (precise!==0 || exactValue.num===0n) &&
              (plusModel ? Math.abs(precise)<1e100 : Math.abs(precise)<=9.999999999e99)) {
            result=hasConversion?normalizeUnitConversionNumber(precise):precise;
            finiteRational=exactValue;
            if (usesPlusRegister) plusSolveRegisterValues.add(exactValue);
          }
        } catch (_) { /* Hàm vô tỉ tiếp tục dùng nhánh số thực. */ }
      }
    } catch (e) {
      mode = 'error';
      errorMessage = e instanceof EngineError ? e.message : 'Math ERROR';
      // PLUS Stack Goto selects the pending operation in its original
      // editable slot. Do not interpret offsets from rewritten expressions.
      if (plusModel && calcMode === 'calculate' && !usesLineInput() && Number.isInteger(e.stackOperator) &&
          typeof sampledExpression === 'string' && !containsCalcNode(root) &&
          sampledExpression === autoCloseParens(serializeForEval(root)) &&
          !/(?:^|[^A-Za-z])[fg]\(/.test(sampledExpression)) {
        const position = stackSourcePosition880(root, e.stackOperator);
        if (position) ({list:cursorList,index:cursorIndex}=position);
      }
      if (plusModel && e.implicitNumeric) {
        const position=implicitNumericPosition880(root);
        if (position) ({list:cursorList,index:cursorIndex}=position);
      }
      if (plusModel && e.scalarReference) ({list:cursorList,index:cursorIndex}=e.scalarReference);
      if (plusModel && calcMode === 'calculate' && e.negativeRadical) {
        const target=calcNegativeRadicalArgument(inputNodes);
        const original=target && correspondingCalculusList880(root,inputNodes,target);
        if (original) { cursorList=original; cursorIndex=original.length; }
      }
      if (plusModel && errorMessage === 'Syntax ERROR' && !usesLineInput()) {
        const missing=firstEmptyTemplateSlot880(root);
        if (missing) {cursorList=missing;cursorIndex=0;}
        else {
          const unmatched = firstUnmatchedClose880(root);
          if (unmatched) ({list:cursorList,index:cursorIndex}=unmatched);
        }
      }
      if (plusModel && e.calculusUpper) {
        const field = correspondingCalculusList880(root, inputNodes, e.calculusUpper);
        if (field) { cursorList = field; cursorIndex = field.length; }
      }
      if (plusModel && e.calculusEndpoint) {
        const field = correspondingCalculusList880(root, inputNodes, e.calculusEndpoint);
        if (field) { cursorList = field; cursorIndex = field.length; }
      }
      if (plusModel && e.calculusInputEnd) {
        const {list,index} = e.calculusInputEnd;
        const original = correspondingCalculusList880(root, inputNodes, list);
        if (original) { cursorList = original; cursorIndex = Math.min(index, original.length); }
      }
      if (e.unregisteredFunction || e.registeredFunction) {
        const position = registeredCallClose(root, e.registeredFunction || e.unregisteredFunction);
        if (position) ({list:cursorList, index:cursorIndex} = position);
      }
      if (plusModel && e.argumentPairFunction) {
        const position = registeredCallClose(root,e.argumentPairFunction);
        if (position) ({list:cursorList, index:cursorIndex} = position);
      }
      if (plusModel && Number.isInteger(e.factorialStart)) {
        const index = root.findIndex((node,index) => node.ch === '!' &&
          serializeForEval(root.slice(0,index)).length === e.factorialStart);
        if (index >= 0) {cursorList = root; cursorIndex = index;}
      }
      return { ok: false, ...(e.negativeRadical ? {negativeRadical:true} : {}) };
    }
    // Nhánh phân số chính xác chạy SAU khi bộ thập phân đã tính thành công
    // — mọi lỗi/không biểu diễn được ở đây chỉ đơn giản bỏ qua (exact vẫn
    // null), không ảnh hưởng gì tới "result" đã tính đúng ở trên. Chốt an
    // toàn: so gần đúng với giá trị thập phân trước khi chấp nhận.
    let exactExpression = coordinateContext ? coordinateContext.rewrite() : sampledExpression;
    if (plusModel && /[fg]\(/.test(exactExpression)) {
      try {exactExpression = expandRegisteredFunctionsForExact(exactExpression);}
      catch (_) { /* Keep the numeric result when symbolic expansion is unavailable. */ }
    }
    const exactClosed = expandDiscreteFunctions(exactExpression, ans, evalVariables(), angleUnit, numberFormat);
    let exact = null;
    try {
      const fx = fracReduce(evaluateExpressionExact(exactClosed, exactAns, exactVariables, angleUnit,
        plusModel ? (domainContext.underflow ? 'plus-underflow' : 'plus-associative') : 0));
      if (fracRoughlyEqualsFloat(fx, result) && calculationFractionConsistent(fx,finiteRational) && fractionFitsCurrentDisplay(fx) &&
          (plusModel || !typedFractionTooLong(root))) {
        exact = fx;
      }
    } catch (e) {
      // không có dạng chính xác — bình thường, không phải lỗi
    }
    // Nhánh căn thức (SurdValue) — nếu Fraction ở trên đã ra kết quả, giá
    // trị đó CŨNG là một SurdValue hợp lệ (radicand=1n, dạng suy biến) để
    // Ans/STO/M+ dùng lại được trong một biểu thức căn thức sau này (vd
    // "√2=" rồi "Ans+√3="). Chỉ thật sự CHẠY bộ tính căn thức khi Fraction
    // throw (biểu thức không thuần hữu tỉ).
    let exactSurd = null;
    if (exact !== null) {
      exactSurd = surdFromFraction(exact);
    } else {
      let sx = null;
      try {
        sx = surdNormalize(evaluateExpressionExactSurd(exactClosed, ansExactSurd, variablesExactSurd, angleUnit, plusModel));
      } catch (e) {
        // Không có dạng căn thức đại số thông thường — thử tra bảng lượng
        // giác góc đặc biệt (bước 3) trước khi bỏ cuộc hẳn, dùng CHUNG một
        // biến sx để áp cùng logic suy biến-về-hữu-tỉ bên dưới.
        try {
          sx = tryExactForwardTrig(exactClosed, ans, evalVariables(), angleUnit);
        } catch (e2) {
          sx = null;
        }
      }
      if (sx !== null && surdRoughlyEqualsFloat(sx, result)) {
        if (sx.radicand === 1n) {
          // Suy biến về hữu tỉ thuần (vd √2×√8=4, hoặc sin(90)=1) — đẩy
          // NGƯỢC vào đúng slot Fraction sẵn có, để exactFraction/S⇔D/Ans
          // dùng lại nguyên cơ chế đã xác nhận máy thật, không cần một
          // đường lan truyền riêng cho đúng mỗi trường hợp suy biến này.
          const fx = fracReduce(sx.rational);
          // Cùng hai điều kiện với nhánh Fraction ở trên — nếu chỉ kiểm kết
          // quả đã rút gọn thì phân số gõ quá dài vẫn lọt qua đường này.
          if (calculationFractionConsistent(fx,finiteRational) && fractionFitsCurrentDisplay(fx) && (plusModel || !typedFractionTooLong(root))) {
            exact = fx;
            exactSurd = surdFromFraction(fx);
          }
        } else if (!plusModel || surdFitsPlusRange(sx)) {
          exactSurd = sx;
        }
      }
    }
    // Nhánh bội số π (bước 3, CHỈ lượng giác ngược ở Rad) — độc lập với hai
    // nhánh trên vì SIN/ASIN là hai loại token khác nhau, không bao giờ
    // cùng khớp một biểu thức, nên không tranh chấp/cần ưu tiên gì thêm.
    let exactPi = null;
    let exactFromPi = null;
    try {
      let px = tryExactInverseTrigPi(exactClosed, ans, evalVariables(), angleUnit);
      if (px === null) {
        // Không phải lượng giác ngược → thử bộ tính π (bội số π sinh ra từ
        // chính phép tính, vd "2π+π=3π"). ĐÃ XÁC NHẬN máy thật 2026-08-17.
        // Hai nguồn không tranh chấp nhau: ASIN/ACOS/ATAN là token mà
        // evaluateExpressionExactPi luôn throw, nên cùng lắm chỉ một bên ra
        // kết quả.
        try {
          const piValue = evaluateExpressionExactPi(exactClosed, ansExactPi, variablesExactPi, angleUnit,plusModel);
          if (piValue.degree === 0) exactFromPi = fracReduce(piValue.rational);
          else px = piValToPiFraction(piValue);
        } catch (e2) {
          px = null;
        }
      }
      if (px !== null && piRoughlyEqualsFloat(px, result)) {
        exactPi = px;
      }
    } catch (e) {
      // không có dạng chính xác — bình thường, không phải lỗi
    }
    if (exact === null && exactFromPi !== null &&
        fracRoughlyEqualsFloat(exactFromPi, result) && calculationFractionConsistent(exactFromPi,finiteRational) && fractionFitsCurrentDisplay(exactFromPi) &&
        (plusModel || !typedFractionTooLong(root))) {
      exact = exactFromPi;
      exactSurd = surdFromFraction(exactFromPi);
    }
    const memoryTokens = tokenize(sampledExpression);
    if (exact === null && exactSurd === null && exactPi === null && memoryTokens.length > 1 &&
        memoryTokens.some(token => !['NUMBER', 'MINUS', 'LPAREN', 'RPAREN'].includes(token.type))) {
      // Nhận dạng ký hiệu dùng phép tính chưa chốt chữ số, như các đường
      // Fraction/Surd ở trên. Chỉ nhận nếu vẫn tương ứng kết quả số đã chốt;
      // không nới tiêu chuẩn nhận dạng để biến số gần π thành ký hiệu π.
      const candidate = recognizeCalculatedPiResult(symbolicValue);
      if (candidate !== null && piRoughlyEqualsFloat(candidate, result)) exactPi = candidate;
    }
    // PLUS giữ cây nhập gốc khi hiển thị kết quả. Chuỗi tính toán phía trên
    // đã được bổ sung các dấu ngoặc đóng cần thiết.
    const snapshot = plusModel && calcMode === 'calculate'
      ? clarifyImplicitDivisors880(inputNodes) : cloneNodes(inputNodes);
    if (plusModel && (hasExplicitFraction(inputNodes) || memoryTokens.some(token =>
        token.type === 'ANS' ? ansExact && plusRecallFractions.has(ansExact)
        : ['VARIABLE','PREANS'].includes(token.type) && plusRecallFractions.has(
          variablesExact[token.type === 'PREANS' ? 'PreAns' : token.name])))) {
      for (const fraction of [finiteRational,exact]) {
        if (fraction && fraction.den !== 1n) plusRecallFractions.add(fraction);
      }
    }
    if (!coordinateResult && !usesLineInput() && !plusModel) snapshot.push(...charNodes(')'.repeat(missingParens)));
    const displayFractionCandidate = exact === null && exactSurd === null && exactPi === null &&
      memoryTokens.length === 1 && ['VARIABLE', 'ANS'].includes(memoryTokens[0].type)
      ? approximateDisplayFraction(result) : null;
    const displayFraction = displayFractionCandidate && fractionFitsCurrentDisplay(displayFractionCandidate) ? displayFractionCandidate : null;
    return { ok: true, value: result, exact, memoryExact: !hasUnitConversion(inputNodes) ? finiteRational : null, exactSurd, exactPi, displayFraction, closedExpr: (coordinateResult || usesLineInput() || plusModel) ? serializeForDisplay(snapshot) : closed, nodes: snapshot, coordinateResult, remainderResult };
  }

  // Đường tính riêng của mode Complex. Cây nhập và quy tắc tự đóng ngoặc vẫn
  // dùng chung với Calculate; hậu tố ▶r∠θ/▶a+bi chỉ chọn cách vẽ kết quả.
  function complexRegistersForEvaluation() {
    return Object.fromEntries(VARIABLE_NAMES.map(name => [name, {
      re:variables[name], im:variablesImaginary[name],
      ...(plusModel && variablesComplexAlgebraic[name] ? {algebraic:variablesComplexAlgebraic[name]}
        : plusModel && variablesImaginary[name] === 0 && variablesExactSurd[name]
        ? {algebraic:{re:variablesExactSurd[name],im:ZERO_SURD}} : {})
    }]));
  }

  function complexAnswerForEvaluation() {
    const value=ansComplex || {re:ans ?? 0,im:0};
    return plusModel && ansComplexAlgebraic ? {...value,algebraic:ansComplexAlgebraic} : value;
  }

  function evaluateCurrentComplexValue() {
    if (mode === 'result' && viewEntry()?.complex) {
      const entry = viewEntry();
      return { ok: true, value: { ...entry.complex }, closedExpr: entry.expression,
        nodes: cloneNodes(entry.nodes), complexFormat: entry.complexFormat,
        complexExactComponents: entry.complexExactComponents,
        complexRoundedComponents: entry.complexRoundedComponents,
        ...(plusModel ? {complexAlgebraic:entry.complexAlgebraic} : {}),
        complexAngleResult: entry.complexAngleResult };
    }
    if (mode !== 'input' || root.length === 0) return { ok: false };
    let missingParens;
    let closed;
    let result;
    const lastNode = root[root.length - 1];
    const forcedFormat = lastNode && lastNode.complexOutput;
    const expressionNodes = completeAnsFunctionArguments(forcedFormat ? root.slice(0, -1) : root);
    try {
      checkStructuredPowers880();
      missingParens = countUnclosedParens(serializeForEval(expressionNodes));
      closed = autoCloseParens(serializeForEval(expressionNodes));
      result = evaluateComplexExpression(
        closed,
        complexAnswerForEvaluation(),
        angleUnit,
        complexRegistersForEvaluation(), numberFormat, plusModel, plusModel
      );
    } catch (e) {
      mode = 'error';
      errorMessage = e instanceof EngineError ? e.message : 'Math ERROR';
      if (plusModel && e.implicitNumeric) {
        const position=implicitNumericPosition880(root);
        if (position) ({list:cursorList,index:cursorIndex}=position);
      }
      return { ok: false };
    }
    const snapshot = cloneNodes(expressionNodes);
    snapshot.push(...charNodes(')'.repeat(missingParens)));
    if (forcedFormat) snapshot.push({ ...lastNode });
    const suffix = forcedFormat ? lastNode.ch : '';
    return {
      ok: true,
      value: {re:result.re,im:result.im},
      ...(plusModel ? {complexAlgebraic:result.algebraic || null} : {}),
      closedExpr: closed + suffix,
      nodes: snapshot,
      complexFormat: forcedFormat || complexFormat,
      // Nhập r∠θ từ phím giữ các thành phần hữu tỉ/căn thức ở MathO, như
      // ca chính thức 5∠30 → 5√3/2+5/2i.
      complexExactComponents: closed.includes('∠'),
      complexRoundedComponents: closed.includes('Rnd(') ||
        (inputOutput === 'mathio' && /Ran(?:Int)?#/.test(closed)),
      // Arg trong Radian được CASIO giữ dưới dạng bội π (1+i → π/4).
      complexAngleResult: /^Arg\(/.test(closed)
    };
  }

  // MatrixCalc dùng chung cây nhập tự nhiên của engine nhưng đánh giá bằng
  // evaluator ma trận riêng. Giá trị trả về có thể là scalar (Det) hoặc ma
  // trận; chỉ nhánh ma trận mới cập nhật MatAns.
  function arrayScalarDisplayFraction(value) {
    const fraction = plusModel ? approximateDisplayFraction(value) : null;
    return fraction && fractionFitsCurrentDisplay(fraction) ? fraction : null;
  }

  function evaluateCurrentMatrixValue() {
    if (mode !== 'input' || root.length === 0) return { ok: false };
    const inputNodes = completeAnsFunctionArguments(root);
    let missingParens;
    let closed;
    let result;
    let coordinateResult;
    let remainderResult;
    try {
      const raw = serializeForEval(inputNodes);
      missingParens = countUnclosedParens(raw);
      closed = autoCloseParens(raw);
      const context=createCoordinateContext(closed);
      const remainderContext=remainderContextFor(closed);
      result = (plusModel ? evaluateMatrixExpressionPlus : evaluateMatrixExpression)(closed, matrixMemory, numberFormat, ans, angleUnit, context,remainderContext);
      remainderResult=remainderContext && remainderContext.result();
      coordinateResult=context && context.result();
    } catch (e) {
      if (plusModel && (root.at(-1)?.ch === ')' || serializeForDisplay(root).endsWith('⁻¹'))) {
        cursorList = root;
        cursorIndex = root.length - (root.at(-1)?.ch === ')' ? 1 : 2);
      }
      mode = 'error';
      errorMessage = e instanceof EngineError ? e.message : 'Math ERROR';
      return { ok: false };
    }
    const snapshot = cloneNodes(inputNodes);
    if (!coordinateResult && !plusModel) snapshot.push(...charNodes(')'.repeat(missingParens)));
    return { ok: true, value: result, closedExpr: coordinateResult ? serializeForDisplay(snapshot) : closed, nodes: snapshot, coordinateResult, remainderResult };
  }

  // Vector Calc cũng dùng cây nhập tự nhiên, nhưng cần kho VctA-D/VctAns,
  // Ans vô hướng và Angle Unit hiện hành.
  function evaluateCurrentVectorValue() {
    if (mode !== 'input' || root.length === 0) return { ok: false };
    const inputNodes = completeAnsFunctionArguments(root);
    let missingParens;
    let closed;
    let result;
    let coordinateResult;
    let remainderResult;
    try {
      const raw = serializeForEval(inputNodes);
      missingParens = countUnclosedParens(raw);
      closed = autoCloseParens(raw);
      const context=createCoordinateContext(closed);
      const remainderContext=remainderContextFor(closed);
      result = (plusModel ? evaluateVectorExpressionPlus : evaluateVectorExpression)(closed, vectorMemory, ans, angleUnit, numberFormat, context,remainderContext);
      remainderResult=remainderContext && remainderContext.result();
      coordinateResult=context && context.result();
    } catch (e) {
      if (plusModel && root.at(-1)?.ch === ')') {
        cursorList = root;
        cursorIndex = root.length - 1;
      }
      mode = 'error';
      errorMessage = e instanceof EngineError ? e.message : 'Math ERROR';
      return { ok: false };
    }
    const snapshot = cloneNodes(inputNodes);
    if (!coordinateResult && !plusModel) snapshot.push(...charNodes(')'.repeat(missingParens)));
    return { ok: true, value: result, closedExpr: coordinateResult ? serializeForDisplay(snapshot) : closed, nodes: snapshot, coordinateResult, remainderResult };
  }

  // [ĐÃ XÁC NHẬN 2026-09-17] CALC: biến hỏi theo thứ tự xuất hiện,
  // phép gán bỏ biến bên trái khỏi danh sách; nhiều câu lệnh chạy lần lượt.
  function calcVariableNames(nodes, onReference = null) {
    const names = [];
    function visit(list) {
      let run = '';
      let indices=[];
      function flush() {
        if (!run) return;
        const tokens = calcMode === 'complex' ? tokenizeComplex(run) : tokenize(run);
        for (const token of tokens) {
          if (token.type === 'VARIABLE' && !names.includes(token.name)) names.push(token.name);
          if (['VARIABLE','ANS'].includes(token.type) && onReference && Number.isInteger(token.start))
            onReference(token.type === 'ANS' ? 'Ans' : token.name,list,indices[token.start]);
        }
        run = '';
        indices=[];
      }
      for (const [index,node] of list.entries()) {
        if (node.type === 'char' && !node.eng && !node.stat && !node.constant && !node.euler && !node.conversion && !node.complexOutput) {
          indices.push(...Array(node.ch.length).fill(index));
          run += node.ch;
        }
        else {
          flush();
          for (const slot of templateSlots(node)) visit(slot);
        }
      }
      flush();
    }
    visit(nodes);
    return names;
  }

  function calcStatements(nodes) {
    const statements = [[]];
    for (const node of nodes) {
      if (node.type === 'char' && node.ch === ':') statements.push([]);
      else statements[statements.length - 1].push(node);
    }
    return statements.map(statement => {
      if (!statement.length) throw new EngineError('Syntax ERROR');
      const equalsIndex = statement.findIndex(node => node.type === 'char' && node.ch === '=');
      let assignment = null;
      let valueNodes = statement;
      if (equalsIndex >= 0) {
        if (equalsIndex !== 1 || !VARIABLE_NAMES.includes(statement[0].ch)) {
          throw new EngineError('Syntax ERROR');
        }
        assignment = statement[0].ch;
        valueNodes = statement.slice(2);
        if (valueNodes.some(node => node.ch === '=') || !calcVariableNames(valueNodes).length) {
          throw new EngineError('Syntax ERROR');
        }
      }
      return { nodes: statement, valueNodes, assignment };
    });
  }

  function setRegisterValue(name, value) {
    variablesImaginary[name] = 0;
    variablesComplexAlgebraic[name] = null;
    variables[name] = value.value;
    variablesExact[name] = value.memoryExact || value.exact;
    variablesExactSurd[name] = value.exactSurd;
    variablesExactPi[name] = value.exactPi;
  }

  function openCalcForm() {
    calcSession.phase = 'form';
    calcSession.selectedIndex = 0;
    calcSession.statementIndex = 0;
    calcSession.errorSource = null;
    calcSession.errorTarget = null;
    calcSession.editingField = false;
    if (plusModel) calcSession.runSelected = false;
    resetDocument();
    mode = 'input';
    errorMessage = '';
    viewIndex = null;
  }

  function commitCalcDraft() {
    let value;
    if (calcMode === 'complex') {
      const complexValue = evaluateCurrentComplexValue();
      if (!complexValue.ok) { calcSession.errorSource = 'draft'; return false; }
      // Biến nhớ thực chỉ nhận phần thực (CASIO A=1+i → A=1).
      const re = complexValue.value.re;
      let exact = null;
      try { exact = evaluateExpressionExact(autoCloseParens(serializeForEval(root)), ansExact, variablesExact, angleUnit); }
      catch (e) { /* giá trị phức lưu vào biến thực chỉ giữ phần thực */ }
      value = { value: re, exact, exactSurd: exact ? surdFromFraction(exact) : null, exactPi: null };
    } else value = evaluateCurrentValue();
    if (!value.ok && calcMode !== 'complex') { calcSession.errorSource = 'draft'; return false; }
    const name = calcSession.names[calcSession.selectedIndex];
    if (plusModel && calcSession.operation === 'calc') {
      // PLUS keeps accepted form values separate until Run, including when
      // the form is cancelled or HOME opens another application.
      (calcSession.pendingValues ||= {})[name] = value;
    } else setRegisterValue(name, value);
    resetDocument();
    if (plusModel && calcSession.operation === 'solve') {
      calcSession.initial = value.value;
      calcSession.editingInitial = false;
      calcSession.runSelected = true;
    } else {
      if (plusModel && calcSession.operation === 'calc') calcSession.editingField = false;
      if (calcSession.selectedIndex < calcSession.names.length - 1) calcSession.selectedIndex++;
      else if (plusModel) calcSession.runSelected = true;
    }
    return true;
  }

  function openPlusSolveForm() {
    const session = calcSession;
    session.phase = 'form';
    session.initial = variables[session.names[session.selectedIndex]];
    session.editingInitial = false;
    session.runSelected = false;
  }

  function goBackPlusSolve(toExpression = false) {
    const session = calcSession;
    mode = 'input';
    errorMessage = '';
    resetDocument();
    if (!toExpression && (session.phase === 'result' || session.errorSource === 'draft')) {
      session.phase = 'form';
      session.editingInitial = false;
      session.runSelected = false;
      session.errorSource = null;
    } else if (!toExpression && session.phase === 'form' && session.names.length > 1) {
      session.phase = 'choose';
    } else {
      root.push(...cloneNodes(session.nodes));
      cursorIndex = root.length;
      calcSession = null;
    }
  }

  // [ĐÃ XÁC NHẬN 2026-09-17] Solve giải biến đang chọn; dấu = trong
  // biểu thức là phương trình, không phải phép gán của CALC.
  function runSolve() {
    const selectedVariable = calcSession.names[calcSession.selectedIndex];
    try {
      const nodes = calcSession.nodes;
      const unsupported = (list) => list.some(node =>
        ['sum', 'product'].includes(node.type) ||
        (node.type === 'char' && node.ch === ':') ||
        templateSlots(node).some(unsupported));
      if (unsupported(nodes)) throw new EngineError('Syntax ERROR');
      const containsIntegral=list=>list.some(node=>node.type==='integral' ||
        templateSlots(node).some(containsIntegral));
      const integralBalance=containsIntegral(nodes);
      const equalsIndex = nodes.findIndex(node => node.type === 'char' && node.ch === '=');
      const left = equalsIndex < 0 ? nodes : nodes.slice(0, equalsIndex);
      const right = equalsIndex < 0 ? charNodes('0') : nodes.slice(equalsIndex + 1);
      if (!left.length || !right.length || right.some(node => node.ch === '=')) {
        throw new EngineError('Syntax ERROR');
      }
      if (calcSession.phase === 'result' && calcSession.solution?.stalled) {
        throw new EngineError('Cannot Solve');
      }
      // CASIO 2026-10-08: x−1−10^-49 tại x=1 còn L−R=−10^-49.
      // Không xóa mọi dư lượng theo độ nhỏ của bước Newton. Chỉ triệt tiêu
      // hai số đối nhau cùng độ lớn ở 15 chữ số khi đọc lại L−R; giữ đường
      // đánh giá thường cho gradient, điểm Newton và các lần Continue.
      const sumForResidual = (a, b) => {
        if (a !== 0 && b !== 0 && Math.sign(a) !== Math.sign(b) &&
            roundToSignificantDigits(Math.abs(a), 15) === roundToSignificantDigits(Math.abs(b), 15)) return 0;
        // Trừ/cộng các literal thập phân bằng Fraction khi đọc L−R:
        // 0.99-1 phải là -0.01 trước phép chia, không mang nhiễu binary
        // thành dư lượng 8.5e-14 của 1/(x-1)+100. Giữ số nhỏ thực sự
        // như x-1-1e-49; không thêm epsilon để ép mọi dư lượng về zero.
        return fracToNumber(fracAdd(roundedNumberFraction(a), roundedNumberFraction(b)));
      };
      const evaluateSide = (side, vars, forResidual, forZeroProbe, forFiniteZero=false, forDecimalProduct=false) => {
        const reduced = reduceCalcNodes(side, ans, vars, angleUnit, null, {}, numberFormat, plusModel);
        // Solve yêu cầu ngoặc đóng đầy đủ, khác cơ chế tự đóng của CALC.
        const expression = serializeForEval(reduced);
        // Ca log10 có nghiệm thật7.5: phép dò zero phải chốt tích hệ số
        // ở cùng15 chữ số với log, như đường dò hữu hạn bên dưới.
        const decimalLogProduct = /log(?:base)?\(/.test(expression);
        return evaluateExpression(expression, ans, vars, angleUnit, 1e-99, numberFormat,
          null, null, forFiniteZero ? {solveFiniteZeroProbe:true,solveDecimalLogProduct:decimalLogProduct} : forResidual ? residualContext
            : forZeroProbe ? { solveZeroProbe:true,solveFiniteZeroProbe:finiteZeroProbeAllowed }
              : forDecimalProduct ? { solveDecimalLogProduct:true }
                : elementaryRootBalance ? { solveDecimalFunction:true } : null);
      };
      // Cổng Int/Intg/Rnd là hàm gián đoạn: giữ đường lũy thừa đã đo,
      // không áp mô hình bình phương mượt vào gradient qua biên nguyên.
      const probeExpression=serializeForDisplay(nodes);
      // Giá trị tích phân đã có đường cân bằng riêng (BUG-025). Các căn
      // sơ cấp dùng precision hàm và hiệu thập phân thống nhất; nếu chỉ
      // chốt căn rồi trừ bằng binary, ca +201 còn sai 1.0001×10^-10.
      const elementaryRootBalance=/√/.test(probeExpression) && !integralBalance;
      // Dùng cùng độ chính xác của căn ở Newton và khi đọc lại L−R.
      const residualContext = { sumForResidual, solveDecimalFunction: elementaryRootBalance };
      const finiteZeroProbeAllowed=/[²^]/.test(probeExpression) && !/(?:Intg?|Rnd)\(/.test(probeExpression);
      let certified=null,impossible=false;
      const proofVariables={...evalVariables(),...Object.fromEntries(
        Object.entries(variablesExact).filter(([,value])=>value!==null))};
      try {
        impossible=solveCertifiedNoRealRoot(serializeForEval(left),serializeForEval(right),
          selectedVariable,proofVariables,ansExact || ans);
        certified=solveCertifiedRepeatedRoot(serializeForEval(left),serializeForEval(right),
          selectedVariable,proofVariables,ansExact || ans) ||
          solveCertifiedRationalLinear(serializeForEval(left),serializeForEval(right),
            selectedVariable,proofVariables,ansExact || ans);
      } catch(e) { /* Tích phân/đạo hàm cần reduceCalcNodes theo từng điểm. */ }
      const legacyBalance = (value, forResidual = false, forZeroProbe = false, forFiniteZero=false, decimalBalance=false) => {
        if(forFiniteZero && !finiteZeroProbeAllowed) return NaN;
        const vars = { ...evalVariables(), [selectedVariable]: value };
        const lhs = evaluateSide(left, vars, forResidual, forZeroProbe,forFiniteZero,decimalBalance);
        const rhs = evaluateSide(right, vars, forResidual, forZeroProbe,forFiniteZero,decimalBalance);
        // BUG-025: cân bằng hai giá trị tích phân gần nhau ở precision
        // đọc L−R; không dùng epsilon để xóa một dư lượng nhỏ riêng lẻ.
        return forResidual || integralBalance ? sumForResidual(lhs, -rhs)
          : (elementaryRootBalance || decimalBalance) ? fracToNumber(fracSub(roundedNumberFraction(lhs),roundedNumberFraction(rhs)))
          : lhs - rhs;
      };
      // Tiêu chí toán học được duyệt06/11: chứng nhận vô nghiệm thắng zero
      // do làm tròn. Chỉ chặn lớp đã chứng minh đại số (đa thức/log/căn),
      // không suy vô nghiệm từ số vòng lặp hoặc từ một dư lượng nhỏ.
      const balance = solveOptions.arithmetic === 'legacy' ? legacyBalance
        : createSolveDecimalBalance(serializeForEval(left),serializeForEval(right),
            selectedVariable,evalVariables(),ans);
      traceSolve(solveOptions,{phase:'dispatch',certified:Boolean(certified),impossible});
      const initialValue = plusModel && calcSession.phase === 'form' ? calcSession.initial : variables[selectedVariable];
      // Toán học06/11: dùng nghiệm đã chứng minh của đa thức a(x−r)^n
      // hoặc phương trình hữu tỉ bậcnhất đã kiểm lại miền ở cây gốc.
      // Không thay nghiệm duy nhất bằng một điểm zero do làm tròn ở gần nó.
      // Chứng nhận chỉ áp dụng đa thức, không bỏ mất miền của mẫu/log/căn.
      if (impossible) {
        traceSolve(solveOptions,{phase:'safety-rejection',reason:'certified-no-real-root'});
        throw new EngineError('Cannot Solve');
      }
      const recoverCubic=trial=>{
        if(!useCubicRecovery)return null;
        let recovered;
        try {
          recovered=solveBracketedUniqueCubic(serializeForEval(left),serializeForEval(right),
            selectedVariable,proofVariables,ansExact || ans,trial,value=>legacyBalance(value,true));
        } catch(error) { return null; } // ví dụ mẫu tích phân chưa reduce
        if(recovered)traceSolve(solveOptions,{phase:'unique-cubic-recovery',value:recovered.value});
        return recovered;
      };
      const cubic = plusModel && useCubicRecovery &&
        (!certified || (certified.multiplicity === 3 && certified.value === 0))
        ? solveCubicRecoveryPolynomial(serializeForEval(left), serializeForEval(right), selectedVariable, proofVariables, ansExact || ans)
        : null;
      let solved=certified;
      // ClassPad PLUS cho Tiếp tục với ax³ nếu sau một lượt Newton
      // |x| còn trên 10^-12. Các seed 0.000011 và 0.0000111 nằm hai
      // phía của ngưỡng tại bước 40; Tiếp tục áp cùng kiểm tra.
      if (certified && cubic?.slice(0, 3).every(fracIsZero)) {
        const start = variablesExact[selectedVariable] || roundedNumberFraction(initialValue);
        const pass = solveCubicDecimalPass(cubic, start, solveOptions.maxIterations);
        if (pass) {
          const value = fracToNumber(pass.memoryExact);
          try {
            const residual = legacyBalance(value);
            if (Number.isFinite(value) && Math.abs(value) > 1e-12 &&
                Math.abs(residual - pass.residual) <= Math.abs(pass.residual) * 1e-9) {
              solved = {...pass, value, converged:false};
              plusSolveRegisterValues.add(pass.memoryExact);
            }
          } catch (error) {
            if (!(error instanceof EngineError) || error.message !== 'Math ERROR') throw error;
          }
        }
      }
      if(!solved) {
        try {
          solved=solveNewton(balance, initialValue, solveOptions.maxIterations,
            calcSession.phase === 'result' && Boolean(calcSession.solution?.recovery), false, solveOptions, solveCubicRecoverySlope(cubic));
        } catch(error) {
          if(!(error instanceof EngineError)||error.message!=='Cannot Solve')throw error;
          solved=recoverCubic(initialValue);
          if(!solved) {
            try {
              solved=solveBracketedAffineRadicals(serializeForEval(left),serializeForEval(right),
                selectedVariable,proofVariables,ansExact || ans);
            } catch(unsupported) { /* Giữ lỗi Newton gốc khi không chứng minh được miền. */ }
            if(!solved)throw error;
            traceSolve(solveOptions,{phase:'bounded-radical-recovery',value:solved.value});
          }
        }
        if(!solved.converged)solved=recoverCubic(solved.value)||solved;
        if (calcSession.phase === 'form') {
          const register = solvePlusCubicRegister(solved, cubic, initialValue,
            variablesExact[selectedVariable], solveOptions.maxIterations);
          if (register) {
            solved = register;
            plusSolveRegisterValues.add(solved.memoryExact);
          }
        }
      }
      setRegisterValue(selectedVariable, { value: solved.value, memoryExact: solved.memoryExact || null, exact: null, exactSurd: null, exactPi: null });
      showResult({ value: solved.value, memoryExact: solved.memoryExact || null, exact: null, exactSurd: null, exactPi: null,
        closedExpr: serializeForDisplay(nodes), nodes: cloneNodes(nodes) }, false);
      calcSession.phase = 'result';
      calcSession.continue = !solved.converged;
      if (plusModel) calcSession.continueExitSelected = false;
      calcSession.solution = { variable: selectedVariable, value: solved.value,
        residual: solved.residual, stalled: Boolean(solved.stalled), recovery: Boolean(solved.recovery) };
    } catch (e) {
      calcSession.errorSource = 'expression';
      mode = 'error';
      errorMessage = e instanceof EngineError ? e.message : 'Math ERROR';
    }
  }

  // CALC/Solve: = và SHIFT+= cùng chốt draft/đi bước kế tiếp.
  function advanceCalcSession() {
    if (mode === 'error') return;
    if (plusModel && calcSession.operation === 'solve') {
      if (calcSession.phase === 'choose') openPlusSolveForm();
      else if (calcSession.phase === 'result') {
        if (calcSession.continue && !calcSession.continueExitSelected) runSolve();
        else goBackPlusSolve(true);
      } else if (hasDraft()) commitCalcDraft();
      else if (calcSession.runSelected) runSolve();
      else calcSession.editingInitial = true;
      return displayString();
    }
    if (plusModel && calcSession.operation === 'calc' && calcSession.phase === 'form') {
      if (hasDraft()) commitCalcDraft();
      else if (calcSession.runSelected) runCalcStatement();
      else if (!calcSession.editingField) calcSession.editingField = true;
      return displayString();
    }
    if (calcSession.phase === 'result') {
      if (calcSession.operation === 'solve') {
        if (calcSession.continue) runSolve(); else openCalcForm();
      }
      else if (calcSession.statementIndex < calcSession.statements.length - 1) {
        calcSession.statementIndex++;
        runCalcStatement();
      } else if (calcSession.names.length) openCalcForm();
      else runCalcStatement();
    } else if (hasDraft()) commitCalcDraft();
    else if (calcSession.operation === 'solve') runSolve();
    // CASIO 2026-11-02: không có draft thì = tính ngay bằng tất cả giá trị
    // đã lưu. Chỉ chốt một draft mới chuyển sang ô biến kế (commitCalcDraft).
    else runCalcStatement();
    return displayString();
  }

  function calcNegativeRadicalArgument(nodes) {
    for (const node of nodes) {
      for (const slot of templateSlots(node)) {
        const nested = calcNegativeRadicalArgument(slot);
        if (nested) return nested;
      }
      if (node.type !== 'sqrt') continue;
      try {
        const expression = autoCloseParens(serializeForEval(node.arg));
        // Locating an error must not resample random/registered functions.
        if (/Ran#|RanInt#|[fg]\(/.test(expression)) continue;
        if (evaluateExpression(expression,ans,evalVariables(),angleUnit,1e-99,numberFormat) < 0) return node.arg;
      } catch (_) { /* The failing inner operation keeps its original location. */ }
    }
    return null;
  }

  function firstEmptyTemplateSlot880(nodes) {
    for (const node of nodes) for (const slot of templateSlots(node)) {
      if (!slot.length) return slot;
      const nested=firstEmptyTemplateSlot880(slot);
      if (nested) return nested;
    }
    return null;
  }

  function firstUnmatchedClose880(nodes) {
    let depth = 0;
    for (const [index,node] of nodes.entries()) {
      if (node.type === 'char' && node.ch === '(') depth++;
      else if (node.type === 'char' && node.ch === ')') {
        if (depth === 0) return {list:nodes,index};
        depth--;
      }
      for (const slot of templateSlots(node)) {
        const nested = firstUnmatchedClose880(slot);
        if (nested) return nested;
      }
    }
    return null;
  }

  function runCalcStatement() {
    calcSession.errorTarget = null;
    if (plusModel && calcSession.operation === 'calc') {
      for (const [name, value] of Object.entries(calcSession.pendingValues || {})) setRegisterValue(name, value);
    }
    const statement = calcSession.statements[calcSession.statementIndex];
    resetDocument();
    root.push(...cloneNodes(statement.valueNodes));
    cursorList = root;
    cursorIndex = root.length;
    mode = 'input';
    const value = calcMode === 'complex' ? evaluateCurrentComplexValue() : evaluateCurrentValue();
    if (!value.ok) {
      calcSession.errorSource = 'expression';
      if (plusModel && calcMode === 'calculate' && value.negativeRadical && errorMessage === 'Math ERROR') {
        const target = calcNegativeRadicalArgument(root);
        if (target) calcSession.errorTarget = correspondingCalculusList880(statement.valueNodes,root,target);
      }
      return;
    }
    if (statement.assignment) {
      const stored = calcMode === 'complex'
        ? { value: value.value.re, exact: null, exactSurd: null, exactPi: null } : value;
      setRegisterValue(statement.assignment, stored);
    }
    value.nodes = cloneNodes(statement.nodes);
    value.closedExpr = serializeForDisplay(statement.nodes);
    if (calcMode === 'complex') showComplexResult(value); else showResult(value);
    calcSession.phase = 'result';
    viewEntry().calc = true;
  }

  // Chuyển sang trạng thái hiển thị kết quả — dùng chung cho "=", STO và M±.
  function showResult(evalResult, recordHistory = true) {
    if (calcMode === 'calculate' || (plusModel && calcMode === 'verify')) {
      preAns = ans === null ? 0 : ans;
      variablesExact.PreAns = ansExact;
      variablesExactSurd.PreAns = ansExactSurd;
      variablesExactPi.PreAns = ansExactPi;
    }
    ans = evalResult.value;
    if (plusModel) ansComplex = {re:evalResult.value,im:0};
    ansExact = evalResult.memoryExact || evalResult.exact;
    ansExactSurd = evalResult.exactSurd;
    ansExactPi = evalResult.exactPi;
    if (plusModel) {
      const real=ansExactSurd || (ansExact && surdFromFraction(ansExact));
      ansComplexAlgebraic=real ? {re:real,im:ZERO_SURD} : null;
    }
    resultDisplayMode = initialResultDisplayMode(evalResult.nodes);
    engExponent = null;
    engineeringEditing = false;
    frozenExpression = evalResult.closedExpr;
    frozenNodes = evalResult.nodes;
    // =, SHIFT+=, STO, M± và Verify thêm lịch sử; Solve chỉ cập nhật
    // kết quả đang hiện và Ans, kể cả khi bấm Continue nhiều lần.
    // Phép tính lỗi không đi qua đây nên không vào lịch sử.
    const entry = {
      nodes: evalResult.nodes,
      expression: evalResult.closedExpr,
      value: evalResult.value,
      coordinateResult: evalResult.coordinateResult || null,
      remainderResult: evalResult.remainderResult || null,
      exact: evalResult.exact,
      displayFraction: evalResult.displayFraction || null,
      exactSurd: evalResult.exactSurd,
      exactPi: evalResult.exactPi,
      dmsDisplay: hasDmsInput(evalResult.nodes),
      verifyResult: null,
      storedVariable: null,
      memoryOp: null
    };
    if (evalResult.arrayPreviousResults) entry.arrayPreviousResults = evalResult.arrayPreviousResults;
    if (recordHistory) pushHistory(entry);
    else {
      standaloneResult = entry;
      viewIndex = null;
    }
    resetDocument();
    mode = 'result';
  }

  function showComplexResult(evalResult) {
    ansComplex = { re: evalResult.value.re, im: evalResult.value.im };
    ansComplexAlgebraic=plusModel ? evalResult.complexAlgebraic || null : null;
    // Kho số thực song song luôn giữ phần thực; khi rời Complex chỉ cần xóa
    // `ansComplex`, đúng luật manual mà không phải chuyển đổi thêm.
    ans = evalResult.value.re;
    ansExact = null;
    ansExactSurd = null;
    ansExactPi = null;
    resultDisplayMode = initialResultDisplayMode(evalResult.nodes);
    engExponent = null;
    engineeringEditing = false;
    frozenExpression = evalResult.closedExpr;
    frozenNodes = evalResult.nodes;
    pushHistory({
      nodes: evalResult.nodes,
      expression: evalResult.closedExpr,
      value: evalResult.value.re,
      complex: ansComplex,
      ...(plusModel ? {complexAlgebraic:ansComplexAlgebraic} : {}),
      complexFormat: evalResult.complexFormat,
      complexExactComponents: evalResult.complexExactComponents,
      complexRoundedComponents: evalResult.complexRoundedComponents,
      complexAngleResult: evalResult.complexAngleResult,
      exact: null,
      exactSurd: null,
      exactPi: null,
      verifyResult: null,
      storedVariable: null,
      memoryOp: null
    });
    resetDocument();
    mode = 'result';
  }

  // ===== Mode Verify (Tầng 7) =====
  // Luật của Verify nằm ở verify.js; đây chỉ là chỗ nối: rút gọn cây, dịch
  // phẳng, rồi đưa xuống evaluateVerify kèm một hàm tính-một-vế có sẵn Ans,
  // biến A-F/M và đơn vị góc.
  function runVerify() {
    const complex = calcMode === 'complex';
    let flat;
    let snapshot;
    try {
      checkStructuredPowers880();
      const reduced = complex ? root : reduceCalcNodes(root, ans, evalVariables(), angleUnit, null, {}, numberFormat, plusModel);
      flat = serializeForEval(reduced);
      snapshot = cloneNodes(root);
    } catch (e) {
      mode = 'error';
      errorMessage = e instanceof EngineError ? e.message : 'Math ERROR';
      return;
    }

    // Thiếu hẳn toán tử quan hệ → máy TỰ THÊM "=0" rồi so sánh, và "=0" đó
    // HIỆN LUÔN trên dòng biểu thức. ĐÃ XÁC NHẬN 2026-08-20 bằng ba ca, hai
    // trong đó phân biệt được: `4 =` hiện "4=0" cho False, `8 =` hiện "8=0"
    // cho False, `0 =` hiện "0=0" cho True — nếu máy chỉ báo lỗi thì cả ba
    // đã như nhau. Sửa ở đây (không phải trong verify.js) vì chỗ này có sẵn
    // cả chuỗi phẳng lẫn ảnh chụp cây node, nên màn hình và phép so sánh
    // không thể lệch nhau.
    if (!VERIFY_OPERATORS.some((op) => flat.includes(op))) {
      if (plusModel) {
        mode = 'error';
        errorMessage = 'No Operator';
        cursorList=root;
        cursorIndex=root.length;
        return;
      }
      flat += '=0';
      snapshot = snapshot.concat(charNodes('=0'));
    }

    let outcome;
    try {
      if (complex) {
        const variablesForCheck = complexRegistersForEvaluation();
        outcome = evaluateVerify(flat, side => evaluateComplexExpression(autoCloseParens(side),
          complexAnswerForEvaluation(), angleUnit, variablesForCheck, numberFormat, plusModel, plusModel), (op, left, right) => {
          const comparePart = (op,key) => plusModel ? verifyComparePlus880(op,
            {value:left[key],surd:left.algebraic?.[key]},
            {value:right[key],surd:right.algebraic?.[key]}) : verifyCompare(op,left[key],right[key]);
          if (op === '=' || op === '≠') {
            const same = comparePart('=','re') && comparePart('=','im');
            return op === '=' ? same : !same;
          }
          if (left.im !== 0 || right.im !== 0) throw new EngineError('Math ERROR');
          return comparePart(op,'re');
        });
      } else outcome = evaluateVerify(flat, side => {
        const expression = autoCloseParens(side);
        if (plusModel && ansComplex?.im && /\bAns\b/.test(expression)) {
          const error=new EngineError('Math ERROR');
          error.nonRealAns=true;
          throw error;
        }
        if (plusModel && tokenize(expression).some(token => token.type === 'VARIABLE' &&
            variablesImaginary[token.name] !== 0)) throw new EngineError('Math ERROR');
        const value = evaluateExpression(expression,ans,evalVariables(),angleUnit,plusModel ? 1e-99 : 0,
          numberFormat,null,null,plusModel ? {plusModel:true,underflow:false} : null);
        if (!plusModel) return value;
        let exact = null, surd = null;
        try { exact = evaluateExpressionExact(expression,ansExact,variablesExact,angleUnit,'plus-number'); }
        catch (_) { /* Try the radical representation before numerical comparison. */ }
        if (!exact) try { surd = evaluateExpressionExactSurd(expression,ansExactSurd,variablesExactSurd,angleUnit,true); }
        catch (_) { /* General functions retain the existing numerical evaluation. */ }
        if (!exact && !surd) try {
          // Verify needs exact special angles without snapping nearby radian inputs.
          // A rational multiple of pi can be converted to an exact integer degree.
          for (const func of ['sin','cos','tan']) {
            const inner = extractBareFunctionArg(expression,func);
            if (inner === null) continue;
            const arg = evaluateExpressionExactPi(inner,ansExactPi,variablesExactPi,angleUnit,true);
            const degrees = piValConvertAngle(arg,angleUnit,'deg');
            if (degrees.degree !== 0 || degrees.rational.den !== 1n) break;
            const turn = ((degrees.rational.num % 360n) + 360n) % 360n;
            if (turn % 30n === 0n || turn % 45n === 0n)
              surd = lookupSpecialAngleDeg(func,Number(turn)) || null;
            break;
          }
        } catch (_) { /* Non-special and mixed pi angles keep their numerical value. */ }
        let radicalPower=null;
        try {radicalPower=positiveRadicalPower880(expression,ansExact,variablesExact,angleUnit);}
        catch (_) { /* Mixed/general functions retain the numeric comparison. */ }
        return {value,exact,surd,radicalPower};
      },plusModel ? verifyComparePlus880 : verifyCompare);
    } catch (e) {
      mode = 'error';
      errorMessage = e instanceof EngineError ? e.message : 'Math ERROR';
      if (plusModel && Number.isInteger(e.sideIndex)) {
        const positions = root.flatMap((node, index) => VERIFY_OPERATORS.includes(node.ch) ? [index] : []);
        cursorList = root;
        const end = positions[e.sideIndex] ?? root.length;
        cursorIndex = usesLineInput() && errorMessage === 'Math ERROR' && root[end - 1]?.ch === ')' ? end - 1 : end;
        if (e.nonRealAns) {
          const start=e.sideIndex ? positions[e.sideIndex-1]+1 : 0;
          const at=root.findIndex((node,index) => index >= start && index < end && node.ch === 'A' &&
            root[index+1]?.ch === 'n' && root[index+2]?.ch === 's');
          if (at >= 0) cursorIndex=at;
        }
        if (!usesLineInput() && errorMessage === 'Syntax ERROR') {
          const firstEmpty = nodes => {
            for (const node of nodes) for (const slot of templateSlots(node)) {
              if (!slot.length) return slot;
              const nested = firstEmpty(slot);
              if (nested) return nested;
            }
            return null;
          };
          const start = e.sideIndex ? positions[e.sideIndex-1] + 1 : 0;
          const missing = firstEmpty(root.slice(start,end));
          if (missing) { cursorList = missing; cursorIndex = 0; }
        }
      }
      if (plusModel && Number.isInteger(e.comparisonIndex)) {
        const positions = root.flatMap((node, index) => VERIFY_OPERATORS.includes(node.ch) ? [index] : []);
        cursorList = root;
        cursorIndex = (positions[e.comparisonIndex] ?? root.length - 1) + 1;
      }
      if (plusModel && Number.isInteger(e.operatorIndex)) {
        const positions = root.flatMap((node, index) => VERIFY_OPERATORS.includes(node.ch) ? [index] : []);
        if (positions[e.operatorIndex] !== undefined) {
          cursorList = root;
          cursorIndex = positions[e.operatorIndex];
        }
      }
      if (plusModel && e.implicitNumeric) {
        const position=implicitNumericPosition880(root);
        if (position) ({list:cursorList,index:cursorIndex}=position);
      }
      return;
    }

    // "Kết quả kiểm tra sẽ gán 1 cho bộ nhớ Ans khi True và 0 khi False"
    // (manual trang 176). Đi qua showResult để Ans/dạng chính xác/ảnh chụp
    // biểu thức được đặt y hệt mọi kết quả khác, không rẽ đường riêng.
    const numeric = outcome ? 1 : 0;
    if (complex) ansComplex = {re:numeric, im:0};
    const exact = { num: BigInt(numeric), den: 1n };
    showResult({
      value: numeric,
      exact,
      exactSurd: surdFromFraction(exact),
      exactPi: null,
      closedExpr: flat,
      nodes: snapshot
    });
    viewEntry().verifyResult = outcome;
  }

  // ===== Mode Base-N (Tầng 7) =====
  // Luật nằm ở base-n.js; đây chỉ là chỗ nối: dịch cây node thành chuỗi phẳng
  // rồi đưa xuống evaluateBaseN với cơ số hiện hành. Kết quả (BigInt 32-bit)
  // lưu ở entry.baseN để getState định dạng lại theo cơ số ĐANG chọn — nhờ
  // vậy bấm phím đổi cơ số chỉ cần đổi baseNRadix rồi vẽ lại.
  function runBaseN() {
    let flat;
    let snapshot;
    try {
      const reduced = reduceCalcNodes(root, ans, evalVariables(), angleUnit, null, {}, numberFormat, plusModel);
      // Đóng nốt ngoặc còn hở (hàm Neg(/Not( thường để hở khi bấm "=") — máy tự
      // đóng, ĐÃ XÁC NHẬN 2026-08-31: "Not(10" rồi "=" chạy ra -11.
      flat = autoCloseParens(serializeForEval(reduced));
      snapshot = cloneNodes(root);
    } catch (e) {
      mode = 'error';
      errorMessage = e instanceof EngineError ? e.message : 'Math ERROR';
      return;
    }
    let valueBig;
    try {
      let options = {};
      if (plusModel) {
        const integer = Math.trunc(ans ?? 0);
        if (/\bAns\b/.test(flat) && (ansComplex?.im || !Number.isFinite(integer) ||
            integer < Number(BASE_N_MIN) || integer > Number(BASE_N_MAX))) {
          const at = root.findIndex((node,index) => node.ch === 'A' && root[index+1]?.ch === 'n' && root[index+2]?.ch === 's');
          if (at >= 0) { cursorList = root; cursorIndex = at; }
          throw new EngineError('Math ERROR');
        }
        options = {plusModel:true,ans:Number.isFinite(integer) ? BigInt(integer) : 0n};
      }
      valueBig = evaluateBaseN(flat, baseNRadix, options);
      if (plusModel) snapshot = clarifyImplicitDivisors880(snapshot, true);
    } catch (e) {
      if (plusModel && Number.isInteger(e.baseNOffset)) {
        cursorList = root;
        cursorIndex = Math.min(root.length, e.baseNOffset);
      }
      mode = 'error';
      errorMessage = e instanceof EngineError ? e.message : 'Math ERROR';
      return;
    }
    const exact = { num: valueBig, den: 1n };
    showResult({
      value: Number(valueBig),
      exact,
      exactSurd: surdFromFraction(exact),
      exactPi: null,
      closedExpr: flat,
      nodes: snapshot
    });
    viewEntry().baseN = valueBig;
  }

  // ===== Mode Ratio (Tầng 7) =====
  // Handler giữ trạng thái màn hình riêng của Ratio. Luật tỷ lệ nằm ở
  // ratio.js, lưới ô nằm ở coefficient-editor.js — chỗ này chỉ lắp lại và
  // nối với Ans.
  // Đính kèm dạng phân số / thập phân tuần hoàn của Ans vào một state, theo
  // đúng bước hiện tại của chu trình S⇔D. Chỉ đính khi thật sự có gì để vẽ
  // (mẫu số ≠ 1) — UI vẽ thay cho state.result chứ không vẽ cùng lúc cả hai
  // (state.result vẫn luôn có, không đổi, để luồng cũ đọc field này không bị
  // ảnh hưởng). Tách ra dùng chung vì mode Ratio cũng cần y hệt: ĐÃ XÁC NHẬN
  // 2026-08-17 rằng 3:8=X:12 cho X=9/2 dạng phân số xếp tầng, S⇔D đổi ra 4.5.
  // Bỏ trống "fraction" thì lấy dạng chính xác của Ans; mode Tầng 7 truyền
  // vào dạng chính xác RIÊNG của nó, vì nghiệm của chúng không ghi vào Ans.
  function attachExactFraction(target, fraction) {
    const exact = fraction === undefined ? ansExact : fraction;
    if (exact === null || exact.den === 1n) return;
    if (resultDisplayMode === 'exact') {
      target.exactFraction = fractionResultForDisplay(exact);
    } else if (resultDisplayMode === 'recurring' && recurringDecimalEnabled) {
      const recurring = fracRecurringDecimalString(exact);
      if (recurring !== null) {
        target.recurringDecimal = formatResultText(recurring);
      }
    }
  }

  function createRatioHandler() {
    let type = RATIO_TYPES[0];
    // Lưới Ratio là MỘT HÀNG × N cột (`▓0▓:__0 = X:__0` nằm trọn một dòng),
    // không phải một cột. Truyền số cột = số ô nên ▲▼ nhảy nguyên hàng, tức
    // luôn ra ngoài lưới, tức không chạy đi đâu — ĐÃ XÁC NHẬN 2026-08-18 trên
    // bản giả lập: ở Ratio chỉ ◀▶ đổi ô, ▲▼ bấm mấy lần cũng đứng yên.
    let editor = createCoefficientEditor(type.cells, 0, type.cells.length);
    // Giá trị X đang hiện; null nghĩa là đang ở màn hình nhập hệ số.
    let solution = null;
    // Dạng phân số chính xác của nghiệm, giữ riêng vì Ratio không ghi Ans.
    let solutionExact = null;
    let ratioPresentation = null;

    // Đổi kiểu tỷ lệ làm "mọi hệ số bị đổi thành không" (manual trang 178).
    function setType(typeId) {
      type = ratioTypeById(typeId);
      editor = createCoefficientEditor(type.cells, 0, type.cells.length);
      solution = null;
    }

    // Trả về true nếu handler đã xử lý phím; false thì engine bỏ qua phím đó
    // (ở mode Ratio phần lớn phím hàm số không có tác dụng).
    function editing() {
      return solution === null;
    }

    function formatResult(format) {
      if (editing()) return;
      ratioPresentation = ['engineering','dms'].includes(format) ? format : null;
      engExponent = format === 'engineering' ? canonicalEngineerExponent(solution) : null;
      fractionDisplayOverride = ['improper','mixed'].includes(format) ? format : null;
      resultDisplayMode = format === 'decimal' ? 'decimal' : 'exact';
    }

    return {
      setType,

      // Engine đã tính xong biểu thức trong ô và gọi vào đây để đăng ký.
      commitValue(value, fraction) {
        if (editing()) editor.commit(value, plusModel ? fraction : null);
      },

      // AC đặt lại tất cả hệ số thành KHÔNG, giống hệt mode Equation.
      // ĐÃ XÁC NHẬN 2026-08-17 trên bản giả lập chính hãng: đang có 3:8=X:12,
      // bấm AC ra 0:0 = X:0. Câu "đặt lại tất cả các hệ số thành một" ở manual
      // trang 178 KHÔNG có nghĩa "thành giá trị 1" — đọc theo máy, không theo
      // câu chữ đã dịch. Đang hiện nghiệm thì AC quay về màn hình nhập trước
      // (hệ số vẫn còn nguyên), bấm AC lần nữa mới xoá về 0.
      clear() {
        if (!editing()) {
          solution = null;
          editor.selectFirst();
          return;
        }
        editor.resetAll(0);
      },

      moveCursor(direction) {
        // ĐÃ XÁC NHẬN 2026-08-20: lúc đang hiện nghiệm (X= 9/2), CẢ BỐN mũi
        // tên đều KHÔNG làm gì. Chỉ phím "=" mới quay về bảng hệ số, và lúc
        // đó hệ số giữ nguyên với ô ĐẦU được chọn — xem equals() bên dưới.
        // Bản trước quay về bảng hệ số với mọi mũi tên.
        if (!editing()) {
          if (ratioPresentation === 'engineering' && (direction === 'left' || direction === 'right')) {
            engExponent += direction === 'left' ? 3 : -3;
          }
          return;
        }
        editor.moveCell(direction);
      },

      // "=" có hai nghĩa, xem chú thích ở coefficient-editor.js commit().
      // Đang hiện nghiệm thì "=" quay lại bộ soạn thảo (manual trang 178).
      equals() {
        if (!editing()) {
          solution = null;
          editor.selectFirst();
          return;
        }
        try {
          solution = solveRatio(type.id, plusModel ? editor.getExactValues() : editor.getValues(), plusModel);
        } catch (e) {
          mode = 'error';
          errorMessage = e instanceof EngineError ? e.message : 'Math ERROR';
          return;
        }
        // Nghiệm Ratio KHÔNG ghi vào Ans. ĐÃ XÁC NHẬN 2026-08-17 bằng một ca
        // thử phân biệt được: tính 2+3= ở Calculate (Ans=5), sang Ratio giải
        // 3:8=X:12 ra 9/2, quay lại Calculate bấm Ans= thì VẪN ra 5. Ca này
        // vừa chứng minh Ans sống sót qua việc đổi mode, vừa chứng minh Ratio
        // không ghi đè lên nó — thiếu vế đầu thì con số 0 ở lần thử trước có
        // thể chỉ là do đổi mode làm mất Ans. Bản trước ghi "ans = solution".
        // Dạng phân số chính xác của nghiệm vì thế phải giữ RIÊNG ở đây thay
        // vì mượn slot của Ans.
        solutionExact = null;
        ratioPresentation = null;
        // Nghiệm mới thì chu trình S⇔D bắt đầu lại từ bước đầu.
        resultDisplayMode = initialResultDisplayMode();
        engExponent = null;
    engineeringEditing = false;
        // Dạng chính xác phải tính TỪ HỆ SỐ, không phải từ số thực đã làm
        // tròn: 1:3=X:1 cho X = 1/3, mà đường cũ (dựng phân số từ chuỗi
        // "0.3333333333") lại ra 3333333333/10000000000 — máy hiện 1/3.
        try {
          solutionExact = solveRatioExact(type.id, plusModel ? editor.getExactValues() : editor.getValues().map(
            (value) => fractionFromDecimalString(trimTrailingZeros(value.toFixed(10)))
          ));
        } catch (e) {
          solutionExact = null;
        }
      },

      // Cho phép S⇔D biết mode này đang hiện nghiệm (mode chung của engine
      // vẫn là 'input' vì handler đã chiếm quyền màn hình).
      showingResult() {
        return solution !== null;
      },

      // Có dạng chính xác đáng đổi hay không (S⇔D hỏi chỗ này). Nghiệm nguyên
      // thì không có gì để đổi.
      hasExactForm() {
        return solutionExact !== null && solutionExact.den !== 1n;
      },

      formatResult,
      toggleRatioFormat() {
        if (ratioPresentation) formatResult('decimal');
        else if (solutionExact?.den > 1n) formatResult(resultDisplayMode === 'exact' ? 'decimal' : 'exact');
      },

      getState() {
        const state = editor.getState(numberFormat);
        state.mode = 'ratio';
        if (plusModel) {
          const values = editor.getValues();
          decoratePlusCoefficientCells(state,values);
        }
        state.typeLabel = type.label;
        // Ratio không có dòng tiêu đề riêng trên máy thật — chính cái tỷ lệ
        // đã là màn hình rồi.
        state.header = null;
        state.template = type.template || null;
        state.unknownLabel = 'X';
        state.result = solution === null ? null : displayNumber(solution);
        // ĐÃ XÁC NHẬN 2026-08-17: nghiệm Ratio hiện dạng PHÂN SỐ CHÍNH XÁC
        // (3:8=X:12 → 9/2 xếp tầng), S⇔D mới đổi sang 4.5. Dùng lại đúng bộ
        // Fraction BigInt của mode Calculate nên không có đường tính riêng.
        if (solution !== null) {
          if (ratioPresentation === 'engineering') {
            state.engineering = true;
            state.result = formatResultText(engineerText(solution, engExponent, engineerSymbol));
          } else if (ratioPresentation === 'dms') state.result = dmsResultText(solution);
          else attachExactFraction(state, plusModel && solutionExact && fracDigitCount(solutionExact) > 9 ? null : solutionExact);
        }
        return state;
      }
    };
  }

  // ===== Mode Equation/Func (Tầng 7) =====
  // Cùng khuôn createRatioHandler ở trên, khác ở chỗ kết quả là DANH SÁCH
  // nghiệm cuộn được (hoặc một thông báo khi hệ suy biến) thay vì một số.
  // Luật giải nằm ở equation.js.
  function createEquationHandler() {
    let type = EQUATION_TYPES[0];
    let editor = createCoefficientEditor(type.labels, 0, type.columns);
    let coefficientOffset = 0;
    // null = đang ở màn hình nhập hệ số.
    let solved = null;
    let rootIndex = 0;
    let presentation = null;
    let horizontalOffset = 0;

    // PLUS Equation Verify keeps the coefficient editor while the user
    // supplies a solution claim. It never writes the entered guesses to Ans.
    let verify = false;
    let verification = null;
    const answerValue = value => typeof value === 'object' && value !== null
      ? value : {re:value,im:0};
    const verificationSurd=s=>s && (s.radicand===1n
      ? {...s,rational:fracAdd(s.rational,s.coeff),coeff:ZERO_FRACTION} : surdNormalize(s));
    const sameAnswer = (a,b) => {
      a=answerValue(a); b=answerValue(b);
      return ['re','im'].every(part=>verifyComparePlus880('=',
        {value:a[part],surd:verificationSurd(a.algebraic?.[part])},
        {value:b[part],surd:verificationSurd(b.algebraic?.[part])}));
    };
    function expectedAnswers(kind='input') {
      if (solved?.kind !== 'roots') return [];
      const roots=solved.roots.filter(root=>kind==='input' ? root.header===solved.roots[0].header
        : root.header?.startsWith(kind==='minimum'?'Min of':'Max of'));
      const scalar=root=>{
        const surd=root.form==='fraction' ? surdFromFraction(root.fraction) : root.form==='surd' ? root.surd : null;
        return {re:surd?surdToNumber(surd):root.value,im:0,...(surd?{algebraic:{re:surd,im:ZERO_SURD}}:{})};
      };
      return roots.map(root=>root.form==='complex'
        ? {re:surdToNumber(root.re),im:surdToNumber(root.im),algebraic:{re:root.re,im:root.im}}
        : root.form==='complexDecimal' ? {re:root.re,im:root.im} : scalar(root));
    }
    function checkEquationClaim(kind) {
      let correct;
      if (kind==='none' || kind==='infinite') correct=solved?.kind==='message' &&
        (kind==='infinite' ? solved.message==='Infinite Solution'
          : ['No Solution','No Real Roots'].includes(solved.message));
      else {
        const expected=expectedAnswers(kind);
        const values=verification.values;
        if(type.group==='poly' && kind==='input') {
          const unique=expected.filter((value,index)=>!expected.slice(0,index).some(v=>sameAnswer(v,value)));
          const unused=[...unique];
          correct=values.length===unique.length && values.every(value=>{
            const index=unused.findIndex(v=>value!==null && sameAnswer(v,value));
            if(index<0)return false;
            unused.splice(index,1);return true;
          });
        } else correct=values.length===expected.length && values.every((value,index)=>value!==null && sameAnswer(value,expected[index]));
      }
      verification={...verification,stage:'feedback',correct,cursor:0,kind};
    }
    function beginAnswerEntry(count,kind='input') {
      verification={stage:'answers',kind,cursor:0,
        names:type.group==='poly' && kind==='input' ? Array.from({length:count},(_,i)=>count===1?'x':'x'+['₁','₂','₃','₄'][i])
          : type.group==='poly' ? ['x','y']
          : SIMUL_UNKNOWN_NAMES.slice(0,type.columns-1),values:Array(count).fill(null)};
    }

    // "Thay đổi kiểu phương trình làm cho các giá trị của mọi hệ số bị đổi
    // thành không" (manual trang 165) — khác Ratio (AC về 1), giống nhau ở
    // chỗ đổi kiểu thì về 0.
    function setType(typeId) {
      type = equationTypeById(typeId);
      editor = createCoefficientEditor(type.labels, 0, type.columns);
      coefficientOffset = 0;
      solved = null;
      rootIndex = 0;
      verification = null;
      if(!['simul2','poly2'].includes(type.id)) verify=false;
    }

    function editing() {
      return verification ? verification.stage==='answers' && verification.cursor<verification.values.length : solved === null;
    }

    function backToEditor() {
      verification = null;
      solved = null;
      rootIndex = 0;
      editor.selectFirst();
      coefficientOffset = 0;
    }

    function updateCoefficientOffset() {
      const column = editor.selectedColumn();
      coefficientOffset = Math.max(column - 2, Math.min(column, coefficientOffset));
    }

    function resetResultFormat() {
      if (!plusModel) return;
      resultDisplayMode = initialResultDisplayMode();
      presentation = type.group === 'poly' && complexFormat === 'polar' ? 'polar' : null;
      horizontalOffset = 0;
    }

    function applyEquationComplexSetting(result) {
      if (equationComplexResults || type.group !== 'poly' || result.kind !== 'roots') {
        return result;
      }

      // solveEquation đặt mọi nghiệm đa thức ở đầu danh sách và cho chúng
      // cùng một header; các màn hình cực trị (nếu có) nằm ở đuôi với header
      // khác. Chỉ lọc phần nghiệm để vẫn giữ chuỗi cực trị của bậc 2/3.
      const solutionHeader = result.roots[0] && result.roots[0].header;
      let solutionCount = 0;
      while (solutionCount < result.roots.length &&
             result.roots[solutionCount].header === solutionHeader) {
        solutionCount++;
      }
      const realRoots = result.roots.slice(0, solutionCount).filter((root) =>
        root.form !== 'complex' && root.form !== 'complexDecimal');
      if (realRoots.length === 0) {
        return { kind: 'message', message: 'No Real Roots' };
      }

      const subscripts = ['₁', '₂', '₃', '₄'];
      const relabelled = realRoots.map((root, index) => ({
        ...root,
        label: realRoots.length === 1 ? 'x' : 'x' + subscripts[index]
      }));
      return {
        kind: 'roots',
        roots: relabelled.concat(result.roots.slice(solutionCount))
      };
    }

    return {
      setType,

      verifying() { return verify; },
      verifyComplexInput() { return verification?.stage==='answers' && type.group==='poly' && equationComplexResults; },
      verificationCommand(command) {
        if(command==='toggle') { verify=!verify; backToEditor(); }
        else if(command==='cancel') backToEditor();
        // PLUS Back from an answer form skips the root-count selector.
        else if(command==='back' && verification) verification={stage:'choice',cursor:0};
        else if(command==='input') {
          if(type.group==='poly') verification={stage:'count',cursor:0,degree:type.degree};
          else beginAnswerEntry(type.columns-1);
        } else if(command.startsWith('count:')) beginAnswerEntry(Number(command.slice(6)));
        else if(command==='minimum' || command==='maximum') beginAnswerEntry(2,command);
        else if(command==='none' || command==='infinite') checkEquationClaim(command);
      },

      // Engine đã tính xong biểu thức trong ô và gọi vào đây để đăng ký.
      commitValue(value, fraction, detail) {
        if(verification?.stage==='answers') {
          const index=verification.cursor;
          if(index<verification.values.length) {
            const algebraic=detail?.complexAlgebraic ||
              (fraction?{re:surdFromFraction(fraction),im:ZERO_SURD}
                : detail?.exactSurd?{re:detail.exactSurd,im:ZERO_SURD}:null);
            verification.values[index]={...answerValue(value),...(algebraic?{algebraic}:{})};
            verification.cursor++;
          }
          return;
        }
        if (editing()) {
          editor.commit(value,plusModel ? fraction : null);
          if (plusModel && type.braced && type.columns > 3) updateCoefficientOffset();
        }
      },

      // ĐÃ XÁC NHẬN 2026-08-17: từ màn hình nghiệm, AC chỉ quay về Bộ soạn
      // thảo và GIỮ NGUYÊN hệ số (thử với 3:8=X:12 ở Ratio, hệ số còn nguyên);
      // phải bấm AC lần nữa ở màn hình nhập thì mới xoá hết về 0. Trước đây
      // một lần AC làm cả hai việc nên mất hệ số oan.
      clear() {
        if(verification) { backToEditor(); return; }
        if (!editing()) {
          backToEditor();
          return;
        }
        editor.resetAll(0);
        coefficientOffset = 0;
      },

      // Cho engine biết mode này đang hiện nghiệm (mode chung vẫn là 'input'
      // vì handler đã chiếm quyền màn hình). Dùng để chặn phím biểu thức và
      // để S⇔D biết có kết quả để đổi dạng.
      showingResult() {
        return !editing();
      },

      formatResult(format) {
        if (!plusModel || solved?.kind !== 'roots') return;
        presentation = ['polar','rect','dms'].includes(format) ? format : null;
        resultDisplayMode = format === 'decimal' ? 'decimal' : 'exact';
        fractionDisplayOverride = ['improper','mixed'].includes(format) ? format : null;
        horizontalOffset = 0;
      },

      // CASIO 2026-10-20: STO dùng nghiệm ĐANG XEM, giữ màn Equation và
      // không ghi Ans. Trả cả dạng chính xác để gọi A ở Calculate còn √3.
      getMemoryValue() {
        if (!solved || solved.kind !== 'roots') return null;
        const selected = solved.roots[rootIndex];
        if (!selected) return null;
        const exact = selected.form === 'fraction' ? selected.fraction : null;
        const exactSurd = selected.form === 'surd' ? selected.surd : exact ? surdFromFraction(exact) : null;
        const value = exact ? fracToNumber(exact) : exactSurd ? surdToNumber(exactSurd)
          : selected.form === 'decimal' ? selected.value : null;
        return value === null ? null : { value, exact, exactSurd, exactPi: null };
      },

      // Nghiệm ĐANG XEM có dạng chính xác đáng đổi hay không. Nghiệm nguyên,
      // nghiệm đang giữ dạng thập phân và màn hình chữ thì S⇔D không làm gì.
      hasExactForm() {
        if (solved === null || solved.kind !== 'roots') return false;
        const root = solved.roots[rootIndex];
        if (!root) return false;
        if (root.form === 'fraction') return root.fraction.den !== 1n;
        if (root.form === 'surd') return root.surd.radicand !== 1n;
        return root.form === undefined || root.form === 'complex';
      },

      // "Mỗi lần nhấn [=] (hoặc [▼]) sẽ cho hiển thị một nghiệm khác"
      // (manual trang 165) — nên ▼/▲ cuộn nghiệm.
      // ĐÃ XÁC NHẬN 2026-08-20 (đã sửa theo): lúc đang hiện nghiệm thì ◀/▶
      // KHÔNG làm gì — bản trước quay về bộ soạn thảo với mọi mũi tên, hiểu
      // câu "trở về Bộ soạn thảo hệ số trong khi bất kỳ nghiệm nào được hiển
      // thị" của manual rộng hơn thực tế; câu đó nói về phím "=".
      // Cùng đợt bấm còn xác nhận: sau x₁ x₂ máy hiện tiếp hai màn hình đỉnh
      // parabol ("Min of y=ax²+bx+c" với x= rồi y=) — cái này ta ĐÃ CÓ, và
      // ĐÃ CÓ cả dạng phân số (x=3/2, y=−1/4 với x²−3x+2).
      moveCursor(direction) {
        if(verification) {
          const last=verification.stage==='answers' ? verification.values.length
            : verification.stage==='feedback' ? Number(verification.correct) : 0;
          verification.cursor=Math.max(0,Math.min(last,verification.cursor+(direction==='down'?1:direction==='up'?-1:0)));
          return;
        }
        if (editing()) {
          editor.moveCell(direction);
          if (plusModel && type.braced && type.columns > 3) updateCoefficientOffset();
          return;
        }
        if (solved.kind === 'roots') {
          // ĐÃ XÁC NHẬN 2026-08-20: ◀/▶ lúc đang hiện nghiệm KHÔNG làm gì
          // (bản trước quay về bộ soạn thảo). Chỉ ▲/▼ cuộn nghiệm.
          if (direction === 'left' || direction === 'right') {
            if (plusModel && !presentation) {
              const root = rootForDisplay(solved.roots[rootIndex], rootIndex, solved.roots.length);
              if (root.form === 'complexDecimal') {
                const realLength = root.reIsZero ? 0 : root.re.length;
                const signLength = Number(!root.reIsZero || root.imNegative);
                const imaginaryLength = root.imIsOne ? 1 : root.im.length + 1;
                const width = 11 * (realLength + signLength + imaginaryLength);
                const maxOffset = width > 192 ? width - 190 : 0;
                horizontalOffset = Math.max(0, Math.min(maxOffset, horizontalOffset + (direction === 'right' ? 8 : -8)));
              }
            }
            return;
          }
          // KHÔNG quay vòng — ĐÃ XÁC NHẬN 2026-08-20: ở màn hình cuối
          // ("Min of y=ax²+bx+c" với y=) chỉ báo chỉ còn ▲, và bấm ▼ thêm
          // không quay lại x₁. Bản trước dùng phép chia lấy dư nên quay vòng
          // cả hai chiều.
          const next = rootIndex + (direction === 'down' ? 1 : -1);
          if (next >= 0 && next < solved.roots.length) {
            rootIndex = next;
            resetResultFormat();
          }
          return;
        }
        // Màn hình nghiệm KHÔNG phải dạng danh sách (vd "Infinite Solution")
        // — chưa bấm thử ca này, giữ nguyên hành vi cũ.
        backToEditor();
      },

      // Trong bộ soạn thảo: "=" đăng ký ô rồi sang ô kế, tới khi hết thì giải.
      // Trong màn hình nghiệm: "=" sang nghiệm kế, "=" ở nghiệm cuối quay lại
      // bộ soạn thảo (manual trang 165).
      equals() {
        if(verification) {
          if(verification.stage==='answers') checkEquationClaim(verification.kind);
          else if(verification.stage==='feedback') {
            if(!verification.correct && verification.values) verification={...verification,stage:'answers',cursor:0};
            else if(verification.correct && verification.cursor===1) {
              const kind=verification.kind;
              if(['minimum','maximum'].includes(kind)) rootIndex=Math.max(0,solved.roots.findIndex(root=>root.header?.startsWith(kind==='minimum'?'Min of':'Max of')));
              verification=null;
            }
            else if(!verification.correct) verification={stage:'choice',cursor:verification.kind==='none'?1:2};
            else backToEditor();
          }
          return;
        }
        if (!editing()) {
          if (solved.kind !== 'roots' || rootIndex >= solved.roots.length - 1) {
            backToEditor();
          } else {
            rootIndex++;
          }
          return;
        }
        try {
          solved = applyEquationComplexSetting(solveEquation(type.id, plusModel ? editor.getExactValues() : editor.getValues(), {plusModel}));
          if (plusModel && solved.kind === 'roots') {
            solved.roots = solved.roots.filter(root => root.text !== 'No Local Max/Min');
          }
          rootIndex = 0;
          resetResultFormat();
          if(plusModel && verify) verification={stage:'choice',cursor:0};
        } catch (e) {
          solved = null;
          mode = 'error';
          errorMessage = e instanceof EngineError ? e.message : 'Math ERROR';
        }
      },

      // Cổng xuất dữ liệu (bridge.js): kiểu phương trình, hệ số đã đăng ký và,
      // khi đang xem màn hình nghiệm, các nghiệm và cực trị dưới dạng số.
      // Đa thức: coefficients = [a, b, c, ...] (bậc cao trước). Hệ n ẩn:
      // coefficients = n hàng, mỗi hàng n hệ số rồi vế phải.
      exportData() {
        const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : null);
        const toNum = r => {
          if (r.form === 'fraction') return { re: num(fracToNumber(r.fraction)), im: 0 };
          if (r.form === 'surd') return { re: num(surdToNumber(r.surd)), im: 0 };
          if (r.form === 'decimal') return { re: num(r.value), im: 0 };
          if (r.form === 'complex') return { re: num(surdToNumber(r.re)), im: num(surdToNumber(r.im)) };
          if (r.form === 'complexDecimal') return { re: num(r.re), im: num(r.im) };
          return null;
        };
        const values = editor.getValues().map(num);
        const poly = type.group === 'poly';
        const coefficients = poly ? values
          : Array.from({ length: type.unknowns }, (_, i) => values.slice(i * type.columns, (i + 1) * type.columns));
        const out = {
          type: type.id, group: type.group,
          degree: poly ? type.degree : null, unknowns: poly ? null : type.unknowns,
          coefficients, solved: solved !== null, message: null, solutions: [], extrema: []
        };
        if (solved === null) return out;
        if (solved.kind === 'message') { out.message = solved.message; return out; }
        const first = solved.roots[0] && solved.roots[0].header;
        solved.roots.forEach((r, i) => {
          const isSolution = !poly || r.header === first;
          if (isSolution) {
            const v = toNum(r);
            if (v) out.solutions.push({ label: r.label, re: v.re, im: v.im });
          } else if (r.label === 'x' && /Max|Min/.test(r.header || '') && solved.roots[i + 1] && solved.roots[i + 1].label === 'y') {
            const x = toNum(r), y = toNum(solved.roots[i + 1]);
            if (x && y) out.extrema.push({ kind: /Max/.test(r.header) ? 'max' : 'min', x: x.re, y: y.re });
          }
        });
        return out;
      },

      getState() {
        if(verification) return {mode:'equation-verify',typeId:type.id,complexResults:type.group==='poly' && equationComplexResults,
          ...verification,degree:type.degree,values:verification.values?.map(value=>value===null ? ''
            : typeof value==='object' ? formatComplexRect(value,numberFormat,false) : displayNumber(value))};
        const state = editor.getState(numberFormat);
        state.mode = 'equation';
        state.typeId = type.id;
        state.complexResults = type.group === 'poly' && equationComplexResults;
        if (plusModel) {
          const values = editor.getValues();
          decoratePlusCoefficientCells(state,values);
        }
        if (plusModel && type.braced && type.columns > 3) state.coefficientOffset = coefficientOffset;
        state.typeLabel = type.label;
        // Dòng tiêu đề và mẫu inline của màn hình nhập.
        // ĐÃ XÁC NHẬN 2026-08-20, KHỚP cả hai kiểu:
        //   • Hệ phương trình: KHÔNG có dòng tiêu đề, chỉ hai dòng trong dấu
        //     ngoặc nhọn "{ 1x − 2y= 3 / 0x + 0y= 0". Hệ số âm gộp dấu vào
        //     toán tử và hiện trị tuyệt đối — đúng như signOf + abs của mẫu.
        //   • Đa thức: CÓ dòng tiêu đề, và ở màn hình NHẬP nó là "ax²+bx+c"
        //     KHÔNG kèm "=0"; chỉ màn hình NGHIỆM mới có "=0".
        state.header = type.header || null;
        state.template = type.template || null;
        state.braced = type.braced === true;
        state.result = null;
        if (solved !== null) {
          state.result = solved.kind === 'message'
            ? { kind: 'message', message: solved.message }
            : rootForDisplay(solved.roots[rootIndex], rootIndex, solved.roots.length);
          if (plusModel && state.result.kind === 'root' && state.result.form !== 'message') {
            const root = solved.roots[rootIndex];
            if (root.form === 'fraction' && root.fraction.den === 1n && numberFormat.kind !== 'norm') {
              state.result.form = 'decimal';
              state.result.text = displayNumber(fracToNumber(root.fraction));
            }
            state.result.horizontalOffset = horizontalOffset;
            state.result.fractionFormat = root.form === 'fraction' && root.fraction.den !== 1n;
            state.result.complexFormat = type.group === 'poly';
            const complex = root.form === 'complex' || root.form === 'complexDecimal';
            state.result.sexagesimalFormat = !complex;
            if (presentation) {
              const value = root.form === 'fraction' ? fracToNumber(root.fraction)
                : root.form === 'surd' ? surdToNumber(root.surd) : root.value;
              if (presentation === 'dms' && !complex) {
                state.result.form = 'decimal';
                state.result.text = dmsResultText(value);
              } else if (presentation === 'polar' && complex) {
                const z = root.form === 'complex' ? {re:surdToNumber(root.re), im:surdToNumber(root.im)}
                  : {re:root.re, im:root.im};
                state.result.form = 'polar';
                state.result.text = formatResultText(formatComplexPolar(z, numberFormat, angleUnit));
              }
            }
          }
        }
        return state;
      }
    };
  }

  // ===== Mode Inequality (Tầng 7) =====
  // Luồng khác Equation/Func ở hai điểm: vào mode hỏi thẳng bậc 2~4 rồi mới
  // hỏi một trong bốn quan hệ; kết quả là cả một tập khoảng trên một màn
  // hình. Luật tìm nghiệm và ghép khoảng nằm ở inequality.js.
  function createInequalityHandler() {
    let screen = 'degree'; // 'degree' | 'relation' | 'editor' | 'result'
    let degree = null;
    let type = null;
    let editor = null;
    let solved = null;
    let horizontalOffset = 0;

    function chooseType(typeId) {
      type = inequalityTypeById(typeId);
      degree = type.degree;
      editor = createCoefficientEditor(type.labels, 0, type.columns);
      solved = null;
      horizontalOffset = 0;
      screen = 'editor';
      resultDisplayMode = initialResultDisplayMode();
      engExponent = null;
    engineeringEditing = false;
    }

    function backToEditor() {
      solved = null;
      horizontalOffset = 0;
      screen = 'editor';
      editor.selectFirst();
    }

    function rootHasExactForm(root) {
      if (!root) return false;
      if (root.form === 'fraction') return root.fraction.den !== 1n;
      if (root.form === 'surd') return root.surd.radicand !== 1n;
      return false;
    }

    function endpointForDisplay(endpoint) {
      if (endpoint === null) return null;
      return {
        value: endpoint.value,
        display: rootForDisplay(endpoint.root, 0, 1,
          plusModel && resultDisplayMode === 'decimal' ? DEFAULT_NUMBER_FORMAT : numberFormat)
      };
    }

    function resultForDisplay(solution) {
      if (solution.kind !== 'set') return { kind: solution.kind };
      return {
        kind: 'set',
        ...(plusModel ? {horizontalOffset, compact:resultDisplayMode === 'decimal', fractionFormat:solution.segments.some(({low, high}) =>
          [low, high].some(point => point?.root.form === 'fraction' && point.root.fraction.den !== 1n))} : {}),
        segments: solution.segments.map((segment) => ({
          low: endpointForDisplay(segment.low),
          high: endpointForDisplay(segment.high),
          includeLow: segment.includeLow,
          includeHigh: segment.includeHigh
        }))
      };
    }

    return {
      setType: chooseType,

      // Hai màn chọn đầu dùng phím số thật, không mở overlay HTML. Nhờ vậy
      // chuỗi MENU → ALPHA+A → 2 → 1..4 giống đúng máy.
      handleDigit(digit) {
        if (screen === 'degree') {
          if (digit === '2' || digit === '3' || digit === '4') {
            degree = Number(digit);
            screen = 'relation';
          }
          return true;
        }
        if (screen === 'relation') {
          const relation = INEQUALITY_RELATIONS.find((item) => item.key === digit);
          if (relation) chooseType('poly' + degree + '-' + relation.id);
          return true;
        }
        return false;
      },

      commitValue(value, fraction) {
        if (screen === 'editor') editor.commit(value, plusModel ? fraction : null);
      },

      clear() {
        if (screen === 'result') {
          backToEditor();
          return;
        }
        if (screen === 'editor') editor.resetAll(0);
      },

      moveCursor(direction, horizontalLimit) {
        if (screen === 'editor') editor.moveCell(direction);
        else if (plusModel && screen === 'result' && (direction === 'left' || direction === 'right')) {
          const current = Math.min(horizontalOffset, horizontalLimit);
          horizontalOffset = Math.max(0, Math.min(horizontalLimit, current + (direction === 'right' ? 8 : -8)));
        }
      },

      formatResult(format) {
        if (!plusModel || solved?.kind !== 'set') return;
        resultDisplayMode = format === 'decimal' ? 'decimal' : 'exact';
        fractionDisplayOverride = ['improper','mixed'].includes(format) ? format : null;
        horizontalOffset = 0;
      },

      showingResult() {
        return screen === 'result';
      },

      hasExactForm() {
        if (!solved || solved.kind !== 'set') return false;
        return solved.segments.some((segment) =>
          (segment.low && rootHasExactForm(segment.low.root)) ||
          (segment.high && rootHasExactForm(segment.high.root)));
      },

      equals() {
        if (screen === 'result') {
          backToEditor();
          return;
        }
        if (screen !== 'editor') return;
        try {
          solved = solveInequality(type.id, plusModel ? editor.getExactValues() : editor.getValues(), plusModel, plusModel);
          screen = 'result';
          resultDisplayMode = initialResultDisplayMode();
          engExponent = null;
    engineeringEditing = false;
        } catch (e) {
          solved = null;
          mode = 'error';
          errorMessage = e instanceof EngineError ? e.message : 'Math ERROR';
        }
      },

      command(name) {
        if (name !== 'polynomial') return;
        screen = 'degree';
        degree = null;
        type = null;
        editor = null;
        solved = null;
        resultDisplayMode = initialResultDisplayMode();
        engExponent = null;
    engineeringEditing = false;
      },

      // Cổng xuất dữ liệu (bridge.js): kiểu bất phương trình, hệ số đã đăng ký
      // và, khi đang xem màn hình nghiệm, tập nghiệm dạng các khoảng số.
      // Hai màn chọn bậc/quan hệ chưa có kiểu: type null.
      exportData() {
        const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : null);
        if (!type) return { type: null, degree, relation: null, symbol: null, coefficients: [], solved: false, result: null };
        const end = e => (e === null ? null : num(e.value));
        return {
          type: type.id, degree: type.degree, relation: type.relation.id, symbol: type.relation.symbol,
          coefficients: editor.getValues().map(num),
          solved: screen === 'result' && solved !== null,
          result: screen === 'result' && solved ? (solved.kind === 'set'
            ? { kind: 'set', segments: solved.segments.map(g => ({ low: end(g.low), high: end(g.high), includeLow: g.includeLow, includeHigh: g.includeHigh })) }
            : { kind: solved.kind }) : null
        };
      },

      getState() {
        if (screen === 'degree') {
          return {
            mode: 'inequality',
            screen,
            title: 'Polynomial Degree?',
            selectText: 'Select 2~4'
          };
        }
        if (screen === 'relation') {
          return {
            mode: 'inequality',
            screen,
            title: 'Select Type',
            options: INEQUALITY_RELATIONS.map((relation) =>
              polyHeader(degree) + relation.symbol + '0')
          };
        }
        const state = editor.getState(numberFormat);
        state.mode = 'inequality';
        if (plusModel && screen === 'editor') {
          const values = editor.getValues();
          decoratePlusCoefficientCells(state,values);
        }
        state.screen = screen;
        state.typeId = type.id;
        state.header = type.header;
        state.template = type.template;
        state.result = screen === 'result' ? resultForDisplay(solved) : null;
        return state;
      }
    };
  }

  // ===== Mode Statistics (Tầng 7) =====
  // ĐÃ XÁC NHẬN 2026-08-25. Mode này có BA màn hình, khác Ratio/Equation chỉ
  // có hai:
  //   'editor' — bảng dữ liệu. Gõ giá trị rồi "=" ghi vào dòng đang chọn và
  //              đẩy con trỏ xuống một dòng. AC chuyển sang màn hình tính.
  //   'calc'   — MÀN HÌNH BIỂU THỨC THƯỜNG. Đây là chỗ khác hẳn hai mode kia:
  //              nó không phải bảng ô mà là dòng nhập y như mode Calculate,
  //              chỉ thêm các biến thống kê gõ vào được. ĐÃ XÁC NHẬN: chọn
  //              `Med` từ OPTN rồi gõ "+1" và "=" thì ra 4 với dữ liệu 1..5.
  //   'stats'  — danh sách 13 giá trị của `1-Variable Calc`, cuộn bằng ▲▼.
  //
  // Đổi kiểu tính toán XOÁ SẠCH dữ liệu — đã bấm, và manual trang 120 còn nói
  // fx-580 mất dữ liệu khi rời mode. PLUS giữ handler và hỏi trước khi đổi
  // giữa bảng một biến và hai biến tại lớp điều khiển.
  function createStatisticsHandler() {
    let type = STATISTICS_TYPES[0];
    // Mỗi dòng là một bộ { x, y, f } đầy đủ (xem newStatRow). Cột nào HIỆN và
    // SỬA được do statColumns() quyết định theo kiểu và thiết lập Freq — nhờ
    // vậy một biến / hai biến / bật-tắt Freq dùng chung MỘT đường dữ liệu.
    let rows = [];
    // Dòng đang chọn. Bằng rows.length nghĩa là đang ở dòng trống kế tiếp.
    let cursor = 0;
    // Cột đang chọn (chỉ số trong statColumns): 0 = x, 1 = y hoặc Freq.
    let column = 0;
    // 'editor' | 'calc' | 'stats' | 'regression'. Hai màn hình cuối là kết
    // quả (danh sách thống kê / hồi quy).
    let screen = 'editor';
    // Màn hình đã đứng TRƯỚC khi mở màn hình kết quả, để AC quay về đúng chỗ
    // đó — ĐÃ XÁC NHẬN 2026-08-26/27: vào từ bảng dữ liệu thì AC về bảng, vào
    // từ màn hình tính thì AC về màn hình tính.
    let resultFrom = 'editor';
    // Dòng đầu của cửa sổ cuộn ở màn hình 'stats'.
    let statsTop = 0;
    let rowOffset = 0;

    function keepEditorCursorVisible() {
      if (plusModel) rowOffset = Math.max(0,Math.min(cursor,Math.max(rowOffset,cursor-3)));
    }

    function columns() {
      const cols = statColumns(type, statisticsFrequency);
      if (plusModel && type.twoVar && statisticsFrequency) cols.at(-1).label = 'n';
      return cols;
    }

    function maxRows() {
      return statisticsMaxRows(type, statisticsFrequency);
    }

    // Danh sách dòng của màn hình danh sách kết quả (khác nhau giữa một/hai biến).
    function resultRows() {
      return type.twoVar ? STAT_TWOVAR_ROWS : STAT_RESULT_ROWS;
    }

    function compute() {
      return type.twoVar ? computeTwoVariable(rows, type.id, plusModel, plusModel) : computeStatistics(rows, plusModel);
    }

    function resultText(value) {
      const text = displayNumber(value,plusModel ? DEFAULT_NUMBER_FORMAT : undefined);
      const scientific = plusModel && /^(.*?)×10([⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+)$/.exec(text);
      if (!scientific) return text;
      // The list has twelve small cells. The negative exponent sign shares
      // a cell with the lowered 10, leaving the same space for the mantissa.
      const width = 10 - scientific[2].replace('⁻','').length;
      if (scientific[1].length <= width) return text;
      const mantissa = scientific[1].slice(0,width).replace(/([.,]\d*?)0+$/,'$1').replace(/[.,]$/,'');
      return mantissa + '×10' + scientific[2];
    }

    function refreshStatistics() {
      try {
        statisticsValues = rows.length === 0 ? null : compute();
      } catch (e) {
        statisticsValues = null;
      }
    }

    function reset() {
      rows = [];
      cursor = 0;
      rowOffset = 0;
      column = 0;
      statsTop = 0;
      screen = 'editor';
      refreshStatistics();
    }

    function backToEditor() {
      screen = 'editor';
      if (plusModel) rowOffset = 0;
      cursor = plusModel ? 0 : Math.min(cursor, rows.length);
      column = plusModel ? 0 : Math.min(column, columns().length - 1);
    }

    return {
      setType(typeId) {
        const next = statisticsTypeById(typeId);
        const preserve = plusModel && !!next.twoVar === !!type.twoVar;
        type = next;
        if (preserve) {
          cursor = 0;
          rowOffset = 0;
          column = 0;
          statsTop = 0;
          screen = 'editor';
          refreshStatistics();
        } else reset();
      },

      hasData() {
        return rows.length > 0;
      },

      // Bật/tắt cột Freq (mục SETUP `Statistics`). Đổi thiết lập XOÁ SẠCH dữ
      // liệu — ĐÃ XÁC NHẬN 2026-08-26: bảng đang có ba dòng, tắt Frequency
      // xong thì bảng trắng trơn.
      setFrequency() {
        reset();
      },

      // Ghi giá trị vừa tính vào Ô đang chọn rồi xuống dòng kế, vẫn ở nguyên
      // cột đó — ĐÃ XÁC NHẬN 2026-08-26/27.
      commitValue(value) {
        if (screen !== 'editor' || !Number.isFinite(value)) return displayString();
        if (cursor >= maxRows()) return displayString();
        const key = columns()[column].key;
        // Tần suất ÂM → Math ERROR, ô không được ghi — ĐÃ XÁC NHẬN 2026-08-26.
        // Tần suất 0 thì máy NHẬN (dòng vẫn trong bảng nhưng biến mất khỏi mọi
        // phép tính). x, y nhận mọi số.
        if (key === 'f' && value < 0) {
          throw new EngineError('Math ERROR');
        }
        // Ô còn lại của dòng mới tự điền theo mặc định (x=0, y=0, Freq=1) —
        // ĐÃ XÁC NHẬN 2026-08-26 (Freq) / 2026-08-27 (y).
        const row = rows[cursor] || newStatRow();
        row[key] = value;
        rows[cursor] = row;
        // Dòng bỏ trống ở giữa không xảy ra: con trỏ chỉ đi tới được dòng
        // ngay sau dòng cuối, nên rows luôn liền mạch.
        if (cursor < maxRows() - 1) cursor++;
        keepEditorCursorVisible();
        refreshStatistics();
        return displayString();
      },

      // "=" khi KHÔNG gõ dở. Ở bảng dữ liệu máy không làm gì; ở màn hình kết
      // quả cũng vậy.
      equals() {
        return displayString();
      },

      // AC: bảng dữ liệu → màn hình tính; màn hình kết quả → quay về đúng màn
      // hình vừa mở nó ra.
      // Ở màn hình tính thì AC KHÔNG vào đây (xem handlerOwnsInput).
      clear() {
        if (screen === 'stats' || screen === 'regression') {
          if (resultFrom === 'editor') backToEditor(); else screen = 'calc';
        } else if (!plusModel) {
          screen = 'calc';
        }
        return displayString();
      },

      moveCursor(direction) {
        if (screen === 'editor') {
          const lastRow = Math.min(rows.length, maxRows() - 1);
          if (plusModel && (direction === 'up' || direction === 'down')) cursor = (cursor + (direction === 'up' ? -1 : 1) + lastRow + 1) % (lastRow + 1);
          else if (direction === 'up' && cursor > 0) cursor--;
          // Chỉ đi xuống tới dòng trống NGAY SAU dòng cuối, không xa hơn.
          else if (direction === 'down' && cursor < lastRow) cursor++;
          if (direction === 'page-up' || direction === 'page-down') {
            cursor = Math.max(0, Math.min(rows.length, maxRows() - 1, cursor + (direction === 'page-up' ? -4 : 4)));
          }
          // ◀▶ đổi CỘT, giữ nguyên dòng; đến mép thì đứng im, không quay
          // vòng — ĐÃ XÁC NHẬN 2026-08-26/27.
          const lastCol = columns().length - 1;
          if (direction === 'left' && column > 0) column--;
          if (direction === 'right' && column < lastCol) column++;
          keepEditorCursorVisible();
          return displayString();
        }
        if (screen === 'stats') {
          // Danh sách cuộn theo TRANG 6 dòng, không phải từng dòng — ĐÃ XÁC
          // NHẬN 2026-08-25. Không quay vòng ở hai đầu.
          const lastTop = Math.floor((resultRows().length - 1) / STAT_ROWS_PER_PAGE) * STAT_ROWS_PER_PAGE;
          if (direction === 'up') statsTop = Math.max(0, statsTop - STAT_ROWS_PER_PAGE);
          if (direction === 'down') statsTop = Math.min(lastTop, statsTop + STAT_ROWS_PER_PAGE);
        }
        // Màn hình 'regression' chỉ ba dòng, không cuộn.
        return displayString();
      },

      // DEL trên bảng dữ liệu xoá cả DÒNG (manual trang 120).
      deleteRow() {
        if (screen !== 'editor' || cursor >= rows.length) return displayString();
        rows.splice(cursor, 1);
        if (cursor > rows.length) cursor = rows.length;
        keepEditorCursorVisible();
        refreshStatistics();
        return displayString();
      },

      // Các mục OPTN không phải "chọn kiểu".
      command(name) {
        if (name === 'data') backToEditor();
        else if (name === 'calc' || (plusModel && name.startsWith('calc:'))) {
          if (name !== 'calc') {
            type = statisticsTypeById(name.slice('calc:'.length));
            refreshStatistics();
          }
          screen = 'calc';
        }
        else if (name === 'stats' || name === 'regression' || (plusModel && name.startsWith('regression:'))) {
          // Bảng rỗng → Math ERROR ngay, không mở màn hình.
          if (rows.length === 0) {
            throw new EngineError('Math ERROR');
          }
          refreshStatistics();
          // Regression Calc còn báo Math ERROR khi KHÔNG dựng được đường (Sxx=0:
          // n=1 hoặc mọi x bằng nhau) — ĐÃ XÁC NHẬN 2026-08-27. Lúc đó a null.
          if (name !== 'stats') {
            if (plusModel && name.startsWith('regression:')) {
              type = statisticsTypeById(name.slice('regression:'.length));
              refreshStatistics();
            }
            const stats = compute();
            if (stats.a === null || stats.a === undefined) {
              throw new EngineError('Math ERROR');
            }
          }
          statsTop = 0;
          resultFrom = screen;
          screen = name === 'stats' ? 'stats' : 'regression';
        } else if (name === 'insert-row') {
          // Dòng chèn vào là x=0, y=0, Freq=1 — ĐÃ XÁC NHẬN 2026-08-26/27.
          if (screen === 'editor' && rows.length < maxRows()) {
            rows.splice(Math.min(cursor, rows.length), 0, newStatRow());
            refreshStatistics();
          }
        } else if (name === 'delete-all') {
          reset();
        } else if (plusModel && screen === 'editor' && name.startsWith('sort-')) {
          const [, direction, field] = name.split('-');
          const cols = columns();
          if (field) {
            const index = cols.findIndex(col => col.key === field);
            if (index < 0) return displayString();
            column = index;
            cursor = 0;
          }
          const key = cols[column].key;
          const order = direction === 'ascending' ? 1 : -1;
          rows.sort((a, b) => order * (a[key] - b[key]));
          refreshStatistics();
        }
        return displayString();
      },

      // Handler chiếm màn hình ở 'editor', 'stats', 'regression'; ở 'calc' nó
      // mượn màn hình biểu thức thường nên phải trả false.
      expressionScreen() {
        return screen === 'calc';
      },

      // "Đang hiện kết quả" đúng với hai màn hình kết quả. Màn hình TÍNH vẫn là
      // dòng nhập nên phải trả false.
      showingResult() {
        return screen === 'stats' || screen === 'regression';
      },

      // Màn hình kết quả không có dạng chính xác để S⇔D đổi.
      hasExactForm() {
        return false;
      },

      // Nhãn góc phải màn hình tính ("Statistics" / "1-Variable" / "y=a+bx").
      cornerLabel() {
        return ['Statistics', type.label];
      },

      // Kiểu tính toán đang chọn — ui.js đọc để biết vẽ menu OPTN một/hai biến.
      getType() {
        return type;
      },

      // Cổng xuất dữ liệu (bridge.js): kiểu và bảng số liệu đang nhập.
      exportData() {
        return {
          type: type.id,
          label: type.label,
          twoVar: !!type.twoVar,
          frequency: !!statisticsFrequency,
          rows: rows.map(r => ({ x: Number(r.x), y: Number(r.y), f: Number(r.f) }))
        };
      },

      getState() {
        if (screen === 'stats') {
          const stats = compute();
          return {
            mode: 'statistics',
            screen: 'stats',
            typeLabel: type.label,
            statsTop,
            rows: resultRows().map((row) => ({
              label: row.label,
              // null = máy bỏ trống phần giá trị (s²x/sx khi n=1, mọi dòng khi Σf=0).
              text: stats[row.key] === null || stats[row.key] === undefined
                ? '' : resultText(stats[row.key])
            }))
          };
        }
        if (screen === 'regression') {
          const stats = compute();
          return {
            mode: 'statistics',
            screen: 'regression',
            typeLabel: type.label,
            header: statRegressionModel(type.id).header,
            rows: statRegressionRows(type.id).map((row) => ({
              label: row.label,
              // r bỏ trống khi mọi y bằng nhau (Syy=0) — ĐÃ XÁC NHẬN 2026-08-27.
              text: stats[row.key] === null || stats[row.key] === undefined
                ? '' : resultText(stats[row.key])
            }))
          };
        }
        // Bảng dữ liệu. LUÔN kèm một dòng trống ngay sau dòng cuối. Máy vẽ đủ
        // bốn dòng bất kể số liệu; phần đệm cho đủ bốn là việc của ui.js.
        const cols = columns();
        const padded = rows.concat(rows.length < maxRows() ? [null] : []);
        const columnStates = cols.map((col, ci) => ({
          key: col.key,
          label: col.label,
          cells: padded.map((row, i) => ({
            index: i + 1,
            ...(plusModel && row !== null && {value:row[col.key]}),
            text: row === null ? '' : formatResultText(plusModel
              ? trimTrailingZeros(statCellText(row[col.key], DEFAULT_NUMBER_FORMAT))
              : statCellText(row[col.key], numberFormat)),
            selected: i === cursor && column === ci
          }))
        }));
        const selectedRow = cursor < rows.length ? rows[cursor] : null;
        return {
          mode: 'statistics',
          screen: 'editor',
          ...(plusModel && {rowOffset}),
          typeLabel: type.label,
          cursor,
          column,
          rowCount: rows.length,
          // Nguồn duy nhất cho ui.js: mảng cột, mỗi cột có nhãn + ô.
          columns: columnStates,
          // Trường tương thích với test/đường vẽ cũ (một biến & Freq): cột đầu
          // là x, cột thứ hai (nếu có, chỉ ở một biến Freq On) là Freq.
          columnLabel: columnStates[0].label,
          cells: columnStates[0].cells,
          freqLabel: (!type.twoVar && statisticsFrequency) ? 'Freq' : null,
          freqCells: (!type.twoVar && columnStates[1]) ? columnStates[1].cells : null,
          // Dòng dưới cùng hiện giá trị ĐẦY ĐỦ của ô đang chọn.
          selectedText: selectedRow === null
            ? '' : displayNumber(selectedRow[cols[column].key])
        };
      }
    };
  }

  // ===== Mode Distribution (Tầng 7) — T1/T2: bảy loại, đường Variable =====
  // Ba loại chuẩn đi thẳng tới màn hình nhập biến; bốn loại rời rạc được UI
  // đưa qua bước chọn List/Variable trước khi gọi setType.
  // Các ô dùng lại coefficient editor nên nhận biểu thức đầy đủ như các mode
  // Tầng 7 khác. Kết quả cập nhật Ans; bấm `=` trên kết quả trở về form và giữ
  // tham số. ĐÃ XÁC NHẬN 2026-09-10, manual tr.155-160.
  function createDistributionHandler() {
    let type = DISTRIBUTION_TYPES[0];
    let inputMethod = 'variable';
    let screen = 'variable';       // 'variable' | 'list' | 'params'
    let editor = createEditor(type.fields);
    let fieldOffset = 0;
    let result = null;
    let rows = [];
    let cursor = 0;
    let listOffset = 0;
    let listColumn = 0;
    let listResults = null;
    const listMaxRows = 45;

    function fieldOrder(fields) {
      if (plusModel && fields.some(field => field.key === 'mu')) {
        fields = fields.slice();
        const sigma = fields.findIndex(field => field.key === 'sigma');
        [fields[sigma], fields[sigma + 1]] = [fields[sigma + 1], fields[sigma]];
      }
      return fields;
    }

    function createEditor(fields) {
      fields = fieldOrder(fields);
      const labels = fields.map(field => field.label);
      const next = createCoefficientEditor(plusModel ? [...labels, 'Execute'] : labels, 0, 1);
      fields.forEach(field => {
        const initial = plusModel
          ? distributionValues.get(field.key) ?? (['n','lambda'].includes(field.key) ? 1 : field.initial)
          : field.initial;
        next.commit(initial);
      });
      next.selectFirst();
      return next;
    }

    function activeField() {
      return editor.getState(numberFormat).cells.findIndex(cell => cell.selected);
    }

    function keepFieldVisible() {
      const index = activeField();
      fieldOffset = Math.min(index, Math.max(fieldOffset, index - 2));
    }

    function keepListRowVisible() {
      listOffset = Math.min(cursor, Math.max(listOffset, cursor - 3));
    }

    function parameters() {
      const values = editor.getValues();
      if (!plusModel) return values;
      values.pop();
      if (type.fields.some(field => field.key === 'mu')) {
        const last = values.length - 1;
        [values[last - 1], values[last]] = [values[last], values[last - 1]];
      }
      return values;
    }

    function parameterFields() {
      return inputMethod === 'list' ? type.fields.slice(1) : type.fields;
    }

    function setType(typeId, nextInputMethod) {
      type = distributionTypeById(typeId);
      inputMethod = type.needsInputMethod && nextInputMethod === 'list' ? 'list' : 'variable';
      screen = inputMethod === 'list' ? 'list' : 'variable';
      editor = createEditor(parameterFields());
      fieldOffset = 0;
      result = null;
      rows = plusModel && screen === 'list' ? distributionRows : [];
      cursor = 0;
      listOffset = 0;
      listColumn = 0;
      listResults = null;
      resetDocument();
    }

    function showVariableResult() {
      return screen === 'variable' && result !== null;
    }

    function setVariableAns(value) {
      // Distribution ở đường Variable ghi kết quả vào Ans (manual tr.156).
      // Không dựng dạng phân số/căn/π: đây là kết quả xấp xỉ xác suất.
      ans = value;
      ansComplexAlgebraic = null;
      ansExact = null;
      ansExactSurd = null;
      ansExactPi = null;
      resultDisplayMode = initialResultDisplayMode();
      engExponent = null;
    engineeringEditing = false;
    }

    function probabilityText(value) {
      // Binomial CD trên Norm làm tròn điểm giữa về chữ số chẵn.
      // Chốt phần nhiễu nhị phân ở độ chính xác 15 chữ số trước khi định dạng.
      if (type.id === 'binomial-cd' && numberFormat.kind === 'norm' && value >= 1e-99) {
        value = fracToNumber(solveProbeRoundFraction(roundedNumberFraction(value), 10, true));
      }
      return displayNumber(value);
    }

    function showDistributionError(error) {
      mode = 'error';
      const message = error instanceof EngineError ? error.message : 'Math ERROR';
      errorMessage = plusModel && message === 'Math ERROR' ? 'Argument ERROR' : message;
      return displayString();
    }

    function listState() {
      const padded = rows.concat(rows.length < listMaxRows ? [null] : []);
      const xCells = padded.map((value, i) => ({
        index: i + 1,
        ...(plusModel && value !== null && {value}),
        text: value === null ? '' : displayNumber(value),
        ...(plusModel && value !== null && {compactText:applyDecimalMark(statCellText(value, numberFormat))}),
        selected: listColumn === 0 && i === cursor
      }));
      const pCells = padded.map((value, i) => ({
        index: i + 1,
        ...(plusModel && value !== null && listResults !== null && {value:listResults[i]}),
        text: value === null || listResults === null ? '' : probabilityText(listResults[i]),
        compactText: value === null || listResults === null ? '' : formatResultText(plusModel
          ? trimTrailingZeros(statCellText(listResults[i], numberFormat))
          : statCellText(listResults[i], numberFormat)),
        selected: listColumn === 1 && i === cursor
      }));
      return {
        mode: 'distribution',
        screen: 'list',
        ...(plusModel && {typeId:type.id, listOffset}),
        typeLabel: type.label,
        cursor,
        column: listColumn,
        rowCount: rows.length,
        columns: [
          { key: 'x', label: 'x', cells: xCells },
          { key: 'p', label: 'P', cells: pCells }
        ],
        selectedText: (listColumn === 1 ? pCells : xCells)[cursor]?.text || ''
      };
    }

    return {
      setType,

      getType() {
        return type;
      },

      commitValue(value) {
        if (screen === 'list') {
          if (listColumn === 1 || !Number.isFinite(value) || cursor >= listMaxRows) return displayString();
          if (cursor < rows.length) rows[cursor] = value;
          else rows.push(value);
          if (cursor < listMaxRows - 1) cursor++;
          if (plusModel) keepListRowVisible();
          // Sửa dữ liệu x làm mất toàn bộ kết quả P cho tới lần tính tiếp theo.
          // ĐÃ XÁC NHẬN 2026-09-11 trên bản giả lập.
          listResults = null;
        } else if (!showVariableResult()) {
          if (plusModel) {
            const field = fieldOrder(parameterFields())[activeField()];
            if (!field) return displayString();
            distributionValues.set(field.key, value);
          }
          editor.commit(value);
          if (plusModel) keepFieldVisible();
        }
        return displayString();
      },

      openParameterEdit() {
        if (!plusModel || !['params','variable'].includes(screen) || showVariableResult() ||
            activeField()>=parameterFields().length) return false;
        resetDocument();
        emptyCellDraft=true;
        return true;
      },

      equals() {
        if (screen === 'list') {
          // `=` ở dòng trống kết thúc nhập x và mở form tham số. Khi đủ 45
          // dòng không còn dòng trống nên `=` ở dòng cuối cũng làm việc này.
          if ((plusModel && rows.length > 0) || listColumn === 1 || (rows.length > 0 &&
              (cursor === rows.length || (rows.length === listMaxRows && cursor === listMaxRows - 1)))) {
            screen = 'params';
            listColumn = 0;
            editor.selectFirst();
            fieldOffset = 0;
          }
          return displayString();
        }

        if (screen === 'params') {
          if (plusModel && !editor.getState(numberFormat).cells.at(-1).selected) {
            editor.moveCell('down');
            keepFieldVisible();
            return displayString();
          }
          try {
            const params = parameters();
            listResults = rows.map((x) => calculateDistribution(type.id, [x].concat(params), plusModel, plusModel));
            if (plusModel && rows.length) distributionValues.set('x', rows.at(-1));
          } catch (e) {
            return showDistributionError(e);
          }
          // Kết quả List không ghi Ans (manual tr.156) và quay lại ngay bảng
          // x|P, chọn dòng đầu — ĐÃ XÁC NHẬN 2026-09-11.
          screen = 'list';
          cursor = 0;
          listOffset = 0;
          listColumn = 0;
          return displayString();
        }

        if (showVariableResult()) {
          result = null;
          editor.selectFirst();
          fieldOffset = 0;
          return displayString();
        }
        if (plusModel && !editor.getState(numberFormat).cells.at(-1).selected) {
          editor.moveCell('down');
          keepFieldVisible();
          return displayString();
        }
        try {
          result = calculateDistribution(type.id, parameters(), plusModel, plusModel);
        } catch (e) {
          return showDistributionError(e);
        }
        setVariableAns(result);
        return displayString();
      },

      clearError() {
        if (!hasDraft()) {
          if (plusModel && screen==='params') {
            screen='list';
            cursor=0;
            listOffset=0;
            listColumn=0;
            listResults=null;
          } else {
            editor.selectFirst();
            fieldOffset = 0;
          }
        }
        return displayString();
      },

      clear() {
        if (screen === 'list') {
          cursor = 0;
          listOffset = 0;
          listColumn = 0;
          if (plusModel) listResults = null;
        } else if (screen === 'params') {
          screen = 'list';
          cursor = Math.min(cursor, rows.length);
        } else if (showVariableResult()) {
          result = null;
          editor.selectFirst();
          fieldOffset = 0;
        } else {
          editor = createEditor(parameterFields());
          fieldOffset = 0;
        }
        return displayString();
      },

      moveCursor(direction) {
        if (screen === 'list') {
          if (direction === 'left') listColumn = 0;
          if (direction === 'right' && listResults !== null && cursor < rows.length) listColumn = 1;
          const lastRow = Math.min(!plusModel && listColumn === 1 ? rows.length - 1 : rows.length, listMaxRows - 1);
          if (plusModel && (direction === 'up' || direction === 'down'))
            cursor = (cursor + (direction === 'up' ? -1 : 1) + lastRow + 1) % (lastRow + 1);
          else if (direction === 'up' && cursor > 0) cursor--;
          else if (direction === 'down' && cursor < lastRow) cursor++;
          if (plusModel) keepListRowVisible();
        } else if (!showVariableResult()) {
          const cells = editor.getState(numberFormat).cells;
          if (plusModel && direction === 'down' && cells.at(-1).selected) editor.selectFirst();
          else if (plusModel && direction === 'up' && cells[0].selected) {
            for (let index=1;index<cells.length;index++) editor.moveCell('down');
          } else editor.moveCell(direction);
          if (plusModel) keepFieldVisible();
        }
        return displayString();
      },

      deleteRow() {
        if (screen !== 'list' || listColumn === 1 || cursor >= rows.length) return displayString();
        rows.splice(cursor, 1);
        if (cursor > rows.length) cursor = rows.length;
        if (plusModel) keepListRowVisible();
        listResults = null;
        return displayString();
      },

      command(name) {
        if (screen !== 'list') return displayString();
        if (name === 'insert-row' && rows.length < listMaxRows) {
          if (listColumn === 1) return displayString();
          // Bản giả lập chèn giá trị x=0 tại đúng vị trí con trỏ.
          rows.splice(Math.min(cursor, rows.length), 0, 0);
          listResults = null;
        } else if (name === 'delete-all') {
          rows.length = 0;
          cursor = 0;
          listOffset = 0;
          listColumn = 0;
          listResults = null;
        }
        return displayString();
      },

      showingResult() {
        return showVariableResult() || (screen === 'list' && listColumn === 1);
      },

      hasExactForm() {
        return false;
      },

      getState() {
        if (screen === 'list') return listState();
        const state = editor.getState(numberFormat);
        if (plusModel) state.cells.at(-1).text = '';
        if (plusModel) {
          editor.getValues().forEach((value,index) => { if(index < state.cells.length-1) state.cells[index].value = value; });
          state.typeId = type.id;
          state.fieldOffset = fieldOffset;
        }
        state.mode = 'distribution';
        state.screen = screen;
        state.header = type.label;
        state.typeLabel = type.label;
        state.unknownLabel = type.resultLabel;
        state.result = result === null ? null : probabilityText(result);
        return state;
      }
    };
  }

  // ===== Mode Table (Tầng 7) =====
  // Bảng số của một/hai hàm f(x), g(x). Ba màn hình:
  //   'func'  — nhập f(x) rồi g(x), DÙNG LẠI cây node Tầng 5 (như ô hệ số).
  //             "=" CHỐT hàm (không tính) và sang bước sau — xem capturesExpression
  //             / commitExpression bên dưới, và nhánh riêng trong equals().
  //   'range' — hộp thoại Start/End/Step, handler tự quản (nhập số như ô hệ số).
  //   'table' — bảng đã sinh. Cột x SỬA được (gõ số → tính lại f/g dòng đó);
  //             f/g CHỈ ĐỌC. Có dòng trống "nới" ở đáy: "=" tự điền x=(trên+Step).
  //             ▲▼ chạy vòng. Ô lỗi miền hiện "ERROR" mà bảng vẫn tính ô khác.
  //             Tất cả ĐÃ XÁC NHẬN 2026-08-31 (manual tr.162 SAI về ▲▼).
  // Việc tính f(x₀) tái dùng evaluateExpression: ràng x từng dòng trước khi
  // rút gọn các mẫu số học (xem reduceCalcNodes). Trần dòng + dãy x nằm ở
  // table.js. Mặc định có cả f,g (manual tr.16).
  const TABLE_ERROR = 'ERROR';
  function createTableHandler() {
    let fNodes = plusModel ? registeredFunctions.f : [];
    let gNodes = plusModel ? registeredFunctions.g : [];
    let editing = 'f';           // 'f' | 'g' khi ở màn 'func'
    let screen = plusModel ? 'table' : 'func';         // 'func' | 'range' | 'table'
    let start = 1, end = 5, step = 1; // GIỮ giá trị giữa các lần sinh (đã bấm)
    let rangeField = 0;          // 0=Start 1=End 2=Step
    let rangeOffset = 0;
    let xs = [];
    let fVals = [];
    let gVals = [];
    let verify = false;
    let feedback = null;
    let cursorRow = 0;
    let cursorCol = 0;           // 0=x, 1=f, 2=g
    let firstVisibleRow = 0;
    let generationError = false;

    function syncRangeViewport() {
      if (!plusModel) return;
      if (rangeField < rangeOffset) rangeOffset = rangeField;
      if (rangeField >= rangeOffset + 3) rangeOffset = rangeField - 2;
    }

    function syncTableViewport() {
      if (!plusModel) return;
      if (cursorRow < firstVisibleRow) firstVisibleRow = cursorRow;
      if (cursorRow >= firstVisibleRow + 4) firstVisibleRow = cursorRow - 3;
    }

    const hasG = () => gNodes.length > 0;
    const setupHasG = () => tableFunctions === 'fg';

    // Số dòng ĐIỀU HƯỚNG được: các dòng dữ liệu + MỘT dòng trống "nới" ở đáy khi
    // chưa chạm trần (ĐÃ XÁC NHẬN 2026-08-31: bảng mới sinh đã có dòng trống; ở
    // đúng trần thì hết dòng trống). Con trỏ ▲▼ chạy vòng qua đúng ngần này dòng.
    function navRows() {
      return xs.length + (xs.length < tableMaxRows(setupHasG()) ? 1 : 0);
    }

    // Đặt x của dòng `i` = `xVal` rồi tính lại f/g dòng đó TẠI CHỖ. i == xs.length
    // nghĩa là điền dòng trống nới (thêm dòng mới). Không sắp lại — x lộn xộn được.
    function bindTableX(value) {
      if (!plusModel || !Number.isFinite(value) || variables.x === value && variablesImaginary.x === 0) return;
      const exact=roundedNumberFraction(value);
      setRegisterValue('x',{value,exact,exactSurd:surdFromFraction(exact),exactPi:null});
    }

    function bindLastTableX() {
      for (let index=xs.length-1;index>=0;index--) if (Number.isFinite(xs[index])) {
        bindTableX(xs[index]);
        break;
      }
    }

    function setRowX(i, xVal) {
      bindTableX(xVal);
      xs[i] = xVal;
      fVals[i] = verify ? undefined : evalAt(fNodes, xVal);
      if (hasG()) gVals[i] = verify ? undefined : evalAt(gNodes, xVal);
    }

    // Nạp hàm đang sửa vào Bộ soạn thảo (root) để hiện và sửa được — con trỏ về
    // đầu (CASIO 2026-10-20). AC ở bảng quay lại đây với hàm CÒN NGUYÊN (đã bấm 2026-08-31).
    function loadEditor() {
      root = cloneNodes(editing === 'f' ? fNodes : gNodes);
      cursorList = root;
      cursorIndex = 0;
    }

    // Ràng x của dòng trước khi rút gọn ∫/d/dx/Σ/Π. Không biến mẫu
    // tính toán thành một hằng số theo x đang lưu trước khi sinh bảng.
    function evalAt(nodes, xi) {
      if (nodes.length === 0 || (plusModel && xi === undefined)) return plusModel ? undefined : TABLE_ERROR;
      try {
        bindTableX(xi);
        checkBoundScalarMemory880(nodes);
        const vars = { ...evalVariables(), x: xi };
        const expr = autoCloseParens(serializeForEval(
          reduceCalcNodes(nodes, ans, vars, angleUnit, null, {}, numberFormat, plusModel)
        ));
        // Giữ phép cộng/trừ thập phân khi thế x: tại x=.300000001,
        // 1/(x−.3)=10^9; không ép các điểm gần cực thành chính cực.
        const v = evaluateExpression(expr, ans, vars, angleUnit, plusModel ? 1e-99 : 0, numberFormat,
          null, remainderContextFor(expr), { plusModel, sumForResidual: (a, b) => tableStepValue(a, b) });
        return Number.isFinite(v) ? v : TABLE_ERROR;
      } catch (e) {
        // Cú pháp sai làm hỏng hàm, không chỉ một ô trong bảng.
        if (e instanceof EngineError && e.message === 'Syntax ERROR') throw e;
        return TABLE_ERROR;
      }
    }

    function validateFn(nodes) {
      for (const node of nodes) {
        // CASIO 2026-10-20: Table d/dx(cos(2x chưa đóng ngoặc báo
        // Syntax ERROR khi sinh bảng. Ngoặc tường minh vẫn tính theo xi.
        if (node.type === 'derivative') {
          const body = serializeForEval(node.body);
          if (autoCloseParens(body) !== body) throw new EngineError('Syntax ERROR');
        }
        for (const slot of templateSlots(node)) validateFn(slot);
      }
    }

    // Sinh bảng. Vượt TRẦN dòng → "Range ERROR" (mã lỗi RIÊNG của máy, KHÔNG
    // cắt im lặng) — ĐÃ XÁC NHẬN 2026-08-31: f,g Start1 End40 Step1 (40 > 30) →
    // Range ERROR. Xin thừa MỘT phần tử (max+1) để phân biệt "đúng trần" với
    // "vượt trần".
    function generate() {
      const g = hasG();
      const max = tableMaxRows(setupHasG());
      if (step === 0) {
        throw new EngineError('Range ERROR');
      }
      // Máy tự chuẩn hoá dấu Step theo hướng Start→End và GIỮ lại
      // dấu đã chuẩn hoá khi quay về Range. ĐÃ XÁC NHẬN 2026-09-07:
      // 1/5/−1 sinh tăng và lưu 1; 5/1/1 sinh giảm và lưu −1.
      if (start < end) step = Math.abs(step);
      else if (start > end) step = -Math.abs(step);
      xs = tableXValues(start, end, step, max + 1);
      if (xs.length > max) {
        throw new EngineError('Range ERROR');
      }
      validateFn(fNodes);
      if (g) validateFn(gNodes);
      fVals = verify ? [] : xs.map((xi) => evalAt(fNodes, xi));
      gVals = g && !verify ? xs.map((xi) => evalAt(gNodes, xi)) : [];
      bindLastTableX();
      cursorRow = 0;
      cursorCol = 0;
      firstVisibleRow = 0;
    }

    // Mô tả các cột hiện có: luôn x + f; thêm g nếu g khác rỗng.
    function tableCols() {
      const cols = [{ key: 'x', label: 'x' }];
      if (!plusModel || tableFunctions !== 'g') cols.push({ key:'f', label:'f(x)' });
      if (plusModel ? tableFunctions !== 'f' : hasG()) cols.push({ key:'g', label:'g(x)' });
      return cols;
    }

    // Giá trị (số hoặc TABLE_ERROR) của ô (row, colKey).
    function cellValueAt(row, colKey) {
      if (colKey === 'x') return xs[row];
      if (colKey === 'f') return fVals[row];
      return gVals[row];
    }

    function cellText(value) {
      if (value === undefined) return '';
      if (value === TABLE_ERROR) return TABLE_ERROR;
      const compact = statCellText(value, numberFormat);
      return formatResultText(plusModel && numberFormat.kind === 'norm' && !compact.includes('×10')
        ? trimTrailingZeros(compact) : compact);
    }

    function fullText(value) {
      if (value === undefined) return '';
      return value === TABLE_ERROR ? TABLE_ERROR : displayNumber(value);
    }

    return {
      verifying() { return verify; },

      checkValue(value) {
        if (!verify || screen !== 'table' || cursorCol === 0) return false;
        const expected = evalAt(tableCols()[cursorCol].key === 'f' ? fNodes : gNodes, xs[cursorRow]);
        const correct = typeof expected === 'number' && value.toPrecision(10) === expected.toPrecision(10);
        feedback = {correct, value};
        return true;
      },

      dismissVerify() {
        if (!feedback) return null;
        const {correct, value} = feedback;
        feedback = null;
        if (correct) {
          const values = tableCols()[cursorCol].key === 'f' ? fVals : gVals;
          values[cursorRow] = value;
          if (cursorRow < navRows() - 1) cursorRow++;
          syncTableViewport();
        }
        return correct;
      },

      deleteRow() {
        if (!plusModel || screen !== 'table' || cursorRow >= xs.length) return displayString();
        for (const values of [xs, fVals, gVals]) values.splice(cursorRow, 1);
        cursorRow = Math.min(cursorRow, navRows() - 1);
        syncTableViewport();
        return displayString();
      },

      command(name) {
        if (name === 'range') {
          rangeField = 0;
          rangeOffset = 0;
          screen = 'range';
        } else if (name === 'f' || name === 'g') {
          editing = name;
          screen = 'func';
          loadEditor();
        } else if (name === 'cancel-draft') {
          screen = 'table';
        } else if (name === 'verify' || name === 'recalculate') {
          if (name === 'verify') verify = !verify;
          fVals = verify ? [] : xs.map(xi => evalAt(fNodes, xi));
          gVals = verify ? [] : xs.map(xi => evalAt(gNodes, xi));
          if (!verify) bindLastTableX();
          screen = 'table';
        } else if (plusModel && name === 'insert-row' && xs.length < tableMaxRows(setupHasG())) {
          fVals.length = gVals.length = xs.length;
          for (const values of [xs, fVals, gVals]) values.splice(cursorRow, 0, undefined);
        } else if (name === 'clear-table') {
          xs = [];
          fVals = [];
          gVals = [];
          cursorRow = 0;
          cursorCol = 0;
          screen = 'table';
          firstVisibleRow = 0;
        }
      },

      // "=" ở màn 'func' CHỐT cây node (không tính) — engine gọi qua nhánh riêng.
      capturesExpression() {
        return screen === 'func';
      },

      // Nhận cây node vừa gõ làm f hoặc g rồi sang bước sau. g ĐỂ TRỐNG được
      // (nodes rỗng) — khi đó bảng chỉ có cột x,f (ĐÃ XÁC NHẬN 2026-08-31).
      commitExpression(nodes) {
        if (plusModel) {
          storeRegisteredFunction(editing, nodes);
          screen = 'table';
          try {
            // Máy chỉ làm mới cột vừa định nghĩa. Tính lại cập nhật luôn
            // cột hàm hợp đang tham chiếu tới định nghĩa đó.
            if (editing === 'f') fVals = verify ? [] : xs.map(xi => evalAt(fNodes, xi));
            else gVals = verify ? [] : xs.map(xi => evalAt(gNodes, xi));
          } catch (error) {
            mode = 'error';
            errorMessage = error.message;
          }
          return displayString();
        }
        if (editing === 'f') {
          fNodes = nodes;
          if (setupHasG()) {
            editing = 'g';
            loadEditor();
          } else {
            gNodes = [];
            screen = 'range';
            rangeField = 0;
            resetDocument();
          }
        } else {
          gNodes = nodes;
          screen = 'range';
          rangeField = 0;
          resetDocument();
        }
        return displayString();
      },

      // Màn 'range': gõ số vào ô đang chọn rồi "=" ghi giá trị (engine tính bản
      // nháp trước rồi gọi vào đây). Ô Start/End nhảy sang ô kế; ô Step (ô cuối)
      // ĐỨNG YÊN — cần "=" lần nữa (không gõ dở) mới sinh bảng. ĐÃ XÁC NHẬN
      // 2026-08-31: gõ 0.5 vào Step rồi "=" vẫn ở dialog, "=" lần nữa mới sinh.
      commitValue(value, fraction, sourceValue) {
        // Bảng: chỉ cột x nhận gõ (showingResult chặn f/g nên chỉ tới đây khi ở
        // cột x). Đặt x dòng đang chọn (dòng trống nới thì thêm dòng), tính lại
        // f/g dòng đó, rồi XUỐNG dòng. ĐÃ XÁC NHẬN 2026-08-31: sửa x giữa bảng
        // (x=3→10) thì f=100,g=20, dòng GIỮ vị trí, con trỏ xuống.
        if (screen === 'table') {
          if (plusModel) {
            const exact=roundedNumberFraction(value);
            setRegisterValue('x',sourceValue || {value,exact,exactSurd:surdFromFraction(exact),exactPi:null});
          }
          setRowX(cursorRow, value);
          if (cursorRow < navRows() - 1) cursorRow++;
          syncTableViewport();
          return displayString();
        }
        if (screen !== 'range') return displayString();
        if (rangeField === 0) { start = value; rangeField = 1; }
        else if (rangeField === 1) { end = value; rangeField = 2; }
        else { step = value; if (plusModel) rangeField = 3; }
        syncRangeViewport();
        return displayString();
      },

      // "=" khi KHÔNG gõ dở. Ở màn 'range' bấm "=" là SINH BẢNG NGAY với giá
      // trị hiện có — KHÔNG bước qua từng ô (ĐÃ XÁC NHẬN 2026-08-31: dialog mặc
      // định bấm "=" ra bảng 1..5 luôn). Muốn đổi ô thì GÕ số (đường commitValue
      // bên trên) hoặc ▲▼ chọn ô rồi gõ. Vượt trần → Range ERROR (mode='error').
      equals() {
        if (screen === 'range') {
          if (plusModel && rangeField < 3) {emptyCellDraft = true; return displayString();}
          try {
            generate();
            generationError = false;
            screen = 'table';
          } catch (e) {
            generationError = true;
            mode = 'error';
            errorMessage = e instanceof EngineError ? e.message : 'Math ERROR';
          }
          return displayString();
        }
        // Bảng, "=" KHÔNG gõ dở. Trên dòng trống nới (cột x) → TỰ ĐIỀN x = (x
        // dòng ngay trên + Step), tính f/g, thêm dòng, xuống. Dòng đã có → chỉ
        // xuống dòng; ở dòng cuối (đúng trần) đứng yên. ĐÃ XÁC NHẬN 2026-08-31.
        if (screen === 'table') {
          const onEmpty = cursorCol === 0 && cursorRow === xs.length && xs[cursorRow - 1] !== undefined;
          if (onEmpty && xs.length < tableMaxRows(setupHasG())) {
            setRowX(cursorRow, tableStepValue(xs[cursorRow - 1], step));
          }
          if (cursorRow < navRows() - 1) cursorRow++;
          syncTableViewport();
        }
        return displayString();
      },

      // PLUS: ± uses the preceding x ± Step, recalculates the current row,
      // and advances in the same column, including f/g and existing rows.
      // A draft keeps the operator as part of its expression.
      handleOperator(op) {
        if (screen!=='table' || !['+','-'].includes(op)) return false;
        if ((!plusModel && (cursorCol!==0 || cursorRow!==xs.length)) || xs[cursorRow-1]===undefined ||
            cursorRow>=tableMaxRows(setupHasG())) return plusModel;
        this.commitValue(tableStepValue(xs[cursorRow - 1], step, op === '+' ? 1 : -1));
        return true;
      },

      // AC: bảng/range → về màn nhập f, giữ cả hai hàm (CASIO 2026-10-20).
      // (Ở màn 'func' còn gõ dở thì engine đã xử lý xoá dòng TRƯỚC khi tới đây.)
      clear() {
        if (plusModel) {
          if (screen !== 'func') screen = 'table';
          return displayString();
        }
        if (screen === 'table') {
          screen = 'func';
          editing = 'f';
          loadEditor();
        } else if (screen === 'range') {
          screen = 'func';
          editing = 'f';
          loadEditor();
        }
        return displayString();
      },

      // Riêng Range ERROR của Table, [AC]:Cancel quay thẳng về f(x)=
      // (không về Range hay g(x)=) và giữ nguyên hàm. ĐÃ XÁC NHẬN
      // 2026-09-07 với Start1/End31/Step1, f=g=x.
      clearError() {
        if (plusModel) {
          screen = generationError ? 'range' : 'table';
          if (generationError) {rangeField = 0; rangeOffset = 0;}
          generationError = false;
          return displayString();
        }
        screen = 'func';
        editing = 'f';
        loadEditor();
        return displayString();
      },

      moveCursor(direction) {
        if (screen === 'table') {
          // ▲▼ chạy VÒNG (wrap) qua mọi dòng điều hướng (gồm dòng trống nới):
          // row1 ↔ dòng cuối — ĐÃ XÁC NHẬN 2026-08-31. ◀▶ đổi cột, dừng ở mép.
          const n = navRows();
          const lastCol = tableCols().length - 1;
          if (direction === 'up') cursorRow = (cursorRow - 1 + n) % n;
          if (direction === 'down') cursorRow = (cursorRow + 1) % n;
          if (direction === 'left' && cursorCol > 0) cursorCol--;
          if (direction === 'right' && cursorCol < lastCol) cursorCol++;
          syncTableViewport();
        } else if (screen === 'range') {
          if (plusModel) {
            if (direction === 'up') rangeField = (rangeField + 3) % 4;
            if (direction === 'down') rangeField = (rangeField + 1) % 4;
            if (direction === 'page-up') rangeField = 0;
            if (direction === 'page-down') rangeField = 3;
            if (direction === 'right' && rangeField < 3) emptyCellDraft = true;
            syncRangeViewport();
          } else {
            if (direction === 'up' && rangeField > 0) rangeField--;
            if (direction === 'down' && rangeField < 2) rangeField++;
          }
        }
        return displayString();
      },

      // Ở bảng, CHỈ cột x nhận gõ (f/g CHỈ ĐỌC — ĐÃ XÁC NHẬN 2026-08-31: gõ vào
      // cột f không vào). Trả true (="đang xem kết quả", chặn insertNodes) khi ở
      // cột f/g. func/range luôn nhận nhập.
      showingResult() {
        return screen === 'table' && cursorCol !== 0 && !(verify && xs[cursorRow] !== undefined);
      },

      hasExactForm() {
        return false;
      },

      getMemoryValue() {
        if (screen !== 'table' || root.length) return null;
        const value=cellValueAt(cursorRow,tableCols()[cursorCol].key);
        if (!Number.isFinite(value)) return null;
        const exact=roundedNumberFraction(value);
        return {value,exact,exactSurd:surdFromFraction(exact),exactPi:null};
      },

      // Cổng xuất dữ liệu (bridge.js): hàm f, g (chuỗi trao đổi và chuỗi hiển
      // thị), khoảng Start/End/Step và các dòng đã sinh. Ô lỗi là null.
      exportData() {
        const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : null);
        const hasGeneratedRows = screen === 'table' && mode !== 'error' && !generationError;
        const g = hasG();
        return {
          f: fNodes.length ? serializeForExchange(fNodes) : null,
          fText: fNodes.length ? serializeForDisplay(fNodes) : '',
          g: g ? serializeForExchange(gNodes) : null,
          gText: g ? serializeForDisplay(gNodes) : '',
          start: num(start), end: num(end), step: num(step),
          rows: hasGeneratedRows ? xs.map((x, i) => ({ x: num(x), f: num(fVals[i]), g: g ? num(gVals[i]) : null })) : []
        };
      },

      getState() {
        if (screen === 'func') {
          return { mode: 'table', screen: 'func', prompt: editing === 'f' ? 'f(x)=' : 'g(x)=' };
        }
        if (screen === 'range') {
          return {
            mode: 'table',
            screen: 'range',
            fields: [
              { label: 'Start', ...(plusModel && {value:start}), text: plusModel ? cellText(start) : displayNumber(start) },
              { label: 'End', ...(plusModel && {value:end}), text: plusModel ? cellText(end) : displayNumber(end) },
              { label: 'Step', ...(plusModel && {value:step}), text: plusModel ? cellText(step) : displayNumber(step) },
              ...(plusModel ? [{label:'Execute', text:''}] : [])
            ],
            active: rangeField,
            ...(plusModel ? {fieldOffset:rangeOffset} : {})
          };
        }
        // navRows() = số dòng có SỐ THỨ TỰ (dữ liệu + dòng trống nới). Dòng trống
        // (i == xs.length) vẽ ô rỗng nhưng VẪN có số thứ tự.
        const cols = tableCols();
        const rowsShown = navRows();
        const columnStates = cols.map((col, ci) => ({
          label: col.label,
          cells: Array.from({ length: rowsShown }, (_, i) => ({
            text: i < xs.length ? cellText(cellValueAt(i, col.key)) : '',
            ...(plusModel && i < xs.length && {value:cellValueAt(i,col.key)}),
            selected: i === cursorRow && ci === cursorCol
          }))
        }));
        return {
          mode: 'table',
          screen: 'table',
          columns: columnStates,
          cursor: cursorRow,
          rowCount: rowsShown,
          ...(plusModel ? {rowOffset:firstVisibleRow} : {}),
          // Dòng dưới cùng: giá trị ĐẦY ĐỦ của ô đang chọn (dòng trống → rỗng).
          undefinedFunctions: plusModel && !verify ? cols.flatMap(({key,label}) =>
            (key === 'f' && !fNodes.length) || (key === 'g' && !hasG()) ? [label] : []) : [],
          ...(plusModel ? {tableFeedback:feedback?.correct, verifyCell:verify && cursorCol !== 0 && xs[cursorRow] !== undefined} : {}),
          selectedText: cursorRow >= xs.length
            ? '' : fullText(cellValueAt(cursorRow, cols[cursorCol].key))
        };
      }
    };
  }

  // Một nghiệm → khuôn chuỗi cho UI. Ba dạng (hữu tỉ / căn thức / phức) dùng
  // lại đúng hai khuôn fractionForDisplay/surdForDisplay mà UI đã biết vẽ từ
  // Tầng 5, nên không phải thêm kiểu dữ liệu mới cho giao diện.
  // Chuỗi dòng kết quả, đã tính cả ký pháp/ký hiệu kỹ thuật.
  function engineerResultText(value) {
    if (engExponent !== null) return formatResultText(engineerText(value, engExponent, engineerSymbol));
    // Bật ký hiệu mà CHƯA bấm ENG: kết quả LUÔN hiện ở mức chuẩn kỹ thuật,
    // không riêng giá trị nhỏ hơn 1 — SỬA 2026-08-24 sau khi bấm lại máy:
    // 999k+25k ra "1.024M" và 1234569 ra "1.234569M", chứ không phải số trần.
    // Quy tắc cũ ("≥ 1 thì hiện trần") suy ra từ mỗi ca 3÷2 → 1.5, mà ca đó
    // KHÔNG phân biệt được gì: mức chuẩn của 1.5 vốn đã là 10⁰ nên hai cách
    // hiểu cho cùng một chuỗi. Đúng cái bẫy "ca thử phải phân biệt được".
    // Số mũ ngoài bảng 11 ký hiệu vẫn ở dạng kỹ thuật, chỉ đổi ký hiệu thành
    // ×10ⁿ — ĐÃ XÁC NHẬN 2026-08-24: 5E×10000 ra "50×10²¹", không phải
    // "5×10²²" (ca này phân biệt được với việc rơi hẳn về dạng Norm).
    if (engineerSymbol) {
      return formatResultText(engineerText(value, canonicalEngineerExponent(value), true));
    }
    return displayNumber(value);
  }

  // Bật ký hiệu kỹ thuật thì TẮT hẳn dạng chính xác — ĐÃ XÁC NHẬN 2026-08-23:
  // 3÷2 ra "1.5" khi bật, ra phân số 3/2 xếp tầng khi tắt. Bấm ENG cũng vậy.
  function exactFormsSuppressed() {
    return engineerSymbol || engExponent !== null;
  }

  function rootForDisplay(root, index, count, format = numberFormat) {
    // `header` chỉ có ở nghiệm đa thức: dòng tiêu đề đổi giữa màn hình nghiệm
    // ("ax²+bx+c=0") và màn hình cực trị ("Min of y=ax²+bx+c").
    const formatValue = value => displayNumber(value, format);
    const display = { kind: 'root', label: root.label, index, count, header: root.header };
    // Màn hình nghiệm cũng theo chu trình S⇔D và theo mục SETUP
    // `Input/Output` — ĐÃ XÁC NHẬN 2026-08-24: ở DecimalO, x²−2=0 hiện
    // x₁ = 1.414213562 rồi S⇔D mới ra √2; ở MathO thì ngược lại.
    const showDecimal = resultDisplayMode !== 'exact';
    const lineOutput = usesLineInput();
    if (root.form === 'fraction') {
      // PLUS Equation: 1/10^7 remains a fraction, 1/10^8 switches to
      // scientific notation (ClassPad scale-boundary measurements).
      if (showDecimal || (plusModel && fracDigitCount(root.fraction) > 9)) {
        display.form = 'decimal';
        display.text = formatValue(fracToNumber(root.fraction));
        return display;
      }
      display.form = 'fraction';
      display.fraction = fractionResultForDisplay(root.fraction);
      display.text = formatValue(fracToNumber(root.fraction));
    } else if (root.form === 'surd') {
      if (showDecimal || lineOutput) {
        display.form = 'decimal';
        display.text = formatValue(surdToNumber(root.surd));
        return display;
      }
      display.form = 'surd';
      display.surd = surdResultForDisplay(root.surd);
    } else if (root.form === 'decimal') {
      // Nhánh bậc 3/4 chưa nhận dạng chính xác giữ dạng thập phân.
      display.form = 'decimal';
      display.text = formatValue(root.value);
    } else if (root.form === 'complexDecimal') {
      // Nghiệm phức dạng số. Tách sẵn dấu và các trường hợp rút gọn để
      // ui.js chỉ việc ghép chữ: máy viết "i" chứ không viết "0+1i".
      display.form = 'complexDecimal';
      display.reIsZero = root.re === 0;
      display.re = formatValue(root.re);
      display.imNegative = root.im < 0;
      display.imIsOne = Math.abs(Math.abs(root.im) - 1) < 1e-12;
      display.im = formatValue(Math.abs(root.im));
    } else if (root.form === 'message') {
      // Màn hình chữ trần, không nhãn không tiêu đề ("No Local Max/Min").
      display.form = 'message';
      display.text = root.text;
    } else if (showDecimal || lineOutput) {
      // Nghiệm phức ở bước thập phân — ĐÃ XÁC NHẬN 2026-08-24 với x²+x+1=0:
      // máy hiện "−0.5 + 0.8660254038i", S⇔D mới ra dạng căn thức.
      const re = surdToNumber(root.re);
      const im = surdToNumber(root.im);
      display.form = 'complexDecimal';
      display.reIsZero = re === 0;
      display.re = formatValue(re);
      display.imNegative = im < 0;
      display.imIsOne = Math.abs(Math.abs(im) - 1) < 1e-12;
      display.im = formatValue(Math.abs(im));
    } else {
      display.form = 'complex';
      display.re = surdResultForDisplay(root.re);
      display.im = surdResultForDisplay(root.im);
    }
    return display;
  }

  // Dùng chung cho M+ (sign=1) và M- (sign=-1).
  function applyMemoryDelta(sign) {
    const evalResult = evaluateCurrentValue();
    if (evalResult.ok) {
      variables.M += sign * evalResult.value;
      const memoryExact = evalResult.memoryExact || evalResult.exact;
      if (variablesExact.M !== null && memoryExact !== null) {
        const delta = sign > 0 ? memoryExact : fracNeg(memoryExact);
        variablesExact.M = fracAdd(variablesExact.M, delta);
        variables.M = fracToNumber(variablesExact.M);
      } else {
        variablesExact.M = null;
      }
      if (variablesExactSurd.M !== null && evalResult.exactSurd !== null) {
        const delta = sign > 0 ? evalResult.exactSurd : surdNeg(evalResult.exactSurd);
        try {
          variablesExactSurd.M = surdAdd(variablesExactSurd.M, delta);
        } catch (e) {
          // Cộng dồn ra hai căn_số khác nhau không gộp được (ranh giới v1)
          // — mất chính xác phần căn, giống hệt cách Fraction xử lý mất
          // chính xác ở nhánh trên.
          variablesExactSurd.M = null;
        }
      } else {
        variablesExactSurd.M = null;
      }
      // Bội số π cộng dồn vào M — ĐÃ XÁC NHẬN máy thật 2026-08-17
      // ("π M+, π M+, ALPHA M=" cho ra 2π). Làm theo đúng khuôn hai kho trên;
      // dù chưa xác nhận thì vẫn bắt buộc phải xử lý ở đây, vì nếu BỎ QUA thì
      // variablesExactPi.M sẽ giữ giá trị π CŨ đã lỗi thời sau mỗi M+ — sai
      // hẳn, tệ hơn là mất dạng π.
      if (variablesExactPi.M !== null && evalResult.exactPi !== null) {
        const current = piFractionToFraction(variablesExactPi.M);
        const incoming = piFractionToFraction(evalResult.exactPi);
        const delta = sign > 0 ? incoming : fracNeg(incoming);
        variablesExactPi.M = piFractionFromFraction(fracAdd(current, delta));
      } else if (evalResult.exactPi !== null && variablesExactPi.M === null && variables.M === sign * evalResult.value) {
        // M đang là 0 (chưa có gì cộng dồn) và giá trị vào có dạng π —
        // 0 + kπ = kπ, giữ được dạng π. Điều kiện so với variables.M đảm bảo
        // M thật sự vừa từ 0 thành đúng giá trị này, không phải đã mất chính
        // xác từ một phép cộng vô tỉ trước đó.
        variablesExactPi.M = sign > 0
          ? evalResult.exactPi
          : piFractionFromFraction(fracNeg(piFractionToFraction(evalResult.exactPi)));
      } else {
        variablesExactPi.M = null;
      }
      showResult(evalResult);
      viewEntry().memoryOp = sign > 0 ? 'M+' : 'M−';
    }
  }

  // Lưu giá trị đang gõ (hoặc Ans) vào một biến rồi hiện màn hình "…→X".
  // Dùng chung cho STO gõ tay và cho việc THI HÀNH LẠI một mục lịch sử đến từ
  // STO — hai đường phải giống hệt nhau, nên chỉ có một chỗ này.
  function storeIntoVariable(name) {
    // CASIO 2026-10-20: Verify nhận phím chọn biến sau STO nhưng không lưu.
    if (calcMode === 'verify') return;
    if (plusModel && calcMode === 'table') {
      const value=modeHandler?.getMemoryValue?.();
      if (value) {setRegisterValue(name,value);return;}
    }
    if (calcMode === 'complex') {
      const selected = evaluateCurrentComplexValue();
      if (!selected.ok) return;
      const re = selected.value.re;
      const rational = approximateComplexRational(re, 100);
      const fraction = rational ? fracReduce({ num: BigInt(rational.numerator), den: BigInt(rational.denominator) })
        : roundedNumberFraction(re);
      const exact = fracDigitCount(fraction) <= 10 ? fraction : null;
      let exactSurd = exact ? surdFromFraction(exact) : null;
      // Giữ dạng căn của phần thực khi rời Complex, như √23−23i STO A.
      const radical = simpleComplexRadical(re);
      if (radical !== null) {
        const expression = radical.replace(/−/g, '-').replace(/√(\d+)/g, '√($1)');
        exactSurd = evaluateExpressionExactSurd(expression, null, {}, angleUnit);
      }
      setRegisterValue(name, { value: re, exact, exactSurd, exactPi: null });
      variablesImaginary[name] = selected.value.im;
      variablesComplexAlgebraic[name] = plusModel ? selected.complexAlgebraic || null : null;
      showComplexResult(selected);
      viewEntry().storedVariable = name;
      return;
    }
    if (calcMode === 'equation' && modeHandler.showingResult()) {
      const selected = modeHandler.getMemoryValue();
      if (selected) {
        setRegisterValue(name, selected);
        options.onEquationStored?.(name);
      }
      return;
    }
    const evalResult = evaluateCurrentValue();
    if (!evalResult.ok) return;
    setRegisterValue(name, evalResult);
    if (plusModel && mode === 'result') {
      viewEntry().storedVariable = name;
      return;
    }
    showResult(evalResult);
    viewEntry().storedVariable = name;
  }

  // Cổng xuất dữ liệu khi máy đang báo lỗi: loại lỗi, biểu thức gây lỗi
  // (chuỗi hiển thị, chuỗi trao đổi, cây gọn) và đường dẫn tới node lỗi nếu
  // máy biết (hiện là dấu (-) đặt sai — cùng chỗ Goto đặt con trỏ).
  // Mode có màn hình riêng (Bảng, Phương trình…) không có biểu thức chung:
  // khi đó cây rỗng, phần dữ liệu của mode do handler trả.
  function exportErrorInfo() {
    const nodes = calcSession?.nodes?.length ? calcSession.nodes : root;
    const info = { message: errorMessage, source: calcSession ? (calcSession.operation || 'calc') : null,
      text: '', expr: null, tree: [], at: null };
    if (!nodes || !nodes.length) return info;
    try { info.text = serializeForDisplay(nodes); } catch (_) { /* giữ chuỗi rỗng */ }
    info.expr = serializeForExchange(nodes);
    info.tree = exportExpressionTree(nodes);
    if (errorMessage === 'Syntax ERROR') {
      try { serializeForEval(nodes); } catch (error) {
        if (error && error.expressionNode) info.at = expressionNodePath(nodes, error.expressionNode);
      }
    }
    return info;
  }

  function displayString() {
    return serializeForDisplay(root);
  }

  // Xoá lùi một bước từ vị trí con trỏ, trả về vị trí con trỏ mới.
  // Quy tắc suy ra từ HAI quan sát đã xác nhận trên máy thật (2026-08-13):
  //   • "5" ▭/▭ ▶ DEL → còn lại "5"  (mẫu số rỗng → mẫu bị GỠ, giữ tử số)
  //   • √ "9" ▶ DEL   → còn lại "√□" (trong căn có 9 → BƯỚC VÀO xoá số 9)
  // Một quy tắc duy nhất giải thích được cả hai: nhìn vùng nhập CUỐI của mẫu
  // — còn nội dung thì bước vào trong xoá phần tử cuối của nó, đã rỗng thì
  // gỡ mẫu và giữ lại nội dung vùng nhập ĐẦU.
  // Hệ quả — ĐÃ XÁC NHẬN 2026-08-20, KHỚP: với phân số "1/2", DEL xoá số 2
  // trước (còn "1/□") rồi lần DEL sau mới gỡ vạch phân số (còn "1") — nên mẫu
  // số có nội dung không bao giờ bị mất trắng như bản trước.
  // Trả về SỐ KÝ TỰ của cụm mở hàm kết thúc ngay trước vị trí `index`, hoặc 0
  // nếu không phải. Chỉ tính khi cả cụm là các node 'char' liền nhau.
  function matchFunctionOpenBefore(list, index) {
    if (plusModel && usesLineInput() && list[index - 2]?.ch === '^' && list[index - 1]?.ch === '(') return 2;
    for (const text of FUNCTION_OPEN_TEXTS) {
      const n = text.length;
      if (index < n) continue;
      let ok = true;
      for (let i = 0; i < n; i++) {
        const node = list[index - n + i];
        if (!node || node.type !== 'char' || node.ch !== text[i]) { ok = false; break; }
      }
      if (ok) return n;
    }
    return 0;
  }

  function matchFunctionOpenAt(list, index) {
    if (plusModel && usesLineInput() && list[index]?.ch === '^' && list[index + 1]?.ch === '(') return 2;
    for (const text of FUNCTION_OPEN_TEXTS) {
      if (!text.endsWith('(')) continue;
      if ([...text].every((ch, offset) => {
        const node = list[index + offset];
        return node && node.type === 'char' && node.ch === ch;
      })) return text.length;
    }
    return 0;
  }

  function matchMemoryTokenAt(list, index) {
    const token = ['PreAns', 'Ans'].find(text => [...text].every((ch, offset) =>
      list[index + offset]?.type === 'char' && list[index + offset].ch === ch));
    return token?.length || 0;
  }

  function deleteBackward(list, index) {
    if (index === 0) {
      // Đang ở ĐẦU một vùng nhập: gỡ mẫu đang bao quanh, giữ lại nội dung
      // vùng nhập đầu. Đã xác nhận với máy thật (2026-08-13) qua hai trường
      // hợp: DEL DEL sau "√9▶" gỡ hẳn dấu căn; DEL DEL sau "1/2▶" (mẫu đã
      // rỗng) gỡ vạch, giữ lại tử số 1 — khớp đúng quy tắc này.
      // Giữ nội dung của MỌI vùng nhập (nối theo thứ tự đọc) chứ không chỉ
      // vùng đầu, để không âm thầm nuốt mất chữ khi người dùng dùng phím mũi
      // tên đi tới đầu mẫu số lúc mẫu số vẫn còn nội dung — chưa quan sát
      // được trực tiếp trên máy thật, nhưng không mất nội dung nào là lựa
      // chọn an toàn hơn so với các phương án khác.
      const owner = findListOwner(root, list);
      if (!owner) return { list, index };
      if (plusModel && !usesLineInput() && owner.node.type === 'frac' &&
          list === owner.node.num && list.length && owner.parentList !== root) {
        return { list: owner.parentList, index: owner.index };
      }
      const kept = [].concat(...owner.slots);
      owner.parentList.splice(owner.index, 1, ...kept);
      const afterNumerator = plusModel && owner.node.type === 'frac' && list === owner.node.den;
      return { list: owner.parentList, index: owner.index + (afterNumerator ? owner.node.num.length : 0) };
    }
    // Cụm mở hàm ("sin(" ...) bị gỡ NGUYÊN CỤM trong một lần DEL — xem
    // FUNCTION_OPEN_TEXTS. Kiểm trước khi xoá lẻ từng ký tự.
    const openRun = matchFunctionOpenBefore(list, index);
    if (openRun > 0) {
      list.splice(index - openRun, openRun);
      return { list, index: index - openRun };
    }
    const prev = list[index - 1];
    const postfixOwner = plusModel && prev.ch === '²' && findListOwner(root, list);
    if (plusModel && !usesLineInput() && prev.ch === '²' &&
        postfixOwner?.node.type === 'times10' && postfixOwner.node.literalMultiply) {
      // PLUS 2026-11-23: deleting this fixed square removes its digit,
      // retaining an editable exponent placeholder (3² → 3^□).
      const exp = [];
      list.splice(index - 1, 1, {type: 'sup', exp});
      return {list: exp, index: 0};
    }
    if (prev.type === 'angle') {
      list.splice(index - 1, 1, ...prev.arg);
      return { list, index: index - 1 + prev.arg.length };
    }
    const slots = templateSlots(prev);
    if (slots.length === 0) {
      list.splice(index - 1, 1);
      return { list, index: index - 1 };
    }
    const lastSlot = slots[slots.length - 1];
    if (lastSlot.length > 0) {
      return deleteBackward(lastSlot, lastSlot.length);
    }
    const kept = slots[0];
    list.splice(index - 1, 1, ...kept);
    return { list, index: index - 1 + kept.length };
  }

  const api = {
    linearInput(method, ...args) {
      const previous = linearInputOverride;
      linearInputOverride = true;
      try { return api[method](...args); }
      finally { linearInputOverride = previous; }
    },

    inputDigit(digit) {
      if (mode === 'input' && cursorList[cursorIndex - 1]?.type === 'recurring') return displayString();
      if (handlerOwnsInput() && typeof modeHandler.handleDigit === 'function' &&
          modeHandler.handleDigit(digit)) {
        resetDocument();
        return displayString();
      }
      if (modeHandler && !handlerIsEditing()) return;
      ensureFreshInputIfNeeded();
      insertText(digit);
      return displayString();
    },

    inputDot() {
      if (mode === 'input' && cursorList[cursorIndex - 1]?.type === 'recurring') return displayString();
      if (modeHandler && !handlerIsEditing()) return;
      ensureFreshInputIfNeeded();
      insertText('.');
      return displayString();
    },

    // SHIFT+°′″ đổi số kết quả thành thừa số nguyên tố; bấm lần hai quay lại.
    primeFactorization() {
      if (calcMode !== 'calculate' || mode !== 'result' || calcSession) return displayString();
      const entry = viewEntry();
      if (!entry || entry.complex !== undefined) return displayString();
      if (entry.factorization !== undefined) {
        delete entry.factorization;
        return displayString();
      }
      const value = entry.value;
      if (!Number.isInteger(value) || value < 2 || value >= 1e10) {
        // GoTo của lỗi FACT quay về biểu thức đã tạo kết quả, như lỗi tính.
        root = cloneNodes(entry.nodes);
        cursorList = root;
        cursorIndex = root.length;
        mode = 'error';
        errorMessage = 'Math ERROR';
        return displayString();
      }
      entry.factorization = primeFactorizationText(value);
      return displayString();
    },

    // Phím trần °′″ nhập DMS hoặc đổi kết quả DMS ⇄ thập phân.
    // ĐÃ XÁC NHẬN trên CASIO chính thức 2026-09-30.
    inputDms(convertResult = false) {
      if (plusModel && mode === 'result' && !convertResult) return this.inputOperator('°');
      if (mode === 'result') {
        const entry = viewEntry();
        if (!entry || entry.remainderResult || entry.complex !== undefined || !Number.isFinite(entry.value)) {
          return displayString();
        }
        entry.dmsDisplay = plusModel ? true : !entry.dmsDisplay;
        if (!entry.dmsDisplay) resultDisplayMode = 'decimal';
        return displayString();
      }
      if (modeHandler && !handlerIsEditing()) return displayString();
      ensureFreshInputIfNeeded();
      const segment = displayString().split(/[+\-×÷(),]/).pop();
      if (!plusModel && (!segment || !/[0-9.]/.test(segment))) return displayString();
      if (!segment.includes('°')) insertText('°');
      else if (!segment.includes('′')) insertText('′');
      else if (!segment.includes('″')) insertText('″');
      return displayString();
    },

    // Chèn một ký hiệu kỹ thuật vào biểu thức (OPTN → 3:Engineer Symbol →
    // chọn ký hiệu). Node vẫn là char để màn hình vẽ đúng một ký tự và DEL
    // xoá gọn một lần; cờ `eng` mới là thứ phân biệt nó với biến M/E.
    inputEngineerSymbol(symbol) {
      if (modeHandler && !handlerIsEditing()) return displayString();
      if (ENGINEER_SYMBOL_EXPONENTS[symbol] === undefined) return displayString();
      ensureFreshInputIfNeeded();
      insertNodes([{ type: 'char', ch: symbol, eng: true }]);
      return displayString();
    },

    inputOperator(op) {
      if (plusModel && mode === 'input' && !usesLineInput() && op === '²' && ['sup','times10'].includes(cursorList[cursorIndex - 1]?.type)) return displayString();
      if (handlerOwnsInput() && !hasDraft() && typeof modeHandler.handleOperator === 'function' &&
          modeHandler.handleOperator(op)) return displayString();
      const insertOperatorNode = () => {
        if(op && op.conversion) {
          insertNodes([{type:'char',ch:UNIT_CONVERSIONS[op.conversion].label,conversion:op.conversion}]);
        } else if(op==='÷R') {
          insertNodes([{type:'char',ch:'÷R'}]);
        } else if (op === 'P' || op === 'C') {
          insertNodes([{ type: 'char', ch: op, combinatoric: true }]);
        } else if (plusModel && op === '²' && cursorList[cursorIndex - 1]?.type === 'scientific') {
          // This postfix is an editable power on the complete scientific
          // number; LEFT enters its digit and DEL retains its empty slot.
          insertNodes([{type: 'sup', exp: charNodes('2')}]);
        } else insertText(op);
      };
      if (calcSession && calcSession.phase === 'result') calcSession = null;
      // Trên màn MatAns, các phím toán tử/hậu tố tự mở MatrixCalc và lấy
      // MatAns làm toán hạng đầu (manual tr.101; bấm lại 2026-09-14).
      if (calcMode === 'matrix' && modeHandler &&
          typeof modeHandler.showingResult === 'function' && modeHandler.showingResult()) {
        resetDocument();
        modeHandler.startCalculation();
        insertNodes([{ type: 'char', ch: 'MatAns', matrix: true }]);
        insertOperatorNode();
        mode = 'input';
        return displayString();
      }
      if (calcMode === 'vector' && modeHandler &&
          typeof modeHandler.showingResult === 'function' && modeHandler.showingResult()) {
        resetDocument();
        modeHandler.startCalculation();
        insertNodes([{ type: 'char', ch: 'VctAns', vector: true }]);
        insertOperatorNode();
        mode = 'input';
        return displayString();
      }
      if (mode === 'result') {
        resetDocument();
        insertText('Ans');
        insertOperatorNode();
        mode = 'input';
        frozenExpression = '';
        frozenNodes = [];
        viewIndex = null;
        return displayString();
      }
      ensureFreshInputIfNeeded();
      // Với phím ×10ˣ, toán tử nhị phân sau số mũ tự trở về dòng cơ sở:
      // CASIO chính thức 2026-09-30 cho `2 ×10ˣ 3 + 1 = 2001` mà không cần
      // bấm ▶. Phím (−) đổi dấu đi qua inputNegative nên vẫn nằm trong mũ.
      const times10Owner = findListOwner(root, cursorList);
      // PLUS 2026-11-23: the default ×10ˣ (Power) setting keeps operators
      // inside its exponent until ▶ is pressed, including postfix ²/%/⁻¹
      // and binary +. Scientific notation uses a different editor; keep
      // its existing handling separate until that complete flow is matched.
      const leavesScientificExponent = !plusModel || !times10Owner?.node.literalMultiply;
      if (times10Owner && times10Owner.node.type === 'times10' && cursorList.length > 0 && leavesScientificExponent) {
        cursorList = times10Owner.parentList;
        cursorIndex = times10Owner.index + 1;
      }
      insertOperatorNode();
      return displayString();
    },

    // SHIFT+×/÷ trên CASIO — cùng đường nhập toán tử để Ans, MatAns và
    // ô ×10ˣ giữ đúng hành vi, nhưng node mang cờ để C không lẫn biến nhớ.
    inputCombinatoric(kind) {
      if (kind !== 'P' && kind !== 'C') return displayString();
      return this.inputOperator(kind);
    },

    inputOpenParen() {
      ensureFreshInputIfNeeded();
      insertText('(');
      return displayString();
    },

    // √ và ∛ là MẪU: chèn một node có vùng nhập trống rồi đưa con trỏ vào
    // trong. Mọi thứ gõ tiếp nằm dưới vạch căn cho tới khi bấm ▶ để bước ra
    // — đúng như máy thật, và cũng giải thích vì sao "√9+7=" ra 4 chứ không
    // phải 10 (đã xác nhận máy thật 2026-08-12).
    // Khác phím phân số: √ KHÔNG nuốt số đứng ngay trước vào trong căn — đã
    // xác nhận gián tiếp qua "2√9= → 6" (số 2 ở ngoài, nhân ẩn).
    inputSqrt(incorporateNext = false) {
      ensureFreshInputIfNeeded();
      // CASIO 2026-10-20: LineI dùng ngoặc thật; ▶ ở cuối không tự đóng căn.
      if (usesLineInput()) { insertText('√('); return displayString(); }
      return insertTemplate({ type: 'sqrt', arg: plusModel && incorporateNext ? absorbFollowingOperand() : [] });
    },

    inputCbrt() {
      ensureFreshInputIfNeeded();
      return insertTemplate({ type: 'cbrt', arg: [] });
    },

    // Phím ^ tạo một ô mũ trên cao ĐỨNG SAU cơ số — nó không ôm cơ số vào
    // trong mình, y như máy thật. Nhờ vậy bấm ^ lần nữa khi con trỏ đang ở
    // trong ô mũ sẽ tạo mũ lồng mũ, ra đúng kết hợp phải đã xác nhận
    // (2^3^2 = 2^(3^2) = 512).
    inputPower() {
      ensureFreshInputIfNeeded();
      if (plusModel && usesLineInput()) { insertText('^('); return displayString(); }
      const previous = cursorList[cursorIndex - 1];
      if (plusModel && (previous?.type === 'sup' || previous?.type === 'times10' && previous.literalMultiply)) return displayString();
      return insertTemplate({ type: 'sup', exp: [] });
    },

    // 10^ (SHIFT+log) và e^ (SHIFT+ln) — khác phím ^ thường ở chỗ tiền tố
    // "10"/"e" nằm CỐ ĐỊNH trong mẫu, không phải char rời đứng trước. Đã xác
    // nhận với máy thật (2026-08-13): bấm 10^/e^ rồi DEL ngay (ô mũ còn
    // rỗng) gỡ NGUYÊN CỤM kể cả tiền tố, không để sót chữ "10"/"e" mồ côi;
    // nếu ô mũ ĐÃ có nội dung thì DEL xoá nội dung trước như ô mũ thường.
    // Cùng một quy tắc `deleteBackward` có sẵn tạo ra đúng cả hai vì tiền tố
    // nằm trong mẫu: vùng nhập rỗng → gỡ cả mẫu (mất luôn tiền tố); vùng
    // nhập còn nội dung → bước vào xoá trước. Cũng đã xác nhận: không nuốt
    // số gõ trước đó (giống sup), và ▶ thoát khỏi ô mũ bình thường.
    inputPow10() {
      ensureFreshInputIfNeeded();
      return insertTemplate({ type: 'pow10', exp: [] });
    },

    // Phím ×10ˣ trần: khác SHIFT+log (10ˣ) ở dấu nhân cố định phía trước.
    // CASIO chính thức 2026-09-30 xác nhận bấm trên màn hình trống vẫn chèn
    // cả cụm và DEL khi mũ rỗng gỡ nguyên cụm.
    inputTimesTenPower(groupMantissa = true) {
      ensureFreshInputIfNeeded();
      if (plusModel && usesLineInput()) { insertText('×10^('); return displayString(); }
      if (plusModel && groupMantissa) {
        const owner = findListOwner(root, cursorList);
        if (owner?.node.type === 'scientific' && cursorList === owner.node.exp) return displayString();
        let start = cursorIndex;
        while (start > 0 && cursorList[start - 1].type === 'char' && /^[0-9.]$/.test(cursorList[start - 1].ch) &&
            !cursorList[start - 1].constant) start--;
        const mantissa = cursorList.splice(start, cursorIndex - start);
        cursorIndex = start;
        const node = {type: 'scientific', notation: true, mantissa, exp: []};
        if (insertNodes([node]) === false) return displayString();
        cursorList = node.exp;
        cursorIndex = 0;
        return displayString();
      }
      return insertTemplate({ type: 'times10', exp: [], ...(groupMantissa ? {} : {literalMultiply: true}) });
    },

    inputEuler() {
      ensureFreshInputIfNeeded();
      insertNodes([{type:'char', ch:'e', euler:true}]);
      return displayString();
    },

    inputExpPow() {
      ensureFreshInputIfNeeded();
      return insertTemplate({ type: 'epow', exp: [] });
    },

    // Chèn văn bản mở một hàm (vd "sin(", "log(") tại con trỏ — dùng chung
    // cho các hàm một biến còn ở dạng chuỗi phẳng (lượng giác, log, ln).
    // Riêng Abs trên MathI là mẫu có vùng nhập và phím ▶ thoát được.
    // ĐÃ XÁC NHẬN 2026-08-20 (đã sửa theo): máy coi chúng là MỘT CỤM — bấm
    // sin rồi DEL thì màn hình trống hẳn, giống 10^/e^. Danh sách cụm và cách
    // nhận diện nằm ở FUNCTION_OPEN_TEXTS / matchFunctionOpenBefore.
    inputFunction(openText) {
      ensureFreshInputIfNeeded();
      // SHIFT+( là mẫu |□| trên MathI: ▶ bước ra khỏi vùng nhập, giống √.
      // Chuỗi tính vẫn là Abs(...) để dùng chung bộ đánh giá Calculate/Solve.
      if (openText === 'Abs(' && !(plusModel && usesLineInput())) return insertTemplate({ type: 'abs', arg: [] });
      insertText(openText);
      return displayString();
    },

    inputAngleUnit(unit) {
      if (!ANGLE_UNIT_SYMBOLS[unit]) return displayString();
      ensureFreshInputIfNeeded();
      const absorbed = absorbTrailingValue();
      if (absorbed.length === 0) return displayString();
      insertNodes([{ type: 'angle', unit, arg: absorbed }]);
      return displayString();
    },

    // ALPHA+√ — ký hiệu chu kỳ có ô nhập riêng; chỉ có ở Calculate MathI.
    inputRecurringDecimal() {
      if (calcMode !== 'calculate' || usesLineInput()) return displayString();
      ensureFreshInputIfNeeded();
      return insertTemplate({ type: 'recurring', digits: [] });
    },

    // Phím phân số. Đã xác nhận với máy thật (ảnh chụp 2026-08-13): số đang
    // gõ dở ngay trước con trỏ TỰ NHẢY VÀO TỬ SỐ (gõ "5" rồi bấm phím phân
    // số → 5 nằm trên vạch, ô mẫu còn trống chờ nhập), nên con trỏ nhảy
    // xuống mẫu. Nếu trước đó không có số nào thì tạo mẫu rỗng, con trỏ vào
    // tử số.
    // ĐÃ XÁC NHẬN 2026-08-20 (đã sửa theo): máy nuốt cả CỤM TRONG NGOẶC lẫn
    // LỜI GỌI HÀM lên tử số, không chỉ dãy chữ số — xem absorbTrailingNumber.
    inputFraction() {
      // LineI là toán tử trên dòng; sau kết quả tự nối Ans như CASIO.
      if (usesLineInput()) return this.inputOperator('┘');
      ensureFreshInputIfNeeded();

      const absorbed = plusModel ? absorbFractionOperand880() : absorbTrailingNumber();
      const frac = { type: 'frac', num: absorbed, den: [] };
      insertNodes([frac]);
      cursorList = absorbed.length > 0 ? frac.den : frac.num;
      cursorIndex = 0;
      return displayString();
    },

    // Phím ˣ√ (SHIFT+^). Bậc căn gõ TRƯỚC (docs/fx-580VNX_VI.pdf: "ˣ√y" =
    // căn bậc x của y), giống hệt cách phân số nuốt số trước vào tử số —
    // dùng lại absorbTrailingNumber(). Đã xác nhận với máy thật (2026-08-13).
    inputNthRoot() {
      ensureFreshInputIfNeeded();

      const absorbed = absorbTrailingNumber();
      const root = { type: 'nthroot', idx: absorbed, arg: [] };
      insertNodes([root]);
      cursorList = absorbed.length > 0 ? root.arg : root.idx;
      cursorIndex = 0;
      return displayString();
    },

    // Phím log TRẦN — mẫu log cơ số bất kỳ log▫(▫). KHÁC phím phân số/ⁿ√:
    // KHÔNG nuốt số đứng trước (ĐÃ XÁC NHẬN 2026-08-28: "5" rồi log ra
    // "5log▫(▫)", tức 5×log...). Con trỏ vào ô CƠ SỐ trước.
    inputLogN() {
      if (plusModel && usesLineInput()) { insertText('log('); return displayString(); }
      ensureFreshInputIfNeeded();
      const node = { type: 'logn', base: [], arg: [] };
      insertNodes([node]);
      cursorList = node.base;
      cursorIndex = 0;
      return displayString();
    },

    // Phím hỗn số (SHIFT+phân số). Đã xác nhận với máy thật (2026-08-14).
    // Số gõ trước nhảy vào PHẦN NGUYÊN (không phải tử số) — dùng lại
    // absorbTrailingNumber() y hệt inputFraction/inputNthRoot, con trỏ sang
    // tử số nếu có nuốt được gì, ở lại phần nguyên nếu không.
    inputMixedNumber() {
      // [ĐÃ XÁC NHẬN 2026-11-06] BUG-068: phím hỗn số chỉ hoạt động
      // với MathI. Trong LineI phải bỏ qua trước cả bước xóa kết quả cũ.
      if (usesLineInput()) return displayString();
      ensureFreshInputIfNeeded();

      const absorbed = absorbTrailingNumber();
      const mixed = { type: 'mixed', int: absorbed, num: [], den: [] };
      insertNodes([mixed]);
      cursorList = absorbed.length > 0 ? mixed.num : mixed.int;
      cursorIndex = 0;
      return displayString();
    },

    // Phím ∫dx (trần). Thứ tự vùng nhập (thân biểu thức → cận dưới → cận
    // trên) suy theo Σ ngay dưới đây — ĐÃ XÁC NHẬN cho Σ, ngoại suy sang ∫
    // vì cùng kiến trúc mẫu, nhưng CHƯA có ảnh riêng cho ∫. Không nuốt số
    // gõ trước, giống Σ — không có ví dụ máy thật nào gợi ý điều đó ở đây.
    // Tính bằng Gauss-Kronrod thích nghi trong reduceCalcNodes().
    inputIntegral() {
      ensureFreshInputIfNeeded();
      if (plusModel && usesLineInput()) { insertText('∫('); return displayString(); }
      return insertTemplate({ type: 'integral', lower: [], upper: [], body: [] });
    },

    // SHIFT+∫dx. ĐÃ XÁC NHẬN trên giả lập chính thức 2026-09-15: mẫu MathI
    // đặt con trỏ vào thân f(x) trước, ▶ chuyển sang điểm x=a. Phép tính
    // dùng sai phân trung tâm theo manual tr.64.
    inputDerivative() {
      ensureFreshInputIfNeeded();
      if (plusModel && usesLineInput()) { insertText('d/dx('); return displayString(); }
      return insertTemplate({ type: 'derivative', body: [], point: [] });
    },

    // Phím Σ. ĐÃ XÁC NHẬN với máy thật (ảnh chụp màn hình 2026-08-14): là
    // SHIFT+x, KHÔNG PHẢI SHIFT+∫dx như đoán ban đầu từ ảnh bàn phím — xem
    // project_tang5_document_tree. Thứ tự vùng nhập (thân biểu thức → cận
    // dưới → cận trên) CŨNG ĐÃ XÁC NHẬN cùng đợt, sau khi ảnh chụp lần đầu
    // cho thấy đoán ban đầu (cận trước, biểu thức sau, kiểu ⁿ√) sai — xem
    // TEMPLATE_SLOT_FIELDS.sum. Tính ra kết quả thật (vòng lặp cộng
    // nguyên, xem reduceCalcNodes gần đầu file) khi bấm "=".
    inputSum() {
      ensureFreshInputIfNeeded();
      if (plusModel && usesLineInput()) { insertText('Σ('); return displayString(); }
      return insertTemplate({ type: 'sum', lower: [], upper: [], body: [] });
    },

    // ALPHA+x. ĐÃ XÁC NHẬN trên giả lập chính thức 2026-09-15: mẫu Π đặt
    // con trỏ vào thân trước, rồi lần lượt sang cận dưới và cận trên.
    inputProduct() {
      ensureFreshInputIfNeeded();
      if (plusModel && usesLineInput()) { insertText('Π('); return displayString(); }
      return insertTemplate({ type: 'product', lower: [], upper: [], body: [] });
    },

    // Phím x riêng (dùng để gõ biến trong f(x) của Σ/Π/∫) — chỉ chèn một ký
    // tự thường, không phải mẫu.
    inputXVariable() {
      if (pendingRegister === 'sto') {
        pendingRegister = null;
        storeIntoVariable('x');
        return displayString();
      }
      ensureFreshInputIfNeeded();
      insertText(CALC_BOUND_VARIABLE);
      return displayString();
    },

    // π (SHIFT+×10ˣ, xác nhận qua ảnh chụp cận cảnh máy thật 2026-08-14 —
    // lần đọc đầu từ ảnh toàn bàn phím bị lệch, tưởng nhầm là SHIFT+0, đã
    // sửa lại) — bước 2 của "dạng số vô tỉ": chỉ là một hằng số nhập được,
    // chèn MỘT ký tự thường như
    // inputXVariable(), không phải mẫu. CHƯA có dạng chính xác/symbolic
    // riêng cho π ở bước này (evaluateExpressionExact/...Surd tự throw khi
    // gặp token PI, rơi về thập phân — xem kế hoạch bước 2).
    inputPi() {
      ensureFreshInputIfNeeded();
      insertText('π');
      return displayString();
    },

    // Di chuyển con trỏ.
    // ◀/▶ đi theo thứ tự đọc, dùng chung cho MỌI mẫu: gặp một mẫu bên cạnh
    // thì đi vào trong; đang ở cuối một vùng nhập thì nhảy sang vùng kế tiếp
    // của cùng mẫu (tử→mẫu), hết vùng thì bước hẳn ra ngoài mẫu. Chính nước
    // "bước ra ngoài" này là cách thoát khỏi dấu căn và tụt xuống khỏi ô mũ.
    // ▲/▼ chỉ đổi tử ⇄ mẫu của phân số (đã xác nhận máy thật). Trong căn và
    // trong ô mũ thì hai phím này KHÔNG làm gì — ĐÃ XÁC NHẬN 2026-08-20,
    // KHỚP: "√9" rồi ▲ rồi gõ 2 ra "√92" (số 2 vẫn vào trong căn), "2^3" rồi
    // ▼ rồi gõ 5 ra "2³⁵" (số 5 vẫn ở ô mũ).
    placeCursor(list, index) {
      // Chỉ nhận vị trí thuộc bản nhập hiện hành; ảnh lịch sử và cây cũ bị từ chối.
      if (!api.getState().cursorList || !Number.isInteger(index) || index < 0 || index > (list?.length ?? -1)) return false;
      if (list !== root && !findListOwner(root, list)) return false;
      cursorList = list; cursorIndex = index; editUndo = null;
      return true;
    },

    moveCursor(direction, horizontalLimit = 0) {
      editUndo = null;
      if (calcSession && mode === 'error' && (direction === 'left' || direction === 'right')) {
        mode = 'input';
        errorMessage = '';
        if (calcSession.errorSource === 'expression') {
          const original = cloneNodes(calcSession.nodes);
          calcSession = null;
          resetDocument();
          root.push(...original);
          cursorList = root;
          cursorIndex = root.length;
        }
        return displayString();
      }
      if (plusModel && calcSession?.operation === 'solve' && !hasDraft()) {
        if (direction === 'up' || direction === 'down') {
          if (calcSession.phase === 'choose') {
            calcSession.selectedIndex = Math.max(0, Math.min(calcSession.names.length - 1,
              calcSession.selectedIndex + (direction === 'up' ? -1 : 1)));
          } else if (calcSession.phase === 'form' && !calcSession.editingInitial) {
            calcSession.runSelected = direction === 'down';
          } else if (calcSession.phase === 'result' && calcSession.continue) {
            calcSession.continueExitSelected = direction === 'down';
          }
        }
        return displayString();
      }
      if (plusModel && calcSession?.operation === 'calc' && calcSession.phase === 'form' && calcSession.editingField &&
          (direction === 'up' || direction === 'down')) return displayString();
      if (calcSession && calcSession.phase === 'form' && !hasDraft() && !calcSession.editingField) {
        if (direction === 'up' || direction === 'down') {
          const position = calcSession.selectedIndex + Number(!!calcSession.runSelected);
          const next = Math.max(0,Math.min(calcSession.names.length-1+Number(plusModel),position+(direction === 'up' ? -1 : 1)));
          calcSession.selectedIndex = Math.min(next,calcSession.names.length-1);
          if (plusModel) calcSession.runSelected = next === calcSession.names.length;
        }
        return displayString();
      }
      if (calcSession && calcSession.operation === 'solve' && calcSession.phase === 'result' &&
          (direction === 'up' || direction === 'down')) {
        // Solve không phải một mục lịch sử: lên mở phép tính cũ mới nhất,
        // xuống giữ nghiệm; không có lịch sử thì cả hai giữ nguyên.
        if (direction === 'up' && history.length > 0) {
          calcSession = null;
          standaloneResult = null;
          viewIndex = history.length - 1;
          resultDisplayMode = initialResultDisplayMode();
          engExponent = null;
    engineeringEditing = false;
        }
        return displayString();
      }
      if (calcSession && calcSession.phase === 'result') calcSession = null;
      // ĐÃ XÁC NHẬN 2026-08-17: đang gõ dở thì ◀▶ đi trong BIỂU THỨC (gõ
      // "2+3", ◀ rồi DEL ra "23" — ô đang chọn không đổi); không gõ dở thì
      // ◀▶ mới chuyển sang ô hệ số kế tiếp.
      // Table Goto phải thoát lỗi trước khi giao phím cho bộ điều hướng bảng.
      // CASIO 2026-10-20: cả ◀ và ▶ từ Range ERROR đều mở lại f(x).
      if (mode === 'error' && calcMode === 'table' && (direction === 'left' || direction === 'right')) {
        const adjacentNumber=plusModel && errorMessage==='Syntax ERROR' &&
          modeHandler.getState().screen==='table' && implicitNumericPosition880(root);
        mode = 'input';
        errorMessage = '';
        if (adjacentNumber) return displayString();
        if (plusModel && modeHandler.getState().verifyCell) return displayString();
        resetDocument();
        return modeHandler.clearError();
      }
      if (modeHandler && !(handlerIsEditing() && hasDraft())) {
        if (plusModel && emptyCellDraft && (calcMode==='table' && modeHandler.getState().screen==='range' ||
            calcMode==='distribution' && ['params','variable'].includes(modeHandler.getState().screen)))
          return displayString();
        // PLUS 2026-11-23: RIGHT edits the selected Distribution parameter
        // in a blank field, just as EXE does; it does not select the next row.
        if (plusModel && calcMode === 'distribution' && direction === 'right' &&
            modeHandler.openParameterEdit()) return displayString();
        return modeHandler.moveCursor(direction, horizontalLimit);
      }
      // Màn hình lỗi mời "[◀][▶]:Goto" — ĐÃ XÁC NHẬN 2026-08-17: đang ở Math
      // ERROR sau khi bấm 1.5!, bấm ◀ thì màn hình quay lại chính biểu thức
      // "1.5!" để sửa, KHÔNG xoá đi. Trước đây ◀▶ ở trạng thái lỗi rơi vào
      // ensureFreshInputIfNeeded và xoá sạch biểu thức — mất công gõ lại.
      // (AC vẫn là "Cancel", tức xoá — xem clear().)
      if (mode === 'error' && (direction === 'left' || direction === 'right')) {
        const owner = plusModel && errorMessage === 'Math ERROR' ? findListOwner(root,cursorList) : null;
        // PLUS 2026-11-23: when the final literal power is in range but
        // the outer arithmetic overflows, Goto leaves it for the baseline.
        // An overflowing exponent expression (99²) retains its inner caret.
        const exponentText = owner?.node.type === 'times10' && owner.node.literalMultiply && owner.node.exp.every(n => n.type === 'char')
          ? owner.node.exp.map(n => n.ch).join('').replace(/−/g, '-') : '';
        const finiteLiteralPower = /^-?\d+(?:\.\d*)?$/.test(exponentText) &&
          Number(exponentText) >= -99 && Number(exponentText) <= 99;
        if (owner && (finiteLiteralPower ||
            ['frac','mixed'].includes(owner.node.type) && cursorList === owner.node.den)) {
          cursorList = owner.parentList;
          cursorIndex = owner.index + 1;
        }
        // CASIO07/11: invalid unary (-) is selected by Goto, even when
        // nested in a radical/fraction. Other error types keep their cursor.
        if(errorMessage==='Syntax ERROR')try {serializeForEval(root);}catch(error) {
          if(error.expressionNode) {
            const at=expressionNodePosition(root,error.expressionNode);
            if(at){cursorList=at.list;cursorIndex=at.index;}
          }
        }
        mode = 'input';
        errorMessage = '';
        return displayString();
      }

      // ===== Lịch sử phép tính: ▲▼ cuộn, ◀▶ mở ra sửa =====
      // Cả đặc tả lẫn ngày đối chiếu nằm ở khai báo `history` phía trên.
      // Trước đây mọi mũi tên trên màn hình kết quả đều rơi xuống
      // ensureFreshInputIfNeeded() và xoá sạch — đó chính là chỗ phải chặn.
      if (mode === 'result' && (direction === 'up' || direction === 'down')) {
        const next = viewIndex + (direction === 'up' ? -1 : 1);
        if (next >= 0 && next < history.length) {
          viewIndex = next;
          // Đổi mục thì chu trình S⇔D bắt đầu lại từ bước đầu — ĐÃ XÁC NHẬN
          // 2026-08-20: đổi mục 1÷3 sang 0.‹3›, cuộn đi rồi cuộn về thì nó
          // hiện lại 1/3, tức trạng thái S⇔D KHÔNG lưu theo từng mục.
          resultDisplayMode = initialResultDisplayMode(viewEntry().nodes);
          engExponent = null;
    engineeringEditing = false;
        }
        // Đến hai đầu thì bấm thêm KHÔNG làm gì: không quay vòng, không báo
        // lỗi, và ▼ ở mục mới nhất KHÔNG trả về dòng nhập trống.
        return displayString();
      }
      // Dòng nhập TRỐNG: ▲ đưa vào lịch sử ở mục mới nhất (sau AC vẫn cuộn
      // lại được — AC không xoá lịch sử). Đang gõ dở thì ▲ KHÔNG làm gì: ĐÃ
      // XÁC NHẬN 2026-08-20 bằng ca "7+", lúc đó mũi tên thuộc về việc di
      // chuyển con trỏ trong biểu thức nên cứ để rơi xuống nhánh dưới.
      if (mode === 'input' && direction === 'up' && root.length === 0 && history.length > 0) {
        viewIndex = history.length - 1;
        mode = 'result';
        resultDisplayMode = initialResultDisplayMode(viewEntry().nodes);
        engExponent = null;
    engineeringEditing = false;
        return displayString();
      }
      // "Hiển thị lại" (manual tr.44): ◀/▶ trên màn hình kết quả mở chính mục
      // đang xem ra để sửa — dòng kết quả biến mất, biểu thức thành gõ được.
      // ◀ đặt con trỏ ở CUỐI, ▶ ở ĐẦU. ĐÃ XÁC NHẬN 2026-08-20 bằng hai ca
      // phân biệt được: ◀ rồi DEL xoá số cuối của "4×3+2"; ▶ rồi gõ 9 vào
      // "5×2" ra "95×2". Mục gốc VẪN CÒN trong lịch sử, bản sửa thành mục mới.
      if (plusModel && mode === 'result' && (viewEntry().coordinateResult || viewEntry().complex !== undefined) &&
          horizontalLimit > 0 && (direction === 'left' || direction === 'right')) {
        const entry = viewEntry();
        const field = entry.coordinateResult ? 'coordinateHorizontalOffset' : 'complexHorizontalOffset';
        entry[field] = Math.max(0,Math.min(horizontalLimit,(entry[field] || 0)+(direction === 'right' ? 8 : -8)));
        return displayString();
      }
      if (mode === 'result' && (direction === 'left' || direction === 'right')) {
        const recalled = cloneNodes(viewEntry().nodes);
        resetDocument();
        root.push(...recalled);
        cursorList = root;
        cursorIndex = direction === 'left' ? root.length : 0;
        mode = 'input';
        frozenExpression = '';
        frozenNodes = [];
        viewIndex = null;
        return displayString();
      }

      if (mode !== 'input') {
        ensureFreshInputIfNeeded();
      }
      if (plusModel && calcMode === 'base-n' && root.length && (direction === 'up' || direction === 'down')) {
        cursorList = root;
        cursorIndex = direction === 'up' ? 0 : root.length;
        return displayString();
      }

      // On PLUS the horizontal path follows the printed order of bounds and
      // body. The initial insertion point still belongs to the body.
      const horizontalSlots = node => plusModel && ['integral','sum','product'].includes(node.type)
        ? [node.upper, node.lower, node.body] : templateSlots(node);
      const wrapScalar=plusModel && !usesLineInput() && ['calculate','verify','complex'].includes(calcMode) &&
        !calcSession;

      if (direction === 'left') {
        if (cursorIndex > 0) {
          const slots = horizontalSlots(cursorList[cursorIndex - 1]);
          if (slots.length > 0) {
            cursorList = slots[slots.length - 1];
            cursorIndex = cursorList.length;
          } else {
            const run = cursorList[cursorIndex - 1].ch === '('
              ? matchFunctionOpenBefore(cursorList, cursorIndex) : 0;
            const memory = plusModel && !usesLineInput() && [6, 3].find(length =>
              cursorIndex >= length && matchMemoryTokenAt(cursorList, cursorIndex - length) === length);
            cursorIndex -= run || memory || 1;
          }
        } else {
          const owner = findListOwner(root, cursorList);
          if (owner) {
            const slots = horizontalSlots(owner.node);
            const previous = plusModel && !usesLineInput() && owner.node.type === 'frac'
              ? null : slots[slots.indexOf(cursorList) - 1];
            cursorList = previous || owner.parentList;
            cursorIndex = previous ? previous.length : owner.index;
          } else if (wrapScalar) cursorIndex=root.length;
        }
      } else if (direction === 'right') {
        if (cursorIndex < cursorList.length) {
          const slots = horizontalSlots(cursorList[cursorIndex]);
          if (slots.length > 0) {
            cursorList = slots[0];
            cursorIndex = 0;
          } else {
            cursorIndex += matchFunctionOpenAt(cursorList, cursorIndex) ||
              (plusModel && !usesLineInput() && matchMemoryTokenAt(cursorList, cursorIndex)) || 1;
          }
        } else {
          const owner = findListOwner(root, cursorList);
          if (owner) {
            const slots = horizontalSlots(owner.node);
            // PLUS: RIGHT from either integration bound enters the integrand.
            // LEFT keeps its existing path; the bound columns are not a cycle.
            const next = plusModel && owner.node.type === 'integral' &&
                [owner.node.lower, owner.node.upper].includes(cursorList)
              ? owner.node.body
              : plusModel && !usesLineInput() && owner.node.type === 'frac'
                ? null : slots[slots.indexOf(cursorList) + 1];
            cursorList = next || owner.parentList;
            cursorIndex = next ? 0 : owner.index + 1;
          } else if (wrapScalar) cursorIndex=0;
        }
      } else if (direction === 'up' || direction === 'down') {
        // CASIO 2026-10-20 / 2026-11-04: tìm mẫu hai chiều gần nhất,
        // kể cả khi đang ở trong căn/Abs. Phần nguyên hỗn số là một ô riêng;
        // cận trên/dưới Σ/Π/∫ dùng hướng hình học, không theo thứ tự ▶.
        let owner = findListOwner(root, cursorList);
        while (owner) {
          const type = owner.node.type;
          let wantSlot = null;
          if (type === 'frac') wantSlot = direction === 'up' ? 0 : 1;
          else if (type === 'mixed') {
            if (owner.slotIndex === 0) break;
            wantSlot = direction === 'up' ? 1 : 2;
          } else if (type === 'integral' || type === 'sum' || type === 'product') {
            wantSlot = direction === 'up' ? 2 : 1;
          }
          if (wantSlot !== null) {
            if (owner.slotIndex !== wantSlot) {
              let destination=null;
              if(type==='frac') {
                const source=fractionCursorLayout(owner.slots[owner.slotIndex]);
                const target=fractionCursorLayout(owner.slots[wantSlot]);
                if(source && target) {
                  const column=fractionCursorColumn(source,cursorList,cursorIndex);
                  if(column!==null)destination=fractionCursorAtColumn(target,
                    column+(target.width-source.width)/2);
                }
              }
              cursorList = destination ? destination.list : owner.slots[wantSlot];
              cursorIndex = destination ? destination.index : Math.min(cursorIndex, cursorList.length);
            }
            break;
          }
          owner = findListOwner(root, owner.parentList);
        }
      }

      return displayString();
    },

    // ===== Chuyển phương thức tính toán (menu MENU) =====
    // Đổi mode thì xoá sạch màn hình đang gõ, giống bấm AC — biểu thức của
    // mode này không mang sang mode kia được (một chuỗi có dấu "=" của Verify
    // đem sang Calculate là vô nghĩa). Ans và biến A-F/M thì GIỮ NGUYÊN:
    // manual trang 176 nói rõ biến mang giá trị đang gán khi dùng trong
    // Verify, nên chúng là kho dùng chung giữa các mode.
    setCalcMode(name, reenter = false) {
      if (plusModel && calcMode === 'distribution' && name !== calcMode) distributionRows.length = 0;
      registeredEditor = null;
      variableEditor = null;
      // CASIO 2026-10-05: rời Matrix xóa cả MatA-D và MatAns.
      arrayResultExpression = null;
      if (calcMode === 'matrix' && name !== 'matrix') {
        if (plusModel) matrixMemory.MatAns = null;
        else Object.keys(matrixMemory).forEach(key => { matrixMemory[key] = null; });
      }
      if (calcMode === 'vector' && name !== 'vector') {
        if (plusModel) vectorMemory.VctAns = null;
        else Object.keys(vectorMemory).forEach(key => { vectorMemory[key] = null; });
      }
      if (calcMode === 'complex' && name !== 'complex') {
        if (!plusModel) { ansComplex = null; ansComplexAlgebraic = null; }
        complexVerify = false;
        if (!plusModel) {
          Object.keys(variablesImaginary).forEach(key => { variablesImaginary[key] = 0; });
          Object.keys(variablesComplexAlgebraic).forEach(key => { variablesComplexAlgebraic[key] = null; });
        }
      }
      // On PLUS, choosing Calculate again from HOME also clears PreAns.
      // Internal mode resets can retain it (Settings & Data).
      if (calcMode === 'calculate' &&
          ((name !== 'calculate' && !(plusModel && name === 'verify')) || (plusModel && reenter))) {
        preAns = 0;
        variablesExact.PreAns = ZERO_FRACTION;
        variablesExactSurd.PreAns = ZERO_SURD;
        variablesExactPi.PreAns = null;
      }
      calcMode = name;
      // ĐÃ XÁC NHẬN 2026-08-20: đổi phương thức tính toán XOÁ SẠCH lịch sử
      // (về lại Calculate thì màn hình trắng và mất cả chỉ báo ▲).
      wipeScreenAndHistory();
      // Mode có màn hình nhập riêng thì dựng handler; mode dùng bộ soạn thảo
      // biểu thức (Calculate/Verify) thì gỡ handler đi.
      // Các biến tính toán chỉ có hiệu lực trong màn Statistics đang mở.
      // Dữ liệu của PLUS được giữ trong plusStatisticsHandler khi đổi ứng dụng.
      statisticsValues = null;
      if (name === 'ratio') {
        modeHandler = createRatioHandler();
      } else if (name === 'equation') {
        modeHandler = createEquationHandler();
      } else if (name === 'inequality') {
        modeHandler = createInequalityHandler();
      } else if (name === 'statistics') {
        if (plusModel) {
          plusStatisticsHandler ||= createStatisticsHandler();
          modeHandler = plusStatisticsHandler;
        } else modeHandler = createStatisticsHandler();
      } else if (name === 'distribution') {
        modeHandler = createDistributionHandler();
      } else if (name === 'table') {
        modeHandler = createTableHandler();
      } else if (name === 'matrix') {
        modeHandler = createMatrixHandler(matrixMemory);
      } else if (name === 'vector') {
        modeHandler = createVectorHandler(vectorMemory);
      } else {
        modeHandler = null;
      }
      // Vào Base-N thì cơ số về mặc định Dec.
      if (name === 'base-n') {
        baseNRadix = 'dec';
      }
    },

    getCalcMode() {
      return calcMode;
    },

    // Cổng xuất dữ liệu cho ứng dụng khác (bridge.js, xem docs/CONG-XUAT-DU-LIEU.md).
    // Chỉ ĐỌC trạng thái, không đổi màn hình, con trỏ hay phép tính.
    // v: phiên bản định dạng. Tính toán: biểu thức (nhập đang gõ hoặc mục kết
    // quả đang xem) và giá trị; Bảng, Thống kê: do handler của mode trả.
    exportData() {
      const base = { v: 1, mode: calcMode, angleUnit };
      // Đang báo lỗi: thêm `error` (loại lỗi, biểu thức gây lỗi dạng cây và
      // vị trí node lỗi khi máy biết) để trang chứa giải thích cách sửa.
      if (mode === 'error') base.error = exportErrorInfo();
      if (modeHandler && typeof modeHandler.exportData === 'function') {
        return { ...base, ...modeHandler.exportData() };
      }
      if (calcMode === 'calculate') {
        if (calcSession?.phase === 'form' || calcSession?.operation === 'solve') {
          return { ...base, unsupported: true };
        }
        const entry = mode === 'result' ? viewEntry() : null;
        const nodes = entry?.nodes || (mode === 'input' ? root : []);
        const value = Number.isFinite(entry?.value) ? entry.value : null;
        return {
          ...base,
          angleUnit: entry?.angleUnit ?? angleUnit,
          expr: !entry?.calc && nodes.length ? serializeForExchange(nodes) : null,
          text: nodes.length ? serializeForDisplay(nodes) : '',
          value
        };
      }
      return { ...base, unsupported: true };
    },

    // Các lệnh điều hướng màn hình của OPTN Matrix.
    matrixCommand(name) {
      if (calcMode !== 'matrix' || !modeHandler ||
          typeof modeHandler.command !== 'function') return displayString();
      resetDocument();
      mode = 'input';
      errorMessage = '';
      return modeHandler.command(name);
    },

    inputMatrixToken(name) {
      const allowed = ['MatA', 'MatB', 'MatC', 'MatD', 'MatAns'];
      if (calcMode !== 'matrix' || !modeHandler || !allowed.includes(name)) {
        return displayString();
      }
      if (typeof modeHandler.showingResult === 'function' && modeHandler.showingResult()) {
        resetDocument();
        modeHandler.startCalculation();
        mode = 'input';
      }
      if (handlerOwnsInput()) return displayString();
      ensureFreshInputIfNeeded();
      insertNodes([{ type: 'char', ch: name, matrix: true }]);
      return displayString();
    },

    inputMatrixFunction(name) {
      const functions = { Det: 'Det(', Trn: 'Trn(', Identity: 'Identity(' };
      if (calcMode !== 'matrix' || !modeHandler || !functions[name]) return displayString();
      if (typeof modeHandler.showingResult === 'function' && modeHandler.showingResult()) {
        resetDocument();
        modeHandler.startCalculation();
        mode = 'input';
      }
      if (handlerOwnsInput()) return displayString();
      ensureFreshInputIfNeeded();
      insertText(functions[name]);
      return displayString();
    },

    getMatrixMemory() {
      return calcMode === 'matrix' && modeHandler && typeof modeHandler.getMemory === 'function'
        ? modeHandler.getMemory()
        : null;
    },

    vectorCommand(name) {
      if (calcMode !== 'vector' || !modeHandler ||
          typeof modeHandler.command !== 'function') return displayString();
      resetDocument();
      mode = 'input';
      errorMessage = '';
      return modeHandler.command(name);
    },

    inputVectorToken(name) {
      const allowed = ['VctA', 'VctB', 'VctC', 'VctD', 'VctAns'];
      if (calcMode !== 'vector' || !modeHandler || !allowed.includes(name)) {
        return displayString();
      }
      if (typeof modeHandler.showingResult === 'function' && modeHandler.showingResult()) {
        resetDocument();
        modeHandler.startCalculation();
        mode = 'input';
      }
      if (handlerOwnsInput()) return displayString();
      ensureFreshInputIfNeeded();
      insertNodes([{ type: 'char', ch: name, vector: true }]);
      return displayString();
    },

    inputVectorFunction(name) {
      const functions = { Angle: 'Angle(', UnitV: 'UnitV(' };
      if (calcMode !== 'vector' || !modeHandler || !functions[name]) return displayString();
      if (typeof modeHandler.showingResult === 'function' && modeHandler.showingResult()) {
        resetDocument();
        modeHandler.startCalculation();
        mode = 'input';
      }
      if (handlerOwnsInput()) return displayString();
      ensureFreshInputIfNeeded();
      insertText(functions[name]);
      return displayString();
    },

    inputVectorDot() {
      if (calcMode !== 'vector' || handlerOwnsInput()) return displayString();
      ensureFreshInputIfNeeded();
      insertText('•');
      return displayString();
    },

    getVectorMemory() {
      return calcMode === 'vector' && modeHandler && typeof modeHandler.getMemory === 'function'
        ? modeHandler.getMemory()
        : null;
    },

    // Chọn kiểu tỷ lệ ở mode Ratio ('ABXD' | 'ABCX'). Máy thật hỏi ngay khi
    // vào mode, và đổi lại được qua OPTN → Select Type.
    setRatioType(typeId) {
      if (!modeHandler) return;
      mode = 'input';
      errorMessage = '';
      modeHandler.setType(typeId);
    },

    // Chọn kiểu phương trình ở mode Equation/Func ('simul2'…'poly4'). Máy
    // thật hỏi ngay khi vào mode, đổi lại được qua OPTN → Select Type.
    setEquationType(typeId) {
      if (!modeHandler) return;
      mode = 'input';
      errorMessage = '';
      modeHandler.setType(typeId);
    },

    // Dùng bởi test/đường tích hợp; UI người dùng chọn bậc và quan hệ bằng
    // phím số trực tiếp trên hai màn hình đầu.
    setInequalityType(typeId) {
      if (!modeHandler || calcMode !== 'inequality' ||
          typeof modeHandler.setType !== 'function') return;
      mode = 'input';
      errorMessage = '';
      resetDocument();
      modeHandler.setType(typeId);
      return displayString();
    },

    inequalityCommand(name) {
      if (!modeHandler || calcMode !== 'inequality' ||
          typeof modeHandler.command !== 'function') return displayString();
      resetDocument();
      mode = 'input';
      errorMessage = '';
      modeHandler.command(name);
      return displayString();
    },

    // Chọn kiểu tính toán thống kê ('1var'…'inverse'). Máy hỏi ngay khi vào
    // mode, đổi lại được qua OPTN → Select Type. Đổi kiểu XOÁ dữ liệu.
    setStatisticsType(typeId) {
      if (!modeHandler) return;
      mode = 'input';
      errorMessage = '';
      resetDocument();
      modeHandler.setType(typeId);
      return displayString();
    },

    // Chọn kiểu Distribution và đường nhập Variable/List.
    setDistributionType(typeId, inputMethod) {
      if (!modeHandler || calcMode !== 'distribution') return;
      mode = 'input';
      errorMessage = '';
      resetDocument();
      modeHandler.setType(typeId, inputMethod);
      return displayString();
    },

    // Các mục Editor của Distribution List.
    distributionCommand(name) {
      if (!modeHandler || calcMode !== 'distribution' ||
          typeof modeHandler.command !== 'function') return displayString();
      resetDocument();
      mode = 'input';
      errorMessage = '';
      try {
        return modeHandler.command(name);
      } catch (e) {
        mode = 'error';
        errorMessage = e instanceof EngineError ? e.message : 'Math ERROR';
        return displayString();
      }
    },

    // Các mục OPTN của mode Statistics không phải "chọn kiểu":
    // 'data' (về bảng dữ liệu), 'calc' (màn hình tính), 'stats'
    // (1-Variable Calc), 'insert-row', 'delete-all'.
    statisticsCommand(name) {
      if (!modeHandler || typeof modeHandler.command !== 'function') return displayString();
      resetDocument();
      // Màn hình tính là dòng nhập thường, nên phải đưa engine về đúng trạng
      // thái đó — nếu không, phím số đầu tiên sẽ rơi vào nhánh "đang xem kết
      // quả" và bị nuốt.
      mode = 'input';
      errorMessage = '';
      viewIndex = null;
      frozenExpression = '';
      frozenNodes = [];
      try {
        return modeHandler.command(name);
      } catch (e) {
        mode = 'error';
        errorMessage = e instanceof EngineError ? e.message : 'Math ERROR';
        return displayString();
      }
    },

    // Chèn một biến/hàm thống kê (x̄, Σx, Med, x̂, ŷ...) vào biểu thức đang gõ.
    // Node vẫn là 'char' để màn hình vẽ đúng và DEL gỡ nguyên cụm một lần; cờ
    // `stat` mới là thứ phân biệt nó với chữ cái thường (xem STAT_MARK).
    inputStatVariable(token) {
      if (STAT_TOKEN_FIELDS[token] === undefined && STAT_FUNC_TOKENS[token] === undefined) {
        return displayString();
      }
      // Chỉ chèn được ở chỗ có dòng nhập: màn hình TÍNH của Statistics. Máy
      // cũng chỉ đưa ba menu con Summation/Variable/Min/Max ra ở đó.
      if (handlerOwnsInput()) return displayString();
      ensureFreshInputIfNeeded();
      insertNodes([{ type: 'char', ch: token, stat: true }]);
      return displayString();
    },

    // ===== Base-N API =====
    // Cơ số hiện hành, hoặc null nếu không ở mode Base-N. ui.js đọc để vẽ chỉ
    // báo [Dec]/[Hex]/[Bin]/[Oct] và chặn phím đổi nghĩa.
    getBaseNBase() {
      return calcMode === 'base-n'
        ? { id: baseNRadix, label: BASE_N_BASES[baseNRadix].label }
        : null;
    },

    // Đổi cơ số (phím DEC/HEX/BIN/OCT). Đặt cơ số nhập, và nếu đang hiện kết
    // quả thì nó tự vẽ lại theo cơ số mới (getState định dạng theo baseNRadix)
    // — ĐÃ XÁC NHẬN 2026-08-28: 30(Dec) rồi BIN hiện nhị phân của 30.
    baseNConvert(baseId) {
      if (calcMode !== 'base-n' || !BASE_N_BASES[baseId]) return displayString();
      baseNRadix = baseId;
      return displayString();
    },

    // Nhập một chữ hex A-F ở mode Base-N (phím (−)/°′″/x⁻¹/sin/cos/tan). Chèn
    // như một ký tự thường; hợp lệ hay không do evaluateBaseN kiểm lúc "=".
    inputBaseNLetter(ch) {
      if (calcMode !== 'base-n') return displayString();
      ensureFreshInputIfNeeded();
      insertText(ch);
      return displayString();
    },

    // Chèn một token logic của menu OPTN Base-N: toán tử infix and/or/xor/xnor,
    // hoặc chữ tiền tố cơ số d/h/b/o. Chèn dạng chuỗi phẳng (char thường) —
    // evaluateBaseN phân giải lúc "=". Hàm Neg(/Not( KHÔNG đi qua đây; chúng
    // dùng inputFunction như mọi hàm mở ngoặc khác.
    inputBaseNToken(text) {
      if (calcMode !== 'base-n') return displayString();
      ensureFreshInputIfNeeded();
      insertText(text);
      return displayString();
    },

    // Kiểu tính toán thống kê đang chọn (đối tượng trong STATISTICS_TYPES),
    // hoặc null nếu không ở mode Statistics. ui.js đọc để vẽ đúng menu OPTN.
    getStatisticsType() {
      return modeHandler && typeof modeHandler.getType === 'function'
        ? modeHandler.getType() : null;
    },

    hasStatisticsData() {
      return calcMode === 'statistics' && !!modeHandler?.hasData();
    },

    getDistributionType() {
      return calcMode === 'distribution' && modeHandler && typeof modeHandler.getType === 'function'
        ? modeHandler.getType() : null;
    },

    // Nhãn góc phải của mode có màn hình tính riêng (hiện chỉ Statistics).
    getModeCorner() {
      if(calcMode==='verify') return ['Verify'];
      return modeHandler && typeof modeHandler.cornerLabel === 'function'
        ? modeHandler.cornerLabel()
        : null;
    },

    // Chèn một toán tử quan hệ (= ≠ > < ≧ ≦) vào biểu thức đang gõ.
    inputMultiStatement() {
      ensureFreshInputIfNeeded();
      insertText(':');
      return displayString();
    },

    calc() {
      if (!['calculate', 'complex'].includes(calcMode) || mode === 'error') return displayString();
      if (calcSession && (calcSession.operation === 'calc' || calcSession.phase !== 'result')) {
        if (calcSession.phase === 'result') {
          if (calcSession.names.length) openCalcForm(); else runCalcStatement();
        }
        return displayString();
      }
      const nodes = calcSession ? cloneNodes(calcSession.nodes)
        : mode === 'result' ? cloneNodes(viewEntry().nodes) : cloneNodes(root);
      if (!nodes.length) return displayString();
      try {
        const statements = calcStatements(nodes);
        const names = [];
        for (const statement of statements) {
          for (const name of calcVariableNames(statement.valueNodes)) if (!names.includes(name)) names.push(name);
        }
        calcSession = { operation: 'calc', nodes, statements, names, selectedIndex: 0, statementIndex: 0, phase: 'form', errorSource: null };
        if (names.length) openCalcForm(); else runCalcStatement();
      } catch (e) {
        calcSession = null;
        mode = 'error';
        errorMessage = e instanceof EngineError ? e.message : 'Math ERROR';
      }
      return displayString();
    },

    backFromCalc() {
      if (!plusModel || calcSession?.operation !== 'calc') return false;
      if (mode === 'error' && calcSession.errorSource === 'draft') {
        mode = 'input';
        errorMessage = '';
        calcSession.errorSource = null;
        return true;
      }
      if (mode !== 'error' && calcSession.phase === 'form' && (hasDraft() || calcSession.editingField)) {
        resetDocument();
        calcSession.editingField = false;
      }
      else {
        const nodes = cloneNodes(calcSession.nodes);
        const target = mode === 'error' && calcSession.errorTarget
          ? correspondingCalculusList880(nodes,calcSession.nodes,calcSession.errorTarget) : null;
        calcSession = null;
        resetDocument();
        root.push(...nodes);
        cursorList = target || root;
        cursorIndex = cursorList.length;
      }
      mode = 'input';
      errorMessage = '';
      return true;
    },

    solve() {
      if (calcMode !== 'calculate' || mode === 'error') return displayString();
      // CASIO 2026-11-02: SHIFT CALC trong form không đổi operation hoặc
      // bỏ draft/ô đang chọn. Chuyển CALC→SOLVE chỉ từ biểu thức/kết quả.
      if (calcSession && calcSession.phase === 'form') return displayString();
      if (calcSession && calcSession.operation === 'solve') {
        if (calcSession.phase === 'result') openCalcForm();
        return displayString();
      }
      const nodes = calcSession ? cloneNodes(calcSession.nodes)
        : mode === 'result' ? cloneNodes(viewEntry().nodes) : cloneNodes(root);
      if (!nodes.length) return displayString();
      try {
        // Hai vế giữ thứ tự xuất hiện biến trong biểu thức gốc.
        const names = calcVariableNames(nodes.filter(node => node.ch !== '=' && node.ch !== ':'));
        if (!names.length) throw new EngineError('Variable ERROR');
        calcSession = { operation: 'solve', nodes, names, selectedIndex: 0,
          statementIndex: 0, phase: 'form', errorSource: null };
        openCalcForm();
        if (plusModel && names.length > 1) calcSession.phase = 'choose';
        else if (plusModel) openPlusSolveForm();
      } catch (e) {
        calcSession = null;
        mode = 'error';
        errorMessage = e instanceof EngineError ? e.message : 'Math ERROR';
      }
      return displayString();
    },

    backFromSolve() {
      if (!plusModel || calcSession?.operation !== 'solve') return false;
      if (mode !== 'error' && calcSession.phase === 'form' && (hasDraft() || calcSession.editingInitial)) {
        calcSession.editingInitial = false;
        resetDocument();
      } else goBackPlusSolve(mode === 'error' && calcSession.errorSource === 'expression');
      return true;
    },

    inputRelational(op) {
      if (!VERIFY_OPERATORS.includes(op)) {
        return displayString();
      }
      // Trên màn hình kết quả, toán tử quan hệ chèn "Ans" vào trước y hệt
      // + − × ÷ — ĐÃ XÁC NHẬN 2026-08-20: Verify "1+1=2" ra True, bấm dấu "="
      // quan hệ thì màn hình thành "Ans=". Bản trước bắt đầu biểu thức mới vì
      // hành vi chèn Ans mới chỉ được xác nhận cho bốn phép tính; nay đã bấm
      // riêng cho toán tử quan hệ nên gộp về cùng một luật.
      if (mode === 'result') {
        resetDocument();
        insertText('Ans' + op);
        mode = 'input';
        frozenExpression = '';
        frozenNodes = [];
        viewIndex = null;
        return displayString();
      }
      ensureFreshInputIfNeeded();
      insertText(op);
      return displayString();
    },

    // SHIFT+9: CASIO 2026-10-05. Memory giữ mode, thiết lập, lịch sử và
    // dữ liệu của handler; Setup Data về Calculate và giữ Ans/PreAns/biến.
    // Language/Contrast thuộc UI, không bị ba thao tác này thay đổi.
    resetCalculator(kind) {
      if (!['setup', 'memory', 'all'].includes(kind)) return displayString();
      editUndo = null;
      if (kind !== 'memory') {
        overwriteInput = false;
        inputOutput = 'mathio';
        angleUnit = 'deg';
        numberFormat = { kind: 'norm', digits: 1 };
        engineerSymbol = false;
        recurringDecimalEnabled = true;
        fractionResultFormat = 'improper';
        complexFormat = 'rect';
        complexVerify = false;
        storeRegisteredFunction('f', []);
        storeRegisteredFunction('g', []);
        statisticsFrequency = false;
        plusStatisticsHandler = null;
        equationComplexResults = true;
        tableFunctions = 'fg';
        decimalMark = 'dot';
        digitSeparatorEnabled = false;
        this.setCalcMode('calculate');
      }
      if (kind !== 'setup') {
        ans = 0;
        preAns = 0;
        ansComplex = null;
        ansComplexAlgebraic = null;
        ansExact = ZERO_FRACTION;
        ansExactSurd = ZERO_SURD;
        ansExactPi = null;
        variables = Object.fromEntries(VARIABLE_NAMES.map(name => [name, 0]));
        variablesImaginary = Object.fromEntries(VARIABLE_NAMES.map(name => [name, 0]));
        variablesComplexAlgebraic = Object.fromEntries(VARIABLE_NAMES.map(name => [name, null]));
        variablesExact = Object.fromEntries([...VARIABLE_NAMES, 'PreAns'].map(name => [name, ZERO_FRACTION]));
        variablesExactSurd = Object.fromEntries([...VARIABLE_NAMES, 'PreAns'].map(name => [name, ZERO_SURD]));
        variablesExactPi = Object.fromEntries([...VARIABLE_NAMES, 'PreAns'].map(name => [name, null]));
      }
      if (kind === 'all' || (plusModel && kind === 'setup')) {
        distributionValues.clear();
        distributionRows.length = 0;
        Object.keys(matrixMemory).forEach(name => { matrixMemory[name] = null; });
        Object.keys(vectorMemory).forEach(name => { vectorMemory[name] = null; });
      }
      calcSession = null;
      pendingRegister = null;
      resetDocument();
      mode = 'input';
      frozenExpression = '';
      frozenNodes = [];
      errorMessage = '';
      viewIndex = null;
      standaloneResult = null;
      resultDisplayMode = initialResultDisplayMode();
      engExponent = null;
    engineeringEditing = false;
      return displayString();
    },

    setAngleUnit(unit) {
      if (ANGLE_UNIT_SYMBOLS[unit]) angleUnit = unit;
    },

    // format: { kind: 'norm'|'fix'|'sci', digits }. Norm nhận 1-2, Fix và
    // Sci nhận 0-9 (Sci 0 nghĩa là 10 chữ số có nghĩa).
    setNumberFormat(format) {
      numberFormat = format;
    },

    // Mục SETUP `Input/Output`. Đổi mục này XOÁ SẠCH màn hình và lịch sử —
    // xem chú thích ở wipeScreenAndHistory(). Chuyển ứng dụng PLUS dùng định dạng
    // nhập riêng (Bảng tính/Đường thẳng số) nhưng vẫn giữ các hàm f/g đã đăng ký.
    setInputOutput(value, {preserveRegisteredFunctions = false} = {}) {
      if (['mathio', 'mathido', 'lineio', 'lineido'].includes(value)) {
        if (plusModel) overwriteInput = false;
        if (plusModel && !preserveRegisteredFunctions && value.startsWith('line') !== inputOutput.startsWith('line')) {
          storeRegisteredFunction('f', []);
          storeRegisteredFunction('g', []);
        }
        inputOutput = value;
      }
      wipeScreenAndHistory();
    },

    getInputOutput() {
      return inputOutput;
    },

    setRecurringDecimal(on) {
      recurringDecimalEnabled = !!on;
      // Nếu người dùng tắt trong lúc kết quả tuần hoàn đang hiện, CASIO
      // không còn một dạng hợp lệ để vẽ; chuyển ngay sang thập phân thường.
      if (!recurringDecimalEnabled && resultDisplayMode === 'recurring') {
        resultDisplayMode = 'decimal';
      }
      return displayString();
    },

    getRecurringDecimal() {
      return recurringDecimalEnabled;
    },

    setFractionResult(value) {
      fractionResultFormat = value === 'mixed' ? 'mixed' : 'improper';
      return displayString();
    },

    getFractionResult() {
      return fractionResultFormat;
    },

    setEquationComplexResults(on) {
      equationComplexResults = !!on;
      return displayString();
    },

    getEquationComplexResults() {
      return equationComplexResults;
    },

    equationVerificationCommand(command) {
      if(!plusModel || calcMode!=='equation') return;
      resetDocument();
      mode='input';
      modeHandler.verificationCommand(command);
    },

    setDecimalMark(value) {
      decimalMark = value === 'comma' ? 'comma' : 'dot';
      return displayString();
    },

    getDecimalMark() {
      return decimalMark;
    },

    getResultSeparator() {
      return decimalMark === 'comma' ? ';' : ',';
    },

    setDigitSeparator(on) {
      digitSeparatorEnabled = !!on;
      return displayString();
    },

    getDigitSeparator() {
      return digitSeparatorEnabled;
    },

    setEngineerSymbol(on) {
      engineerSymbol = !!on;
    },

    getEngineerSymbol() {
      return engineerSymbol;
    },

    // Mục SETUP `Statistics` (trang 2, mục 3) — máy hỏi "Frequency?" rồi
    // "1:On" "2:Off". Bật lên thì bảng dữ liệu có thêm cột Freq và trần dòng
    // tụt 160 → 80. Đổi thiết lập XOÁ SẠCH dữ liệu mẫu (manual tr.120, và
    // ĐÃ XÁC NHẬN 2026-08-26).
    setStatisticsFrequency(on) {
      statisticsFrequency = !!on;
      const handler = plusModel ? plusStatisticsHandler : modeHandler;
      if (handler && typeof handler.setFrequency === 'function') {
        handler.setFrequency();
      }
      return displayString();
    },

    getStatisticsFrequency() {
      return statisticsFrequency;
    },

    // Mục SETUP `Table` (manual tr.14): `f` = chỉ f(x), `fg` = f(x),g(x).
    // Đổi thiết lập khi đang ở Table khởi tạo lại luồng nhập hàm để không giữ
    // nửa bảng theo cấu hình cũ; các mode khác chỉ ghi nhớ cho lần vào Table.
    setTableFunctions(value) {
      tableFunctions = value === 'f' || (plusModel && value === 'g') ? value : 'fg';
      if (calcMode === 'table') {
        resetDocument();
        mode = 'input';
        errorMessage = '';
        if (plusModel) modeHandler.command('clear-table');
        else modeHandler = createTableHandler();
      }
      return displayString();
    },

    tableCommand(name) {
      if (calcMode !== 'table') return displayString();
      if (plusModel && name === 'cancel-draft' && modeHandler.getState().screen === 'range' &&
          (hasDraft() || emptyCellDraft)) {
        resetDocument();
        return displayString();
      }
      resetDocument();
      mode = 'input';
      try {
        modeHandler.command(name);
      } catch (error) {
        mode = 'error';
        errorMessage = error.message;
      }
      return displayString();
    },

    getTableFunctions() {
      return tableFunctions;
    },

    finishTableVerify() {
      if (!plusModel || calcMode !== 'table') return false;
      const accepted = modeHandler.dismissVerify();
      if (accepted) resetDocument();
      return accepted !== null;
    },

    // Phím ENG (direction 'down') và SHIFT+ENG (direction 'up').
    // Chỉ có tác dụng ở màn hình kết quả — ĐÃ XÁC NHẬN 2026-08-23: bấm khi
    // đang gõ dở thì màn hình đứng yên.
    pressEngineering(direction) {
      if (mode !== 'result' || viewEntry().remainderResult) return displayString();
      if (plusModel) {
        engineeringEditing = true;
        delete viewEntry().factorization;
        viewEntry().dmsDisplay = false;
        engExponent = canonicalEngineerExponent(viewEntry().value) - (engineerSymbol ? 3 : 0);
        return displayString();
      }
      const value = viewEntry().value;
      if (engExponent === null) {
        // Lần bấm đầu bước MỘT NẤC so với thứ đang hiện trên màn hình. Tắt ký
        // hiệu thì màn hình đang là số trần (chưa ở dạng kỹ thuật) nên nấc đầu
        // chính là mức chuẩn; bật ký hiệu thì màn hình VỐN ĐÃ ở mức chuẩn
        // (xem engineerResultText) nên nấc đầu là mức chuẩn trừ 3.
        engExponent = canonicalEngineerExponent(value) - (engineerSymbol ? 3 : 0);
      } else {
        engExponent += direction === 'up' ? 3 : -3;
      }
      return displayString();
    },

    moveEngineering(direction) {
      if (plusModel && engineeringEditing && mode === 'result') {
        if (direction === 'left') engExponent += 3;
        if (direction === 'right' && significandParts(viewEntry().value).exponent - (engExponent - 3) <= 10) engExponent -= 3;
      }
      return displayString();
    },

    finishEngineering() {
      engineeringEditing = false;
      return displayString();
    },

    getNumberFormat() {
      return numberFormat;
    },

    getAngleUnit() {
      return angleUnit;
    },

    setComplexFormat(value) {
      complexFormat = value === 'polar' ? 'polar' : 'rect';
      return displayString();
    },

    setComplexResultPresentation(format) {
      const entry = mode === 'result' ? viewEntry() : null;
      if (!plusModel || !entry?.complex) return displayString();
      if (format === 'rect' || format === 'polar') entry.complexFormat = format;
      if (format !== 'dms' || entry.complex.im === 0) entry.dmsDisplay = format === 'dms';
      entry.complexMixed = format === 'mixed';
      resultDisplayMode = format === 'decimal' ? 'decimal' : 'exact';
      return displayString();
    },

    getComplexFormat() {
      return complexFormat;
    },

    isVerifyActive() {
      return calcMode === 'verify' || (calcMode === 'complex' && complexVerify) ||
        (plusModel && ['table','equation'].includes(calcMode) && !!(modeHandler || variableEditor?.modeHandler)?.verifying());
    },

    toggleComplexVerify() {
      if (plusModel && calcMode === 'complex') {
        complexVerify = !complexVerify;
        wipeScreenAndHistory();
      }
    },

    inputCloseParen() {
      ensureFreshInputIfNeeded();
      insertText(')');
      return displayString();
    },

    inputComma() {
      ensureFreshInputIfNeeded();
      insertText(',');
      return displayString();
    },

    // Ở mode Complex, phím ENG đổi ngữ cảnh thành đơn vị ảo i.
    // ĐÃ XÁC NHẬN 2026-09-11 bằng chuỗi 2+3i trên giả lập CASIO chính thức.
    inputImaginary() {
      if (calcMode !== 'complex' && !(plusModel && calcMode==='equation' && modeHandler?.verifyComplexInput())) return displayString();
      ensureFreshInputIfNeeded();
      if (plusModel) insertNodes([{type:'char', ch:'i', imaginary:true}]);
      else insertText('i');
      return displayString();
    },

    // SHIFT+ENG trong Complex nhập dấu góc của dạng r∠θ.
    inputPolarSeparator() {
      if (calcMode !== 'complex') return displayString();
      ensureFreshInputIfNeeded();
      insertText('∠');
      return displayString();
    },

    // OPTN trang 2: hậu tố ép định dạng cho riêng phép tính hiện tại. Giữ
    // nguyên trên dòng biểu thức/lịch sử nhưng không đưa vào parser số học.
    inputComplexOutput(format) {
      if (calcMode !== 'complex') return displayString();
      ensureFreshInputIfNeeded();
      const polar = format === 'polar';
      insertNodes([{
        type: 'char',
        ch: polar ? '▶r∠θ' : '▶a+bi',
        complexOutput: polar ? 'polar' : 'rect'
      }]);
      return displayString();
    },

    // Phím Ans — chèn kết quả gần nhất vào biểu thức đang gõ.
    // ĐÃ XÁC NHẬN 2026-08-17 trên bản giả lập chính hãng: sau khi có kết quả
    // 2000, bấm + thì máy TỰ chèn Ans thành "Ans+" (engine đã làm sẵn ở
    // inputOperator), rồi bấm tiếp phím Ans cho ra "Ans+Ans" = 4000. Tức bấm
    // Ans lúc đang hiện kết quả sẽ BẮT ĐẦU biểu thức mới bằng Ans, không nối
    // thêm vào biểu thức cũ — đúng việc ensureFreshInputIfNeeded đang làm cho
    // phím số.
    inputAns() {
      if (modeHandler && !handlerIsEditing()) return;
      ensureFreshInputIfNeeded();
      insertText('Ans');
      return displayString();
    },

    inputRandom(integer = false) {
      if (calcMode === 'base-n') return displayString();
      if ((calcMode === 'matrix' || calcMode === 'vector') && modeHandler &&
          typeof modeHandler.showingResult === 'function' && modeHandler.showingResult()) {
        resetDocument();
        modeHandler.startCalculation();
        mode = 'input';
      } else if (modeHandler && !handlerIsEditing()) return displayString();
      return this.inputFunction(integer ? 'RanInt#(' : 'Ran#');
    },

    inputRemainderDivision() {
      const allowed=['calculate','matrix','vector'].includes(calcMode) || (calcMode==='statistics' && !handlerOwnsInput()) || (calcMode==='table' && modeHandler.getState().screen==='func');
      if(!allowed)return displayString();
      return this.inputOperator('÷R');
    },

    canInputUnitConversion() { return this.canInputScientificConstant(); },
    inputUnitConversion(id) {
      if(!UNIT_CONVERSIONS[id] || !this.canInputUnitConversion()) return displayString();
      const selected = plusModel && UNIT_CONVERSIONS['880:'+id] ? '880:'+id : id;
      return this.inputOperator({conversion:selected});
    },

    canInputScientificConstant() {
      return calcMode !== 'base-n' && (['matrix','vector'].includes(calcMode) || !(modeHandler && !handlerIsEditing()));
    },
    inputScientificConstant(id) {
      if(!SCIENTIFIC_CONSTANTS[id] || calcMode==='base-n') return displayString();
      if((calcMode==='matrix'||calcMode==='vector') && modeHandler && modeHandler.showingResult()) {
        resetDocument();modeHandler.startCalculation();mode='input';
      } else if(modeHandler && !handlerIsEditing()) return displayString();
      ensureFreshInputIfNeeded();
      const symbol = (plusModel && PLUS_SCIENTIFIC_CONSTANT_SYMBOLS[id]) || SCIENTIFIC_CONSTANTS[id].symbol;
      const value = plusModel && PLUS_SCIENTIFIC_CONSTANT_VALUES[id];
      insertNodes([{type:'char',ch:symbol,constant:id,...(value ? {constantValue:value} : {})}]);
      return displayString();
    },

    inputCoordinateConversion(polar = true) {
      if (['complex','base-n','table'].includes(calcMode)) return displayString();
      if ((calcMode==='matrix' || calcMode==='vector') && modeHandler && modeHandler.showingResult()) {
        resetDocument(); modeHandler.startCalculation(); mode='input';
      } else if (handlerOwnsInput()) return displayString();
      return this.inputFunction(polar ? 'Pol(' : 'Rec(');
    },

    inputIntegerPart(floor = false) {
      if (calcMode === 'base-n') return displayString();
      if ((calcMode === 'matrix' || calcMode === 'vector') && modeHandler &&
          typeof modeHandler.showingResult === 'function' && modeHandler.showingResult()) {
        resetDocument();
        modeHandler.startCalculation();
        mode = 'input';
      } else if (modeHandler && !handlerIsEditing()) return displayString();
      return this.inputFunction(floor ? 'Intg(' : 'Int(');
    },

    inputRound() {
      if (calcMode === 'base-n') return displayString();
      if ((calcMode === 'matrix' || calcMode === 'vector') && modeHandler &&
          typeof modeHandler.showingResult === 'function' && modeHandler.showingResult()) {
        resetDocument();
        modeHandler.startCalculation();
        mode = 'input';
      } else if (modeHandler && !handlerIsEditing()) return displayString();
      return this.inputFunction('Rnd(');
    },

    inputPreAns() {
      if (calcMode !== 'calculate' && !(plusModel && calcMode === 'verify')) return displayString();
      ensureFreshInputIfNeeded();
      insertText('PreAns');
      return displayString();
    },

    inputPercent() {
      // CASIO 2026-10-05: % dùng cả ở ô dữ liệu/hệ số, trừ Complex/Base-N.
      if (calcMode === 'complex' || calcMode === 'base-n') return displayString();
      if (modeHandler && !handlerIsEditing() && calcMode !== 'matrix' && calcMode !== 'vector') {
        return displayString();
      }
      return this.inputOperator('%');
    },

    inputNegative() {
      if (plusModel && calcMode === 'base-n') return displayString();
      if (modeHandler && !handlerIsEditing()) return;
      ensureFreshInputIfNeeded();
      insertNodes([{ type: 'char', ch: '-', negative: true }]);
      return displayString();
    },

    // Xoá lùi một bước từ con trỏ — xem deleteBackward() ở trên để biết quy
    // tắc với các mẫu (căn, phân số, ô mũ) và hai quan sát máy thật mà nó
    // được suy ra từ đó.
    toggleInsertion() {
      if (mode === 'input' && linearEditorInput() && handlerIsEditing()) overwriteInput = !overwriteInput;
      return displayString();
    },

    setInputLimit(limit = 199) {
      inputLimit = limit;
    },

    getInputUsage(nodes = root) {
      const used=inputByteCount(nodes);
      return {used,remaining:Math.max(0,inputLimit-used),limit:inputLimit};
    },

    getOverwriteMode() {
      return overwriteInput && mode === 'input' && linearEditorInput() && handlerIsEditing();
    },

    undoEdit() {
      if (!undoEditorAvailable() || !editUndo) return displayString();
      const current = captureEdit();
      restoreEdit(editUndo);
      editUndo = current;
      return displayString();
    },

    deleteLast() {
      if (plusModel && mode === 'result') return displayString();
      if(mode==='result' && viewEntry().remainderResult)return displayString();
      // Đang gõ dở thì DEL xoá trong chính biểu thức đó — ĐÃ XÁC NHẬN
      // 2026-08-17: gõ "2+3", bấm ◀ rồi DEL cho ra "23", tức DEL xoá ký tự
      // ngay trước con trỏ y như ở mode Calculate. Không gõ dở thì CHƯA XÁC
      // NHẬN máy thật làm gì, tạm để không tác dụng.
      // Không gõ dở mà mode có bảng dòng (Statistics) thì DEL xoá cả DÒNG —
      // manual trang 120. Ratio/Equation không có deleteRow nên giữ nguyên
      // hành vi cũ: DEL không tác dụng.
      if (modeHandler && !hasDraft() && handlerIsEditing() &&
          typeof modeHandler.deleteRow === 'function') {
        return modeHandler.deleteRow();
      }
      if (modeHandler && (!handlerIsEditing() || !hasDraft())) return;
      ensureFreshInputIfNeeded();
      if (plusModel && !usesLineInput() && cursorIndex === 0) {
        // PLUS DEL at the leading edge of a fraction enters its numerator.
        // A populated numerator deletes forward; an empty one unwraps below.
        // 12/34 -> 2/34 -> □/34 -> 34, observed 2026-11-20.
        if (cursorList === root && cursorList[0]?.type === 'frac') cursorList = cursorList[0].num;
        const owner = findListOwner(root, cursorList);
        if (owner?.node.type === 'frac' && owner.parentList === root && cursorList === owner.node.num &&
            cursorList[0]?.type === 'char') {
          cursorList.splice(0, matchFunctionOpenAt(cursorList, 0) || matchMemoryTokenAt(cursorList, 0) || 1);
          return displayString();
        }
      }
      if (plusModel && handlerIsEditing() && cursorIndex < cursorList.length &&
          (linearEditorInput() && (overwriteInput || cursorIndex === 0 && cursorList === root) ||
           cursorList === root && cursorIndex === 0 && ['char','sqrt'].includes(root[0].type))) {
        if (cursorList[cursorIndex].type === 'sqrt') {
          cursorList.splice(cursorIndex,1,...cursorList[cursorIndex].arg);
        } else cursorList.splice(cursorIndex, matchFunctionOpenAt(cursorList,cursorIndex) || 1);
        return displayString();
      }
      const after = deleteBackward(cursorList, cursorIndex);
      cursorList = after.list;
      cursorIndex = after.index;
      return displayString();
    },

    clear() {
      // AC phải hủy cả trạng thái chờ biến, không chỉ biểu tượng của UI.
      pendingRegister = null;
      if (registeredEditor || variableEditor) {
        resetDocument();
        return displayString();
      }
      if (plusModel && calcSession?.operation === 'solve' && calcSession.phase === 'result') {
        goBackPlusSolve(true);
        return displayString();
      }
      if (plusModel && calcSession?.operation === 'solve' && mode === 'error') {
        goBackPlusSolve(calcSession.errorSource === 'expression');
        return displayString();
      }
      if (plusModel && calcSession?.operation === 'solve' && calcSession.editingInitial) {
        resetDocument();
        return displayString();
      }
      if (calcSession && calcSession.phase === 'form' &&
          (hasDraft() || calcSession.editingField || (mode === 'error' && calcSession.errorSource === 'draft'))) {
        resetDocument();
        mode = 'input';
        errorMessage = '';
        calcSession.errorSource = null;
        calcSession.editingField = plusModel && calcSession.operation === 'calc';
        return displayString();
      }
      calcSession = null;
      // Mode có màn hình riêng vẫn phải xoá được trạng thái lỗi ở đây, vì
      // `mode`/`errorMessage` là của engine chứ không phải của handler.
      const wasError = mode === 'error';
      mode = 'input';
      errorMessage = '';
      if (handlerOwnsInput()) {
        // Trên màn hình lỗi, AC chỉ đúng nghĩa "Cancel" như máy ghi sẵn
        // "[AC]:Cancel": huỷ cái lỗi rồi trả về Bộ soạn thảo ĐANG DỞ, KHÔNG
        // đụng vào hệ số và cũng không nhảy ô. ĐÃ XÁC NHẬN 2026-08-18 trên bản
        // giả lập ở CẢ HAI mode dùng chung bộ soạn thảo:
        //   Ratio  0:8 = X:12 → Math ERROR → AC → vẫn 0/8/12, vẫn đứng ô D.
        //   Equation 0x²+2x+3 → Math ERROR → AC → vẫn 0/2/3, vẫn đứng ô c.
        // Khác hẳn AC lúc đang xem NGHIỆM (về ô đầu) và AC lúc đang soạn thảo
        // bình thường (xoá hết hệ số về 0) — ba đường phải tách riêng.
        if (wasError) {
          const keepDraft = plusModel && (['statistics','distribution','inequality','ratio'].includes(calcMode) ||
            calcMode === 'equation' && hasDraft());
          if (!keepDraft) resetDocument();
          if ((calcMode === 'table' || plusModel && calcMode === 'distribution') && typeof modeHandler.clearError === 'function') {
            return modeHandler.clearError();
          }
          return displayString();
        }
        // ĐÃ XÁC NHẬN 2026-08-17: AC lúc đang gõ dở chỉ xoá phần gõ dở, hệ số
        // đã đăng ký GIỮ NGUYÊN và ô đang chọn cũng không đổi (thử: A=7, gõ 5
        // vào ô B rồi AC → vẫn 7, ô B vẫn được chọn, dòng dưới về 0). Chỉ khi
        // KHÔNG gõ dở thì AC mới đặt lại toàn bộ hệ số về 0.
        if (handlerIsEditing() && (hasDraft() || plusModel && emptyCellDraft &&
            (calcMode==='table' && modeHandler.getState().screen==='range' ||
             calcMode==='distribution' && ['params','variable'].includes(modeHandler.getState().screen)))) {
          resetDocument();
          emptyCellDraft = plusModel && (['statistics','distribution','equation','inequality','ratio','matrix','vector'].includes(calcMode) ||
            calcMode === 'table' && modeHandler.getState().screen === 'range');
          return displayString();
        }
        resetDocument();
        return modeHandler.clear();
      }
      resetDocument();
      frozenExpression = '';
      frozenNodes = [];
      // Rời màn hình kết quả, nhưng KHÔNG đụng vào `history` — ĐÃ XÁC NHẬN
      // 2026-08-20: sau AC màn hình trống mà chỉ báo ▲ vẫn còn và bấm lên
      // vẫn ra mục cũ.
      viewIndex = null;
      return displayString();
    },

    cancelDistributionDraft() {
      if (!plusModel || calcMode!=='distribution' || !modeHandler || mode!=='input' ||
          !(hasDraft() || emptyCellDraft) || !['params','variable'].includes(modeHandler.getState().screen)) return false;
      resetDocument();
      return true;
    },

    // ON khi máy đã bật khởi động lại phiên màn hình: xóa biểu thức, lỗi,
    // CALC/Solve và toàn bộ lịch sử, nhưng giữ Ans, biến và SETUP. CASIO
    // chính thức 2026-09-30 xác nhận ON khác AC ở chỗ ▲ không gọi lại được
    // lịch sử; đồng thời Radian, Ans và biến A vẫn còn sau ON.
    powerOn() {
      // PLUS ON clears registered functions even though Ans, PreAns and named
      // numeric/array memories survive. Verified by calling f(2) after ON.
      if (plusModel) {
        storeRegisteredFunction('f', []);
        storeRegisteredFunction('g', []);
      }
      wipeScreenAndHistory();
      standaloneResult = null;
      pendingRegister = null;
      return displayString();
    },

    equals() {
      if (plusModel && mode === 'input') {
        // EXE commits the notation's visible group even when validation
        // fails. BACK and subsequent correction retain its parentheses.
        const commitGroups = nodes => {
          for (const node of nodes) {
            if (node.type === 'scientific' && node.mantissa.length) node.parenthesized = true;
            for (const slot of templateSlots(node)) commitGroups(slot);
          }
        };
        commitGroups(root);
      }
      editUndo = null;
      const currentEntry = mode === 'result' ? viewEntry() : null;
      if (plusModel && currentEntry?.complex !== undefined) currentEntry.complexHorizontalOffset = 0;
      const arrayPreviousResults = plusModel && ['matrix','vector'].includes(calcMode) && currentEntry &&
        !currentEntry.coordinateResult && !currentEntry.remainderResult
        ? [...(currentEntry.arrayPreviousResults || []), displayNumber(currentEntry.value)].slice(-3) : null;
      if (currentEntry && currentEntry.factorization !== undefined) {
        delete currentEntry.factorization;
        if (!plusModel) return displayString();
      }
      if (calcSession) return advanceCalcSession();
      if (handlerOwnsInput()) {
        if (mode === 'error') return;
        if (emptyCellDraft && !root.length) {
          return displayString();
        }
        if (plusModel && arrayResultExpression && (calcMode === 'matrix' || calcMode === 'vector') &&
            modeHandler.showingResult()) {
          resetDocument();
          modeHandler.startCalculation();
          insertNodes(cloneNodes(arrayResultExpression));
          arrayResultExpression = null;
          return displayString();
        }
        // Mode Table, màn nhập hàm: "=" CHỐT cả cây node làm f/g (KHÔNG tính),
        // kể cả khi để trống (g rỗng) — nên chạy TRƯỚC nhánh "gõ dở thì tính".
        if (typeof modeHandler.capturesExpression === 'function' && modeHandler.capturesExpression()) {
          const snapshot = cloneNodes(root);
          resetDocument();
          mode = 'input';
          return modeHandler.commitExpression(snapshot);
        }
        // ĐÃ XÁC NHẬN 2026-08-17: "=" có hai nghĩa trong Bộ soạn thảo hệ số.
        // Đang gõ dở → TÍNH biểu thức rồi ghi giá trị vào ô đang chọn và sang
        // ô kế (gõ "2+3" vào ô A của Ratio, "=" ghi 5 rồi nhảy sang ô B).
        // Không gõ dở → coi như đã nhập xong, yêu cầu giải.
        if (handlerIsEditing() && hasDraft()) {
          const cellValue = plusModel && calcMode==='equation' && modeHandler.verifyComplexInput()
            ? evaluateCurrentComplexValue() : evaluateCurrentValue();
          if (!cellValue.ok) return;
          if (plusModel && calcMode === 'table' && modeHandler.checkValue(cellValue.value)) return;
          const arrayCell = plusModel && (calcMode === 'matrix' || calcMode === 'vector');
          const coefficientCell = plusModel && ['equation','inequality','ratio'].includes(calcMode);
          const fraction = coefficientCell ? cellValue.memoryExact || cellValue.exact
            : arrayCell && root.some(node => node.ch === '┘') ? cellValue.exact : null;
          const rejectedEdit = plusModel && calcMode === 'statistics' ? captureEdit() : null;
          resetDocument();
          mode = 'input';
          // Ô có thể TỪ CHỐI giá trị: cột Freq của Statistics báo Math ERROR
          // với số âm (ĐÃ XÁC NHẬN 2026-08-26).
          try {
            return modeHandler.commitValue(cellValue.value, fraction, cellValue);
          } catch (e) {
            if (rejectedEdit) restoreEdit(rejectedEdit);
            mode = 'error';
            errorMessage = e instanceof EngineError ? e.message : 'Math ERROR';
            return displayString();
          }
        }
        if (plusModel && calcMode==='distribution' && modeHandler.openParameterEdit()) return displayString();
        return modeHandler.equals();
      }
      // "=" khi đang xem một mục lịch sử → máy tính lại mục đó và đẩy nó
      // xuống làm mục MỚI NHẤT. ĐÃ XÁC NHẬN 2026-08-20: đứng ở mục cũ nhất
      // "11" (chỉ báo ▼), bấm "=" thì vẫn hiện "11"/11 nhưng chỉ báo đổi
      // thành ▲, tức đã nhảy xuống cuối danh sách.
      // "=" khi đang xem một mục lịch sử → máy TÍNH LẠI biểu thức của mục đó
      // với Ans HIỆN TẠI rồi đẩy kết quả xuống làm mục mới nhất. ĐÃ XÁC NHẬN
      // 2026-08-20 bằng ca phân biệt được: `1+1=` (2), `Ans×2=` (4), `5+5=`
      // (10), rồi cuộn về mục "Ans×2" (đang hiện 4) và bấm "=" → ra 20, không
      // phải 4. Bản trước chép giá trị cũ xuống.
      //
      // Cách làm: nạp lại cây node của mục vào vùng nhập rồi RƠI XUỐNG đúng
      // đường tính của "=" bình thường ngay bên dưới — nhờ vậy Verify, dạng
      // phân số/căn/π và việc thêm mục lịch sử đều đi chung một đường, không
      // phải nhân bản logic.
      // Mục đến từ STO hoặc M+ thì "=" THI HÀNH LẠI ĐÚNG LỆNH ĐÓ, không phải
      // chỉ tính lại con số. ĐÃ XÁC NHẬN 2026-08-20 bằng ca phân biệt được:
      // `5 STO A`, rồi `9 STO A` (A=9), rồi cuộn về mục "5→A" bấm "=" — màn
      // hình lại hiện "5→A"/5, VÀ `ALPHA A =` sau đó cho 5 chứ không phải 9.
      // Tức là biến thật sự bị ghi lại. Bản trước tính lại biểu thức trần nên
      // vừa mất chú thích "→A" vừa không lưu gì.
      if (mode === 'result') {
        const entry = viewEntry();
        const storedAgain = entry.storedVariable;
        const memoryAgain = entry.memoryOp;
        const recalled = cloneNodes(entry.nodes);
        resetDocument();
        root.push(...recalled);
        cursorList = root;
        cursorIndex = root.length;
        mode = 'input';
        frozenExpression = '';
        frozenNodes = [];
        viewIndex = null;
        if (storedAgain !== null) {
          storeIntoVariable(storedAgain);
          return;
        }
        if (memoryAgain !== null) {
          applyMemoryDelta(memoryAgain === 'M+' ? 1 : -1);
          return;
        }
      }
      if (mode !== 'input' || root.length === 0) {
        return;
      }
      if (calcMode === 'verify' || (calcMode === 'complex' && complexVerify)) {
        runVerify();
        return;
      }
      if (calcMode === 'base-n') {
        runBaseN();
        return;
      }
      if (calcMode === 'complex') {
        const complexResult = evaluateCurrentComplexValue();
        if (!complexResult.ok) return;
        showComplexResult(complexResult);
        return;
      }
      if (calcMode === 'matrix') {
        const matrixResult = evaluateCurrentMatrixValue();
        if (!matrixResult.ok) return;
        if (isMatrixValue(matrixResult.value)) {
          if (plusModel) arrayResultExpression = matrixResult.nodes;
          resetDocument();
          mode = 'input';
          modeHandler.showResult(matrixResult.value);
        } else {
          showResult({
            value: matrixResult.value,
            coordinateResult: matrixResult.coordinateResult,
            remainderResult: matrixResult.remainderResult,
            exact: null,
            displayFraction: arrayScalarDisplayFraction(matrixResult.value),
            exactSurd: null,
            exactPi: null,
            closedExpr: matrixResult.closedExpr,
            nodes: matrixResult.nodes,
            arrayPreviousResults
          });
        }
        return;
      }
      if (calcMode === 'vector') {
        const vectorResult = evaluateCurrentVectorValue();
        if (!vectorResult.ok) return;
        if (isVectorValue(vectorResult.value)) {
          if (plusModel) arrayResultExpression = vectorResult.nodes;
          resetDocument();
          mode = 'input';
          modeHandler.showResult(vectorResult.value);
        } else {
          showResult({
            value: vectorResult.value,
            coordinateResult: vectorResult.coordinateResult,
            remainderResult: vectorResult.remainderResult,
            exact: null,
            displayFraction: arrayScalarDisplayFraction(vectorResult.value),
            exactSurd: null,
            exactPi: null,
            closedExpr: vectorResult.closedExpr,
            nodes: vectorResult.nodes,
            arrayPreviousResults
          });
        }
        return;
      }
      const evalResult = evaluateCurrentValue();
      if (!evalResult.ok) {
        return;
      }
      showResult(evalResult);
    },

    // SHIFT+= (≈) — đã xác nhận máy thật: "=" cho dạng chính xác, SHIFT+=
    // ép hiển thị thập phân ngay. Dùng chung evaluateCurrentValue/showResult
    // với "=", chỉ khác bước cuối ép resultDisplayMode.
    approxEquals() {
      if(mode==='result' && viewEntry().remainderResult){resultDisplayMode='decimal';return displayString();}
      if (calcSession) {
        advanceCalcSession();
        if (calcMode === 'calculate' && mode === 'result') resultDisplayMode = 'decimal';
        return displayString();
      }
      if (mode !== 'input' || root.length === 0) {
        return displayString();
      }
      if (calcMode === 'complex') {
        const complexResult = evaluateCurrentComplexValue();
        if (complexResult.ok) showComplexResult(complexResult);
        return displayString();
      }
      const evalResult = evaluateCurrentValue();
      if (!evalResult.ok) {
        return displayString();
      }
      showResult(evalResult);
      resultDisplayMode = 'decimal';
      return displayString();
    },

    // CASIO 2026-10-20: SHIFT+S⇔D đổi phân số ⇄ hỗn số; từ thập phân
    // trở về hỗn số. S⇔D thường, phép tính mới và đổi mục lịch sử bỏ lựa chọn này.
    toggleMixedFraction() {
      const entry = mode === 'result' ? viewEntry() : null;
      if (!entry || entry.coordinateResult || entry.remainderResult || entry.verifyResult !== null) return displayString();
      const exact = entry.exact || entry.displayFraction;
      if (!exact || exact.den === 1n) return displayString();
      const currentFormat = resultDisplayMode === 'exact'
        ? (fractionDisplayOverride || fractionResultFormat) : fractionResultFormat;
      fractionDisplayOverride = currentFormat === 'mixed' ? 'improper' : 'mixed';
      resultDisplayMode = 'exact';
      return displayString();
    },

    setScalarResultPresentation(format) {
      const entry = mode === 'result' ? viewEntry() : null;
      if (!plusModel || !entry || entry.complex) return displayString();
      delete entry.factorization;
      engExponent = null;
      engineeringEditing = false;
      entry.dmsDisplay = format === 'dms';
      resultDisplayMode = format === 'decimal' ? 'decimal' : format === 'recurring' ? 'recurring' : 'exact';
      fractionDisplayOverride = format === 'mixed' || format === 'improper' ? format : null;
      return displayString();
    },

    resultFormatOptions() {
      const entry = mode === 'result' ? viewEntry() : null;
      const exact = entry?.exact || entry?.displayFraction;
      return {
        engineering: !!entry && entry.value !== 0,
        recurring: Boolean(!(plusModel && calcMode === 'statistics') && !engineerSymbol && exact && fracRecurringDecimalString(exact) !== null),
        fraction: !engineerSymbol && (Boolean(exact && exact.den > 1n) ||
          (modeHandler?.showingResult?.() && modeHandler?.hasExactForm?.())),
        prime: !(plusModel && calcMode === 'statistics') && !engineerSymbol && !!entry && Number.isInteger(entry.value) && entry.value > 1 && entry.value < 1e10
      };
    },

    setCoefficientResultFormat(format) {
      if (calcMode === 'equation' || calcMode === 'inequality' || (plusModel && calcMode === 'ratio')) {
        modeHandler.formatResult(format);
      }
    },

    // Phím S⇔D — đã xác nhận máy thật (ảnh chụp 2026-08-13) đây là một CHU
    // TRÌNH BA bước khi phân số có chu kỳ (1/3 → "1/3" → "0.(3)" → thập
    // phân thường), không phải hai bước như suy đoán ban đầu. Phân số kết
    // thúc hữu hạn (vd 1/4) không có gì tuần hoàn để hiện, nên chu trình
    // rút lại còn hai bước (phân số ⇄ thập phân). Không làm gì nếu kết quả
    // hiện tại không có dạng chính xác đáng vẽ (số nguyên).
    toggleExactDecimal(skipRecurring = false) {
      fractionDisplayOverride = null;
      if (mode==='result' && viewEntry() && (viewEntry().coordinateResult || viewEntry().remainderResult)) return displayString();
      // Mode Tầng 7 có màn hình nghiệm riêng thì engine vẫn ở mode 'input',
      // nên hỏi thẳng handler thay vì đọc `mode` — nếu không S⇔D sẽ im lặng
      // không làm gì ở Ratio.
      const scalarModeResult = plusModel && ['matrix','vector','statistics'].includes(calcMode) && mode === 'result';
      const showingResult = scalarModeResult || (modeHandler
        ? (typeof modeHandler.showingResult === 'function' && modeHandler.showingResult())
        : mode === 'result');
      // Ghi chú: từ 2026-08-24 hai đường tách hẳn — mode Tầng 7 xử lý ở nhánh
      // `if (modeHandler)` ngay dưới rồi return, phần còn lại chỉ còn lo
      // Calculate/Verify.
      // Mode Tầng 7 giữ dạng chính xác của RIÊNG nó (nghiệm không ghi vào Ans)
      // nên phải hỏi handler, không đọc mục lịch sử.
      // Ở Calculate/Verify thì S⇔D tác dụng lên MỤC ĐANG XEM, không phải lên
      // Ans — ĐÃ XÁC NHẬN 2026-08-20: cuộn về mục "1÷3" cũ rồi bấm S⇔D thì
      // chính mục đó đổi từ 1/3 sang 0.‹3›, vẫn đứng nguyên vị trí lịch sử.
      // Màn hình nghiệm của mode Tầng 7 có chu trình HAI BƯỚC (chính xác ⇄
      // thập phân), KHÔNG có bước thập phân tuần hoàn — ĐÃ XÁC NHẬN
      // 2026-08-24 với cùng một giá trị 1/3 ở cả ba chỗ, trong CÙNG một phiên:
      //   Calculate  1÷3       : 1/3 → 0.‹3› → 0.3333333333   (ba bước)
      //   Equation   3x²−4x+1=0: x₂ = 1/3 → 0.3333333333      (hai bước)
      //   Ratio      1:3=X:1   : X = 1/3 → 0.3333333333       (hai bước)
      // Ca đối chứng ở Calculate là cần thiết: không có nó thì không loại
      // được cách hiểu "phiên này đang tắt Recurring Dec".
      // Nghiệm phức cũng đổi được (x²+x+1=0 ở DecimalO hiện
      // "−0.5+0.8660254038i", S⇔D ra dạng căn thức).
      if (modeHandler && !scalarModeResult) {
        if (plusModel && calcMode === 'ratio' && showingResult) {
          modeHandler.toggleRatioFormat();
          return displayString();
        }
        const hasExact = typeof modeHandler.hasExactForm === 'function' && modeHandler.hasExactForm();
        if (showingResult && (hasExact || (plusModel && calcMode === 'inequality'))) {
          const next = resultDisplayMode === 'exact' ? 'decimal' : 'exact';
          if (plusModel && (calcMode === 'equation' || calcMode === 'inequality')) modeHandler.formatResult(next);
          else resultDisplayMode = next;
        }
        return displayString();
      }
      const entry = viewEntry();
      if (plusModel && showingResult && resultDisplayMode === 'recurring' && skipRecurring) {
        resultDisplayMode = 'decimal';
        return displayString();
      }
      if (plusModel && showingResult && entry?.dmsDisplay && !entry.complex) {
        entry.dmsDisplay = false;
        resultDisplayMode = 'exact';
        return displayString();
      }
      if (plusModel && showingResult && entry?.complex) {
        api.setComplexResultPresentation(resultDisplayMode === 'exact' && !entry.dmsDisplay ? 'decimal' : 'exact');
        return displayString();
      }
      const exact = entry === null ? null : (entry.exact || entry.displayFraction || null);
      if (showingResult && exact !== null && exact.den !== 1n) {
        const hasRecurring = !(plusModel && calcMode === 'statistics') && !skipRecurring && recurringDecimalEnabled &&
          fracRecurringDecimalString(exact) !== null;
        const cycle = hasRecurring ? ['exact', 'recurring', 'decimal'] : ['exact', 'decimal'];
        const idx = cycle.indexOf(resultDisplayMode);
        resultDisplayMode = cycle[(idx + 1) % cycle.length];
      } else if (!usesLineInput() && entry !== null && entry.exactSurd !== null && entry.exactSurd.radicand !== 1n) {
        // Dạng căn thức không có thập phân tuần hoàn — chu trình chỉ hai
        // bước (căn thức ⇄ thập phân), giống trường hợp phân số hữu hạn.
        const cycle = ['exact', 'decimal'];
        const idx = cycle.indexOf(resultDisplayMode);
        resultDisplayMode = cycle[(idx + 1) % cycle.length];
      } else if (!usesLineInput() && entry !== null && entry.exactPi !== null) {
        // Bội số π (bước 3) cũng không có thập phân tuần hoàn — cùng chu
        // trình hai bước như căn thức.
        const cycle = ['exact', 'decimal'];
        const idx = cycle.indexOf(resultDisplayMode);
        resultDisplayMode = cycle[(idx + 1) % cycle.length];
      }
      return displayString();
    },

    cancelRegisterSelection() {
      pendingRegister = null;
    },

    inputSto() {
      if ((calcMode === 'matrix' || calcMode === 'vector') && handlerOwnsInput() &&
          typeof modeHandler.beginCopy === 'function' && modeHandler.beginCopy()) {
        pendingRegister = calcMode + '-copy';
        return displayString();
      }
      pendingRegister = 'sto';
      return displayString();
    },

    inputAlpha() {
      ensureFreshInputIfNeeded();
      pendingRegister = 'alpha';
      return displayString();
    },

    // Phím biến A-F/M: chỉ có tác dụng ngay sau STO (lưu) hoặc ALPHA (chèn
    // biến vào biểu thức) — bấm rời không làm gì, để không dạy sai trình tự
    // phím so với máy thật.
    inputVariable(name) {
      if (pendingRegister === 'sto') {
        storeIntoVariable(name);
      } else if (pendingRegister === 'alpha') {
        insertText(name);
      } else if (pendingRegister === 'matrix-copy' && 'ABCD'.includes(name) &&
          modeHandler && typeof modeHandler.copyTo === 'function') {
        modeHandler.copyTo('Mat' + name);
      } else if (pendingRegister === 'vector-copy' && 'ABCD'.includes(name) &&
          modeHandler && typeof modeHandler.copyTo === 'function') {
        modeHandler.copyTo('Vct' + name);
      }
      pendingRegister = null;
      return displayString();
    },

    memoryAdd() {
      applyMemoryDelta(1);
      return displayString();
    },

    memorySubtract() {
      applyMemoryDelta(-1);
      return displayString();
    },

    getDisplay() {
      return displayString();
    },

    finishCalcResult() {
      if (plusModel && calcSession?.operation === 'calc' && calcSession.phase === 'result') calcSession = null;
    },

    // Đọc phần thực của các biến A-F/M/x/y/z cho các mode dùng chung.
    // Chỉ đọc, không đổi trạng thái engine; RECALL dùng API chuỗi bên dưới.
    getDraftValue() {
      if (mode !== 'input' || !root.length) return null;
      const result = evaluateCurrentValue();
      if (!result.ok) return null;
      const displayData = {};
      if (plusModel && !usesLineInput()) {
        if (result.exactSurd && result.exactSurd.radicand !== 1n) {
          displayData.exactSurd = surdForDisplay(result.exactSurd);
          const combined = commonSurdNodes(result.exactSurd,result.value < 0);
          if (combined) displayData.exactSurdNodes = combined;
        }
        if (result.exactPi) displayData.exactPi = {negative:result.exactPi.negative,
          num:String(result.exactPi.num),den:String(result.exactPi.den)};
      }
      return {value:result.value,exact:result.exact || result.memoryExact,
        displayFraction:plusModel && hasExplicitFraction(root),displayData};
    },

    inputSpreadsheetToken(text) {
      if (/^(?:\$|:|[A-E][1-9]\d?)$/.test(text)) insertText(text);
      return displayString();
    },

    editSpreadsheetCell(nodes) {
      resetDocument();
      insertNodes(cloneNodes(nodes));
      cursorIndex = 0;
    },

    editRegisteredFunction(name) {
      if (!plusModel || !Object.hasOwn(registeredFunctions, name) || registeredEditor || !['input','result'].includes(mode)) return false;
      registeredEditor = {name, edit:captureEdit(), mode, viewIndex, editUndo};
      mode = 'input';
      viewIndex = null;
      editUndo = null;
      root = cloneNodes(registeredFunctions[name]);
      cursorList = root;
      cursorIndex = 0;
      return true;
    },

    beginVariableEdit(name) {
      if (!plusModel || !VARIABLE_NAMES.includes(name) || registeredEditor || variableEditor) return false;
      variableEditor = {name,edit:captureEdit(),mode,viewIndex,editUndo,modeHandler,calcSession,pendingRegister};
      modeHandler = null;
      calcSession = null;
      pendingRegister = null;
      mode = 'input';
      viewIndex = null;
      editUndo = null;
      resetDocument();
      return true;
    },

    finishVariableEdit(save) {
      if (!variableEditor) return false;
      if (save) {
        if (calcMode === 'complex') {
          const result = evaluateCurrentComplexValue();
          if (!result.ok) return false;
          const exact = roundedNumberFraction(result.value.re);
          setRegisterValue(variableEditor.name,{value:result.value.re,exact,exactSurd:surdFromFraction(exact),exactPi:null});
          variablesImaginary[variableEditor.name] = result.value.im;
          variablesComplexAlgebraic[variableEditor.name] = plusModel ? result.complexAlgebraic || null : null;
        } else {
          const result = evaluateCurrentValue();
          if (!result.ok) return false;
          setRegisterValue(variableEditor.name,result);
        }
      }
      const previous = variableEditor;
      variableEditor = null;
      restoreEdit(previous.edit);
      ({mode,viewIndex,editUndo,modeHandler,calcSession,pendingRegister} = previous);
      return true;
    },

    finishRegisteredFunction(save) {
      if (!registeredEditor) return false;
      const previous = registeredEditor;
      if (save) storeRegisteredFunction(previous.name, root);
      registeredEditor = null;
      restoreEdit(previous.edit);
      mode = previous.mode;
      viewIndex = previous.viewIndex;
      editUndo = previous.editUndo;
      return true;
    },

    evaluateSpreadsheetCell(nodes) {
      if (plusModel) {
        const names=VARIABLE_NAMES.some(name => variablesImaginary[name] !== 0)
          ? calcVariableNames(nodes).filter(name => variablesImaginary[name] !== 0) : [];
        const nonRealAns=ansComplex?.im && /\bAns\b/.test(serializeForDisplay(nodes));
        if (nonRealAns) names.push('Ans');
        if (names.length) {
          let position=null;
          // Cells have already been resolved in nodes; their addresses in the
          // visible draft must not be mistaken for scalar memory references.
          const offset=root[0]?.ch === '=' ? 1 : 0;
          const draft=offset ? root.slice(1) : root;
          try {
            calcVariableNames(draft,(name,list,index) => {
              const suffix=list.slice(index+1).map(node => node.ch || '').join('');
              const cellReference=/^[A-E]$/.test(name) && /^\$?\d/.test(suffix);
              if (!position && names.includes(name) && !cellReference)
                position={list:list === draft ? root : list,index:index+(list === draft ? offset : 0)};
            });
          } catch (_) { /* A spreadsheet-only token must not change Math ERROR. */ }
          if (position) ({list:cursorList,index:cursorIndex}=position);
          throw new EngineError('Math ERROR');
        }
      }
      const vars = evalVariables();
      const reduced = reduceCalcNodes(nodes, ans, vars, angleUnit, ansExact, variablesExact, numberFormat, plusModel);
      const expression = expandDmsLiterals(autoCloseParens(serializeForEval(reduced)));
      const source = materializeRandomExpression(expression, part =>
        evaluateExpression(part, ans, vars, angleUnit, 1e-99, numberFormat,
          null, null, plusModel ? {plusModel:true,underflow:false} : null));
      return evaluateExpression(source, ans, vars, angleUnit, 1e-99, numberFormat,
        null, null, plusModel ? {plusModel:true,underflow:false} : null);
    },

    getVariables() {
      return { ...variables };
    },

    // PLUS preserves natural fraction/radical values in its variable grid;
    // decimal arithmetic and π use the numeric presentation. Legacy RECALL
    // remains decimal, with the imaginary part retained in Complex.
    getRecallValues(overrides = {}) {
      return Object.fromEntries(VARIABLE_NAMES.map(name=> {
        const pending = overrides[name];
        const value = pending?.value ?? variables[name];
        const fraction = pending ? pending.memoryExact || pending.exact : variablesExact[name];
        const surd = pending ? pending.exactSurd : variablesExactSurd[name];
        const imaginary = pending ? 0 : variablesImaginary[name];
        let natural = null;
        if (plusModel && imaginary === 0) {
          if (fraction && plusRecallFractions.has(fraction) && fraction.den !== 1n && fractionFitsDisplay880(fraction)) {
            natural = (fraction.num < 0n ? '−' : '') + bigAbs(fraction.num) + '┘' + fraction.den;
          } else if (surd && surd.radicand !== 1n) {
            const terms = surdTerms(surd).filter(([,coefficient]) => coefficient.num !== 0n);
            const denominator = terms.reduce((den,[,c]) => den / bigGcd(den,c.den) * c.den,1n);
            let numerator = '';
            for (const [radicand,c] of terms) {
              const n = c.num * (denominator / c.den);
              numerator += n < 0n ? '−' : numerator ? '+' : '';
              numerator += radicand === 1n ? bigAbs(n).toString()
                : (bigAbs(n) === 1n ? '' : bigAbs(n).toString()) + '√(' + radicand + ')';
            }
            natural = denominator === 1n ? numerator
              : (terms.length > 1 ? '(' + numerator + ')' : numerator) + '┘' + denominator;
          }
        }
        const complexText=imaginary !== 0 && formatComplexRect({re:value,im:imaginary},DEFAULT_NUMBER_FORMAT,
          plusModel && !!variablesComplexAlgebraic[name],null,true,plusModel);
        return [name, natural !== null ? natural : imaginary!==0
          ? plusModel ? complexText.replace(/\//g,'┘') : complexText
          : formatNumber(value,DEFAULT_NUMBER_FORMAT)];
      }));
    },

    // Chỉ báo M trên dải trên cùng — ĐÃ XÁC NHẬN 2026-08-20 trên bản giả lập
    // vừa Initialize All: `5 M+` bật chữ M, `0 STO M` tắt. Luật của máy là
    // "bộ nhớ độc lập khác 0", nên so sánh đúng bằng 0 mới phải, KHÔNG dùng
    // ngưỡng sai số: máy thật cũng bật M khi M = 1e-30.
    isMemoryActive() {
      return variables.M !== 0 || variablesImaginary.M !== 0;
    },

    // Ngoài các trường dạng chuỗi đã có từ Tầng 0-4 (buffer, expression),
    // nay trả thêm cây node + vị trí con trỏ để UI vẽ được hai chiều.
    // cursorList là chính mảng đang chứa con trỏ, UI so sánh bằng tham chiếu
    // khi duyệt cây để biết chỗ đặt con trỏ.
    getSolveParameters() { return {...solveParameters}; },

    getState() {
      if (registeredEditor) return {mode:'function-edit', prompt:registeredEditor.name + '(x)=',
        draftNodes:root, cursorList, cursorIndex};
      // Lỗi vẽ giống nhau ở mọi mode nên kiểm TRƯỚC khi giao cho handler.
      if (mode === 'error') {
        const state = {mode:'error', message:errorMessage};
        if (plusModel && usesLineInput() && /(?:d\/dx|[∫ΣΠ])\(/.test(serializeForDisplay(root))) state.calculusError = true;
        if (plusModel && calcMode === 'equation') state.complexResults = modeHandler.getState().complexResults;
        return state;
      }
      if (variableEditor) return {mode:'variable-edit',prompt:variableEditor.name+'=',draftNodes:root,cursorList,cursorIndex};
      if (calcSession && calcSession.operation === 'solve' && calcSession.phase === 'result') {
        const solution = calcSession.solution;
        return { mode: 'solve', continue: !!calcSession.continue, title: calcSession.continue ? 'Continue:[=]' : '',
          ...(plusModel ? {continueExitSelected:calcSession.continueExitSelected} : {}),
          expression: serializeForDisplay(calcSession.nodes),
          expressionNodes: calcSession.nodes, variable: solution.variable,
          result: formatResultText(formatSolveResult(solution.value, plusModel ? null : 8)),
          residual: solution.residual === 0 ? '0' : formatResultText(formatSolveResult(solution.residual, plusModel ? null : 8)), scrollUp: history.length > 0 };
      }
      if (calcSession && (calcSession.phase === 'form' || calcSession.phase === 'choose')) {
        const variable = calcSession.names[calcSession.selectedIndex];
        if (plusModel && calcSession.operation === 'solve') {
          return {mode:'calc', operation:'solve', phase:calcSession.phase, variable,
            variables:calcSession.names.slice(), selectedIndex:calcSession.selectedIndex,
            editingInitial:!!calcSession.editingInitial, runSelected:!!calcSession.runSelected,
            selectedText:formatResultText(formatSolveResult(calcSession.initial ?? 0, 9)),
            draftNodes:root, cursorList, cursorIndex};
        }
        const recallValue = plusModel && calcSession.operation === 'calc'
          ? api.getRecallValues(calcSession.pendingValues)[variable] : null;
        return { mode: 'calc', operation: calcSession.operation, expression: serializeForDisplay(calcSession.nodes),
          expressionNodes: calcSession.nodes, variable, variables: calcSession.names.slice(),
          selectedIndex: calcSession.selectedIndex, selectedText: calcSession.operation === 'solve'
            ? formatResultText(formatSolveResult(variables[variable], 9))
            : recallValue !== null ? recallValue
              : displayNumber(calcSession.pendingValues?.[variable]?.value ?? variables[variable]),
          ...(plusModel ? {runSelected:!!calcSession.runSelected,editing:!!calcSession.editingField} : {}),
          scrollUp: calcSession.selectedIndex > 0 || !!calcSession.runSelected,
          scrollDown: plusModel ? !calcSession.runSelected : calcSession.selectedIndex < calcSession.names.length - 1,
          draftNodes: root, cursorList, cursorIndex };
      }
      if (handlerOwnsInput()) {
        const state = modeHandler.getState();
        if (plusModel && (state.mode === 'matrix' || state.mode === 'vector') && Array.isArray(state.values)) {
          const vector = state.mode === 'vector';
          const value = vector ? state.values[state.cursor] : state.values[state.cursor.row][state.cursor.col];
          const compact = value => applyDecimalMark(statCellText(value, DEFAULT_NUMBER_FORMAT));
          state.cellText = vector ? state.values.map(compact) : state.values.map(row => row.map(compact));
          state.selectedText = displayNumber(value);
          if (state.selectedFraction) state.selectedFraction = fractionResultForDisplay(state.selectedFraction);
        }
        // Phần biểu thức đang gõ dở vào ô hệ số: đưa nguyên cây node + con trỏ
        // cho UI vẽ, dùng lại đúng đường vẽ của mode Calculate nên phân số,
        // căn, sin... trong ô hệ số trông giống hệt ngoài màn hình chính.
        // Màn nhập hàm của Table (capturesExpression) LUÔN kèm con trỏ dù editor
        // rỗng, để hiện con trỏ nhấp nháy ngay sau "f(x)=".
        const wantsCursor = hasDraft() || emptyCellDraft
          || (typeof modeHandler.capturesExpression === 'function' && modeHandler.capturesExpression());
        if (wantsCursor) {
          state.draftNodes = root;
          state.cursorList = cursorList;
          state.cursorIndex = cursorIndex;
        }
        return state;
      }
      if (mode === 'result') {
        // Màn hình kết quả vẽ MỤC ĐANG XEM, không phải Ans — hai thứ này tách
        // nhau khi cuộn lại lịch sử. ĐÃ XÁC NHẬN 2026-08-20: 2+3= rồi 10+10=
        // rồi ▲ (về xem 2+3), AC, "Ans =" vẫn ra 20 — xem mục cũ KHÔNG đổi Ans.
        const entry = viewEntry();
        const state = {
          mode: 'result',
          // Bỏ hai ký tự mốc vô hình trước khi đưa ra ngoài engine: chúng
          // chỉ có nghĩa giữa serializeForEval() và tokenize(). Chuỗi này
          // không phải thứ UI vẽ (UI vẽ expressionNodes) nhưng để lọt ra thì
          // sớm muộn cũng có chỗ so chuỗi rồi lệch.
          expression: (entry.expression.includes(ANGLE_UNIT_MARK) || hasScientificConstant(entry.nodes) || hasUnitConversion(entry.nodes))
            ? serializeForDisplay(entry.nodes)
            : entry.expression.split(STAT_MARK).join('').split(ENGSYM_MARK).join(''),
          expressionNodes: entry.nodes,
          result: engineerResultText(entry.value)
        };
        if (entry.arrayPreviousResults) state.arrayPreviousResults = entry.arrayPreviousResults;
        if (entry.complex !== undefined) {
          if (plusModel && !entry.dmsDisplay) {
            const exact = resultDisplayMode === 'exact' && !exactFormsSuppressed();
            const preserveSmall = hasUnitConversion(entry.nodes);
            const polar = entry.complexFormat === 'polar';
            const parts = polar ? complexPolarParts(entry.complex, numberFormat, angleUnit, preserveSmall, exact, exact, !exact) :
              entry.complexAngleResult && entry.complex.im === 0 && exact
                ? {left:formatPolarAngle(entry.complex.re, numberFormat, angleUnit), separator:'', right:''}
                : complexRectangularParts(entry.complex, numberFormat, exact, exact && entry.complexRoundedComponents, preserveSmall, !exact, plusModel, entry.complexAlgebraic);
            const mixedComponent = text => text.replace(/^([−-]?)(\d+)\/(\d+)(i?)$/, (fraction, sign, n, d, unit) => {
              const numerator = BigInt(n), denominator = BigInt(d);
              return numerator > denominator ? sign + numerator / denominator + ' ' + numerator % denominator + '/' + d + unit : fraction;
            });
            const {separator} = parts;
            const left = entry.complexMixed ? mixedComponent(parts.left) : parts.left;
            const right = entry.complexMixed ? mixedComponent(parts.right) : parts.right;
            state.result = formatResultText(left + separator + right);
            state.complexDisplay = {left:formatResultText(left), separator, right:formatResultText(right),
              stacked:(!exact || usesLineInput()) && !polar && !!left && !!right, horizontalOffset:entry.complexHorizontalOffset || 0};
            state.complexFractionFormat = [entry.complex.re, entry.complex.im].some(component =>
              (approximateComplexRational(component, 100)?.denominator || 1) > 1);
          } else if (entry.complexFormat === 'polar') {
            state.result = formatResultText(formatComplexPolar(entry.complex, numberFormat, angleUnit, hasUnitConversion(entry.nodes)));
          } else if (entry.complexAngleResult && entry.complex.im === 0) {
            state.result = formatResultText(formatPolarAngle(entry.complex.re, numberFormat, angleUnit));
          } else {
            state.result = formatResultText(formatComplexRect(entry.complex, numberFormat, entry.complexExactComponents, entry.complexRoundedComponents,hasUnitConversion(entry.nodes),plusModel));
          }
          state.complexResult = { re: entry.complex.re, im: entry.complex.im };
        }
        // Base-N: dòng kết quả là số đã định dạng theo cơ số ĐANG chọn (đổi
        // cơ số chỉ đổi baseNRadix, kết quả tự vẽ lại). Trả sớm để không đính
        // kèm dạng phân số/căn/π vốn vô nghĩa với số nguyên nhị/bát/thập lục.
        if (entry.baseN !== undefined) {
          state.result = formatBaseN(entry.baseN, baseNRadix);
          state.baseNLabel = BASE_N_BASES[baseNRadix].label;
          state.scrollUp = history.length === 1 ? true : viewIndex > 0;
          state.scrollDown = viewIndex < history.length - 1;
          return state;
        }
        // Chỉ báo cuộn: ▲ khi còn mục CŨ hơn ở trên, ▼ khi còn mục MỚI hơn ở
        // dưới. Engine quyết định, ui.js chỉ vẽ — giữ đúng ranh giới như
        // `template` đã làm. ĐÃ XÁC NHẬN 2026-08-20 ở cả ba vị trí với ba
        // phép tính 1+1 / 2+2 / 3+3: mới nhất chỉ có ▲, ở giữa có ▼▲, cũ nhất
        // chỉ có ▼.
        // NGOẠI LỆ khi lịch sử chỉ có ĐÚNG MỘT mục: máy vẫn vẽ ▲ dù không có
        // gì ở trên, và bấm ▲ lẫn ▼ đều không đi đâu. Tự mâu thuẫn, nhưng là
        // mâu thuẫn CỦA MÁY chứ không phải của ta.
        // ĐÃ XÁC NHẬN HAI LẦN, HAI NGUỒN ĐỘC LẬP, 2026-08-20: trên bản giả lập
        // (`1+1=` và `5 STO A` sau "Initialize All"), và trên MÁY VẬT LÝ do
        // đội BITEX bấm — máy thật cũng hiện ▲ ở phép tính đầu tiên, cũng
        // không đi đâu khi bấm ▲/▼, và cũng trở lại bình thường từ mục thứ
        // hai. Đây là lần kiểm chứng độc lập đầu tiên tại một điểm ta NGHI
        // bản giả lập sai — nó đúng.
        // Từ HAI mục trở lên thì luật bình thường: ▲ khi còn mục cũ hơn ở
        // trên. CLAUDE.md cấm "cải tiến cho hợp lý hơn máy thật" nên chép
        // nguyên.
        state.scrollUp = history.length === 1 ? true : viewIndex > 0;
        state.scrollDown = viewIndex < history.length - 1;
        if (plusModel && engExponent !== null) {
          state.engineeringPresentation = true;
          state.engineering = engineeringEditing;
          state.engineeringRight = significandParts(entry.value).exponent - (engExponent - 3) <= 10;
        }
        if (entry.coordinateResult) {
          const pair=entry.coordinateResult;
          const labels=pair.kind==='Pol' ? ['r','θ'] : ['x','y'];
          const values=[pair.first,pair.second].map(value => plusModel
            ? formatResultText(formatSolveResult(value,null)) : displayNumber(value,DEFAULT_NUMBER_FORMAT));
          state.coordinateResult={ labels,values,layout:calcMode==='calculate' && !usesLineInput() ? 'inline' : 'rows',
            ...(plusModel ? {horizontalOffset:entry.coordinateHorizontalOffset || 0} : {}) };
          state.result=labels.map((label,i)=>label+'='+values[i]).join(',');
          return state;
        }
        if(entry.remainderResult && !entry.storedVariable && !entry.memoryOp) {
          const pair=entry.remainderResult;
          const quotient=formatResultText(String(pair.value));
          const remainder=formatResultText(String(pair.remainder));
          state.remainderResult={quotient,remainder,layout:calcMode==='calculate' && inputOutput==='mathio' && resultDisplayMode!=='decimal'?'inline':'rows'};
          state.result=quotient+', R='+remainder;
          return state;
        }
        // Mode Verify: dòng kết quả là "True"/"False" chứ không phải số.
        // state.result vẫn giữ nguyên ("1" hoặc "0" — chính là giá trị Ans)
        // để mọi chỗ đang đọc field đó không phải sửa gì.
        if (entry.verifyResult !== null) {
          state.verifyResult = entry.verifyResult;
        }
        if (entry.storedVariable !== null) {
          state.storedVariable = entry.storedVariable;
        }
        if (entry.memoryOp !== null) {
          state.memoryOp = entry.memoryOp;
        }
        if (entry.factorization !== undefined) {
          state.factorization = entry.factorization;
          return state;
        }
        if (entry.dmsDisplay) {
          state.dmsResult = dmsResultText(entry.value);
        }
        // Chỉ đính kèm dạng phân số/thập phân tuần hoàn khi thật sự có gì để
        // vẽ (mẫu số ≠ 1) và đúng bước hiện tại của chu trình S⇔D — UI vẽ
        // thay cho state.result thay vì cùng lúc cả hai (state.result vẫn
        // luôn có, không đổi, để không ảnh hưởng gì tới test/luồng cũ đọc
        // field này).
        if (!entry.dmsDisplay && !exactFormsSuppressed()) attachExactFraction(state, entry.exact || entry.displayFraction || null);
        // Dạng căn thức (SurdValue) — chỉ đính kèm khi thật sự có phần căn
        // (radicand≠1n) và đang ở bước "exact" của chu trình S⇔D. Mọi số ở
        // dạng chuỗi, giống cách exactFraction đang xuất num/den, để không
        // lộ BigInt ra ngoài engine.
        if (!entry.dmsDisplay && !usesLineInput() && !exactFormsSuppressed() && entry.exactSurd !== null && entry.exactSurd.radicand !== 1n && resultDisplayMode === 'exact') {
          state.exactSurd = {
            rationalNegative: entry.exactSurd.rational.num < 0n,
            rationalNum: applyDigitSeparator(bigAbs(entry.exactSurd.rational.num).toString()),
            rationalDen: applyDigitSeparator(entry.exactSurd.rational.den.toString()),
            coeffNegative: entry.exactSurd.coeff.num < 0n,
            coeffNum: applyDigitSeparator(bigAbs(entry.exactSurd.coeff.num).toString()),
            coeffDen: applyDigitSeparator(entry.exactSurd.coeff.den.toString()),
            radicand: applyDigitSeparator(entry.exactSurd.radicand.toString())
          };
          const combined=commonSurdNodes(entry.exactSurd,entry.value<0);
          if(combined) state.exactSurdNodes=combined;
        }
        // Bội số π (bước 3, lượng giác ngược ở Rad) — đúng khuôn exactSurd ở
        // trên, chỉ đính kèm ở bước "exact" của chu trình S⇔D.
        if (!entry.dmsDisplay && !usesLineInput() && !exactFormsSuppressed() && entry.exactPi !== null && resultDisplayMode === 'exact') {
          state.exactPi = {
            negative: entry.exactPi.negative,
            num: applyDigitSeparator(entry.exactPi.num.toString()),
            den: applyDigitSeparator(entry.exactPi.den.toString())
          };
        }
        return state;
      }
      // Dòng nhập cũng hiện ▲ khi có lịch sử ở trên — ĐÃ XÁC NHẬN 2026-08-20:
      // sau AC màn hình trống mà chỉ báo ▲ vẫn còn, và cả khi đang gõ dở
      // ("7+") chỉ báo vẫn hiện dù lúc đó bấm ▲ không cuộn. Không bao giờ có
      // ▼ ở dòng nhập: dòng nhập đã là dưới cùng.
      return {
        mode: 'input',
        buffer: displayString(),
        nodes: root,
        cursorList,
        cursorIndex,
        scrollUp: history.length > 0,
        scrollDown: false
      };
    }
  };
  let editDepth = 0;
  for (const name of Object.keys(api).filter(name => name.startsWith('input') || ['deleteLast', 'clear'].includes(name))) {
    const action = api[name];
    api[name] = function(...args) {
      // Khung chu kỳ chỉ nhận chữ số; các phím soạn biểu thức khác bị bỏ
      // qua. STO/ALPHA vẫn nhận phím chọn biến; = và mũi tên dùng API riêng.
      const recurring = mode === 'input' && findListOwner(root, cursorList)?.node.type === 'recurring';
      const scientificOwner = plusModel && mode === 'input' && findListOwner(root, cursorList);
      if (scientificOwner && scientificOwner.node.type === 'scientific' && cursorList === scientificOwner.node.exp &&
          name.startsWith('input') && !['inputDigit', 'inputNegative'].includes(name)) return displayString();
      const storeTarget = pendingRegister === 'sto' && ['inputVariable', 'inputXVariable'].includes(name);
      if (recurring && name.startsWith('input') && !storeTarget &&
          !['inputDigit', 'inputAlpha', 'inputSto'].includes(name)) {
        if (pendingRegister === 'alpha') pendingRegister = null;
        return displayString();
      }
      if (editDepth) return action.apply(this, args);
      const before = captureEdit();
      const serialized = JSON.stringify(root);
      editDepth++;
      try {
        const result=action.apply(this,args);
        if(name.startsWith('input') && inputByteCount(root)>inputLimit) {
          restoreEdit(before);
          return displayString();
        }
        return result;
      } finally {
        editDepth--;
        if (undoEditorAvailable() && (JSON.stringify(root) !== serialized || ['clear', 'deleteLast'].includes(name))) {
          editUndo = before;
        }
      }
    };
  }
  return api;
}
