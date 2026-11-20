'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const {runInNewContext} = require('node:vm');
const references = require('./fixtures/classpad-880-lcd.json');
const homeOptionLCD = require('./fixtures/classpad-880-home-option-numbers-lcd.json');
const special = require('./fixtures/classpad-880-special-lcd.json');
const arrays = require('./fixtures/classpad-880-matrix-vector-lcd.json');
const baseDistribution = require('./fixtures/classpad-880-base-distribution-lcd.json');
const equations = require('./fixtures/classpad-880-equations-lcd.json');
const equationFollowup = require('./fixtures/classpad-880-equations-followup-lcd.json');
const solveCubicLCD = require('./fixtures/classpad-880-solve-cubic-lcd.json');
const solveCubicMemoryLCD = require('./fixtures/classpad-880-solve-cubic-memory-lcd.json');
const solveCubicNewtonLCD = require('./fixtures/classpad-880-solve-cubic-newton-lcd.json');
const solveCubicStencilLCD = require('./fixtures/classpad-880-solve-cubic-stencil-lcd.json');
const sheetLCD = require('./fixtures/classpad-880-spreadsheet-lcd.json');
const ratioLCD = require('./fixtures/classpad-880-ratio-night-lcd.json');
const complexLCD = require('./fixtures/classpad-880-complex-night-lcd.json');
const verifyLCD = require('./fixtures/classpad-880-verify-night-lcd.json');
const calculateLCD = require('./fixtures/classpad-880-calculate-night-lcd.json');
const statisticsLCD = require('./fixtures/classpad-880-statistics-night-lcd.json');
const tableLCD = require('./fixtures/classpad-880-table-night-lcd.json');
const mathBoxLCD = require('./fixtures/classpad-880-math-box-night-lcd.json');
const sheetNightLCD = require('./fixtures/classpad-880-spreadsheet-night-lcd.json');
const explorerLCD = require('./fixtures/classpad-880-math-explorer-night-lcd.json');
const memoryLCD = require('./fixtures/classpad-880-memory-night-lcd.json');
const englishLCD = require('./fixtures/classpad-880-english-night-lcd.json');
const constantsLCD = require('./fixtures/classpad-880-constants-night-lcd.json');
const conversionsLCD = require('./fixtures/classpad-880-conversions-night-lcd.json');
const englishSpecialLCD = require('./fixtures/classpad-880-english-special-night-lcd.json');
const surdBoundsLCD = require('./fixtures/classpad-880-surd-bounds-night-lcd.json');
const sheetBoundsLCD = require('./fixtures/classpad-880-sheet-bounds-night-lcd.json');
const sheetEdgesLCD = require('./fixtures/classpad-880-sheet-edges-lcd.json');
const lineEdgesLCD = require('./fixtures/classpad-880-line-edges-lcd.json');
const lineSettingsLCD = require('./fixtures/classpad-880-line-settings-lcd.json');
const resetMemoryLCD = require('./fixtures/classpad-880-reset-memory-lcd.json');
const circleGraphicsLCD = require('./fixtures/classpad-880-circle-graphics-lcd.json');
const randomRepeatLCD = require('./fixtures/classpad-880-random-repeat-lcd.json');
const calculusLCD = require('./fixtures/classpad-880-calculus-lcd.json');
const flowHistoryLCD = require('./fixtures/classpad-880-flow-history-lcd.json');
const flowSettingsLCD = require('./fixtures/classpad-880-flow-settings-lcd.json');
const flowErrorsLCD = require('./fixtures/classpad-880-flow-errors-lcd.json');
const flowAppsLCD = require('./fixtures/classpad-880-flow-apps-lcd.json');
const specialSettingsLCD = require('./fixtures/classpad-880-special-settings-lcd.json');
const calcErrorsLCD = require('./fixtures/classpad-880-calc-errors-lcd.json');
const verifyErrorsLCD = require('./fixtures/classpad-880-verify-errors-lcd.json');
const specialSettingsExtraLCD = require('./fixtures/classpad-880-special-settings-extra-lcd.json');
const baseAnsEdgesLCD = require('./fixtures/classpad-880-base-ans-edges-lcd.json');
const bitexSolveLCD = require('./fixtures/classpad-880-bitex-solve-lcd.json');
const bitexCalculusLCD = require('./fixtures/classpad-880-bitex-calculus-lcd.json');
const bitexCalcMemoryLCD = require('./fixtures/classpad-880-bitex-calc-memory-lcd.json');
const equationEdgeAcceptanceLCD = require('./fixtures/classpad-880-equation-edge-acceptance-lcd.json');
const arrayOperationEdgesLCD = require('./fixtures/classpad-880-array-operation-edges-lcd.json');
const functionCalculusLCD = require('./fixtures/classpad-880-function-calculus-lcd.json');
const functionCalculusHoldoutsLCD = require('./fixtures/classpad-880-function-calculus-holdouts-lcd.json');
const functionRegistrationErrorsLCD = require('./fixtures/classpad-880-function-registration-errors-lcd.json');
const statisticsBoundariesLCD = require('./fixtures/classpad-880-statistics-boundaries-lcd.json');
const distributionBoundariesLCD = require('./fixtures/classpad-880-distribution-boundaries-lcd.json');
const sheetTransferErrorsLCD = require('./fixtures/classpad-880-sheet-transfer-errors-lcd.json');
const geometryBoundariesLCD = require('./fixtures/classpad-880-geometry-boundaries-lcd.json');
const probabilityBoundariesLCD = require('./fixtures/classpad-880-probability-boundaries-lcd.json');
const geometryEditBoundariesLCD = require('./fixtures/classpad-880-geometry-edit-boundaries-lcd.json');
const groupedBoundariesLCD = require('./fixtures/classpad-880-grouped-boundaries-lcd.json');
const arrayNumericBoundariesLCD = require('./fixtures/classpad-880-array-numeric-boundaries-lcd.json');
const arrayRangeBoundariesLCD = require('./fixtures/classpad-880-array-range-boundaries-lcd.json');
const complexNumericBoundariesLCD = require('./fixtures/classpad-880-complex-numeric-boundaries-lcd.json');
const circleFlowBoundariesLCD = require('./fixtures/classpad-880-circle-flow-boundaries-lcd.json');
const complexLimitHoldoutsLCD = require('./fixtures/classpad-880-complex-limit-holdouts-lcd.json');
const expressionLimitsLCD = require('./fixtures/classpad-880-expression-limits-lcd.json');
const calculusToleranceLCD = require('./fixtures/classpad-880-calculus-tolerance-lcd.json');
const discreteCalculusBoundariesLCD = require('./fixtures/classpad-880-discrete-calculus-boundaries-lcd.json');
const arithmeticDomainBoundariesLCD = require('./fixtures/classpad-880-arithmetic-domain-boundaries-lcd.json');
const integerFunctionsBoundariesLCD = require('./fixtures/classpad-880-integer-functions-boundaries-lcd.json');
const remainderRoundingBoundariesLCD = require('./fixtures/classpad-880-remainder-rounding-boundaries-lcd.json');
const coordinateNumericBoundariesLCD = require('./fixtures/classpad-880-coordinate-numeric-boundaries-lcd.json');
const hyperbolicTrigBoundariesLCD = require('./fixtures/classpad-880-hyperbolic-trig-boundaries-lcd.json');
const logPowerBoundariesLCD = require('./fixtures/classpad-880-log-power-boundaries-lcd.json');
const dmsPercentBoundariesLCD = require('./fixtures/classpad-880-dms-percent-boundaries-lcd.json');
const engineeringPrimeBoundariesLCD = require('./fixtures/classpad-880-engineering-prime-boundaries-lcd.json');
const trigAngleBoundariesLCD = require('./fixtures/classpad-880-trig-angle-boundaries-lcd.json');
const linearHistoryBoundariesLCD = require('./fixtures/classpad-880-linear-history-boundaries-lcd.json');
const editorUndoBoundariesLCD = require('./fixtures/classpad-880-editor-undo-boundaries-lcd.json');
const ansReplayBoundariesLCD = require('./fixtures/classpad-880-ans-replay-boundaries-lcd.json');
const mixedRecurringInputLCD = require('./fixtures/classpad-880-mixed-recurring-input-lcd.json');
const precedenceBoundariesLCD = require('./fixtures/classpad-880-precedence-boundaries-lcd.json');
const variableCalcBoundariesLCD = require('./fixtures/classpad-880-variable-calc-boundaries-lcd.json');
const constantUnitBoundariesLCD = require('./fixtures/classpad-880-constant-unit-boundaries-lcd.json');
const specializedPowerBoundariesLCD = require('./fixtures/classpad-880-specialized-power-boundaries-lcd.json');
const sharedEvaluationBoundariesLCD = require('./fixtures/classpad-880-shared-evaluation-boundaries-lcd.json');
const functionTablePowerLCD = require('./fixtures/classpad-880-function-table-power-lcd.json');
const sheetPowerBoundariesLCD = require('./fixtures/classpad-880-sheet-power-boundaries-lcd.json');
const statisticsPowerBoundariesLCD = require('./fixtures/classpad-880-statistics-power-boundaries-lcd.json');
const distributionPowerBoundariesLCD = require('./fixtures/classpad-880-distribution-power-boundaries-lcd.json');
const coefficientPowerBoundariesLCD = require('./fixtures/classpad-880-coefficient-power-boundaries-lcd.json');
const arrayEditorPowerBoundariesLCD = require('./fixtures/classpad-880-array-editor-power-boundaries-lcd.json');
const explorerBoxPowerBoundariesLCD = require('./fixtures/classpad-880-explorer-box-power-boundaries-lcd.json');
const powerCycleStateLCD = require('./fixtures/classpad-880-power-cycle-state-lcd.json');
const tableRangeNavigationLCD = require('./fixtures/classpad-880-table-range-navigation-lcd.json');
const coefficientExponentNavigationLCD = require('./fixtures/classpad-880-coefficient-exponent-navigation-lcd.json');
const coefficientFooterScrollLCD = require('./fixtures/classpad-880-coefficient-footer-scroll-lcd.json');
const cellMathInputLCD = require('./fixtures/classpad-880-cell-math-input-lcd.json');
const externalMathInputLCD = require('./fixtures/classpad-880-external-math-input-lcd.json');
const boxMathInputLCD = require('./fixtures/classpad-880-box-math-input-lcd.json');
const geometryMathInputLCD = require('./fixtures/classpad-880-geometry-math-input-lcd.json');
const linePlaneMathInputLCD = require('./fixtures/classpad-880-line-plane-math-input-lcd.json');
const probabilityExactInputLCD = require('./fixtures/classpad-880-probability-exact-input-lcd.json');
const groupedFractionInputLCD = require('./fixtures/classpad-880-grouped-fraction-input-lcd.json');
const groupedScienceInputLCD = require('./fixtures/classpad-880-grouped-science-input-lcd.json');
const sheetScienceFormatLCD = require('./fixtures/classpad-880-sheet-science-format-lcd.json');
const statScienceFormatLCD = require('./fixtures/classpad-880-stat-science-format-lcd.json');
const distScienceFormatLCD = require('./fixtures/classpad-880-dist-science-format-lcd.json');
const tableScienceFormatLCD = require('./fixtures/classpad-880-table-science-format-lcd.json');
const arrayScienceFormatLCD = require('./fixtures/classpad-880-array-science-format-lcd.json');
const coefficientScienceFormatLCD = require('./fixtures/classpad-880-coefficient-science-format-lcd.json');
const complexFormatCombinationsLCD = require('./fixtures/classpad-880-complex-format-combinations-lcd.json');
const mathScriptGlyphsLCD = require('./fixtures/classpad-880-math-script-glyphs-lcd.json');
const mathNestedLayoutLCD = require('./fixtures/classpad-880-math-nested-layout-lcd.json');
const mathRootsMixedNegativeLCD = require('./fixtures/classpad-880-math-roots-mixed-negative-lcd.json');
const mathEditNestedNavigationLCD = require('./fixtures/classpad-880-math-edit-nested-navigation-lcd.json');
const mathTallFunctionsLCD = require('./fixtures/classpad-880-math-tall-functions-lcd.json');
const mathAbsFixedPowersLCD = require('./fixtures/classpad-880-math-abs-fixed-powers-lcd.json');
const mathCalcNestedLCD = require('./fixtures/classpad-880-math-calc-nested-lcd.json');
const mathVerifyNestedLCD = require('./fixtures/classpad-880-math-verify-nested-lcd.json');
const mathLineCalcVerifyLCD = require('./fixtures/classpad-880-math-line-calc-verify-lcd.json');
const complexVerifyExactLCD = require('./fixtures/classpad-880-complex-verify-exact-lcd.json');
const verifyMemoryExactLCD = require('./fixtures/classpad-880-verify-memory-exact-lcd.json');
const mathDeepRadicalsLCD = require('./fixtures/classpad-880-math-deep-radicals-lcd.json');
const mathDeepVerifyErrorsLCD = require('./fixtures/classpad-880-math-deep-verify-errors-lcd.json');
const specialNonrealMemoryLCD = require('./fixtures/classpad-880-special-nonreal-memory-lcd.json');
const functionNonrealMemoryLCD = require('./fixtures/classpad-880-function-nonreal-memory-lcd.json');
const tableRegisterEffectsLCD = require('./fixtures/classpad-880-table-register-effects-lcd.json');
const inputVariableAdjacencyLCD = require('./fixtures/classpad-880-input-variable-adjacency-lcd.json');
const logExactRationalLCD = require('./fixtures/classpad-880-log-exact-rational-lcd.json');
const settingsMenuWrapLCD = require('./fixtures/classpad-880-settings-menu-wrap-lcd.json');
const verifyRadicalIdentitiesLCD = require('./fixtures/classpad-880-verify-radical-identities-lcd.json');
const expressionCaretWrapLCD = require('./fixtures/classpad-880-expression-caret-wrap-lcd.json');
const mathInsertionCursorLCD = require('./fixtures/classpad-880-math-insertion-cursor-lcd.json');
const mixedErrorNavigationLCD = require('./fixtures/classpad-880-mixed-error-navigation-lcd.json');
const editorInsertionCursorLCD = require('./fixtures/classpad-880-editor-insertion-cursor-lcd.json');
const distributionEditFlowLCD = require('./fixtures/classpad-880-distribution-edit-flow-lcd.json');
const distributionErrorReturnLCD = require('./fixtures/classpad-880-distribution-error-return-lcd.json');
const tableSubtractionInputLCD = require('./fixtures/classpad-880-table-subtraction-input-lcd.json');
const mathNegativeFractionPowerLCD = require('./fixtures/classpad-880-math-negative-fraction-power-lcd.json');
const mathTemplateRightOperandLCD = require('./fixtures/classpad-880-math-template-right-operand-lcd.json');
const mathFractionFrontDeleteLCD = require('./fixtures/classpad-880-math-fraction-front-delete-lcd.json');
const explorerBitexChecklistLCD = require('./fixtures/classpad-880-explorer-bitex-checklist-lcd.json');
const geometryTriangleVariantsLCD = require('./fixtures/classpad-880-geometry-triangle-variants-lcd.json');
const explorerErrorRecoveryLCD = require('./fixtures/classpad-880-explorer-error-recovery-lcd.json');
const groupedModeErrorsLCD = require('./fixtures/classpad-880-grouped-mode-errors-lcd.json');
const groupedResultNavigationLCD = require('./fixtures/classpad-880-grouped-result-navigation-lcd.json');
const mathNestedCursorOrderLCD = require('./fixtures/classpad-880-math-nested-cursor-order-lcd.json');
const mathStructuralDeleteContextLCD = require('./fixtures/classpad-880-math-structural-delete-context-lcd.json');
const mathRadicalActivePowerLCD = require('./fixtures/classpad-880-math-radical-active-power-lcd.json');
const mathLogErrorContinuationLCD = require('./fixtures/classpad-880-math-log-error-continuation-lcd.json');
const baseNNestedErrorLCD = require('./fixtures/classpad-880-base-n-nested-error-lcd.json');
const coefficientPrefixCursorLCD = require('./fixtures/classpad-880-coefficient-prefix-cursor-lcd.json');
const tableEditCommittedRowLCD = require('./fixtures/classpad-880-table-edit-committed-row-lcd.json');
const mathSciencePostfixErrorLCD = require('./fixtures/classpad-880-math-science-postfix-error-lcd.json');
const simulScaleBoundariesLCD = require('./fixtures/classpad-880-simul-scale-boundaries-lcd.json');
const baseArithmeticBoundariesLCD = require('./fixtures/classpad-880-base-arithmetic-boundaries-lcd.json');
const tableNumericBoundariesLCD = require('./fixtures/classpad-880-table-numeric-boundaries-lcd.json');
const inequalityScaleBoundariesLCD = require('./fixtures/classpad-880-inequality-scale-boundaries-lcd.json');
const ratioScaleBoundariesLCD = require('./fixtures/classpad-880-ratio-scale-boundaries-lcd.json');
const equationScaleBoundariesLCD = require('./fixtures/classpad-880-equation-scale-boundaries-lcd.json');
const numberLineFlowBoundariesLCD = require('./fixtures/classpad-880-number-line-flow-boundaries-lcd.json');

