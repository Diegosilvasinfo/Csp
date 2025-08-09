// js/state.js

// --- Modelo de Dados ---
export let profiles = [];

// --- Variáveis de Estado ---
export let modoDesenhoAtivo = true; // Inicia ativo
export let isDrawing = false;
export let startPoint = null;
export let previewPath = null;
export let hoveredSegment = null;
export let isDraggingText = false;
export let draggedSegment = null;
export let hoveredTextSegment = null;

// Funções para modificar o estado de forma controlada
export function setModoDesenhoAtivo(value) { modoDesenhoAtivo = value; }
export function setIsDrawing(value) { isDrawing = value; }
export function setStartPoint(point) { startPoint = point; }
export function setPreviewPath(path) { previewPath = path; }
export function setHoveredSegment(segment) { hoveredSegment = segment; }
export function setIsDraggingText(value) { isDraggingText = value; }
export function setDraggedSegment(segment) { draggedSegment = segment; }
export function setHoveredTextSegment(segment) { hoveredTextSegment = segment; }

export function addProfile(profile) { profiles.push(profile); }
export function popProfile() { return profiles.pop(); }
export function clearProfiles() { profiles.length = 0; }
