'use strict';

const DEFAULTS_880 = {
  language: 'vi', hints: true, io: 'mathio', angle: 'deg',
  number: {kind: 'norm', digits: 1}, engineer: false, fraction: 'improper',
  complex: 'rect', decimal: 'dot', separator: false, power: 'power',
  format: 'toggle', contrast: 0, autoOff: 10, qr: 11, sheetAutoCalc:true, sheetShowCell:'formula'
};

function createCalculator880(savedSettings = {}) {
  const engine = createEngine({model: MODEL});
  const settings = {...DEFAULTS_880, ...savedSettings};
  const history = [];
  let app = 'calculate';
  let home = true;
  let homeIndex = 0;
  let homeOffset = 0;
  let power = true;
  let shifted = false;
  let notice = null;
  let settingsResult = null;
  let linearDisplayHistory = [];
  let linearReplayOnly = false;
  let menus = [];
  let explorer = null;
  let probabilityMemory = {};
  const fieldFractions = new WeakSet();
  const fieldExactValues = new WeakMap();
  const fieldDisplay = value => {
    const {exactPi,...visible} = fieldExactValues.get(value) || {};
    return {...visible,...(fieldFractions.has(value)
      ? {exactFraction:{negative:value.num<0n,num:String(bigAbs(value.num)),den:String(value.den)}} : {})};
  };
  const fieldLiteral = value => {
    const exact = fieldExactValues.get(value);
    if (exact?.exactSurd) {
      const s = exact.exactSurd;
      const rational = (s.rationalNegative ? '−' : '') + s.rationalNum + '÷' + s.rationalDen;
      const radical = '(' + (s.coeffNegative ? '−' : '') + s.coeffNum + '÷' + s.coeffDen + ')×√(' + s.radicand + ')';
      const extra = s.extra ? '+(' + (s.extra.negative ? '−' : '') + s.extra.num + '÷' + s.extra.den + ')×√(' + s.extra.radicand + ')' : '';
      return '(' + rational + ')+' + radical + extra;
    }
    if (exact?.exactPi) {
      const p = exact.exactPi;
      return (p.negative ? '−' : '') + p.num + '×π÷' + p.den;
    }
    return fractionToEvalLiteral(value);
  };
  let groupedRange = [0, 50, 10];
  let groupedRangeFractions = null;
  let geometryMemory = {points:[null,null,null], lines:[null,null], values:{}};
  let mathBox = null;
  let lineBox = null;
  let circleBox = null;
  let sheet = null;
  const sheetData = createSheet880(engine.evaluateSpreadsheetCell, nodes => engine.getInputUsage(nodes).used);
  let verifyErrorBack = false;
  let variableEditing = null;
  let insertionArrow = false;
  let applyingInsertionArrow = false;

  const language = () => settings.language;
  const label = (vi, en) => language() === 'vi' ? vi : en;
  const item = (name, choose, options = {}) => ({name, choose, ...options});
  const branch = (name, rows, options) => item(name, () => open(rows(), options), {arrow: true});
  // External numeric forms use linear entry without changing the global I/O
  // setting, which still controls their exact/natural result presentation.
  const inputAction = (method, ...args) => {
    const incorporate = method === 'inputSqrt' && applyingInsertionArrow;
    if (incorporate) args = [true];
    const result = ['math-box','math-explorer'].includes(app)
      ? engine.linearInput(method, ...args) : engine[method](...args);
    return result;
  };
  const call = (method, ...args) => () => method.startsWith('input')
    ? inputAction(method, ...args) : engine[method](...args);
  const top = () => menus.at(-1);

  function applySettings() {
    engine.setInputLimit(app === 'spreadsheet' ? 49 : 199);
    engine.setInputOutput(settings.io);
    engine.setAngleUnit(settings.angle);
    engine.setNumberFormat(settings.number);
    engine.setEngineerSymbol(settings.engineer);
    engine.setFractionResult(settings.fraction);
    engine.setComplexFormat(settings.complex);
    engine.setDecimalMark(settings.decimal);
    engine.setDigitSeparator(settings.separator);
  }
  applySettings();

  function open(rows, {columns = 1, capacity = 4, direct = true, highlight = true, initial = 0, quick = false, wrap = false,
    size = null, title = null, relations = false, circleTypes = false, trialForm = null, trialViews = false, variables = null, symbols = false, constants = false, conversions = false, confirmation = null, mathBoxRoot = false, explorerRoot = false, resetKind = null, sheetPreference = false} = {}) {
    if (rows.length) menus.push({rows, columns, capacity, direct, highlight, quick, wrap, size, title, relations, circleTypes, trialForm, trialViews, variables, symbols, constants, conversions, confirmation, mathBoxRoot, explorerRoot, resetKind, sheetPreference, selected: initial,
      offset: Math.max(0, initial - capacity + 1)});
  }

  function action(name, fn, options) {
    return item(name, () => {
      menus = [];
      fn();
    }, options);
  }

  function change(field, value, method) {
    const changed = settings[field] !== value;
    settings[field] = value;
    if (method) engine[method](value);
    const result = engine.getState();
    const defaultFormat = settings.io.startsWith('line') || settings.io.endsWith('do') ? 'decimal' : 'exact';
    if (['equation','inequality','ratio'].includes(app) && result.result != null) {
      engine.setCoefficientResultFormat(defaultFormat);
    }
    if (['probability','geometry'].includes(explorer?.kind) && explorer.stage === 'result') explorer.decimal = settings.io.endsWith('do');
    if (field === 'angle' && changed && lineBox) {
      lineBox = {stage:'list', cursor:0, entries:[null,null,null], target:0, draft:false};
      engine.clear();
    }
  }

  function choices(field, values, method) {
    return values.map(([value, name]) => item(name, () => change(field, value, method),
      {radio: () => JSON.stringify(settings[field]) === JSON.stringify(value)}));
  }

  const onOff = () => [[true, label('Mở', 'On')], [false, label('Tắt', 'Off')]];
  const settingsRoot = () => [
    branch(label('Cài đặt phép tính', 'Calc Settings'), calcSettings, {wrap:true}),
    branch(label('Cài đặt Hệ thống', 'System Settings'), systemSettings, {wrap:true}),
    branch(label('Cài đặt lại', 'Reset'), () => [
      item(label('Cđặt & Dữ liệu', 'Settings & Data'), () => reset('setup'), {arrow:true}),
      item(label('Biến nhớ', 'Variable Memory'), () => reset('memory'), {arrow:true}),
      item(label('Khởi tạo tất cả', 'Initialize All'), () => reset('all'), {arrow:true})
    ], {wrap:true}),
    action(label('Bắt đầu', 'Get Started'), () => showNotice('Get Started', label('Hướng dẫn qua mã QR', 'QR code guide')), {arrow:true})
  ];

  function calcSettings() {
    const numberChoices = (kind, values) => values.map(digits => item(kind[0].toUpperCase()+kind.slice(1)+(kind === 'sci' && digits === 0 ? 10 : digits), () => {
      change('number',{kind,digits},'setNumberFormat');
      menus.pop();
      top().selected = ['fix','sci','norm'].indexOf(kind);
    },{numberPreview:{kind,digits}}));
    const digits = Array.from({length: 10}, (_, i) => i);
    return [
      branch(label('Nhập/Xuất', 'Input/Output'), () => choices('io', [
        ['mathio', label('Stn vào/ra','MathI/MathO')], ['mathido', label('Stn vào/Stp ra','MathI/DecimalO')],
        ['lineio', label('Dòng vào/ra','LineI/LineO')], ['lineido', label('Dòng vào/Stp ra','LineI/DecimalO')]
      ], 'setInputOutput'), {wrap:true}),
      branch(label('Đơn vị góc', 'Angle Unit'), () => choices('angle', [
        ['deg', label('Độ', 'Degree')], ['rad', 'Radian'], ['grad', label('Grad', 'Gradian')]
      ], 'setAngleUnit'), {wrap:true}),
      branch(label('Định dạng số', 'Number Format'), () => [
        ...[['fix',digits],['sci',[...digits.slice(1),0]],['norm',[1,2]]].map(([kind,values]) =>
          item(kind[0].toUpperCase()+kind.slice(1), () => open(numberChoices(kind,values)),
            {arrow:true,radio:() => settings.number.kind === kind,numberFormat:kind}))
      ], {wrap:true}),
      branch(label('Ký hiệu kthuật', 'Engineer Symbol'), () => choices('engineer', onOff(), 'setEngineerSymbol'),
        {title:label('BẬT ký hiệu kth?','Engineer Symbol?')}),
      branch(label('Kết quả phân số', 'Fraction Result'), () => choices('fraction', [
        ['mixed', label('Hỗn số', 'Mixed Number')], ['improper', label('Phân số Kothựcsự', 'Improp Fraction')]
      ], 'setFractionResult')),
      branch(label('BẬT kquả số phức', 'Complex Result'), () => choices('complex', [
        ['rect', 'a+bi'], ['polar', 'r∠θ']
      ], 'setComplexFormat')),
      branch(label('Dấu thập phân', 'Decimal Mark'), () => choices('decimal', [
        ['dot', label('Dấu chấm', 'Dot')], ['comma', label('Dấu phẩy', 'Comma')]
      ], 'setDecimalMark')),
      branch(label('Dấu cách 3 chsố', 'Digit Separator'), () => choices('separator', onOff(), 'setDigitSeparator'),
        {title:label('BẬT dcách 3 chsố?','Digit Separator?')}),
      branch(label('Phím ×10ˣ', '×10ˣ Key'), () => choices('power', [['power', '×10ˣ (Power)'], ['scientific', '×10ˣ (Sci Notat)']])),
      branch(label('Phím FORMAT', 'FORMAT Key'), () => choices('format', [['toggle', 'S⇔D'], ['menu', 'Format Menu']]))
    ];
  }

  function systemSettings() {
    return [
      action(label('Sáng/tối Mhình', 'Contrast'), () => showNotice(label('Tương phản', 'Contrast'), '◀  ▪  ▶', 'contrast'), {arrow:true}),
      branch(label('Tự động tắt', 'Auto Power Off'), () => choices('autoOff', [[10, '10 Min.'], [60, '60 Min.']])),
      branch(label('Ngôn ngữ', 'Language'), () => choices('language', [['en', 'English'], ['vi', 'Tiếng Việt']]), {wrap:true}),
      branch(label('H.thị số t.chọn', 'Show Option Num'), () => choices('hints', onOff())),
      branch('QR Code', () => choices('qr', [[3, 'Version 3'], [11, 'Version 11']]))
    ];
  }

  function reset(kind) {
    const performReset = () => {
      if (kind !== 'memory') {
        const {language, contrast, autoOff} = settings;
        Object.assign(settings, DEFAULTS_880, {language, contrast, autoOff});
        app = 'calculate';
        home = true;
        homeIndex = homeOffset = 0;
        explorer = null;
        mathBox = null;
        lineBox = circleBox = null;
        sheet = null;
        probabilityMemory = {};
        geometryMemory = {points:[null,null,null], lines:[null,null], values:{}};
        groupedRange = [0, 50, 10];
        groupedRangeFractions = null;
        sheetData.reset();
      }
      engine.resetCalculator(kind);
      if (kind !== 'memory') applySettings();
    };
    open([action(label('Có','Yes'), performReset), action(label('Hủy','Cancel'), () => {})], {resetKind:kind});
  }

  function showNotice(title, subtitle, kind = 'notice') {
    notice = {title, subtitle, kind};
  }

  function unavailable(title) {
    showNotice(title, label('Đang triển khai', 'In development'));
  }

  const func = (name, value = name) => action(name, call('inputFunction', value + '('));
  const signs = (list) => list.map(sign => action(sign, call('inputRelational', sign)));
  const complexCatalog = (quick = false) => [
    action('i', call('inputImaginary')), action('∠', call('inputPolarSeparator')),
    func(quick ? 'Arg(' : 'Argument', 'Arg'), func(quick ? 'Conjg(' : label('Sốphức liên hợp','Conjugate'), 'Conjg'),
    func(quick ? 'ReP(' : label('Phần thực','Real Part'), 'ReP'), func(quick ? 'ImP(' : label('Phần ảo','Imaginary Part'), 'ImP')
  ];
  const openVerifyRelations = () => open(signs(VERIFY_OPERATORS), {columns:2, capacity:6, relations:true});
  const menus880 = {
    analysis: (quick = false) => [
      action(quick ? 'd/dx(' : label('Đạo hàm(d/dx)','Derivative(d/dx)'), call('inputDerivative')),
      action(quick ? '∫(' : label('Tích phân(∫)','Integration(∫)'), call('inputIntegral')),
      action(quick ? 'Σ(' : label('Tổng(Σ)','Summation(Σ)'), call('inputSum')),
      action(quick ? 'Π(' : label('Tích(Π)','Product(Π)'), call('inputProduct')),
      ...(!quick ? [action(label('Số dư','Remainder'),call('inputRemainderDivision')),
        action(label('Logarit(logab)','Logarithm(logab)'),call('inputLogN')),
        func(label('Logarit(log)','Logarithm(log)'),'log'),
        func(label('Logarit Tự nhiên','Natural Logarithm'),'ln')] : [])
    ],
    probability: (quick = false) => [
      ...(!quick ? [action('%',call('inputPercent'))] : []),
      action(quick ? '!' : label('Giai thừa(!)','Factorial(!)'), call('inputOperator', '!')),
      action(quick ? 'P' : label('Chỉnh hợp(P)','Permutation(P)'), call('inputCombinatoric', 'P')),
      action(quick ? 'C' : label('Tổ hợp(C)','Combination(C)'), call('inputCombinatoric', 'C')),
      action(quick ? 'Ran#' : label('Số Ngẫu nhiên','Random Number'), call('inputRandom')),
      action(quick ? 'RanInt#(' : label('SốNguyên Ngẫunhiên','Random Integer'), call('inputRandom', true))
    ],
    numeric: () => [
      func(label('Ước chung lớn nhất','GCD'),'GCD'), func(label('Bội chung nhỏ nhất','LCM'),'LCM'),
      func(label('Giá trị tuyệt đối','Absolute Value'),'Abs'),
      ...(!settings.io.startsWith('line') ? [action(label('Số tp tuần hoàn','Recurring Decimal'),call('inputRecurringDecimal'))] : []),
      action(label('Phần Nguyên','Integer Part'), call('inputIntegerPart')),
      action(label('Làm Tròn','Round Off'), call('inputRound')),
      action(label('Số Nguyên Lớnnhất','Largest Integer'), call('inputIntegerPart', true))
    ],
    angle: (quick = false) => [
      ...['deg', 'rad', 'grad'].map((unit, i) => action(quick ? ['°','ʳ','ᵍ'][i]
        : [label('Độ','Degrees'),label('Radian','Radians'),label('Gradian','Gradians')][i], call('inputAngleUnit', unit))),
      action(quick ? 'Pol(' : label('Tđộ Đềcac → Cực','Rect to Polar'), call('inputCoordinateConversion', true)),
      action(quick ? 'Rec(' : label('Tđộ Cực → Đềcac','Polar to Rect'), call('inputCoordinateConversion', false)),
      action(quick ? '°′″' : label('Độ Phút Giây','Degs Mins Secs'), call('inputDms'))
    ],
    others: () => [
      action('Ans',call('inputAns')), action('π',call('inputPi')), action('e', () => engine.inputEuler()),
      action('√(',call('inputSqrt')), action('ˣ√(',call('inputNthRoot')),
      action('⁻¹',call('inputOperator','⁻¹')), action('²',call('inputOperator','²')),
      action('^(',call('inputPower')), action('−',call('inputNegative')),
      action(',',call('inputComma')), action('(',call('inputOpenParen')), action(')',call('inputCloseParen'))
    ]
  };

  function openCatalog() {
    if (app === 'base-n') {
      const tokens = values => values.map(([name, value]) => action(name, call('inputBaseNToken', value)));
      const pairColumns = {columns:2, capacity:6};
      open([
        branch(label('Phép toán Logic','Logic Operation'), () =>
          tokens([['Neg','Neg('],['Not','Not('],...['and','or','xor','xnor'].map(op => [op,op])]), pairColumns),
        branch(label('Tiền tố Hđếm c…','Base Prefix'), () => tokens([
          [label('Thập phân','Decimal') + '(d)','d'], [label('Thập lục phân','Hexadecimal') + '(h)','h'],
          [label('Nhị phân','Binary') + '(b)','b'], [label('Bát phân','Octal') + '(o)','o']
        ])),
        branch(label('Gtrị Thậplụcph…','Hex Value'), () =>
          [...'ABCDEF'].map(letter => action(letter, call('inputBaseNLetter', letter))), pairColumns)
      ]);
      return;
    }
    const rows = [
      branch(label('Phân tích Hàm', 'Func Analysis'), menus880.analysis),
      branch(label('Xác suất', 'Probability'), menus880.probability),
      branch(label('Phép tính Số', 'Numeric Calc'), menus880.numeric),
      branch(label('Góc/Tđộ/Hệ lục thập', 'Angle/Coord/Sexa'), menus880.angle),
      branch(label('Hyperbol/Lgiác', 'Hyperbolic/Trig'), () =>
        ['sinh','cosh','tanh','sinh⁻¹','cosh⁻¹','tanh⁻¹','sin','cos','tan','sin⁻¹','cos⁻¹','tan⁻¹'].map(name => func(name))),
      branch(label('Ký hiệu Kỹ thuật', 'Engineer Symbol'), () =>
        ['Milli','Micro','Nano','Pico','Femto','Kilo','Mega','Giga','Tera','Peta','Exa']
          .map((name,index) => action(name, call('inputEngineerSymbol', 'mμnpfkMGTPE'[index])))),
      branch(label('Hằng số Khoa học', 'Sci Constants'), () => SCIENTIFIC_CONSTANT_GROUPS.map(group =>
        branch(group[language()], () => group.items.map(([id, symbol]) =>
          action(PLUS_SCIENTIFIC_CONSTANT_SYMBOLS[id] || symbol, call('inputScientificConstant', id),{constant:id})),
        {columns:2,capacity:10,constants:true}))),
      branch(label('Chuyển đổi Đơn vị', 'Unit Conversions'), () => UNIT_CONVERSION_GROUPS.map(group =>
        branch(group[language()], () => group.items.map(({id, label: name}) =>
          action(name, call('inputUnitConversion', id),{conversion:id})),{columns:2,capacity:10,conversions:true}))),
      branch(label('Khác', 'Other'), menus880.others,{columns:2,capacity:8,symbols:true})
    ];
    if (app === 'statistics' && ['input','result'].includes(engine.getState().mode)) {
      rows.unshift(branch(label('Thống kê', 'Statistics'), statisticsCatalog));
    }
    if (app === 'complex') rows.unshift(branch(label('Số phức', 'Complex'), complexCatalog));
    if (app === 'matrix' || app === 'vector') rows.unshift(branch(appName(), () => memoryOptions(app)));
    if (sheet) rows.unshift(branch(appName(), () => [
      action(label('Lấy','Grab'), () => {
        const {row,column,scrollRow,scrollColumn} = sheet;
        sheet.grab = {row,column,scrollRow,scrollColumn};
      }),
      action('=', () => insertSheetToken('=')), action('$', () => insertSheetToken('$')),
      action(':', () => insertSheetToken(':')),
      ...[['Nhỏ nhất','Min','Min'], ['Lớn nhất','Max','Max'],
        ['Trung bình','Mean','Mean'], ['Tổng cộng','Sum','Sum']].map(([vi,en,name]) =>
        action(label(vi,en), () => {
          sheet.draft = true;
          engine.inputFunction(name + '(');
        }))
    ]));
    if (['calculate','complex'].includes(app) && engine.isVerifyActive()) {
      rows.unshift(item(label('Kiểm chứng', 'Verify'), openVerifyRelations, {arrow:true}));
    }
    open(rows);
  }

  function statisticsCatalog() {
    const type = engine.getStatisticsType();
    const pair = {columns:2, capacity:8};
    const tokens = entries => () => entries.map(({token}) => action(token, call('inputStatVariable', token)));
    return [
      branch(label('Phép tính tổng','Summation'), tokens(type.twoVar ? STAT_TWOVAR_SUMMATION_MENU : STAT_SUMMATION_MENU), pair),
      branch(label('Tbình/Psai/Đlệc…','Mean/Var/Dev'), tokens(type.twoVar ? STAT_TWOVAR_VARIABLE_MENU : STAT_VARIABLE_MENU), pair),
      branch(type.twoVar ? label('Nhỏnhất/Lớnnhất','Min/Max') : label('Tthiểu/Tđa/TứPhânvị','Min/Max/Quartile'), tokens(type.twoVar ? STAT_TWOVAR_MINMAX_MENU : STAT_MINMAX_MENU), pair),
      ...(type.twoVar ? [branch(label('Hồi quy','Regression'),
        tokens(type.id === 'quad' ? STAT_QUAD_REGRESSION_MENU : STAT_REGRESSION_MENU), pair)]
        : [branch(label('Phân phối chuẩn','Norm Dist'), () => [
          ...['P','Q','R'].map(name => action(name+'(',call('inputFunction',name+'('))),
          action('►t',call('inputStatVariable','►t'))
        ],pair)])
    ];
  }

  function statisticsModels(command) {
    return STATISTICS_TYPES.filter(type => type.twoVar).map(type =>
      action(type.label, call('statisticsCommand', command + ':' + type.id)));
  }

  function quickCatalog() {
    const engineer = symbols => [...symbols].map(symbol => action(symbol, call('inputEngineerSymbol', symbol)));
    const verify = ['calculate','complex'].includes(app) && engine.isVerifyActive();
    const prefix = app === 'complex' ? complexCatalog(true) : menus880.analysis(true);
    if (!verify && app !== 'complex') prefix.push(action('÷R', call('inputRemainderDivision')));
    const angles = menus880.angle(true);
    open([
      ...(verify ? signs(VERIFY_OPERATORS) : []),
      ...prefix,
      action('logab(', call('inputLogN')), func('log'), func('ln'), action('%', call('inputPercent')),
      ...(verify ? menus880.probability(true).slice(0,3) : menus880.probability(true)), func('GCD'),
      func('LCM'), func('Abs'), action('(□)', call('inputRecurringDecimal')),
      action('Int(', call('inputIntegerPart')), action('Rnd(', call('inputRound')),
      action('Intg(', call('inputIntegerPart', true)), ...(verify ? [...angles.slice(0,3), angles.at(-1)] : angles),
      ...['sinh','cosh','tanh','sinh⁻¹','cosh⁻¹','tanh⁻¹','sin','cos','tan','sin⁻¹','cos⁻¹','tan⁻¹'].map(name => func(name)),
      ...engineer('mμnpfkMGTPE'), action('Ans', call('inputAns')), action('PreAns', call('inputPreAns')),
      action('π', call('inputPi')), action('e', call('inputEuler')), action('√(', call('inputSqrt')),
      action('ˣ√(', call('inputNthRoot')), action('⁻¹', call('inputOperator', '⁻¹')),
      action('²', call('inputOperator', '²')), action('^(', call('inputPower')), action('−', call('inputNegative')),
      action(',', call('inputComma')), action('(', call('inputOpenParen')), action(')', call('inputCloseParen'))
    ], {columns: 3, capacity: 15, highlight: false, quick:true});
  }

  function beginVariableEditor(index) {
    const menu = top();
    if (menu.variables.locked) return;
    const name = 'ABCDEFxyz'[index];
    if (!engine.beginVariableEdit(name)) return;
    variableEditing = index;
    menus = [];
  }

  function variableMenu(isStore = false, initial = 0) {
    engine.finishCalcResult();
    const values = engine.getRecallValues();
    const state = engine.getState();
    const locked = ['statistics','distribution','matrix','vector','spreadsheet','table'].includes(app) && !!state.draftNodes?.length;
    const tableValue=app === 'table' && state.screen === 'table' && !Array.isArray(state.draftNodes)
      ? state.columns?.flatMap(column => column.cells).find(cell => cell.selected)?.value : undefined;
    const canStore = state.mode === 'result' && state.verifyResult == null || Number.isFinite(tableValue);
    const rows = [...'ABCDEFxyz'].map((name,index) => item(name+'='+values[name], () => {
      const recall = () => {insertVariable(name);menus = [];};
      const store = () => {engine.inputSto();engine.inputVariable(name);menus = [];};
      if (isStore) {store();return;}
      const choices = [action(label('Nhớ lại','Recall'),recall)];
      if (canStore) choices.unshift(action(label('Lưu trữ','Store'),store));
      if (!locked) choices.push(item(label('Chỉnh sửa','Edit'), () => {
        menus.pop();
        beginVariableEditor(index);
      }));
      open(choices);
    }));
    open(rows,{columns:2,capacity:10,direct:false,initial,variables:{values,locked}});
  }

  function displayMode(mode) {
    engine.setScalarResultPresentation(mode);
  }

  function formatMenu() {
    const data = engine.getState();
    if (!['result','equation','ratio','inequality'].includes(data.mode) || data.verifyResult != null) return;
    if (data.complexResult) {
      const option = (vi, en, format) => action(label(vi,en), call('setComplexResultPresentation', format));
      const rows = [option('ₐᵦπ√ (Chuẩn)','Standard','exact'), option('Thập phân','Decimal','decimal'),
        option('Tọa độ Đề–cac','Rectangular Coord','rect'), option('Tọa độ Cực','Polar Coord','polar')];
      if (data.complexFractionFormat) rows.push(option('Phân số Kothựcsự','Improp Fraction','improper'),
        option('Hỗn số','Mixed Number','mixed'));
      if (data.complexResult.im === 0) rows.push(option('Hệ lục thập phân','Sexagesimal','dms'));
      open(rows);
      return;
    }
    if (data.mode === 'equation' || data.mode === 'inequality' || data.mode === 'ratio') {
      const root = data.result;
      const ratio = data.mode === 'ratio';
      if (ratio ? root == null : !['root','set'].includes(root?.kind) || root.form === 'message') return;
      const format = (name, value) => action(name, call('setCoefficientResultFormat', value));
      const rows = [format(label('ₐᵦπ√ (Chuẩn)', 'Standard'), 'exact'), format(label('Thập phân', 'Decimal'), 'decimal')];
      if (ratio ? engine.resultFormatOptions().fraction : root.fractionFormat) rows.push(format(label('Phân số Kothựcsự', 'Improper Fraction'), 'improper'),
        format(label('Hỗn số', 'Mixed Number'), 'mixed'));
      if (root.complexFormat) rows.push(format(label('Tọa độ Đề–cac','Rectangular Coord'), 'rect'),
        format(label('Tọa độ Cực','Polar Coord'), 'polar'));
      if (ratio) rows.push(format(label('Hthi số kthuật', 'ENG Notation'), 'engineering'));
      if (ratio || root.sexagesimalFormat) rows.push(format(label('Hệ lục thập phân','Sexagesimal'), 'dms'));
      open(rows);
      return;
    }
    const rows = [
      action(label('ₐᵦπ√ (Chuẩn)', 'Standard'), () => displayMode('standard')),
      action(label('Thập phân', 'Decimal'), () => displayMode('decimal'))
    ];
    const eligible = engine.resultFormatOptions();
    if (eligible.recurring) rows.push(action(label('Số thập tuần hoàn','Recurring Decimal'), () => displayMode('recurring')));
    if (eligible.fraction) rows.push(
      action(label('Phân số Kothựcsự', 'Improper Fraction'), () => displayMode('improper')),
      action(label('Hỗn số', 'Mixed Number'), () => displayMode('mixed'))
    );
    if (eligible.prime) rows.push(
      action(label('Thừa số Nguyên tố', 'Prime Factor'), call('primeFactorization'))
    );
    if (eligible.engineering) rows.push(action(label('Hthi số kthuật', 'ENG Notation'), call('pressEngineering', 'down')));
    rows.push(action(label('Hệ lục thập phân', 'Sexagesimal'), call('inputDms', true)));
    open(rows);
  }

  function appName(id = app) {
    const entry = HOME_APPS.find(entry => entry.id === id);
    return entry?.[language()] || id;
  }

  function modeMenu(id) {
    switch (id) {
      case 'statistics':
        open([
          item(label('Tính tkê 1-biến','1-Variable'), () => selectStatisticsType('1var')),
          item(label('Tính tkê 2-biến','2-Variable'), () => selectStatisticsType('linear'))
        ]);
        top().statisticsTypeMenu = true;
        break;
      case 'distribution':
        open([
          ['binomial-pd','Xsuất nhị thức'], ['binomial-cd','Pp tlũy nhịthức'],
          ['normal-pd','Mđộ xsuất chuẩn'], ['normal-cd','Pp tlũy chuẩn'], ['inverse-normal','Ngược pptlchuẩn'],
          ['poisson-pd','Xsuất Poisson'], ['poisson-cd','Pp tlũy Poisson']
        ].map(([id, vi]) => {
          const type = distributionTypeById(id);
          const name = label(vi, type.label);
          return type.needsInputMethod ? branch(name, () => [
            action(label('Danh sách', 'List'), call('setDistributionType', type.id, 'list')),
            action(label('Biến', 'Variable'), call('setDistributionType', type.id, 'variable'))
          ]) : action(name, call('setDistributionType', type.id, 'variable'));
        }));
        break;
      case 'equation': {
        const polynomials = ['ax²+bx+c=0','ax³+bx²+cx+d=0','ax⁴+bx³+cx²…+e=0'];
        open([
          item(label('Hệ phương trình', 'Simul Equation'), () => open([2,3,4].map(n =>
            action(n + label(' Ẩn số', ' Unknowns'), call('setEquationType', 'simul' + n))))),
          item(label('Phương trình', 'Polynomial'), () => open(polynomials.map((name, i) =>
            action(name, call('setEquationType', 'poly' + (i + 2)))))),
          action(label('Bộ giải pt','Solver'), () => { engine.setCalcMode('calculate'); app = 'equation'; })
        ]);
        break;
      }
      case 'inequality': {
        const polynomials = ['ax²+bx+c','ax³+bx²+cx+d','ax⁴+bx³+cx²+dx+e'];
        open(polynomials.map((name, i) => item(name, () => open(INEQUALITY_RELATIONS.map(t =>
          action(name + t.symbol + '0', call('setInequalityType', 'poly' + (i + 2) + '-' + t.id)))))));
        break;
      }
      case 'ratio':
        open(RATIO_TYPES.map(type => action(type.label.replaceAll(' ', ''), call('setRatioType', type.id))));
        break;
      case 'matrix':
      case 'vector':
        engine[id + 'Command']('calc');
        break;
      case 'math-box':
        engine.setInputOutput(settings.io);
        open([
          item(label('Tung Xúc xắc','Dice Roll'), () => startTrials(6)),
          item(label('Tung Đồng xu','Coin Toss'), () => startTrials(2)),
          action(label('Đường thẳng Số','Number Line'), () => {
            engine.setInputOutput('lineio');
            lineBox = {stage:'list', cursor:0, entries:[null,null,null], target:0, draft:false};
          }),
          action(label('Đường tròn','Circle'), () => {
            circleBox = {type:'unit', stage:'form', cursor:0, angles:[null,null], expressions:[[],[]], draft:false, hour:12};
          })
        ], {mathBoxRoot:true});
        break;
      case 'math-explorer':
        openExplorerMenu();
        break;
      case 'spreadsheet':
        engine.setInputLimit(49);
        engine.clear();
        sheet = {data:sheetData, row:0, column:0,
          scrollRow:0, scrollColumn:0, draft:false, error:null, grab:null};
        break;
    }
  }

  function selectStatisticsType(typeId) {
    const choose = () => { menus = []; engine.setStatisticsType(typeId); };
    const changesColumns = !!engine.getStatisticsType().twoVar !== !!statisticsTypeById(typeId).twoVar;
    if (changesColumns && engine.hasStatisticsData()) {
      open([action(label('Có','Yes'), choose), item(label('Hủy','Cancel'), () => menus.pop())],
        {direct:false, confirmation:label('Xóa Dữ liệu?','Clear Data?')});
    } else choose();
  }

  function memoryOptions(id) {
    const prefix = id === 'matrix' ? 'Mat' : 'Vct';
    const tokenMethod = id === 'matrix' ? 'inputMatrixToken' : 'inputVectorToken';
    const tokens = [...'ABCD'].map(name => action(prefix + name, call(tokenMethod, prefix + name)));
    const functions = id === 'matrix'
      ? [
        action(label('Bìnhphương Matr…','Matrix Squared'), call('inputOperator','²')),
        action(label('Lập phương Matr…','Matrix Cubed'), call('inputOperator','³')),
        action(label('Matrận Nghịch đ…','Inverse Matrix'), call('inputOperator','⁻¹')),
        ...[['Định thức','Det','Determinant'],['Mtrận chuyển vị','Trn','Transposition'],['Ma trận đơn vị','Identity','Identity']].map(([vi, name, en]) =>
          action(label(vi, en), call('inputMatrixFunction', name)))
      ] : [
        action(label('Tích vô hướng','Dot Product'), call('inputVectorDot')),
        action(label('Tích có hướng','Cross Product'), call('inputOperator','×')),
        ...[['Góc giữa 2vectơ','Angle','Angle'],['Vectơ đơn vị','UnitV','Unit Vector']].map(([vi, name, en]) =>
          action(label(vi, en), call('inputVectorFunction', name)))
      ];
    return [
      branch(id === 'matrix' ? label('Tính toán Matr…','Matrix Calc') : label('Phép tính Vectơ','Vector Calc'), () => functions),
      ...tokens, action(prefix + 'Ans', call(tokenMethod, prefix + 'Ans'))
    ];
  }

  function openArraySize(id, index) {
    const matrix = id === 'matrix';
    const title = matrix ? label('Kích thước Matrận','Matrix Size?') : label('Kích thước Vectơ?','Vector Dimension?');
    const names = matrix ? [label('Dòng','Rows'), label('Cột','Columns')] : [label('Kích thước','Dimensions')];
    const values = names.map(() => 2);
    const options = matrix ? [1,2,3,4] : [2,3];
    const confirmSize = action(label('Xác nhận','Confirm'), () => {
      engine[id + 'Command']('define');
      engine.inputDigit(String(index + 1));
      values.forEach(value => engine.inputDigit(String(value)));
    });
    const settingsMenu = names.map((name, field) => branch(name, () => options.map(value =>
      item(value + (matrix ? ' ' + (settings.language === 'en' && value === 1 ? ['Row','Column'][field] : name) : label(' chiều',' Dimensions')), () => {
        values[field] = value;
        menus.pop();
        top().selected = field + 1;
      }))));
    open([...settingsMenu, confirmSize], {direct:false, size:{title, values}});
  }

  function openArrayMemory(id) {
    const matrix = id === 'matrix';
    const prefix = matrix ? 'Mat' : 'Vct';
    const memory = matrix ? engine.getMatrixMemory() : engine.getVectorMemory();
    open([...'ABCD'].map((letter, index) => {
      const name = prefix + letter;
      const stored = memory[name];
      const dimensions = stored ? (matrix ? stored.rows + '×' + stored.cols : stored.dimension) : label('Không có','None');
      return item(name + ':' + dimensions, () => {
        if (!stored) { openArraySize(id, index); return; }
        open([
          action(label('Chỉnh sửa','Edit'), () => {
            engine[id + 'Command']('edit');
            engine.inputDigit(String(index + 1));
          }),
          item(label('Tạo mới Ma trận','Define New'), () => openArraySize(id, index))
        ]);
      });
    }));
  }

  function openTools() {
    const rows = [];
    if (app === 'calculate') {
      if (!engine.isVerifyActive()) rows.push(action('CALC', call('calc')));
      if (!settings.io.startsWith('line')) rows.push(action(label('Hoàn tác', 'Undo'), call('undoEdit')));
    }
    if (app === 'complex' && !settings.io.startsWith('line')) rows.push(action(label('Hoàn tác', 'Undo'), call('undoEdit')));
    if (app === 'complex') rows.push(action(engine.isVerifyActive() ? label('Kiểm chứng Tắt','Verify OFF') : label('Kiểm chứng Bật','Verify ON'),
        call('toggleComplexVerify')));
    if (app === 'calculate') {
      const on = engine.getCalcMode() === 'verify';
      rows.push(action(label(on ? 'Kiểm chứng Tắt' : 'Kiểm chứng Bật', on ? 'Verify OFF' : 'Verify ON'),
        () => engine.setCalcMode(on ? 'calculate' : 'verify')));
    }
    if (app === 'equation' && engine.getCalcMode() === 'calculate') rows.push(action('Solver', call('solve')));
    if (app === 'base-n') return;
    if (app === 'distribution' && engine.getState().screen === 'list') {
      open([branch(label('Chỉnh sửa','Edit'), () => [
        action(label('Chèn dòng','Insert Row'), call('distributionCommand','insert-row')),
        action(label('Xóa tất cả','Delete All'), call('distributionCommand','delete-all'))
      ])]);
      return;
    }
    if (app === 'matrix' || app === 'vector') {
      const data = engine.getState();
      if (['editor','result'].includes(data.screen)) {
        const prefix = app === 'matrix' ? 'Mat' : 'Vct';
        open([
          branch(label('Lưu trữ','Store'), () => [...'ABCD'].map(letter =>
            action(prefix + letter, () => {engine.inputSto(); engine.inputVariable(letter);}))),
          item(app === 'matrix' ? label('Xác định Matrận','Define Matrix') : label('Xác định Vectơ','Define Vector'),
            () => openArrayMemory(app))
        ]);
      } else openArrayMemory(app);
      return;
    }
    if (app === 'statistics' && engine.getState().screen === 'editor') {
      const columns = engine.getState().columns;
      const two = columns.some(column => column.key === 'y');
      open([
        branch(label('Chỉnh sửa', 'Edit'), () => [
          action(label('Chèn dòng','Insert Row'), call('statisticsCommand','insert-row')),
          action(label('Xóa tất cả','Delete All'), call('statisticsCommand','delete-all'))
        ]),
        branch(label('Tần số bật','Frequency'), () => [
          [true, label('Mở','On')], [false, label('Tắt','Off')]
        ].map(([value, name]) => item(name, () => {
          if (value !== engine.getStatisticsFrequency()) engine.setStatisticsFrequency(value);
        }, {radio:() => value === engine.getStatisticsFrequency()})), {title:label('Tần số bật','Frequency')}),
        branch(label('Sắp xếp','Sort'), () => (two ? columns : [{key:'',label:label('','x')}]).flatMap(column => [
          ['ascending', label('Tăng dần','Ascending')], ['descending', label('Giảm dần','Descending')]
        ].map(([order, name]) => action([column.label, name].filter(Boolean).join(' '),
          call('statisticsCommand', 'sort-' + order + (column.key ? '-' + column.key : ''))))))
      ]);
      return;
    }
    if (app === 'statistics' && engine.getStatisticsType().twoVar) {
      open([
        action(label('Kết quả 2-biến','2-Var Results'), call('statisticsCommand','stats')),
        action(label('Kết quả Hồi quy','Reg Results'), call('statisticsCommand','regression')),
        branch(label('Chọn Loại Hồiq…','Select Reg Type'), () => statisticsModels('calc'))
      ]);
      return;
    }
    if (app === 'statistics' && ['input','result'].includes(engine.getState().mode)) {
      open([action(label('Kết quả 1-biến','1-Var Results'), call('statisticsCommand','stats'))]);
      return;
    }
    if (app === 'statistics') rows.push(
      action(label('Tính 1 biến','1-Variable Calc'), call('statisticsCommand', 'stats')),
      action(label('Tính hồi quy','Regression Calc'), call('statisticsCommand', 'regression')),
      action(label('Dữ liệu','Data'), call('statisticsCommand', 'editor')),
      branch(label('Tần số','Frequency'), () => onOff().map(([value, name]) => action(name, call('setStatisticsFrequency', value))))
    );
    if (app === 'table') rows.push(
      action(label('Phạm vi bảng','Table Range'), call('tableCommand', 'range')),
      branch(label('Xđịnh f(x)/g(x)','Define f(x)/g(x)'), tableFunctionsMenu),
      item(label('Loại Bảng','Table Type'), () => open([
        ['fg','f(x)/g(x)'], ['f','f(x)'], ['g','g(x)']
      ].map(([type, name], index) => item(name, () => {
        engine.setTableFunctions(type);
        top().selected = index;
      }, {radio:() => engine.getTableFunctions() === type})),
      {initial:['fg','f','g'].indexOf(engine.getTableFunctions())}), {arrow:true}),
      branch(label('Chỉnh sửa','Edit'), () => [
        action(label('Chèn dòng','Insert Row'), call('tableCommand','insert-row')),
        action(label('Xóa tất cả','Delete All'), call('tableCommand','clear-table'))
      ]),
      ...(!engine.isVerifyActive() ? [action(label('Tính lại','Recalculate'), call('tableCommand','recalculate'))] : []),
      action(engine.isVerifyActive() ? label('Kiểm chứng Tắt','Verify OFF') : label('Kiểm chứng Bật','Verify ON'),
        call('tableCommand','verify'))
    );
    if (app === 'statistics' || app === 'distribution' || app === 'equation' || app === 'inequality' || app === 'ratio') {
      rows.push(action(label('Chọn loại', 'Select Type'), () => modeMenu(app)));
    }
    open(rows);
  }

  function tableFunctionsMenu() {
    return [
      action(label('Xác định f(x)','Define f(x)'), call('tableCommand','f')),
      action(label('Xác định g(x)','Define g(x)'), call('tableCommand','g'))
    ];
  }

  function openRegisteredFunctions() {
    const state = engine.getState();
    if (app === 'table' && state.screen === 'table' && !state.columns[0].cells.some(cell => cell.selected)) return;
    const editing = state.mode === 'function-edit' || (app === 'table' && state.screen === 'func');
    const insert = name => action(name + '(x)', call('inputFunction', name + '('));
    if (editing) open([insert(state.prompt.startsWith('f') ? 'g' : 'f')]);
    else if (app === 'calculate' || app === 'table') {
      open([insert('f'), insert('g'),
        action(label('Xác định f(x)','Define f(x)'), app === 'table' ? call('tableCommand','f') : call('editRegisteredFunction','f')),
        action(label('Xác định g(x)','Define g(x)'), app === 'table' ? call('tableCommand','g') : call('editRegisteredFunction','g'))]);
    }
  }

  function launch(index) {
    if (!HOME_APPS[index]) return;
    home = false;
    homeIndex = index;
    const nextApp = HOME_APPS[index].id;
    if (app === 'math-explorer' && nextApp !== app) {
      probabilityMemory = {};
      groupedRange = [0, 50, 10];
      groupedRangeFractions = null;
      geometryMemory = {points:[null,null,null], lines:[null,null], values:{}};
    }
    const reenteringBase = app === 'base-n' && nextApp === 'base-n';
    const reenteringVerify = app === 'calculate' && nextApp === 'calculate' && engine.isVerifyActive();
    app = nextApp;
    engine.setInputLimit(app === 'spreadsheet' ? 49 : 199);
    engine.setInputOutput(app === 'spreadsheet' ? 'lineio' : settings.io);
    explorer = null;
    mathBox = null;
    lineBox = null;
    circleBox = null;
    sheet = null;
    menus = [];
    if (reenteringBase) engine.clear();
    else engine.setCalcMode(reenteringVerify ? 'verify' : ['spreadsheet','math-box','math-explorer'].includes(app) ? 'calculate' : app, true);
    modeMenu(app);
  }

  function startTrials(faces) {
    mathBox = {faces, count:1, attempts:5, repeat:false, cursor:0, stage:'form'};
    openTrialForm();
  }

  function openTrialForm(initial = 0) {
    const t = mathBox;
    t.stage = 'form';
    open([
      branch(t.faces === 6 ? label('Số xúc xắc','Dice') : label('Số đồng xu','Coins'), () =>
        [1,2,3].map(count => action(count + (t.faces === 6 ? label(' Xúc xắc',count === 1 ? ' Die' : ' Dice')
          : label(' Đồng xu',count === 1 ? ' Coin' : ' Coins')), () => {
          t.count = count;
          openTrialForm(1);
        }))),
      item(label('Số lần thử','Attempts'), () => {
        t.editor = {value:t.attempts,cursor:0,draft:false,error:null};
        engine.clear();
      }),
      branch(label('Cùng Kết quả','Same Result'), () => [false,1,2,3].map(repeat =>
        action(repeat ? '#' + repeat : label('Tắt','Off'), () => {
          t.repeat = repeat;
          openTrialForm(3);
        }))),
      item(label('Vận hành','Execute'), () => {
        t.rows = randomTrials880(t.faces,t.count,t.attempts,t.repeat);
        t.stage = 'view-menu';
        openTrialViews();
      })
    ], {direct:false,initial,trialForm:t});
  }

  function openTrialViews() {
    const t = mathBox;
    menus = [];
    open([
      item(label('Danh sách','List'), () => {t.stage = 'list'; t.cursor = 0;}),
      item(label('Tần số Tương đối','Relative Freq'), () => {t.stage = 'frequency'; t.cursor = 0;})
    ], {title:label('Loại Kết quả','Result Type'),trialViews:true});
  }

  function pressTrials(key, shift) {
    const t = mathBox;
    if (t.editor) {
      const edit = t.editor;
      if (edit.error) {
        if (['back','ac','exe','ok'].includes(key)) {
          if (engine.getState().mode === 'error') inputAction('moveCursor','right');
          edit.error = null;
        }
        return;
      }
      if (key === 'back' || key === 'ac') {
        if (edit.draft) engine.clear();
        else {t.editor = null; engine.clear();}
      } else if (key === 'exe' || key === 'ok') {
        if (edit.draft) {
          if (!engine.getState().nodes?.length) return;
          const result = engine.getDraftValue();
          if (!result) { edit.error = engine.getState().message || 'Syntax ERROR'; return; }
          const value = result.value;
          if (!Number.isInteger(value) || value < 1 || value > 250) {edit.error = 'Range ERROR'; return;}
          Object.assign(edit,{value,cursor:1,draft:false});
          engine.clear();
        } else if (edit.cursor === 0) edit.cursor = 1;
        else {
          t.attempts = edit.value;
          t.editor = null;
          menus = [];
          openTrialForm(2);
        }
      } else if (edit.draft && arrows.includes(key)) inputAction('moveCursor',key);
      else if (key === 'up' || key === 'down') edit.cursor = 1 - edit.cursor;
      else if (edit.cursor === 0) {
        edit.draft = true;
        executeInput(key,shift);
      }
    } else if (key === 'back' || key === 'ac') {
      t.stage = 'view-menu';
      openTrialViews();
    } else {
      const count = t.stage === 'list' ? Math.max(1,t.attempts-3) : (t.faces - 1) * t.count + 1;
      t.cursor = navigation(key, t.cursor, count, 1, 4);
    }
  }

  function describeTrials() {
    const t = mathBox;
    if (!t) return null;
    if (t.editor) {
      const edit = t.editor;
      if (edit.error) return {mode:'error',message:edit.error};
      const state = engine.getState();
      return {mode:'trial-attempts',value:edit.value,cursor:edit.cursor,
        ...(edit.draft ? {draftNodes:state.nodes,cursorList:state.cursorList,cursorIndex:state.cursorIndex} : {})};
    }
    if (!['list','frequency'].includes(t.stage)) return null;
    const heading = t.stage === 'list' ? ['#', ...'ABC'.slice(0,t.count), ...(t.count > 1 ? [t.faces === 6 ? 'Sum' : '●'] : [])]
      : [t.faces === 6 ? 'Sum' : 'Side','n','Rel Fr'];
    const rows = t.stage === 'list' ? t.rows.map((values,i) => [i+1,...values,
      ...(t.count > 1 ? [values.reduce((sum,value) => sum+value,0)] : [])]) : trialFrequencies880(t.rows,t.faces);
    return {mode:'extras-grid', heading, rows, cursor:t.cursor, column:heading.length - 1,
      trialStage:t.stage,trialFaces:t.faces,trialCount:t.count,attempts:t.attempts,
      selectedText:t.stage === 'frequency' ? formatNumber(rows[t.cursor][2],settings.number) : ''};
  }

  function editLineBounds(relation, values, expressions = null) {
    Object.assign(lineBox, {stage:'bounds', relation, values:values.slice(), cursor:0, draft:false,
      expressions:expressions ? expressions.map(cloneNodes) : values.map(() => [])});
    engine.clear();
  }

  function lineRelations() {
    open(NUMBER_LINE_RELATIONS_880.map(relation =>
      action(relation, () => editLineBounds(relation, relation.includes('b') ? [null,null] : [null]))));
  }

  function startLinePlot(resetSelection) {
    const window = numberLineWindow880(lineBox.entries);
    if (window.scale < 1e-10 || window.scale > 1e10 || Math.abs(window.center) > 1e10) {
      lineBox.error = 'Range ERROR';
      return;
    }
    lineBox.window = window;
    lineBox.stage = 'plot';
    if (resetSelection) lineBox.cursor = lineBox.entries.findIndex(Boolean);
  }

  function pressNumberLine(key, shift) {
    const line = lineBox;
    if (line.error) {
      if (['back','ac','exe','ok'].includes(key)) {
        if (line.draft && line.error !== 'Range ERROR') inputAction('moveCursor','right');
        line.error = null;
        if (line.stage === 'bounds') line.cursor = 0;
      }
      return;
    }
    if (line.stage === 'plot') {
      if (key === 'ac' || key === 'back') Object.assign(line, {stage:'list', cursor:0});
      else if (key === 'left' || key === 'right') {
        line.window.center = Math.max(-1e10,Math.min(1e10,tableStepValue(line.window.center, line.window.scale, key === 'left' ? -1 : 1)));
      } else if (key === 'up' || key === 'down') {
        const visible = line.entries.map((entry, index) => entry && index).filter(index => index !== null);
        line.cursor = visible[(visible.indexOf(line.cursor) + visible.length + (key === 'up' ? -1 : 1)) % visible.length];
      } else if (key === 'tools') open([
        action(label('Xem-Cửa sổ','View-Window'), () => {
          Object.assign(line, {stage:'window', values:[line.window.scale,line.window.center], plotCursor:line.cursor, cursor:0});
        }),
        action(label('Xem-Đặt lại','View-Reset'), () => startLinePlot(false))
      ]);
      return;
    }
    const execute = key === 'exe' || key === 'ok';
    if (line.draft) {
      if (key === 'back' || key === 'ac') {
        if (key === 'back') line.draft = false;
        engine.clear();
      } else if (execute) {
        if (!engine.getState().nodes?.length) return;
        if (line.stage === 'bounds') {
          line.expressions[line.cursor] = cloneNodes(engine.getState().nodes);
          line.values[line.cursor++] = 0;
          line.draft = false;
          engine.clear();
          return;
        }
        const value = engine.getDraftValue()?.value;
        if (!Number.isFinite(value)) {
          line.error = engine.getState().message || 'Math ERROR';
        } else if (line.stage === 'window' &&
            (line.cursor === 0 ? value < 1e-10 || value > 1e10 : Math.abs(value) > 1e10)) {
          line.error = 'Range ERROR';
          engine.editSpreadsheetCell(engine.getState().nodes);
        } else {
          if (line.stage === 'bounds') line.expressions[line.cursor] = cloneNodes(engine.getState().nodes);
          line.values[line.cursor++] = value;
          line.draft = false;
          engine.clear();
        }
      } else if (key === 'left' || key === 'right') inputAction('moveCursor',key);
      else executeInput(key, shift);
      return;
    }
    const list = line.stage === 'list';
    const last = list ? line.entries.length : line.values.length;
    if (key === 'up' || key === 'down') {
      line.cursor = (line.cursor + last + 1 + (key === 'up' ? -1 : 1)) % (last + 1);
    } else if (key === 'back' || key === 'ac') {
      if (line.stage === 'window') Object.assign(line, {stage:'plot', cursor:line.plotCursor});
      else if (!list) Object.assign(line, {stage:'list', cursor:line.target});
      else {lineBox = null; modeMenu(app);}
    } else if (list) {
      if (key === 'delete' && line.cursor < last) line.entries[line.cursor] = null;
      if (!execute && key !== 'right') return;
      if (line.cursor === last) {
        if (line.entries.some(Boolean)) startLinePlot(true);
      } else {
        line.target = line.cursor;
        const selected = line.entries[line.target];
        if (selected) open([
          action(label('Chỉnh sửa','Edit'), () => editLineBounds(selected.relation, selected.values, selected.expressions)),
          item(label('Tạo mới Ma trận','Define New'), lineRelations)
        ]);
        else lineRelations();
      }
    } else if (execute && line.cursor === last) {
      if (line.stage === 'window') {
        line.window = {scale:line.values[0], center:line.values[1]};
        Object.assign(line, {stage:'plot', cursor:line.plotCursor});
      } else if (line.values.every(value => value !== null)) {
        try {
          line.values = line.expressions.map(nodes => engine.evaluateSpreadsheetCell(nodes));
        } catch (error) {
          line.error = error.message;
          return;
        }
        if (line.values.some(value => Math.abs(value)>1e10) ||
            (line.values.length === 2 && line.values[0] > line.values[1])) {
          line.error = 'Range ERROR';
          return;
        }
        line.entries[line.target] = {relation:line.relation, values:line.values.slice(),
          expressions:line.expressions.map(cloneNodes)};
        Object.assign(line, {stage:'list', cursor:line.target + 1});
      }
    } else if (line.cursor < last) {
      if (execute) {
        line.draft = true;
        if (line.stage === 'bounds') engine.editSpreadsheetCell(line.expressions[line.cursor]);
        else engine.clear();
      }
      else if (!['left','right','delete','tools'].includes(key)) {
        line.draft = true;
        engine.clear();
        executeInput(key, shift);
      }
    }
  }

  function describeNumberLine() {
    if (!lineBox) return null;
    if (lineBox.error) return {mode:'error',message:lineBox.error};
    const {stage, entries, relation, values, draft, window, cursor} = lineBox;
    const number = value => {
      if (value === null) return '';
      const text = formatNumber(value,settings.number).replace('-', '−');
      if (stage === 'window') return numberLineCompact880(value);
      return text.replace(/×10([⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+)/g,(_,power) => '×10^('+[...power].map(c=>c==='⁻'?'−':String('⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(c))).join(''));
    };
    const edit = draft ? engine.getState() : null;
    return {mode:'number-line', stage, cursor, window,
      values:stage === 'bounds' ? values.map((value,index) => value === null ? '' : numberLineExpression880(lineBox.expressions[index])) : values?.map(number), relation, entries,
      texts:entries.map(entry => numberLineText880(entry, number)),
      ...(edit ? {draftNodes:edit.nodes, cursorList:edit.cursorList, cursorIndex:edit.cursorIndex} : {})};
  }

  function pressCircle(key, shift) {
    const circle = circleBox;
    if (circle.stage === 'error') {
      if (['ok','exe','back','ac'].includes(key)) Object.assign(circle, {stage:'form', cursor:0});
      return;
    }
    if (circle.stage === 'plot') {
      if (key === 'ac' || key === 'back') Object.assign(circle, {stage:'form', cursor:0});
      else if (key === 'up' || key === 'down') {
        if (circle.type === 'clock') circle.hour = (circle.hour + 11 + (key === 'up' ? 1 : -1)) % 12 + 1;
        else if (circle.angles.every(value => value !== null)) circle.cursor = 1 - circle.cursor;
      }
      return;
    }
    const execute = ['ok','exe'].includes(key);
    const last = circle.type === 'clock' ? 1 : 3;
    if (circle.draft) {
      if (key === 'ac' || key === 'back') {if (key === 'back') circle.draft = false; engine.clear();}
      else if (execute) {
        if (!engine.getState().nodes?.length) return;
        // Mark the field as present; evaluate its expression only on Execute.
        circle.angles[circle.cursor - 1] = 0;
        circle.expressions[circle.cursor - 1] = cloneNodes(engine.getState().nodes);
        circle.cursor++;
        circle.draft = false;
        engine.clear();
      } else if (key === 'left' || key === 'right') inputAction('moveCursor',key);
      else executeInput(key, shift);
      return;
    }
    if (key === 'delete' && circle.cursor > 0 && circle.cursor < last) {
      circle.angles[circle.cursor-1] = null;
      circle.expressions[circle.cursor-1] = [];
    }
    else if (key === 'up' || key === 'down') circle.cursor = (circle.cursor + last + 1 + (key === 'up' ? -1 : 1)) % (last + 1);
    else if (key === 'back' || key === 'ac') {circleBox = null; modeMenu(app);}
    else if ((execute || key === 'right') && circle.cursor === 0) {
      open([['unit','Đtròn Đơnvị','Unit Circle'], ['semi','Nửa Đtròn','Half Circle'], ['clock','Đồng hồ','Clock']].map(([type,vi,en]) =>
        action(label(vi,en), () => Object.assign(circle, {type, cursor:1, angles:[null,null], expressions:[[],[]]}),
          {radio:() => circle.type === type})), {circleTypes:true});
    } else if (execute && circle.cursor === last) {
      circle.error = 'Range ERROR';
      try {
        circle.angles = circle.expressions.map(nodes => nodes.length ? engine.evaluateSpreadsheetCell(nodes) : null);
      } catch (error) {
        circle.error = error.message;
        circle.stage = 'error';
        return;
      }
      const angles = circle.angles.filter(value => value !== null);
      if (circle.type !== 'clock' && !angles.length) return;
      const valid = circle.type === 'clock' || angles.length && angles.every(value => circle.type === 'unit'
        ? Math.abs(value) < 10000 : value >= 0 && toRadians(value, settings.angle) <= Math.PI);
      if (valid) Object.assign(circle, {stage:'plot', cursor:circle.angles[0] === null ? 1 : 0, hour:12});
      else circle.stage = 'error';
    } else if (execute) {
      circle.draft = true;
      engine.editSpreadsheetCell(circle.expressions[circle.cursor-1]);
    }
    else if (circle.cursor > 0 && circle.cursor < last && !['left','right','tools','delete'].includes(key)) {
      circle.draft = true;
      engine.clear();
      executeInput(key, shift);
    }
  }

  function describeCircle() {
    if (!circleBox) return null;
    const {stage, type, cursor, angles, draft, hour} = circleBox;
    const edit = draft ? engine.getState() : null;
    return {mode:'circle', stage, type, cursor, angles, hour, error:circleBox.error,
      angleTexts:circleBox.expressions.map(numberLineExpression880),
      ...(edit ? {draftNodes:edit.nodes, cursorList:edit.cursorList, cursorIndex:edit.cursorIndex} : {})};
  }

  function insertSheetToken(text) {
    if (!sheet.fill) sheet.draft = true;
    if (text === '=') engine.inputRelational('=');
    else engine.inputSpreadsheetToken(text);
  }

  function editSheetCell() {
    const {data, row, column} = sheet;
    const value = data.get(row,column);
    engine.editSpreadsheetCell(data.formula(row,column) || (typeof value === 'number' ? sheetNumberNodes880(value) : []));
    sheet.draft = true;
  }

  function openSheetTools() {
    open([
      ...[true,false].map(formula => action(formula ? label('Điền công thức','Fill Formula') : label('Điền giá trị','Fill Value'), () => {
        const name = sheet.data.name(sheet.row,sheet.column);
        sheet.fill = {formula, nodes:[], range:name + ':' + name, cursor:0, editing:false};
        engine.clear();
        engine.setInputLimit(formula ? 48 : 49);
      })),
      action(label('Sửa ô','Edit Cell'), editSheetCell),
      action(label('Bộ nhớ Khả dụng','Available Memory'), () => {sheet.showMemory = true;}),
      ...[true,false].map(cut => action(cut ? label('Cắt & dán','Cut & Paste') : label('Sao chép và dán','Copy & Paste'), () => {
        const {row,column,data} = sheet;
        const value = data.get(row,column);
        sheet.clipboard = {row,column,cut,errorValue:data.constantError(row,column),nodes:cloneNodes(data.formula(row,column) ||
          (typeof value === 'number' ? sheetNumberNodes880(value) : []))};
      })),
      action(label('Xóa tất cả','Delete All'), () => {
        sheet.data.reset();
        Object.assign(sheet, {row:0, column:0, scrollRow:0, scrollColumn:0, draft:false});
        engine.clear();
      }),
      action(label('Tính lại','Recalculate'), () => {
        sheet.error = sheet.data.recalculate();
        sheet.hideErrorStatus = !!sheet.error;
      }),
      branch(label('Tự động tính','Auto Calc'), () => choices('sheetAutoCalc', [
        [true,label('Mở','On')], [false,label('Tắt','Off')]
      ]), {title:label('Tự động tính?','Auto Calc?')}),
      branch(label('Hiện ô','Show Cell'), () => choices('sheetShowCell', [
        ['formula',label('Công thức','Formula')], ['value',label('Giá trị','Value')]
      ]), {sheetPreference:true})
    ]);
    top().sheetTools = true;
  }

  function moveSheetSelection(key, position) {
    if (key === 'left' || key === 'right') position.column = navigation(key, position.column, SHEET_COLUMNS_880.length, 1, 1);
    else position.row = navigation(key, position.row, SHEET_ROWS_880, 1, 4);
    position.scrollColumn = Math.min(position.column, Math.max(position.scrollColumn, position.column - 3));
    position.scrollRow = Math.min(position.row, Math.max(position.scrollRow, position.row - 3));
  }

  function pressSheet(key, shift) {
    const t = sheet;
    const {data, row, column, draft, grab} = t;
    const exit = key === 'ac' || key === 'back';
    const enter = key === 'exe' || key === 'ok';
    if (t.error) {
      if (exit || enter) { t.error = null; t.hideErrorStatus = false; }
    } else if (t.showMemory) {
      if (exit || enter) t.showMemory = false;
    } else if (t.fill) {
      pressSheetFill(key,shift);
    } else if (t.clipboard) {
      if (exit) t.clipboard = null;
      else if (enter) {
        const {row:sourceRow,column:sourceColumn,nodes,cut,errorValue} = t.clipboard;
        try {
          t.error = data.transfer(sourceRow,sourceColumn,row,column,nodes,cut,settings.sheetAutoCalc,errorValue);
          if (!t.error) moveSheetSelection('down', t);
          if (cut) t.clipboard = null;
        } catch (error) {t.error = error.message;}
      } else if (arrows.includes(key) || pageKeys.includes(key)) moveSheetSelection(key,t);
    } else if (grab) {
      if (enter) insertSheetToken(data.name(grab.row,grab.column));
      if (exit || enter) t.grab = null;
      else moveSheetSelection(key, grab);
    } else if (key === 'catalog') shift ? quickCatalog() : openCatalog();
    else if (key === 'settings') open(settingsRoot(), {wrap:true});
    else if (key === 'tools' && !draft) openSheetTools();
    else if (exit) {
      engine.clear();
      if (key === 'back' && !t.draft) {
        home = true;
        homeIndex = HOME_APPS.findIndex(entry => entry.id === 'spreadsheet');
        sheet = null;
      }
      if (key === 'back') t.draft = false;
    } else if (enter && draft) {
      const {nodes} = engine.getState();
      if (!nodes.length) return;
      try {
        t.error = data.set(row, column, nodes, settings.sheetAutoCalc);
        t.draft = false;
        moveSheetSelection('down', t);
        engine.clear();
      } catch (error) {
        if (!(error instanceof EngineError)) throw error;
        t.error = error.message;
      }
    } else if (draft && arrows.includes(key)) inputAction('moveCursor',key);
    else if (arrows.includes(key) || pageKeys.includes(key)) moveSheetSelection(key, t);
    else if (key === 'delete' && !draft) t.error = data.clear(row, column, settings.sheetAutoCalc);
    else if (key === 'ok') editSheetCell();
    else if (digits.test(key) || primaryActions[key] || (shift && shiftedActions[key])) {
      t.draft = true;
      executeInput(key, shift);
    }
  }

  function pressSheetFill(key, shift) {
    const fill = sheet.fill;
    if (key === 'catalog') {shift ? quickCatalog() : openCatalog(); return;}
    if (key === 'back') {
      if (fill.editing) {
        fill.editing = false;
        engine.clear();
      } else sheet.fill = null;
      engine.setInputLimit(49);
      return;
    }
    if (key === 'ac') {
      if (fill.editing) engine.clear();
      else sheet.fill = null;
      if (!sheet.fill) engine.setInputLimit(49);
      return;
    }
    if (key === 'exe' || key === 'ok') {
      if (fill.editing) {
        if (fill.cursor === 0) fill.nodes = cloneNodes(engine.getState().nodes);
        else {
          fill.range = serializeForDisplay(engine.getState().nodes);
          try {sheetRange880(fill.range);}
          catch (error) {
            sheet.error = error.message;
            engine.editSpreadsheetCell(charNodes(fill.range));
            return;
          }
        }
        engine.setInputLimit(49);
        fill.editing = false;
        engine.clear();
        fill.cursor++;
      } else if (fill.cursor < 2) fill.cursor++;
      else {
        try {
          sheet.error = sheet.data.fill(fill.nodes,fill.range,fill.formula,settings.sheetAutoCalc);
          sheet.fill = null;
          engine.setInputLimit(49);
        } catch (error) {
          sheet.error = error.message;
          if (error.message === 'Memory ERROR') sheet.fill = null;
        }
      }
      return;
    }
    if (fill.editing) {
      if (key === 'left' || key === 'right') inputAction('moveCursor',key);
      else executeInput(key,shift);
    } else if (key === 'up' || key === 'down') {
      fill.cursor = Math.max(0,Math.min(2, fill.cursor + (key === 'up' ? -1 : 1)));
    } else if (fill.cursor < 2) {
      fill.editing = true;
      engine.setInputLimit(fill.formula && fill.cursor === 0 ? 48 : 49);
      engine.editSpreadsheetCell(fill.cursor === 0 ? fill.nodes : charNodes(fill.range));
      if (key !== 'left' && key !== 'right') {
        engine.clear();
        executeInput(key,shift);
      }
    }
  }

  function describeSheet() {
    if (!sheet) return null;
    const {data, draft, error, grab} = sheet;
    if (error) return {mode:'error', message:error, pasting:!!sheet.clipboard, hideStatus:!!sheet.hideErrorStatus};
    if (sheet.showMemory) return {mode:'sheet-memory', available:data.available()};
    if (sheet.fill) {
      const fill = sheet.fill;
      const expression = engine.getState();
      return {mode:'sheet-fill', ...fill, inputRemaining:engine.getInputUsage().remaining, draftNodes:fill.editing ? expression.nodes : null,
        cursorList:expression.cursorList, cursorIndex:expression.cursorIndex};
    }
    const {row, column, scrollColumn:left, scrollRow:top} = grab || sheet;
    const heading = ['', ...SHEET_COLUMNS_880.slice(left,left + 4)];
    const rows = Array.from({length:Math.min(4, SHEET_ROWS_880 - top)}, (_, i) => [
      top + i + 1,
      ...heading.slice(1).map((_, j) => data.get(top + i,left + j) ?? '')
    ]);
    const expression = engine.getState();
    const formula = settings.sheetShowCell === 'formula' ? data.formula(row,column) : null;
    const value = data.get(row,column);
    const cellText = formula ? serializeForDisplay(formula) : typeof value === 'number' ? formatNumber(value, settings.number).replace(/^-0(?=\.0+$|$)/,'0') : value ?? '';
    return {mode:'extras-grid', heading, rows, cursor:row - top, column:column - left + 1,
      cellText, cellNodes:formula, grab:!!grab, pasting:!!sheet.clipboard,
      pasteSource:sheet.clipboard && {row:sheet.clipboard.row - top, column:sheet.clipboard.column - left, cut:sheet.clipboard.cut},
      selectedText:data.name(row,column) + ' = ' + cellText,
      draftNodes:draft && !grab ? expression.nodes : null, inputRemaining:engine.getInputUsage().remaining,
      cursorList:expression.cursorList, cursorIndex:expression.cursorIndex};
  }

  function openProbabilityMenu() {
    open(PROBABILITY_FORMS.map((form,index) => action(label(...form.names), () => startProbability(index))));
  }

  function openExplorerMenu() {
    open([
      item(label('Xác suất','Probability'),openProbabilityMenu),
      action(label('DL ghép nhóm','Grouped Data'),startGrouped),
      item(label('Hình học','Geometry'), () => open(geometryMenu()))
    ], {explorerRoot:true});
  }

  function startProbability(formIndex) {
    const form = PROBABILITY_FORMS[formIndex];
    explorer = {kind:'probability', stage:'form', formIndex, form, cursor:0, draft:false,
      fields:form.fields, values:form.keys.map(key => probabilityMemory[key] || {num:0n,den:1n}),
      title:form.title};
    engine.clear();
  }

  function geometryMenu() {
    return [
      ['triangle','Tam giác','Triangle'], ['heron','Công thức Heron','Heron’s Formula'],
      ['distance','Khoảng cách','Distance'], ['plane','P.trình m.phẳng','Plane Equation'],
      ['equilateral','Tam giác đều','Equi. Triangle'], ['sector','Hình quạt','Sector']
    ].map(([group,vi,en]) => action(label(vi,en), () => openGeometryGroup(group)));
  }

  function openGeometryGroup(group) {
    const forms = Object.entries(GEOMETRY_FORMS_880).filter(([,form]) => form.group === group);
    if (forms.length === 1) startGeometry(forms[0][0]);
    else {
      if (!top()) open(geometryMenu());
      open(forms.map(([id,form]) => action(label(form.vi,form.en), () => startGeometry(id))));
    }
  }

  function startGeometry(id) {
    const form = GEOMETRY_FORMS_880[id];
    explorer = {kind:'geometry', id, form, stage:'form', cursor:0, draft:false,
      values:form.keys?.map(key => geometryMemory.values[key] || {num:1n,den:1n}),
      assigned:form.memories?.map(() => null)};
    engine.clear();
  }

  function chooseGeometryMemory() {
    const x = explorer;
    const slot = x.cursor;
    const kind = x.form.memories[slot];
    const edit = index => {
      const list = kind === 'point' ? geometryMemory.points : geometryMemory.lines;
      list[index] ||= Array.from({length:kind === 'point' ? 3 : 6}, () => ({num:0n,den:1n}));
      x.sub = {kind,index,slot,values:list[index]};
      Object.assign(x,{stage:'coordinates',cursor:0,draft:false});
      engine.clear();
    };
    const define = () => {
      const count = kind === 'point' ? 3 : 2;
      open(Array.from({length:count},(_,index) => action((kind === 'point' ? label('Điểm ','Point ') : label('Đường thẳng ','Line ')) + 'ABC'[index],() => edit(index))));
      top().geometryMemoryMenu = true;
    };
    if (x.assigned[slot] === null) define();
    else {
      open([action(label('Chỉnh sửa','Edit'),() => edit(x.assigned[slot])),
        action(label('Tạo mới Ma trận','Define New'),define)]);
      top().geometryMemoryMenu = true;
    }
  }

  function runGeometry() {
    const x = explorer;
    x.message = null;
    x.decimal = false;
    try {
      let expression;
      if (x.form.memories) {
        if (x.assigned.some(index => index === null)) throw new EngineError('Argument ERROR');
        const points = x.assigned.map((index,slot) => (x.form.memories[slot] === 'point' ? geometryMemory.points : geometryMemory.lines)[index]);
        if (x.id === 'plane') {
          const normal = geometryCross880(geometryVectorDifference880(points[1],points[0]), geometryVectorDifference880(points[2],points[0]));
          if (normal.every(fracIsZero)) {
            x.coefficients = null;
            x.message = 'infinite';
            x.stage = 'result';
            return;
          }
          const constant = fracNeg(normal.reduce((sum,value,index) => fracAdd(sum,fracMul(value,points[0][index])), ZERO_FRACTION));
          let coefficients = [...normal,constant];
          if (coefficients.every(value => value.den === 1n)) {
            const divisor = coefficients.filter(value => value.num !== 0n).reduce((gcd,value) => bigGcd(gcd,value.num), 0n);
            coefficients = coefficients.map(value => fracDiv(value,{num:divisor,den:1n}));
          }
          x.coefficients = coefficients;
          x.resultCursor = 0;
        } else {
          const difference = geometryVectorDifference880(points[0], x.id === 'distance-points' ? points[1] : points[1].filter((_,index) => index % 2 === 0));
          let square = geometrySquaredLength880(difference);
          if (x.id === 'distance-line') {
            const direction = points[1].filter((_,index) => index % 2 === 1);
            const denominator = geometrySquaredLength880(direction);
            if (fracIsZero(denominator)) throw new EngineError('Math ERROR');
            square = fracDiv(geometrySquaredLength880(geometryCross880(difference,direction)), denominator);
          }
          expression = x.id === 'distance-points' && points.flat().some(value => /[√π]/.test(fieldLiteral(value)))
            ? '√(' + points[0].map((value,index) => '((' + fieldLiteral(value) + ')-(' + fieldLiteral(points[1][index]) + '))²').join('+') + ')'
            : '√(' + square.num * square.den + ')÷' + square.den;
        }
      } else {
        for (const [index,key] of x.form.keys.entries()) {
          const limit = key === 'theta' ? 360 : ['angleA','angleB'].includes(key) ? 180 : null;
          if (limit !== null && convertAngleValue(fracToNumber(x.values[index]),settings.angle,'deg') > limit) {
            throw new EngineError('Range ERROR');
          }
        }
        if (x.id === 'triangle-area-asa' &&
            convertAngleValue(fracToNumber(fracAdd(x.values[1],x.values[2])),settings.angle,'deg') > 180) {
          throw new EngineError('Range ERROR');
        }
        expression = geometryExpression880(x.id,x.values,settings,fieldLiteral);
      }
      if (expression) {
        const expressions = x.id === 'triangle-angle-sides'
          ? [x.values, [x.values[0],x.values[2],x.values[1]], [x.values[1],x.values[0],x.values[2]]]
            .map(values => geometryExpression880(x.id,values,settings,fieldLiteral)) : [expression];
        x.results = expressions.map((source,index) => {
          const value = engine.evaluateSpreadsheetCell(charNodes(source));
          engine.clear();
          engine.editSpreadsheetCell(charNodes(source));
          engine.equals();
          let result = engine.getState();
          if (result.mode === 'error') throw new EngineError(result.message);
          if (result.exactSurd && BigInt(result.exactSurd.coeffNum.replaceAll(' ','')) > 99n) {
            engine.toggleExactDecimal(true);
            result = engine.getState();
          }
          const stored = x.id === 'triangle-angle-sides' ? ['angleA','angleB','angleC'][index] : x.form.stores;
          if (stored) geometryMemory.values[stored] = roundedNumberFraction(value);
          return {...result, numericValue:value};
        });
        x.resultIndex = 0;
        x.result = x.results[0];
      }
      x.stage = 'result';
      x.cursor = 0;
    } catch (error) {x.error = error.message;}
  }

  function pressGeometry(key, shift) {
    const x = explorer;
    if (x.error) {
      if (['exe','ok','back','ac'].includes(key)) {
        x.error = null;
        if (x.draft) inputAction('moveCursor','right');
        else { x.cursor = 0; engine.clear(); }
      }
      return;
    }
    if (x.stage === 'result') {
      if (key === 'back' && x.resultIndex > 0) {
        x.result = x.results[--x.resultIndex];
      } else if (['exe','ok'].includes(key) && x.resultIndex + 1 < x.results?.length) {
        x.result = x.results[++x.resultIndex];
      } else if (['back','ac','exe','ok'].includes(key)) {x.stage = 'form'; x.cursor = 0;}
      else if (key === 'format' && (x.result || x.coefficients)) x.decimal = !x.decimal;
      else if (x.coefficients && arrows.includes(key)) {
        const cursor = x.resultCursor || 0;
        if (key === 'up' && cursor === 3) x.resultCursor = 0;
        else if (key === 'down' && cursor === 0) x.resultCursor = 3;
        else if (key === 'left' && cursor > 0 && cursor < 3) x.resultCursor--;
        else if (key === 'right' && cursor < 2) x.resultCursor++;
        if (x.resultCursor !== cursor) x.decimal = false;
      } else if (x.results?.length > 1 && arrows.includes(key)) {
        x.resultIndex = Math.max(0,Math.min(x.results.length - 1,x.resultIndex + (key === 'up' || key === 'left' ? -1 : 1)));
        x.result = x.results[x.resultIndex];
      }
      return;
    }
    if (key === 'catalog') {shift ? quickCatalog() : openCatalog(); return;}
    const coordinates = x.stage === 'coordinates';
    const count = coordinates ? x.sub.values.length : x.form.fields.length;
    const exit = key === 'back' || key === 'ac';
    const enter = key === 'exe' || key === 'ok';
    if (exit) {
      if (x.draft) {engine.clear(); if (key === 'back') x.draft = false;}
      else if (coordinates) Object.assign(x, {stage:'form',cursor:x.sub.slot});
      else {
        explorer = null;
        openExplorerMenu();
        open(geometryMenu());
        if (!['heron','plane'].includes(x.form.group)) openGeometryGroup(x.form.group);
      }
    } else if (enter && x.draft) {
      if (!engine.getState().nodes?.length) return;
      const value = engine.getDraftValue();
      if (!value) {x.error = engine.getState().message || 'Syntax ERROR'; return;}
      const raw = value.exact || roundedNumberFraction(value.value);
      const fraction = !coordinates && raw.num < 0n ? ZERO_FRACTION : raw;
      if (value.displayFraction && fraction.den !== 1n) fieldFractions.add(fraction);
      if (fraction === raw && value.displayData) fieldExactValues.set(fraction,value.displayData);
      if (coordinates) x.sub.values[x.cursor] = fraction;
      else {
        x.values[x.cursor] = fraction;
        geometryMemory.values[x.form.keys[x.cursor]] = fraction;
      }
      x.cursor++;
      x.draft = false;
      engine.clear();
    } else if (enter && x.cursor === count) {
      if (coordinates) {
        x.assigned[x.sub.slot] = x.sub.index;
        Object.assign(x, {stage:'form',cursor:x.sub.slot+1});
      } else runGeometry();
    } else if ((enter || key === 'right') && !coordinates && x.form.memories) chooseGeometryMemory();
    else if (enter) { x.draft = true; engine.clear(); }
    else if (x.draft && arrows.includes(key)) inputAction('moveCursor',key);
    else if (coordinates && x.sub.kind === 'line' && arrows.includes(key)) {
      const distance = {up:-2,down:2,left:-1,right:1}[key];
      const next = x.cursor + distance;
      if (key !== 'up' || next >= 0) x.cursor = next < 0 ? count : next > count ? 0 : next;
    }
    else if (key === 'up' || key === 'down' || pageKeys.includes(key)) {
      const distance = key === 'up' || key === 'page-up' ? -1 : 1;
      x.cursor = (x.cursor + count + 1 + distance) % (count + 1);
    } else if (x.cursor < count && (coordinates || !x.form.memories)) {
      if (digits.test(key) || primaryActions[key] || (shift && shiftedActions[key])) {
        x.draft = true;
        executeInput(key,shift);
      }
    }
  }

  function describeGeometry() {
    const x = explorer;
    if (x.error) return {mode:'error', message:x.error};
    const state = engine.getState();
    const draft = x.draft ? {draftNodes:state.nodes,cursorList:state.cursorList,cursorIndex:state.cursorIndex} : {};
    let result = x.result;
    if (result && typeof result.numericValue === 'number') {
      let text = formatNumber(result.numericValue,settings.number);
      if (settings.decimal === 'comma') text = text.replace('.',',');
      result = {...result,result:text};
      if (settings.io.startsWith('line')) {
        delete result.exactSurd;
        delete result.exactSurdNodes;
        delete result.exactPi;
      }
    }
    return {...draft, mode:'geometry', stage:x.stage, id:x.id, title:x.form.title, cursor:x.cursor,
      fields:x.form.fields, values:x.values?.map(fracToNumber), assigned:x.assigned, offset:x.offset || 0,
      valueExact:x.values?.map(fieldDisplay),
      result, message:x.message, resultLabel:x.id === 'triangle-angle-sides' ? ['Góc A','Góc B','Góc C'][x.resultIndex || 0] : x.form.result || x.form.vi,
      resultCursor:x.resultCursor, decimal:x.decimal, scrollUp:x.stage === 'result' && x.resultIndex > 0,
      scrollDown:x.stage === 'result' && x.results?.length > x.resultIndex + 1,
      coefficients:x.coefficients?.map(value => formatNumber(fracToNumber(value),settings.number)),
      coefficientFractions:!x.decimal ? x.coefficients?.map(value => value.den === 1n ? null
        : {negative:value.num<0n,num:String(bigAbs(value.num)),den:String(value.den)}) : null,
      sub:x.sub && {...x.sub, values:x.sub.values.map(fracToNumber),valueExact:x.sub.values.map(fieldDisplay)}};
  }

  function startGrouped() {
    engine.clear();
    explorer = {kind:'grouped', stage:'form', cursor:0, draft:false,
      title:label('Phạm vi dữ liệu','Data Range'), fields:[label('Bđầu','Start'), label('Kthúc','End'), label('Bước','Step')],
      values:groupedRangeFractions?.slice() || groupedRange.map(roundedNumberFraction)};
  }

  function runExplorer() {
    const x = explorer;
    try {
      if (x.kind === 'probability') {
        probability880(x.formIndex,x.values); // Preserve the zero-denominator guard.
        const [a,b,c] = x.values.map(value => '(' + fieldLiteral(value) + ')');
        const joint = a + '×' + b;
        const total = '(' + joint + '+(1-' + a + ')×' + c + ')';
        const expression = x.formIndex === 0 ? joint : x.formIndex === 1 ? total : '(' + joint + ')÷' + total;
        engine.clear();
        engine.editSpreadsheetCell(charNodes(expression));
        const result = engine.getDraftValue();
        if (!result) throw new EngineError(engine.getState().message || 'Math ERROR');
        x.answer = result.exact || roundedNumberFraction(result.value);
        x.answerValue = result.value;
        x.answerData = result.displayData;
        engine.clear();
        x.stage = 'result';
        x.decimal = settings.io.endsWith('do');
      } else {
        const [start, end, step] = x.values.map(fracToNumber);
        const count = Math.floor((end - start) / step + 1e-12);
        if (!Number.isFinite(count) || count < 1 || (end - start) / step > 30 || end <= start || step <= 0) {
          throw new EngineError('Range ERROR');
        }
        groupedRange = [start, end, step];
        groupedRangeFractions = x.values.slice();
        x.counts = Array(count).fill(0);
        x.countValues = Array.from({length:count},() => ZERO_FRACTION);
        x.cursor = 0;
        x.stage = 'counts';
      }
    } catch (error) {
      x.error = error.message;
    }
  }

  function selectGroupedStat(index) {
    const x = explorer;
    try {
      const value = groupedStats880(groupedRangeFractions?.[0] || groupedRange[0], groupedRangeFractions?.[2] || groupedRange[2], x.countValues || x.counts,true)[index];
      if (Array.isArray(value) && value.some(mode => mode === null)) throw new EngineError('Math ERROR');
      x.title = label(...GROUPED_STATS[index]);
      const values = Array.isArray(value) ? value.slice(0,2) : [value];
      x.results = values.map(fraction => {
        const source = index === 2 ? '√(' + fraction.num * fraction.den + ')÷' + fraction.den : fractionToEvalLiteral(fraction);
        engine.clear();
        engine.editSpreadsheetCell(charNodes(source));
        const result = engine.getDraftValue();
        if (!result) throw new EngineError(engine.getState().message || 'Math ERROR');
        const exactFraction = result.exact && result.exact.den !== 1n && fractionFitsDisplay880(result.exact)
          ? {negative:result.exact.num<0n,num:String(bigAbs(result.exact.num)),den:String(result.exact.den)} : null;
        const data = {result:formatNumber(result.value,settings.number),...result.displayData,exactFraction};
        engine.clear();
        return data;
      });
      x.statIndex = index;
      x.decimal = settings.io.endsWith('do');
      x.valuesOut = values.map(fraction => index === 2 ? Math.sqrt(fracToNumber(fraction)) : fracToNumber(fraction));
      x.resultIndex = 0;
      x.stage = Array.isArray(value) && value.length > 2 ? 'modes-warning' : 'result';
    } catch (error) {
      x.error = error.message;
    }
  }

  function pressExplorer(key, shift) {
    const x = explorer;
    if (x.error) {
      if (['back','ac','ok','exe'].includes(key)) {
        x.error = null;
        if (x.draft) inputAction('moveCursor','right');
        else {
          engine.clear();
          x.cursor = 0;
          if (x.stage === 'stats') x.stage = 'counts';
        }
      }
      return;
    }
    if (x.stage === 'modes-warning') {
      if (['exe','ok','back','ac'].includes(key)) { x.stage = 'result'; x.resultIndex = 0; }
      return;
    }
    if (x.stage === 'result') {
      const multipleModes = x.kind === 'grouped' && x.statIndex === 7 && x.valuesOut?.length > 1;
      const selectResult = index => {
        if (index !== x.resultIndex) { x.resultIndex = index; x.decimal = settings.io.endsWith('do'); }
      };
      if (multipleModes && ['exe','ok'].includes(key) && x.resultIndex + 1 < x.valuesOut.length) selectResult(x.resultIndex + 1);
      else if (multipleModes && key === 'back' && x.resultIndex > 0) selectResult(x.resultIndex - 1);
      else if (key === 'back' || key === 'ac' || key === 'exe' || key === 'ok') {
        x.stage = x.kind === 'probability' ? 'form'
          : ['ac','exe','ok'].includes(key) ? 'counts' : 'stats';
        if (x.kind === 'probability' || x.stage === 'counts') x.cursor = 0;
      }
      else if (key === 'format') x.decimal = !x.decimal;
      else if (x.valuesOut && arrows.includes(key) && (!multipleModes || ['up','down'].includes(key)))
        selectResult(Math.max(0,Math.min(x.valuesOut.length-1,
          x.resultIndex + (key === 'up' || key === 'left' ? -1 : 1))));
      return;
    }
    if (x.stage === 'stats') {
      const index = shortcutIndex(key);
      if (index >= 0 && index < GROUPED_STATS.length) selectGroupedStat(index);
      else if (key === 'back') { x.stage = 'counts'; x.cursor = 0; }
      else if (key === 'ok' || key === 'exe') selectGroupedStat(x.statCursor || 0);
      else if (arrows.includes(key) || pageKeys.includes(key)) {
        const menu = {rows:GROUPED_STATS,columns:1,capacity:4,selected:x.statCursor || 0,offset:x.statOffset || 0};
        moveMenu(key,menu);
        x.statCursor = menu.selected;
        x.statOffset = menu.offset;
      }
      return;
    }

    const count = x.stage === 'counts' ? x.counts.length : x.fields.length;
    const limit = count + Number(x.stage === 'form');
    if (key === 'ac' || key === 'back') {
      if (x.draft) { engine.clear(); if (key === 'back') x.draft = false; }
      else if (x.stage === 'counts') startGrouped();
      else {
        explorer = null;
        openExplorerMenu();
        if (x.kind === 'probability') openProbabilityMenu();
      }
    } else if (key === 'exe' || key === 'ok') {
      if (x.draft) {
        if (!engine.getState().nodes?.length) return;
        const result = engine.getDraftValue();
        if (!result) { x.error = engine.getState().message || 'Syntax ERROR'; return; }
        if (x.stage === 'counts') {
          const exact = result.value < 0 ? ZERO_FRACTION : result.exact || roundedNumberFraction(result.value);
          x.counts[x.cursor] = Math.max(0,result.value);
          x.countValues[x.cursor] = exact;
          if (result.displayFraction && exact.den !== 1n) fieldFractions.add(exact);
        }
        else if (x.kind === 'probability') {
          const exact = result.value < 0 ? {num:0n,den:1n} : result.value > 1 ? {num:1n,den:1n}
            : result.exact || roundedNumberFraction(result.value);
          if (result.displayFraction && exact.den !== 1n) fieldFractions.add(exact);
          if (result.value >= 0 && result.value <= 1 && result.displayData) fieldExactValues.set(exact,result.displayData);
          x.values[x.cursor] = exact;
          probabilityMemory[x.form.keys[x.cursor]] = exact;
        } else x.values[x.cursor] = result.exact || roundedNumberFraction(result.value);
        x.cursor = Math.min(x.cursor + 1, limit - 1);
        engine.clear();
        x.draft = false;
      } else if (x.stage === 'counts') {
        x.stage = 'stats';
        x.statCursor = 0;
        x.statOffset = 0;
      } else if (x.cursor === count) runExplorer();
      else { engine.clear(); x.draft = true; }
    } else if (x.draft && arrows.includes(key)) inputAction('moveCursor',key);
    else if (key === 'up' || key === 'down' || pageKeys.includes(key)) {
      x.cursor = ['up','down'].includes(key)
        ? (x.cursor + limit + (key === 'up' ? -1 : 1)) % limit
        : navigation(key, x.cursor, limit, 1, 3);
    } else if (x.cursor < count && (digits.test(key) || primaryActions[key] || (shift && shiftedActions[key]))) {
      x.draft = true;
      executeInput(key, shift);
      if (engine.getState().mode === 'input' && !engine.getState().nodes.length) x.draft = false;
    }
  }

  function describeExplorer() {
    if (explorer === null) return null;
    const x = explorer;
    if (x.kind === 'geometry') return describeGeometry();
    const number = value => formatNumber(value, settings.number);
    if (x.error) return {mode:'error', message:x.error};
    if (x.stage === 'modes-warning') return {mode:'formula-warning',message:label('Có nhiều hơn hai mốt tồn tại.','More than two modes exist.')};
    if (x.stage === 'result') {
      if (x.kind === 'grouped') return {mode:'formula-result', label:label(...GROUPED_STATS[x.statIndex]), result:number(x.valuesOut[x.resultIndex]),
        resultData:x.results[x.resultIndex], resultLabel:x.statIndex === 7 && x.results.length === 1 ? 'grouped-7-single' : 'grouped-' + x.statIndex + '-' + x.resultIndex,
        decimal:x.decimal, scrollUp:x.resultIndex > 0, scrollDown:x.resultIndex < x.results.length - 1};
      const {num,den} = x.answer;
      const exactFraction = !x.decimal && den !== 1n && fractionFitsDisplay880(x.answer)
        ? {num:String(num),den:String(den)} : null;
      const result = number(x.answerValue ?? fracToNumber(x.answer));
      return {mode:'formula-result',label:x.title,resultLabel:x.title,result,exactFraction,decimal:x.decimal,
        resultData:{result,...(!x.decimal ? x.answerData : {}),exactFraction}};
    }
    if (x.stage === 'stats') return {mode:'formula-menu', rows:GROUPED_STATS.map(names => ({name:label(...names)})),
      cursor:x.statCursor || 0, offset:x.statOffset || 0};
    const state = engine.getState();
    const draft = x.draft ? {draftNodes:state.nodes, cursorList:state.cursorList, cursorIndex:state.cursorIndex} : {};
    if (x.stage === 'counts') {
      const [start, , step] = groupedRange;
      const gridNumber = value => formatNumber(value,{kind:'norm',digits:1});
      return {...draft, mode:'formula-counts', cursor:x.cursor, counts:x.counts,
        selectedFraction:x.countValues ? fieldDisplay(x.countValues[x.cursor]).exactFraction : null,
        ranges:x.counts.map((_, index) => gridNumber(start + step * index) + '–' + gridNumber(start + step * (index + 1))),
        rangeValues:x.counts.map((_,index) => [start+step*index,start+step*(index+1)])};
    }
    return {...draft, mode:'formula-form', title:x.kind === 'probability' ? x.form.title : label('Phạm vi dữ liệu','Data Range'),
      fields:x.fields, values:x.values.map(fracToNumber), inputNumber:x.kind === 'grouped' ? {kind:'norm',digits:1} : null,
      valueExact:x.values.map(fieldDisplay),
      cursor:x.cursor, rows:x.fields.map((field, index) => field + ': ' + number(fracToNumber(x.values[index])))
        .concat(label('Vận hành','Execute'))};
  }

  function navigation(key, row, count, columns, capacity) {
    const next = {
      left: row - 1, right: row + 1, up: row - columns, down: row + columns,
      'page-up': row - capacity, 'page-down': row + capacity
    }[key];
    return next === undefined ? row : Math.max(0, Math.min(count - 1, next));
  }

  function moveMenu(key, menu) {
    const max = menu.quick ? Math.floor((menu.rows.length - 1) / menu.capacity) * menu.capacity
      : Math.max(0, Math.ceil(menu.rows.length / menu.columns) * menu.columns - menu.capacity);
    if (key === 'page-up' || key === 'page-down') {
      const forward = key === 'page-down';
      const offset = Math.max(0, Math.min(max, menu.offset + (forward ? 1 : -1) * menu.capacity));
      menu.selected = forward && offset === menu.offset ? menu.rows.length - 1 : offset;
      menu.offset = offset;
      return;
    }
    if (menu.quick) return;
    const index = menu.wrap && ['up','down'].includes(key)
      ? (menu.selected + (key==='up' ? -1 : 1) + menu.rows.length) % menu.rows.length
      : navigation(key, menu.selected, menu.rows.length, menu.columns, menu.capacity);
    const rowTop = index - index % menu.columns;
    if (index < menu.offset) menu.offset = rowTop;
    if (index >= menu.offset + menu.capacity) menu.offset = Math.min(max, rowTop - menu.capacity + menu.columns);
    menu.selected = index;
  }

  const digits = /^\d$/;
  const arrows = ['up','down','left','right'];
  const pageKeys = ['page-up','page-down'];
  const variableKeys = {'4':'A','5':'B','6':'C','1':'D','2':'E','3':'F','0':'x',dot:'y','times-ten':'z'};
  const primaryActions = {
    dot: call('inputDot'), add: call('inputOperator', '+'), subtract: call('inputOperator', '-'),
    multiply: call('inputOperator', '×'), divide: call('inputOperator', '÷'),
    delete: call('deleteLast'), x: call('inputXVariable'), fraction: call('inputFraction'),
    sqrt: call('inputSqrt'), power: call('inputPower'), square: call('inputOperator', '²'),
    logn: call('inputLogN'), ans: call('inputAns'), open: call('inputOpenParen'), close: call('inputCloseParen'),
    sin: call('inputFunction', 'sin('), cos: call('inputFunction', 'cos('), tan: call('inputFunction', 'tan('),
    'times-ten': () => inputAction('inputTimesTenPower', settings.power === 'scientific')
  };
  const shiftedActions = {
    x: () => unavailable('QR Code'), fraction: call('inputMixedNumber'), sqrt: call('inputNthRoot'),
    power: call('inputOperator', '⁻¹'), square: call('inputFunction', 'log('), logn: call('inputFunction', 'ln('),
    ans: call('inputPreAns'), sin: call('inputFunction', 'sin⁻¹('), cos: call('inputFunction', 'cos⁻¹('),
    tan: call('inputFunction', 'tan⁻¹('), open: call('inputRelational', '='), close: call('inputComma'),
    '7': call('inputPi'), '8': () => engine.inputEuler(), '9': call('inputImaginary'),
    delete: call('toggleInsertion'), divide: call('inputPercent'), add: call('inputDms'),
    multiply: () => { if (app !== 'base-n') engine.inputFunction('Abs('); },
    subtract: call('inputNegative'), exe: call('approxEquals')
  };

  function insertVariable(name) {
    engine.inputAlpha();
    engine.inputVariable(name);
  }

  function executeInput(key, shift) {
    if (app === 'base-n' && shift && /^[A-F]$/.test(variableKeys[key] || '')) {
      engine.inputBaseNLetter(variableKeys[key]);
      return;
    }
    if (shift && shiftedActions[key]) shiftedActions[key]();
    else if (shift && variableKeys[key]) insertVariable(variableKeys[key]);
    else if (digits.test(key)) engine.inputDigit(key);
    else primaryActions[key]?.();
  }

  function press(key) {
    const previousInsertionArrow = insertionArrow;
    applyingInsertionArrow = previousInsertionArrow;
    if (key !== 'shift') insertionArrow = false;
    if (!power && key !== 'on') return;
    history.push({key, shift: shifted, app: home ? 'home' : app});
    if (history.length > 500) history.shift();
    const pressState = engine.getState();
    if (!home && explorer?.error && !top() && !['on','home','shift'].includes(key)) {
      if (shifted && key === 'ac') { shifted = false; return; }
      if (!['back','ac','exe','ok'].includes(key)) { shifted = false; return; }
    }
    if (!home && (['calculate','complex','equation','matrix','vector','statistics','distribution','base-n'].includes(app) || (app === 'table' && engine.isVerifyActive())) && !top() && !notice && variableEditing === null &&
        pressState.mode === 'error' && pressState.message !== 'No Operator' && !['on','home','shift'].includes(key)) {
      if (shifted && key === 'ac') { shifted = false; return; }
      shifted = false;
      if (!['back','ac','exe','ok'].includes(key)) return;
      // PLUS dismisses an error into the existing editor. A second AC clears it.
      key = 'back';
    }
    if (key === 'on') {
      // PLUS restarts the current application, including its type menu. Named
      // memories survive; an unfinished editor and Verify do not. OFF/ON uses
      // the same restart, and Base-N keeps its selected radix.
      const base = engine.getBaseNBase();
      sheetData.reset();
      power = true;
      menus = [];
      notice = null;
      settingsResult = null;
      variableEditing = null;
      verifyErrorBack = false;
      if (app === 'complex' && engine.isVerifyActive()) engine.toggleComplexVerify();
      explorer = null;
      mathBox = null;
      lineBox = null;
      circleBox = null;
      sheet = null;
      engine.setInputLimit(app === 'spreadsheet' ? 49 : 199);
      engine.setInputOutput(app === 'spreadsheet' ? 'lineio' : settings.io);
      engine.setCalcMode(['spreadsheet','math-box','math-explorer'].includes(app) ? 'calculate' : app);
      if (base) engine.baseNConvert(base.id);
      engine.powerOn();
      if (!home) {
        modeMenu(app);
        if (app === 'spreadsheet') homeOffset = 3;
      }
      shifted = false;
      return;
    }
    if (key === 'shift') { shifted = !shifted; return; }
    const shift = shifted;
    shifted = false;
    const naturalEditor=['input','variable-edit','function-edit'].includes(pressState.mode) ||
      app==='table' && pressState.screen==='func';
    if (shift && key==='delete' && !home && !top() &&
        (['calculate','complex'].includes(app) || pressState.mode!=='input') &&
        !settings.io.startsWith('line') && naturalEditor &&
        pressState.cursorIndex < pressState.cursorList?.length)
      insertionArrow = !previousInsertionArrow;
    const frozenComplexScroll = !top() && app === 'complex' && ['left','right'].includes(key) &&
      settingsResult && lcdComplexScrollLimit880(settingsResult,settings) > 0;
    if (!top() && key !== 'settings' && !frozenComplexScroll) settingsResult = null;
    if (!home && !top() && app === 'calculate' && engine.getState().engineering) {
      if (['left','right','up','down'].includes(key)) { engine.moveEngineering(key); return; }
      if (key === 'exe' || key === 'ok' || key === 'back') { engine.finishEngineering(); return; }
    }
    if (key === 'home') {
      engine.finishVariableEdit(false);
      variableEditing = null;
      home = true;
      explorer = null;
      mathBox = null;
      lineBox = null;
      circleBox = null;
      sheet = null;
      notice = null;
      menus = [];
      homeIndex = Math.max(0, HOME_APPS.findIndex(entry => entry.id === app));
      homeOffset = Math.min(9, Math.floor(homeIndex / 6) * 6);
      return;
    }
    if (shift && key === 'ac') { power = false; sheetData.reset(); menus = []; notice = null; return; }
    if (explorer && explorer.kind !== 'geometry' && explorer.stage === 'form' && !explorer.draft &&
        explorer.cursor === explorer.fields.length && !top() && key === 'settings') return;
    if (explorer?.kind === 'geometry' && !top() && key === 'settings' && !explorer.draft &&
        (explorer.stage === 'form' && explorer.cursor === explorer.form.fields.length ||
         explorer.stage === 'coordinates' && explorer.cursor === explorer.sub.values.length)) return;
    if (lineBox && key === 'settings' && (top() || lineBox.stage !== 'list' || lineBox.cursor === lineBox.entries.length)) return;
    if (circleBox && key === 'settings' && (top()?.circleTypes || !top() && (circleBox.stage !== 'form' || circleBox.draft ||
        circleBox.cursor === (circleBox.type === 'clock' ? 1 : 3)))) return;
    if (!home && app === 'distribution' && !top() && (key === 'settings' || digits.test(key) || primaryActions[key])) {
      const data = engine.getState();
      if (data.mode === 'distribution' && data.result === null && data.cells?.at(-1).selected) return;
    }
    if (notice) {
      if (notice.kind === 'contrast' && ['left','right'].includes(key)) {
        settings.contrast = Math.max(-3, Math.min(3, settings.contrast + (key === 'right' ? 1 : -1)));
      }
      if (['back','ac','ok','exe'].includes(key)) {
        const fromContrast = notice.kind === 'contrast';
        notice = null;
        if (fromContrast && key === 'back') {
          open(settingsRoot(), {wrap:true});
          open(systemSettings());
        } else if (['math-box','math-explorer'].includes(app) && !mathBox && !explorer) home = true;
      }
      return;
    }

    if (!home && !top() && engine.isVerifyActive() && engine.getState().message === 'No Operator') {
      if (key === 'up' || key === 'down') verifyErrorBack = key === 'down';
      else if (['exe','ok','back','ac'].includes(key)) {
        const choose = (key === 'exe' || key === 'ok') && !verifyErrorBack;
        verifyErrorBack = false;
        inputAction('moveCursor','right');
        if (choose) openVerifyRelations();
      }
      return;
    }

    if (variableEditing !== null && !top()) {
      if (engine.getState().mode === 'error') {
        if (['back','ac','exe','ok','left','right'].includes(key)) inputAction('moveCursor','right');
      } else if (['back','ac'].includes(key) || ['exe','ok'].includes(key)) {
        if (engine.finishVariableEdit(['exe','ok'].includes(key))) {
          const index = variableEditing;
          variableEditing = null;
          variableMenu(false,index);
        }
      } else if (key === 'catalog') shift ? quickCatalog() : openCatalog();
      else if (arrows.includes(key)) inputAction('moveCursor',key);
      else executeInput(key,shift);
      return;
    }

    if (!home && app === 'table' && engine.getState().tableFeedback !== undefined) {
      if (['exe','ok','back','ac'].includes(key)) engine.finishTableVerify();
      return;
    }

    if (mathBox && (mathBox.editor || ['list','frequency'].includes(mathBox.stage))) {
      pressTrials(key, shift);
      return;
    }
    if (lineBox && !top() && key !== 'settings') {
      pressNumberLine(key, shift);
      return;
    }
    if (circleBox && !top() && key !== 'settings') {
      pressCircle(key, shift);
      return;
    }
    if (sheet && !top()) {
      pressSheet(key, shift);
      return;
    }
    if (explorer && !top() && key !== 'settings') {
      if (explorer.kind === 'geometry') {
        const previousStage = explorer.stage;
        const previousCursor = explorer.cursor;
        pressGeometry(key,shift);
        if (explorer?.stage === 'coordinates' && explorer.sub.kind === 'line' &&
            explorer.cursor === 6 && previousCursor < 6) explorer.sub.confirmCursor = previousCursor;
        if (explorer) {
          const offset = previousStage === explorer.stage ? explorer.offset || 0 : 0;
          explorer.offset = Math.max(0,Math.min(offset,explorer.cursor));
          if (explorer.cursor >= explorer.offset+3) explorer.offset = explorer.cursor-2;
        }
      } else pressExplorer(key, shift);
      return;
    }

    const activeMenu = top();
    if (activeMenu) {
      if (activeMenu.trialViews || activeMenu.trialForm) {
        if (key === 'ac') return;
        if (key === 'back') {
          menus = [];
          if (activeMenu.trialViews) openTrialForm();
          else {mathBox = null; modeMenu('math-box');}
          return;
        }
        if (activeMenu.trialForm && ['up','down'].includes(key)) {
          activeMenu.selected = (activeMenu.selected + activeMenu.rows.length + (key === 'up' ? -1 : 1)) % activeMenu.rows.length;
          return;
        }
      }
      if (activeMenu.variables && (digits.test(key) || primaryActions[key] || (shift && shiftedActions[key]))) {
        beginVariableEditor(activeMenu.selected);
        if (variableEditing !== null) executeInput(key,shift);
        return;
      }

      if (key === 'right' && activeMenu.geometryMemoryMenu) return;
      if (key === 'left' && activeMenu.geometryMemoryMenu) { menus = []; return; }
      if (key === 'settings' && activeMenu.mathBoxRoot) { open(settingsRoot(), {wrap:true}); return; }
      if (key === 'settings' && activeMenu.sheetPreference) return;
      if (key === 'ac' || key === 'settings') {
        const restoreMathBox = menus.some(menu => menu.mathBoxRoot);
        menus = [];
        if (restoreMathBox) modeMenu('math-box');
        return;
      }
      if (key === 'back' || (key === 'left' && activeMenu.columns === 1 && menus.length > 1)) {
        menus.pop();
        if (activeMenu.explorerRoot) { home = true; homeIndex = 13; homeOffset = 9; }
        if (activeMenu.statisticsTypeMenu) { home = true; homeIndex = 1; homeOffset = 0; }
        if (activeMenu.statisticsRunMenu) engine.statisticsCommand('data');
        return;
      }
      const localShortcut = activeMenu.direct && settings.hints ? shortcutIndex(key,activeMenu.constants) : -1;
      const shortcut = localShortcut >= 0 && activeMenu.quick ? activeMenu.offset + localShortcut : localShortcut;
      if (['ok','exe'].includes(key) || (key === 'right' && activeMenu.columns === 1 && activeMenu.rows[activeMenu.selected].arrow) || (shortcut >= 0 && shortcut < activeMenu.rows.length)) {
        const choice = activeMenu.rows[shortcut >= 0 ? shortcut : activeMenu.selected];
        if (choice) {
          if ((choice.radio || activeMenu.sheetTools) && shortcut >= 0) {
            activeMenu.selected = shortcut;
            if (activeMenu.sheetTools) activeMenu.offset = Math.max(0,shortcut-activeMenu.capacity+1);
          }
          choice.choose();
          if (sheet && !sheet.fill && engine.getState().nodes?.length) sheet.draft = true;
        }
      } else moveMenu(key, activeMenu);
      return;
    }
    if (home) {
      if (key === 'settings') { showNotice('Get Started', label('Hướng dẫn qua mã QR', 'QR code guide')); return; }
      const index = settings.hints ? HOME_APPS.findIndex(entry => entry.key === key) : -1;
      if (index >= 0 || key === 'ok' || key === 'exe') launch(index >= 0 ? index : homeIndex);
      else if (pageKeys.includes(key)) {
        homeOffset = Math.max(0, Math.min(9, homeOffset + (key === 'page-up' ? -6 : 6)));
        homeIndex = homeOffset;
      } else if (arrows.includes(key)) {
        homeIndex = navigation(key, homeIndex, HOME_APPS.length, 3, 6);
        if (homeIndex < homeOffset) homeOffset = Math.floor(homeIndex / 3) * 3;
        if (homeIndex >= homeOffset + 6) homeOffset = Math.min(9, Math.floor(homeIndex / 3) * 3 - 3);
      }
      return;
    }

    if (key === 'settings') {
      if (['equation','matrix','vector','statistics','distribution','ratio'].includes(app) &&
          pressState.mode === app && Array.isArray(pressState.draftNodes)) return;
      if (engine.getState().mode === 'calc' && engine.getState().operation === 'calc') return;
      if (app === 'statistics' && ['stats','regression'].includes(engine.getState().screen)) return;
      if (['calculate','complex'].includes(app) && engine.getState().mode === 'result') settingsResult ||= engine.getState();
      open(settingsRoot(), {wrap:true});
    }
    else if (key === 'catalog') shift ? quickCatalog() : openCatalog();
    else if (key === 'tools') {
      if (app === 'table' && (engine.getState().screen === 'range' || engine.getState().draftNodes?.length)) return;
      openTools();
    }
    else if (key === 'format') {
      if (app === 'base-n') {
        const bases = Object.keys(BASE_N_BASES);
        if (!shift) engine.baseNConvert(bases[(bases.indexOf(engine.getBaseNBase().id) + 1) % bases.length]);
      } else if (shift === (settings.format === 'toggle')) formatMenu();
      else engine.toggleExactDecimal(true);
    } else if (key === 'variable') variableMenu();
    else if (key === 'function') openRegisteredFunctions();
    else if (key === 'ac') engine.clear();
    else if (key === 'back') {
      if (engine.finishRegisteredFunction(false)) return;
      if (engine.backFromCalc()) return;
      if (app === 'equation' && engine.backFromSolve()) return;
      if (app === 'distribution' && engine.cancelDistributionDraft()) return;
      if (engine.getState().mode === 'error') {
        if (['distribution','ratio','statistics','equation'].includes(app)) engine.clear();
        else inputAction('moveCursor','right');
      }
      else if (app === 'calculate' && engine.getState().mode === 'result') inputAction('moveCursor','left');
      else if (app === 'calculate' && engine.getState().mode === 'input') {
        home = true;
        homeIndex = homeOffset = 0;
      }
      else if (app === 'statistics' && ['stats','regression'].includes(engine.getState().screen)) engine.clear();
      else if (['statistics','distribution'].includes(app) && engine.getState().draftNodes) engine.clear();
      else if (app === 'ratio' && engine.getState().result != null) engine.equals();
      else if (app === 'equation' && engine.getState().result?.kind === 'root' && engine.getState().result.index > 0)
        inputAction('moveCursor','up');
      else if (app === 'equation' && engine.getState().result != null) engine.clear();
      else if (app === 'table') engine.tableCommand('cancel-draft');
      else if (app === 'distribution' && (engine.getState().screen === 'params' || engine.getState().result != null)) {
        engine.clear();
      }
      else if (app === 'inequality' && engine.getState().screen === 'result') engine.clear();
      else if (app === 'matrix' || app === 'vector') {
        if (engine.getState().screen === 'result') engine.equals();
        else engine.clear();
      }
      else if (app === 'statistics' && engine.getState().mode !== 'statistics') engine.statisticsCommand('data');
      else if (engine.getState().mode === 'solve' || engine.getState().mode === 'calc') engine.clear();
      else if (['statistics','distribution','equation','inequality','ratio'].includes(app)) modeMenu(app);
    } else if (arrows.includes(key)) {
      const data = frozenComplexScroll ? settingsResult : engine.getState();
      const result = app === 'inequality' && (key === 'left' || key === 'right') ? data.result : null;
      const limit = result?.kind === 'set' ? lcdInequalityScrollLimit880(result, settings)
        : data.coordinateResult ? lcdCoordinateScrollLimit880(data)
          : app === 'complex' ? lcdComplexScrollLimit880(data,settings) : 0;
      inputAction('moveCursor',key, limit);
      if (frozenComplexScroll) settingsResult = {...settingsResult,complexDisplay:{...settingsResult.complexDisplay,
        horizontalOffset:engine.getState().complexDisplay?.horizontalOffset || 0}};
    }
    else if (pageKeys.includes(key)) {
      const data = engine.getState();
      const grid = (app === 'statistics' && data.screen === 'editor' || app === 'table' && data.screen === 'range') && !data.draftNodes;
      inputAction('moveCursor',grid ? key : key === 'page-up' ? 'up' : 'down');
    }
    else if (key === 'exe' && shift) {
      if (!engine.finishRegisteredFunction(true)) shiftedActions.exe();
    }
    else if (key === 'ok' || key === 'exe') {
      if (engine.finishRegisteredFunction(true)) return;
      const data = engine.getState();
      if (['distribution','ratio','statistics'].includes(app) && data.mode === 'error') engine.clear();
      else if (data.mode === 'error' && (app === 'complex' || engine.isVerifyActive() ||
        ['Not Defined','Circular ERROR'].includes(data.message))) inputAction('moveCursor','right');
      else if (app === 'statistics' && data.screen === 'editor' && !data.draftNodes) {
        const two = data.columns.some(column => column.key === 'y');
        open([
          action(two ? label('Kết quả 2-biến','2-Var Results') : label('Kết quả 1-biến','1-Var Results'),
            call('statisticsCommand','stats')),
          ...(two ? [branch(label('Kết quả Hồi quy','Reg Results'), () => statisticsModels('regression')),
            branch(label('Tính toán tkê','Statistics Calc'), () => statisticsModels('calc'))]
            : [action(label('Tính toán tkê','Statistics Calc'), call('statisticsCommand','calc'))])
        ]);
        top().statisticsRunMenu = true;
      } else if (app === 'equation' && engine.getCalcMode() === 'calculate' && data.mode === 'input') engine.solve();
      else engine.equals();
    } else {
      const data = engine.getState();
      const choosing = data.mode === 'calc' && (data.runSelected || data.operation === 'solve' && data.phase === 'choose');
      if (!choosing && !(data.mode === 'solve' && data.continue)) {
        executeInput(key, shift);
      }
    }
  }

  function getState() {
    const special = !home && variableEditing === null && ((top() ? null : describeExplorer()) || describeTrials() ||
      (top() ? null : describeNumberLine() || describeCircle() || describeSheet()));
    const engineData = engine.getState();
    let data = special || (!top() && engineData.mode === 'result' && settingsResult) || engineData;
    if (!home && ['calculate','statistics'].includes(app) && (app === 'statistics' || settings.io.startsWith('line')) &&
        ['input','result'].includes(data.mode) && linearDisplayHistory.length) {
      data = {...data, lineHistory:linearDisplayHistory};
    }
    if (!home && ['calculate','statistics'].includes(app) && (app === 'statistics' || settings.io.startsWith('line')) && data.mode === 'result' && linearReplayOnly)
      data = {...data,lineReplayOnly:true};
    if ((['input','variable-edit','function-edit'].includes(data.mode) || app==='table' && data.screen==='func') &&
        engine.getOverwriteMode()) data = {...data, overwrite:true};
    if (insertionArrow) data = {...data, insertionArrow:true};
    if (app === 'statistics' && ['input','result'].includes(data.mode)) data.statisticsType = engine.getStatisticsType().id;
    if (data.message === 'No Operator') data.verifyErrorBack = verifyErrorBack;
    return {power, home, homeIndex, homeOffset, shifted, notice, menu: special ? null : top(),
      settings, app, appName: appName(), base:engine.getBaseNBase(), verify:engine.isVerifyActive(), data};
  }

  function pressWithLinearHistory(key) {
    if (home || !power || !['calculate','statistics'].includes(app) || app !== 'statistics' && !settings.io.startsWith('line')) {
      linearDisplayHistory = [];
      linearReplayOnly = false;
      press(key);
      return;
    }
    const before = getState();
    const beforeIO = before.settings.io;
    press(key);
    const after = getState();
    const scalarLine = state => !state.home && ['calculate','statistics'].includes(state.app) &&
      ['input','result'].includes(state.data.mode) && (state.app === 'statistics' || state.settings.io.startsWith('line')) &&
      !state.verify && !state.data.coordinateResult && !state.data.remainderResult;
    if (!scalarLine(after) || beforeIO !== after.settings.io ||
        key === 'home' || key === 'on' || key === 'ac' && !before.menu ||
        key === 'back' && !before.menu && before.data.mode === 'result' && after.data.mode === 'input' ||
        before.data.mode === 'error' && after.data.mode === 'input') {
      linearDisplayHistory = [];
      linearReplayOnly = false;
      return;
    }
    if (['left','right','up','down','page-up','page-down'].includes(key) && !before.menu &&
        (before.data.mode === 'result' || after.data.mode === 'result')) {
      if (!before.data.engineering) { linearDisplayHistory = []; linearReplayOnly = false; }
      return;
    }
    const replayed = ['exe','ok'].includes(key) && !before.menu && before.data.mode === 'result' &&
      after.data.mode === 'result' && before.data.expressionNodes !== after.data.expressionNodes;
    if (scalarLine(before) && before.data.mode === 'result' && (after.data.mode === 'input' || replayed)) {
      const {lineHistory, ...presentation} = before.data;
      linearDisplayHistory = [...linearDisplayHistory, {...presentation,
        engineering:false,lineSettings:{engineer:before.settings.engineer}}].slice(-3);
      linearReplayOnly = replayed;
    }
  }

  return {press:pressWithLinearHistory, getState, history, powerOff() {power = false; shifted = false; sheetData.reset();}};
}

function shortcutIndex(key, constants = false) {
  return ['1','2','3','4','5','6','7','8','9','0','add','subtract','multiply','divide','dot',
    ...(constants ? ['open','close'] : [])].indexOf(key);
}