const directory = join(__dirname, '..', 'web');
const files = [...readFileSync(join(directory,'index.html'),'utf8').matchAll(/<script defer src="([^"]+)"/g)]
  .map(match => match[1]).filter(name => !['core/touch.js','lcd.js','app.js'].includes(name));
const code = files.map(name => readFileSync(join(directory,name),'utf8')).join('\n');
const {createCalculator880, buildLCDFrame880, lcdStatusFlags880, CLASS_PAD_LCD} = runInNewContext(code +
  '\n({createCalculator880, buildLCDFrame880, lcdStatusFlags880, CLASS_PAD_LCD})', {atob, btoa});

const patterns = {
  'home-vi-0':[], 'home-vi-6':['page-down'], 'home-vi-9':['page-down','page-down'],
  'settings':['1','settings'], 'calcsettings-0':['1','settings','1'], 'calcsettings-4':['1','settings','1','page-down'],
  'calcsettings-6':['1','settings','1','page-down','page-down'], 'systemsettings-0':['1','settings','2'],
  'catalog-0':['1','catalog'], 'catalog-4':['1','catalog','page-down'], 'tools':['1','tools'],
  'settings-io':['1','settings','1','1'], 'settings-angle':['1','settings','1','2'],
  empty:['1'],digits:['1','0','1','2','3','4','5','6','7','8','9'],
  ops:['1','open','1','add','2','close','multiply','3','divide','4','subtract','5','dot','6'],
  symbols:['1','sin','x','close','add','shift','7','add','shift','8','shift','add'],
  minus:['1','shift','subtract','5','subtract','2'],mathInput:['1','1','2','add','3'],mathResult:['1','1','2','add','3','exe'],
  fracEmpty:['1','fraction'],fracNumerator:['1','fraction','1'],fracDenominator:['1','fraction','1','down','2'],
  fracResult:['1','1','fraction','2','exe'],root:['1','sqrt','2'],rootResult:['1','sqrt','2','exe'],
  power:['1','2','power','3'],powerResult:['1','2','power','3','exe'],
  log:['1','logn','2','right','8'],logResult:['1','logn','2','right','8','exe'],
  mathError:['1','1','divide','0','exe'],syntaxError:['1','1','add','exe'],
  fractionLong:['1','1','2','3','fraction','4','5','6','exe'],
  lineResult:['1','settings','1','1','3','ac','ac','1','fraction','2','add','sqrt','2','close','exe'],
  square:['1','2','square'], 'settings-angle-degree':['1','settings','1','2'],
  'catalog-quick-0':['1','shift','catalog'],'catalog-quick-last':['1','shift','catalog','page-down'],
  'catalog-quick-third':['1','shift','catalog','page-down','page-down'],
  'catalog-quick-4':['1','shift','catalog','page-down','page-down','page-down'],
  'catalog-quick-5':['1','shift','catalog','page-down','page-down','page-down','page-down'],
  'exp-negative':['1','1','times-ten','shift','subtract','9','9','exe'],
  dms:['1','1','shift','add','2','shift','add','3','shift','add'],
  'pi-e':['1','shift','7','add','shift','8'],
  derivativeEmpty:['1','shift','catalog','1'],
  derivativeFilled:['1','shift','catalog','1','x','square','right','2'],
  integralEmpty:['1','shift','catalog','2'],
  'integral-upper':['1','shift','catalog','2','x','up','1'],
  'integral-lower':['1','shift','catalog','2','x','up','1','down','0'],
  'integral-lower-right':['1','shift','catalog','2','x','up','1','down','0','right'],
  'integral-result':['1','shift','catalog','2','x','up','1','down','0','right','exe'],
  imaginary:['8','shift','9'],

  sumEmpty:['1','shift','catalog','3'],
  nthrootEmpty:['1','shift','sqrt'],
  nthrootFilled:['1','shift','sqrt','3','right','8'],
  tallParen:['1','open','fraction','1','down','2','right','close'],

  nested:['1','open','1','add','sqrt','2','power','3','right','right','close','fraction','logn','2','right','8'],
  scientific:['1','1','times-ten','9','9','exe'],
  'format-frac':['1','1','fraction','2','exe','shift','format'],
  'format-frac-last':['1','1','fraction','2','exe','shift','format','page-down'],
  'format-root':['1','sqrt','2','exe','shift','format'],
  'format-root-last':['1','sqrt','2','exe','shift','format','page-down'],
  'format-int-last':['1','7','exe','shift','format','page-down'],
  minusSquare:['1','shift','subtract','2','square','exe'],
  long:['1','1','2','3','4','5','6','7','8','9','add','1','2','3','4','5','6','7','8','9','add','1','2','3'],

};

