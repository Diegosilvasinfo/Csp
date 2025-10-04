// js/dom.js

export const canvas = document.getElementById('drawingCanvas');
export const ctx = canvas.getContext('2d');

// --- Elementos do DOM ---
export const btbAtivo = document.getElementById('ativo');
export const lineWidthSlider = document.getElementById('lineWidth');
export const lineWidthValue = document.getElementById('lineWidthValue');
export const totalLengthInput = document.getElementById('total-length-input');
export const profileHeightInput = document.getElementById('profile-height-input');
export const calculatePlanBtn = document.getElementById('calculate-plan-btn');
export const resultsModal = document.getElementById('results-modal');
export const resultsOutput = document.getElementById('results-output');
export const closeModalBtn = document.getElementById('close-modal-btn');
export const printPlanBtn = document.getElementById('print-plan-btn');
export const clearButton = document.getElementById('clearButton');
export const printButton = document.getElementById('printButton');
export const undoButton = document.getElementById('undoButton');
export const embolsamento = document.getElementById('recuo-input');
export const btnSelected = document.getElementById('selected');
export const checkRetreat = document.getElementById('checkRetreat');