function decodeReference(name) {
  const pixels = [];
  for (const byte of Buffer.from(references[name] || homeOptionLCD.frames[name] || special.frames[name] || arrays.frames[name] ||
    baseDistribution.frames[name] || equations.frames[name] || equationFollowup.frames[name] ||
    solveCubicLCD.frames[name] || solveCubicMemoryLCD.frames[name] || solveCubicNewtonLCD.frames[name] ||
    solveCubicStencilLCD.frames[name] || sheetLCD.frames[name] || ratioLCD.frames[name] ||
    complexLCD.frames[name] || verifyLCD.frames[name] || calculateLCD.frames[name] || statisticsLCD.frames[name] || tableLCD.frames[name] ||
    mathBoxLCD.frames[name] || sheetNightLCD.frames[name] || explorerLCD.frames[name] || memoryLCD.frames[name] || englishLCD.frames[name] || constantsLCD.frames[name] || conversionsLCD.frames[name] || englishSpecialLCD.frames[name] || surdBoundsLCD.frames[name] || sheetBoundsLCD.frames[name] || sheetEdgesLCD.frames[name] || lineEdgesLCD.frames[name] || lineSettingsLCD.frames[name] || resetMemoryLCD.frames[name] || circleGraphicsLCD.frames[name] || randomRepeatLCD.frames[name] || calculusLCD.frames[name] || flowHistoryLCD.frames[name] || flowSettingsLCD.frames[name] || flowErrorsLCD.frames[name] || flowAppsLCD.frames[name] || specialSettingsLCD.frames[name] || calcErrorsLCD.frames[name] || verifyErrorsLCD.frames[name] || specialSettingsExtraLCD.frames[name] || baseAnsEdgesLCD.frames[name] || bitexSolveLCD.frames[name] || bitexCalculusLCD.frames[name] || bitexCalcMemoryLCD.frames[name] || equationEdgeAcceptanceLCD.frames[name] || arrayOperationEdgesLCD.frames[name] || functionCalculusLCD.frames[name] || functionCalculusHoldoutsLCD.frames[name] || functionRegistrationErrorsLCD.frames[name] || statisticsBoundariesLCD.frames[name] || distributionBoundariesLCD.frames[name] || sheetTransferErrorsLCD.frames[name] || geometryBoundariesLCD.frames[name] || probabilityBoundariesLCD.frames[name] || geometryEditBoundariesLCD.frames[name] || groupedBoundariesLCD.frames[name] || arrayNumericBoundariesLCD.frames[name] || arrayRangeBoundariesLCD.frames[name] || complexNumericBoundariesLCD.frames[name] || circleFlowBoundariesLCD.frames[name] || complexLimitHoldoutsLCD.frames[name] || numberLineFlowBoundariesLCD.frames[name] || equationScaleBoundariesLCD.frames[name] || inequalityScaleBoundariesLCD.frames[name] || ratioScaleBoundariesLCD.frames[name] || tableNumericBoundariesLCD.frames[name] || baseArithmeticBoundariesLCD.frames[name] || simulScaleBoundariesLCD.frames[name] || expressionLimitsLCD.frames[name] || calculusToleranceLCD.frames[name] || discreteCalculusBoundariesLCD.frames[name] || arithmeticDomainBoundariesLCD.frames[name] || integerFunctionsBoundariesLCD.frames[name] || remainderRoundingBoundariesLCD.frames[name] || coordinateNumericBoundariesLCD.frames[name] || hyperbolicTrigBoundariesLCD.frames[name] || logPowerBoundariesLCD.frames[name] || dmsPercentBoundariesLCD.frames[name] || engineeringPrimeBoundariesLCD.frames[name] || trigAngleBoundariesLCD.frames[name] || linearHistoryBoundariesLCD.frames[name] || editorUndoBoundariesLCD.frames[name] || ansReplayBoundariesLCD.frames[name] || mixedRecurringInputLCD.frames[name] || precedenceBoundariesLCD.frames[name] || variableCalcBoundariesLCD.frames[name] || constantUnitBoundariesLCD.frames[name] || specializedPowerBoundariesLCD.frames[name] || sharedEvaluationBoundariesLCD.frames[name] || functionTablePowerLCD.frames[name] || sheetPowerBoundariesLCD.frames[name] || statisticsPowerBoundariesLCD.frames[name] || distributionPowerBoundariesLCD.frames[name] || coefficientPowerBoundariesLCD.frames[name] || arrayEditorPowerBoundariesLCD.frames[name] || explorerBoxPowerBoundariesLCD.frames[name] || powerCycleStateLCD.frames[name] || tableRangeNavigationLCD.frames[name] || coefficientExponentNavigationLCD.frames[name] || coefficientFooterScrollLCD.frames[name] || cellMathInputLCD.frames[name] || externalMathInputLCD.frames[name] || boxMathInputLCD.frames[name] || geometryMathInputLCD.frames[name] || linePlaneMathInputLCD.frames[name] || probabilityExactInputLCD.frames[name] || groupedFractionInputLCD.frames[name] || groupedScienceInputLCD.frames[name] || sheetScienceFormatLCD.frames[name] || statScienceFormatLCD.frames[name] || distScienceFormatLCD.frames[name] || tableScienceFormatLCD.frames[name] || arrayScienceFormatLCD.frames[name] || coefficientScienceFormatLCD.frames[name] || complexFormatCombinationsLCD.frames[name] || mathScriptGlyphsLCD.frames[name] || mathNestedLayoutLCD.frames[name] || mathRootsMixedNegativeLCD.frames[name] || mathEditNestedNavigationLCD.frames[name] || mathTallFunctionsLCD.frames[name] || mathAbsFixedPowersLCD.frames[name] || mathCalcNestedLCD.frames[name] || mathVerifyNestedLCD.frames[name] || mathLineCalcVerifyLCD.frames[name] || complexVerifyExactLCD.frames[name] || verifyMemoryExactLCD.frames[name] || mathDeepRadicalsLCD.frames[name] || mathDeepVerifyErrorsLCD.frames[name] || specialNonrealMemoryLCD.frames[name] || functionNonrealMemoryLCD.frames[name] || tableRegisterEffectsLCD.frames[name] || inputVariableAdjacencyLCD.frames[name] || logExactRationalLCD.frames[name] || settingsMenuWrapLCD.frames[name] || verifyRadicalIdentitiesLCD.frames[name] || expressionCaretWrapLCD.frames[name] || mathInsertionCursorLCD.frames[name] || mixedErrorNavigationLCD.frames[name] || editorInsertionCursorLCD.frames[name] || distributionEditFlowLCD.frames[name] || distributionErrorReturnLCD.frames[name] || tableSubtractionInputLCD.frames[name] || mathNegativeFractionPowerLCD.frames[name] || mathTemplateRightOperandLCD.frames[name] || mathFractionFrontDeleteLCD.frames[name] || explorerBitexChecklistLCD.frames[name] || geometryTriangleVariantsLCD.frames[name] || explorerErrorRecoveryLCD.frames[name] || groupedModeErrorsLCD.frames[name] || groupedResultNavigationLCD.frames[name] || mathNestedCursorOrderLCD.frames[name] || mathStructuralDeleteContextLCD.frames[name] || mathRadicalActivePowerLCD.frames[name] || mathLogErrorContinuationLCD.frames[name] || baseNNestedErrorLCD.frames[name] || coefficientPrefixCursorLCD.frames[name] || tableEditCommittedRowLCD.frames[name] || mathSciencePostfixErrorLCD.frames[name], 'base64')) {
    for (let count = 0; count < (byte & 63); count++) pixels.push(byte >> 6);
  }
  assert.equal(pixels.length, 192 * 63);
  return pixels;
}

function checkFrame(name, keys, settings = {}, deferredRegions = [], rendererData = null) {
  const calculator = createCalculator880(settings);
  for (const key of keys) calculator.press(key);
  const state = calculator.getState();
  if (rendererData) Object.assign(state.data,rendererData);
  const frame = buildLCDFrame880(state);
  assert.ok(frame, 'Máy phải dùng bộ hiển thị LCD điểm ảnh');
  const expected = decodeReference(name);
  if (frame.cursor) {
    const [x, y, width, height] = frame.cursor;
    for (let row = Math.max(0, y); row < Math.min(63, y + height); row++) {
      const rowWidth=frame.cursorRows?.[row-y] ?? width;
      for (let column = Math.max(0, x); column < Math.min(192, x + rowWidth); column++) {
        frame.pixels[row * 192 + column] = 1;
      }
    }
  }
  const mismatch = expected.findIndex((pixel, index) => frame.pixels[index] !== pixel && !deferredRegions.some(([x,y,width,height]) =>
    index % 192 >= x && index % 192 < x + width && Math.floor(index / 192) >= y && Math.floor(index / 192) < y + height));
  assert.equal(mismatch, -1, mismatch < 0 ? '' :
    name + ': điểm ảnh sai tại (' + (mismatch % 192) + ', ' + Math.floor(mismatch / 192) + ')');
  return state;
}

const table = ['5','tools','2','1','x','square','exe'];
const tableRange = [...table,'tools','1'];
const tableValues = [...tableRange,'1','exe','5','exe','1','exe','exe'];
const stats = ['2','1'];
const statsValues = [...stats,'2','exe','4','exe','6','exe'];
const verify = ['1','tools','3'];
const additions = {
  'special-stats-menu':['2'],
  'special-stats-empty':stats,
  'special-stats-draft':[...stats,'2'],
  'special-stats-data':statsValues,
  'special-stats-after-ac':[...statsValues,'ac'],
  'special-stats-tools':[...statsValues,'tools'],
  'special-stats-results-menu':[...statsValues,'exe'],
  'special-stats-results':[...statsValues,'exe','1'],
  'special-stats-two':['2','2'],
  'special-spreadsheet-empty':['4'],
  'special-spreadsheet-data':['4','1','2','exe','5','exe','right'],
  'special-table-empty':['5'],
  'special-table-defined':table,
  'special-table-range':tableRange,
  'special-table-data':tableValues,
  'special-table-focus':[...tableValues,'down','right'],
  'special-equation-menu':['6'],
  'special-equation-linear-menu':['6','1'],
  'special-equation-polynomial-menu':['6','2'],
  'special-equation-coefficients':['6','1','1'],
  'special-equation-polynomial':['6','2','1'],
  'special-equation-polynomial-input':['6','2','1','1','exe','shift','subtract','3','exe'],
  'special-inequality-menu':['7'],
  'special-inequality-relation':['7','1'],
  'special-inequality-coefficients':['7','1','1'],
  'special-ratio-menu':['page-down','subtract'],
  'special-ratio-coefficients':['page-down','subtract','1'],
  'special-ratio-second':['page-down','subtract','2'],
  'special-ratio-result':['page-down','subtract','2','1','exe','3','exe','1','exe','exe'],
  'special-distribution-menu':['3'],
  'special-distribution-menu-last':['3','page-down'],
  'special-distribution-normal':['3','1'],
  'special-distribution-normal-form':['3','3'],
  'special-distribution-normal-execute':['3','3','down','down','down'],
  'special-distribution-normal-result':['3','3','down','down','down','exe'],
  'rare-product':['1','shift','catalog','4'],
  'rare-abs-filled':['1','shift','catalog','page-down','2','2','right'],
  'rare-reciprocal':['1','2','shift','power'],
  'rare-polar':['8','1','catalog','1','2','2'],
  'rare-verify-equal':[...verify,'1','shift','open','1'],
  'rare-verify-true':[...verify,'1','shift','open','1','exe'],
  'rare-verify-false':[...verify,'1','shift','open','2','exe'],
};

for (const [name, keys] of Object.entries(additions)) {
  test('LCD ' + name, () => checkFrame(name, keys, {angle:'rad'}));
}

const matrixHome = ['0'];
const matrixSize = [...matrixHome,'tools','1'];
const matrixEntry = [...matrixSize,'down','down','ok'];
const matrixValues = [...matrixEntry,...'1234'.split('').flatMap(digit => [digit,'exe'])];
const matrixCalc = [...matrixValues,'ac','catalog','1','2'];
const matrixResult = [...matrixCalc,'square','exe'];
const matrix4x4 = [...matrixHome,'tools','2','ok','4','ok','4','ok'];
const matrix4x4Values = [...matrix4x4,...'1234567890123456'.split('').flatMap(digit => [digit,'exe'])];
const vectorHome = ['page-down','add'];
const vectorSize = [...vectorHome,'tools','1'];
const vectorEntry = [...vectorSize,'down','ok'];
const vectorValues = [...vectorEntry,'3','exe','shift','subtract','4','exe'];
const vectorResult = [...vectorValues,'ac','catalog','1','2','add','catalog','1','2','exe'];
const vector3 = [...vectorHome,'tools','2','ok','2','ok'];
const vector3Values = [...vector3,'1','exe','shift','subtract','2','exe','3','exe'];
const vector3Operation = [...vector3Values,'ac','2','multiply','catalog','1','3'];
const matrixRectangle = [...matrixHome,'tools','4','ok','2','ok','3','ok'];
const matrixRectangleValues = [...matrixRectangle,...'123456'.split('').flatMap(digit => [digit,'exe'])];
const transpose = [...matrixRectangleValues,'ac','catalog','1','1','5','catalog','1','5','close'];
const determinant = [...matrixValues,'ac','catalog','1','1','4','catalog','1','2','close'];
const dotProduct = [...vectorValues,'ac','catalog','1','2','catalog','1','1','1','catalog','1','2'];
const matrixWide = [...matrixHome,'tools','3','ok','1','ok','4','ok',...'1234567','exe',...'12345678901','exe',
  'shift','subtract','0','dot',...'000000123','exe','0','dot',...'1234567','exe'];
const matrixVector = {
  'matrix-idle':matrixHome,
  'matrix-size':matrixSize,
  'matrix-row-menu':[...matrixSize,'ok'],
  'matrix-size-column':[...matrixSize,'down'],
  'matrix-column-menu':[...matrixSize,'down','ok'],
  'matrix-size-confirm':[...matrixSize,'down','down'],
  'matrix-2x2-empty':matrixEntry,
  'matrix-2x2-draft':[...matrixEntry,'1'],
  'matrix-2x2-first':[...matrixEntry,'1','exe'],
  'matrix-2x2-data':matrixValues,
  'matrix-2x2-focus':[...matrixValues,'up','left'],
  'matrix-catalog':[...matrixValues,'ac','catalog','1'],
  'matrix-operand':matrixCalc,
  'matrix-square':[...matrixCalc,'square'],
  'matrix-power-three':[...matrixCalc,'catalog','1','1','2'],
  'matrix-power-inverse':[...matrixCalc,'shift','power'],
  'matrix-inverse':[...matrixCalc,'shift','power','exe'],
  'matrix-determinant-input':determinant,
  'matrix-determinant-result':[...determinant,'exe'],
  'matrix-result-exe':[...matrixResult,'exe'],
  'matrix-2x2-result':matrixResult,
  'matrix-2x2-result-right':[...matrixResult,'right'],
  'matrix-2x2-result-down':[...matrixResult,'right','down'],
  'matrix-result-tools':[...matrixResult,'tools'],
  'matrix-defined-action':[...matrixValues,'ac','tools','1'],
  'matrix-edit-existing':[...matrixValues,'ac','tools','1','1'],
  'matrix-fraction-draft':[...matrixValues,'ac','tools','1','1','1','fraction','3'],
  'matrix-fraction-cell':[...matrixValues,'ac','tools','1','1','1','fraction','3','exe','left'],
  'matrix-long-draft':[...matrixValues,'ac','tools','1','1',...'123456789','add',...'123456789','add',...'1234'],
  'matrix-fraction-result':[...matrixCalc,'divide','3','exe'],
  'matrix-fraction-result-next':[...matrixCalc,'divide','3','exe','right'],
  'matrix-4x4-empty':matrix4x4,
  'matrix-4x4-data':matrix4x4Values,
  'matrix-4x4-left':[...matrix4x4Values,'left'],
  'matrix-4x4-left-twice':[...matrix4x4Values,'left','left'],
  'matrix-4x4-wrap':[...matrix4x4Values,'left','left','left','left'],
  'matrix-1x4-empty':[...matrixHome,'tools','3','ok','1','ok','4','ok'],
  'matrix-1x4-far':[...matrixHome,'tools','3','ok','1','ok','4','ok','right','right','right'],
  'matrix-4x1-empty':[...matrixHome,'tools','4','ok','4','ok','1','ok'],
  'matrix-4x1-far':[...matrixHome,'tools','4','ok','4','ok','1','ok','down','down','down'],
  'matrix-wide-footer':[...matrixWide,'left'],
  'matrix-2x3-empty':matrixRectangle,
  'matrix-2x3-data':matrixRectangleValues,
  'matrix-transpose-menu':[...matrixRectangleValues,'ac','catalog','1','1','page-down'],
  'matrix-transpose-input':transpose,
  'matrix-transpose-result':[...transpose,'exe'],
  'matrix-transpose-result-back':[...transpose,'exe','back'],
  'vector-idle':vectorHome,
  'vector-tools':[...vectorHome,'tools'],
  'vector-size':vectorSize,
  'vector-dimension-menu':[...vectorSize,'ok'],
  'vector-size-confirm':[...vectorSize,'down'],
  'vector-2-empty':vectorEntry,
  'vector-2-draft':[...vectorEntry,'3'],
  'vector-2-first':[...vectorEntry,'3','exe'],
  'vector-2-data':vectorValues,
  'vector-2-focus':[...vectorValues,'left'],
  'vector-catalog':[...vectorValues,'ac','catalog','1'],
  'vector-operand':[...vectorValues,'ac','catalog','1','2'],
  'vector-expression':[...vectorValues,'ac','catalog','1','2','add','catalog','1','2'],
  'vector-2-result':vectorResult,
  'vector-2-result-right':[...vectorResult,'right'],
  'vector-3-empty':vector3,
  'vector-3-middle':[...vector3,'down'],
  'vector-3-data':vector3Values,
  'vector-3-focus':[...vector3Values,'left'],
  'vector-3-expression':vector3Operation,
  'vector-3-result':[...vector3Operation,'exe'],
  'vector-3-result-far':[...vector3Operation,'exe','right','right'],
  'vector-dot-input':dotProduct,
  'vector-dot-result':[...dotProduct,'exe'],
  'vector-cross-result':[...vector3Values,'ac','catalog','1','3','catalog','1','1','2','catalog','1','3','exe']
};
for (const [name, keys] of Object.entries(matrixVector)) {
  test('LCD ' + name, () => {
    checkFrame(name, keys, {angle:'rad'});
    const calculator = createCalculator880({angle:'rad'});
    keys.forEach(calculator.press);
    assert.deepEqual(Array.from(lcdStatusFlags880(calculator.getState())), arrays.statuses[name]);
  });
}
const scientific = {angle:'rad', number:{kind:'sci', digits:1}};
test('LCD matrix-compact-exponents', () => checkFrame('matrix-compact-exponents', [
  ...matrix4x4Values,'ac','tools','2','1',
  ...Array.from({length:10}, (_, digit) => ['1','times-ten','2',String(digit),'exe']).flat()
], scientific));

const baseResult = ['9','3','0','exe'];
const baseNegative = ['9','0','subtract','1','exe','format'];
const baseLetters = ['9','format',...'456123'.split('').flatMap(key => ['shift',key])];
const baseLogic = ['9','1','2','catalog','1','3','1','0'];
const basePrefix = ['9','catalog','2','3','1','0','1','0'];
const basePatterns = {
  'base-entry':['9'],
  'base-shift':['9','shift'],
  'base-hex-empty':['9','format'],
  'base-bin-empty':['9','format','format'],
  'base-oct-empty':['9','format','format','format'],
  'base-dec-empty':['9','format','format','format','format'],
  'base-format-menu':['9','shift','format'],
  'base-dec-input':['9','3','0'],
  'base-dec-result':baseResult,
  'base-hex-result':[...baseResult,'format'],
  'base-bin-result':[...baseResult,'format','format'],
  'base-bin-scroll':[...baseResult,'format','format','down'],
  'base-oct-result':[...baseResult,'format','format','format'],
  'base-format-menu-result':[...baseResult,'format','format','format','shift','format'],
  'base-tools':[...baseResult,'format','format','format','tools'],
  'base-catalog':['9','catalog'],
  'base-logic-menu':['9','catalog','1'],
  'base-prefix-menu':['9','catalog','2'],
  'base-hex-menu':['9','catalog','3'],
  'base-hex-digits':baseLetters,
  'base-hex-digits-result':[...baseLetters,'exe'],
  'base-hex-negative':baseNegative,
  'base-bin-negative':[...baseNegative,'format'],
  'base-bin-negative-page':[...baseNegative,'format','right'],
  'base-bin-negative-page-down':[...baseNegative,'format','right','down'],
  'base-dec-draft-format-pre':['9','2','5'],
  'base-dec-draft-format':['9','2','5','format'],
  'base-logic-input':baseLogic,
  'base-logic-result':[...baseLogic,'exe'],
  'base-prefix-input':[...baseLogic,'exe','ac',...basePrefix.slice(1)],
  'base-prefix-result':[...basePrefix,'exe'],
  'base-prefix-letters':['9','catalog','2','1','1','catalog','2','2','1','catalog','2','4','1'],
  'base-not-input':['9','catalog','1','2','2','close'],
  'base-not-result':['9','catalog','1','2','2','close','exe'],
  'base-neg-input':[...basePrefix,'exe','ac','catalog','1','1','2','close'],
  'base-neg-result':['9','catalog','1','1','2','close','exe']
};
for (const [operator, shortcut] of [['or','4'],['xor','5'],['xnor','6']]) {
  const input = ['9','1','2','catalog','1',shortcut,'1','0'];
  basePatterns['base-' + operator + '-input'] = input;
  basePatterns['base-' + operator + '-result'] = [...input,'exe'];
}

const entries = (...values) => values.flatMap(value => [
  ...[...String(value)].flatMap(ch => ch === '-' ? ['shift','subtract'] : ch === '.' ? ['dot'] : [ch]), 'exe'
]);

const sim2 = ['6','1','1'];
const sim2Values = [...sim2,...entries(2,1,4,1,-1,1)];
const sim3 = ['6','1','2'];
const sim3Values = [...sim3,...entries(1,0,0,1,0,1,0,2,0,0,1,3)];
const sim4 = ['6','1','3'];
const sim4Values = [...sim4,...entries(1,0,0,0,1,0,1,0,0,2,0,0,1,0,3,0,0,0,1,4)];
const poly2 = ['6','2','1'];
const poly2Values = [...poly2,...entries(1,-3,2)];
const complexValues = [...poly2,...entries(1,0,1)];
const surdValues = [...poly2,...entries(1,0,-2)];
const max2Values = [...poly2,...entries(-1,2,-1)];
const poly3 = ['6','2','2'];
const poly3Values = [...poly3,...entries(1,-6,11,-6)];
const extrema3Values = [...poly3,...entries(1,0,-3,0),'exe','down','down','down'];
const long3Values = [...poly3,...entries(1,0,0,-2),'exe','down','down'];
const poly4 = ['6','2','3'];
const poly4Values = [...poly4,...entries(1,0,-5,0,4)];
const solver = ['6','3'];
const solveExpression = [...solver,'2','x','add','3','shift','open','7'];
const solveChoice = [...solver,'shift','4','x','add','shift','5','shift','open','shift','6','exe'];
const solveFailure = [...solver,'x','square','add','1','shift','open','0','exe','down','exe'];
const equationPatterns = {
  'eq-sim2-empty':sim2,
  'eq-sim2-final-coefficient':sim2Values,
  'eq-sim2-x':[...sim2Values,'exe'],
  'eq-sim2-x-decimal':[...sim2Values,'exe','format'],
  'eq-sim2-first-exe':[...sim2Values,'exe','exe'],
  'eq-sim2-y-after-decimal':[...sim2Values,'exe','format','down'],
  'eq-sim2-x-format':[...sim2Values,'exe','shift','format'],
  'eq-sim2-mixed':[...sim2Values,'exe','shift','format','4'],
  'eq-sim2-y':[...sim2Values,'exe','down'],
  'eq-sim2-return':[...sim2Values,'exe','down','exe'],
  'eq-sim2-none':[...sim2,...entries(1,1,2,1,1,3),'exe'],
  'eq-sim2-infinite':[...sim2,...entries(1,1,2,2,2,4),'exe'],
  'eq-sim3-empty':sim3,
  'eq-sim3-first':[...sim3,...entries(1)],
  'eq-sim3-ready':sim3Values,
  'eq-sim3-x':[...sim3Values,'exe'],
  'eq-sim3-y':[...sim3Values,'exe','down'],
  'eq-sim3-z':[...sim3Values,'exe','down','down'],
  'eq-sim4-empty':sim4,
  'eq-sim4-right':[...sim4,'right','right','right'],
  'eq-sim4-far':[...sim4,'right','right','right','right'],
  'eq-poly2-ready':poly2Values,
  'eq-poly2-x1':[...poly2Values,'exe'],
  'eq-poly2-x2':[...poly2Values,'exe','down'],
  'eq-poly2-min-x':[...poly2Values,'exe','down','down'],
  'eq-poly2-min-y':[...poly2Values,'exe','down','down','down'],
  'eq-poly2-max-ready':max2Values,
  'eq-poly2-max-x':[...max2Values,'exe','down'],
  'eq-poly2-max-y':[...max2Values,'exe','down','down'],
  'eq-poly2-complex':[...complexValues,'exe'],
  'eq-poly2-complex-2':[...complexValues,'exe','down'],
  'eq-poly2-complex-format':[...complexValues,'exe','shift','format'],
  'eq-poly2-complex-polar':[...complexValues,'exe','shift','format','4'],
  'eq-poly2-complex-polar-next':[...complexValues,'exe','shift','format','4','down'],
  'eq-poly2-surd':[...surdValues,'exe'],
  'eq-poly2-surd-format':[...surdValues,'exe','shift','format'],
  'eq-poly2-surd-format-last':[...surdValues,'exe','shift','format','page-down'],
  'eq-poly2-surd-decimal-menu':[...surdValues,'exe','shift','format','2'],
  'eq-poly3-empty':poly3,
  'eq-poly3-max-x':extrema3Values,
  'eq-poly3-max-y':[...extrema3Values,'down'],
  'eq-poly3-min-x':[...extrema3Values,'down','down'],
  'eq-poly3-min-y':[...extrema3Values,'down','down','down'],
  'eq-poly3-long':long3Values,
  'eq-poly3-long-right':[...long3Values,'right'],
  'eq-poly3-long-end':[...long3Values,...Array(19).fill('right')],
  'eq-poly4-empty':poly4,
  'eq-solver-empty':solver,
  'eq-solver-expression':solveExpression,
  'eq-solver-select':[...solveExpression,'exe'],
  'eq-solver-confirm':[...solveExpression,'exe','down'],
  'eq-solver-answer':[...solveExpression,'exe','down','exe'],
  'eq-solver-return':[...solveExpression,'exe','down','exe','back'],
  'eq-solver-many':solveChoice,
  'eq-solver-many-x':[...solveChoice,'down','ok'],
  'eq-solver-guess-draft':[...solveChoice,'down','ok','4'],
  'eq-solver-guess-stored':[...solveChoice,'down','ok','4','exe'],
  'eq-solver-field-exe':[...solveExpression,'exe','exe'],
  'eq-solver-after-answer-exe':[...solveExpression,'exe','down','exe','exe'],
  'eq-solver-after-answer-ac':[...solveExpression,'exe','down','exe','ac'],
  'eq-solver-no-root':solveFailure,
  'eq-solver-no-root-back':[...solveFailure,'back'],
  'eq-solver-square-expression':solveFailure.slice(0, -3),
};
for (const [i, name] of [...'xyzt'].entries()) equationPatterns[`eq-sim4-${name}`] = [...sim4Values,'exe',...Array(i).fill('down')];
for (const [degree, values] of [[3,poly3Values],[4,poly4Values]]) {
  for (let i = 0; i < degree; i++) equationPatterns[`eq-poly${degree}-x${i + 1}`] = [...values,'exe',...Array(i).fill('down')];
}
for (const [name, degree, relation, values] of [
  ['outside','1','1',[1,0,-1]], ['inside','1','2',[1,0,-1]],
  ['surd','1','3',[1,0,-2]], ['surd-inside','1','4',[1,0,-2]],
  ['none','1','2',[1,0,1]], ['all','1','1',[1,0,1]], ['point','1','4',[1,0,0]],
  ['cubic','2','1',[1,0,-1,0]], ['quartic','3','4',[1,0,-5,0,4]],
]) {
  const keys = ['7',degree,relation,...entries(...values)];
  equationPatterns['ineq-' + name + '-input'] = keys;
  equationPatterns['ineq-' + name] = [...keys,'exe'];
}
for (const [degree, relations] of [['2',['2','3','4']],['3',['1','2','3']]]) {
  for (const relation of relations) equationPatterns[`ineq-editor-${degree}-${relation}`] = ['7',degree,relation];
}
for (const [name, keys] of Object.entries(equationPatterns)) {
  test('LCD ' + name, () => {
    const state = checkFrame(name, keys, {angle:'rad'});
    assert.deepEqual(Array.from(lcdStatusFlags880(state)), equations.statuses[name]);
  });
}

const solveContinuation = [...solver,'x','power','9','9','right','exe','1','exe','exe'];
function cubicSolveKeys(seed, {scale = 1, constant = 3.9, split = false} = {}) {
  return [...solver,...(scale === 1 ? [] : [String(scale)]),'x','power','3','right','subtract',String(scale * 2),'x',
    ...(split ? ['shift','open','shift','subtract'] : ['add']),...entries(constant, seed),'exe'];
}

const solveCubic = cubicSolveKeys(0);
const solveLinearAnswer = [...solveExpression,'exe','down','exe'];
const solveCannot = [...solveFailure.slice(0, -2),'0','exe','exe'];
const inequalityLong = ['7','3','4',...entries(1,0,-223065,0,3145863744),'exe'];
const inequalityEnd = [...inequalityLong,...Array(17).fill('right')];
const inequalityLimits = ['7','3','4',...entries(1,0,-10,0,1),'exe'];
const inequalityFractions = ['7','3','4',...entries(46189,-3399764,91814026,-1073705580,4557306825),'exe'];
const strictDecimal = ['7','1','2',...entries(1,0,-2),'exe','shift','format','2'];
const followupPatterns = {
  'eq-en-menu':['6'], 'eq-en-simul-menu':['6','1'], 'eq-en-poly-menu':['6','2'],
  'eq-en-solver-prompt':solver,
  'eq-en-solver-form':[...solveExpression,'exe'],
  'eq-en-solver-run':[...solveExpression,'exe','down'],
  'eq-en-solver-answer':solveLinearAnswer,
  'eq-en-solver-return':[...solveLinearAnswer,'back'],
  'eq-en-solver-choose':solveChoice,
  'eq-en-solver-choose-x':[...solveChoice,'down','ok'],
  'eq-en-solver-fail':solveCannot,
  'eq-en-solver-fail-back':[...solveCannot,'back'],
  'eq-en-solver-syntax':[...solver,'x','add','shift','open','2','exe','0','exe','exe'],
  'eq-en-solver-variable':[...solver,'1','shift','open','1','exe'],
  'eq-en-error-math':[...poly2,'exe'],
  'eq-en-sim-none':equationPatterns['eq-sim2-none'],
  'eq-en-sim-infinite':equationPatterns['eq-sim2-infinite'],
  'eq-en-poly-min':equationPatterns['eq-poly2-min-x'],
  'eq-en-poly-max':equationPatterns['eq-poly2-max-x'],
  'eq-en-poly-local-max':extrema3Values,
  'eq-en-poly-local-min':[...extrema3Values,'down','down'],
  'eq-en-solver-continue-first':solveContinuation,
  'eq-en-solver-continue-second':[...solveContinuation,'exe'],
  'eq-en-solver-continue-exit-selected':[...solveContinuation,'exe','down'],
  'eq-en-solver-continue-exit-result':[...solveContinuation,'exe','down','exe'],
  'eq-vi-solver-continue-first':solveContinuation,
  'eq-vi-solver-continue-cubic':solveCubic,
  'eq-vi-solver-continue-down':[...solveCubic,'down'],
  'eq-vi-solver-continue-up':[...solveCubic,'down','up'],
  'eq-vi-solver-continue-converged':[...solveCubic,'down','up','exe'],
  'eq-vi-solver-continue-back':[...solveContinuation,'back'],
  'eq-vi-solver-continue-ac':[...solveContinuation,'ac'],
  'eq-en-format-poly':equationPatterns['eq-poly2-surd-format'],
  'eq-en-format-poly-end':equationPatterns['eq-poly2-surd-format-last'],
  'eq-en-format-simul':equationPatterns['eq-sim2-x-format'],
  'eq-en-format-simul-end':[...equationPatterns['eq-sim2-x-format'],'page-down'],
  'ineq-en-degree':['7'], 'ineq-en-sign':['7','1'], 'ineq-en-sign-3':['7','2'], 'ineq-en-sign-4':['7','3'],
  'ineq-en-all':equationPatterns['ineq-all'], 'ineq-en-none':equationPatterns['ineq-none'],
  'ineq-en-format':[...equationPatterns['ineq-surd'],'shift','format'],
  'ineq-en-format-decimal':[...equationPatterns['ineq-surd'],'shift','format','2'],
  'ineq-en-format-fraction':['7','1','1',...entries(3,-1,-2),'exe','shift','format'],
  'ineq-en-long-start':inequalityLong,
  'ineq-en-long-right':[...inequalityLong,'right'],
  'ineq-en-long-middle':[...inequalityLong,'right','right','right'],
  'ineq-en-long-end':inequalityEnd,
  'ineq-en-long-end-left':[...inequalityEnd,'left'],
  'ineq-en-long-wrap':[...inequalityEnd,...Array(11).fill('left')],
  'ineq-en-long-exe':[...inequalityEnd,...Array(11).fill('left'),'exe'],
  'ineq-en-long-back':[...inequalityLong,'right','back'],
  'ineq-vi-long-start':inequalityLong,
  'ineq-vi-long-right':[...inequalityLong,'right'],
  'ineq-vi-long-end':inequalityEnd,
  'ineq-vi-long-ac':[...inequalityEnd,'ac'],
  'ineq-en-limits-long':inequalityLimits,
  'ineq-en-limits-long-down':[...inequalityLimits,'down'],
  'ineq-en-limits-decimal':[...inequalityLimits,'shift','format','2'],
  'ineq-en-limits-format-key':[...inequalityLimits,'right','format'],
  'ineq-en-limits-format-return':[...inequalityLimits,'right','format','format'],
  'ineq-en-compact-strict':strictDecimal,
  'ineq-en-compact-standard':[...strictDecimal,'shift','format','1'],
  'ineq-en-compact-precision':['7','1','4',...entries(1,0,-.7),'exe','format'],
  'ineq-en-repeated':['7','1','1',...entries(1,0,0),'exe'],
  'ineq-en-repeated-decimal':['7','1','1',...entries(1,0,0),'exe','shift','format','2'],
  'ineq-en-fractions-start':inequalityFractions,
  'ineq-en-fractions-right':[...inequalityFractions,'right'],
  'ineq-en-fractions-end':[...inequalityFractions,...Array(19).fill('right')],
  'ineq-en-fractions-middle':[...inequalityFractions,'right','right'],
};
for (const [name, keys] of Object.entries(followupPatterns)) {
  test('LCD ' + name, () => {
    const state = checkFrame(name, keys, {angle:'rad', language:name.split('-')[1]});
    assert.deepEqual(Array.from(lcdStatusFlags880(state)), equationFollowup.statuses[name]);
  });
}

const solveCubicPatterns = [
  ['seed-zero',solveCubic,true], ['seed-two',cubicSolveKeys(2),true],
  ['scale-two',cubicSolveKeys(0,{scale:2,constant:7.8}),true], ['equality',cubicSolveKeys(0,{split:true}),true],
  ['constant-four',cubicSolveKeys(0,{constant:4}),true], ['constant-four-five',cubicSolveKeys(0,{constant:4.5}),true],
  ['constant-before',cubicSolveKeys(0,{constant:3.89}),false], ['seed-negative',cubicSolveKeys(-1),false],
];
for (const [suffix, keys, hasConvergedFrame] of solveCubicPatterns) {
  const name = 'eq-cubic-' + suffix;
  const check = (sample, sequence, pending) => {
    const state = checkFrame(sample, sequence, {angle:'rad'});
    assert.deepEqual(Array.from(lcdStatusFlags880(state)), solveCubicLCD.statuses[sample]);
    assert.equal(state.data.continue, pending);
  };
  test('LCD ' + name, () => check(name, keys, suffix !== 'seed-negative'));
  if (hasConvergedFrame) {
    test('LCD ' + name + '-converged', () => check(name + '-converged', [...keys,'exe'], false));
  }
}

const cubicRegisterCases = [
  ['zero',solveCubic,'1.995548283',12],
  ['two',cubicSolveKeys(2),'1.995548283',12],
  ['equality',cubicSolveKeys(0,{split:true}),'1.995548283',12],
  ['scaled',cubicSolveKeys(0,{scale:2,constant:7.8}),'1.995548283',12],
  ['four',cubicSolveKeys(0,{constant:4}),'2.00531463',12],
  ['four-five',cubicSolveKeys(0,{constant:4.5}),'2.052655564',12],
  ['before',cubicSolveKeys(0,{constant:3.89}),'1.994565909',12],
  ['zero-fine',solveCubic,'1.99554828278565',18],
  ['zero-anchor',solveCubic,'1.995548282785650859',18],
  ['before-fine',cubicSolveKeys(0,{constant:3.89}),'1.99456590859510',18],
  ['four-fine-base',cubicSolveKeys(0,{constant:4}),'2.00531463046900',18],
  ['four-five-fine-base',cubicSolveKeys(0,{constant:4.5}),'2.05265556442733',18],
  ['scaled-fine-base',cubicSolveKeys(0,{scale:2,constant:7.8}),'1.99554828278513',18],
  ['expanded',[...solver,'x','multiply','x','multiply','x','subtract','2','x','add',...entries(3.9,0),'exe'],'1.99554828278565',18],
  ['fraction',[...solver,'x','power','3','right','subtract','2','x','add','3','9','divide',...entries(10,0),'exe'],'1.99554828278565',18],
  ['direct-far',cubicSolveKeys(-10000000),'1.99554828278565',18],
  ['cutoff-below',solveCubic,'1.995548282785650858',18],
  ['cutoff-above',solveCubic,'1.995548282785650860',18],
  ['cutoff-outer',solveCubic,'1.995548282785650849',18],
];
for (const [suffix, keys, anchor, power] of cubicRegisterCases) {
  const pending = 'eq-memory-' + suffix;
  const probe = 'calc-memory-' + suffix;
  const check = (name, sequence) => {
    const state = checkFrame(name, sequence, {angle:'rad'});
    assert.deepEqual(Array.from(lcdStatusFlags880(state)), solveCubicMemoryLCD.statuses[name]);
    return state;
  };
  if (solveCubicMemoryLCD.frames[pending]) {
    test('LCD ' + pending, () => assert.equal(check(pending, keys).data.continue, true));
  }
  test('LCD ' + probe, () => check(probe, [...keys,'down','exe','home','1','open','x','add',
    ...[...anchor].map(ch => ch === '.' ? 'dot' : ch),'close','multiply','1','0','power',...String(power),'right','exe']));
}

const cubicNewtonScreenCases = {
  'holdout-395': cubicSolveKeys(0, {constant:3.95}),
  'holdout-scale-three': cubicSolveKeys(0, {scale:3, constant:11.7}),
  'holdout-x-squared': [...solver,'x','power','3','right','add','x','square','subtract','2','x','add',
    ...entries(5,-10000000),'exe'],
  'seed-fifteen-million': cubicSolveKeys(-15000000),
};
for (const [suffix, keys] of Object.entries(cubicNewtonScreenCases)) {
  const name = 'eq-newton-' + suffix;
  test('LCD ' + name, () => {
    const state = checkFrame(name, keys, {angle:'rad'});
    assert.deepEqual(Array.from(lcdStatusFlags880(state)), solveCubicNewtonLCD.statuses[name]);
    assert.equal(state.data.continue, true);
  });
}
test('SOLVE lưu nghiệm tạm bậc ba với giá trị đầu −20000000', () => {
  const reading = solveCubicNewtonLCD.registerReadings.find(r => r.initial === '-20000000');
  const calculator = createCalculator880({angle:'rad'});
  for (const key of cubicSolveKeys(-20000000)) calculator.press(key);
  const state = calculator.getState();
  assert.equal(state.data.continue, true);
  assert.equal(state.data.result, '-2.324106615');
  const {addend, power, display} = reading;
  for (const key of ['down','exe','home','1','open','x','add',
    ...Array.from(addend, ch => ch === '.' ? 'dot' : ch),
    'close','multiply','1','0','power',...String(power),'right','exe']) calculator.press(key);
  // Phép dò nhân 10^18 để đọc x lưu. Độ lệch LCD L−R còn được giữ trong mẫu gốc.
  const probe = Number(calculator.getState().data.result);
  assert.ok(Math.abs(probe - Number(display)) * 10 ** -power < 1e-11);
});

const cubicMonomialKeys = (scale, initial) => [
  ...solver, ...(scale === 1 ? [] : [String(scale)]), 'x', 'power', '3', 'right', 'exe',
  ...entries(initial), 'exe'
];
for (const {screen, scale, initial, passes = 1, continue: pending = true} of solveCubicStencilLCD.probes.filter(probe =>
  probe.screen.startsWith('eq-stencil-monomial-'))) {
  test('LCD ' + screen, () => {
    const keys = [...cubicMonomialKeys(scale, initial), ...Array(passes - 1).fill('exe')];
    const state = checkFrame(screen, keys, {angle:'rad', language:'en'});
    assert.deepEqual(Array.from(lcdStatusFlags880(state)), solveCubicStencilLCD.statuses[screen]);
    assert.equal(state.data.continue, pending);
  });
}
for (const [name, initial] of [['million', -1000000], ['ten-million', -10000000]]) {
  const screen = 'eq-newton-monomial-' + name;
  test('LCD ' + screen, () => {
    const state = checkFrame(screen, cubicMonomialKeys(1, initial), {angle:'rad'});
    assert.deepEqual(Array.from(lcdStatusFlags880(state)), solveCubicNewtonLCD.statuses[screen]);
    assert.equal(state.data.continue, true);
  });
}

for (const fixture of [sheetLCD, ratioLCD, complexLCD, verifyLCD, calculateLCD, statisticsLCD, tableLCD, mathBoxLCD, sheetNightLCD, explorerLCD,memoryLCD,englishLCD,constantsLCD,conversionsLCD,englishSpecialLCD,surdBoundsLCD,sheetBoundsLCD,sheetEdgesLCD,lineEdgesLCD,lineSettingsLCD,resetMemoryLCD,circleGraphicsLCD,randomRepeatLCD,calculusLCD,flowHistoryLCD,flowSettingsLCD,flowErrorsLCD,flowAppsLCD,specialSettingsLCD,calcErrorsLCD,verifyErrorsLCD,specialSettingsExtraLCD,baseAnsEdgesLCD,bitexSolveLCD,bitexCalculusLCD,bitexCalcMemoryLCD,equationEdgeAcceptanceLCD,arrayOperationEdgesLCD,functionCalculusLCD,functionCalculusHoldoutsLCD,functionRegistrationErrorsLCD,statisticsBoundariesLCD,distributionBoundariesLCD,sheetTransferErrorsLCD,geometryBoundariesLCD,probabilityBoundariesLCD,geometryEditBoundariesLCD,groupedBoundariesLCD,arrayNumericBoundariesLCD,arrayRangeBoundariesLCD,complexNumericBoundariesLCD,circleFlowBoundariesLCD,complexLimitHoldoutsLCD,numberLineFlowBoundariesLCD,equationScaleBoundariesLCD,inequalityScaleBoundariesLCD,ratioScaleBoundariesLCD,tableNumericBoundariesLCD,baseArithmeticBoundariesLCD,simulScaleBoundariesLCD,expressionLimitsLCD,calculusToleranceLCD,discreteCalculusBoundariesLCD,arithmeticDomainBoundariesLCD,integerFunctionsBoundariesLCD,remainderRoundingBoundariesLCD,coordinateNumericBoundariesLCD,hyperbolicTrigBoundariesLCD,logPowerBoundariesLCD,dmsPercentBoundariesLCD,engineeringPrimeBoundariesLCD,trigAngleBoundariesLCD,linearHistoryBoundariesLCD,editorUndoBoundariesLCD,ansReplayBoundariesLCD,mixedRecurringInputLCD,precedenceBoundariesLCD,variableCalcBoundariesLCD,constantUnitBoundariesLCD,specializedPowerBoundariesLCD,sharedEvaluationBoundariesLCD,functionTablePowerLCD,sheetPowerBoundariesLCD,statisticsPowerBoundariesLCD,distributionPowerBoundariesLCD,coefficientPowerBoundariesLCD,arrayEditorPowerBoundariesLCD,explorerBoxPowerBoundariesLCD,powerCycleStateLCD,tableRangeNavigationLCD,coefficientExponentNavigationLCD,coefficientFooterScrollLCD,cellMathInputLCD,externalMathInputLCD,boxMathInputLCD,geometryMathInputLCD,linePlaneMathInputLCD,probabilityExactInputLCD,groupedFractionInputLCD,groupedScienceInputLCD,sheetScienceFormatLCD,statScienceFormatLCD,distScienceFormatLCD,tableScienceFormatLCD,arrayScienceFormatLCD,coefficientScienceFormatLCD,complexFormatCombinationsLCD,mathScriptGlyphsLCD,mathNestedLayoutLCD,mathRootsMixedNegativeLCD,mathEditNestedNavigationLCD,mathTallFunctionsLCD,mathAbsFixedPowersLCD,mathCalcNestedLCD,mathVerifyNestedLCD,mathLineCalcVerifyLCD,complexVerifyExactLCD,verifyMemoryExactLCD,mathDeepRadicalsLCD,mathDeepVerifyErrorsLCD,specialNonrealMemoryLCD,functionNonrealMemoryLCD,tableRegisterEffectsLCD,inputVariableAdjacencyLCD,logExactRationalLCD,settingsMenuWrapLCD,verifyRadicalIdentitiesLCD,expressionCaretWrapLCD,mathInsertionCursorLCD,mixedErrorNavigationLCD,editorInsertionCursorLCD,distributionEditFlowLCD,distributionErrorReturnLCD,tableSubtractionInputLCD,mathNegativeFractionPowerLCD,mathTemplateRightOperandLCD,mathFractionFrontDeleteLCD,explorerBitexChecklistLCD,geometryTriangleVariantsLCD,explorerErrorRecoveryLCD,groupedModeErrorsLCD,groupedResultNavigationLCD,mathNestedCursorOrderLCD,mathStructuralDeleteContextLCD,mathRadicalActivePowerLCD,mathLogErrorContinuationLCD, baseNNestedErrorLCD, coefficientPrefixCursorLCD, tableEditCommittedRowLCD, mathSciencePostfixErrorLCD]) {
  for (const [name, keys] of Object.entries(fixture.keys)) {
    const deferred = fixture.deferredRegions?.[name];
    test((deferred ? 'LCD vùng chữ và kết quả ' : 'LCD ') + name, () => {
      const state = checkFrame(name, keys, {angle:fixture.angle, language:fixture.language,...fixture.settingsByFrame?.[name]}, deferred);
      assert.deepEqual(Array.from(lcdStatusFlags880(state)), fixture.statuses[name]);
    });
  }
}

for (const fixture of [mathBoxLCD,englishLCD,randomRepeatLCD]) {
  for (const [name,data] of Object.entries(fixture.rendererCases || {})) {
    test('LCD dựng bằng dữ liệu tham chiếu ' + name, () => {
      const settings = {angle:fixture.angle,language:fixture.language,...fixture.settingsByFrame?.[name]};
      const state = checkFrame(name,fixture.referenceOnly[name].keys,settings,[],data);
      assert.deepEqual(Array.from(lcdStatusFlags880(state)),fixture.statuses[name]);
    });
  }
}

const cdf = ['3','4'];
const cdfValues = [...cdf,...entries(-1,1,0,1)];
const inverse = ['3','5'];
const inverseValues = [...inverse,...entries(.95,0,1)];
const distPatterns = {
  'dist-normal-cd-default':cdf,
  'dist-normal-cd-draft':[...cdf,'shift','subtract','1'],
  'dist-normal-cd-confirm':cdfValues,
  'dist-normal-cd-result':[...cdfValues,'exe'],
  'dist-normal-cd-return':[...cdfValues,'exe','exe'],
  'dist-normal-cd-sigma':[...cdfValues,'exe','exe','down','down','down'],
  'dist-inverse-default':inverse,
  'dist-inverse-confirm':inverseValues,
  'dist-inverse-result':[...inverseValues,'exe']
};

const discrete = [
  ['binomial-pd','1',[2,5,.5],[1,2,3]], ['binomial-cd','2',[2,5,.5],[0,1,2]],
  ['poisson-pd','6',[2,3],[0,1,2]], ['poisson-cd','7',[2,3],[0,1,2]]
];
let previousValues = [];
let previousList = [];
for (const [type, digit, parameters, list] of discrete) {
  const name = 'dist-' + type;
  const selection = ['3',digit];
  const variable = [...selection,'2'];
  const inputs = [...variable,...entries(...parameters)];
  distPatterns[name + '-choice'] = selection;
  distPatterns[name + '-default'] = [...previousValues,...variable];
  distPatterns[name + '-confirm'] = inputs;
  distPatterns[name + '-result'] = [...inputs,'exe'];
  previousValues = [...previousValues,...inputs,'home'];
  const listStart = [...selection,'1'];
  const listInput = [...listStart,...entries(...list)];
  const listParameters = [...inputs,'home',...listInput,'exe'];
  const listConfirm = [...listParameters,...entries(...parameters.slice(1))];
  const listResult = [...listConfirm,'exe'];
  distPatterns[name + '-list-empty'] = [...previousList,...listStart];
  distPatterns[name + '-list-input'] = listInput;
  distPatterns[name + '-list-params'] = listParameters;
  distPatterns[name + '-list-confirm'] = listConfirm;
  distPatterns[name + '-list-result'] = listResult;
  const focusName = type === 'binomial-pd' ? '-list-result-focus' : '-list-focus';
  distPatterns[name + focusName] = [...listResult,'right','down'];
  previousList = [...listInput,'home'];
}
distPatterns['dist-binomial-pd-list-draft'] = ['3','1','1','1'];
distPatterns['dist-list-tools'] = ['3','1','1',...entries(1,2,3),'tools'];
distPatterns['dist-list-tools-edit'] = ['3','1','1',...entries(1,2,3),'tools','1'];
distPatterns['dist-list-ac'] = [...distPatterns['dist-poisson-cd-list-result'],'ac'];
distPatterns['dist-normal-pd-status'] = [...previousValues,'3','3'];
const fractionDraft = ['3','1','2',...entries(2,5),'1','fraction','2'];
distPatterns['dist-probability-fraction-draft'] = fractionDraft;
distPatterns['dist-probability-fraction-accepted'] = [...fractionDraft,'exe'];
distPatterns['dist-normal-cd-invalid'] = [...cdf,...entries(0,1,0,-1),'exe'];
distPatterns['dist-binomial-pd-tail'] = ['3','1','2',...entries(2,1,.5),'exe'];
distPatterns['dist-binomial-cd-tail'] = ['3','2','2',...entries(2,1,.5),'exe'];
distPatterns['dist-binomial-invalid-p'] = ['3','1','2',...entries(0,1,2),'exe'];
distPatterns['dist-density-result'] = ['3','3',...entries(0,0,1),'exe'];
const largeList = ['3','1','1',...entries(0,1,2,3,4,5)];
const largeListResult = [...largeList,'exe',...entries(5,.5),'exe'];
const largeListLast = [...largeListResult,'right','down','down','down','down','down'];
distPatterns['dist-list-clear-choice'] = ['3','1','1',...entries(1,2,3),'tools','1','2'];
distPatterns['dist-list-over-page'] = largeList;
distPatterns['dist-list-over-page-up'] = [...largeList,'up'];
distPatterns['dist-list-over-page-calc'] = largeListResult;
distPatterns['dist-list-over-page-result'] = largeListLast;
distPatterns['dist-list-over-page-result-up'] = [...largeListLast,'up'];

for (const [name, keys] of Object.entries({...basePatterns,...distPatterns})) {
  test('LCD ' + name, () => {
    checkFrame(name, keys, {angle:'rad'});
    const calculator = createCalculator880({angle:'rad'});
    keys.forEach(calculator.press);
    assert.deepEqual(Array.from(lcdStatusFlags880(calculator.getState())), baseDistribution.statuses[name]);
  });
}

for (const [index, char] of [...'≠><≥≤'].entries()) {
  test('LCD Kiểm chứng ' + char, () => {
    const calculator = createCalculator880();
    [...verify,'1','catalog','1',String(index + 2),'2'].forEach(calculator.press);
    const frame = buildLCDFrame880(calculator.getState());
    const expected = [...Buffer.from(special.mathGlyphs[char], 'base64')]
      .flatMap(byte => Array(byte & 63).fill(byte >> 6));
    assert.ok(frame);
    const actual = Array.from({length:12}, (_, row) => Array.from(frame.pixels.slice(row * 192 + 11, row * 192 + 22))).flat();
    assert.deepEqual(actual, expected);
  });
}

for (const [name, keys] of Object.entries(homeOptionLCD.keys)) {
  test('LCD ' + name, () => {
    const state = checkFrame(name, keys, homeOptionLCD.initialSettings);
    assert.deepEqual(Array.from(lcdStatusFlags880(state)), homeOptionLCD.statuses[name]);
  });
}

const historyKeys = ['1','1','exe','2','exe'];
const verifyResult = [...verify,'1','shift','open','1','exe'];
const indicators = [
  ['status-home', []], ['status-math',['1']], ['status-shift',['1','shift']],
  ['status-shift-menu',['1','shift','catalog']],
  ['status-verify-menu',verify],
  ['status-history-up',historyKeys], ['status-history-down',[...historyKeys,'up']],
  ['status-deg',verifyResult,{angle:'deg'}], ['status-grad',verifyResult,{angle:'grad'}],
  ['status-fix',verifyResult,{angle:'grad',number:{kind:'fix',digits:3}}],
  ['status-sci',verifyResult,{angle:'grad',number:{kind:'sci',digits:4}}],
  ['status-eng',verifyResult,{angle:'grad',number:{kind:'sci',digits:4},engineer:true}],
  ['status-complex-i',['8'],{angle:'grad',number:{kind:'sci',digits:4},engineer:true}],
  ['status-complex-angle',['8'],{angle:'grad',number:{kind:'sci',digits:4},engineer:true,complex:'polar'}],
  ['special-stats-empty',stats], ['special-table-empty',['5']], ['special-spreadsheet-empty',['4']]
];
for (const [name, keys, settings] of indicators) {
  test('Dải chỉ báo ' + name, () => {
    const calculator = createCalculator880({angle:'rad', ...settings});
    keys.forEach(calculator.press);
    const expected = special.statuses[name];
    const actual = Array.from(lcdStatusFlags880(calculator.getState()), flag => {
      const [x, y, w, h, mask] = CLASS_PAD_LCD.status[flag];
      assert.ok(mask.startsWith('data:image/svg+xml;base64,'));
      return [flag, x, y, w, h];
    });
    assert.deepEqual(actual, expected);
  });
}

for (const [name, keys] of Object.entries(patterns)) {
  test('LCD ' + name, () => checkFrame(name, keys, name === 'settings-angle' ? {angle:'rad'} : {}));
}

for (const language of ['vi','en']) {
  for (let index = 0; index < 14; index++) {
    const offset = index < 6 ? 0 : index < 12 ? 6 : 9;
    const slot = index - offset;
    const keys = [
      ...Array(offset === 0 ? 0 : offset === 6 ? 1 : 2).fill('page-down'),
      ...Array(Math.floor(slot / 3)).fill('down'),
      ...Array(slot % 3).fill('right')
    ];
    const name = (language === 'vi' ? 'home-focus-' : 'home-en-focus-') + index;
    test('LCD HOME ' + language + ' mục ' + (index + 1), () => checkFrame(name, keys, {language}));
  }
}
